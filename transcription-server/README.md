# Voice Notes Transcription Server

This service exposes the HTTP endpoint your Vercel backend expects:

```text
POST /v1/audio/transcriptions
```

It accepts multipart audio under `file` or `audio`, calls NVIDIA Riva/gRPC, and returns:

```json
{ "text": "transcribed text" }
```

## Required Environment Variables

```env
NVIDIA_NIM_API_KEY=your-nvidia-api-key
TRANSCRIPTION_SERVER_API_KEY=choose-a-long-random-secret
```

Optional:

```env
NVIDIA_RIVA_URI=grpc.nvcf.nvidia.com:443
NVIDIA_RIVA_FUNCTION_ID=b702f636-f60c-4a3d-a6f4-f3568c13bd7d
TRANSCRIPTION_LANGUAGE_CODE=en-US
```

## Deploy

Deploy this directory to any Docker host, for example Render, Railway, Fly.io, or a VPS.

Use `transcription-server` as the service root and the included `Dockerfile`.

After deployment, use the public URL in your backend Vercel project:

```env
TRANSCRIPTION_PROVIDER=http
NVIDIA_NIM_TRANSCRIPTION_URL=https://your-transcription-service.example.com/v1/audio/transcriptions
TRANSCRIPTION_HTTP_API_KEY=your-TRANSCRIPTION_SERVER_API_KEY-value
```

Redeploy the backend after changing Vercel environment variables.
