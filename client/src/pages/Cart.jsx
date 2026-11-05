import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { money } from '../api.js';
import ProductImage from '../components/ProductImage.jsx';

export default function Cart() {
  const { cart, setQty, removeFromCart } = useApp();
  const navigate = useNavigate();
  const total = cart.reduce((s, i) => s + i.productPrice * i.quantity, 0);

  if (cart.length === 0)
    return (
      <div className="card">
        <h2>🛒 Your cart is empty</h2>
        <Link to="/">Continue shopping</Link>
      </div>
    );

  return (
    <div className="card">
      <h2>🛒 Your cart</h2>
      <table>
        <thead>
          <tr><th>Item</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr>
        </thead>
        <tbody>
          {cart.map((i) => (
            <tr key={i.productId}>
              <td><ProductImage small productId={i.productId} alt={i.productName} />{i.productName}</td>
              <td>{money(i.productPrice)}</td>
              <td>
                <button className="qty" onClick={() => setQty(i.productId, i.quantity - 1)}>−</button>
                <span className="qtynum">{i.quantity}</span>
                <button className="qty" onClick={() => setQty(i.productId, i.quantity + 1)}>+</button>
              </td>
              <td>{money(i.productPrice * i.quantity)}</td>
              <td><button className="link" onClick={() => removeFromCart(i.productId)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="summary">
        <strong>Items total: {money(total)}</strong>
        <button
          className="btn"
          onClick={() =>
            navigate('/payment', { state: { fromCart: true, items: cart.map(({ stock, ...rest }) => rest) } })
          }
        >
          Buy all now
        </button>
      </div>
    </div>
  );
}
