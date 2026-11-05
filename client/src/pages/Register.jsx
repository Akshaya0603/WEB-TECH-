import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Register() {
  const [form, setForm] = useState({ username: '', emailId: '', age: '', password: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const d = await api('/users', { method: 'POST', body: form, auth: false });
      setMsg({ type: 'ok', text: d.message });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
      setBusy(false);
    }
  };

  return (
    <div className="card auth">
      <h2>Create your account</h2>
      <form onSubmit={submit}>
        <label>Username<input value={form.username} onChange={set('username')} required /></label>
        <label>Email ID<input type="email" value={form.emailId} onChange={set('emailId')} required /></label>
        <label>Age<input type="number" min="1" max="120" value={form.age} onChange={set('age')} required /></label>
        <label>Password<input type="password" minLength="6" value={form.password} onChange={set('password')} required /></label>
        <button className="btn" disabled={busy}>Register</button>
      </form>
      {msg.text && <div className={'msg ' + msg.type}>{msg.text}</div>}
      <p className="small">Already registered? <Link to="/login">Login</Link></p>
    </div>
  );
}
