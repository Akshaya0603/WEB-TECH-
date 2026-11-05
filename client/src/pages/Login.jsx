import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

export default function Login() {
  const [form, setForm] = useState({ emailId: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const d = await api('/tokens', { method: 'POST', body: form, auth: false });
      login(d);
      navigate('/'); // Home / products page
    } catch (err) {
      setError(err.message); // "User Not Registered." / "Invalid Password."
    }
  };

  return (
    <div className="card auth">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <label>Email ID<input type="email" value={form.emailId} onChange={set('emailId')} required /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} required /></label>
        <button className="btn">Login</button>
      </form>
      {error && <div className="msg err">{error}</div>}
      <p className="small">New here? <Link to="/register">Register</Link></p>
    </div>
  );
}
