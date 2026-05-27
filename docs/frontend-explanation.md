# Frontend Explanation

## Main Files

- `frontend/src/App.js` controls auth, app state, API calls, recording flow, search, sorting, pagination, admin data, and the opened note popup.
- `frontend/src/components/Header.js` renders the app title, signed-in user, dark/light theme toggle, and logout.
- `frontend/src/components/Recorder.js` renders the microphone button and shows three states: ready, recording, and processing.
- `frontend/src/components/NoteCard.js` renders each clickable note preview card.
- `frontend/src/App.css` and `frontend/src/styles/theme.css` contain the responsive layout, animations, cards, modal, and theme colors.

## Recording Flow

1. The user clicks the microphone button.
2. `MediaRecorder` starts capturing audio from the browser.
3. When the user stops recording, the UI changes to `Processing...`.
4. The audio blob is uploaded to `POST /transcribe`.
5. After the backend returns, notes are refetched and the new note appears.

The processing message is important because the audio must be uploaded, transcribed by NVIDIA NIM, saved in MySQL, and refetched.

## Authentication UI

Before using notes, the user sees an OAuth-only sign-in screen. There are no manual register or login forms.

After Google OAuth returns, the frontend stores the returned token in `localStorage` and sends it on protected requests as:

```http
Authorization: Bearer token_here
```

On app startup, the frontend checks the saved token with `GET /auth/me` and restores the last route, including the admin user details page.

## Notes UI

The note list uses compact clickable cards. Each card shows:

- Generated or saved title
- Short content preview
- Created date

Clicking a card opens a full note popup. In that popup, the user can edit the title and content manually, then press Save. Delete is also available inside the popup.

Each user only sees their own notes.

## Admin UI

If the logged-in user has role `admin`, the frontend shows an admin panel above the recorder.

The admin panel shows:

- Total users
- Total notes
- A button to open the dedicated user details page

The user details page is available at `/admin/users` and shows each user's email, role, and note count.

## Search, Sort, And Pagination

The search input calls `GET /notes` with a `search` query. The sort dropdown sends `order=ASC` or `order=DESC`. The Load More button uses the current offset and appends the next page of notes.
