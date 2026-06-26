import { NextRequest, NextResponse } from "next/server";
import type { Curiosity, CuriosityFeed, Os } from "@aside/shared";
import { getSupabase } from "@/lib/supabase";
import { SEED_CURIOSITIES } from "@/lib/seed";

export const dynamic = "force-dynamic";
// Never serve a stale feed: don't let Next cache the underlying Supabase fetches.
export const fetchCache = "force-no-store";
export const revalidate = 0;

const VALID_OS: Os[] = ["darwin", "linux", "win32"];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;
  const installId = params.get("install_id");
  const cliVersion = params.get("cli_version") ?? null;
  const osRaw = params.get("os");
  const os = VALID_OS.includes(osRaw as Os) ? (osRaw as Os) : null;

  const supabase = getSupabase();

  // Fallback: no DB configured → serve seed content (local UI testing).
  if (!supabase) {
    const feed: CuriosityFeed = {
      curiosities: SEED_CURIOSITIES,
      served_at: new Date().toISOString(),
    };
    return NextResponse.json(feed, { headers: { "cache-control": "no-store" } });
  }

  // Upsert the anonymous install (Section 10.1 side effect).
  if (installId) {
    const nowIso = new Date().toISOString();
    await supabase
      .from("installs")
      .upsert(
        {
          id: installId,
          last_seen: nowIso,
          cli_version: cliVersion,
          os,
        },
        { onConflict: "id" },
      );
  }

  // Live curiosities + sponsor handle. Cap high enough to always include the
  // sponsored items (the client caches the batch and rotates locally).
  const { data: rows, error } = await supabase
    .from("curiosities")
    .select("id, body, topic, difficulty, is_sponsored, sponsor_id, status, click_url, sponsors(handle)")
    .eq("status", "live")
    .limit(500);

  if (error) {
    return NextResponse.json(
      { error: "feed_unavailable" },
      { status: 503 },
    );
  }

  // Live campaigns by sponsor (to gate sponsored items by date).
  const nowIso = new Date().toISOString();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("sponsor_id, starts_at, ends_at, status")
    .eq("status", "live");

  const liveSponsorIds = new Set(
    (campaigns ?? [])
      .filter(
        (c) =>
          (!c.starts_at || c.starts_at <= nowIso) &&
          (!c.ends_at || c.ends_at >= nowIso),
      )
      .map((c) => c.sponsor_id),
  );

  const curiosities: Curiosity[] = (rows ?? [])
    .map((r): Curiosity => {
      const handle =
        r.sponsors && typeof r.sponsors === "object"
          ? (r.sponsors as { handle?: string | null }).handle ?? null
          : null;
      return {
        id: r.id,
        body: r.body,
        topic: r.topic,
        difficulty: r.difficulty,
        is_sponsored: r.is_sponsored,
        sponsor_id: r.sponsor_id,
        sponsor_handle: handle,
        click_url: r.click_url,
        status: r.status,
      };
    })
    .filter((c) => {
      // Sponsored items require a live campaign for their sponsor.
      if (!c.is_sponsored) return true;
      return c.sponsor_id ? liveSponsorIds.has(c.sponsor_id) : false;
    });

  const feed: CuriosityFeed = {
    curiosities,
    served_at: new Date().toISOString(),
  };
  return NextResponse.json(feed, { headers: { "cache-control": "no-store" } });
}
