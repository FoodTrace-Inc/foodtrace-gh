-- V28 only cleared duplicate images among farm-domain marketplace posts.
-- The same underlying issue (multiple demo products/batches sharing one
-- copy-pasted stock photo) turned out to also affect food and drug
-- products. This generalizes the same precise, scoped cleanup across all
-- three domains and both batch tables, so every product either keeps its
-- own unique photo or falls back to the app's built-in domain-colored
-- placeholder card instead of showing someone else's product photo.

-- Clear duplicate images on product_batches (food/farm) - any image_url
-- used by more than one batch is not a real per-product photo.
UPDATE product_batches pb
SET image_url = NULL
WHERE pb.image_url IS NOT NULL
  AND pb.image_url IN (
    SELECT image_url FROM product_batches
    WHERE image_url IS NOT NULL
    GROUP BY image_url
    HAVING COUNT(*) > 1
  );

-- Clear duplicate images on drug_batches - same rule.
UPDATE drug_batches db
SET image_url = NULL
WHERE db.image_url IS NOT NULL
  AND db.image_url IN (
    SELECT image_url FROM drug_batches
    WHERE image_url IS NOT NULL
    GROUP BY image_url
    HAVING COUNT(*) > 1
  );

-- Clear duplicate images stored directly on marketplace_posts (posts with
-- no linked batch), independent of the two updates above.
UPDATE marketplace_posts mp
SET image_url = NULL
WHERE mp.image_url IS NOT NULL
  AND mp.image_url IN (
    SELECT image_url FROM marketplace_posts
    WHERE image_url IS NOT NULL
    GROUP BY image_url
    HAVING COUNT(*) > 1
  );
