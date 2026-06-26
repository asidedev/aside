// Applies the English curiosities (90 real + 10 Aside-sponsored) to the live
// Supabase. Reads credentials from apps/web/.env.local. NEVER prints the key.
//
//   node scripts/apply-seed.mjs
//
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Load env from apps/web/.env.local without echoing values.
function loadEnv() {
  const raw = readFileSync(join(root, "apps/web/.env.local"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

// Resolve @supabase/supabase-js from the web workspace.
const require = createRequire(join(root, "apps/web/package.json"));
const { createClient } = require("@supabase/supabase-js");
const db = createClient(url, key, { auth: { persistSession: false } });

const data = JSON.parse(readFileSync(join(here, "curiosities.en.json"), "utf8"));
const SITE = data.site.replace(/\/+$/, "");

async function main() {
  // 1. Clear prior content (test data only). Order respects FKs; cascades cover the rest.
  for (const table of ["impressions", "curiosities", "campaigns", "sponsors"]) {
    const { error } = await db.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`clear ${table}: ${error.message}`);
  }

  // 2. Aside as the initial sponsor + a live campaign.
  const { data: sp, error: spErr } = await db
    .from("sponsors")
    .insert({ name: data.sponsor.name, handle: data.sponsor.handle })
    .select("id")
    .single();
  if (spErr) throw new Error(`sponsor: ${spErr.message}`);
  const sponsorId = sp.id;

  const { error: campErr } = await db.from("campaigns").insert({
    sponsor_id: sponsorId,
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    status: "live",
  });
  if (campErr) throw new Error(`campaign: ${campErr.message}`);

  // 3. Build rows.
  const rows = [];
  for (const c of data.curiosities) {
    rows.push({
      body: c.body,
      topic: c.topic,
      difficulty: c.difficulty,
      is_sponsored: false,
      sponsor_id: null,
      status: "live",
      click_url: null,
      source_note: "seed-en",
    });
  }
  for (const s of data.sponsored) {
    rows.push({
      body: s.body,
      topic: "sponsor",
      difficulty: "easy",
      is_sponsored: true,
      sponsor_id: sponsorId,
      status: "live",
      click_url: SITE + (s.path || "/"),
      source_note: "aside-house-ad",
    });
  }

  // 4. Insert in chunks.
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await db.from("curiosities").insert(chunk);
    if (error) throw new Error(`insert curiosities [${i}]: ${error.message}`);
  }

  // 5. Verify counts (no secrets printed).
  const counts = {};
  for (const [label, q] of [
    ["live_total", db.from("curiosities").select("id", { count: "exact", head: true }).eq("status", "live")],
    ["sponsored", db.from("curiosities").select("id", { count: "exact", head: true }).eq("is_sponsored", true)],
    ["sponsors", db.from("sponsors").select("id", { count: "exact", head: true })],
    ["live_campaigns", db.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "live")],
  ]) {
    const { count, error } = await q;
    if (error) throw new Error(`count ${label}: ${error.message}`);
    counts[label] = count;
  }
  console.log("Applied. Counts:", JSON.stringify(counts));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
