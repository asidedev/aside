# Aside

Developer microcuriosities in the Claude Code status line, shown while the
assistant is working. Local-first, open source, privacy-preserving, with native
(minority) sponsorship.

> Status: MVP. Implements the spec in `SPEC.md` plus the v4 correctness fixes
> (self-contained click token, race-free queue flush, locked state writes, full
> cache snapshots, pin TTL/GC, OSC-8-aware truncation).

## Monorepo layout

```
packages/shared   shared TypeScript types
packages/cli      the `aside` CLI (status/install/uninstall/about/sync)
apps/web          Next.js backend + landing + /about
supabase/         Postgres schema + seed (ordered migrations)
```

## Quick start (development)

```bash
npm install                 # installs all workspaces
npm run build               # builds shared + cli
npm test                    # runs CLI unit tests (privacy, rotation, render)
```

### Try the CLI locally (no backend needed)

The CLI ships with no content until a sync runs, but you can point it at a local
backend and exercise the render path:

```bash
# terminal A — run the web backend (serves seed data without a DB)
npm run dev:web

# terminal B — drive the status command as Claude Code would
export ASIDE_BACKEND_URL=http://localhost:3000
export ASIDE_HOME=/tmp/aside-demo
node packages/cli/dist/index.js sync          # fill the cache from seed feed
echo '{"session_id":"s1","model":{"display_name":"Opus"}}' \
  | node packages/cli/dist/index.js status    # prints a curiosity
node packages/cli/dist/index.js about         # transparency disclosure
```

## Install into Claude Code

```bash
npm i -g @aside/cli
aside install        # non-destructive merge into ~/.claude/settings.json
aside about          # see exactly what is read/sent
aside uninstall      # clean removal
```

`install` writes an **absolute** status-line command (never `npx`, to avoid
per-render cold start) and never overwrites a non-Aside status line without
`--force`.

## Backend / Supabase

1. Create a Supabase project.
2. Apply migrations in order:
   ```bash
   # via the Supabase SQL editor or the CLI
   supabase db push      # or paste supabase/migrations/*.sql in order
   ```
3. Configure the web app:
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   # set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   ```
4. Deploy `apps/web` (e.g. Vercel) and set `ASIDE_BACKEND_URL` for clients.

Without Supabase env vars, the API serves seed content and logs impressions to
the console — handy for local UI testing.

## Privacy contract

See `apps/web/app/about` and `aside about`. In short: the host tool hands the
status-line command a JSON blob that includes paths; the client extracts only
`session_id` and `model.display_name` and discards everything else. It never
reads code/prompts/files/paths, never opens the transcript, and never makes a
foreground network request.

## License

MIT
