// Blocks NoSQL operator injection.
// MongoDB treats keys that start with "$" (e.g. {"$ne": null}, {"$where": "..."}) as query operators,
// and keys containing "." as paths into nested fields. No legitimate request to this API uses either,
// so any request carrying them in the body, query string or URL params is rejected with 400.
const isBadKey = (k) => k.startsWith('$') || k.includes('.');

function findBadKey(value, depth = 0) {
  if (depth > 10) return '(nesting too deep)';
  if (Array.isArray(value)) {
    for (const v of value) { const bad = findBadKey(v, depth + 1); if (bad) return bad; }
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (isBadKey(k)) return k;
      const bad = findBadKey(v, depth + 1);
      if (bad) return bad;
    }
  }
  return null;
}

module.exports = (req, res, next) => {
  const bad = findBadKey(req.body) || findBadKey(req.query) || findBadKey(req.params);
  if (bad) return res.status(400).json({ message: `Field name "${bad}" is not allowed.` });
  next();
};
