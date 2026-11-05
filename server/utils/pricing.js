const Product = require('../models/Product');

const FREE_DELIVERY_ABOVE = 200; // no delivery charge if items total > 200
const DELIVERY_CHARGE = 30;
const COUPON_RATE = 0.1; // 10% off the items total
const round2 = (n) => Math.round(n * 100) / 100;

exports.PAYMENT_METHODS = ['PhonePe', 'GPay', 'Credit/Debit Card', 'Cash on Delivery'];

exports.price = (lines, useCoupon) => {
  const subtotal = round2(lines.reduce((s, l) => s + l.productPrice * l.quantity, 0));
  const deliveryCharge = subtotal > FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE;
  const discount = useCoupon ? round2(subtotal * COUPON_RATE) : 0;
  const total = round2(subtotal + deliveryCharge - discount);
  return { subtotal, deliveryCharge, discount, total, couponApplied: !!useCoupon };
};

// Validates [{productId, quantity}] against the database. Returns { lines } or { error }.
exports.resolveItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return { error: 'No items to order.' };
  if (items.length > 50) return { error: 'Too many items in one order (max 50).' };

  const merged = new Map();
  for (const it of items) {
    const q = Number(it.quantity);
    if (!it || typeof it.productId !== 'string' || it.productId.length > 20 || !Number.isInteger(q) || q < 1 || q > 100)
      return { error: 'Each item needs a productId and a quantity from 1 to 100.' };
    merged.set(it.productId, (merged.get(it.productId) || 0) + q);
  }

  const products = await Product.find({ productId: { $in: [...merged.keys()] } });
  const byId = new Map(products.map((p) => [p.productId, p]));
  const lines = [];
  for (const [productId, quantity] of merged) {
    const p = byId.get(productId);
    if (!p) return { error: `Product ${productId} no longer exists.` };
    if (p.quantity < quantity)
      return { error: `Only ${p.quantity} unit(s) of "${p.productName}" available.` };
    lines.push({ productId, productName: p.productName, productPrice: p.productPrice, quantity });
  }
  return { lines };
};
