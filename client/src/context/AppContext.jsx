import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => read('user', null));
  const [cart, setCart] = useState(() => read('cart', []));
  const [wishlist, setWishlist] = useState([]); // array of product objects
  const [toast, setToast] = useState('');

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }, []);

  useEffect(() => localStorage.setItem('cart', JSON.stringify(cart)), [cart]);

  const login = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCart([]);
    setWishlist([]);
  }, []);
  const updateUser = (u) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  useEffect(() => {
    const h = () => logout();
    window.addEventListener('auth-expired', h);
    return () => window.removeEventListener('auth-expired', h);
  }, [logout]);

  // load wishlist after login
  useEffect(() => {
    if (!user) return;
    api(`/users/${encodeURIComponent(user.emailId)}/wishlist`).then((d) => setWishlist(d.products)).catch(() => {});
  }, [user]);

  // ---- cart ----
  const addToCart = (p) => {
    if (p.quantity < 1) return notify('Out of stock');
    setCart((c) => {
      const found = c.find((i) => i.productId === p.productId);
      if (found) {
        if (found.quantity >= p.quantity) {
          notify(`Only ${p.quantity} in stock`);
          return c;
        }
        return c.map((i) => (i.productId === p.productId ? { ...i, quantity: i.quantity + 1, stock: p.quantity } : i));
      }
      return [...c, { productId: p.productId, productName: p.productName, productPrice: p.productPrice, quantity: 1, stock: p.quantity }];
    });
    notify('🛒 Added to cart');
  };
  const setQty = (productId, qty) =>
    setCart((c) =>
      c.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock)) } : i))
    );
  const removeFromCart = (productId) => setCart((c) => c.filter((i) => i.productId !== productId));
  const clearCart = () => setCart([]);

  // ---- wishlist ----
  const inWishlist = (id) => wishlist.some((p) => p.productId === id);
  const toggleWishlist = async (p) => {
    try {
      if (inWishlist(p.productId)) {
        await api(`/users/${encodeURIComponent(user.emailId)}/wishlist/${encodeURIComponent(p.productId)}`, { method: 'DELETE' });
        setWishlist((w) => w.filter((x) => x.productId !== p.productId));
        notify('Removed from wishlist');
      } else {
        await api(`/users/${encodeURIComponent(user.emailId)}/wishlist`, { method: 'POST', body: { productId: p.productId } });
        setWishlist((w) => [...w, p]);
        notify('❤️ Added to wishlist');
      }
    } catch (e) {
      notify(e.message);
    }
  };

  const value = {
    user, login, logout, updateUser,
    cart, addToCart, setQty, removeFromCart, clearCart,
    wishlist, inWishlist, toggleWishlist, notify,
  };
  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && <div className="toast">{toast}</div>}
    </Ctx.Provider>
  );
}
