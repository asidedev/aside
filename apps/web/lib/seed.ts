import type { Curiosity } from "@aside/shared";

/**
 * Fallback content served when Supabase is not configured, so the UI, feed, and
 * click redirect can be exercised locally without a database. This is a curated
 * English subset; the live DB holds the full set (see scripts/curiosities.en.json).
 */
const SITE = "https://asidedev.vercel.app";

export const SEED_CURIOSITIES: Curiosity[] = [
  mk("11111111-1111-1111-1111-111111111101", "The first computer \"bug\" was a real moth, taped into a logbook in 1947.", "history"),
  mk("11111111-1111-1111-1111-111111111102", "HTTP 418 \"I'm a teapot\" is a real status code, from a 1998 April Fools RFC.", "protocols"),
  mk("11111111-1111-1111-1111-111111111103", "Tony Hoare called inventing the null reference his \"billion-dollar mistake.\"", "languages"),
  mk("11111111-1111-1111-1111-111111111104", "Python is named after Monty Python — not the snake.", "languages"),
  mk("11111111-1111-1111-1111-111111111105", "Linus Torvalds wrote the first working version of Git in about ten days, in 2005.", "git"),
  mk("11111111-1111-1111-1111-111111111106", "Signed 32-bit Unix time runs out on Jan 19, 2038 — the Y2038 problem.", "time"),
  mk("11111111-1111-1111-1111-111111111107", "The first webcam watched a coffee pot, so Cambridge staff wouldn't find it empty.", "history"),
  mk("11111111-1111-1111-1111-111111111108", "grep is named after the old ed command g/re/p — global / regex / print.", "shell"),
  mk("11111111-1111-1111-1111-111111111109", "Ada Lovelace published the first algorithm meant for a machine — in 1843.", "history"),
  mk("11111111-1111-1111-1111-111111111110", "Your whole 127.0.0.0/8 block — 16 million addresses — is loopback. You use one.", "networking"),
  mk("11111111-1111-1111-1111-111111111111", "A background \"daemon\" is named after Maxwell's demon — not the evil kind.", "trivia"),
  mk("11111111-1111-1111-1111-111111111112", "The Apollo 11 guidance computer landed on the Moon with about 4 KB of RAM.", "history"),
  mk("11111111-1111-1111-1111-111111111113", "0.1 + 0.2 doesn't equal 0.3 in most languages — blame binary floating point.", "languages"),
  mk("11111111-1111-1111-1111-111111111114", "sudo is just short for \"superuser do.\"", "shell"),
  mk("11111111-1111-1111-1111-111111111115", "\"Google\" is a misspelling of \"googol\" — the number 10 to the 100th.", "trivia"),
  sponsored("22222222-2222-2222-2222-222222222201", "Aside is open source and privacy-first — it never reads your code.", SITE + "/"),
  sponsored("22222222-2222-2222-2222-222222222202", "Want your message in dev's most-watched line? Sponsor Aside.", SITE + "/sponsor"),
];

function mk(id: string, body: string, topic: string): Curiosity {
  return {
    id,
    body,
    topic,
    difficulty: "mid",
    is_sponsored: false,
    sponsor_id: null,
    sponsor_handle: null,
    click_url: null,
    status: "live",
  };
}

function sponsored(id: string, body: string, url: string): Curiosity {
  return {
    id,
    body,
    topic: "sponsor",
    difficulty: "easy",
    is_sponsored: true,
    sponsor_id: "aside",
    sponsor_handle: "aside",
    click_url: url,
    status: "live",
  };
}

export function seedById(id: string): Curiosity | undefined {
  return SEED_CURIOSITIES.find((c) => c.id === id);
}
