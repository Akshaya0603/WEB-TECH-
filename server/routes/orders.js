const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { requireAuth, requireAdmin, requireSelf } = require('../middleware/auth');
const { isValidObjectId } = require('mongoose');

const STATUSES = Order.schema.path('status').enumValues;
const { price, resolveItems, PAYMENT_METHODS } = require('../utils/pricing');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const badCoupon = (b) => b.useCoupon !== undefined && typeof b.useCoupon !== 'boolean';

// POST /api/orders/quotes -> price breakdown (items, delivery charge, coupon) without placing an order
router.post('/orders/quotes', requireAuth, wrap(async (req, res) => {
  if (badCoupon(req.body)) return res.status(400).json({ message: 'useCoupon must be true or false.' });
  const { lines, error } = await resolveItems(req.body.items);
  if (error) return res.status(400).json({ message: error });
  res.json({ items: lines, ...price(lines, req.body.useCoupon), paymentMethods: PAYMENT_METHODS });
}));

// POST /api/orders -> place order (buy now / buy all now)
router.post('/orders', requireAuth, wrap(async (req, res) => {
  const { items, paymentMethod, useCoupon } = req.body;
  if (badCoupon(req.body)) return res.status(400).json({ message: 'useCoupon must be true or false.' });
  if (!PAYMENT_METHODS.includes(paymentMethod))
    return res.status(400).json({ message: 'Please choose a payment method.' });

  const { lines, error } = await resolveItems(items);
  if (error) return res.status(400).json({ message: error });

  // Reduce stock atomically per product; roll back if any line fails
  const done = [];
  for (const l of lines) {
    const r = await Product.updateOne(
      { productId: l.productId, quantity: { $gte: l.quantity } },
      { $inc: { quantity: -l.quantity } }
    );
    if (r.modifiedCount !== 1) {
      for (const d of done) await Product.updateOne({ productId: d.productId }, { $inc: { quantity: d.quantity } });
      return res.status(409).json({ message: `"${l.productName}" just went out of stock.` });
    }
    done.push(l);
  }

  const order = await Order.create({
    emailId: req.user.emailId,
    items: lines,
    ...price(lines, useCoupon),
    paymentMethod,
  });
  res.status(201).json({ message: 'Order placed successfully!', order });
}));

// GET /api/users/:emailId/orders -> one user's order history (owner or admin)
router.get('/users/:emailId/orders', requireAuth, requireSelf({ allowAdmin: true }), wrap(async (req, res) => {
  const orders = await Order.find({ emailId: req.params.emailId }).sort({ createdAt: -1 });
  res.json({ orders });
}));

// GET /api/users/:emailId/purchased-products -> current data of products bought before ("Buy again")
router.get('/users/:emailId/purchased-products', requireAuth, requireSelf({ allowAdmin: true }), wrap(async (req, res) => {
  const orders = await Order.find({ emailId: req.params.emailId }).sort({ createdAt: -1 });
  const ids = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)))];
  const products = await Product.find({ productId: { $in: ids } });
  res.json({ products });
}));

// GET /api/orders -> every customer's orders (admin only; users use /users/:emailId/orders)
router.get('/orders', requireAuth, requireAdmin, wrap(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json({ count: orders.length, orders });
}));

// GET /api/orders/:orderId -> one order (its owner or an admin)
router.get('/orders/:orderId', requireAuth, wrap(async (req, res) => {
  if (!isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'Invalid order ID.' });
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.emailId !== req.user.emailId && req.user.role !== 'admin')
    return res.status(403).json({ message: 'You can only view your own orders.' });
  res.json({ order });
}));

// PATCH /api/orders/:orderId { status } -> admin updates delivery status
router.patch('/orders/:orderId', requireAuth, requireAdmin, wrap(async (req, res) => {
  if (!isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'Invalid order ID.' });
  if (!STATUSES.includes(req.body.status))
    return res.status(400).json({ message: `status must be one of: ${STATUSES.join(', ')}.` });
  const order = await Order.findByIdAndUpdate(req.params.orderId, { status: req.body.status }, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  res.json({ message: `Order marked ${order.status}.`, order });
}));

module.exports = router;
