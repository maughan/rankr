import { describe, it, expect, beforeEach } from "vitest";
import reducer, { uiActions } from "@/lib/store/uiSlice";
import type { Tier, TierList } from "@/app/types";

// ── Factories ─────────────────────────────────────────────────────────────────

const makeTier = (overrides: Partial<Tier> = {}): Tier => ({
  id: 1,
  title: "S",
  color: "#ff0000",
  value: 8,
  items: [],
  ...overrides,
});

const makeList = (overrides: Partial<TierList> = {}): TierList => ({
  id: 1,
  short_id: "aBcXyZ12",
  slug: "test-list",
  title: "Test List",
  description: "",
  img: "",
  visibility: "public",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  createdBy: { id: 1, username: "alice" },
  category: "other",
  is_shareable: false,
  share_token: null,
  anonymous_rankings_enabled: true,
  allow_contributions: false,
  tiers: [
    makeTier({ id: 1, value: 8, items: [10] }),
    makeTier({ id: 2, title: "A", value: 6, items: [20] }),
  ],
  items: [
    {
      id: 10,
      name: "Item 10",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      createdBy: "alice",
      rankings: [
        { itemId: 10, userId: 1, user: { id: 1, username: "alice" }, value: 8, createdAt: "2024-01-01", updatedAt: "2024-01-01" },
        { itemId: 10, userId: 2, user: { id: 2, username: "bob" }, value: 6, createdAt: "2024-01-01", updatedAt: "2024-01-01" },
      ],
    },
    {
      id: 20,
      name: "Item 20",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      createdBy: "alice",
      rankings: [],
    },
  ],
  ...overrides,
});

const initialState = reducer(undefined, { type: "@@INIT" });

// ── updateListMeta ────────────────────────────────────────────────────────────

describe("updateListMeta", () => {
  it("merges partial data into editList", () => {
    const state = reducer(initialState, uiActions.updateListMeta({ title: "New Title" }));
    expect(state.editList.title).toBe("New Title");
    expect(state.editList.visibility).toBe("draft"); // other fields unchanged
  });
});

// ── updateItemMeta ────────────────────────────────────────────────────────────

describe("updateItemMeta", () => {
  it("merges partial data into editItem", () => {
    const state = reducer(initialState, uiActions.updateItemMeta({ name: "Sword" }));
    expect(state.editItem.name).toBe("Sword");
  });
});

// ── openImageModal / closeImageModal ──────────────────────────────────────────

describe("openImageModal / closeImageModal", () => {
  it("opens the modal and stores the url", () => {
    const state = reducer(initialState, uiActions.openImageModal("https://example.com/img.png"));
    expect(state.modals.imageModal).toBe(true);
    expect(state.imageModalUrl).toBe("https://example.com/img.png");
  });

  it("closes the modal and clears the url", () => {
    const opened = reducer(initialState, uiActions.openImageModal("https://example.com/img.png"));
    const closed = reducer(opened, uiActions.closeImageModal());
    expect(closed.modals.imageModal).toBe(false);
    expect(closed.imageModalUrl).toBe("");
  });
});

// ── handleDropItem ────────────────────────────────────────────────────────────

describe("handleDropItem", () => {
  it("moves the active item to the target tier", () => {
    const withRankings = reducer(initialState, {
      type: "ui/setRankingsForTest",
      payload: [
        makeTier({ id: 1, value: 8, items: [10] }),
        makeTier({ id: 2, value: 6, items: [] }),
      ],
    });
    // Manually set rankings since startRanking needs a cookie
    const state = { ...withRankings, rankings: [
      makeTier({ id: 1, value: 8, items: [10] }),
      makeTier({ id: 2, value: 6, items: [] }),
    ]};
    const next = reducer(state, uiActions.handleDropItem({ over: 2, active: 10 }));
    expect(next.rankings.find((t) => t.id === 1)?.items).not.toContain(10);
    expect(next.rankings.find((t) => t.id === 2)?.items).toContain(10);
  });
});

// ── clearRankings ─────────────────────────────────────────────────────────────

describe("clearRankings", () => {
  it("empties the rankings array", () => {
    const state = { ...initialState, rankings: [makeTier({ items: [1, 2] })] };
    const next = reducer(state, uiActions.clearRankings());
    expect(next.rankings).toEqual([]);
  });
});

// ── openTierModal / closeTierModal ────────────────────────────────────────────

describe("openTierModal / closeTierModal", () => {
  const tier = makeTier({ id: 3, title: "B" });

  it("opens the modal and sets openTier", () => {
    const state = reducer(initialState, uiActions.openTierModal(tier));
    expect(state.modals.createTier).toBe(true);
    expect(state.openTier).toMatchObject({ id: 3, title: "B" });
  });

  it("closes the modal and clears openTier", () => {
    const opened = reducer(initialState, uiActions.openTierModal(tier));
    const closed = reducer(opened, uiActions.closeTierModal());
    expect(closed.modals.createTier).toBe(false);
    expect(closed.openTier).toBeNull();
  });
});

// ── saveTierModal ─────────────────────────────────────────────────────────────

describe("saveTierModal", () => {
  it("moves selectedItems into the openTier and resets selection", () => {
    const preState = {
      ...initialState,
      rankings: [
        makeTier({ id: 1, value: 8, items: [10] }),
        makeTier({ id: 2, value: 6, items: [] }),
      ],
      openTier: makeTier({ id: 2, value: 6 }),
      modals: { ...initialState.modals, tierItems: true },
      selectedItems: [10],
    };
    const next = reducer(preState, uiActions.saveTierModal());
    expect(next.rankings.find((t) => t.id === 2)?.items).toContain(10);
    expect(next.selectedItems).toEqual([]);
    expect(next.openTier).toBeNull();
    expect(next.modals.tierItems).toBe(false);
  });
});

// ── toggleSelectItem ──────────────────────────────────────────────────────────

describe("toggleSelectItem", () => {
  it("adds an item id when not yet selected", () => {
    const state = reducer(initialState, uiActions.toggleSelectItem({ id: 5 }));
    expect(state.selectedItems).toContain(5);
  });

  it("removes an item id that is already selected", () => {
    const withItem = reducer(initialState, uiActions.toggleSelectItem({ id: 5 }));
    const removed = reducer(withItem, uiActions.toggleSelectItem({ id: 5 }));
    expect(removed.selectedItems).not.toContain(5);
  });

  it("handles multiple distinct selections", () => {
    let state = reducer(initialState, uiActions.toggleSelectItem({ id: 1 }));
    state = reducer(state, uiActions.toggleSelectItem({ id: 2 }));
    expect(state.selectedItems).toEqual([1, 2]);
  });
});

// ── openCreateListModal / closeCreateListModal ────────────────────────────────

describe("openCreateListModal / closeCreateListModal", () => {
  it("opens the createList modal", () => {
    const state = reducer(initialState, uiActions.openCreateListModal());
    expect(state.modals.createList).toBe(true);
  });

  it("closes the modal and resets editList to defaults", () => {
    let state = reducer(initialState, uiActions.openCreateListModal());
    state = reducer(state, uiActions.updateListMeta({ title: "Temp" }));
    state = reducer(state, uiActions.closeCreateListModal());
    expect(state.modals.createList).toBe(false);
    expect(state.editList.title).toBe("");
    expect(state.editList.visibility).toBe("draft");
  });
});

// ── filterRankingsByUser ──────────────────────────────────────────────────────

describe("filterRankingsByUser", () => {
  it("uses list.tiers directly when user is null", () => {
    const list = makeList();
    const state = reducer(initialState, uiActions.filterRankingsByUser({ user: null, list }));
    expect(state.filteredListRankings).toEqual(list.tiers);
    expect(state.userfilter).toBeNull();
  });

  it("filters to the given user's rankings", () => {
    const list = makeList();
    const state = reducer(initialState, uiActions.filterRankingsByUser({ user: 1, list }));
    expect(state.userfilter).toBe(1);
    // item 10 has a ranking from user 1 (value 8), so it should appear in tier with value 8
    const tier = state.filteredListRankings.find((t) => t.value === 8);
    expect(tier?.items).toContain(10);
  });

  it("is a no-op when list is undefined", () => {
    const state = reducer(initialState, uiActions.filterRankingsByUser({ user: 1, list: undefined }));
    expect(state.filteredListRankings).toEqual([]);
  });
});
