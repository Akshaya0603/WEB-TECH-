import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { api, money } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

export default function Payment() {
  const { state } = useLocation();
  const { clearCart, notify } = useApp();
  const [coupon, setCoupon] = useState(false);
  const [quote, setQuote] = useState(null);
  const [method, setMethod] = useState('');
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const items = state?.items;

  useEffect(() => {
    if (!items) return;
    api('/orders/quotes', { method: 'POST', body: { items, useCoupon: coupon } })
      .then((q) => { setQuote(q); setError(''); })
      .catch((e) => setError(e.message));
  }, [coupon]); // eslint-disable-line

  if (!items) return <Navigate to="/cart" replace />;

  if (order)
    return (
      <div className="card">
        <h2>✅ {`Order placed successfully!`}</h2>
        <p>Order total paid via {order.paymentMethod}: <strong>{money(order.total)}</strong></p>
        <p>🚚 Your items will be delivered in 1 day.</p>
        <Link to="/orders">View order history</Link> · <Link to="/">Continue shopping</Link>
      </div>
    );

  const pay = async () => {
    if (!method) return setError('Please select a payment method.');
    try {
      const d = await api('/orders', { method: 'POST', body: { items, paymentMethod: method, useCoupon: coupon } });
      if (state.fromCart) clearCart();
      notify('Order placed 🎉');
      setOrder(d.order);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="card">
      <h2>💳 Payment</h2>
      {quote && (
        <>
          <table>
            <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>
              {quote.items.map((i) => (
                <tr key={i.productId}>
                  <td>{i.productName}</td><td>{money(i.productPrice)}</td><td>{i.quantity}</td>
                  <td>{money(i.productPrice * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="totals">
            <div><span>Items total</span><span>{money(quote.subtotal)}</span></div>
            <div>
              <span>Delivery charge</span>
              <span>{quote.deliveryCharge === 0 ? 'FREE (items over ₹200)' : money(quote.deliveryCharge)}</span>
            </div>
            {quote.couponApplied && <div className="green"><span>Coupon (10% off)</span><span>− {money(quote.discount)}</span></div>}
            <div className="grand"><span>Total payable</span><span>{money(quote.total)}</span></div>
          </div>

          <button className="btn secondary" onClick={() => setCoupon(!coupon)}>
            {coupon ? '✓ Coupon applied (click to remove)' : '🎟️ Use coupon'}
          </button>

          <h3>Payment method</h3>
          <div className="methods">
            {quote.paymentMethods.map((m) => (
              <label key={m}>
                <input type="radio" name="pm" checked={method === m} onChange={() => setMethod(m)} /> {m}
              </label>
            ))}
          </div>
          <button className="btn" onClick={pay}>Pay {money(quote.total)}</button>
        </>
      )}
      {error && <div className="msg err">{error}</div>}
    </div>
  );
}
