ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS password_salt VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS oauth_subject VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_provider_subject_idx
  ON users(oauth_provider, oauth_subject);

-- Replace this email with the Google account that should open the admin dashboard.
UPDATE users SET role = 'admin' WHERE LOWER(email) = 'admin@gmail.com';
