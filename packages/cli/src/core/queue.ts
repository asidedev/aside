import {
  appendFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import type { ImpressionEvent } from "@aside/shared";
import { PATHS } from "../config.js";
import { writeAtomic } from "./fsutil.js";

/** A queued entry carries a client_event_id for server-side idempotency on retry. */
export interface QueueEntry extends ImpressionEvent {
  client_event_id: string;
}

const SENDING = `${PATHS.queue}.sending`;

/** Append one impression (only ever "shown" from the client). */
export function appendImpression(ev: ImpressionEvent): void {
  mkdirSync(dirname(PATHS.queue), { recursive: true });
  const entry: QueueEntry = { ...ev, client_event_id: randomUUID() };
  appendFileSync(PATHS.queue, JSON.stringify(entry) + "\n", "utf8");
}

function parseLines(raw: string): QueueEntry[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as QueueEntry;
      } catch {
        return null;
      }
    })
    .filter((x): x is QueueEntry => x !== null);
}

/**
 * Atomically take the pending batch for flushing (item 2 fix). Rotates
 * queue.jsonl out of the way so concurrent appends during the network POST are
 * never clobbered. Any leftover .sending batch (from a previous failed flush
 * or crash) is merged in, giving at-least-once delivery.
 */
export function takeBatch(): QueueEntry[] {
  let carry: QueueEntry[] = [];
  if (existsSync(SENDING)) {
    carry = parseLines(safeRead(SENDING));
  }

  let fresh: QueueEntry[] = [];
  if (existsSync(PATHS.queue)) {
    const rotated = `${PATHS.queue}.rotate-${process.pid}-${process.hrtime.bigint()}`;
    try {
      renameSync(PATHS.queue, rotated); // new appends create a fresh queue.jsonl
      fresh = parseLines(safeRead(rotated));
      rmSync(rotated, { force: true });
    } catch {
      /* race: another flush grabbed it; ignore */
    }
  }

  const combined = [...carry, ...fresh];
  if (combined.length === 0) {
    if (existsSync(SENDING)) rmSync(SENDING, { force: true });
    return [];
  }
  // Persist the in-flight batch so it survives a crash mid-POST.
  writeAtomic(SENDING, combined.map((e) => JSON.stringify(e)).join("\n") + "\n");
  return combined;
}

/** Call after a successful POST: discard the in-flight batch. */
export function flushSucceeded(): void {
  if (existsSync(SENDING)) rmSync(SENDING, { force: true });
}

/** On failure, the .sending file is left in place; the next takeBatch() merges it. */

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
