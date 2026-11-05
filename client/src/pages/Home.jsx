import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, emojiFor } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

const EMPTY = { brand: '', colour: '', size: '', gender: '', sort: '' };

export default function Home() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const [filters, setFilters] = useState(EMPTY);
  const [options, setOptions] = useState({ categories: [], brands: [], colours: [], genders: [], sizes: [] });
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/products/filters').then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    setStatus('loading');
    api('/products?' + qs.toString())
      .then((d) => {
        setProducts(d.products);
        setStatus('done');
      })
      .catch((e) => {
        setError(e.message);
        setStatus('error');
      });
  }, [category, filters]);

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const pickCategory = (c) => setParams(c ? { category: c } : {});

  const Select = ({ k, label, values }) => (
    <select value={filters[k]} onChange={setF(k)}>
      <option value="">{label}</option>
      {values.map((v) => <option key={v}>{v}</option>)}
    </select>
  );

  return (
    <>
      <div className="categories">
        <button className={!category ? 'chip active' : 'chip'} onClick={() => pickCategory('')}>🛍️ All</button>
        {options.categories.map((c) => (
          <button key={c} className={category === c ? 'chip active' : 'chip'} onClick={() => pickCategory(c)}>
            {emojiFor(c)} {c}
          </button>
        ))}
      </div>

      <div className="filters card">
        <Select k="brand" label="Brand" values={options.brands} />
        <Select k="colour" label="Colour" values={options.colours} />
        <Select k="size" label="Size" values={options.sizes} />
        <Select k="gender" label="Gender" values={options.genders} />
        <select value={filters.sort} onChange={setF('sort')}>
          <option value="">Sort: Default</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name">Name: A–Z</option>
        </select>
        <button className="btn secondary" onClick={() => setFilters(EMPTY)}>Clear</button>
      </div>

      {status === 'loading' && <p className="muted">Loading products…</p>}
      {status === 'error' && <div className="msg err">{error}</div>}
      {status === 'done' && products.length === 0 && <div className="msg">No products available.</div>}
      <div className="grid">
        {products.map((p) => <ProductCard key={p.productId} p={p} />)}
      </div>
    </>
  );
}
