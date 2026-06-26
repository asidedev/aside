import { readFileSync } from "node:fs";
import type { StatusInput } from "@aside/shared";

/**
 * Read the host tool's stdin JSON and extract ONLY the allowlisted fields
 * (Section 5.1 — receive-but-discard). Everything else (cwd, workspace.*,
 * worktree.*, repo.*, pr.*, transcript_path, cost.*, context_window.*, env)
 * is read into memory transiently and never returned, persisted, or sent.
 *
 * MUST tolerate absent / null / partial / malformed JSON without crashing.
 */
export function readStatusInput(): StatusInput {
  let raw = "";
  try {
    // fd 0 = stdin. Synchronous, non-blocking-friendly read.
    raw = readFileSync(0, "utf8");
  } catch {
    return { session_id: null };
  }

  if (!raw.trim()) return { session_id: null };

  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { session_id: null };
  }

  return allowlist(obj);
}

/** Pure allowlist extractor — exported for tests. */
export function allowlist(obj: unknown): StatusInput {
  if (!obj || typeof obj !== "object") return { session_id: null };
  const o = obj as Record<string, unknown>;

  const session_id =
    typeof o.session_id === "string" && o.session_id.length > 0
      ? o.session_id
      : null;

  let model_display_name: string | null = null;
  const model = o.model;
  if (model && typeof model === "object") {
    const dn = (model as Record<string, unknown>).display_name;
    if (typeof dn === "string") model_display_name = dn;
  }

  // Note: we deliberately construct a fresh object containing ONLY these two
  // fields. No path, repo, pr, transcript, cost, or context field is copied.
  return { session_id, model_display_name };
}
