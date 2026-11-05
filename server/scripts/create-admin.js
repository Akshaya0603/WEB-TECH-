// Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in .env.
// If that email is already registered, the account is promoted to admin and its password reset.
// This is the ONLY way to get role "admin" - the register route never accepts a role.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Admin' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters) in .env first.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const emailId = ADMIN_EMAIL.trim().toLowerCase();
  let user = await User.findOne({ emailId });
  if (!user) user = new User({ username: ADMIN_NAME, emailId, age: 30 });
  user.role = 'admin';
  user.password = ADMIN_PASSWORD; // hashed by the pre-save hook
  await user.save();
  console.log(`Admin ready: ${emailId}`);
  await mongoose.disconnect();
})();
