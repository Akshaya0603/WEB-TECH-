const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME = /^[\p{L}\p{N} .'_-]+$/u; // letters (any language), digits, space and . ' _ -

// requireAll = true  -> registration / PUT (every field mandatory)
// requireAll = false -> PATCH (validate only the fields that are present)
exports.validateUser = (b, { requireAll, needEmail = false }) => {
  const errors = [];
  const has = (k) => b[k] !== undefined;

  if (needEmail && (typeof b.emailId !== 'string' || b.emailId.length > 254 || !EMAIL.test(b.emailId.trim())))
    errors.push('A valid email ID is required.');

  if (requireAll || has('username'))
    if (typeof b.username !== 'string' || b.username.trim().length < 2 || b.username.trim().length > 50)
      errors.push('Username must be 2-50 characters.');
    else if (!NAME.test(b.username.trim()))
      errors.push("Username can only contain letters, numbers, spaces and . ' _ -");

  if (requireAll || has('age')) {
    const a = Number(b.age);
    if (b.age === '' || b.age === null || b.age === undefined || !Number.isInteger(a) || a < 1 || a > 120)
      errors.push('Age must be a whole number between 1 and 120.');
  }

  if (requireAll || has('password'))
    if (typeof b.password !== 'string' || b.password.length < 6 || b.password.length > 72)
      errors.push('Password must be 6-72 characters.'); // bcrypt only uses the first 72 bytes

  return errors;
};

// Products (admin). requireAll = true -> create, false -> PATCH (only fields present)
const PRODUCT_FIELDS = ['productId', 'productName', 'productPrice', 'category', 'quantity', 'description', 'brand', 'colour', 'sizes', 'gender'];
exports.PRODUCT_FIELDS = PRODUCT_FIELDS;

exports.validateProduct = (b, { requireAll }) => {
  const errors = [];
  const check = (k, ok, msg) => { if ((requireAll || b[k] !== undefined) && !ok(b[k])) errors.push(msg); };
  const str = (min, max) => (v) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
  const optStr = (max) => (v) => v === undefined || str(0, max)(v);

  if (requireAll) check('productId', (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,20}$/.test(v), 'Product ID must be 1-20 letters, digits, - or _.');
  check('productName', str(2, 100), 'Product name must be 2-100 characters.');
  check('productPrice', (v) => typeof v === 'number' && v >= 0 && v <= 1e7, 'Price must be a number between 0 and 1,00,00,000.');
  check('category', str(2, 40), 'Category must be 2-40 characters.');
  check('quantity', (v) => Number.isInteger(v) && v >= 0 && v <= 1e6, 'Stock must be a whole number of 0 or more.');
  ['description', 'brand', 'colour', 'gender'].forEach((k) => {
    if (b[k] !== undefined && !optStr(k === 'description' ? 500 : 40)(b[k])) errors.push(`${k} is too long or not text.`);
  });
  if (b.sizes !== undefined && !(Array.isArray(b.sizes) && b.sizes.length <= 20 && b.sizes.every(str(1, 10))))
    errors.push('sizes must be a list of short text values.');
  return errors;
};
