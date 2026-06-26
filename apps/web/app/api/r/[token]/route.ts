import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { decodeClickToken } from "@/lib/token";
import { seedById } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

function landing(req: NextRequest): NextResponse {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  return NextResponse.redirect(base, 302);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
): Promise<NextResponse> {
  const decoded = decodeClickToken(params.token);
  if (!decoded) return landing(req);

  const supabase = getSupabase();

  // Resolve the destination. The token is self-contained (carries curiosity_id),
  // so the redirect works even if the "shown" event has not synced yet (item 1).
  let clickUrl: string | null = null;

  if (!supabase) {
    clickUrl = seedById(decoded.curiosityId)?.click_url ?? null;
  } else {
    const { data } = await supabase
      .from("curiosities")
      .select("click_url, is_sponsored")
      .eq("id", decoded.curiosityId)
      .maybeSingle();
    if (data && data.is_sponsored) clickUrl = data.click_url ?? null;

    // Ensure the install row exists so the click's FK is satisfied even if the
    // click arrives before the first feed sync upserted it (best-effort).
    await supabase
      .from("installs")
      .upsert({ id: decoded.installId }, { onConflict: "id", ignoreDuplicates: true });

    // Record the click idempotently (unique index on click_token where clicked).
    const { error: clickErr } = await supabase.from("impressions").insert({
      install_id: decoded.installId,
      curiosity_id: decoded.curiosityId,
      is_sponsored: true,
      event: "clicked",
      click_token: params.token,
    });
    // A repeat click conflicts on the unique index — expected; ignore and redirect.
    if (clickErr && clickErr.code !== "23505") {
      console.error("[r] click insert failed", JSON.stringify(clickErr));
    }
  }

  if (!clickUrl) return landing(req);
  return NextResponse.redirect(clickUrl, 302);
}
