import { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

const EMPTY = { productId: '', productName: '', productPrice: '', category: '', quantity: '', brand: '', colour: '', gender: '', sizes: '', description: '' };

export default function Admin() {
  const { notify } = useApp();
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [edits, setEdits] = useState({}); // productId -> { productPrice, quantity }
  const [orders, setOrders] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const loadProducts = () => api('/products').then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    if (tab === 'orders' && !orders) api('/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, [tab, orders]);

  const setEdit = (id, k, v) => setEdits((e) => ({ ...e, [id]: { ...e[id], [k]: v } }));

  const save = async (p) => {
    const e = edits[p.productId] || {};
    const body = {};
    if (e.productPrice !== undefined) body.productPrice = Number(e.productPrice);
    if (e.quantity !== undefined) body.quantity = Number(e.quantity);
    if (!Object.keys(body).length) return notify('Nothing changed');
    try {
      const d = await api(`/products/${encodeURIComponent(p.productId)}`, { method: 'PATCH', body });
      setProducts((ps) => ps.map((x) => (x.productId === p.productId ? d.product : x)));
      setEdits((x) => ({ ...x, [p.productId]: undefined }));
      notify(d.message);
    } catch (err) { notify(err.message); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.productName}"?`)) return;
    try {
      const d = await api(`/products/${encodeURIComponent(p.productId)}`, { method: 'DELETE' });
      setProducts((ps) => ps.filter((x) => x.productId !== p.productId));
      notify(d.message);
    } catch (err) { notify(err.message); }
  };

  const setStatus = async (o, status) => {
    try {
      const d = await api(`/orders/${o._id}`, { method: 'PATCH', body: { status } });
      setOrders((os) => os.map((x) => (x._id === o._id ? d.order : x)));
      notify(d.message);
    } catch (err) { notify(err.message); }
  };

  const add = async (e) => {
    e.preventDefault();
    setError('');
    const body = { ...form, productPrice: Number(form.productPrice), quantity: Number(form.quantity) };
    body.sizes = form.sizes ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    Object.keys(body).forEach((k) => body[k] === '' && delete body[k]);
    try {
      const d = await api('/products', { method: 'POST', body });
      setProducts((ps) => [...ps, d.product]);
      setForm(EMPTY);
      notify(d.message);
    } catch (err) { setError(err.message); }
  };

  const field = (k, label, type = 'text') => (
    <label key={k}>{label}<input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
  );

  return (
    <>
      <h2>🛠️ Admin</h2>
      <div className="tabs">
        <button className={`chip ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>Products</button>
        <button className={`chip ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>All orders</button>
      </div>
      {error && <div className="msg err">{error}</div>}

      {tab === 'products' && (
        <>
          <form className="card" onSubmit={add}>
            <h3>Add product</h3>
            <div className="admin-form">
              {field('productId', 'Product ID *')}
              {field('productName', 'Name *')}
              {field('productPrice', 'Price (₹) *', 'number')}
              {field('category', 'Category *')}
              {field('quantity', 'Stock *', 'number')}
              {field('brand', 'Brand')}
              {field('colour', 'Colour')}
              {field('gender', 'Gender')}
              {field('sizes', 'Sizes (comma separated)')}
              {field('description', 'Description')}
              <button className="btn">Add</button>
            </div>
          </form>

          <div className="card table-wrap">
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price (₹)</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const e = edits[p.productId] || {};
                  return (
                    <tr key={p.productId}>
                      <td>{p.productId}</td>
                      <td>{p.productName}</td>
                      <td>{p.category}</td>
                      <td><input type="number" min="0" value={e.productPrice ?? p.productPrice} onChange={(ev) => setEdit(p.productId, 'productPrice', ev.target.value)} /></td>
                      <td><input type="number" min="0" step="1" value={e.quantity ?? p.quantity} onChange={(ev) => setEdit(p.productId, 'quantity', ev.target.value)} /></td>
                      <td>
                        <button className="btn secondary" onClick={() => save(p)}>Save</button>{' '}
                        <button className="link" onClick={() => remove(p)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'orders' && (
        <>
          {orders && orders.length === 0 && <div className="msg">No orders yet.</div>}
          {orders?.map((o) => (
            <div className="card" key={o._id}>
              <div className="row between">
                <strong>Order #{o._id.slice(-6).toUpperCase()} · {o.emailId}</strong>
                <span className="muted small">{new Date(o.createdAt).toLocaleString()}</span>
              </div>
              <ul>
                {o.items.map((i) => <li key={i.productId}>{i.productName} × {i.quantity} — {money(i.productPrice * i.quantity)}</li>)}
              </ul>
              <div className="row between">
                <span><strong>Total: {money(o.total)}</strong> <span className="small muted">· {o.paymentMethod}</span></span>
                <select value={o.status || 'Placed'} onChange={(ev) => setStatus(o, ev.target.value)} style={{ width: 'auto', margin: 0 }}>
                  {['Placed', 'Shipped', 'Delivered', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
