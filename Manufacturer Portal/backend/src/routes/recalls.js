import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendRecallEmail } from '../services/emailService.js';
import { sendRecallSMS, buildRecallMessage } from '../services/smsService.js';
import { sendPushNotification, buildRecallPushPayload } from '../services/notificationService.js';

const router = Router();

router.use(authenticate);

// ─── ISSUE A RECALL ──────────────────────────────────────────────────────────
// POST /api/recalls
router.post('/', async (req, res, next) => {
  try {
    const { batch_id, reason, safe_disposal } = req.body;
    if (!batch_id || !reason) {
      return res.status(400).json({ error: 'batch_id and reason are required' });
    }

    // Verify the batch belongs to this manufacturer
    const batchResult = await query(
      'SELECT * FROM batches WHERE id = $1 AND manufacturer_id = $2',
      [batch_id, req.manufacturer.id]
    );
    if (batchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or not yours' });
    }
    const batch = batchResult.rows[0];

    // Check not already recalled
    if (batch.status === 'recalled') {
      return res.status(409).json({ error: 'Batch is already recalled' });
    }

    // Create recall record
    const recallResult = await query(
      `INSERT INTO recalls (batch_id, issued_by_type, issued_by_id, reason, safe_disposal)
       VALUES ($1, 'manufacturer', $2, $3, $4)
       RETURNING *`,
      [batch_id, req.manufacturer.id, reason, safe_disposal || null]
    );
    const recall = recallResult.rows[0];

    // Update batch status to recalled — this instantly affects all QR scans
    await query("UPDATE batches SET status = 'recalled' WHERE id = $1", [batch_id]);

    // ─── Notify consumers who scanned this batch (last 90 days) ──────────────
    const scansResult = await query(
      `SELECT DISTINCT consumer_email, consumer_phone, push_token
       FROM qr_scans
       WHERE batch_id = $1 AND scanned_at > NOW() - INTERVAL '90 days'`,
      [batch_id]
    );

    const batchInfo = { product_name: batch.product_name, batch_number: batch.batch_number };
    const notificationPromises = [];

    for (const scan of scansResult.rows) {
      // Email
      if (scan.consumer_email) {
        notificationPromises.push(
          sendRecallEmail(scan.consumer_email, batchInfo, reason, safe_disposal)
            .then(() =>
              query(
                `INSERT INTO recall_notifications (recall_id, recipient, channel, status) VALUES ($1,$2,'email','sent')`,
                [recall.id, scan.consumer_email]
              )
            )
            .catch((err) => console.error(`Email failed for ${scan.consumer_email}:`, err))
        );
      }

      // SMS
      if (scan.consumer_phone) {
        const msg = buildRecallMessage(batch.product_name, batch.batch_number, reason);
        notificationPromises.push(
          sendRecallSMS(scan.consumer_phone, msg)
            .then(() =>
              query(
                `INSERT INTO recall_notifications (recall_id, recipient, channel, status) VALUES ($1,$2,'sms','sent')`,
                [recall.id, scan.consumer_phone]
              )
            )
            .catch((err) => console.error(`SMS failed for ${scan.consumer_phone}:`, err))
        );
      }

      // Push
      if (scan.push_token) {
        const payload = buildRecallPushPayload(batch.product_name, batch.batch_number, recall.id);
        notificationPromises.push(
          sendPushNotification(scan.push_token, payload)
            .then(() =>
              query(
                `INSERT INTO recall_notifications (recall_id, recipient, channel, status) VALUES ($1,$2,'push','sent')`,
                [recall.id, scan.push_token]
              )
            )
            .catch((err) => console.error(`Push failed for token ${scan.push_token}:`, err))
        );
      }
    }

    // Fire all notifications concurrently (don't await — respond immediately)
    Promise.allSettled(notificationPromises).then(() => {
      console.log(`Recall ${recall.id}: notifications dispatched to ${scansResult.rows.length} consumers`);
    });

    res.status(201).json({
      message: 'Recall issued. All QR scans now show RECALLED status. Consumers are being notified.',
      recall,
      consumers_notified: scansResult.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

// ─── LIST RECALLS (for this manufacturer's batches) ──────────────────────────
// GET /api/recalls
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, b.batch_number, b.product_name
       FROM recalls r
       JOIN batches b ON b.id = r.batch_id
       WHERE b.manufacturer_id = $1
       ORDER BY r.created_at DESC`,
      [req.manufacturer.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ─── GET SINGLE RECALL ───────────────────────────────────────────────────────
// GET /api/recalls/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, b.batch_number, b.product_name,
              (SELECT COUNT(*) FROM recall_notifications WHERE recall_id = r.id) AS notifications_sent
       FROM recalls r
       JOIN batches b ON b.id = r.batch_id
       WHERE r.id = $1 AND b.manufacturer_id = $2`,
      [req.params.id, req.manufacturer.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Recall not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─── RESOLVE / CLOSE A RECALL ────────────────────────────────────────────────
// PATCH /api/recalls/:id/resolve
router.patch('/:id/resolve', async (req, res, next) => {
  try {
    // Verify ownership
    const check = await query(
      `SELECT r.id FROM recalls r
       JOIN batches b ON b.id = r.batch_id
       WHERE r.id = $1 AND b.manufacturer_id = $2`,
      [req.params.id, req.manufacturer.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Recall not found' });

    await query(
      `UPDATE recalls SET status = 'resolved', resolved_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.json({ message: 'Recall marked as resolved' });
  } catch (err) {
    next(err);
  }
});

export default router;
