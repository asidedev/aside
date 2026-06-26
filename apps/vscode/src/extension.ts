import * as vscode from "vscode";

/**
 * Aside VS Code extension. Shows a developer curiosity in the status bar while
 * Claude Code is thinking. "Thinking" is detected by watching the integrated
 * terminal's output for Claude's working-spinner status ("… (Ns · …)" / "for Ns")
 * — read-only, never modifying the terminal (so no garbling, unlike a wrapper).
 *
 * Privacy: it reads terminal bytes ONLY to match the spinner time-marker regex;
 * nothing from the terminal is stored or sent. The only network call is fetching
 * the public curiosity feed.
 */

interface Curiosity {
  id: string;
  body: string;
  is_sponsored: boolean;
  sponsor_handle?: string | null;
  click_url?: string | null;
}

// Offline fallback so the extension works even if the backend is unreachable.
const FALLBACK: Curiosity[] = [
  c("The first computer \"bug\" was a real moth, taped into a logbook in 1947."),
  c("HTTP 418 \"I'm a teapot\" is a real status code, from a 1998 April Fools RFC."),
  c("Tony Hoare called inventing the null reference his \"billion-dollar mistake.\""),
  c("Python is named after Monty Python — not the snake."),
  c("0.1 + 0.2 doesn't equal 0.3 in most languages — blame binary floating point."),
  c("The Apollo 11 guidance computer landed on the Moon with about 4 KB of RAM."),
  c("grep is named after the old ed command g/re/p — global / regex / print."),
  c("\"Google\" is a misspelling of \"googol\" — the number 10 to the 100th."),
  {
    id: "house-1",
    body: "Aside is open source and privacy-first — it never reads your code.",
    is_sponsored: true,
    sponsor_handle: "aside",
    click_url: "https://aside-melissas-projects-6a8130ee.vercel.app/",
  },
];
function c(body: string): Curiosity {
  return { id: body.slice(0, 12), body, is_sponsored: false };
}

const SPINNER_RE = /\bfor \d+s\b|\(\d+s\b/;
const TURN_GAP_MS = 2500;

let pool: Curiosity[] = FALLBACK;
let idx = -1;
let current: Curiosity | null = null;
let lastSpinnerTs = 0;
let item: vscode.StatusBarItem;
let idleTimer: ReturnType<typeof setInterval> | undefined;

export function activate(context: vscode.ExtensionContext) {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = "aside.openLink";
  context.subscriptions.push(item);

  void refreshFeed();

  context.subscriptions.push(
    vscode.commands.registerCommand("aside.next", () => rotate(true)),
    vscode.commands.registerCommand("aside.toggle", toggle),
    vscode.commands.registerCommand("aside.openLink", openLink),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("aside")) {
        void refreshFeed();
        applyEnabled();
      }
    }),
  );

  // OPT-IN thinking detection. Off by default: with it off, Aside reads NOTHING
  // from your terminal and rotates on the idle timer. When you enable
  // `aside.detectThinkingFromTerminal`, each terminal write is passed to a single
  // boolean regex test and dropped immediately — never stored, logged, buffered,
  // or sent. This is the whole privacy contract for terminal access.
  const detectFromTerminal = vscode.workspace
    .getConfiguration("aside")
    .get<boolean>("detectThinkingFromTerminal", false);
  const w = vscode.window as unknown as {
    onDidWriteTerminalData?: (
      cb: (e: { data: string }) => void,
    ) => vscode.Disposable;
  };
  if (detectFromTerminal && typeof w.onDidWriteTerminalData === "function") {
    context.subscriptions.push(
      w.onDidWriteTerminalData((e) => {
        if (looksLikeThinking(e.data)) onThinkingFrame();
      }),
    );
  }

  // Idle fallback rotation (and the heartbeat that reveals/hides on thinking).
  startIdleTimer();
  applyEnabled();
  rotate(false);
}

export function deactivate() {
  if (idleTimer) clearInterval(idleTimer);
}

function enabled(): boolean {
  return vscode.workspace.getConfiguration("aside").get<boolean>("enabled", true);
}

function applyEnabled() {
  if (enabled()) {
    item.show();
  } else {
    item.hide();
  }
}

function toggle() {
  const cfg = vscode.workspace.getConfiguration("aside");
  void cfg.update("enabled", !enabled(), vscode.ConfigurationTarget.Global);
}

/**
 * Returns true if a terminal write looks like Claude's working spinner. The
 * argument is consumed ONLY to run this test and is never retained, copied,
 * logged, or transmitted — the caller keeps only the boolean.
 */
function looksLikeThinking(data: string): boolean {
  return SPINNER_RE.test(data);
}

function onThinkingFrame() {
  const now = Date.now();
  if (now - lastSpinnerTs > TURN_GAP_MS) rotate(false); // new thinking session
  lastSpinnerTs = now;
}

function startIdleTimer() {
  if (idleTimer) clearInterval(idleTimer);
  const secs = vscode.workspace
    .getConfiguration("aside")
    .get<number>("idleRotateSeconds", 25);
  let elapsed = 0;
  idleTimer = setInterval(() => {
    elapsed += 1;
    // If we haven't seen a spinner recently, rotate on the idle cadence so the
    // status bar still feels alive even without terminal-data detection.
    const sinceSpinner = Date.now() - lastSpinnerTs;
    if (sinceSpinner > TURN_GAP_MS && elapsed >= Math.max(5, secs)) {
      elapsed = 0;
      rotate(false);
    }
  }, 1000);
}

function rotate(force: boolean) {
  if (!enabled() && !force) return;
  if (pool.length === 0) return;
  idx = (idx + 1) % pool.length;
  current = pool[idx];
  render();
}

function render() {
  if (!current) return;
  const handle = current.sponsor_handle
    ? "@" + current.sponsor_handle.replace(/^@+/, "")
    : "@aside";
  const trimmed = truncate(current.body, 70);
  // ☞ manicule points at the curiosity — the "margin note" emblem, in every screenshot.
  item.text = `☞ ${trimmed} ${current.is_sponsored ? "· " + handle : "— " + handle}`;
  const md = new vscode.MarkdownString(
    `${current.body} — **${handle}**` +
      (current.click_url ? `\n\n[Open ↗](${current.click_url})` : ""),
  );
  md.isTrusted = true;
  item.tooltip = md;
}

function openLink() {
  if (current?.click_url) {
    void vscode.env.openExternal(vscode.Uri.parse(current.click_url));
  } else {
    rotate(true);
  }
}

async function refreshFeed() {
  const base = vscode.workspace
    .getConfiguration("aside")
    .get<string>("backendUrl", "")
    .replace(/\/+$/, "");
  if (!base || typeof fetch !== "function") return;
  try {
    const res = await fetch(`${base}/api/curiosities?os=vscode`);
    if (!res.ok) return;
    const json = (await res.json()) as { curiosities?: Curiosity[] };
    if (Array.isArray(json.curiosities) && json.curiosities.length > 0) {
      pool = json.curiosities;
    }
  } catch {
    /* offline / SSO — keep the fallback pool */
  }
}

function truncate(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}
