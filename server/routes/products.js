const router = require('express').Router();
const Product = require('../models/Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateProduct, PRODUCT_FIELDS } = require('../utils/validate');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/products?category=&brand=&colour=&size=&gender=&sort=
// Protected: unauthenticated callers get 401.
router.get('/products', requireAuth, wrap(async (req, res) => {
  const FILTERS = ['category', 'brand', 'colour', 'size', 'gender'];
  for (const k of Object.keys(req.query)) {
    if (![...FILTERS, 'sort'].includes(k)) return res.status(400).json({ message: `Unknown filter "${k}".` });
    if (typeof req.query[k] !== 'string' || req.query[k].length > 40)
      return res.status(400).json({ message: `Filter "${k}" must be a single short text value.` });
  }
  const { category, brand, colour, size, gender, sort } = req.query;
  const q = {};
  if (category) q.category = category;
  if (brand) q.brand = brand;
  if (colour) q.colour = colour;
  if (gender) q.gender = gender;
  if (size) q.sizes = size;

  const sorts = {
    price_asc: { productPrice: 1 },
    price_desc: { productPrice: -1 },
    name: { productName: 1 },
  };
  if (sort && !sorts[sort]) return res.status(400).json({ message: `sort must be one of: ${Object.keys(sorts).join(', ')}.` });
  const products = await Product.find(q).sort(sorts[sort] || { productId: 1 });
  res.json({
    count: products.length,
    message: products.length ? undefined : 'No products available.',
    products,
  });
}));

// GET /api/products/filters -> values for the category bar and filter dropdowns
router.get('/products/filters', requireAuth, wrap(async (req, res) => {
  const [categories, brands, colours, genders, sizes] = await Promise.all([
    Product.distinct('category'),
    Product.distinct('brand'),
    Product.distinct('colour'),
    Product.distinct('gender'),
    Product.distinct('sizes'),
  ]);
  res.json({ categories, brands, colours, genders, sizes });
}));

// Keep only known product fields, trimming text (ignores anything else in the body)
const pick = (b, allowed) =>
  Object.fromEntries(allowed.filter((k) => b[k] !== undefined).map((k) => [k, typeof b[k] === 'string' ? b[k].trim() : b[k]]));

// GET /api/products/:productId -> one product
router.get('/products/:productId', requireAuth, wrap(async (req, res) => {
  const product = await Product.findOne({ productId: req.params.productId });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ product });
}));

// ---- Admin only ----

// POST /api/products -> add a product (201, or 409 if the productId exists)
router.post('/products', requireAuth, requireAdmin, wrap(async (req, res) => {
  const errors = validateProduct(req.body, { requireAll: true });
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });
  const product = await Product.create(pick(req.body, PRODUCT_FIELDS));
  res.status(201).json({ message: 'Product added.', product });
}));

// PATCH /api/products/:productId -> update price, stock, etc. (productId itself cannot change)
router.patch('/products/:productId', requireAuth, requireAdmin, wrap(async (req, res) => {
  if (req.body.productId !== undefined) return res.status(400).json({ message: 'Product ID cannot be changed.' });
  const update = pick(req.body, PRODUCT_FIELDS);
  if (!Object.keys(update).length) return res.status(400).json({ message: 'Nothing to update.' });
  const errors = validateProduct(update, { requireAll: false });
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });

  const product = await Product.findOneAndUpdate({ productId: req.params.productId }, update, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ message: 'Product updated.', product });
}));

// DELETE /api/products/:productId
router.delete('/products/:productId', requireAuth, requireAdmin, wrap(async (req, res) => {
  const r = await Product.deleteOne({ productId: req.params.productId });
  if (!r.deletedCount) return res.status(404).json({ message: 'Product not found.' });
  res.json({ message: 'Product deleted.' });
}));

module.exports = router;
