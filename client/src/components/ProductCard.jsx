import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { money } from '../api.js';
import ProductImage from './ProductImage.jsx';

export default function ProductCard({ p }) {
  const { addToCart, inWishlist, toggleWishlist } = useApp();
  const navigate = useNavigate();
  const out = p.quantity < 1;
  const low = p.quantity > 0 && p.quantity < 3;

  const buyNow = () =>
    navigate('/payment', {
      state: { items: [{ productId: p.productId, productName: p.productName, productPrice: p.productPrice, quantity: 1 }] },
    });

  return (
    <div className="card product">
      <button
        className={'heart' + (inWishlist(p.productId) ? ' on' : '')}
        title="Wishlist"
        onClick={() => toggleWishlist(p)}
      >
        {inWishlist(p.productId) ? '❤️' : '🤍'}
      </button>
      <ProductImage productId={p.productId} imageUrl={p.imageUrl} category={p.category} alt={p.productName} />
      <div className="small muted">Product ID: {p.productId}</div>
      <h3>{p.productName}</h3>
      <div className="price">{money(p.productPrice)}</div>
      <div className="small">Category: {p.category}</div>
      <div className="small">Available quantity: {p.quantity}</div>
      <p className="small desc">{p.description}</p>
      <div className="tags">
        {p.brand && <span>{p.brand}</span>}
        {p.colour && <span>{p.colour}</span>}
        {p.gender && <span>{p.gender}</span>}
        {p.sizes?.length > 0 && <span>Sizes: {p.sizes.join(', ')}</span>}
      </div>
      <div className="delivery">🚚 Delivery in 1 day</div>
      {low && <div className="warn">⚠️ Hurry! Only {p.quantity} left in stock</div>}
      {out && <div className="warn out">❌ Out of stock</div>}
      <div className="row">
        <button className="btn secondary" disabled={out} onClick={() => addToCart(p)}>Add to cart</button>
        <button className="btn" disabled={out} onClick={buyNow}>Buy now</button>
      </div>
    </div>
  );
}
