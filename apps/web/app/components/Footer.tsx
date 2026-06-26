const REPO_URL = "https://github.com/aside-dev/aside";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="links">
          <a href="/about">Privacy</a>
          <a href="/sponsor">Advertise</a>
          <a href={REPO_URL}>GitHub</a>
          <a href={REPO_URL + "#license"}>MIT License</a>
        </div>
        <span className="note">No cookies. No localStorage. Ever.</span>
      </div>
    </footer>
  );
}
