require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimit');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET in .env is missing or too short (min 32 characters).');
  process.exit(1);
}

// ---- Transport Layer Security ----
// HTTPS=true in .env -> serve over HTTPS using the certificate in certs/ (create it with: npm run make-cert)
const USE_HTTPS = process.env.HTTPS === 'true';
let tlsOptions;
if (USE_HTTPS) {
  const keyPath = path.resolve(__dirname, process.env.SSL_KEY_PATH || 'certs/localhost-key.pem');
  const certPath = path.resolve(__dirname, process.env.SSL_CERT_PATH || 'certs/localhost.pem');
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error('HTTPS=true but no certificate found. Run "npm run make-cert" (or set HTTPS=false).');
    process.exit(1);
  }
  tlsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath), minVersion: 'TLSv1.2' };
}

const app = express();
// Security headers (X-Content-Type-Options, X-Frame-Options, CSP, ...); also removes X-Powered-By
// HSTS tells browsers to use HTTPS only; sent only when we actually serve HTTPS.
// (1 day for local development - production sites normally use 1 year: 31536000)
app.use(helmet({ hsts: USE_HTTPS ? { maxAge: Number(process.env.HSTS_MAX_AGE) || 86400 } : false }));
// Only the React client may call the API from a browser
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,https://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use('/api', apiLimiter);
// Query values are only plain strings (or arrays of strings) - never nested objects like ?a[$ne]=x
app.set('query parser', 'simple');
app.use(express.json({ limit: '10kb' }));
app.use(require('./middleware/sanitize'));
// Mongoose: drop filter fields that are not in the schema
mongoose.set('strictQuery', true);

app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/products'));
app.use('/api', require('./routes/wishlist'));
app.use('/api', require('./routes/orders'));

app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

// Central error handler: every error leaves as JSON { message } with a meaningful status code
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const messages = { emailId: 'Email ID is already registered.', productId: 'Product ID already exists.' };
    return res.status(409).json({ message: messages[field] || 'This record already exists.' });
  }
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(' ') });
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid value for ${err.path}.` });
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' }); // never leak stack traces to the client
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shoppingdb')
  .then(() => {
    console.log('MongoDB connected');
    const server = USE_HTTPS ? https.createServer(tlsOptions, app) : app;
    server.listen(PORT, () => console.log(`Server running on ${USE_HTTPS ? 'https' : 'http'}://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });
