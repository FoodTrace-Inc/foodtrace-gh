-- Security-question account recovery: a self-contained password reset that
-- needs no email/SMS delivery (which is unreliable on free tiers and for a
-- phone-first Ghana audience). The answer is bcrypt-hashed, never stored plain.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS security_question text,
  ADD COLUMN IF NOT EXISTS security_answer_hash text;
