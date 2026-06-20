// ── Shared shapes ─────────────────────────────────────────────────────────────

export interface FeedActor {
  id: number;
  username: string;
  display_name: string | null;
}

export interface FeedList {
  id: number;
  short_id: string;
  slug: string;
  title: string;
  img: string | null;
  item_count: number;
}

// ── Network event items (cursor-paginated, have a DB id) ──────────────────────

export interface NetworkFeedItem {
  key: string;
  id: number; // ActivityEvent.id — used for cursor pagination
  type: "published" | "ranked" | "hot_take";
  createdAt: string;
  actor: FeedActor;
  list: FeedList;
  item?: { id: number; name: string | null; color: string | null };
  meta?: { userVal: number; crowdMean: number; delta: number };
}

// ── Personal-reward items (page 1 only, derived at assembly time) ─────────────

export interface EngagementFeedItem {
  key: string;
  type: "engagement";
  createdAt: string;
  list: FeedList;
  newRankerCount: number;
}

export interface NewFollowersFeedItem {
  key: string;
  type: "new_followers";
  createdAt: string;
  count: number;
  samples: Array<{ username: string; display_name: string | null }>;
}

export interface MilestoneFeedItem {
  key: string;
  type: "milestone";
  createdAt: string;
  list: FeedList;
  threshold: number;
  rankerCount: number;
}

export interface ReEngagementFeedItem {
  key: string;
  type: "re_engagement";
  createdAt: string;
  list: FeedList;
  newRankerCount: number;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type FeedItem =
  | NetworkFeedItem
  | EngagementFeedItem
  | NewFollowersFeedItem
  | MilestoneFeedItem
  | ReEngagementFeedItem;

// ── All-lists fallback ────────────────────────────────────────────────────────

export interface FallbackList {
  id: number;
  short_id: string;
  slug: string;
  title: string;
  img: string | null;
  item_count: number;
  ranking_count: number;
}

// ── API response ──────────────────────────────────────────────────────────────

export interface FeedPage {
  items: FeedItem[];
  nextCursor: number | null;
  hasMore: boolean;
  fallbackLists: FallbackList[];
}

export interface DiscoverUser {
  username: string;
  display_name: string | null;
  latest_list_title: string | null;
  pct: number | null;
  sharedLists: number | null;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function fetchDiscoverUsers(): Promise<DiscoverUser[]> {
  const res = await fetch("/api/feed/discover");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchFeedPage(cursor?: number): Promise<FeedPage> {
  const params = new URLSearchParams();
  if (cursor !== undefined) params.set("cursor", String(cursor));
  const res = await fetch(`/api/feed?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function markFeedSeen(): Promise<void> {
  await fetch("/api/feed/seen", { method: "POST" });
}
