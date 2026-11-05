const rateLimit = require('express-rate-limit');

const MIN = 60 * 1000;
const num = (v, d) => (Number(v) > 0 ? Number(v) : d);
const tooMany = (message) => (req, res) => res.status(429).json({ message });

// Every API request: generous per-IP cap against floods / scraping
exports.apiLimiter = rateLimit({
  windowMs: 15 * MIN,
  limit: num(process.env.RATE_LIMIT_MAX, 300),
  standardHeaders: 'draft-7', // sends RateLimit / RateLimit-Policy headers
  legacyHeaders: false,
  handler: tooMany('Too many requests. Please slow down and try again in a few minutes.'),
});

// Login: brute-force protection. Counted per IP + email, and only FAILED attempts count,
// so a customer who types their password correctly is never blocked, and an attack on
// one account does not lock out other people on the same Wi-Fi.
exports.loginLimiter = rateLimit({
  windowMs: 15 * MIN,
  limit: num(process.env.LOGIN_RATE_LIMIT, 5),
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.emailId || '').trim().toLowerCase()}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Too many failed login attempts. Please wait 15 minutes and try again.'),
});

// Registration: stops one IP from creating accounts in bulk (only successful sign-ups count)
exports.registerLimiter = rateLimit({
  windowMs: 60 * MIN,
  limit: num(process.env.REGISTER_RATE_LIMIT, 20),
  skipFailedRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Too many accounts created from this network. Please try again later.'),
});
