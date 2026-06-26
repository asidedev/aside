import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface InEvent {
  curiosity_id: string;
  is_sponsored: boolean;
  event: string;
  click_token?: string | null;
  client_event_id?: string | null;
}

function isUuidish(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-fA-F-]{8,64}$/.test(s);
}

/** Strict validator: rejects any field outside the allowed shape (Section 10.2). */
function validate(body: unknown): { install_id: string; events: InEvent[] } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!isUuidish(b.install_id)) return null;
  if (!Array.isArray(b.events) || b.events.length === 0 || b.events.length > 500) {
    return null;
  }

  const events: InEvent[] = [];
  for (const raw of b.events) {
    if (!raw || typeof raw !== "object") return null;
    const e = raw as Record<string, unknown>;
    // The client only ever emits "shown"; "clicked" is server-recorded via the
    // redirect endpoint, so reject it here (closes a spoof vector).
    if (e.event !== "shown") return null;
    if (!isUuidish(e.curiosity_id)) return null;
    if (typeof e.is_sponsored !== "boolean") return null;
    if (
      e.click_token !== undefined &&
      e.click_token !== null &&
      typeof e.click_token !== "string"
    ) {
      return null;
    }
    if (
      e.client_event_id !== undefined &&
      e.client_event_id !== null &&
      !isUuidish(e.client_event_id)
    ) {
      return null;
    }
    // Reject any unexpected extra keys.
    for (const k of Object.keys(e)) {
      if (
        ![
          "curiosity_id",
          "is_sponsored",
          "event",
          "click_token",
          "client_event_id",
        ].includes(k)
      ) {
        return null;
      }
    }
    events.push({
      curiosity_id: e.curiosity_id as string,
      is_sponsored: e.is_sponsored as boolean,
      event: "shown",
      click_token: (e.click_token as string | undefined) ?? null,
      client_event_id: (e.client_event_id as string | undefined) ?? null,
    });
  }
  return { install_id: b.install_id, events };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const parsed = validate(body);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_shape" }, { status: 422 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // No DB: acknowledge so the client can clear its queue during local testing.
    console.log(
      `[impressions] (no-db) install=${parsed.install_id} events=${parsed.events.length}`,
    );
    return NextResponse.json({ ok: true });
  }

  const rows = parsed.events.map((e) => ({
    install_id: parsed.install_id,
    curiosity_id: e.curiosity_id,
    is_sponsored: e.is_sponsored,
    event: "shown",
    click_token: e.click_token,
    client_event_id: e.client_event_id,
  }));

  // Idempotent insert: duplicates (retried batch) are ignored via the unique
  // index on client_event_id.
  const { error } = await supabase
    .from("impressions")
    .upsert(rows, { onConflict: "client_event_id", ignoreDuplicates: true });

  if (error) {
    console.error("[impressions] write_failed", JSON.stringify(error));
    return NextResponse.json({ error: "write_failed" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
