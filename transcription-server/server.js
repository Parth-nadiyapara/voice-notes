const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const { existsSync, mkdirSync } = require("fs");
const { execFile } = require("child_process");

const app = express();
const PORT = process.env.PORT || 9000;
const uploadDir = process.env.UPLOAD_DIR || "/tmp/voice-notes-transcription-uploads";
const API_KEY = process.env.TRANSCRIPTION_SERVER_API_KEY || "";

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("audio/") && file.mimetype !== "application/octet-stream") {
      return cb(new Error("Only audio uploads are allowed"));
    }

    cb(null, true);
  },
});

function requireApiKey(req, res, next) {
  if (!API_KEY) {
    next();
    return;
  }

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token !== API_KEY) {
    return res.status(401).json({ error: "Invalid transcription server API key" });
  }

  next();
}

function transcribe(audioPath) {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_BIN || "python3";
    const scriptPath = path.join(__dirname, "nvidia_transcribe.py");

    execFile(
      pythonPath,
      [scriptPath, audioPath],
      { timeout: Number(process.env.TRANSCRIPTION_TIMEOUT_MS || 120000), maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message));
          return;
        }

        resolve(stdout.trim());
      }
    );
  });
}

async function postCallback(callbackUrl, callbackToken, payload) {
  const headers = { "Content-Type": "application/json" };
  if (callbackToken) {
    headers.Authorization = `Bearer ${callbackToken}`;
  }

  const response = await fetch(callbackUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Callback failed (${response.status}): ${detail}`);
  }
}

async function processTranscriptionJob({ file, noteId, callbackUrl, callbackToken }) {
  try {
    const text = await transcribe(file.path);
    await postCallback(callbackUrl, callbackToken, { note_id: noteId, text });
  } catch (error) {
    console.error(error);
    await postCallback(callbackUrl, callbackToken, {
      note_id: noteId,
      error: error.message || "Transcription failed",
    }).catch((callbackError) => console.error(callbackError));
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
}

app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/v1/audio/transcriptions",
  requireApiKey,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res, next) => {
    const file = req.files?.file?.[0] || req.files?.audio?.[0];
    if (!file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    try {
      const text = await transcribe(file.path);
      res.json({ text });
    } catch (error) {
      next(error);
    } finally {
      await fs.unlink(file.path).catch(() => {});
    }
  }
);

app.post(
  "/v1/audio/transcription-jobs",
  requireApiKey,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    const file = req.files?.file?.[0] || req.files?.audio?.[0];
    const callbackUrl = String(req.body.callback_url || "");
    const callbackToken = String(req.body.callback_token || "");
    const noteId = String(req.body.note_id || "");

    if (!file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    if (!callbackUrl || !noteId) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ error: "callback_url and note_id are required" });
    }

    const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setImmediate(() => processTranscriptionJob({ file, noteId, callbackUrl, callbackToken }));
    res.status(202).json({ jobId, status: "processing" });
  }
);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Transcription server error" });
});

app.listen(PORT, () => {
  console.log(`Transcription server listening on port ${PORT}`);
});
