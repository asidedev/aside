# Supabase setup

> **Status: a live Supabase project is now provisioned and wired up.** A project
> named `aside` (ref `sefzcblhyzufkesbuvzg`, region us-east-2) was created in
> the user's org, both migrations were applied, and `apps/web/.env.local` holds
> the real `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (gitignored, never
> committed). The API was verified end-to-end against this DB (feed from
> Postgres, install upsert, shown/clicked persistence + idempotency).
>
> The steps below are kept for reference / re-provisioning from scratch.

The Aside backend also runs **without** a database: when `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` are unset, the API serves the seed content from
`apps/web/lib/seed.ts` and logs impressions to the console
(`[impressions] (no-db) ...`). This is enough for local UI/CLI testing.

Do **not** commit real keys — `.env.local` is gitignored.

## 1. Create a project

1. Sign in at https://supabase.com/dashboard.
2. **New project** → pick an org, name it (e.g. `aside`), set a strong DB
   password, choose a region. Wait for it to finish provisioning.

## 2. Apply the migrations IN ORDER

The order matters: `0001_init.sql` creates the schema (sponsors first, then the
FK-dependent tables, indexes, and RLS), and `0002_seed.sql` inserts seed rows
(it is a no-op if `curiosities` already has rows).

### Option A — Dashboard SQL editor (no CLI needed)
1. Dashboard → **SQL Editor** → **New query**.
2. Paste the full contents of `supabase/migrations/0001_init.sql`, run it.
3. New query → paste `supabase/migrations/0002_seed.sql`, run it.

### Option B — Supabase CLI
```bash
brew install supabase/tap/supabase     # or see https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                       # applies supabase/migrations/*.sql in order
```

### Option C — psql
```bash
# Connection string: Dashboard → Project Settings → Database → Connection string (URI)
psql "<connection-string>" -f supabase/migrations/0001_init.sql
psql "<connection-string>" -f supabase/migrations/0002_seed.sql
```

## 3. Configure the web app

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Fill `apps/web/.env.local`:

- `SUPABASE_URL` — Dashboard → **Project Settings → API → Project URL**
  (e.g. `https://abcdefgh.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY` — Dashboard → **Project Settings → API →
  Project API keys → `service_role` (secret)**. This bypasses RLS and is used
  **only** server-side in the API routes. Never expose it to the browser.
- `NEXT_PUBLIC_BASE_URL` — public URL of the deployment (used for the redirect
  landing fallback); for local dev `http://localhost:3100` (or your port).

## 4. Verify against the DB

Restart the web server so it picks up `.env.local`, then re-run the section-1
checks. With a DB configured you should observe:

```bash
# feed now comes from the DB (still ~8 live, 2 sponsored gated by live campaigns)
curl -s "http://localhost:3100/api/curiosities?install_id=<uuid>&os=darwin&cli_version=0.1.0"

# impressions persist (no more "[impressions] (no-db)" log line)
curl -s -X POST http://localhost:3100/api/impressions -H 'content-type: application/json' \
  -d '{"install_id":"<uuid>","events":[{"curiosity_id":"<live-curiosity-uuid>","is_sponsored":false,"event":"shown","client_event_id":"<uuid>"}]}'
```

Note: with a real DB, `install_id` and `curiosity_id` must be **real UUIDs that
exist** in the `installs` / `curiosities` tables (FK constraints). The `GET
/api/curiosities` call upserts the install first; use a `curiosity_id` returned
by that feed. The seed migration generates random UUIDs, so the IDs will NOT
match the hardcoded `11111111-...` placeholders used in seed-mode testing.

### Idempotency checks
- **Impressions:** re-POST the exact same batch (same `client_event_id`). The
  unique index `impressions_client_event_uidx` makes the upsert
  (`onConflict: client_event_id, ignoreDuplicates`) a no-op — no duplicate row.
- **Clicks:** open `GET /api/r/<token>` twice with the same token. The unique
  partial index `impressions_click_clicked_uidx` (on `click_token where event =
  'clicked'`) means only the first insert lands; the second conflicts and is
  ignored, and both still 302 to the destination.
