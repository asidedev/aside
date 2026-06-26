import { describe, it, expect } from "vitest";
import { rewriteSpinner, type WrapState } from "./wrap.js";

function state(over: Partial<WrapState> = {}): WrapState {
  return {
    current: null,
    lastSpinnerTs: 0,
    idx: -1,
    pool: ["Apollo 11 landed with ~4 KB of RAM. — @aside", "Second one. — @aside"],
    cols: 80,
    now: () => 1000,
    gapMs: 700,
    ...over,
  };
}

describe("rewriteSpinner (terminal wrapper)", () => {
  it("replaces the spinner gerund with a curiosity, keeping the glyph", () => {
    // Real observed frame: sparkle glyph + "Churned for 1s"
    const out = rewriteSpinner("✻Churned for 1s\r", state());
    expect(out).toContain("✻");
    expect(out).toContain("Apollo 11 landed");
    expect(out).not.toContain("Churned");
    expect(out).toContain("\x1b[K"); // clears to end of line
  });

  it("handles the (Ns · tokens) variant", () => {
    const out = rewriteSpinner("✽Bootstrapping… (8s · ↓238 tokens)\r", state());
    expect(out).not.toContain("Bootstrapping");
    expect(out).toContain("— @aside");
  });

  it("catches glyphs from any family (+, *, ✛) via the status pattern", () => {
    for (const frame of [
      "+ Channelling… (7s · ↓ 268 tokens)",
      "* Baked for 2s",
      "✛ Percolating… (3s · esc to interrupt)",
    ]) {
      const out = rewriteSpinner(frame, state());
      expect(out).toContain("@aside");
      expect(out).not.toMatch(/Channelling|Baked|Percolating/);
    }
  });

  it("leaves non-spinner output untouched", () => {
    const plain = "⏺ Four.\r\n❯ ";
    expect(rewriteSpinner(plain, state())).toBe(plain);
  });

  it("keeps the same curiosity within one thinking session", () => {
    const st = state();
    const t = { v: 1000 };
    st.now = () => t.v;
    const a = rewriteSpinner("✻Churned for 1s\r", st);
    t.v = 1200; // same session (gap < 700ms)
    const b = rewriteSpinner("✻Churned for 2s\r", st);
    const pick = (s: string) => s.includes("Apollo") ? "Apollo" : "Second";
    expect(pick(a)).toBe(pick(b));
  });

  it("rotates to a new curiosity on a new thinking session", () => {
    const st = state();
    const t = { v: 1000 };
    st.now = () => t.v;
    rewriteSpinner("✻Churned for 1s\r", st);
    const first = st.current;
    t.v = 5000; // big gap → new session
    rewriteSpinner("✻Churned for 1s\r", st);
    expect(st.current).not.toBe(first);
  });

  it("truncates to one line within columns", () => {
    const st = state({
      cols: 30,
      pool: ["x".repeat(200) + " — @aside"],
    });
    const out = rewriteSpinner("✻Churned for 1s\r", st);
    // strip the glyph + trailing clear-seq, measure the visible text line
    const line = out.replace("\x1b[K", "").replace(/\r/g, "");
    expect(line.length).toBeLessThanOrEqual(31);
  });
});
