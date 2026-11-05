import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

export default function Profile() {
  const { user, updateUser, logout } = useApp();
  const navigate = useNavigate();
  const url = `/users/${encodeURIComponent(user.emailId)}`;

  const [full, setFull] = useState({ username: user.username, age: user.age, password: '' });
  const [part, setPart] = useState({ username: '', age: '', password: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const run = async (method, body, after) => {
    try {
      const d = await api(url, { method, body });
      setMsg({ type: 'ok', text: d.message });
      after?.(d);
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
  };

  const put = (e) => {
    e.preventDefault();
    run('PUT', full, (d) => { updateUser(d.user); setFull({ ...full, password: '' }); });
  };
  const patch = (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.entries(part).filter(([, v]) => v !== ''));
    if (!Object.keys(body).length) return setMsg({ type: 'err', text: 'Fill at least one field to update.' });
    run('PATCH', body, (d) => { updateUser(d.user); setPart({ username: '', age: '', password: '' }); });
  };
  const del = () => {
    if (!window.confirm('Delete your account permanently?')) return;
    run('DELETE', undefined, () => { logout(); navigate('/register'); });
  };

  return (
    <>
      <h2>⚙️ My profile</h2>
      <p className="muted">Email: <strong>{user.emailId}</strong> (cannot be changed) · Current name: {user.username} · Age: {user.age}</p>
      {msg.text && <div className={'msg ' + msg.type}>{msg.text}</div>}

      <div className="two">
        <form className="card" onSubmit={put}>
          <h3>Update complete details <small>(PUT)</small></h3>
          <label>Username<input value={full.username} onChange={(e) => setFull({ ...full, username: e.target.value })} required /></label>
          <label>Age<input type="number" value={full.age} onChange={(e) => setFull({ ...full, age: e.target.value })} required /></label>
          <label>Password<input type="password" value={full.password} onChange={(e) => setFull({ ...full, password: e.target.value })} required /></label>
          <button className="btn">Replace all details</button>
        </form>

        <form className="card" onSubmit={patch}>
          <h3>Update selected details <small>(PATCH)</small></h3>
          <p className="small muted">Fill only the fields you want to change.</p>
          <label>Username<input value={part.username} onChange={(e) => setPart({ ...part, username: e.target.value })} /></label>
          <label>Age<input type="number" value={part.age} onChange={(e) => setPart({ ...part, age: e.target.value })} /></label>
          <label>Password<input type="password" value={part.password} onChange={(e) => setPart({ ...part, password: e.target.value })} /></label>
          <button className="btn">Update selected</button>
        </form>
      </div>

      <div className="card danger">
        <h3>Delete account <small>(DELETE)</small></h3>
        <button className="btn red" onClick={del}>Delete my account</button>
      </div>
    </>
  );
}
