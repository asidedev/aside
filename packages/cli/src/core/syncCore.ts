import type { CuriosityFeed, ImpressionBatch } from "@aside/shared";
import { BACKEND_URL, CLI_VERSION } from "../config.js";
import { getInstallId, normalizedOs } from "./identity.js";
import { readCache, writeCache, type CacheFile } from "./cache.js";
import { STATE_VERSION } from "../config.js";
import { takeBatch, flushSucceeded } from "./queue.js";

const FETCH_TIMEOUT_MS = 8000;

async function httpJson<T>(
  url: string,
  init: RequestInit,
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Background sync (Section 12). NEVER called from the foreground status path.
 * 1. Fetch a FULL snapshot of live curiosities and replace the cache (item 4:
 *    snapshot, not incremental — avoids shrinking the pool).
 * 2. Flush the impression queue in one batch; on success discard the in-flight
 *    file, on failure keep it for the next run (at-least-once).
 */
export async function runSync(): Promise<void> {
  const installId = getInstallId();
  const os = normalizedOs();

  // 1. Refresh cache (full snapshot).
  const url = `${BACKEND_URL}/api/curiosities?install_id=${encodeURIComponent(
    installId,
  )}&cli_version=${encodeURIComponent(CLI_VERSION)}&os=${encodeURIComponent(os)}`;
  const feed = await httpJson<CuriosityFeed>(url, { method: "GET" });
  if (feed && Array.isArray(feed.curiosities)) {
    const cache: CacheFile = {
      version: STATE_VERSION,
      served_at: feed.served_at ?? null,
      fetched_at: Date.now(),
      curiosities: feed.curiosities,
    };
    writeCache(cache);
  } else {
    // Touch fetched_at lightly so we don't hammer a down backend? No — leave
    // fetched_at unchanged so staleness logic can retry next opportunity.
    void readCache();
  }

  // 2. Flush impressions.
  const batch = takeBatch();
  if (batch.length > 0) {
    const body: ImpressionBatch & { events: typeof batch } = {
      install_id: installId,
      events: batch,
    };
    const ok = await httpJson<{ ok: boolean }>(
      `${BACKEND_URL}/api/impressions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (ok) flushSucceeded();
    // else: leave .sending in place; next runSync() merges + retries.
  }
}
