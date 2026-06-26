const REPO_URL = "https://github.com/aside-dev/aside";

export function Nav() {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a href="/" className="nav-brand" aria-label="Aside home">
          aside<span className="dot">_</span>
        </a>
        <div className="nav-links">
          <a href="/about">Privacy</a>
          <a href={REPO_URL} className="hide-sm">
            GitHub
          </a>
          <a href="/sponsor">Advertise</a>
        </div>
      </div>
    </nav>
  );
}
