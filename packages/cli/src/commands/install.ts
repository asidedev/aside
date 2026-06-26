import { resolve } from "node:path";
import { CLAUDE_SETTINGS_PATH } from "../config.js";
import { readJsonSafe, writeJsonAtomic, fileExists } from "../core/fsutil.js";
import { getInstallId } from "../core/identity.js";
import { runSync } from "../core/syncCore.js";

interface StatusLineSetting {
  type: string;
  command: string;
  [k: string]: unknown;
}
interface ClaudeSettings {
  statusLine?: StatusLineSetting;
  disableAllHooks?: boolean;
  [k: string]: unknown;
}

/** Build the absolute status-line command (item: never use npx — cold start). */
export function asideStatusCommand(): string {
  const entry = resolve(process.argv[1] ?? "");
  // Quote both node and the entry path to survive spaces.
  return `"${process.execPath}" "${entry}" status`;
}

/** Heuristic: does an existing statusLine command belong to Aside? */
export function pointsToAside(cmd: string | undefined): boolean {
  if (!cmd) return false;
  const c = cmd.toLowerCase();
  return (
    (c.includes("aside") && c.includes("status")) ||
    c.includes(resolve(process.argv[1] ?? "").toLowerCase())
  );
}

export async function runInstall(opts: { force?: boolean }): Promise<void> {
  const out = (s: string) => process.stdout.write(s + "\n");

  // 1. Anonymous identity.
  const installId = getInstallId();

  // 2. Best-effort initial sync (user-invoked path: awaiting is fine).
  try {
    await runSync();
  } catch {
    out("⚠ Initial sync failed (offline?). Continuing — the cache fills on the next sync.");
  }

  // 3. Non-destructive merge into settings.json.
  const settings = readJsonSafe<ClaudeSettings>(CLAUDE_SETTINGS_PATH, {});

  const existing = settings.statusLine;
  if (existing && existing.command && !pointsToAside(existing.command)) {
    if (!opts.force) {
      out("✋ A status line is already configured and it's NOT Aside's:");
      out(`   ${existing.command}`);
      out("   I won't overwrite it without confirmation. Re-run with --force to replace it.");
      // TODO(mel): interactive confirmation prompt instead of requiring --force.
      process.exitCode = 1;
      return;
    }
    out("⚠ Replacing the existing status line (--force).");
  }

  settings.statusLine = {
    type: "command",
    command: asideStatusCommand(),
  };

  if (settings.disableAllHooks === true) {
    out("⚠ 'disableAllHooks: true' is set — the status line will be INACTIVE until you turn it off.");
  }

  if (!fileExists(CLAUDE_SETTINGS_PATH)) {
    out(`ℹ Creating ${CLAUDE_SETTINGS_PATH}.`);
  }
  writeJsonAtomic(CLAUDE_SETTINGS_PATH, settings);

  out("✅ Aside installed.");
  out(`   anonymous install_id: ${installId}`);
  out("   A curiosity appears in the status line on your next interaction with Claude Code.");
  out("   See exactly what is read/sent:  aside about");
}
