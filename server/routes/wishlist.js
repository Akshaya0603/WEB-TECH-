const router = require('express').Router();
const User = require('../models/User');
const Product = require('../models/Product');
const { requireAuth, requireSelf } = require('../middleware/auth');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const self = [requireAuth, requireSelf()];

// GET /api/users/:emailId/wishlist
router.get('/users/:emailId/wishlist', self, wrap(async (req, res) => {
  const user = await User.findOne({ emailId: req.params.emailId });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const products = await Product.find({ productId: { $in: user.wishlist } });
  res.json({ products });
}));

// POST /api/users/:emailId/wishlist  { productId } -> 201 added, 200 if it was already there
router.post('/users/:emailId/wishlist', self, wrap(async (req, res) => {
  const { productId } = req.body;
  if (typeof productId !== 'string' || !productId) return res.status(400).json({ message: 'productId is required.' });
  if (!(await Product.exists({ productId }))) return res.status(404).json({ message: 'Product not found.' });
  const r = await User.updateOne({ emailId: req.params.emailId }, { $addToSet: { wishlist: productId } }, { timestamps: false }); // so modifiedCount reflects the wishlist only
  if (!r.matchedCount) return res.status(404).json({ message: 'User not found.' });
  if (!r.modifiedCount) return res.json({ message: 'Already in wishlist.' });
  res.status(201).json({ message: 'Added to wishlist.' });
}));

// DELETE /api/users/:emailId/wishlist/:productId
router.delete('/users/:emailId/wishlist/:productId', self, wrap(async (req, res) => {
  const r = await User.updateOne({ emailId: req.params.emailId }, { $pull: { wishlist: req.params.productId } }, { timestamps: false });
  if (!r.matchedCount) return res.status(404).json({ message: 'User not found.' });
  if (!r.modifiedCount) return res.status(404).json({ message: 'Product is not in the wishlist.' });
  res.json({ message: 'Removed from wishlist.' });
}));

module.exports = router;
