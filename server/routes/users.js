const router = require('express').Router();
const User = require('../models/User');
const { sign, requireAuth, requireSelf } = require('../middleware/auth');
const { validateUser } = require('../utils/validate');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const publicUser = (u) => ({ username: u.username, emailId: u.emailId, age: u.age, role: u.role });

// POST /api/users  -> register
router.post('/users', registerLimiter, wrap(async (req, res) => {
  const errors = validateUser(req.body, { requireAll: true, needEmail: true });
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });

  const emailId = req.body.emailId.trim().toLowerCase();
  if (await User.findOne({ emailId }))
    return res.status(409).json({ message: 'Email ID is already registered.' });

  const user = await User.create({
    username: req.body.username.trim(),
    emailId,
    age: Number(req.body.age),
    password: req.body.password,
  });
  res.status(201).json({
    message: `Successfully registered! Welcome, ${user.username}.`,
    username: user.username,
  });
}));

// POST /api/tokens -> log in: issues a new JWT (a token is the resource being created)
router.post('/tokens', loginLimiter, wrap(async (req, res) => {
  const { emailId, password } = req.body;
  if (typeof emailId !== 'string' || typeof password !== 'string' || !emailId || !password || emailId.length > 254 || password.length > 72)
    return res.status(400).json({ message: 'Email ID and password are required.' });

  const user = await User.findOne({ emailId: emailId.trim().toLowerCase() });
  if (!user) return res.status(404).json({ message: 'User Not Registered.' });
  if (!(await user.checkPassword(password))) return res.status(401).json({ message: 'Invalid Password.' }); // bcrypt comparison

  res.json({ message: 'Login successful.', token: sign(user), user: publicUser(user) });
}));

// ---- Profile management: /api/users/:emailId ----
// 1) the user must exist (404)   2) the logged-in user must be that user (403)
async function loadTarget(req, res) {
  const emailId = String(req.params.emailId).trim().toLowerCase();
  const user = await User.findOne({ emailId });
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return null;
  }
  if (user.emailId !== req.user.emailId) {
    res.status(403).json({ message: 'You can only modify your own profile.' });
    return null;
  }
  return user;
}

const EDITABLE = ['username', 'age', 'password'];

// GET /api/users/:emailId -> profile (owner or admin)
router.get('/users/:emailId', requireAuth, requireSelf({ allowAdmin: true }), wrap(async (req, res) => {
  const user = await User.findOne({ emailId: req.params.emailId });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: publicUser(user) });
}));

// PUT /api/users/:emailId  -> replace all editable details
router.put('/users/:emailId', requireAuth, wrap(async (req, res) => {
  const user = await loadTarget(req, res);
  if (!user) return;
  if (req.body.emailId !== undefined) return res.status(400).json({ message: 'Email ID cannot be changed.' });

  const errors = validateUser(req.body, { requireAll: true });
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });

  user.username = req.body.username.trim();
  user.age = Number(req.body.age);
  user.password = req.body.password;
  await user.save();
  res.json({ message: 'Profile updated completely (PUT).', user: publicUser(user) });
}));

// PATCH /api/users/:emailId  -> update only the supplied fields
router.patch('/users/:emailId', requireAuth, wrap(async (req, res) => {
  const user = await loadTarget(req, res);
  if (!user) return;
  if (req.body.emailId !== undefined) return res.status(400).json({ message: 'Email ID cannot be changed.' });

  const fields = Object.keys(req.body).filter((k) => EDITABLE.includes(k));
  if (fields.length === 0)
    return res.status(400).json({ message: `Provide at least one of: ${EDITABLE.join(', ')}.` });

  const errors = validateUser(req.body, { requireAll: false });
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });

  fields.forEach((k) => {
    user[k] = k === 'age' ? Number(req.body[k]) : k === 'username' ? req.body[k].trim() : req.body[k];
  });
  await user.save();
  res.json({ message: `Updated: ${fields.join(', ')} (PATCH).`, user: publicUser(user) });
}));

// DELETE /api/users/:emailId
router.delete('/users/:emailId', requireAuth, wrap(async (req, res) => {
  const user = await loadTarget(req, res);
  if (!user) return;
  await user.deleteOne();
  res.json({ message: 'Your account has been deleted.' });
}));

module.exports = router;
