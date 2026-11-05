const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true },
    emailId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    age: { type: Number, required: true, min: 1, max: 120 },
    password: { type: String, required: true },
    wishlist: { type: [String], default: [] }, // productIds (used by the Wishlist feature)
    // Never taken from the request body: admins are created only by scripts/create-admin.js
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

// Hash the password whenever it is set or changed (register, PUT, PATCH all go through save())
userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = model('User', userSchema);
