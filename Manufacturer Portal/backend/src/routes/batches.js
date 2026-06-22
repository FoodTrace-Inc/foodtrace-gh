import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateAndStoreQR } from '../services/qrService.js';

const router = Router();

// ─── PUBLIC SCAN ENDPOINT (no auth — consumer-facing) ───────────────────────
// GET /api/batches/:id/scan
router.get('/:id/scan', async (req, res, next) => {
  try {
    const { consumer_email, consumer_phone, push_token } = req.query;
    await query(
      `INSERT INTO qr_scans (batch_id, consumer_email, consumer_phone, push_token)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, consumer_email || null, consumer_phone || null, push_token || null]
    );

    const result = await query(
      `SELECT b.id, b.batch_number, b.product_name, b.packaging_date, b.expiry_date,
              b.status, b.quality_check_passed, b.raw_ingredients, b.processing_steps,
              m.company_name, m.fda_reg_number,
              r.reason AS recall_reason, r.safe_disposal, r.created_at AS recalled_at
       FROM batches b
       JOIN manufacturers m ON m.id = b.manufacturer_id
       LEFT JOIN recalls r ON r.batch_id = b.id AND r.status = 'active'
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });

    const batch = result.rows[0];
    let safetyStatus = 'green';
    if (batch.status === 'recalled') safetyStatus = 'red';
    else if (batch.status === 'under_investigation') safetyStatus = 'yellow';
    else if (!batch.quality_check_passed) safetyStatus = 'yellow';
    else if (new Date(batch.expiry_date) < new Date()) safetyStatus = 'yellow';

    res.json({ ...batch, safetyStatus });
  } catch (err) {
    next(err);
  }
});

// All routes below require authentication
router.use(authenticate);

// ─── CREATE BATCH (and auto-generate QR code) ───────────────────────────────
// POST /api/batches
router.post('/', async (req, res, next) => {
  try {
    const {
      batch_number,
      product_name,
      raw_ingredients,
      processing_steps,
      quality_check_passed,
      quality_check_notes,
      packaging_date,
      expiry_date,
    } = req.body;

    if (!batch_number || !product_name || !raw_ingredients || !processing_steps ||
        quality_check_passed === undefined || !packaging_date || !expiry_date) {
      return res.status(400).json({
        error: 'All fields required: batch_number, product_name, raw_ingredients, processing_steps, quality_check_passed, packaging_date, expiry_date',
      });
    }

    if (!Array.isArray(raw_ingredients) || raw_ingredients.length === 0) {
      return res.status(400).json({ error: 'raw_ingredients must be a non-empty array' });
    }

    if (!Array.isArray(processing_steps) || processing_steps.length === 0) {
      return res.status(400).json({ error: 'processing_steps must be a non-empty array' });
    }

    const result = await query(
      `INSERT INTO batches
         (manufacturer_id, batch_number, product_name, raw_ingredients, processing_steps,
          quality_check_passed, quality_check_notes, packaging_date, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.manufacturer.id,
        batch_number,
        product_name,
        JSON.stringify(raw_ingredients),
        JSON.stringify(processing_steps),
        quality_check_passed,
        quality_check_notes || null,
        packaging_date,
        expiry_date,
      ]
    );

    const batch = result.rows[0];

    const { scanUrl, qrUrl } = await generateAndStoreQR(batch.id);
    await query('UPDATE batches SET qr_url = $1, qr_code_data = $2 WHERE id = $3', [qrUrl, scanUrl, batch.id]);

    batch.qr_url = qrUrl;
    batch.qr_code_data = scanUrl;

    res.status(201).json({ message: 'Batch created and QR code generated', batch });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A batch with this batch number already exists for your account' });
    }
    next(err);
  }
});

// ─── LIST BATCHES ────────────────────────────────────────────────────────────
// GET /api/batches
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `
      SELECT b.*,
             r.id AS recall_id, r.reason AS recall_reason, r.created_at AS recalled_at
      FROM batches b
      LEFT JOIN recalls r ON r.batch_id = b.id AND r.status = 'active'
      WHERE b.manufacturer_id = $1
    `;
    const params = [req.manufacturer.id];

    if (status) {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }

    sql += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await query(sql, params);

    const countResult = await query(
      `SELECT COUNT(*) FROM batches WHERE manufacturer_id = $1${status ? ' AND status = $2' : ''}`,
      status ? [req.manufacturer.id, status] : [req.manufacturer.id]
    );

    res.json({
      batches: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET SINGLE BATCH ────────────────────────────────────────────────────────
// GET /api/batches/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*,
              r.id AS recall_id, r.reason AS recall_reason,
              r.safe_disposal, r.created_at AS recalled_at,
              m.company_name, m.fda_reg_number
       FROM batches b
       LEFT JOIN recalls r ON r.batch_id = b.id AND r.status = 'active'
       JOIN manufacturers m ON m.id = b.manufacturer_id
       WHERE b.id = $1 AND b.manufacturer_id = $2`,
      [req.params.id, req.manufacturer.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;