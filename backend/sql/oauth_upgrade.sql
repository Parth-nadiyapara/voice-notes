ALTER TABLE users
  MODIFY password_hash VARCHAR(255) NULL,
  MODIFY password_salt VARCHAR(255) NULL,
  ADD COLUMN oauth_provider VARCHAR(40) NULL AFTER password_salt,
  ADD COLUMN oauth_subject VARCHAR(255) NULL AFTER oauth_provider,
  ADD COLUMN avatar_url VARCHAR(500) NULL AFTER oauth_subject,
  ADD COLUMN last_login_at DATETIME NULL AFTER avatar_url,
  ADD UNIQUE KEY users_oauth_provider_subject_idx (oauth_provider, oauth_subject);

-- Replace this email with the Google account that should open the admin dashboard.
UPDATE users SET role = 'admin' WHERE LOWER(email) = 'admin@gmail.com';
