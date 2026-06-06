const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { existsSync, mkdirSync, readFileSync } = require("fs");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    process.env[key.trim()] = process.env[key.trim()] || value;
  }
}

loadEnvFile();

const { pool, initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;
const uploadDir = process.env.UPLOAD_DIR || (process.env.VERCEL ? "/tmp/voice-notes-uploads" : path.join(__dirname, "uploads"));
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
const CLIENT_URL = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || "http://localhost:3000";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || process.env.CLIENT_ORIGIN || CLIENT_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/auth/oauth/google/callback`;
const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const TRANSCRIPTION_API_URL =
  process.env.NVIDIA_NIM_TRANSCRIPTION_URL ||
  process.env.TRANSCRIPTION_API_URL ||
  "http://localhost:9000/v1/audio/transcriptions";
const TRANSCRIPTION_MODEL =
  process.env.NVIDIA_NIM_TRANSCRIPTION_MODEL ||
  process.env.TRANSCRIPTION_MODEL ||
  "openai/whisper-large-v3";
const TRANSCRIPTION_LANGUAGE = process.env.TRANSCRIPTION_LANGUAGE || "en";
const TRANSCRIPTION_PROVIDER = process.env.TRANSCRIPTION_PROVIDER || "nvidia-riva-hosted";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.DEFAULT_ADMIN_EMAIL || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.includes("*") || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

const ready = initDb().then(ensureDefaultAdmin);

app.use(async (_req, _res, next) => {
  try {
    await ready;
    next();
  } catch (error) {
    next(error);
  }
});

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio uploads are allowed"));
    }
    cb(null, true);
  },
});

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function ensureDefaultAdmin() {
  const [[countRow]] = await pool.query("SELECT COUNT(*) AS total FROM users");
  if (countRow.total > 0) return;

  if (!process.env.DEFAULT_ADMIN_EMAIL) return;

  const name = process.env.DEFAULT_ADMIN_NAME || "Admin";
  const email = process.env.DEFAULT_ADMIN_EMAIL.trim().toLowerCase();

  await pool.execute(
    "INSERT INTO users (name, email, role) VALUES (?, ?, 'admin')",
    [name, email]
  );

  console.log(`Default admin placeholder ready: ${email}. Sign in once with matching OAuth email.`);
}

function roleForEmail(email, fallback = "user") {
  return ADMIN_EMAILS.includes(String(email || "").trim().toLowerCase()) ? "admin" : fallback;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
  };
}

function cleanTitle(value) {
  const title = typeof value === "string" ? value.trim() : "";
  return title || null;
}

function createTitleFromText(text) {
  const firstSentence = text.split(/[.!?]/)[0] || text;
  const words = firstSentence.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, 6);
  if (words.length === 0) return "Untitled note";

  const title = words.join(" ");
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await pool.execute(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, hashToken(token), expiresAt]
  );

  return token;
}

async function rotateSession(token) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.execute("UPDATE sessions SET expires_at = ? WHERE token_hash = ?", [expiresAt, hashToken(token)]);
}

function requireGoogleOAuthConfig(res) {
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) return true;

  res.status(503).json({
    error: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to backend/.env.",
  });
  return false;
}

function createOAuthState(next) {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: crypto.randomBytes(24).toString("hex"),
      next,
      issuedAt: Date.now(),
    })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", OAUTH_STATE_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readOAuthState(value) {
  const [payload, signature] = String(value || "").split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state.");

  const expected = crypto.createHmac("sha256", OAUTH_STATE_SECRET).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid OAuth state.");
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!parsed.issuedAt || Date.now() - parsed.issuedAt > 10 * 60 * 1000) {
    throw new Error("OAuth state expired.");
  }

  return parsed;
}

async function findOrCreateOAuthUser(profile) {
  const email = String(profile.email || "").trim().toLowerCase();
  const subject = String(profile.sub || "").trim();
  const name = String(profile.name || email.split("@")[0] || "Voice Notes User").trim();
  const avatarUrl = profile.picture ? String(profile.picture).slice(0, 500) : null;

  if (!email || !subject) {
    throw new Error("OAuth provider did not return a verified email and subject.");
  }

  const [byOAuth] = await pool.execute(
    "SELECT * FROM users WHERE oauth_provider = 'google' AND oauth_subject = ? LIMIT 1",
    [subject]
  );

  if (byOAuth.length) {
    const role = roleForEmail(email, byOAuth[0].role);
    await pool.execute(
      "UPDATE users SET name = ?, email = ?, avatar_url = ?, role = ?, last_login_at = NOW() WHERE id = ?",
      [name, email, avatarUrl, role, byOAuth[0].id]
    );
    return { ...byOAuth[0], name, email, role, avatar_url: avatarUrl };
  }

  const [byEmail] = await pool.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  if (byEmail.length) {
    const role = roleForEmail(email, byEmail[0].role);
    await pool.execute(
      "UPDATE users SET name = ?, oauth_provider = 'google', oauth_subject = ?, avatar_url = ?, role = ?, last_login_at = NOW() WHERE id = ?",
      [name, subject, avatarUrl, role, byEmail[0].id]
    );
    return { ...byEmail[0], name, oauth_provider: "google", oauth_subject: subject, role, avatar_url: avatarUrl };
  }

  const [[countRow]] = await pool.query("SELECT COUNT(*) AS total FROM users");
  const role = roleForEmail(email, countRow.total === 0 ? "admin" : "user");
  const [result] = await pool.execute(
    "INSERT INTO users (name, email, oauth_provider, oauth_subject, avatar_url, last_login_at, role) VALUES (?, ?, 'google', ?, ?, NOW(), ?) RETURNING id",
    [name, email, subject, avatarUrl, role]
  );

  return { id: result.insertId, name, email, oauth_provider: "google", oauth_subject: subject, avatar_url: avatarUrl, role };
}

function redirectWithAuthError(res, message) {
  const redirectUrl = new URL("/auth/callback", CLIENT_URL);
  redirectUrl.searchParams.set("error", message);
  res.redirect(redirectUrl.toString());
}

async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.role, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [hashToken(token)]
  );

  if (rows.length === 0) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = rows[0];
  req.token = token;
  rotateSession(token).catch((error) => console.error("Failed to extend session", error));
  next();
}

function adminRequired(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

async function runTranscription(file) {
  if (TRANSCRIPTION_PROVIDER === "nvidia-riva-hosted") {
    return runNvidiaRivaTranscription(file.path);
  }

  return runHttpTranscription(file);
}

function runNvidiaRivaTranscription(audioPath) {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_BIN || "python3";
    const scriptPath = path.join(__dirname, "../python/nvidia_transcribe.py");

    execFile(pythonPath, [scriptPath, audioPath], { timeout: 120000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const detail = stderr?.trim() || error.message;
        reject(new Error(`NVIDIA Riva transcription failed: ${detail}`));
        return;
      }

      resolve(stdout.trim());
    });
  });
}

async function runHttpTranscription(file) {
  const apiKey =
    process.env.NVIDIA_NIM_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    process.env.TRANSCRIPTION_API_KEY;

  const isHostedIntegrateEndpoint = TRANSCRIPTION_API_URL.includes("integrate.api.nvidia.com");
  if (isHostedIntegrateEndpoint) {
    throw new Error(
      "NVIDIA hosted whisper-large-v3 uses Riva/gRPC, not the HTTP /v1/audio/transcriptions endpoint configured here. Use a deployed NIM HTTP endpoint such as http://localhost:9000/v1/audio/transcriptions, or switch the backend to a Riva gRPC client."
    );
  }

  if (!apiKey && TRANSCRIPTION_API_URL.startsWith("https://")) {
    throw new Error("Missing NVIDIA_NIM_API_KEY. Add it to backend/.env before transcribing.");
  }

  const audioBuffer = await fs.readFile(file.path);
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: file.mimetype || "audio/webm" });

  formData.append("file", audioBlob, file.originalname || "voice-note.webm");
  formData.append("model", TRANSCRIPTION_MODEL);
  formData.append("language", TRANSCRIPTION_LANGUAGE);
  formData.append("response_format", "json");
  formData.append("temperature", "0");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const response = await fetch(TRANSCRIPTION_API_URL, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : { text: await response.text() };

    if (!response.ok) {
      const detail = data.error?.message || data.message || data.text || "NVIDIA NIM transcription failed";
      throw new Error(`NVIDIA NIM transcription failed (${response.status}): ${detail}`);
    }

    return String(data.text || "").trim();
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/auth/oauth/providers", (_req, res) => {
  res.json({
    providers: [
      {
        id: "google",
        name: "Google",
        enabled: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
        loginUrl: "/auth/oauth/google/start",
      },
    ],
  });
});

app.get("/auth/oauth/google/start", (req, res) => {
  if (!requireGoogleOAuthConfig(res)) return;

  const next = typeof req.query.next === "string" && req.query.next.startsWith("/") ? req.query.next : "/";
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GOOGLE_CALLBACK_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", createOAuthState(next));
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("access_type", "offline");

  res.redirect(authUrl.toString());
});

app.get(
  "/auth/oauth/google/callback",
  asyncHandler(async (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return redirectWithAuthError(res, "Google OAuth is not configured.");
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";
    const rawState = typeof req.query.state === "string" ? req.query.state : "";

    if (!code || !rawState) {
      return redirectWithAuthError(res, "Google did not return an authorization code.");
    }

    let next = "/";
    try {
      const parsed = readOAuthState(rawState);
      if (typeof parsed.next === "string" && parsed.next.startsWith("/")) next = parsed.next;
    } catch (error) {
      return redirectWithAuthError(res, error.message);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return redirectWithAuthError(res, tokenData.error_description || "Google sign-in failed.");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();

    if (!profileResponse.ok || profile.email_verified === false) {
      return redirectWithAuthError(res, "Google email is not verified.");
    }

    const user = await findOrCreateOAuthUser(profile);
    const token = await createSession(user.id);
    const redirectUrl = new URL("/auth/callback", CLIENT_URL);

    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("next", next);
    res.redirect(redirectUrl.toString());
  })
);

app.get("/auth/me", authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post(
  "/auth/logout",
  authRequired,
  asyncHandler(async (req, res) => {
    await pool.execute("DELETE FROM sessions WHERE token_hash = ?", [hashToken(req.token)]);
    res.json({ ok: true });
  })
);

app.post(
  "/transcribe",
  authRequired,
  upload.single("audio"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    try {
      const text = await runTranscription(req.file);

      if (!text) {
        return res.status(400).json({ error: "Empty transcription. Please record a clear voice note." });
      }

      const title = cleanTitle(req.body.title) || createTitleFromText(text);
      const [result] = await pool.execute(
        "INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?) RETURNING id",
        [req.user.id, title, text]
      );

      return res.status(201).json({
        note: {
          id: result.insertId,
          user_id: req.user.id,
          title,
          content: text,
          created_at: new Date().toISOString(),
        },
      });
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  })
);

app.get(
  "/notes",
  authRequired,
  asyncHandler(async (req, res) => {
    const order = String(req.query.order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const params = [req.user.id];
    const where = ["user_id = ?"];

    if (search) {
      where.push("(COALESCE(title, '') LIKE ? OR content LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const [notes] = await pool.query(
      `SELECT id, user_id, title, content, created_at FROM notes ${whereSql} ORDER BY created_at ${order}, id ${order} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM notes ${whereSql}`, params);

    res.json({
      notes,
      total: countRows[0].total,
      limit,
      offset,
      hasMore: offset + notes.length < countRows[0].total,
    });
  })
);

app.put(
  "/notes/:id",
  authRequired,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const title = cleanTitle(req.body.title);
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid note id" });
    }

    if (!content) {
      return res.status(400).json({ error: "Note content cannot be empty" });
    }

    const [result] = await pool.execute(
      "UPDATE notes SET title = ?, content = ? WHERE id = ? AND user_id = ?",
      [title, content, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({ id, title, content });
  })
);

app.delete(
  "/notes/:id",
  authRequired,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid note id" });
    }

    const [result] = await pool.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", [id, req.user.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({ id });
  })
);

app.get(
  "/admin/users",
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at, COUNT(n.id) AS note_count
       FROM users u
       LEFT JOIN notes n ON n.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[countRow]] = await pool.query("SELECT COUNT(*) AS total FROM users");

    res.json({
      users,
      total: countRow.total,
      limit,
      offset,
      hasMore: offset + users.length < countRow.total,
    });
  })
);

app.get(
  "/admin/summary",
  authRequired,
  adminRequired,
  asyncHandler(async (_req, res) => {
    const [[userRow]] = await pool.query("SELECT COUNT(*) AS total_users FROM users");
    const [[noteRow]] = await pool.query("SELECT COUNT(*) AS total_notes FROM notes");
    res.json({ totalUsers: userRow.total_users, totalNotes: noteRow.total_notes });
  })
);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Audio upload must be 10MB or less" });
  }

  console.error(error);
  res.status(500).json({ error: error.message || "Server error" });
});

if (require.main === module) {
  ready
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Voice Notes API running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to initialize database", error);
      process.exit(1);
    });
}

module.exports = app;
