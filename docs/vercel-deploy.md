# Vercel Frontend Deployment

Deploy only the frontend on Vercel. For this project, deploy the backend on
Render using [render-backend-deploy.md](./render-backend-deploy.md), because
transcription needs Python, ffmpeg, and a longer-running request than Vercel
serverless functions are designed for.

## Backend Project

Do not use Vercel for the backend when transcription runs inside the backend.
Use Render instead.

Backend guide: [render-backend-deploy.md](./render-backend-deploy.md)

## Frontend Project

Use `frontend` as the Vercel root directory.

Environment variables:

```env
REACT_APP_API_URL=https://your-backend.onrender.com
```

After changing Vercel environment variables, redeploy the project. Vercel only applies new environment variables to new deployments.

## Supabase Database

Create a Supabase project, open **Project Settings > Database**, and copy the pooled connection string. Use it as `SUPABASE_DB_URL` in the backend project. The backend creates and updates its `users`, `sessions`, and `notes` tables on startup.
