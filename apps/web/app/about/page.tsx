import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

export const metadata = {
  title: "Aside — Transparency",
  description:
    "Exactly what the Aside client reads, what it sends, and what it never does.",
};

export default function About() {
  return (
    <>
      <Nav />
      <main className="container" style={{ padding: "64px 24px 24px" }}>
        <article className="prose">
          <a href="/" className="back-link">
            ← back to Aside
          </a>
          <h1>Transparency</h1>
          <p className="lead">
            Exactly what the client reads, what it sends, and what it never does.
            The same text is printed by <code>aside about</code>.
          </p>

          <h2>What Aside reads</h2>
          <ul>
            <li>
              Your local curiosity cache and rotation state (
              <code>~/.aside/</code>).
            </li>
            <li>
              An anonymous <code>install_id</code> generated on your machine
              (pseudonymous: it links your display history, but not your
              identity).
            </li>
            <li>
              From the stdin that Claude Code sends to the status line,{" "}
              <strong>only</strong> <code>session_id</code> and{" "}
              <code>model.display_name</code>. Everything else (<code>cwd</code>,{" "}
              <code>workspace.*</code>, <code>worktree.*</code>,{" "}
              <code>repo.*</code>, <code>pr.*</code>,{" "}
              <code>transcript_path</code>, <code>cost.*</code>,{" "}
              <code>context_window.*</code>, env) is received and{" "}
              <strong>discarded</strong>.
            </li>
          </ul>

          <h2>What Aside sends</h2>
          <ul>
            <li>
              On the background sync: <code>install_id</code>,{" "}
              <code>cli_version</code>, and <code>os</code>.
            </li>
            <li>
              Which curiosities were shown (id, whether sponsored). Clicks on
              sponsored items are counted by the server via a redirect.
            </li>
            <li>
              Nothing else. The server sees your IP (inherent to HTTP); we do not
              record IP alongside impressions.
            </li>
          </ul>

          <h2>What Aside never does</h2>
          <ul>
            <li>
              Never reads, stores, or sends code, prompts, responses, file
              contents or file names, paths, repo or PR metadata, transcripts, or
              environment variables.
            </li>
            <li>
              Never opens the file pointed to by <code>transcript_path</code>.
            </li>
            <li>
              Never makes a network request on the <code>status</code> path (it
              never blocks your terminal).
            </li>
          </ul>

          <h2>Honest limitations</h2>
          <ul>
            <li>
              Impression/click counting is best-effort and not fraud-resistant
              (the endpoint is anonymous and unauthenticated).
            </li>
            <li>
              The <code>install_id</code> is pseudonymous, not absolutely
              anonymous.
            </li>
            <li>
              The server necessarily sees your IP address as part of any HTTP
              request, even though we do not store it alongside impressions.
            </li>
          </ul>

          <p className="fineprint">
            This page uses no <code>localStorage</code> and no cookies.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
