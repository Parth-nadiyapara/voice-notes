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

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Transcription server error" });
});

app.listen(PORT, () => {
  console.log(`Transcription server listening on port ${PORT}`);
});
