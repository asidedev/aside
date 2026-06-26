# Aside — VS Code extension

Shows a short developer curiosity in the VS Code **status bar** while Claude Code
is thinking. It detects "thinking" by watching the integrated terminal's output
for Claude's working spinner (read-only — it never modifies the terminal, so
there's no garbling), and updates the status bar, which the extension fully
controls.

If the terminal-data API isn't available, it falls back to rotating the
curiosity on a gentle idle timer so the status bar still feels alive.

## Run it (development)

```bash
# from the repo root
npm install
npm run compile -w aside-vscode
```

Then in VS Code:

1. Open the `apps/vscode` folder in VS Code.
2. Press **F5** ("Run Extension") — this opens an Extension Development Host
   window with the extension loaded (and the proposed terminal API enabled).
3. In that window, open the integrated terminal and run `claude` (or
   `aside wrap` / anything that shows a working spinner).
4. Send a prompt. While the AI thinks, the **bottom-right status bar** shows:
   `✦ Apollo 11 landed with ~4 KB of RAM — @aside`, changing each new prompt.

Click the status bar item to open a sponsored link (or cycle to the next
curiosity). Commands: **Aside: Show next curiosity**, **Aside: Enable/disable**.

## Settings

- `aside.backendUrl` — where to fetch curiosities (defaults to the hosted backend;
  falls back to a bundled set when offline / unreachable).
- `aside.enabled` — show/hide the status bar item.
- `aside.idleRotateSeconds` — rotation cadence when thinking can't be detected.

## Notes / honesty

- **Thinking detection** uses the proposed `terminalDataWriteEvent` API. That
  works in F5/dev and with `--enable-proposed-api aside.aside-vscode`, but the
  VS Code Marketplace does not allow proposed APIs — so a marketplace build would
  ship with idle-timer rotation only (no precise thinking sync) until the API is
  stabilized. For personal/dev use, F5 gives the full experience.
## Privacy (the exact contract)

- **By default, Aside reads nothing from your terminal.** It rotates the
  curiosity on a timer. Terminal access is **opt-in** via
  `aside.detectThinkingFromTerminal`.
- **When you turn it on**, the extension receives each integrated-terminal write
  and does exactly one thing with it: runs a single regex test for Claude's
  spinner time-marker (`(Ns …)` / `for Ns`) and keeps only the resulting
  yes/no. The terminal string is **never** stored, copied, logged, buffered, or
  transmitted — it is dropped the moment the test returns. (See
  `looksLikeThinking` in `src/extension.ts` — it takes a string and returns a
  boolean, nothing else.)
- The **only** network request the extension makes is fetching the public
  curiosity feed (no terminal data, no identifiers).
- No telemetry, no `localStorage`/web storage.
