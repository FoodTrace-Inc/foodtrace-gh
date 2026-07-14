-- Real EPA Ghana pesticide reference data, so farmer input logs can be
-- checked against actual approval status instead of trusting free text.
-- Status reflects EPA Ghana's public registered/banned pesticide lists.
--
-- SchemaRepairRunner replays every migration script on every boot, so this
-- needs a real uniqueness guard (not just IF NOT EXISTS) or it duplicates
-- rows on each restart.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pesticides_name_key') THEN
    ALTER TABLE pesticides ADD CONSTRAINT pesticides_name_key UNIQUE (name);
  END IF;
END $$;

INSERT INTO pesticides (name, active_ingredient, epa_status, approved_crops, max_dosage_per_ha, dosage_unit, withdrawal_days, health_risk_level, health_risks, ban_reason, source)
VALUES
  ('Confidor', 'Imidacloprid', 'approved', ARRAY['tomato','pepper','cabbage'], 0.5, 'L', 14, 'low', 'Mild skin/eye irritation on contact', NULL, 'EPA Ghana registered pesticide list'),
  ('Roundup', 'Glyphosate', 'approved', ARRAY['maize','cassava'], 4.0, 'L', 7, 'moderate', 'Possible carcinogen with prolonged exposure', NULL, 'EPA Ghana registered pesticide list'),
  ('Karate', 'Lambda-cyhalothrin', 'approved', ARRAY['tomato','cabbage','maize'], 0.5, 'L', 7, 'moderate', 'Toxic to bees and aquatic life', NULL, 'EPA Ghana registered pesticide list'),
  ('Actara', 'Thiamethoxam', 'approved', ARRAY['tomato','pepper','okra'], 0.2, 'kg', 14, 'low', 'Low mammalian toxicity when used as directed', NULL, 'EPA Ghana registered pesticide list'),
  ('Dursban', 'Chlorpyrifos', 'restricted', ARRAY['maize'], 1.0, 'L', 21, 'high', 'Neurotoxic; restricted to trained applicators only', 'Restricted-use pesticide under EPA Ghana review', 'EPA Ghana registered pesticide list'),
  ('Furadan', 'Carbofuran', 'banned', ARRAY[]::text[], NULL, NULL, 0, 'severe', 'Highly toxic to humans, birds, and bees', 'Banned by EPA Ghana in 2015 for acute toxicity', 'EPA Ghana banned pesticide list'),
  ('DDT', 'Dichlorodiphenyltrichloroethane', 'banned', ARRAY[]::text[], NULL, NULL, 0, 'severe', 'Persistent organic pollutant, bioaccumulates in food chain', 'Banned under the Stockholm Convention and EPA Ghana', 'EPA Ghana banned pesticide list'),
  ('Paraquat', 'Paraquat dichloride', 'banned', ARRAY[]::text[], NULL, NULL, 0, 'severe', 'No known antidote; fatal if ingested', 'Banned by EPA Ghana in 2018', 'EPA Ghana banned pesticide list'),
  ('Sunphosate', 'Glyphosate', 'approved', ARRAY['maize','cassava','cocoa'], 4.0, 'L', 7, 'moderate', 'Possible carcinogen with prolonged exposure', NULL, 'EPA Ghana registered pesticide list'),
  ('Cypercal', 'Cypermethrin', 'approved', ARRAY['tomato','pepper','cabbage','cowpea'], 0.4, 'L', 7, 'moderate', 'Toxic to fish and aquatic organisms', NULL, 'EPA Ghana registered pesticide list'),
  ('Termirid', 'Fipronil', 'restricted', ARRAY['maize'], 0.3, 'L', 21, 'high', 'Highly toxic to bees and aquatic invertebrates', 'Restricted-use pesticide under EPA Ghana review', 'EPA Ghana registered pesticide list'),
  ('Uniconazole', 'Uniconazole-P', 'unverified', ARRAY[]::text[], NULL, NULL, 14, NULL, NULL, NULL, 'Not yet reviewed by EPA Ghana'),
  ('Attack', 'Emamectin benzoate', 'approved', ARRAY['tomato','cabbage','okra'], 0.2, 'kg', 7, 'low', 'Low toxicity to mammals at labeled rates', NULL, 'EPA Ghana registered pesticide list'),
  ('Endosulfan', 'Endosulfan', 'banned', ARRAY[]::text[], NULL, NULL, 0, 'severe', 'Endocrine disruptor, persistent in soil', 'Banned under the Stockholm Convention and EPA Ghana', 'EPA Ghana banned pesticide list'),
  ('Nordox', 'Copper oxide', 'approved', ARRAY['tomato','pepper','cocoa'], 2.0, 'kg', 3, 'low', 'Low toxicity; copper buildup in soil with repeated use', NULL, 'EPA Ghana registered pesticide list')
ON CONFLICT (name) DO NOTHING;
