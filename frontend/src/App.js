import { useCallback, useEffect, useRef, useState } from "react";
import "./styles/theme.css";
import "./App.css";
import Header from "./components/Header";
import Recorder from "./components/Recorder";
import NoteCard from "./components/NoteCard";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const PAGE_SIZE = 10;
const ADMIN_PAGE_SIZE = 8;
const TOKEN_KEY = "voice_notes_token";
const API_TIMEOUT_MS = 15000;

function getInitialView() {
  return window.location.pathname === "/admin/users" ? "adminUsers" : "home";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Backend is not responding. Check REACT_APP_API_URL and redeploy the frontend.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function App() {
  const [notes, setNotes] = useState([]);
  const [order, setOrder] = useState("DESC");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [openedNote, setOpenedNote] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [oauthProviders, setOauthProviders] = useState([]);
  const [activeView, setActiveView] = useState(getInitialView);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminOffset, setAdminOffset] = useState(0);
  const [adminHasMore, setAdminHasMore] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const hasProcessingNotes = notes.some((note) => note.transcription_status === "processing");

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const notify = useCallback((text) => {
    setMessage(text);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(""), 3200);
  }, []);

  const authHeaders = useCallback(
    (extra = {}) => ({
      ...extra,
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setNotes([]);
    setOpenedNote(null);
    setAdminSummary(null);
    setAdminUsers([]);
    setAdminOffset(0);
    setAdminHasMore(false);
  }, []);

  const handleAuthResponse = (data) => {
    setToken(data.token);
    localStorage.setItem(TOKEN_KEY, data.token);
  };

  const navigateTo = useCallback((view) => {
    const path = view === "adminUsers" ? "/admin/users" : "/";
    window.history.pushState({ view }, "", path);
    setActiveView(view);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: authHeaders(),
      }).catch(() => {});
    }

    clearSession();
  }, [authHeaders, clearSession, token]);

  const apiJson = useCallback(
    async (path, options = {}) => {
      const response = await fetchWithTimeout(`${API_URL}${path}`, {
        ...options,
        headers: authHeaders({
          "Content-Type": "application/json",
          ...(options.headers || {}),
        }),
      });
      const data = await response.json();

      if (response.status === 401) {
        clearSession();
        throw new Error("Please log in again.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      return data;
    },
    [authHeaders, clearSession]
  );

  const fetchNotes = useCallback(
    async ({ reset = false, nextOffset = 0 } = {}) => {
      if (!token) return;

      const queryOffset = reset ? 0 : nextOffset;
      const params = new URLSearchParams({
        order,
        limit: String(PAGE_SIZE),
        offset: String(queryOffset),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      setLoading(true);

      try {
        const data = await apiJson(`/notes?${params}`, { headers: {} });
        setNotes((current) => (reset ? data.notes : [...current, ...data.notes]));
        setOffset(queryOffset + data.notes.length);
        setHasMore(data.hasMore);
      } catch (error) {
        notify(error.message);
      } finally {
        setLoading(false);
      }
    },
    [apiJson, notify, order, search, token]
  );

  const fetchAdminData = useCallback(async ({ reset = false, nextOffset = 0 } = {}) => {
    if (!token || user?.role !== "admin") return;

    const queryOffset = reset ? 0 : nextOffset;
    const params = new URLSearchParams({
      limit: String(ADMIN_PAGE_SIZE),
      offset: String(queryOffset),
    });

    setAdminLoading(true);

    try {
      const [summary, usersData] = await Promise.all([
        apiJson("/admin/summary", { headers: {} }),
        apiJson(`/admin/users?${params}`, { headers: {} }),
      ]);
      setAdminSummary(summary);
      setAdminUsers((current) => (reset ? usersData.users : [...current, ...usersData.users]));
      setAdminOffset(queryOffset + usersData.users.length);
      setAdminHasMore(usersData.hasMore);
    } catch (error) {
      notify(error.message);
    } finally {
      setAdminLoading(false);
    }
  }, [apiJson, notify, token, user?.role]);

  const fetchAdminSummary = useCallback(async () => {
    if (!token || user?.role !== "admin") return;

    try {
      const summary = await apiJson("/admin/summary", { headers: {} });
      setAdminSummary(summary);
    } catch (error) {
      notify(error.message);
    }
  }, [apiJson, notify, token, user?.role]);

  useEffect(() => {
    const onPopState = () => setActiveView(getInitialView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const callbackUrl = new URL(window.location.href);
    const isAuthCallback = callbackUrl.pathname === "/auth/callback";
    const callbackToken = callbackUrl.searchParams.get("token");
    const callbackError = callbackUrl.searchParams.get("error");
    const nextPath = callbackUrl.searchParams.get("next") || "/";

    if (!isAuthCallback) return;

    if (callbackToken) {
      handleAuthResponse({ token: callbackToken });
      window.history.replaceState({}, "", nextPath.startsWith("/") ? nextPath : "/");
      setActiveView(nextPath === "/admin/users" ? "adminUsers" : "home");
      notify("Signed in securely with Google.");
      return;
    }

    if (callbackError) {
      notify(callbackError);
      window.history.replaceState({}, "", "/");
    }
  }, [notify]);

  useEffect(() => {
    fetchWithTimeout(`${API_URL}/auth/oauth/providers`)
      .then((response) => response.json())
      .then((data) => setOauthProviders(data.providers || []))
      .catch(() => {
        setOauthProviders([{ id: "google", name: "Google", enabled: true, loginUrl: "/auth/oauth/google/start" }]);
      });
  }, []);

  useEffect(() => {
    if (!token) {
      setAuthChecking(false);
      return;
    }

    apiJson("/auth/me", { headers: {} })
      .then((data) => setUser(data.user))
      .catch((error) => notify(error.message))
      .finally(() => setAuthChecking(false));
  }, [apiJson, notify, token]);

  useEffect(() => {
    setOffset(0);
    fetchNotes({ reset: true });
  }, [fetchNotes, order, search, user?.id]);

  useEffect(() => {
    if (!token || !hasProcessingNotes) return undefined;

    const interval = window.setInterval(() => {
      fetchNotes({ reset: true });
      fetchAdminSummary();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [fetchAdminSummary, fetchNotes, hasProcessingNotes, token]);

  useEffect(() => {
    setAdminOffset(0);
    setAdminUsers([]);
    if (activeView === "adminUsers") {
      fetchAdminData({ reset: true });
      return;
    }

    fetchAdminSummary();
  }, [activeView, fetchAdminData, fetchAdminSummary]);

  useEffect(() => {
    if (user && user.role !== "admin" && activeView === "adminUsers") {
      navigateTo("home");
    }
  }, [activeView, navigateTo, user]);

  useEffect(() => {
    if (!openedNote) {
      setDraftTitle("");
      setDraftContent("");
      return;
    }

    setDraftTitle(openedNote.title || "");
    setDraftContent(openedNote.content || "");
  }, [openedNote]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startOAuth = (provider) => {
    const next = activeView === "adminUsers" ? "/admin/users" : "/";
    window.location.assign(`${API_URL}${provider.loginUrl}?next=${encodeURIComponent(next)}`);
  };

  const uploadAudio = async (blob, context) => {
    const formData = new FormData();
    formData.append("audio", blob, "voice-note.webm");

    if (context.title) {
      formData.append("title", context.title);
    }

    const response = await fetch(`${API_URL}/transcribe`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    const data = await response.json();

    if (response.status === 401) {
      clearSession();
      throw new Error("Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Transcription failed");
    }

    return data;
  };

  const startRecording = async (context) => {
    if (recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setRecording(context);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const activeContext = context;

        stopTracks();
        setRecording(null);

        if (!blob.size) {
          notify("No audio was captured.");
          return;
        }

        setProcessing(true);

        try {
          const data = await uploadAudio(blob, activeContext);
          if (data.note) {
            setNotes((current) => [data.note, ...current.filter((note) => note.id !== data.note.id)].slice(0, PAGE_SIZE));
            setOffset((current) => Math.max(current, Math.min(current + 1, PAGE_SIZE)));
            setAdminSummary((current) =>
              current ? { ...current, totalNotes: Number(current.totalNotes || 0) + 1 } : current
            );
          }
          notify(data.note?.transcription_status === "processing" ? "Voice note is processing." : "Voice note created.");
          setProcessing(false);
          fetchNotes({ reset: true });
          fetchAdminSummary();
        } catch (error) {
          notify(error.message);
          setProcessing(false);
        }
      };

      recorder.start();
    } catch (error) {
      setRecording(null);
      stopTracks();
      notify(error.message || "Microphone access was blocked.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const saveNote = async (id, payload) => {
    try {
      const data = await apiJson(`/notes/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      notify("Note saved.");
      setOpenedNote((current) => (current?.id === id ? { ...current, ...data } : current));
      await fetchNotes({ reset: true });
    } catch (error) {
      notify(error.message);
    }
  };

  const deleteNote = async (id) => {
    try {
      await apiJson(`/notes/${id}`, { method: "DELETE" });
      notify("Note deleted.");
      setOpenedNote((current) => (current?.id === id ? null : current));
      await fetchNotes({ reset: true });
      await fetchAdminData({ reset: true });
    } catch (error) {
      notify(error.message);
    }
  };

  const isNewRecording = recording?.type === "create";
  const draftDirty =
    openedNote &&
    (draftTitle !== (openedNote.title || "") || draftContent !== (openedNote.content || ""));

  if (authChecking) {
    return (
      <main className="app-shell">
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <section className="app-container app-skeleton" aria-busy="true">
          <header className="app-header">
            <div>
              <p className="eyebrow">Voice Notes Studio</p>
              <h1>Capture, refine, and search every thought.</h1>
            </div>
            <div className="header-actions">
              <div className="user-chip skeleton-block" />
              <div className="theme-toggle skeleton-block" />
              <div className="ghost-button skeleton-button" />
            </div>
          </header>

          <section className="admin-panel">
            <div className="admin-stats">
              <div className="skeleton-panel" />
              <div className="skeleton-panel" />
            </div>
            <div className="pagination-bar">
              <span className="skeleton-line" />
              <span className="load-more compact skeleton-button" />
            </div>
          </section>

          <section className="recorder-panel">
            <div className="mic-button skeleton-block" />
            <div className="recorder-copy">
              <p className="skeleton-line short" />
              <span className="skeleton-line" />
            </div>
          </section>

          <div className="toolbar">
            <div className="search-field skeleton-block" />
            <div className="toolbar-select-skeleton skeleton-block" />
          </div>

          <div className="notes-list">
            <div className="note-card skeleton-card" />
            <div className="note-card skeleton-card" />
            <div className="note-card skeleton-card" />
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    const googleProvider = oauthProviders.find((provider) => provider.id === "google") || {
      id: "google",
      name: "Google",
      enabled: true,
      loginUrl: "/auth/oauth/google/start",
    };

    return (
      <main className="app-shell">
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <section className="auth-shell">
          {message && <div className="toast">{message}</div>}
          <div className="auth-card oauth-card">
            <p className="eyebrow">Voice Notes Studio</p>
            <h1>Continue without passwords.</h1>
            <p className="auth-copy">
              Sign in or create your account with OAuth 2.0. Your notes stay tied to your verified Google account.
            </p>

            <button className="oauth-button" type="button" onClick={() => startOAuth(googleProvider)}>
              <span className="provider-mark">G</span>
              <span>
                <strong>Continue with Google</strong>
                <small>{googleProvider.enabled ? "OAuth 2.0 secure sign-in" : "Google setup needs backend env"}</small>
              </span>
            </button>

            <div className="auth-benefits">
              <span>One-click access</span>
              <span>No stored passwords</span>
              <span>Session restored on restart</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      <section className="app-container">
        <Header
          theme={theme}
          user={user}
          onLogout={logout}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        />

        {message && <div className="toast">{message}</div>}

        {user.role === "admin" && activeView === "home" && (
          <section className="admin-panel">
            <div className="admin-stats">
              <div>
                <span>Total Users</span>
                <strong>{adminSummary?.totalUsers ?? 0}</strong>
              </div>
              <div>
                <span>Total Notes</span>
                <strong>{adminSummary?.totalNotes ?? 0}</strong>
              </div>
            </div>
            <div className="pagination-bar">
              <span>User details are available on a dedicated admin page.</span>
              <button className="load-more compact" onClick={() => navigateTo("adminUsers")}>
                Open User Details
              </button>
            </div>
          </section>
        )}

        {user.role === "admin" && activeView === "adminUsers" && (
          <section className="admin-panel admin-page">
            <div className="admin-page-header">
              <div>
                <p className="eyebrow">Admin</p>
                <h2>User details</h2>
              </div>
              <button className="ghost-button" onClick={() => navigateTo("home")}>
                Back to Dashboard
              </button>
            </div>

            <div className="admin-table">
              {adminUsers.map((adminUser) => (
                <div key={adminUser.id} className="admin-row admin-user-row">
                  <span>{adminUser.name}</span>
                  <span>{adminUser.email}</span>
                  <span>{adminUser.role}</span>
                  <strong>{adminUser.note_count} notes</strong>
                </div>
              ))}
            </div>

            <div className="pagination-bar">
              <span>
                Showing {adminUsers.length} of {adminSummary?.totalUsers ?? 0} users
              </span>
              {adminHasMore && (
                <button
                  className="load-more compact"
                  disabled={adminLoading}
                  onClick={() => fetchAdminData({ nextOffset: adminOffset })}
                >
                  {adminLoading ? "Loading..." : "Load More Users"}
                </button>
              )}
            </div>
          </section>
        )}

        {activeView === "home" && (
          <>
            <Recorder
              isRecording={isNewRecording}
              isProcessing={processing}
              disabled={Boolean(recording && !isNewRecording)}
              onStart={() => startRecording({ type: "create" })}
              onStop={stopRecording}
            />

            <div className="toolbar">
              <label className="search-field">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your notes"
                />
              </label>

              <select value={order} onChange={(event) => setOrder(event.target.value)}>
                <option value="DESC">Newest first</option>
                <option value="ASC">Oldest first</option>
              </select>
            </div>

            <div className="notes-list">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} onOpen={setOpenedNote} />
              ))}

              {!loading && notes.length === 0 && (
                <div className="empty-state">
                  <p>No notes found.</p>
                  <span>Record a thought or adjust your search.</span>
                </div>
              )}
            </div>

            {hasMore && (
              <div className="pagination-bar notes-pagination">
                <span>Showing {notes.length} notes</span>
                <button className="load-more" disabled={loading} onClick={() => fetchNotes({ nextOffset: offset })}>
                  {loading ? "Loading..." : "Load More Notes"}
                </button>
              </div>
            )}
          </>
        )}

        {openedNote && (
          <div className="note-overlay" role="dialog" aria-modal="true" onMouseDown={() => setOpenedNote(null)}>
            <section className="note-detail" onMouseDown={(event) => event.stopPropagation()}>
              <div className="detail-topbar">
                <time>
                  {new Intl.DateTimeFormat(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(openedNote.created_at))}
                </time>
                <button className="icon-button" onClick={() => setOpenedNote(null)} aria-label="Close note">
                  ×
                </button>
              </div>

              <input
                className="detail-title"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Untitled note"
              />

              <textarea
                className="detail-content"
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                spellCheck="true"
              />

              <div className="detail-actions">
                <button
                  className="ghost-button"
                  disabled={!draftDirty || Boolean(recording) || processing}
                  onClick={() => saveNote(openedNote.id, { title: draftTitle, content: draftContent })}
                >
                  Save
                </button>
                <button
                  className="danger-button"
                  disabled={Boolean(recording) || processing}
                  onClick={() => deleteNote(openedNote.id)}
                >
                  Delete
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
