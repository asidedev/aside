import { runSync } from "../core/syncCore.js";

/** Internal command, normally spawned detached by `status`. */
export async function runSyncCommand(): Promise<void> {
  try {
    await runSync();
  } catch {
    // Background process: swallow errors, never surface to the terminal.
    process.exitCode = 0;
  }
}
