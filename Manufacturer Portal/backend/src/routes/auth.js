import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { generateOTP, sendOTPEmail } from '../services/emailService.js';

const router = Router();

// ─── REGISTER (Step 1: submit details + receive OTP) ────────────────────────
// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { company_name, email, password, fda_reg_number, phone, address } = req.body;

    if (!company_name || !email || !password || !fda_reg_number) {
      return res.status(400).json({ error: 'company_name, email, password, and fda_reg_number are required' });
    }

    // Check duplicates
    const existing = await query(
      'SELECT id FROM manufacturers WHERE email = $1 OR fda_reg_number = $2',
      [email, fda_reg_number]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or FDA registration number already in use' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Create unverified account
    await query(
      `INSERT INTO manufacturers (company_name, email, password_hash, fda_reg_number, phone, address, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
      [company_name, email, password_hash, fda_reg_number, phone || null, address || null]
    );

    // Generate + store OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await query(
      `INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES ($1, $2, 'register', $3)`,
      [email, otp, expiresAt]
    );

    await sendOTPEmail(email, otp, 'register');

    res.status(201).json({ message: 'Account created. Check your email for the verification code.' });
  } catch (err) {
    next(err);
  }
});

// ─── VERIFY OTP (Step 2: activate account) ──────────────────────────────────
// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'email and code are required' });

    const result = await query(
      `SELECT * FROM otp_codes
       WHERE email = $1 AND code = $2 AND purpose = 'register'
         AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP used and activate account
    await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [result.rows[0].id]);
    await query('UPDATE manufacturers SET is_verified = TRUE WHERE email = $1', [email]);

    res.json({ message: 'Email verified. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const result = await query(
      'SELECT * FROM manufacturers WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    const manufacturer = result.rows[0];

    if (!manufacturer) return res.status(401).json({ error: 'Invalid credentials' });
    if (!manufacturer.is_verified) return res.status(403).json({ error: 'Email not verified yet' });

    const valid = await bcrypt.compare(password, manufacturer.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: manufacturer.id, email: manufacturer.email, company_name: manufacturer.company_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      manufacturer: {
        id: manufacturer.id,
        company_name: manufacturer.company_name,
        email: manufacturer.email,
        fda_reg_number: manufacturer.fda_reg_number,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── RESEND OTP ──────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const mfr = await query('SELECT id FROM manufacturers WHERE email = $1', [email]);
    if (mfr.rows.length === 0) return res.status(404).json({ error: 'No account found for this email' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await query(
      `INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES ($1, $2, 'register', $3)`,
      [email, otp, expiresAt]
    );
    await sendOTPEmail(email, otp, 'register');

    res.json({ message: 'New OTP sent.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET CURRENT MANUFACTURER (me) ──────────────────────────────────────────
// GET /api/auth/me  (requires token)
import { authenticate } from '../middleware/auth.js';
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, company_name, email, fda_reg_number, phone, address, created_at FROM manufacturers WHERE id = $1',
      [req.manufacturer.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
