import { describe, it, expect } from "vitest";
import { allowlist } from "./stdin.js";

describe("stdin allowlist (privacy core)", () => {
  const hostile = {
    session_id: "sess-123",
    model: { id: "claude-opus-4-8", display_name: "Opus" },
    cwd: "/Users/melissa/secret-project",
    workspace: {
      current_dir: "/Users/melissa/secret-project",
      project_dir: "/Users/melissa/secret-project",
      repo: { host: "github.com", owner: "melissa", name: "secret" },
    },
    worktree: { path: "/Users/melissa/wt", branch: "main" },
    pr: { url: "https://github.com/melissa/secret/pull/42", number: 42 },
    transcript_path: "/Users/melissa/.claude/transcripts/abc.jsonl",
    cost: { total_cost_usd: 1.23 },
    context_window: { used_percentage: 50 },
  };

  it("extracts only session_id and model.display_name", () => {
    const out = allowlist(hostile);
    expect(out).toEqual({
      session_id: "sess-123",
      model_display_name: "Opus",
    });
  });

  it("never carries any path/repo/pr/transcript field", () => {
    const out = allowlist(hostile) as Record<string, unknown>;
    const serialized = JSON.stringify(out);
    for (const leak of [
      "secret-project",
      "github.com",
      "pull/42",
      "transcripts",
      "total_cost",
      "used_percentage",
      "/Users/melissa",
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });

  it("tolerates null / partial / non-object input", () => {
    expect(allowlist(null)).toEqual({ session_id: null });
    expect(allowlist(undefined)).toEqual({ session_id: null });
    expect(allowlist(42)).toEqual({ session_id: null });
    expect(allowlist({})).toEqual({ session_id: null, model_display_name: null });
    expect(allowlist({ session_id: "" })).toEqual({
      session_id: null,
      model_display_name: null,
    });
  });
});
