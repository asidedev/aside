"use client";

import { useState } from "react";

const INSTALL = "npm i -g @asidedev/cli && aside install";

/**
 * Copyable install one-liner. Uses the clipboard API only on click — no
 * browser storage (localStorage/cookies) is ever touched.
 */
export function CopyButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(INSTALL);
    } catch {
      /* clipboard unavailable — non-fatal */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="code-line">
      <code>
        <span className="prompt">$ </span>
        {INSTALL}
      </code>
      <button
        type="button"
        className={"copy-btn" + (copied ? " copied" : "")}
        onClick={copy}
        aria-label="Copy install command"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
