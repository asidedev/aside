import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { CopyButton } from "./components/CopyButton";

const REPO_URL = "https://github.com/aside-dev/aside";

export default function Home() {
  return (
    <>
      <Nav />

      <header className="hero">
        <div className="container">
          <span className="eyebrow">
            <span className="pulse" aria-hidden="true" />
            for Claude Code
          </span>
          <h1 className="title">
            Curiosity in the margin —{" "}
            <span className="accent">while the AI thinks.</span>
          </h1>
          <p className="subcopy">
            Like an HTML <code>&lt;aside&gt;</code>, Aside lives in the margin of
            your work: a short, well-sourced dev fact in the Claude Code status
            line while the assistant thinks. Idle seconds become a moment of
            learning. Local-first, open source, and privacy-preserving by design.
          </p>

          <div className="hero-cta">
            <a href="#install" className="btn btn-primary">
              Install the CLI
            </a>
            <a href="/sponsor" className="btn btn-ghost">
              Advertise on Aside
            </a>
          </div>

          <div id="install">
            <CopyButton />
          </div>

          {/* Terminal mock — the product's status line, live. */}
          <div
            className="terminal"
            role="img"
            aria-label="Terminal showing the Aside status line"
          >
            <div className="terminal-bar">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="title">claude-code — ~/projects/api</span>
            </div>
            <div className="terminal-body">
              <div className="muted">› refactor the auth middleware</div>
              <div className="out">⏺ Working on it…</div>
              <div className="statusline">
                <span className="spinner" aria-hidden="true">
                  ◐
                </span>
                <span className="model">Opus</span>
                <span className="sep">│</span>
                <span className="curio">
                  git reflog shows commits you thought were gone forever.
                </span>
                <span className="sig">— @aside</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* How it works */}
        <section className="block" id="how">
          <div className="container">
            <div className="section-head">
              <div className="section-kicker">How it works</div>
              <h2 className="section-title">Three steps, then it just runs.</h2>
              <p className="section-sub">
                Aside installs as a status-line command and rotates content
                locally. There is no network call on the render path, so your
                terminal never blocks.
              </p>
            </div>
            <div className="grid">
              <div className="card">
                <div className="step-num">01</div>
                <h3>Install</h3>
                <p>
                  One command merges Aside non-destructively into your
                  <code> ~/.claude/settings.json</code>. It never overwrites an
                  existing status line without <code>--force</code>.
                </p>
              </div>
              <div className="card">
                <div className="step-num">02</div>
                <h3>Sync in the background</h3>
                <p>
                  A best-effort background sync fills a local cache of
                  curiosities. Everything works offline; the pool only grows.
                </p>
              </div>
              <div className="card">
                <div className="step-num">03</div>
                <h3>Learn between turns</h3>
                <p>
                  While the assistant thinks, a fresh fact rotates into the
                  status line — signed <code>— @aside</code>, with the
                  occasional native sponsor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="block" id="privacy">
          <div className="container">
            <div className="section-head">
              <div className="section-kicker">Privacy</div>
              <h2 className="section-title">
                It receives your context — and throws it away.
              </h2>
              <p className="section-sub">
                Claude Code hands the status line a JSON blob full of paths and
                metadata. Aside reads two fields and discards the rest. It
                never touches your code.
              </p>
            </div>
            <ul className="privacy-list">
              <li>
                <span className="mark">✓</span>
                <span>
                  Reads only <code>session_id</code> and{" "}
                  <code>model.display_name</code> from stdin — everything else
                  (<code>cwd</code>, <code>repo</code>, <code>pr</code>,{" "}
                  <code>transcript_path</code>, env) is received and dropped.
                </span>
              </li>
              <li>
                <span className="mark">✓</span>
                <span>
                  Sends only an anonymous <code>install_id</code>,{" "}
                  <code>cli_version</code>, <code>os</code>, and which
                  curiosities were shown — on a background sync, never on render.
                </span>
              </li>
              <li className="never">
                <span className="mark">✕</span>
                <span>
                  Never reads or sends your code, prompts, files, paths, repo,
                  PR data, or transcripts. Never opens the transcript file.
                </span>
              </li>
              <li className="never">
                <span className="mark">✕</span>
                <span>
                  Never uses cookies or <code>localStorage</code> — this site
                  included.
                </span>
              </li>
            </ul>
            <p style={{ marginTop: 28 }}>
              <a href="/about">Read the full transparency statement →</a>
            </p>
          </div>
        </section>

        {/* Open source */}
        <section className="block" id="open-source">
          <div className="container">
            <div className="grid two">
              <div>
                <div className="section-kicker">Open source</div>
                <h2 className="section-title">Auditable, end to end.</h2>
                <p className="section-sub">
                  The CLI, backend, and content pipeline are MIT-licensed. The
                  privacy claims above aren&apos;t a promise — they&apos;re code
                  you can read. Run <code>aside about</code> any time to see
                  exactly what is read and sent.
                </p>
                <p style={{ marginTop: 22 }}>
                  <a href={REPO_URL} className="btn btn-ghost">
                    View source on GitHub
                  </a>
                </p>
              </div>
              <div className="card">
                <div className="step-num">Native sponsorship</div>
                <h3>~20% of slots are sponsored.</h3>
                <p>
                  Aside stays free because a minority of curiosities are
                  honest, clearly-attributed sponsor messages — never tracking,
                  never reading your work.{" "}
                  <a href="/sponsor">Reach developers →</a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
