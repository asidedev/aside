import { describe, it, expect } from "vitest";
import { renderLine, visibleWidth, truncateVisible } from "./render.js";
import type { Curiosity } from "@aside/shared";

const ESC = String.fromCharCode(27);

function cur(partial: Partial<Curiosity>): Curiosity {
  return {
    id: "x",
    body: "git reflog mostra commits que você achou que perdeu",
    topic: "git-history",
    difficulty: "mid",
    is_sponsored: false,
    sponsor_id: null,
    sponsor_handle: null,
    click_url: null,
    status: "live",
    ...partial,
  };
}

describe("render", () => {
  const baseOpts = {
    columns: 80,
    supportsHyperlinks: false,
    backendUrl: "https://aside.dev",
  };

  it("includes the mandatory signature", () => {
    const line = renderLine(cur({}), null, baseOpts);
    expect(line).toContain("@aside");
  });

  it("keeps total visible width within columns", () => {
    const long = "x".repeat(500);
    const line = renderLine(cur({ body: long }), null, { ...baseOpts, columns: 40 });
    expect(visibleWidth(line)).toBeLessThanOrEqual(40);
  });

  it("wraps the handle in OSC 8 for sponsored + click_url when supported", () => {
    const c = cur({
      is_sponsored: true,
      sponsor_handle: "vercel",
      click_url: "https://vercel.com",
    });
    const line = renderLine(c, "tok123", { ...baseOpts, supportsHyperlinks: true });
    expect(line).toContain(`${ESC}]8;;`); // OSC 8 opener
    expect(line).toContain("/api/r/tok123");
  });

  it("degrades to plain text without OSC 8 support", () => {
    const c = cur({
      is_sponsored: true,
      sponsor_handle: "vercel",
      click_url: "https://vercel.com",
    });
    const line = renderLine(c, "tok123", { ...baseOpts, supportsHyperlinks: false });
    expect(line).not.toContain(`${ESC}]8;;`);
    expect(line).toContain("@vercel");
  });

  it("visibleWidth ignores escape sequences", () => {
    const withLink = `hello${ESC}]8;;https://x.com${ESC}\\@h${ESC}]8;;${ESC}\\`;
    expect(visibleWidth(withLink)).toBe("hello@h".length);
  });

  it("truncateVisible adds an ellipsis", () => {
    expect(truncateVisible("abcdef", 4)).toBe("abc…");
    expect(truncateVisible("abc", 10)).toBe("abc");
  });
});
