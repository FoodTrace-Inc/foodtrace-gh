-- V29 checked for duplicate image_url values within each table separately
-- (product_batches, drug_batches, marketplace_posts independently), but the
-- actual duplication is cross-table: the same stock photo can appear on a
-- marketplace_posts row directly AND on an unrelated product_batches row,
-- with each individual table only ever seeing "1" occurrence of it and so
-- never tripping the per-table HAVING COUNT(*) > 1 check.
--
-- Computes one combined usage count per image_url across all three sources
-- ONCE into a temp table, then applies it to all three UPDATEs against that
-- same fixed snapshot - clearing one table's copy of a 2-way duplicate must
-- not change what the next table's UPDATE considers a duplicate.

CREATE TEMP TABLE _dup_images AS
SELECT image_url FROM (
  SELECT image_url FROM product_batches WHERE image_url IS NOT NULL
  UNION ALL
  SELECT image_url FROM drug_batches WHERE image_url IS NOT NULL
  UNION ALL
  SELECT image_url FROM marketplace_posts WHERE image_url IS NOT NULL
) combined
GROUP BY image_url
HAVING COUNT(*) > 1;

UPDATE product_batches SET image_url = NULL
WHERE image_url IN (SELECT image_url FROM _dup_images);

UPDATE drug_batches SET image_url = NULL
WHERE image_url IN (SELECT image_url FROM _dup_images);

UPDATE marketplace_posts SET image_url = NULL
WHERE image_url IN (SELECT image_url FROM _dup_images);

DROP TABLE _dup_images;
