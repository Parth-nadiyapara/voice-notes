function Header({ theme, user, onLogout, onToggleTheme }) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Voice Notes Studio</p>
        <h1>Capture, refine, and search every thought.</h1>
      </div>

      <div className="header-actions">
        <div className="user-chip">
          <span>{user?.name}</span>
          <small>{user?.role}</small>
        </div>
        <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle color theme">
          <span>{theme === "dark" ? "☾" : "☀"}</span>
        </button>
        <button className="ghost-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
