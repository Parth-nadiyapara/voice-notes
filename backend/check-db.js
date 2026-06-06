const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString || connectionString === "paste-your-supabase-pooled-connection-string-here") {
  console.error("Missing SUPABASE_DB_URL. Add your Supabase pooled database connection string to backend/.env.");
  process.exit(1);
}

const { pool, initDb } = require("./db");

async function main() {
  await initDb();

  const [tables] = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'sessions', 'notes')
      ORDER BY table_name
    `
  );

  const found = new Set(tables.map((table) => table.table_name));
  const required = ["users", "sessions", "notes"];
  const missing = required.filter((table) => !found.has(table));

  if (missing.length) {
    throw new Error(`Missing tables: ${missing.join(", ")}`);
  }

  console.log(`Supabase tables ready: ${required.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
