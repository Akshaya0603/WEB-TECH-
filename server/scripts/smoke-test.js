// End-to-end check of the API against the RUNNING server.
// Start the server first (npm start), then: npm run smoke-test
// It creates two temporary users and one temporary product and removes them at the end.
// Note: it places one real order (product stock is restored afterwards and the order is marked Cancelled).
require('dotenv').config();
const HTTPS = process.env.HTTPS === 'true';
// The local certificate is self-signed, so this test script (and only this script) skips certificate checks
if (HTTPS) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE = `${HTTPS ? 'https' : 'http'}://localhost:${process.env.PORT || 5000}/api`;
let pass = 0, fail = 0;

async function call(method, path, body, token, rawBody, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: rawBody ?? (body ? JSON.stringify(body) : undefined) });
  return { status: res.status, headers: res.headers, data: await res.json().catch(() => ({})) };
}
function check(name, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (got ${got}, expected ${want})`);
}
const section = (t) => console.log(`\n--- ${t} ---`);
const enc = encodeURIComponent;

(async () => {
  const stamp = Date.now();
  const email = `smoketest${stamp}@test.com`;
  const email2 = `smoketest${stamp}b@test.com`;
  const pid = `TEST${stamp % 100000}`;

  section('1. Authentication (JWT + bcrypt)');
  check('Products without token -> 401', (await call('GET', '/products')).status, 401);
  check('Forged token -> 401', (await call('GET', '/products', null, 'abc.def.ghi')).status, 401);
  check('Register new user -> 201', (await call('POST', '/users', { username: 'Smoke', emailId: email, age: 21, password: 'secret123' })).status, 201);
  check('Register same email -> 409', (await call('POST', '/users', { username: 'Smoke', emailId: email, age: 21, password: 'secret123' })).status, 409);
  await call('POST', '/users', { username: 'Smoke Two', emailId: email2, age: 22, password: 'secret123' });
  check('Login wrong password -> 401', (await call('POST', '/tokens', { emailId: email, password: 'wrongpass' })).status, 401);
  check('Login unknown email -> 404', (await call('POST', '/tokens', { emailId: 'nobody' + email, password: 'x' })).status, 404);
  const ul = await call('POST', '/tokens', { emailId: email, password: 'secret123' });
  check('Login correct (bcrypt) -> 200', ul.status, 200);
  const userToken = ul.data.token;
  const user2Token = (await call('POST', '/tokens', { emailId: email2, password: 'secret123' })).data.token;
  check('Products with token -> 200', (await call('GET', '/products', null, userToken)).status, 200);

  section('2. Authorization (roles + ownership)');
  check('User role is "user"', ul.data.user?.role, 'user');
  check('User lists all orders -> 403', (await call('GET', '/orders', null, userToken)).status, 403);
  check('User adds product -> 403', (await call('POST', '/products', { productId: pid }, userToken)).status, 403);
  check('User reads another user -> 403', (await call('GET', `/users/${enc(email2)}`, null, userToken)).status, 403);
  check('User edits another user -> 403', (await call('PATCH', `/users/${enc(email2)}`, { age: 30 }, userToken)).status, 403);
  check('User reads another user\'s wishlist -> 403', (await call('GET', `/users/${enc(email2)}/wishlist`, null, userToken)).status, 403);
  const register_role = await call('POST', '/users', { username: 'Sneaky', emailId: `sneaky${stamp}@test.com`, age: 20, password: 'secret123', role: 'admin' });
  const sneaky = await call('POST', '/tokens', { emailId: `sneaky${stamp}@test.com`, password: 'secret123' });
  check('Register with role:"admin" is ignored', sneaky.data.user?.role, 'user');
  const al = await call('POST', '/tokens', { emailId: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  check('Admin login -> 200', al.status, 200);
  check('Admin role is "admin"', al.data.user?.role, 'admin');
  const adminToken = al.data.token;

  section('3. Resource-oriented URIs');
  check('GET /users/:emailId (self) -> 200', (await call('GET', `/users/${enc(email)}`, null, userToken)).status, 200);
  check('GET /users/:emailId (admin) -> 200', (await call('GET', `/users/${enc(email)}`, null, adminToken)).status, 200);
  check('PATCH /users/:emailId -> 200', (await call('PATCH', `/users/${enc(email)}`, { age: 25 }, userToken)).status, 200);
  check('PUT /users/:emailId -> 200', (await call('PUT', `/users/${enc(email)}`, { username: 'Smokey', age: 26, password: 'secret123' }, userToken)).status, 200);
  check('Login after PUT (password re-hashed) -> 200', (await call('POST', '/tokens', { emailId: email, password: 'secret123' })).status, 200);
  check('GET /products/filters -> 200', (await call('GET', '/products/filters', null, userToken)).status, 200);

  const prod = { productId: pid, productName: 'Smoke Test Item', productPrice: 99, category: 'Test', quantity: 5 };
  check('Admin POST /products -> 201', (await call('POST', '/products', prod, adminToken)).status, 201);
  check('Admin POST duplicate -> 409', (await call('POST', '/products', prod, adminToken)).status, 409);
  check('Admin bad product data -> 400', (await call('POST', '/products', { productId: 'X1', productPrice: -5 }, adminToken)).status, 400);
  check('Admin PATCH /products/:id -> 200', (await call('PATCH', `/products/${pid}`, { quantity: 9 }, adminToken)).status, 200);
  check('GET /products/:id -> 200', (await call('GET', `/products/${pid}`, null, userToken)).status, 200);

  const wl = `/users/${enc(email)}/wishlist`;
  check('POST wishlist -> 201', (await call('POST', wl, { productId: pid }, userToken)).status, 201);
  check('POST wishlist again -> 200', (await call('POST', wl, { productId: pid }, userToken)).status, 200);
  check('POST wishlist unknown product -> 404', (await call('POST', wl, { productId: 'NOPE' }, userToken)).status, 404);
  check('GET wishlist has 1 item', (await call('GET', wl, null, userToken)).data.products?.length, 1);
  check('DELETE wishlist item -> 200', (await call('DELETE', `${wl}/${pid}`, null, userToken)).status, 200);
  check('DELETE wishlist item again -> 404', (await call('DELETE', `${wl}/${pid}`, null, userToken)).status, 404);

  const items = [{ productId: pid, quantity: 2 }];
  check('POST /orders/quotes -> 200', (await call('POST', '/orders/quotes', { items }, userToken)).status, 200);
  const placed = await call('POST', '/orders', { items, paymentMethod: 'GPay' }, userToken);
  check('POST /orders -> 201', placed.status, 201);
  const orderId = placed.data.order?._id;
  check('Stock reduced 9 -> 7', (await call('GET', `/products/${pid}`, null, userToken)).data.product?.quantity, 7);
  check('Order too large -> 400', (await call('POST', '/orders', { items: [{ productId: pid, quantity: 99 }], paymentMethod: 'GPay' }, userToken)).status, 400);
  check('GET /users/:emailId/orders has 1', (await call('GET', `/users/${enc(email)}/orders`, null, userToken)).data.orders?.length, 1);
  check('GET /users/:emailId/purchased-products has 1', (await call('GET', `/users/${enc(email)}/purchased-products`, null, userToken)).data.products?.length, 1);
  check('GET /orders/:id (owner) -> 200', (await call('GET', `/orders/${orderId}`, null, userToken)).status, 200);
  check('GET /orders/:id (other user) -> 403', (await call('GET', `/orders/${orderId}`, null, user2Token)).status, 403);
  check('GET /orders (admin) -> 200', (await call('GET', '/orders', null, adminToken)).status, 200);
  check('PATCH /orders/:id status (user) -> 403', (await call('PATCH', `/orders/${orderId}`, { status: 'Shipped' }, userToken)).status, 403);
  check('PATCH /orders/:id bad status -> 400', (await call('PATCH', `/orders/${orderId}`, { status: 'Lost' }, adminToken)).status, 400);
  check('PATCH /orders/:id status (admin) -> 200', (await call('PATCH', `/orders/${orderId}`, { status: 'Shipped' }, adminToken)).status, 200);

  section('4. Status codes & error handling');
  check('Malformed JSON -> 400', (await call('POST', '/tokens', null, null, '{"emailId": "a@b.com", bad json')).status, 400);
  check('Unknown API route -> 404', (await call('GET', '/does-not-exist', null, userToken)).status, 404);
  check('Invalid order ID -> 400', (await call('GET', '/orders/not-an-id', null, userToken)).status, 400);
  check('Missing order -> 404', (await call('GET', '/orders/0123456789abcdef01234567', null, adminToken)).status, 404);
  check('Register missing fields -> 400', (await call('POST', '/users', { emailId: 'x@y.com' })).status, 400);
  const err = await call('POST', '/tokens', { emailId: email });
  check('Errors are JSON with a message', typeof err.data.message, 'string');

  section('5. Validation & NoSQL-injection protection');
  check('Login with {"$ne": null} password -> 400', (await call('POST', '/tokens', { emailId: email, password: { $ne: null } })).status, 400);
  check('Login with {"$gt": ""} email -> 400', (await call('POST', '/tokens', { emailId: { $gt: '' }, password: 'x' })).status, 400);
  check('Body with $where operator -> 400', (await call('POST', '/orders/quotes', { items: [{ productId: { $where: 'sleep(1000)' }, quantity: 1 }] }, userToken)).status, 400);
  check('Query ?brand[$ne]=Nike -> 400', (await call('GET', '/products?brand[$ne]=Nike', null, userToken)).status, 400);
  check('Query ?brand=a&brand=b (array) -> 400', (await call('GET', '/products?brand=a&brand=b', null, userToken)).status, 400);
  check('Unknown filter -> 400', (await call('GET', '/products?price=1', null, userToken)).status, 400);
  check('Bad sort value -> 400', (await call('GET', '/products?sort=evil', null, userToken)).status, 400);
  check('Valid filter + sort -> 200', (await call('GET', '/products?category=Footwear&sort=price_asc', null, userToken)).status, 200);
  check('Username with <script> -> 400', (await call('POST', '/users', { username: '<script>alert(1)</script>', emailId: `x${stamp}@t.com`, age: 20, password: 'secret123' })).status, 400);
  check('Password over 72 chars -> 400', (await call('PATCH', `/users/${enc(email)}`, { password: 'a'.repeat(80) }, userToken)).status, 400);
  check('Age as text -> 400', (await call('PATCH', `/users/${enc(email)}`, { age: 'old' }, userToken)).status, 400);
  check('useCoupon as string -> 400', (await call('POST', '/orders/quotes', { items, useCoupon: 'yes' }, userToken)).status, 400);
  check('Quantity 0 -> 400', (await call('POST', '/orders/quotes', { items: [{ productId: pid, quantity: 0 }] }, userToken)).status, 400);
  check('Body over 10kb -> 413', (await call('POST', '/tokens', { emailId: email, password: 'x'.repeat(20000) })).status, 413);
  check('Product price as text -> 400', (await call('PATCH', `/products/${pid}`, { productPrice: '99' }, adminToken)).status, 400);

  section('6. Rate limiting, security headers, CORS');
  const h = (await call('GET', '/products', null, userToken)).headers;
  check('Helmet: X-Content-Type-Options nosniff', h.get('x-content-type-options'), 'nosniff');
  check('Helmet: X-Powered-By removed', h.get('x-powered-by'), null);
  check('RateLimit header present', h.has('ratelimit'), true);
  check('CORS allows the React client', (await call('GET', '/products', null, userToken, undefined, { Origin: 'http://localhost:5173' })).headers.get('access-control-allow-origin'), 'http://localhost:5173');
  check('CORS refuses other sites', (await call('GET', '/products', null, userToken, undefined, { Origin: 'https://evil.example' })).headers.get('access-control-allow-origin'), null);
  const victim = `victim${stamp}@test.com`;
  const limit = Number(process.env.LOGIN_RATE_LIMIT) || 5;
  let last;
  for (let i = 0; i <= limit; i++) last = await call('POST', '/tokens', { emailId: victim, password: 'guess' + i });
  check(`Login blocked after ${limit} failed tries -> 429`, last.status, 429);
  check('Other accounts can still log in -> 200', (await call('POST', '/tokens', { emailId: email, password: 'secret123' })).status, 200);

  section('7. Transport Layer Security');
  check('API is served over HTTPS', BASE.startsWith('https://'), true);
  check('HSTS header sent', (await call('GET', '/products', null, userToken)).headers.has('strict-transport-security'), true);

  section('Cleanup');
  await call('PATCH', `/orders/${orderId}`, { status: 'Cancelled' }, adminToken);
  check('Admin DELETE /products/:id -> 200', (await call('DELETE', `/products/${pid}`, null, adminToken)).status, 200);
  check('Deleted product -> 404', (await call('GET', `/products/${pid}`, null, userToken)).status, 404);
  check('DELETE /users/:emailId -> 200', (await call('DELETE', `/users/${enc(email)}`, null, userToken)).status, 200);
  await call('DELETE', `/users/${enc(email2)}`, null, user2Token);
  await call('DELETE', `/users/${enc(`sneaky${stamp}@test.com`)}`, null, sneaky.data.token);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('Could not reach the server. Is "npm start" running?', e.message);
  process.exit(1);
});
