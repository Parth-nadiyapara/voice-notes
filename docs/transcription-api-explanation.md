# Transcription API Explanation

## Current Provider

The app is wired for an NVIDIA NIM HTTP transcription endpoint. There is no local Python Whisper script in the active app.

Active backend file:

- `backend/server.js`

## Important NVIDIA Endpoint Note

The HTTP endpoint shape used by this backend is for a deployed NIM HTTP service, for example:

```bash
NVIDIA_NIM_TRANSCRIPTION_URL=http://localhost:9000/v1/audio/transcriptions
```

The hosted NVIDIA `whisper-large-v3` API page uses Riva/gRPC, not the OpenAI-style HTTP multipart endpoint. If you use the hosted `integrate.api.nvidia.com` transcription URL directly with this HTTP code, transcription fails because the protocol does not match.

## Required Environment Variable

If your deployed NIM endpoint requires a key, add it in `backend/.env`:

```bash
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key_here
```

The template file is:

```text
backend/.env.example
```

## Default API Configuration

```bash
NVIDIA_NIM_TRANSCRIPTION_URL=http://localhost:9000/v1/audio/transcriptions
NVIDIA_NIM_TRANSCRIPTION_MODEL=openai/whisper-large-v3
TRANSCRIPTION_LANGUAGE=en
```

The backend sends a multipart audio request with:

- `file`
- `model`
- `language`
- `response_format`
- `temperature`

## Processing Flow

1. The browser records audio with `MediaRecorder`.
2. The frontend uploads the audio to `POST /transcribe`.
3. The backend forwards the audio to NVIDIA NIM.
4. NVIDIA NIM returns English transcription text.
5. The backend creates a title from the first few words.
6. The note is saved in MySQL under the logged-in user.
7. The temporary uploaded audio file is deleted.

The frontend shows `Processing...` while the API transcription and database save are happening.
