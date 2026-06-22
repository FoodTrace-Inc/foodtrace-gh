import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/axios';
import { s, FormCard } from './styles';

export default function OTPVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, code });
      setSuccess('Email verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true); setError('');
    try {
      await api.post('/auth/resend-otp', { email });
      setSuccess('A new code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <FormCard>
      <div style={s.logo}>🌿 FoodTrace GH</div>
      <h2 style={s.title}>Verify Your Email</h2>
      <p style={{ textAlign: 'center', color: '#718096', fontSize: '14px', marginBottom: '20px' }}>
        We sent a 6-digit code to <strong>{email}</strong>
      </p>
      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.success}>{success}</div>}
      <form onSubmit={handleSubmit}>
        <label style={s.label}>Verification Code</label>
        <input
          style={{ ...s.input, textAlign: 'center', fontSize: '28px', letterSpacing: '12px', fontWeight: 700 }}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          required
        />
        <button style={s.btn} disabled={loading || code.length < 6} type="submit">
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>
      <p style={s.footer}>
        Didn't receive a code?{' '}
        <button onClick={handleResend} disabled={resending} style={{ ...s.link, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
          {resending ? 'Sending...' : 'Resend'}
        </button>
      </p>
    </FormCard>
  );
}
