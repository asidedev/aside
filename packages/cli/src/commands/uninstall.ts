import { rmSync } from "node:fs";
import { CLAUDE_SETTINGS_PATH, ASIDE_DIR } from "../config.js";
import { readJsonSafe, writeJsonAtomic, fileExists } from "../core/fsutil.js";
import { pointsToAside } from "./install.js";

interface ClaudeSettings {
  statusLine?: { type?: string; command?: string };
  [k: string]: unknown;
}

export function runUninstall(): void {
  const out = (s: string) => process.stdout.write(s + "\n");

  if (fileExists(CLAUDE_SETTINGS_PATH)) {
    const settings = readJsonSafe<ClaudeSettings>(CLAUDE_SETTINGS_PATH, {});
    const cmd = settings.statusLine?.command;
    if (settings.statusLine && pointsToAside(cmd)) {
      delete settings.statusLine;
      writeJsonAtomic(CLAUDE_SETTINGS_PATH, settings);
      out("✅ Aside status line removed from settings.json (all other keys preserved).");
    } else if (settings.statusLine) {
      out("ℹ The current status line is NOT Aside's — leaving it untouched:");
      out(`   ${cmd ?? "(no command)"}`);
    } else {
      out("ℹ No status line configured in settings.json.");
    }
  } else {
    out("ℹ settings.json doesn't exist — nothing to remove there.");
  }

  // Remove ~/.aside/ (config, cache, state, queue).
  try {
    rmSync(ASIDE_DIR, { recursive: true, force: true });
    out(`✅ Removed ${ASIDE_DIR}.`);
  } catch {
    out(`⚠ Couldn't remove ${ASIDE_DIR} (delete it manually if needed).`);
  }

  out("Uninstalled. Thanks for using Aside. 👋");
}
