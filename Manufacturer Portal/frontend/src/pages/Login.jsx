import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { s, FormCard } from './styles';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.manufacturer);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard>
      <div style={s.logo}>🌿 FoodTrace GH</div>
      <h2 style={s.title}>Manufacturer Login</h2>
      {error && <div style={s.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={s.label}>Email Address</label>
        <input style={s.input} type="email" value={form.email} onChange={set('email')} required placeholder="company@example.com" />

        <label style={s.label}>Password</label>
        <input style={s.input} type="password" value={form.password} onChange={set('password')} required />

        <button style={s.btn} disabled={loading} type="submit">
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <p style={s.footer}>No account? <Link to="/register" style={s.link}>Register here</Link></p>
    </FormCard>
  );
}
