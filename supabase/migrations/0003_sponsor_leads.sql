-- Aside sponsor leads (advertiser applications from /sponsor).
-- These are inbound leads, NOT live billing. Only the service role writes them;
-- the public client never reaches Postgres directly.

create extension if not exists "pgcrypto";

create table if not exists sponsor_leads (
  id               uuid primary key default gen_random_uuid(),
  company          text,
  email            text not null,
  destination_url  text,
  ad_copy          text,
  budget           text,
  geo              text,
  message          text,
  created_at       timestamptz not null default now(),
  status           text not null default 'new'
);

create index if not exists sponsor_leads_created_idx on sponsor_leads (created_at);

-- RLS on, no permissive policy: anon/auth roles cannot read or write.
-- The API uses the service role, which bypasses RLS (same model as the
-- other tables in 0001_init.sql).
alter table sponsor_leads enable row level security;
