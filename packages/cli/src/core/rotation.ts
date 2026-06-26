import type { Curiosity } from "@aside/shared";
import {
  DAILY_CAP,
  DISPLAY_PROBABILITY,
  SPONSORED_RATIO,
  RECENT_WINDOW,
} from "../config.js";
import type { CacheFile } from "./cache.js";
import { liveCuriosities } from "./cache.js";
import {
  type StateFile,
  type Pin,
  rollDayIfNeeded,
  gcPins,
} from "./state.js";

export interface RotateDeps {
  now: number;
  /** Returns a float in [0,1). Injectable for deterministic tests. */
  rng: () => number;
}

/** A sponsored curiosity is eligible only if live (campaign liveness is
 *  enforced server-side at feed time, so anything sponsored in the cache is
 *  already campaign-live as of the last sync). */
function isEligibleSponsored(c: Curiosity): boolean {
  return c.is_sponsored && c.status === "live";
}

function pick<T>(arr: T[], rng: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Select a curiosity for a NEW slot using local state only (Section 8 / 15.2).
 * Mutates `state` atomically-in-memory (caller persists under lock).
 * Returns the chosen curiosity, or null to render nothing.
 */
export function rotate(
  cache: CacheFile,
  state: StateFile,
  sessionId: string,
  deps: RotateDeps,
): Curiosity | null {
  const { now, rng } = deps;

  rollDayIfNeeded(state, now);
  gcPins(state, now);

  if (state.slots_today >= DAILY_CAP) return null;
  if (rng() > DISPLAY_PROBABILITY) return null; // ~1 in 3 attempts shows

  const pool = liveCuriosities(cache).filter(
    (c) => !state.recent.includes(c.id),
  );
  if (pool.length === 0) return null;

  const wantSponsored =
    rng() < SPONSORED_RATIO && state.last_sponsored === false;

  let candidates: Curiosity[];
  if (wantSponsored) {
    candidates = pool.filter(isEligibleSponsored);
    if (candidates.length === 0) {
      candidates = pool.filter((c) => !c.is_sponsored);
    }
  } else {
    candidates = pool.filter((c) => !c.is_sponsored);
    // If we have nothing non-sponsored but the guard allows, fall back to any.
    if (candidates.length === 0 && state.last_sponsored === false) {
      candidates = pool.filter(isEligibleSponsored);
    }
  }
  if (candidates.length === 0) return null;

  const chosen = pick(candidates, rng);
  if (!chosen) return null;

  const pin: Pin = {
    curiosity_id: chosen.id,
    slot_started_at: now,
    last_render_at: now,
    impression_emitted: false,
    click_token: null,
  };
  state.pins[sessionId] = pin;
  state.slots_today += 1;
  state.recent.push(chosen.id);
  if (state.recent.length > RECENT_WINDOW) {
    state.recent.splice(0, state.recent.length - RECENT_WINDOW);
  }
  state.last_sponsored = chosen.is_sponsored;

  return chosen;
}
