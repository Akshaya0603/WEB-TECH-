// One-time migration: hashes any plain-text passwords already stored in the users collection.
// Safe to run more than once: passwords that are already bcrypt hashes are skipped.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}, { emailId: 1, password: 1 });
  let count = 0;
  for (const u of users) {
    if (/^\$2[aby]\$\d{2}\$/.test(u.password)) continue; // already hashed
    // updateOne skips the pre-save hook, so we hash here exactly once
    await User.updateOne({ _id: u._id }, { password: await bcrypt.hash(u.password, 10) });
    count++;
  }
  console.log(`Hashed ${count} of ${users.length} user password(s).`);
  await mongoose.disconnect();
})();
