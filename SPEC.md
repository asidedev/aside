# Aside — Specification (summary)

This MVP implements the RFC-2119 status-line content specification (draft v1,
language-agnostic) with the following **v4 correctness fixes** folded in:

1. **Self-contained click token.** The token carries `curiosity_id` + `install_id`
   + nonce (base64url), so `/api/r/[token]` resolves the destination without
   depending on the `shown` event having synced first. Not signed — click counts
   are best-effort (see Privacy §). Code: `packages/cli/src/core/token.ts`,
   `apps/web/lib/token.ts`.
2. **Race-free queue flush.** `takeBatch()` rotates `queue.jsonl` out of the way
   (rename) before the network POST, so concurrent appends are never clobbered;
   a leftover `.sending` batch is merged for at-least-once delivery. Code:
   `packages/cli/src/core/queue.ts`.
3. **Locked state writes.** Multi-session concurrent `aside status` processes
   serialize their read-modify-write of `state.json` via an advisory lock with
   stale-breaking and a short timeout (never blocks the render). Code:
   `packages/cli/src/core/lock.ts`.
4. **Full cache snapshot.** Sync replaces the cache with a full snapshot instead
   of an incremental delta, so the pool never shrinks. Code:
   `packages/cli/src/core/syncCore.ts`.
5. **Pin TTL + GC.** Pins expire after `SLOT_TTL_MS` (rotation in long sessions)
   and are garbage-collected after `PIN_GC_MS` so the `pins` map cannot grow
   unbounded. Code: `packages/cli/src/core/state.ts`.
6. **OSC-8-aware truncation.** Width is measured on visible text only; the
   hyperlink is applied after truncation, never cut mid-sequence. Code:
   `packages/cli/src/core/render.ts`.

Additional hardening: the impressions endpoint rejects `clicked` from the client
(server-only), strict request-shape validation, schema-versioned on-disk files,
and an honest privacy disclosure (`install_id` is pseudonymous; impression/click
counts are not fraud-resistant).

## Conformance map (where each section lives)

| Spec section            | Implementation |
|-------------------------|----------------|
| 5 Privacy / allowlist   | `cli/src/core/stdin.ts`, `commands/about.ts` |
| 6 Settings integration  | `cli/src/commands/install.ts`, `uninstall.ts` |
| 7 Status render path    | `cli/src/commands/status.ts` |
| 8 Rotation              | `cli/src/core/rotation.ts` |
| 9 Rendering             | `cli/src/core/render.ts` |
| 10 Backend API          | `apps/web/app/api/*` |
| 11 Data model           | `supabase/migrations/0001_init.sql` |
| 12 Sync + queue         | `cli/src/core/syncCore.ts`, `queue.ts` |
| 16 Tests                | `cli/src/**/*.test.ts` |
