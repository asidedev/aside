import { randomUUID } from "node:crypto";
import { platform } from "node:os";
import type { Os } from "@aside/shared";
import { PATHS } from "../config.js";
import { readJsonSafe, writeJsonAtomic, ensureDir } from "./fsutil.js";

interface ConfigFile {
  install_id: string;
}

/** Read the anonymous install_id, generating + persisting one on first use. */
export function getInstallId(): string {
  const cfg = readJsonSafe<Partial<ConfigFile>>(PATHS.config, {});
  if (cfg.install_id && typeof cfg.install_id === "string") {
    return cfg.install_id;
  }
  ensureDir();
  const id = randomUUID();
  writeJsonAtomic(PATHS.config, { install_id: id } satisfies ConfigFile);
  return id;
}

/** Read install_id without creating one (returns null if absent). */
export function peekInstallId(): string | null {
  const cfg = readJsonSafe<Partial<ConfigFile>>(PATHS.config, {});
  return typeof cfg.install_id === "string" ? cfg.install_id : null;
}

/** Normalized OS string — the only platform info ever sent (Section 4.1.4). */
export function normalizedOs(): Os {
  const p = platform();
  if (p === "darwin" || p === "linux" || p === "win32") return p;
  return "linux"; // conservative fallback; never leak the raw value
}
