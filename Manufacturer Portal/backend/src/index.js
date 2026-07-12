import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import batchRoutes from './routes/batches.js';
import recallRoutes from './routes/recalls.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Serve local QR code images (placeholder — replace with S3 in production)
app.use('/qr-codes', express.static(path.join(__dirname, '..', 'public', 'qr-codes')));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/recalls', recallRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'FoodTrace GH API' }));

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 FoodTrace GH backend running on http://localhost:${PORT}`);
});
