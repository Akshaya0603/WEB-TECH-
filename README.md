# ShopEasy – MERN Shopping Application:

## Run it
Prerequisites: Node 18+, and a MongoDB Atlas URI in `server/.env` (or MongoDB running locally).
Copy `server/.env.example` to `server/.env` and fill it in if you don't have one.

**Atlas:** your computer's IP must be allowed in Atlas → Security → Network Access
(or allow `0.0.0.0/0` for a lab project), otherwise the server prints "MongoDB connection failed".

```bash
# Terminal 1 – backend
cd server
npm install
npm run make-cert        # once: creates certs/ for HTTPS on localhost
npm run seed             # creates the products collection (18 sample products) - WARNING: deletes existing products
npm run hash-passwords   # once: bcrypt-hashes any old plain-text passwords
npm run create-admin     # creates/updates the admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env
npm start                # https://localhost:5000

# Terminal 2 – frontend
cd client
npm install
npm run dev              # https://localhost:5173  (proxies /api to the backend)

# Terminal 3 – optional: automated API test (needs the backend running)
cd server
npm run smoke-test       # ~80 checks covering all 7 principles
```

The certificate is self-signed, so the browser shows a warning the first time:
click **Advanced → Proceed to localhost**. For a trusted certificate, install
[mkcert](https://github.com/FiloSottile/mkcert), run `mkcert -install` and then
`mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1` inside `server/`.
Set `HTTPS=false` in `server/.env` to go back to plain HTTP.

## Collections
- **products**: productId, productName, productPrice, category, quantity, description (+ brand, colour, sizes, gender for filters)
- **users**: username, emailId (unique), age, password (bcrypt hash), role (`user` | `admin`), wishlist of productIds
- **orders**: emailId, items, subtotal, deliveryCharge, discount, total, couponApplied, paymentMethod, status (`Placed` | `Shipped` | `Delivered` | `Cancelled`)

## API
All routes start with `/api`. "JWT" = needs `Authorization: Bearer <token>` (get the token from `POST /api/tokens`).
"Self" = only the user named in the URL; "Admin" = token with role `admin`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | /users | public (rate limited) | Register → 201 / 400 / 409 |
| POST | /tokens | public (rate limited) | Log in → 200 + token / "User Not Registered." 404 / "Invalid Password." 401 |
| GET | /users/:emailId | Self or Admin | Profile |
| PUT | /users/:emailId | Self | Replace username, age, password |
| PATCH | /users/:emailId | Self | Update only the supplied fields |
| DELETE | /users/:emailId | Self | Delete the account |
| GET | /users/:emailId/orders | Self or Admin | Order history |
| GET | /users/:emailId/purchased-products | Self or Admin | "Buy again" list |
| GET | /users/:emailId/wishlist | Self | Wishlist |
| POST | /users/:emailId/wishlist | Self | Add `{ productId }` → 201 (200 if already there) |
| DELETE | /users/:emailId/wishlist/:productId | Self | Remove from wishlist |
| GET | /products | JWT | Products (`category, brand, colour, size, gender, sort=price_asc\|price_desc\|name`) |
| GET | /products/filters | JWT | Values for the category bar + filter dropdowns |
| GET | /products/:productId | JWT | One product |
| POST | /products | Admin | Add product → 201 / 409 |
| PATCH | /products/:productId | Admin | Update price, stock, etc. |
| DELETE | /products/:productId | Admin | Delete product |
| POST | /orders/quotes | JWT | Price breakdown (delivery + coupon) without ordering |
| POST | /orders | JWT | Place order (reduces stock) → 201 |
| GET | /orders | Admin | Every customer's orders |
| GET | /orders/:orderId | Owner or Admin | One order |
| PATCH | /orders/:orderId | Admin | Change `status` |

PUT/PATCH/DELETE on `/users/:emailId` return 404 if the user does not exist and 403 if it is not your account.

## The 7 REST / security principles – where they are
| # | Principle | Where |
|---|---|---|
| 1 | Authentication | `server/middleware/auth.js` (`sign`, `requireAuth`: HS256-only JWT, 2 h expiry, strong secret required at startup in `server.js`); `server/models/User.js` (bcrypt pre-save hook, `checkPassword`); `POST /api/tokens` in `server/routes/users.js` |
| 2 | Authorization | `role` in `models/User.js`; `requireAdmin` and `requireSelf` in `middleware/auth.js`; admin created only by `scripts/create-admin.js`; client guard `AdminOnly` in `client/src/App.jsx`, admin UI `client/src/pages/Admin.jsx` |
| 3 | Statelessness | No server sessions: each request carries the JWT (`client/src/api.js`), verified on every call (`requireAuth`); the token holds email + role; cart lives in the browser |
| 4 | Resource-oriented URIs | Nouns + HTTP verbs, sub-resources under `/users/:emailId/...` (table above); `routes/*.js` |
| 5 | Status codes & errors | Central JSON error handler in `server.js` (400 bad JSON / bad IDs, 413 too large, 409 duplicates, 500 without stack traces); 201/400/401/403/404/409/429 across the routes |
| 6 | Validation & sanitization | `middleware/sanitize.js` (rejects `$` / `.` keys → blocks NoSQL operator injection); `app.set('query parser', 'simple')` + `strictQuery` in `server.js`; `utils/validate.js` (users + products); filter whitelist in `routes/products.js`; order checks in `utils/pricing.js` and `routes/orders.js`; 10 kb body limit |
| 7 | HTTPS & rate limiting | `server.js` (HTTPS with `certs/`, TLS 1.2+, helmet security headers + HSTS, CORS limited to the client); `scripts/make-cert.js`; `client/vite.config.js` (HTTPS dev server + proxy); `middleware/rateLimit.js` (300 req/15 min per IP, 5 failed logins/15 min per IP+email, 20 sign-ups/hour per IP) |

Note on "SQL injection": this app uses MongoDB, so the equivalent attack is **NoSQL operator injection**
(e.g. logging in with `{"password": {"$ne": null}}`). It is blocked by the sanitize middleware, the
simple query parser and the type checks – the JWT proves *who* the user is, it does not stop injection by itself.

## Extra features (from web_tech.docx)
| Requirement | Where |
|---|---|
| Categories at top of Home | `pages/Home.jsx` chip bar |
| Sort + filter by brand, colour, size, gender | Home filter bar → `GET /api/products?...` |
| "Delivery in one day" on products | `components/ProductCard.jsx` |
| Top menu with emojis (Home, Cart, Menu, Account) | `components/Navbar.jsx` |
| Account → Wishlist, Order history, Buy again | Account dropdown + pages |
| Buy now / Add to cart | ProductCard |
| Delivery ₹30, free if items total > ₹200 | `server/utils/pricing.js` |
| Low-stock warning when quantity < 3 | ProductCard |
| "Buy all now" → payment page (items, total, delivery) | `pages/Cart.jsx` → `pages/Payment.jsx` |
| Payment types + "Use coupon" (10% off) | `pages/Payment.jsx` |
| Login / Register → Home | `pages/Register.jsx`, `pages/Login.jsx` |

## Design decisions to know about
- Passwords are stored as **bcrypt hashes** (cost 10) and checked with `bcrypt.compare`.
- Login keeps the two separate messages ("User Not Registered." / "Invalid Password.") for usability; brute force is limited by the login rate limiter.
- Product access is protected with a JWT, so calling `GET /api/products` without logging in returns 401. Tokens are valid for 2 hours.
- The coupon takes 10% off the **items total**; the delivery rule is evaluated on the items total *before* the coupon.
- After registering, the success message is shown and you are taken to the Login page; Login takes you to Home.
- Email ID is the identifier, so PUT/PATCH edit username, age and password only.
- Changing `JWT_SECRET` logs everyone out (old tokens stop verifying).
- A demoted admin keeps admin rights until their current token expires (the role is read from the token).
