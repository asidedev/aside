import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";
import { ASIDE_DIR } from "../config.js";

export function ensureDir(): void {
  mkdirSync(ASIDE_DIR, { recursive: true });
}

export function readJsonSafe<T>(path: string, fallback: T): T {
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Atomic write: temp file + rename (Section 3.1 / 6.1). */
export function writeAtomic(path: string, data: string): void {
  mkdirSync(dirname(path), { recursive: true });
  // Unique-ish temp suffix without Math.random (pid + hrtime).
  const tmp = `${path}.tmp-${process.pid}-${process.hrtime.bigint()}`;
  writeFileSync(tmp, data, "utf8");
  renameSync(tmp, path);
}

export function writeJsonAtomic(path: string, value: unknown): void {
  writeAtomic(path, JSON.stringify(value, null, 2));
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}
