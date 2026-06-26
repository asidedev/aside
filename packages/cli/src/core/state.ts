import { PATHS, STATE_VERSION, PIN_GC_MS } from "../config.js";
import { readJsonSafe, writeJsonAtomic } from "./fsutil.js";

export interface Pin {
  curiosity_id: string;
  slot_started_at: number; // epoch ms
  last_render_at: number; // epoch ms of the most recent render (for per-turn rotation)
  impression_emitted: boolean;
  click_token: string | null;
}

export interface StateFile {
  version: number;
  pins: Record<string, Pin>; // keyed by session_id
  day_key: string;
  slots_today: number;
  recent: string[]; // recent curiosity_ids (anti-repetition window)
  last_sponsored: boolean;
  last_sync_at: number; // epoch ms of last background sync spawn
}

function empty(): StateFile {
  return {
    version: STATE_VERSION,
    pins: {},
    day_key: "",
    slots_today: 0,
    recent: [],
    last_sponsored: false,
    last_sync_at: 0,
  };
}

export function readState(): StateFile {
  const s = readJsonSafe<StateFile>(PATHS.state, empty());
  if (!s || s.version !== STATE_VERSION || typeof s.pins !== "object") {
    return empty();
  }
  // Defensive defaults for partially-written / older files.
  return {
    version: STATE_VERSION,
    pins: s.pins ?? {},
    day_key: s.day_key ?? "",
    slots_today: s.slots_today ?? 0,
    recent: Array.isArray(s.recent) ? s.recent : [],
    last_sponsored: !!s.last_sponsored,
    last_sync_at: s.last_sync_at ?? 0,
  };
}

export function writeState(state: StateFile): void {
  writeJsonAtomic(PATHS.state, state);
}

/** Local calendar day key (YYYY-MM-DD), used to reset the daily cap. */
export function dayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Drop pins older than PIN_GC_MS so the map cannot grow unbounded (item 5). */
export function gcPins(state: StateFile, nowMs: number): void {
  for (const [sid, pin] of Object.entries(state.pins)) {
    if (nowMs - pin.slot_started_at > PIN_GC_MS) delete state.pins[sid];
  }
}

export function rollDayIfNeeded(state: StateFile, nowMs: number): void {
  const key = dayKey(nowMs);
  if (state.day_key !== key) {
    state.day_key = key;
    state.slots_today = 0;
  }
}
