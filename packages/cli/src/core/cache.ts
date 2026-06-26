import type { Curiosity } from "@aside/shared";
import { PATHS, STATE_VERSION } from "../config.js";
import { readJsonSafe, writeJsonAtomic } from "./fsutil.js";

export interface CacheFile {
  version: number;
  served_at: string | null;
  fetched_at: number; // epoch ms of last successful sync
  curiosities: Curiosity[];
}

const EMPTY: CacheFile = {
  version: STATE_VERSION,
  served_at: null,
  fetched_at: 0,
  curiosities: [],
};

export function readCache(): CacheFile {
  const c = readJsonSafe<CacheFile>(PATHS.cache, EMPTY);
  // Reinit on version mismatch (Section 14 extended to upgrades).
  if (!c || c.version !== STATE_VERSION || !Array.isArray(c.curiosities)) {
    return { ...EMPTY };
  }
  return c;
}

export function writeCache(cache: CacheFile): void {
  writeJsonAtomic(PATHS.cache, cache);
}

export function liveCuriosities(cache: CacheFile): Curiosity[] {
  return cache.curiosities.filter((c) => c.status === "live");
}

export function curiosityById(
  cache: CacheFile,
  id: string,
): Curiosity | undefined {
  return cache.curiosities.find((c) => c.id === id);
}
