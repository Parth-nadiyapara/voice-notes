const { Pool, types } = require("pg");

types.setTypeParser(20, (value) => Number(value));

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString || connectionString === "paste-your-supabase-pooled-connection-string-here") {
  throw new Error("Missing SUPABASE_DB_URL. Add your Supabase pooled database connection string to backend/.env.");
}

function validateConnectionString(value) {
  if (/\bDB_SSL\s*=/.test(value) || /\bDB_SSL_REJECT_UNAUTHORIZED\s*=/.test(value)) {
    throw new Error(
      "Invalid SUPABASE_DB_URL: it contains another environment variable. In Render, SUPABASE_DB_URL must be only the PostgreSQL URL, and DB_SSL must be a separate variable."
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch (_error) {
    throw new Error("Invalid SUPABASE_DB_URL: expected a PostgreSQL connection URL from Supabase.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Invalid SUPABASE_DB_URL: it must start with postgresql://.");
  }

  if (!parsed.hostname || !parsed.pathname || parsed.pathname === "/") {
    throw new Error("Invalid SUPABASE_DB_URL: missing database host or database name.");
  }

  if (parsed.password.includes("@")) {
    throw new Error("Invalid SUPABASE_DB_URL: encode @ in the database password as %40.");
  }
}

validateConnectionString(connectionString);

const poolOptions = { connectionString };

if (process.env.DB_SSL !== "false") {
  poolOptions.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true" };
}

if (!global._postgresPool) {
  global._postgresPool = new Pool({
    ...poolOptions,
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  });
}

const pgPool = global._postgresPool;

function replacePlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function run(sql, params = []) {
  const result = await pgPool.query(replacePlaceholders(sql), params);
  const rows = result.rows;

  if (/^\s*insert\s/i.test(sql)) {
    rows.insertId = rows[0]?.id;
  }

  rows.affectedRows = result.rowCount;
  return [rows];
}

const pool = {
  query: run,
  execute: run,
  end: () => pgPool.end(),
};

async function initDb() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      password_salt VARCHAR(255) NULL,
      oauth_provider VARCHAR(40) NULL,
      oauth_subject VARCHAR(255) NULL,
      avatar_url VARCHAR(500) NULL,
      last_login_at TIMESTAMPTZ NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pgPool.query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL");
  await pgPool.query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id BIGINT NULL REFERENCES users(id) ON DELETE CASCADE");
  await pgPool.query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(20) NOT NULL DEFAULT 'completed'");
  await pgPool.query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS transcription_error TEXT NULL");
  await pgPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(40) NULL");
  await pgPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_subject VARCHAR(255) NULL");
  await pgPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL");
  await pgPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL");

  await pgPool.query("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)");
  await pgPool.query("CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash)");
  await pgPool.query("CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id)");
  await pgPool.query("CREATE INDEX IF NOT EXISTS notes_transcription_status_idx ON notes(transcription_status)");
  await pgPool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_provider_subject_idx ON users(oauth_provider, oauth_subject)"
  );

  console.log("Supabase database tables verified successfully.");
}

module.exports = { pool, initDb };
