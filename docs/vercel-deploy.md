# Vercel Deployment

Deploy the frontend and backend as two separate Vercel projects.

## Backend Project

Use `backend` as the Vercel root directory.

Environment variables:

```env
CLIENT_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app

DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=voice_notes
DB_SSL=true

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-rotated-google-oauth-client-secret
GOOGLE_CALLBACK_URL=https://your-backend.vercel.app/auth/oauth/google/callback
SESSION_SECRET=use-a-long-random-secret
SESSION_DAYS=30
ADMIN_EMAILS=your-google-admin-email@example.com

TRANSCRIPTION_PROVIDER=http
NVIDIA_NIM_API_KEY=your-key
NVIDIA_NIM_TRANSCRIPTION_URL=https://your-transcription-endpoint/v1/audio/transcriptions
```

Add the backend callback URL to Google Cloud OAuth authorized redirect URIs.

## Frontend Project

Use `frontend` as the Vercel root directory.

Environment variables:

```env
REACT_APP_API_URL=https://your-backend.vercel.app
```

After changing Vercel environment variables, redeploy the project. Vercel only applies new environment variables to new deployments.

## MySQL And phpMyAdmin

phpMyAdmin is only a database management UI. The app needs the real MySQL host, port, database name, username, and password from the MySQL server that phpMyAdmin manages.
