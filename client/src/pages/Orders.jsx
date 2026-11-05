import { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const { user } = useApp();
  useEffect(() => {
    api(`/users/${encodeURIComponent(user.emailId)}/orders`).then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, [user.emailId]);

  return (
    <>
      <h2>📦 Order history</h2>
      {error && <div className="msg err">{error}</div>}
      {orders && orders.length === 0 && <div className="msg">You haven't placed any orders yet.</div>}
      {orders?.map((o) => (
        <div className="card" key={o._id}>
          <div className="row between">
            <strong>Order #{o._id.slice(-6).toUpperCase()} · {o.status || 'Placed'}</strong>
            <span className="muted small">{new Date(o.createdAt).toLocaleString()}</span>
          </div>
          <ul>
            {o.items.map((i) => (
              <li key={i.productId}>{i.productName} × {i.quantity} — {money(i.productPrice * i.quantity)}</li>
            ))}
          </ul>
          <div className="small">
            Delivery: {o.deliveryCharge ? money(o.deliveryCharge) : 'Free'}
            {o.couponApplied && <> · Coupon: −{money(o.discount)}</>} · Paid via {o.paymentMethod}
          </div>
          <strong>Total: {money(o.total)}</strong>
        </div>
      ))}
    </>
  );
}
