import { describe, it, expect, beforeEach } from "vitest";
import {
  createNewList,
  createNewTier,
  handleDropReorder,
  processRankingData,
  processResponseData,
  filterListResponseData,
  fetchUserRankings,
  getUserFromToken,
} from "@/lib/helpers";
import type { Tier, TierItem, TierList, ItemRanking } from "@/app/types";

// ── Factories ────────────────────────────────────────────────────────────────

const makeTier = (overrides: Partial<Tier> = {}): Tier => ({
  id: 1,
  title: "S",
  color: "#ff0000",
  value: 8,
  items: [],
  ...overrides,
});

const makeRanking = (overrides: Partial<ItemRanking> = {}): ItemRanking => ({
  itemId: 1,
  userId: 1,
  user: { id: 1, username: "alice" },
  value: 8,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  ...overrides,
});

const makeItem = (overrides: Partial<TierItem> = {}): TierItem => ({
  id: 1,
  name: "Item 1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  createdBy: "alice",
  rankings: [],
  ...overrides,
});

const makeList = (overrides: Partial<TierList> = {}): TierList => ({
  id: 1,
  short_id: "aBcXyZ12",
  slug: "test-list",
  title: "Test List",
  description: "A test list",
  img: "",
  visibility: "public",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  createdBy: { id: 1, username: "alice" },
  tags: [],
  category_icon: "ti-stack-2",
  category_color: "blue",
  is_shareable: false,
  share_token: null,
  anonymous_rankings_enabled: true,
  allow_contributions: false,
  tiers: [],
  items: [],
  ...overrides,
});

// ── createNewList ─────────────────────────────────────────────────────────────

describe("createNewList", () => {
  it("returns a list payload with an empty tags array", () => {
    const result = createNewList({
      title: "My List",
      description: "desc",
      img: "img.png",
      visibility: "public",
      category_icon: "ti-stack-2",
      category_color: "blue",
    });
    expect(result).toEqual({
      title: "My List",
      description: "desc",
      img: "img.png",
      visibility: "public",
      category_icon: "ti-stack-2",
      category_color: "blue",
      tags: [],
    });
  });
});

// ── createNewTier ─────────────────────────────────────────────────────────────

describe("createNewTier", () => {
  it("creates a tier with id 0 and empty items", () => {
    const result = createNewTier({ title: "A", color: "#0000ff", value: 6 });
    expect(result).toEqual({ id: 0, title: "A", color: "#0000ff", value: 6, items: [] });
  });
});

// ── handleDropReorder ─────────────────────────────────────────────────────────

describe("handleDropReorder", () => {
  let tiers: Tier[];

  beforeEach(() => {
    tiers = [
      makeTier({ id: 1, value: 8, items: [10, 20] }),
      makeTier({ id: 2, value: 4, items: [30] }),
    ];
  });

  it("moves an item from its current tier to the target tier", () => {
    const result = handleDropReorder(2, [10], tiers);
    expect(result[0].items).toEqual([20]);
    expect(result[1].items).toEqual([30, 10]);
  });

  it("moves multiple items at once", () => {
    const result = handleDropReorder(2, [10, 20], tiers);
    expect(result[0].items).toEqual([]);
    expect(result[1].items).toEqual([30, 10, 20]);
  });

  it("is a no-op when item is already in the target tier", () => {
    const result = handleDropReorder(1, [10], tiers);
    expect(result[0].items).toEqual([10, 20]);
    expect(result[1].items).toEqual([30]);
  });

  it("adds an unplaced item into the target tier", () => {
    // item 99 is not in any tier — dropping it onto tier 1 should add it
    const result = handleDropReorder(1, [99], tiers);
    expect(result[0].items).toContain(99);
    expect(result[1].items).toEqual([30]);
  });
});

// ── processRankingData ────────────────────────────────────────────────────────

describe("processRankingData", () => {
  it("flattens tier items into ranking records", () => {
    const tiers: Tier[] = [
      makeTier({ id: 1, value: 8, items: [10, 20] }),
      makeTier({ id: 2, value: 4, items: [30] }),
    ];
    const user = { id: 5, username: "alice" };
    const result = processRankingData(tiers, user, 42);
    expect(result).toEqual([
      { itemId: 10, userId: 5, value: 8, listId: 42 },
      { itemId: 20, userId: 5, value: 8, listId: 42 },
      { itemId: 30, userId: 5, value: 4, listId: 42 },
    ]);
  });

  it("returns an empty array when all tiers are empty", () => {
    const tiers: Tier[] = [makeTier({ items: [] })];
    expect(processRankingData(tiers, { id: 1, username: "u" }, 1)).toEqual([]);
  });
});

// ── processResponseData ───────────────────────────────────────────────────────

describe("processResponseData", () => {
  it("places items into tiers based on their average ranking value", () => {
    const tiers: Tier[] = [
      makeTier({ id: 1, value: 8, items: [] }),
      makeTier({ id: 2, value: 4, items: [] }),
    ];
    const items: TierItem[] = [
      makeItem({
        id: 10,
        rankings: [makeRanking({ itemId: 10, value: 8 })],
      }),
      makeItem({
        id: 20,
        rankings: [makeRanking({ itemId: 20, value: 4 })],
      }),
    ];
    const [result] = processResponseData([makeList({ tiers, items })]);
    expect(result.tiers.find((t) => t.value === 8)?.items).toContain(10);
    expect(result.tiers.find((t) => t.value === 4)?.items).toContain(20);
  });

  it("skips items with no rankings", () => {
    const tiers: Tier[] = [makeTier({ id: 1, value: 8, items: [] })];
    const items: TierItem[] = [makeItem({ id: 10, rankings: [] })];
    const [result] = processResponseData([makeList({ tiers, items })]);
    expect(result.tiers[0].items).toHaveLength(0);
  });

  it("excludes rankings with value 0 from the aggregate", () => {
    const tiers: Tier[] = [
      makeTier({ id: 1, value: 8, items: [] }),
      makeTier({ id: 2, value: 4, items: [] }),
    ];
    const items: TierItem[] = [
      makeItem({
        id: 10,
        // one real vote (8) and one abstain (0) → avg should be 8
        rankings: [
          makeRanking({ itemId: 10, value: 8 }),
          makeRanking({ itemId: 10, userId: 2, user: { id: 2, username: "bob" }, value: 0 }),
        ],
      }),
    ];
    const [result] = processResponseData([makeList({ tiers, items })]);
    expect(result.tiers.find((t) => t.value === 8)?.items).toContain(10);
  });

  it("does not mutate the input tiers", () => {
    const tiers: Tier[] = [makeTier({ id: 1, value: 8, items: [] })];
    const items: TierItem[] = [
      makeItem({ id: 10, rankings: [makeRanking({ value: 8 })] }),
    ];
    const list = makeList({ tiers, items });
    processResponseData([list]);
    expect(tiers[0].items).toHaveLength(0);
  });
});

// ── filterListResponseData ────────────────────────────────────────────────────

describe("filterListResponseData", () => {
  it("returns only the target user's rankings", () => {
    const tiers: Tier[] = [
      makeTier({ id: 1, value: 8, items: [] }),
      makeTier({ id: 2, value: 4, items: [] }),
    ];
    const items: TierItem[] = [
      makeItem({
        id: 10,
        rankings: [
          makeRanking({ itemId: 10, userId: 1, user: { id: 1, username: "alice" }, value: 8 }),
          makeRanking({ itemId: 10, userId: 2, user: { id: 2, username: "bob" }, value: 4 }),
        ],
      }),
    ];
    const result = filterListResponseData(makeList({ tiers, items }), 1);
    expect(result.find((t) => t.value === 8)?.items).toContain(10);
    expect(result.find((t) => t.value === 4)?.items).toHaveLength(0);
  });

  it("returns empty tier items when the user has no rankings", () => {
    const tiers: Tier[] = [makeTier({ id: 1, value: 8, items: [] })];
    const items: TierItem[] = [
      makeItem({ id: 10, rankings: [makeRanking({ userId: 2, user: { id: 2, username: "bob" } })] }),
    ];
    const result = filterListResponseData(makeList({ tiers, items }), 99);
    expect(result[0].items).toHaveLength(0);
  });
});

// ── fetchUserRankings ─────────────────────────────────────────────────────────

describe("fetchUserRankings", () => {
  it("returns all rankings for the given user id", () => {
    const list = makeList({
      items: [
        makeItem({
          id: 1,
          rankings: [
            makeRanking({ itemId: 1, userId: 1, user: { id: 1, username: "alice" } }),
            makeRanking({ itemId: 1, userId: 2, user: { id: 2, username: "bob" } }),
          ],
        }),
        makeItem({
          id: 2,
          rankings: [makeRanking({ itemId: 2, userId: 2, user: { id: 2, username: "bob" } })],
        }),
      ],
    });
    const result = fetchUserRankings(list, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.userId).toBe(1);
  });

  it("returns an empty array when the list is falsy", () => {
    expect(fetchUserRankings(null as unknown as TierList, 1)).toEqual([]);
  });

  it("excludes items where the user has no ranking", () => {
    const list = makeList({
      items: [makeItem({ id: 1, rankings: [] })],
    });
    expect(fetchUserRankings(list, 1)).toHaveLength(0);
  });
});

// ── getUserFromToken ──────────────────────────────────────────────────────────

describe("getUserFromToken", () => {
  const buildFakeJwt = (payload: object) => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${header}.${body}.fakesig`;
  };

  beforeEach(() => {
    Object.defineProperty(document, "cookie", { writable: true, value: "" });
  });

  it("returns decoded user fields from a valid cookie token", () => {
    const token = buildFakeJwt({ sub: 42, username: "alice", email: "alice@example.com" });
    document.cookie = `auth_token=${token}`;
    const result = getUserFromToken();
    expect(result.id).toBe(42);
    expect(result.username).toBe("alice");
    expect(result.email).toBe("alice@example.com");
  });

  it("returns empty defaults when no auth_token cookie is present", () => {
    document.cookie = "";
    const result = getUserFromToken();
    expect(result).toEqual({ id: 0, username: "", email: "" });
  });
});
