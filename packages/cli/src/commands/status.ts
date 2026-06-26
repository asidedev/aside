import { spawn } from "node:child_process";
import { readStatusInput } from "../core/stdin.js";
import { readCache, curiosityById, type CacheFile } from "../core/cache.js";
import {
  readState,
  writeState,
  type StateFile,
  type Pin,
  gcPins,
} from "../core/state.js";
import { rotate } from "../core/rotation.js";
import { withStateLock } from "../core/lock.js";
import { appendImpression } from "../core/queue.js";
import { makeClickToken } from "../core/token.js";
import { renderLine } from "../core/render.js";
import { getInstallId } from "../core/identity.js";
import {
  BACKEND_URL,
  SLOT_TTL_MS,
  TURN_GAP_MS,
  CACHE_STALE_MS,
  SYNC_MIN_INTERVAL_MS,
} from "../config.js";
import type { Curiosity } from "@aside/shared";

function supportsHyperlinks(): boolean {
  if (process.env.ASIDE_FORCE_HYPERLINKS === "1") return true;
  if (process.env.ASIDE_NO_HYPERLINKS === "1") return false;
  const tp = process.env.TERM_PROGRAM;
  if (tp === "iTerm.app" || tp === "WezTerm" || tp === "vscode") return true;
  if (process.env.KITTY_WINDOW_ID) return true;
  return false;
}

function columns(): number {
  const env = Number(process.env.COLUMNS);
  if (Number.isFinite(env) && env > 0) return env;
  if (process.stdout.columns && process.stdout.columns > 0) {
    return process.stdout.columns;
  }
  return 80;
}

/**
 * Reuse the pinned curiosity only while we're still in the SAME turn — renders
 * cluster within ~300ms around one assistant message, so a gap larger than
 * TURN_GAP_MS means a new prompt → rotate. Also rotate if the slot is very old
 * (hard cap) to cover a single very long turn.
 */
function sameTurn(pin: Pin | undefined, now: number): pin is Pin {
  if (!pin) return false;
  const lastRender = pin.last_render_at ?? pin.slot_started_at;
  return now - lastRender < TURN_GAP_MS && now - pin.slot_started_at < SLOT_TTL_MS;
}

interface Decision {
  curiosity: Curiosity | null;
  /** Whether to emit a fresh "shown" impression for this render. */
  emitImpression: boolean;
  clickToken: string | null;
}

/**
 * Core, side-effecting selection done under the state lock. Returns what to
 * render. All disk writes to state happen here (atomic, locked).
 */
function decide(
  cache: CacheFile,
  sessionId: string,
  installId: string,
  now: number,
): Decision {
  return withStateLock<Decision>(() => {
    const state: StateFile = readState();
    gcPins(state, now);

    let pin = state.pins[sessionId];
    let curiosity: Curiosity | null = null;

    if (sameTurn(pin, now)) {
      // Same turn → keep the curiosity stable across this turn's re-renders.
      curiosity = curiosityById(cache, pin.curiosity_id) ?? null;
      if (curiosity) pin.last_render_at = now;
    }

    if (!curiosity) {
      // New turn (or no/expired pin) → rotate to a fresh curiosity.
      curiosity = rotate(cache, state, sessionId, {
        now,
        rng: Math.random,
      });
      pin = state.pins[sessionId];
    }

    if (!curiosity || !pin) {
      writeState(state);
      return { curiosity: null, emitImpression: false, clickToken: null };
    }

    let emit = false;
    if (!pin.impression_emitted) {
      // Generate the self-contained click token for sponsored items so the
      // OSC 8 link works regardless of sync ordering (item 1).
      if (curiosity.is_sponsored && curiosity.click_url) {
        pin.click_token = makeClickToken(curiosity.id, installId);
      }
      pin.impression_emitted = true;
      emit = true;
    }

    state.pins[sessionId] = pin;
    writeState(state);

    return {
      curiosity,
      emitImpression: emit,
      clickToken: pin.click_token,
    };
  });
}

function maybeSpawnSync(now: number): void {
  // Read state outside the lock (cheap, best-effort).
  const state = readState();
  const cache = readCache();
  const cacheStale = now - cache.fetched_at > CACHE_STALE_MS;
  const syncRecently = now - state.last_sync_at < SYNC_MIN_INTERVAL_MS;
  if (!cacheStale || syncRecently) return;

  withStateLock(() => {
    const s = readState();
    if (now - s.last_sync_at < SYNC_MIN_INTERVAL_MS) return;
    s.last_sync_at = now;
    writeState(s);
  });

  try {
    const child = spawn(
      process.execPath,
      [process.argv[1] ?? "", "sync"],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
  } catch {
    /* never let a spawn failure affect the render */
  }
}

export function runStatus(): void {
  const now = Date.now();
  const input = readStatusInput();
  const sessionId = input.session_id ?? "default";
  const cache = readCache();
  const installId = getInstallId();

  // Nothing to show yet (e.g. offline first run): render nothing.
  if (cache.curiosities.length === 0) {
    process.stdout.write("");
    maybeSpawnSync(now);
    return;
  }

  const decision = decide(cache, sessionId, installId, now);

  if (!decision.curiosity) {
    process.stdout.write(""); // status line disappears
    maybeSpawnSync(now);
    return;
  }

  if (decision.emitImpression) {
    appendImpression({
      curiosity_id: decision.curiosity.id,
      is_sponsored: decision.curiosity.is_sponsored,
      event: "shown",
      click_token: decision.clickToken,
    });
  }

  const line = renderLine(decision.curiosity, decision.clickToken, {
    columns: columns(),
    supportsHyperlinks: supportsHyperlinks(),
    backendUrl: BACKEND_URL,
  });
  process.stdout.write(line + "\n");

  maybeSpawnSync(now);
}
