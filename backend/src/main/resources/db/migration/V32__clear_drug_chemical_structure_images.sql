-- The Wikipedia image backfill (V29-V31 era) matched drug product names to
-- their Wikipedia chemical-compound page and used that page's thumbnail.
-- For pharmaceutical articles, that thumbnail is almost always a chemical
-- structure diagram or 3D molecular ball model (the article is about the
-- compound, not the retail medication) - not a photo of an actual pill,
-- capsule, or packet. Showing a molecular formula as "the medicine" is
-- misleading for a consumer safety app, so drug images are cleared back to
-- the neutral placeholder rather than displaying a scientifically-accurate
-- but visually wrong image.

UPDATE drug_batches SET image_url = NULL WHERE image_url IS NOT NULL;

UPDATE marketplace_posts SET image_url = NULL
WHERE domain = 'drug' AND image_url IS NOT NULL;
