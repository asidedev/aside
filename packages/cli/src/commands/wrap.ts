import { createRequire } from "node:module";
import { readCache, liveCuriosities } from "../core/cache.js";
import { truncateVisible, visibleWidth } from "../core/render.js";

/**
 * EXPERIMENTAL terminal wrapper (the "hack" path). Runs `claude` inside a PTY
 * and rewrites its thinking-spinner line so the gerund ("Churned for 5s") is
 * replaced by a developer curiosity that changes on each new prompt.
 *
 * This fights a live TUI, so it is best-effort: it relies on the observed fact
 * that Claude Code redraws the spinner on a single line via carriage return,
 * and only touches lines beginning with a sparkle spinner glyph.
 */

/**
 * We detect the spinner by its STATUS TEXT, not by the leading glyph — Claude
 * cycles through glyphs from several families (✦ ✛ ✻ + * …) and chasing them is
 * a losing game. The working line is always a gerund followed by an elapsed-time
 * marker: "Channelling… (7s · ↓ 268 tokens)" or "Baked for 2s". That tail is
 * distinctive enough to key off reliably.
 *
 * Groups: (1) optional leading glyph char, (2) the gerund, (3) the time tail.
 */
const SPINNER_RE =
  /([^\s\r\nA-Za-z\x1b]?)[ \t]*([A-Z][A-Za-z]+(?:…|\.\.\.)?)( for \d+s\b| \(\d+s[^)\r\n]{0,60}\)?)/g;

export interface WrapState {
  current: string | null; // the curiosity currently pinned to this thinking session
  lastSpinnerTs: number; // when we last saw a spinner frame
  idx: number; // rotation cursor into the pool
  pool: string[]; // display strings, already prefixed/suffixed
  cols: number;
  now: () => number;
  // ms gap that marks a NEW thinking session (→ rotate to a fresh curiosity)
  gapMs: number;
}

/** Pure transform — exported for tests. Rewrites spinner frames in `chunk`. */
export function rewriteSpinner(chunk: string, st: WrapState): string {
  if (st.pool.length === 0) return chunk;
  SPINNER_RE.lastIndex = 0;
  if (!SPINNER_RE.test(chunk)) return chunk;

  const now = st.now();
  // New thinking session? (first spinner frame after a quiet gap) → rotate.
  if (st.current === null || now - st.lastSpinnerTs > st.gapMs) {
    st.idx = (st.idx + 1) % st.pool.length;
    st.current = st.pool[st.idx];
  }
  st.lastSpinnerTs = now;

  const display = st.current;
  SPINNER_RE.lastIndex = 0;
  return chunk.replace(SPINNER_RE, (_m, glyph: string) => {
    // Claude draws its spinner glyph SEPARATELY (e.g. `✻` ESC[3G `Churned…`),
    // so the regex usually captures no glyph (group1 empty) — the gerund text is
    // preceded by a cursor-position escape. In that case DON'T add a glyph (that
    // caused a double-glyph + 1-char shift); just write the curiosity where
    // Claude already positioned the cursor. Cap width so it never wraps, and
    // erase to end-of-line to wipe any leftover from a longer previous frame.
    // Claude positions the cursor right after its glyph (e.g. ESC[3G), so when
    // we captured no glyph we still emit one leading space to sit clear of it.
    const prefix = glyph ? glyph + " " : " ";
    const room = Math.max(8, st.cols - visibleWidth(prefix) - 4);
    const text = truncateVisible(display, room);
    return `${prefix}${text}\x1b[K`;
  });
}

const MARKER = String.fromCodePoint(0x261e); // ☞ manicule — the "margin note" emblem

function buildPool(): string[] {
  const cache = readCache();
  return liveCuriosities(cache).map((c) => {
    const handle = c.sponsor_handle ? c.sponsor_handle.replace(/^@+/, "") : "aside";
    const body = c.body.replace(/\s+/g, " ").trim();
    return `${MARKER} ${body} — @${handle}`;
  });
}

/** Interactive entry point. */
export async function runWrap(passthroughArgs: string[]): Promise<void> {
  const require = createRequire(import.meta.url);
  let pty: typeof import("node-pty");
  try {
    pty = require("node-pty");
    healSpawnHelper(require); // prebuilt spawn-helper often ships without +x
  } catch {
    process.stderr.write(
      "aside wrap needs the optional 'node-pty' dependency.\n" +
        "Install it:  npm i -g node-pty   (or reinstall @asidedev/cli)\n",
    );
    process.exitCode = 1;
    return;
  }

  const pool = buildPool();
  if (pool.length === 0) {
    process.stderr.write(
      "No curiosities cached yet. Run `aside sync` (or `aside install`) first.\n",
    );
    process.exitCode = 1;
    return;
  }

  const claudeBin = process.env.ASIDE_CLAUDE_BIN || "claude";
  const cols = process.stdout.columns || 120;
  const rows = process.stdout.rows || 30;

  const state: WrapState = {
    current: null,
    lastSpinnerTs: 0,
    idx: -1,
    pool,
    cols,
    now: () => Date.now(),
    gapMs: 700,
  };

  let term: import("node-pty").IPty;
  try {
    term = pty.spawn(claudeBin, passthroughArgs, {
      name: process.env.TERM || "xterm-256color",
      cols,
      rows,
      cwd: process.cwd(),
      env: process.env as { [key: string]: string },
    });
  } catch (err) {
    process.stderr.write(
      `aside wrap could not launch '${claudeBin}': ${
        (err as Error).message
      }\n` +
        "Make sure Claude Code is installed and on your PATH " +
        "(or set ASIDE_CLAUDE_BIN to its full path).\n",
    );
    process.exitCode = 1;
    return;
  }

  term.onData((data: string) => {
    state.cols = process.stdout.columns || state.cols;
    process.stdout.write(rewriteSpinner(data, state));
  });

  const stdin = process.stdin;
  if (stdin.isTTY) stdin.setRawMode(true);
  stdin.resume();
  stdin.on("data", (d) => term.write(d.toString("utf8")));

  const onResize = () =>
    term.resize(process.stdout.columns || cols, process.stdout.rows || rows);
  process.stdout.on("resize", onResize);

  term.onExit(({ exitCode }: { exitCode: number }) => {
    if (stdin.isTTY) stdin.setRawMode(false);
    stdin.pause();
    process.stdout.removeListener("resize", onResize);
    process.exit(exitCode ?? 0);
  });
}

/**
 * node-pty's prebuilt `spawn-helper` frequently lands without the execute bit
 * (npm extracts it 0644), which makes pty.spawn fail with "posix_spawnp failed".
 * Best-effort: find it next to the loaded node-pty and chmod +x.
 */
function healSpawnHelper(require: NodeRequire): void {
  try {
    // Lazy, optional imports so this never breaks the main path.
    const { dirname, join } = require("node:path") as typeof import("node:path");
    const fs = require("node:fs") as typeof import("node:fs");
    const pkg = require.resolve("node-pty/package.json");
    const root = dirname(pkg);
    for (const arch of ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64"]) {
      const helper = join(root, "prebuilds", arch, "spawn-helper");
      try {
        if (fs.existsSync(helper)) fs.chmodSync(helper, 0o755);
      } catch {
        /* ignore individual failures */
      }
    }
  } catch {
    /* node-pty layout differs or perms denied — nothing we can do, proceed */
  }
}
