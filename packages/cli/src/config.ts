import { homedir } from "node:os";
import { join } from "node:path";

/** Backend base URL. Overridable for local dev / self-hosting. */
export const BACKEND_URL =
  process.env.ASIDE_BACKEND_URL?.replace(/\/+$/, "") ||
  "https://aside-melissas-projects-6a8130ee.vercel.app";

export const ASIDE_DIR =
  process.env.ASIDE_HOME || join(homedir(), ".aside");

export const CLAUDE_SETTINGS_PATH =
  process.env.ASIDE_CLAUDE_SETTINGS || join(homedir(), ".claude", "settings.json");

export const PATHS = {
  dir: ASIDE_DIR,
  config: join(ASIDE_DIR, "config.json"),
  cache: join(ASIDE_DIR, "cache.json"),
  state: join(ASIDE_DIR, "state.json"),
  queue: join(ASIDE_DIR, "queue.jsonl"),
  /** Lock for read-modify-write on state.json (multi-session safety). */
  stateLock: join(ASIDE_DIR, "state.lock"),
};

/** Schema version for on-disk state/cache files. Bump on breaking changes. */
export const STATE_VERSION = 1;

// Rotation tuning (Section 8).
export const DAILY_CAP = 1000; // sanity bound only — the footer rotates per prompt
export const DISPLAY_PROBABILITY = 1; // always show a curiosity when a new slot is allowed
export const SPONSORED_RATIO = 0.2; // ~20% of slots are sponsored
export const RECENT_WINDOW = 30; // anti-repetition window
// A new prompt/turn is detected by a gap between status-line renders: renders
// cluster (debounced ~300ms) around each assistant message, with seconds of
// quiet between turns. A gap longer than this rotates to a fresh curiosity.
export const TURN_GAP_MS = 2500;
export const SLOT_TTL_MS = 30 * 60 * 1000; // hard cap: rotate within a very long single turn
export const PIN_GC_MS = 24 * 60 * 60 * 1000; // drop pins older than 24h
export const CACHE_STALE_MS = 6 * 60 * 60 * 1000; // refresh cache if older than 6h
export const SYNC_MIN_INTERVAL_MS = 30 * 60 * 1000; // don't spawn sync more than every 30 min

export const CLI_VERSION = "0.1.0";
