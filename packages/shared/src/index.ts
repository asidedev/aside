// Shared types for the Aside system (client + backend).
// Mirrors the domain model in the spec (Section 4).

export type Difficulty = "easy" | "mid" | "deep";
export type CuriosityStatus = "draft" | "approved" | "live" | "retired";
export type CampaignStatus = "draft" | "live" | "ended";
export type ImpressionEventType = "shown" | "clicked";
export type Os = "darwin" | "linux" | "win32";

export interface Curiosity {
  id: string;
  body: string;
  topic: string;
  difficulty: Difficulty;
  is_sponsored: boolean;
  sponsor_id: string | null;
  /** Sponsor handle, denormalized into the feed for rendering the signature. */
  sponsor_handle?: string | null;
  /** Destination for a sponsored click; null means no link. */
  click_url: string | null;
  status: CuriosityStatus;
}

export interface Sponsor {
  id: string;
  name: string;
  handle: string | null;
}

export interface Campaign {
  id: string;
  sponsor_id: string;
  starts_at: string | null;
  ends_at: string | null;
  status: CampaignStatus;
}

export interface Install {
  id: string;
  first_seen: string;
  last_seen: string;
  cli_version: string;
  os: Os;
}

/** One event the client emits. The client only ever emits "shown";
 *  "clicked" is recorded server-side by the redirect endpoint. */
export interface ImpressionEvent {
  curiosity_id: string;
  is_sponsored: boolean;
  event: ImpressionEventType;
  click_token?: string | null;
}

/** Body of POST /api/impressions. */
export interface ImpressionBatch {
  install_id: string;
  events: ImpressionEvent[];
}

/** Subset of the host-tool stdin JSON the client is allowed to read (Section 5.1). */
export interface StatusInput {
  session_id: string | null;
  model_display_name?: string | null;
}

/** Feed returned by GET /api/curiosities. */
export interface CuriosityFeed {
  curiosities: Curiosity[];
  /** Server timestamp of this snapshot (ISO). */
  served_at: string;
}
