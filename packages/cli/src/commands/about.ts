import { BACKEND_URL, CLI_VERSION } from "../config.js";
import { peekInstallId } from "../core/identity.js";

const REPO_URL = "https://github.com/aside-dev/aside";

/** Plain-language transparency disclosure (Section 5.4). */
export function runAbout(): void {
  const installId = peekInstallId();
  const lines = [
    `Aside v${CLI_VERSION} — transparency`,
    ``,
    `WHAT ASIDE READS`,
    `  • Your local curiosity cache and rotation state (~/.aside/).`,
    `  • An anonymous install_id generated on your machine${
      installId ? ` (current: ${installId})` : ""
    }.`,
    `  • From the stdin Claude Code sends to the status line, ONLY two fields:`,
    `      - session_id        (used only locally, to pin the session's curiosity)`,
    `      - model.display_name (used only for formatting)`,
    `    Everything else in stdin (cwd, workspace.*, worktree.*, repo.*, pr.*,`,
    `    transcript_path, cost.*, context_window.*, environment variables) is`,
    `    received and DISCARDED — never written to disk, never sent over the network.`,
    ``,
    `WHAT ASIDE SENDS (only on the background sync)`,
    `  • install_id, cli_version, and os ('darwin'|'linux'|'win32').`,
    `  • Which curiosities were SHOWN (id, whether sponsored). Clicks on`,
    `    sponsored items are counted by the server via a redirect — nothing more.`,
    ``,
    `WHAT ASIDE NEVER DOES`,
    `  • Never reads, stores, or sends: code, prompts, responses, file contents,`,
    `    file names, paths, repository metadata, pull request data, transcripts,`,
    `    or environment variables.`,
    `  • Never opens the file pointed to by transcript_path.`,
    `  • Never makes a network request on the 'status' path (never blocks your terminal).`,
    `  • Never sends paths/repo/PR.`,
    ``,
    `Backend: ${BACKEND_URL}`,
    `Open source: ${REPO_URL}`,
    `Public transparency: ${BACKEND_URL}/about`,
  ];
  process.stdout.write(lines.join("\n") + "\n");
}
