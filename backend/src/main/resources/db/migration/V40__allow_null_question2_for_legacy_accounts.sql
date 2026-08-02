-- Legacy accounts that only ever set one security question have a NULL
-- security_question_2. startForgotPassword was still trying to insert that
-- NULL into password_reset_sessions.question_2_text, which was declared
-- NOT NULL - every forgot-password attempt for such an account crashed at
-- step A with the same class of error V37/V39 already fixed for other
-- inputs. This was never exercised by testing because every demo account
-- was upgraded to two questions before it shipped.
ALTER TABLE password_reset_sessions
  ALTER COLUMN question_2_text DROP NOT NULL;
