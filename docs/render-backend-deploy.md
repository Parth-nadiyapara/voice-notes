# Render Backend Deployment

Use this setup when you want one backend server to handle auth, notes, database
writes, upload handling, and NVIDIA transcription.

## Recommended Architecture

- Frontend: Vercel static React app
- Backend: Render Docker web service from `backend/`
- Database: Supabase Postgres
- Separate `transcription-server/`: not needed

This avoids the Vercel serverless timeout and removes the callback/job flow.

## Render Service

Create a new Render **Web Service**:

```text
Root Directory: backend
Environment: Docker
```

Render will use `backend/Dockerfile`, which installs Node, Python, ffmpeg, and
the NVIDIA Riva client.

## Backend Environment Variables

```env
CLIENT_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app

SUPABASE_DB_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:6543/postgres
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/auth/oauth/google/callback
SESSION_SECRET=use-a-long-random-secret
SESSION_DAYS=30
ADMIN_EMAILS=your-google-admin-email@example.com

TRANSCRIPTION_PROVIDER=nvidia-riva-hosted
TRANSCRIPTION_ASYNC=false
NVIDIA_NIM_API_KEY=your-nvidia-api-key
NVIDIA_RIVA_URI=grpc.nvcf.nvidia.com:443
NVIDIA_RIVA_FUNCTION_ID=b702f636-f60c-4a3d-a6f4-f3568c13bd7d
TRANSCRIPTION_LANGUAGE_CODE=en-US
TRANSCRIPTION_TIMEOUT_MS=300000
```

Do not set `NVIDIA_NIM_TRANSCRIPTION_URL`, `TRANSCRIPTION_API_URL`,
`TRANSCRIPTION_JOB_API_URL`, or `TRANSCRIPTION_HTTP_API_KEY` for this single
backend deployment.

## Frontend Environment Variable

In the Vercel frontend project:

```env
REACT_APP_API_URL=https://your-backend.onrender.com
```

Redeploy the frontend after changing this value.

## Google OAuth

In Google Cloud OAuth authorized redirect URIs, replace the Vercel backend URL
with:

```text
https://your-backend.onrender.com/auth/oauth/google/callback
```

## Old Processing Notes

Notes that were created by the previous async callback setup may remain stuck as
`processing`. Delete those notes from the UI, then record again after the Render
backend is live.
