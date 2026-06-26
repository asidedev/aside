-- Aside initial schema (Section 11).
-- Ordered single migration: sponsors first (FK targets), then the rest.

create extension if not exists "pgcrypto";

-- ── sponsors ────────────────────────────────────────────────────────────────
create table if not exists sponsors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  handle      text,
  created_at  timestamptz not null default now()
);

-- ── curiosities ──────────────────────────────────────────────────────────────
create table if not exists curiosities (
  id            uuid primary key default gen_random_uuid(),
  body          text not null,
  topic         text not null,
  difficulty    text not null default 'mid' check (difficulty in ('easy','mid','deep')),
  is_sponsored  boolean not null default false,
  sponsor_id    uuid references sponsors(id) on delete set null,
  status        text not null default 'draft' check (status in ('draft','approved','live','retired')),
  click_url     text,
  source_note   text,
  created_at    timestamptz not null default now()
);
create index if not exists curiosities_live_idx on curiosities (status) where status = 'live';

-- ── campaigns ────────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid references sponsors(id) on delete cascade,
  starts_at   timestamptz,
  ends_at     timestamptz,
  status      text not null default 'draft' check (status in ('draft','live','ended')),
  created_at  timestamptz not null default now()
);
create index if not exists campaigns_live_idx on campaigns (status, starts_at, ends_at);

-- ── installs (anonymous) ─────────────────────────────────────────────────────
create table if not exists installs (
  id          uuid primary key,            -- generated client-side
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  cli_version text,
  os          text check (os in ('darwin','linux','win32'))
);

-- ── impressions (privacy-preserving) ─────────────────────────────────────────
create table if not exists impressions (
  id               bigserial primary key,
  install_id       uuid references installs(id) on delete cascade,
  curiosity_id     uuid references curiosities(id) on delete cascade,
  is_sponsored     boolean,
  event            text not null check (event in ('shown','clicked')),
  click_token      text,
  -- item: client-generated id for at-least-once idempotency on retry.
  client_event_id  uuid,
  at               timestamptz not null default now()
);
create index if not exists impressions_install_idx on impressions (install_id, at);
-- A given client event lands at most once even if the client retries the batch.
-- NOTE: this index is NON-partial on purpose. The impressions API upserts with
-- ON CONFLICT (client_event_id), and Postgres cannot infer a *partial* unique
-- index for ON CONFLICT. A plain unique index still allows the many NULL
-- client_event_id rows (clicked events) because NULLs are distinct in a unique
-- index, while enforcing uniqueness on every non-NULL value.
create unique index if not exists impressions_client_event_uidx
  on impressions (client_event_id);
-- A given click token records at most one 'clicked' (redirect idempotency).
create unique index if not exists impressions_click_clicked_uidx
  on impressions (click_token) where event = 'clicked' and click_token is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- The client NEVER talks to Postgres directly; only the API (service role) writes.
-- Enable RLS with no permissive policies so anon/auth roles cannot read/write;
-- the service role bypasses RLS.
alter table sponsors     enable row level security;
alter table curiosities  enable row level security;
alter table campaigns    enable row level security;
alter table installs     enable row level security;
alter table impressions  enable row level security;
