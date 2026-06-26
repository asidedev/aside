import { randomUUID } from "node:crypto";

/**
 * Self-contained click token (item 1 fix). The token CARRIES the curiosity_id
 * (and install_id) so the redirect endpoint can resolve the destination
 * WITHOUT depending on the "shown" event having synced first. It is not signed:
 * the client is open-source and cannot hold a server secret, and click counts
 * are explicitly best-effort / not fraud-resistant (Section 5.3 limitation).
 *
 * Format: base64url(`${curiosityId}~${installId}~${nonce}`)
 * The nonce (uuid v4, 122 bits) gives per-shown uniqueness for idempotency.
 */
export function makeClickToken(curiosityId: string, installId: string): string {
  const nonce = randomUUID();
  const payload = `${curiosityId}~${installId}~${nonce}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}
