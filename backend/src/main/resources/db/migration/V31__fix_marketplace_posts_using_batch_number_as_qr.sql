-- Some demo marketplace posts were seeded with their product/drug batch's
-- batch_number (e.g. "FB-1104", "DB-1106") stored directly in
-- marketplace_posts.qr_code_string instead of the actual scannable code
-- from qr_codes / drug_qr_codes. A batch_number is never registered in
-- either QR table, so scanning these codes always returned "not found" -
-- the post displayed fine but was never actually verifiable.
--
-- Repoints qr_code_string to the real code for every post whose linked
-- batch has one, so every printed/displayed code is genuinely scannable.

UPDATE marketplace_posts mp
SET qr_code_string = q.code_string
FROM product_batches pb
JOIN qr_codes q ON q.batch_id = pb.id
WHERE mp.product_batch_id = pb.id
  AND mp.domain IN ('food', 'farm')
  AND mp.qr_code_string <> q.code_string;

UPDATE marketplace_posts mp
SET qr_code_string = dq.code_string
FROM drug_batches db
JOIN drug_qr_codes dq ON dq.drug_batch_id = db.id
WHERE mp.drug_batch_id = db.id
  AND mp.domain = 'drug'
  AND mp.qr_code_string <> dq.code_string;
