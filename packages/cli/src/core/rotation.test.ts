import { describe, it, expect } from "vitest";
import { rotate } from "./rotation.js";
import type { CacheFile } from "./cache.js";
import type { StateFile } from "./state.js";
import { dayKey } from "./state.js";
import { STATE_VERSION, DAILY_CAP } from "../config.js";
import type { Curiosity } from "@aside/shared";

function cur(id: string, sponsored = false): Curiosity {
  return {
    id,
    body: `body ${id}`,
    topic: "shell",
    difficulty: "mid",
    is_sponsored: sponsored,
    sponsor_id: sponsored ? "sp1" : null,
    sponsor_handle: sponsored ? "acme" : null,
    click_url: sponsored ? "https://acme.example" : null,
    status: "live",
  };
}

function freshState(): StateFile {
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

function cache(curiosities: Curiosity[]): CacheFile {
  return {
    version: STATE_VERSION,
    served_at: null,
    fetched_at: Date.now(),
    curiosities,
  };
}

/** Deterministic RNG from a fixed sequence (loops). */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

const NOW = 1_700_000_000_000;

describe("rotation engine", () => {
  it("creates and pins a curiosity on a new slot", () => {
    const c = cache([cur("a"), cur("b"), cur("c")]);
    const s = freshState();
    // rng: display gate passes (0), wantSponsored roll high (0.9 -> not sponsored), pick 0
    const chosen = rotate(c, s, "sess1", { now: NOW, rng: seq([0, 0.9, 0]) });
    expect(chosen).not.toBeNull();
    expect(s.pins["sess1"].curiosity_id).toBe(chosen!.id);
    expect(s.pins["sess1"].impression_emitted).toBe(false);
    expect(s.slots_today).toBe(1);
    expect(s.recent).toContain(chosen!.id);
  });

  it("yields null when the daily cap is reached", () => {
    const c = cache([cur("a"), cur("b")]);
    const s = freshState();
    // Match the current day so rollDayIfNeeded does NOT reset slots_today.
    s.day_key = dayKey(NOW);
    s.slots_today = DAILY_CAP;
    const chosen = rotate(c, s, "sess1", { now: NOW, rng: seq([0, 0.9, 0]) });
    expect(chosen).toBeNull();
  });

  it("always shows a new slot when under the daily cap (display gate fully open)", () => {
    const c = cache([cur("a")]);
    const s = freshState();
    // Even a high display roll passes now that DISPLAY_PROBABILITY = 1.
    const chosen = rotate(c, s, "sess1", { now: NOW, rng: seq([0.99, 0.9, 0]) });
    expect(chosen).not.toBeNull();
    expect(s.slots_today).toBe(1);
  });

  it("never repeats a curiosity inside the recent window", () => {
    const c = cache([cur("a"), cur("b")]);
    const s = freshState();
    s.recent = ["a"];
    // display passes, not sponsored, pick index 0 of remaining pool (which is [b])
    const chosen = rotate(c, s, "sess1", { now: NOW, rng: seq([0, 0.9, 0]) });
    expect(chosen!.id).toBe("b");
  });

  it("respects ~20% sponsored mix wiring and never two sponsored in a row", () => {
    const c = cache([cur("a"), cur("s1", true), cur("s2", true), cur("b")]);
    const s = freshState();
    s.last_sponsored = true; // guard must prevent sponsored now
    // display passes (0), wantSponsored roll low (0.0) BUT guard blocks -> non-sponsored
    const chosen = rotate(c, s, "sess1", { now: NOW, rng: seq([0, 0.0, 0]) });
    expect(chosen!.is_sponsored).toBe(false);
    expect(s.last_sponsored).toBe(false);
  });

  it("selects sponsored when allowed and roll is low", () => {
    const c = cache([cur("s1", true), cur("s2", true)]);
    const s = freshState();
    s.last_sponsored = false;
    const chosen = rotate(c, s, "sess1", { now: NOW, rng: seq([0, 0.0, 0]) });
    expect(chosen!.is_sponsored).toBe(true);
    expect(s.last_sponsored).toBe(true);
  });

  it("falls back to non-sponsored when no sponsored is eligible", () => {
    const c = cache([cur("a"), cur("b")]);
    const s = freshState();
    const chosen = rotate(c, s, "sess1", { now: NOW, rng: seq([0, 0.0, 0]) });
    expect(chosen!.is_sponsored).toBe(false);
  });

  it("returns null when the pool is empty after anti-repetition", () => {
    const c = cache([cur("a")]);
    const s = freshState();
    s.recent = ["a"];
    const chosen = rotate(c, s, "sess1", { now: NOW, rng: seq([0, 0.9, 0]) });
    expect(chosen).toBeNull();
  });
});
