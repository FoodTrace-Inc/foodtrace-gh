-- The Wikipedia image backfill matched images by keyword substring, so two
-- posts sharing a keyword (e.g. "cassava" matching both the real "Cassava"
-- listing and the leftover "Test Cassava Batch" seed post, or "pineapple"
-- matching both the real "Pineapple" listing and "Alvaro Pineapple Drink")
-- collided. The uniqueness check then let only one of them keep the image,
-- and in both cases the real farm product lost out to a test post / a
-- differently-matched product, leaving the genuine listing with no image.
--
-- Reassigns the images to the correct real products and clears them from
-- the posts that shouldn't have had them:
--   - "Test Cassava Batch" is a leftover test post, not a real product.
--   - "Alvaro Pineapple Drink" is a packaged/branded drink; a raw pineapple
--     photo belongs to the actual "Pineapple" farm produce listing instead.

UPDATE marketplace_posts real_post
SET image_url = donor.image_url
FROM marketplace_posts donor
WHERE real_post.title = 'Cassava'
  AND real_post.domain = 'farm'
  AND donor.title = 'Test Cassava Batch'
  AND donor.domain = 'farm'
  AND donor.image_url IS NOT NULL
  AND real_post.image_url IS NULL;

UPDATE product_batches pb
SET image_url = mp.image_url
FROM marketplace_posts mp
WHERE mp.product_batch_id = pb.id
  AND mp.title = 'Cassava'
  AND mp.domain = 'farm'
  AND mp.image_url IS NOT NULL;

UPDATE marketplace_posts
SET image_url = NULL
WHERE title = 'Test Cassava Batch' AND domain = 'farm';

UPDATE marketplace_posts real_post
SET image_url = donor.image_url
FROM marketplace_posts donor
WHERE real_post.title = 'Pineapple'
  AND real_post.domain = 'farm'
  AND donor.title = 'Alvaro Pineapple Drink'
  AND donor.domain = 'food'
  AND donor.image_url IS NOT NULL
  AND real_post.image_url IS NULL;

UPDATE product_batches pb
SET image_url = mp.image_url
FROM marketplace_posts mp
WHERE mp.product_batch_id = pb.id
  AND mp.title = 'Pineapple'
  AND mp.domain = 'farm'
  AND mp.image_url IS NOT NULL;

UPDATE marketplace_posts
SET image_url = NULL
WHERE title = 'Alvaro Pineapple Drink' AND domain = 'food';

UPDATE product_batches pb
SET image_url = NULL
FROM marketplace_posts mp
WHERE mp.product_batch_id = pb.id
  AND mp.title IN ('Test Cassava Batch', 'Alvaro Pineapple Drink');
