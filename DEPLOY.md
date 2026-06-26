# Deploying Aside (apps/web) to Vercel

The web app is a Next.js 14 app inside an npm-workspaces monorepo. `apps/web`
imports `@aside/shared` (type-only), which must be built before `next build`.

## What is already done

- **Vercel project:** `aside` (scope `melissas-projects-6a8130ee`), linked to this
  repo root. The project was deployed to **production**.
- **Production URL:** `https://aside-melissas-projects-6a8130ee.vercel.app`
  (stable, auto-points to the latest production deployment).
- **Monorepo build:** handled by `vercel.json` at the repo root:
  ```json
  {
    "framework": "nextjs",
    "installCommand": "npm install",
    "buildCommand": "npm run build -w @aside/shared && npm run build -w @aside/web",
    "outputDirectory": "apps/web/.next"
  }
  ```
  Deploy from the repo root (not from `apps/web`) so the workspace resolves.
- **Production env vars** (set via `vercel env add ... production`):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (secret, server-only — never exposed to the client)
  - `NEXT_PUBLIC_BASE_URL = https://aside-melissas-projects-6a8130ee.vercel.app`

## Redeploying

```bash
# from the repo root
npx vercel --prod --yes
```

## REMAINING MANUAL STEP — disable Vercel Authentication (only the owner can do this)

The project currently has **Deployment Protection → Vercel Authentication (SSO)**
turned ON (the Vercel default for new projects). While it is on, every request to
the production domain — including `GET /api/curiosities` that the installed CLI
calls — is redirected (HTTP 302) to Vercel SSO and is **not publicly reachable**.

Attempting to disable it programmatically was blocked by the safety classifier
(it loosens access controls), so this is left for the owner to do:

1. Vercel Dashboard → project **aside** → **Settings** → **Deployment
   Protection**.
2. Set **Vercel Authentication** to **Disabled** (for Production), and Save.

After that, the public checks below will pass without an authenticated browser
session:

```bash
PROD=https://aside-melissas-projects-6a8130ee.vercel.app
curl -s "$PROD/api/curiosities?os=darwin&install_id=$(uuidgen | tr 'A-F' 'a-f')"
```

> Verified while SSO was still on, using the owner's authenticated browser
> session: `/`, `/about`, `/sponsor` render; `GET /api/curiosities` returns 200
> with 20 curiosities (2 sponsored) from Postgres; and a test lead submitted via
> `/sponsor` was written to the `sponsor_leads` table. The only thing the SSO
> gate blocks is *anonymous* (curl / installed-CLI) access.

## Database

Migrations live in `supabase/migrations/` and are applied to the live Supabase
project (ref `sefzcblhyzufkesbuvzg`). `0003_sponsor_leads.sql` (the advertiser
lead table, RLS on, no permissive policy) is applied.
