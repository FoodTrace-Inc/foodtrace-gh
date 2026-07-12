import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { s, FormCard } from './styles';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ company_name: '', email: '', password: '', fda_reg_number: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard>
      <div style={s.logo}>🌿 FoodTrace GH</div>
      <h2 style={s.title}>Create Manufacturer Account</h2>
      {error && <div style={s.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={s.label}>Company Name *</label>
        <input style={s.input} value={form.company_name} onChange={set('company_name')} required placeholder="e.g. Akosua Foods Ltd" />

        <label style={s.label}>Email Address *</label>
        <input style={s.input} type="email" value={form.email} onChange={set('email')} required placeholder="company@example.com" />

        <label style={s.label}>Password *</label>
        <input style={s.input} type="password" value={form.password} onChange={set('password')} required minLength={8} placeholder="Min 8 characters" />

        <label style={s.label}>Ghana FDA Registration Number *</label>
        <input style={s.input} value={form.fda_reg_number} onChange={set('fda_reg_number')} required placeholder="e.g. FDA/GH/2024/001234" />

        <label style={s.label}>Phone Number</label>
        <input style={s.input} value={form.phone} onChange={set('phone')} placeholder="+233241234567" />

        <label style={s.label}>Business Address</label>
        <textarea style={{ ...s.input, height: '72px', resize: 'vertical' }} value={form.address} onChange={set('address')} placeholder="Street, City, Region" />

        <button style={s.btn} disabled={loading} type="submit">
          {loading ? 'Creating account...' : 'Create Account & Get OTP'}
        </button>
      </form>
      <p style={s.footer}>Already registered? <Link to="/login" style={s.link}>Log in</Link></p>
    </FormCard>
  );
}
