import { useApp } from '../context/AppContext.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function Wishlist() {
  const { wishlist } = useApp();
  return (
    <>
      <h2>❤️ Your wishlist</h2>
      {wishlist.length === 0 && <div className="msg">Your wishlist is empty. Tap the 🤍 on any product.</div>}
      <div className="grid">{wishlist.map((p) => <ProductCard key={p.productId} p={p} />)}</div>
    </>
  );
}
