import { describe, it, expect } from "vitest";
import { pointsToAside } from "./install.js";

describe("pointsToAside", () => {
  it("recognizes a aside status command", () => {
    expect(pointsToAside('"/usr/bin/node" "/x/aside/dist/index.js" status')).toBe(true);
    expect(pointsToAside("npx aside status")).toBe(true);
  });

  it("does not claim a foreign status line", () => {
    expect(pointsToAside("~/.claude/statusline.sh")).toBe(false);
    expect(pointsToAside("starship prompt")).toBe(false);
    expect(pointsToAside(undefined)).toBe(false);
  });
});
