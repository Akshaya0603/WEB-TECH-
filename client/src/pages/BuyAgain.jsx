import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function BuyAgain() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const { user } = useApp();
  useEffect(() => {
    api(`/users/${encodeURIComponent(user.emailId)}/purchased-products`).then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  }, [user.emailId]);

  return (
    <>
      <h2>🔁 Buy again</h2>
      {error && <div className="msg err">{error}</div>}
      {products && products.length === 0 && <div className="msg">Nothing to buy again yet. Place an order first.</div>}
      <div className="grid">{products?.map((p) => <ProductCard key={p.productId} p={p} />)}</div>
    </>
  );
}
