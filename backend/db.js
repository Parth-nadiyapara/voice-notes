const mysql = require("mysql2/promise");
require('dotenv').config();

const poolOptions = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "voice_notes",
  waitForConnections: true,
  connectionLimit: 5, // Optimized down from 10 to keep serverless connection spikes low
  queueLimit: 0,
};

if (process.env.DB_SSL === "true") {
  poolOptions.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" };
}

// 🌐 Global pool caching pattern for serverless (Vercel) environments
let pool;
if (!global._mysqlPool) {
  global._mysqlPool = mysql.createPool(poolOptions);
}
pool = global._mysqlPool;

// Helper to check for existing columns safely
async function columnExists(table, column) {
  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
    return columns.length > 0;
  } catch (error) {
    return false;
  }
}

// Optimized, safety-wrapped initialization for serverless execution
async function initDb() {
  try {
    // 1. Create essential missing tables asynchronously
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        password_salt VARCHAR(255) NULL,
        oauth_provider VARCHAR(40) NULL,
        oauth_subject VARCHAR(255) NULL,
        avatar_url VARCHAR(500) NULL,
        last_login_at DATETIME NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY users_oauth_provider_subject_idx (oauth_provider, oauth_subject)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX sessions_user_id_idx (user_id),
        INDEX sessions_token_hash_idx (token_hash)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        title VARCHAR(255) NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX notes_user_id_idx (user_id)
      )
    `);

    // 2. Perform safe schema checking and patches 
    if (!(await columnExists("notes", "title"))) {
      await pool.query("ALTER TABLE notes ADD COLUMN title VARCHAR(255) NULL AFTER id");
    }

    if (!(await columnExists("notes", "user_id"))) {
      await pool.query("ALTER TABLE notes ADD COLUMN user_id INT NULL AFTER id");
      await pool.query("ALTER TABLE notes ADD INDEX notes_user_id_idx (user_id)");
    }

    if (await columnExists("users", "password_hash")) {
      await pool.query("ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL");
    }

    if (await columnExists("users", "password_salt")) {
      await pool.query("ALTER TABLE users MODIFY password_salt VARCHAR(255) NULL");
    }

    if (!(await columnExists("users", "oauth_provider"))) {
      await pool.query("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(40) NULL AFTER password_salt");
    }

    if (!(await columnExists("users", "oauth_subject"))) {
      await pool.query("ALTER TABLE users ADD COLUMN oauth_subject VARCHAR(255) NULL AFTER oauth_provider");
    }

    if (!(await columnExists("users", "avatar_url"))) {
      await pool.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER oauth_subject");
    }

    if (!(await columnExists("users", "last_login_at"))) {
      await pool.query("ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER avatar_url");
    }

    try {
      await pool.query("ALTER TABLE users ADD UNIQUE KEY users_oauth_provider_subject_idx (oauth_provider, oauth_subject)");
    } catch (error) {
      if (error.code !== "ER_DUP_KEYNAME" && error.code !== "ER_MULTIPLE_PRI_KEY") {
        console.warn("Non-critical indexing migration flag caught:", error.message);
      }
    }

    console.log("Database tables verified successfully.");
  } catch (error) {
    console.error("Database initialization encountered an error:", error.message);
    // Suppress throwing fatal server execution crashes within the serverless environment lifecycle
  }
}

module.exports = { pool, initDb };
