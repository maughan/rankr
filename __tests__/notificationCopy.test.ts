import { describe, it, expect } from "vitest";
import { notificationCopy, NotificationView } from "@/lib/notificationCopy";

const base: NotificationView = {
  id: 1, type: "ranked_your_list", count: 1,
  actorName: "Alice", actorUsername: "alice",
  listTitle: "Chocolate bars", listHref: "/s/chocolate-bars-aB12cD34",
  meta: {},
};

describe("notificationCopy", () => {
  it("ranked_your_list, single actor", () => {
    const r = notificationCopy(base);
    expect(r.text).toBe("Alice ranked Chocolate bars");
    expect(r.href).toBe("/s/chocolate-bars-aB12cD34");
  });
  it("ranked_your_list aggregates with +N others", () => {
    expect(notificationCopy({ ...base, count: 7 }).text).toBe("Alice and 6 others ranked Chocolate bars");
  });
  it("single other is singular", () => {
    expect(notificationCopy({ ...base, count: 2 }).text).toBe("Alice and 1 other ranked Chocolate bars");
  });
  it("null actor renders 'Someone'", () => {
    expect(notificationCopy({ ...base, actorName: null, actorUsername: null }).text).toBe("Someone ranked Chocolate bars");
  });
  it("new_follower links to the profile", () => {
    const r = notificationCopy({ ...base, type: "new_follower", listTitle: null, listHref: null });
    expect(r.text).toBe("Alice followed you");
    expect(r.href).toBe("/u/alice");
  });
  it("new_taste_twin shows pct", () => {
    const r = notificationCopy({ ...base, type: "new_taste_twin", meta: { twinPct: 87 } });
    expect(r.text).toBe("You have a new taste twin: @alice (87%)");
    expect(r.href).toBe("/u/alice");
  });
  it("list_milestone", () => {
    const r = notificationCopy({ ...base, type: "list_milestone", meta: { milestone: 50 } });
    expect(r.text).toBe("Chocolate bars hit 50 rankers");
  });
  it("hot_take", () => {
    expect(notificationCopy({ ...base, type: "hot_take" }).text).toBe("A divisive take landed on Chocolate bars");
  });
});
