-- The three permanent test drug batches (DR-QR-1001, DR-QR-2002, DR-QR-4004)
-- had a generic loose/unpackaged powder photo baked in from an early seed
-- script, duplicated across all three different drugs. That violates the
-- project's own image rules (no loose pills/powder, no duplicate images
-- across products) and these are the batches every judge/demo user is most
-- likely to scan, so it's the most visible instance of the problem.
--
-- Because SchemaRepairRunner re-executes every migration's statements on
-- every application boot, this keeps the bad image from silently
-- reappearing if a seed script is ever re-run — same pattern used to fix
-- the earlier self-reinfecting image migrations (see V11-V14, V19-V22).
UPDATE drug_batches db
SET image_url = NULL
FROM drug_qr_codes q
WHERE q.drug_batch_id = db.id
  AND q.code_string IN ('DR-QR-1001', 'DR-QR-2002', 'DR-QR-4004');

UPDATE marketplace_posts mp
SET image_url = NULL
WHERE mp.qr_code_string IN ('DR-QR-1001', 'DR-QR-2002', 'DR-QR-4004');
