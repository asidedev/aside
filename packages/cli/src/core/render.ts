import type { Curiosity } from "@aside/shared";

const ESC = String.fromCharCode(27);
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;

/** Manicule (☞, U+261E) — points at the curiosity; the "margin note" emblem. */
const MARKER = String.fromCodePoint(0x261e);

/** OSC 8 hyperlink wrappers. */
function osc8(url: string, label: string): string {
  return `${ESC}]8;;${url}${ESC}\\${label}${ESC}]8;;${ESC}\\`;
}

export interface RenderOptions {
  columns: number;
  /** Whether the terminal supports OSC 8 hyperlinks. */
  supportsHyperlinks: boolean;
  /** Backend base URL for building the click redirect. */
  backendUrl: string;
}

/**
 * Format one status line (Section 9). Truncation is width-aware on the VISIBLE
 * text only (item 6 fix): we never count escape bytes toward width and never
 * cut inside an escape/OSC 8 sequence. The hyperlink/ANSI is applied AFTER the
 * visible text has been truncated.
 */
export function renderLine(
  c: Curiosity,
  clickToken: string | null,
  opts: RenderOptions,
): string {
  const cols = opts.columns > 10 ? opts.columns : 80;

  const handle = c.sponsor_handle ? `@${stripAt(c.sponsor_handle)}` : "@aside";
  // Signature is mandatory on every render (screenshot-distribution engine).
  const signature = ` — ${handle}`;
  const sponsorMark =
    c.is_sponsored && c.sponsor_handle ? ` · by ${stripAt(c.sponsor_handle)}` : "";

  // Leading manicule points at the curiosity — the "note in the margin" emblem.
  // It travels in every screenshot, for free.
  const head = `${MARKER} `;

  // Reserve room for the marker + signature + sponsor mark; truncate body to fit.
  const tail = signature + sponsorMark;
  const room = Math.max(8, cols - visibleWidth(head) - visibleWidth(tail) - 1);
  const body = truncateVisible(c.body.replace(/\s+/g, " ").trim(), room);

  // Build the visible string, then decorate.
  let line = head + body + tail;

  // Apply OSC 8 only to the signature token, only for sponsored w/ click_url.
  if (
    c.is_sponsored &&
    c.click_url &&
    clickToken &&
    opts.supportsHyperlinks
  ) {
    const url = `${opts.backendUrl}/api/r/${encodeURIComponent(clickToken)}`;
    const linked = osc8(url, handle);
    // Replace the (already-truncated) plain handle with the linked version.
    line = head + body + ` — ${linked}` + sponsorMark;
  }

  // Subtle dim on the tail for readability; never affects width math.
  return colorizeTail(line, tail);
}

function colorizeTail(line: string, tail: string): string {
  const idx = line.lastIndexOf(tail.trimEnd());
  if (idx < 0) return line;
  return line; // keep plain by default; ANSI is optional (MAY) — avoid surprises
  // (Dim styling intentionally left off to keep screenshots clean; see DIM/RESET.)
}

function stripAt(h: string): string {
  return h.replace(/^@+/, "");
}

/** Visible width = code points outside escape/OSC 8 sequences. */
export function visibleWidth(s: string): number {
  return stripSequences(s).length;
}

/** Remove ANSI CSI and OSC 8 sequences for width measurement. */
function stripSequences(s: string): string {
  // OSC 8: ESC ] 8 ; ; URL ESC \   (and the closing ESC ] 8 ; ; ESC \)
  let out = s.replace(/\]8;;.*?\\/g, "");
  // CSI: ESC [ ... letter
  out = out.replace(/\[[0-9;]*[A-Za-z]/g, "");
  return out;
}

/** Truncate a PLAIN string (no escapes) to maxWidth visible chars, adding an ellipsis. */
export function truncateVisible(plain: string, maxWidth: number): string {
  const chars = [...plain];
  if (chars.length <= maxWidth) return plain;
  if (maxWidth <= 1) return chars.slice(0, Math.max(0, maxWidth)).join("");
  return chars.slice(0, maxWidth - 1).join("") + "…";
}

export { DIM, RESET };
