-- Farm marketplace demo rows accidentally inherited the same crop photo from a
-- database-level image_url default. Clear only repeated farm images so the feed
-- falls back to its neutral domain visual instead of showing rice for every crop.

ALTER TABLE product_batches ALTER COLUMN image_url DROP DEFAULT;
ALTER TABLE drug_batches ALTER COLUMN image_url DROP DEFAULT;

UPDATE product_batches pb
SET image_url = NULL
WHERE pb.image_url IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM marketplace_posts mp
    WHERE mp.product_batch_id = pb.id
      AND mp.domain = 'farm'
  )
  AND pb.image_url IN (
    SELECT pb2.image_url
    FROM marketplace_posts mp2
    JOIN product_batches pb2 ON pb2.id = mp2.product_batch_id
    WHERE mp2.domain = 'farm'
      AND pb2.image_url IS NOT NULL
    GROUP BY pb2.image_url
    HAVING COUNT(*) > 1
  );

UPDATE marketplace_posts mp
SET image_url = NULL
WHERE mp.domain = 'farm'
  AND mp.image_url IS NOT NULL
  AND mp.image_url IN (
    SELECT image_url
    FROM marketplace_posts
    WHERE domain = 'farm'
      AND image_url IS NOT NULL
    GROUP BY image_url
    HAVING COUNT(*) > 1
  );