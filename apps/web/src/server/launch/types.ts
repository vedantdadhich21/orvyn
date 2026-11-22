/**
 * The launch API and database shapes.
 *
 * These types describe the contract between the ingest route, the proof page,
 * the gallery and the admin views. Nothing here imports a driver; the schema is
 * in `schema.sql` and the endpoints are listed in `README.md`.
 */

export type Hex = `0x${string}`;

export type EventKind =
  | 'user.seen'
  | 'strategy.published'
  | 'strategy.followed'
  | 'investment.made'
  | 'trade.made';

export type IngestRequest = {
  /** The transaction hash returned by the wallet. The server re-reads it. */
  txHash: Hex;
};

export type IngestResult = {
  ok: boolean;
  /** Number of new rows written; a replay writes zero. */
  written: number;
  error?: string;
};

export type ProofStats = {
  wallets: number;
  investors: number;
  strategies: number;
  transactionsToday: number;
  updatedAt: string;
};

export type GallerySort = 'newest' | 'followed';

export type GalleryQuery = {
  sort?: GallerySort;
  cursor?: string;
  limit?: number;
};

export type AdminUser = {
  address: string;
  firstSeenAt: string;
  lastSeenAt: string;
  strategies: number;
  investments: number;
};

export type AdminEvent = {
  id: string;
  kind: EventKind;
  actorAddress: string;
  subject: string | null;
  txHash: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AdminStats = {
  users: number;
  investors: number;
  strategies: number;
  eventsToday: number;
};

export type ApiError = { error: string };
