# Transcription API Explanation

## Current Provider

For the simpler one-server deployment, the backend runs NVIDIA Riva/gRPC
transcription directly with Python.

Active backend file:

- `backend/server.js`

## Important NVIDIA Endpoint Note

Do not point the backend at NVIDIA's hosted `integrate.api.nvidia.com` URL as an
OpenAI-style HTTP transcription endpoint. The hosted NVIDIA `whisper-large-v3`
API uses Riva/gRPC, so the backend should use:

```env
TRANSCRIPTION_PROVIDER=nvidia-riva-hosted
NVIDIA_NIM_API_KEY=your_nvidia_api_key
```

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
TRANSCRIPTION_PROVIDER=nvidia-riva-hosted
TRANSCRIPTION_ASYNC=false
NVIDIA_RIVA_URI=grpc.nvcf.nvidia.com:443
NVIDIA_RIVA_FUNCTION_ID=b702f636-f60c-4a3d-a6f4-f3568c13bd7d
TRANSCRIPTION_LANGUAGE_CODE=en-US
```

## Processing Flow

1. The browser records audio with `MediaRecorder`.
2. The frontend uploads the audio to `POST /transcribe`.
3. The backend converts the audio with ffmpeg.
4. The backend sends the audio to NVIDIA Riva/gRPC.
5. The backend creates a title from the first few words.
6. The note is saved in Supabase/Postgres under the logged-in user.
7. The temporary uploaded audio file is deleted.

The frontend shows `Processing...` while the API transcription and database save are happening.
