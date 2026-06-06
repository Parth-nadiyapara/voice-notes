# Vercel Deployment

Deploy the frontend and backend as two separate Vercel projects.

## Backend Project

Use `backend` as the Vercel root directory.

Environment variables:

```env
CLIENT_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app

SUPABASE_DB_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:6543/postgres
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-rotated-google-oauth-client-secret
GOOGLE_CALLBACK_URL=https://your-backend.vercel.app/auth/oauth/google/callback
SESSION_SECRET=use-a-long-random-secret
SESSION_DAYS=30
ADMIN_EMAILS=your-google-admin-email@example.com

TRANSCRIPTION_PROVIDER=http
NVIDIA_NIM_API_KEY=your-transcription-server-api-key
NVIDIA_NIM_TRANSCRIPTION_URL=https://your-transcription-server.example.com/v1/audio/transcriptions
```

Add the backend callback URL to Google Cloud OAuth authorized redirect URIs.

If you do not already have a public transcription endpoint, deploy the Docker service in
`transcription-server/` first. Its public URL is the value to use for
`NVIDIA_NIM_TRANSCRIPTION_URL`.

## Frontend Project

Use `frontend` as the Vercel root directory.

Environment variables:

```env
REACT_APP_API_URL=https://your-backend.vercel.app
```

After changing Vercel environment variables, redeploy the project. Vercel only applies new environment variables to new deployments.

## Supabase Database

Create a Supabase project, open **Project Settings > Database**, and copy the pooled connection string. Use it as `SUPABASE_DB_URL` in the backend project. The backend creates and updates its `users`, `sessions`, and `notes` tables on startup.
