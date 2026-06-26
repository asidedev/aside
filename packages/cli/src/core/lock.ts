import {
  openSync,
  closeSync,
  rmSync,
  readFileSync,
  statSync,
  writeSync,
} from "node:fs";
import { PATHS } from "../config.js";

/**
 * Minimal cross-process advisory lock (item 3 fix: multi-session safety on
 * state.json). Uses O_EXCL create as the lock primitive. Best-effort: if the
 * lock cannot be acquired quickly we proceed anyway rather than blocking the
 * status render — correctness of counters degrades gracefully, the host tool
 * is never delayed.
 */
const STALE_MS = 5000; // a held lock older than this is considered abandoned
const MAX_WAIT_MS = 400; // never block the render for long
const RETRY_MS = 15;

function sleepBusy(ms: number): void {
  const end = process.hrtime.bigint() + BigInt(ms) * 1_000_000n;
  while (process.hrtime.bigint() < end) {
    /* spin briefly; lock contention is rare and short */
  }
}

export function withStateLock<T>(fn: () => T): T {
  const path = PATHS.stateLock;
  let fd: number | null = null;
  const start = Date.now();

  while (fd === null) {
    try {
      fd = openSync(path, "wx");
      // record holder for stale diagnostics
      try {
        writeSync(fd, String(process.pid));
      } catch {
        /* ignore */
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
        // unexpected error — proceed without lock
        return fn();
      }
      // Lock exists. Break it if stale.
      try {
        const age = Date.now() - statSync(path).mtimeMs;
        if (age > STALE_MS) {
          rmSync(path, { force: true });
          continue;
        }
      } catch {
        /* race: lock vanished, retry */
      }
      if (Date.now() - start > MAX_WAIT_MS) {
        // Give up waiting; proceed unlocked rather than block render.
        return fn();
      }
      sleepBusy(RETRY_MS);
    }
  }

  try {
    return fn();
  } finally {
    try {
      closeSync(fd);
    } catch {
      /* ignore */
    }
    try {
      rmSync(path, { force: true });
    } catch {
      /* ignore */
    }
  }
}

/** Exposed for diagnostics/tests. */
export function lockHolder(): string | null {
  try {
    return readFileSync(PATHS.stateLock, "utf8");
  } catch {
    return null;
  }
}
