import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { api, emojiFor } from '../api.js';

export default function Navbar() {
  const { cart, user, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(null); // 'menu' | 'account' | null
  const [categories, setCategories] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    api('/products/filters').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const go = (path) => {
    setOpen(null);
    navigate(path);
  };
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="navbar" ref={ref}>
      <Link to="/" className="brand">🛍️ ShopEasy</Link>
      <nav>
        <NavLink to="/" end>🏠 Home</NavLink>
        <NavLink to="/cart">🛒 Cart{count > 0 && <span className="badge">{count}</span>}</NavLink>
        {user.role === 'admin' && <NavLink to="/admin">🛠️ Admin</NavLink>}

        <div className="dropdown">
          <button onClick={() => setOpen(open === 'menu' ? null : 'menu')}>📂 Menu ▾</button>
          {open === 'menu' && (
            <div className="dropdown-panel">
              <button onClick={() => go('/')}>🛍️ All products</button>
              {categories.map((c) => (
                <button key={c} onClick={() => go(`/?category=${encodeURIComponent(c)}`)}>
                  {emojiFor(c)} {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="dropdown">
          <button onClick={() => setOpen(open === 'account' ? null : 'account')}>👤 Account ▾</button>
          {open === 'account' && (
            <div className="dropdown-panel right">
              <div className="muted small">Hi, {user.username}</div>
              <button onClick={() => go('/wishlist')}>❤️ Wishlist</button>
              <button onClick={() => go('/orders')}>📦 Order history</button>
              <button onClick={() => go('/buy-again')}>🔁 Buy again</button>
              <button onClick={() => go('/profile')}>⚙️ Profile</button>
              <button onClick={() => { setOpen(null); logout(); navigate('/login'); }}>🚪 Logout</button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
