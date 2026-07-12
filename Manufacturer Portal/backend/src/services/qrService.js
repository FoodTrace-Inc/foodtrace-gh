import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

/**
 * Generate a QR code and either:
 *  - Upload to S3 (when credentials are configured), or
 *  - Save locally (placeholder mode)
 *
 * Returns the URL/path of the stored QR image.
 */

const LOCAL_QR_DIR = path.resolve('public/qr-codes');

/**
 * Build the public scan URL for a batch
 */
export const buildScanUrl = (batchId) => {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base}/scan/${batchId}`;
};

/**
 * Generate QR code PNG buffer from a URL
 */
export const generateQRBuffer = async (url) => {
  return await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    width: 400,
    color: { dark: '#1a202c', light: '#ffffff' },
  });
};

/**
 * Save QR code — uploads to S3 if configured, otherwise saves locally
 */
export const saveQRCode = async (batchId, qrBuffer) => {
  // ─── S3 Upload (uncomment when AWS credentials are ready) ───────────────────
  // import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
  // const s3 = new S3Client({ region: process.env.AWS_REGION });
  // const key = `qr-codes/${batchId}.png`;
  // await s3.send(new PutObjectCommand({
  //   Bucket: process.env.AWS_S3_BUCKET,
  //   Key: key,
  //   Body: qrBuffer,
  //   ContentType: 'image/png',
  //   ACL: 'public-read',
  // }));
  // return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  // ────────────────────────────────────────────────────────────────────────────

  // Placeholder: save to local filesystem
  if (!fs.existsSync(LOCAL_QR_DIR)) {
    fs.mkdirSync(LOCAL_QR_DIR, { recursive: true });
  }
  const filePath = path.join(LOCAL_QR_DIR, `${batchId}.png`);
  fs.writeFileSync(filePath, qrBuffer);

  const base = process.env.FRONTEND_URL || 'http://localhost:5000';
  return `${base}/qr-codes/${batchId}.png`;
};

/**
 * Full pipeline: generate + save, return stored URL
 */
export const generateAndStoreQR = async (batchId) => {
  const scanUrl = buildScanUrl(batchId);
  const buffer = await generateQRBuffer(scanUrl);
  const storedUrl = await saveQRCode(batchId, buffer);
  return { scanUrl, qrUrl: storedUrl };
};
