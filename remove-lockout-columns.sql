-- SQL script to remove account lockout fields from the users table
ALTER TABLE users
DROP COLUMN IF EXISTS failed_login_attempts,
DROP COLUMN IF EXISTS account_locked,
DROP COLUMN IF EXISTS account_locked_at,
DROP COLUMN IF EXISTS lockout_expires_at;