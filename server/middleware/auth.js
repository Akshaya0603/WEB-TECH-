const jwt = require('jsonwebtoken');

// No fallback: server.js refuses to start without a strong JWT_SECRET
const SECRET = () => process.env.JWT_SECRET;
const OPTIONS = { algorithm: 'HS256', expiresIn: '2h' };

exports.sign = (user) => jwt.sign({ emailId: user.emailId, role: user.role }, SECRET(), OPTIONS);

// Blocks every request that does not carry a valid token
exports.requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
  try {
    // Pin the algorithm so a forged token with alg "none" or another algorithm is rejected
    req.user = jwt.verify(token, SECRET(), { algorithms: ['HS256'] });
    next();
  } catch (e) {
    const message = e.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token. Please log in again.';
    res.status(401).json({ message });
  }
};

// Use after requireAuth: only tokens carrying role "admin" get through
exports.requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access only.' });
  next();
};

// Use after requireAuth on /users/:emailId/... routes.
// Normalises the email in the URL; allows the account owner, and admins too when allowAdmin is true.
exports.requireSelf = ({ allowAdmin = false } = {}) => (req, res, next) => {
  req.params.emailId = String(req.params.emailId).trim().toLowerCase();
  if (req.params.emailId === req.user.emailId || (allowAdmin && req.user.role === 'admin')) return next();
  res.status(403).json({ message: 'You can only access your own account.' });
};
