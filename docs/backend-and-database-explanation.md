# Backend And Database Explanation

## Main Files

- `backend/server.js` defines authentication, transcription, notes, and admin APIs.
- `backend/db.js` creates the Supabase/Postgres pool and automatically initializes/migrates tables.
- `backend/.env.example` shows all environment variables you need.

## Database Setup

Create a Supabase project and set the backend connection string:

```bash
SUPABASE_DB_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:6543/postgres
DB_SSL=true
```

The backend automatically creates these tables when it starts:

- `users`
- `sessions`
- `notes`

It also adds missing OAuth and note ownership columns to older tables.

## Users Table

Stores OAuth users and admins.

Important columns:

- `id`
- `name`
- `email`
- `oauth_provider`
- `oauth_subject`
- `avatar_url`
- `last_login_at`
- `role` as `user` or `admin`
- `created_at`

Password columns may exist as nullable legacy columns after an upgrade, but the app no longer accepts manual password login.

## Sessions Table

Stores login sessions as hashed bearer tokens.

Important columns:

- `user_id`
- `token_hash`
- `expires_at`

The frontend stores the plain token in `localStorage` and sends it as:

```http
Authorization: Bearer token_here
```

## Notes Table

Stores user-owned notes.

Important columns:

- `id`
- `user_id`
- `title`
- `content`
- `created_at`

Every note query, update, and delete is scoped to the logged-in user.

## Admin Users

Admin access is controlled by OAuth email. Any Google account listed in `ADMIN_EMAILS` is promoted to `admin` on sign-in.

Example:

```bash
ADMIN_EMAILS=owner@example.com,admin@example.com
```

`DEFAULT_ADMIN_EMAIL` is still accepted as a fallback for older local setups.

## NVIDIA NIM Transcription

The app uses an NVIDIA NIM HTTP transcription endpoint. There is no local Whisper backend path.

Important: NVIDIA's hosted `whisper-large-v3` API page uses Riva/gRPC. The HTTP `/v1/audio/transcriptions` flow in this app is for a deployed NIM HTTP endpoint, such as a local/container NIM service.

Required:

```bash
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key_here
```

Defaults:

```bash
NVIDIA_NIM_TRANSCRIPTION_URL=http://localhost:9000/v1/audio/transcriptions
NVIDIA_NIM_TRANSCRIPTION_MODEL=openai/whisper-large-v3
TRANSCRIPTION_LANGUAGE=en
```

## API Routes

Auth:

- `GET /auth/oauth/providers`
- `GET /auth/oauth/google/start`
- `GET /auth/oauth/google/callback`
- `GET /auth/me`
- `POST /auth/logout`

Notes:

- `POST /transcribe`
- `GET /notes`
- `PUT /notes/:id`
- `DELETE /notes/:id`

Admin:

- `GET /admin/summary`
- `GET /admin/users`

Admin users can see all users and how many notes each user has created.
