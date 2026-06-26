/**
 * Decode the self-contained click token produced by the client (item 1).
 * Format: base64url(`${curiosityId}~${installId}~${nonce}`).
 * Not signed — see Section 5.3 (click counts are best-effort, not fraud-proof).
 */
export interface DecodedToken {
  curiosityId: string;
  installId: string;
  nonce: string;
}

export function decodeClickToken(token: string): DecodedToken | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("~");
    if (parts.length !== 3) return null;
    const [curiosityId, installId, nonce] = parts;
    if (!curiosityId || !installId || !nonce) return null;
    return { curiosityId, installId, nonce };
  } catch {
    return null;
  }
}
