import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const AD_MIN = 3;
const AD_MAX = 60;

const ALLOWED_KEYS = [
  "company",
  "email",
  "destination_url",
  "ad_copy",
  "budget",
  "geo",
  "message",
] as const;

interface SponsorLead {
  company: string | null;
  email: string;
  destination_url: string | null;
  ad_copy: string | null;
  budget: string | null;
  geo: string | null;
  message: string | null;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isHttps(s: string): boolean {
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
}
/** Optional string field: must be string|null|undefined, capped at `max`. */
function optStr(
  v: unknown,
  max: number,
): { ok: true; value: string | null } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "string") return { ok: false };
  const t = v.trim();
  if (t.length === 0) return { ok: true, value: null };
  if (t.length > max) return { ok: false };
  return { ok: true, value: t };
}

function validate(
  body: unknown,
): { ok: true; lead: SponsorLead } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid_shape" };
  }
  const b = body as Record<string, unknown>;

  // Reject any field outside the allowed shape.
  for (const k of Object.keys(b)) {
    if (!(ALLOWED_KEYS as readonly string[]).includes(k)) {
      return { ok: false, error: "unexpected_field" };
    }
  }

  // email — required + valid.
  if (typeof b.email !== "string" || !isEmail(b.email.trim())) {
    return { ok: false, error: "invalid_email" };
  }
  const email = b.email.trim();
  if (email.length > 320) return { ok: false, error: "invalid_email" };

  // destination_url — optional, https only.
  const du = optStr(b.destination_url, 2048);
  if (!du.ok) return { ok: false, error: "invalid_destination_url" };
  if (du.value !== null && !isHttps(du.value)) {
    return { ok: false, error: "invalid_destination_url" };
  }

  // ad_copy — optional, but if present must be 3–60 chars.
  const ac = optStr(b.ad_copy, AD_MAX);
  if (!ac.ok) return { ok: false, error: "invalid_ad_copy" };
  if (ac.value !== null && ac.value.length < AD_MIN) {
    return { ok: false, error: "invalid_ad_copy" };
  }

  const company = optStr(b.company, 200);
  if (!company.ok) return { ok: false, error: "invalid_company" };
  const budget = optStr(b.budget, 100);
  if (!budget.ok) return { ok: false, error: "invalid_budget" };
  const geo = optStr(b.geo, 200);
  if (!geo.ok) return { ok: false, error: "invalid_geo" };
  const message = optStr(b.message, 4000);
  if (!message.ok) return { ok: false, error: "invalid_message" };

  return {
    ok: true,
    lead: {
      company: company.value,
      email,
      destination_url: du.value,
      ad_copy: ac.value,
      budget: budget.value,
      geo: geo.value,
      message: message.value,
    },
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const parsed = validate(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // No DB configured → dev mode: log (without exposing anything sensitive)
    // and acknowledge so the UI flow can be exercised locally.
    console.log(
      `[sponsor-leads] (no-db) lead from ${parsed.lead.email} (company=${
        parsed.lead.company ?? "—"
      })`,
    );
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("sponsor_leads").insert({
    company: parsed.lead.company,
    email: parsed.lead.email,
    destination_url: parsed.lead.destination_url,
    ad_copy: parsed.lead.ad_copy,
    budget: parsed.lead.budget,
    geo: parsed.lead.geo,
    message: parsed.lead.message,
  });

  if (error) {
    console.error("[sponsor-leads] write_failed", JSON.stringify(error));
    return NextResponse.json({ error: "write_failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
