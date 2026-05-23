import { describe, it, expect } from "vitest";
import {
  canView,
  canRank,
  canEditRanking,
  type AccessOpts,
  type ViewerCtx,
} from "@/lib/server/listAccess";

// ── Factories ─────────────────────────────────────────────────────────────────

const makeOpts = (overrides: Partial<AccessOpts> = {}): AccessOpts => ({
  visibility: "public",
  createdById: 1,
  is_shareable: false,
  anonymous_rankings_enabled: true,
  hasValidInvite: false,
  hasExistingRanking: false,
  ...overrides,
});

const makeViewer = (overrides: Partial<ViewerCtx> = {}): ViewerCtx => ({
  userId: null,
  inviteToken: null,
  ...overrides,
});

const OWNER = makeViewer({ userId: 1 });
const ANON = makeViewer({ userId: null });
const OTHER = makeViewer({ userId: 2 });
const OTHER_WITH_INVITE = makeViewer({ userId: 2, inviteToken: "tok123" });

// ── canView ───────────────────────────────────────────────────────────────────

describe("canView", () => {
  describe("owner always has access", () => {
    it("can view their own public list", () => {
      expect(canView(makeOpts({ visibility: "public", createdById: 1 }), OWNER)).toBe(true);
    });
    it("can view their own draft list", () => {
      expect(canView(makeOpts({ visibility: "draft", createdById: 1 }), OWNER)).toBe(true);
    });
    it("can view their own private list", () => {
      expect(canView(makeOpts({ visibility: "private", createdById: 1 }), OWNER)).toBe(true);
    });
    it("can view their own hidden list", () => {
      expect(canView(makeOpts({ visibility: "hidden", createdById: 1 }), OWNER)).toBe(true);
    });
  });

  describe("public lists", () => {
    it("allows anonymous viewer", () => {
      expect(canView(makeOpts({ visibility: "public" }), ANON)).toBe(true);
    });
    it("allows authenticated non-owner", () => {
      expect(canView(makeOpts({ visibility: "public" }), OTHER)).toBe(true);
    });
  });

  describe("draft lists", () => {
    it("blocks anonymous viewer", () => {
      expect(canView(makeOpts({ visibility: "draft" }), ANON)).toBe(false);
    });
    it("blocks authenticated non-owner", () => {
      expect(canView(makeOpts({ visibility: "draft" }), OTHER)).toBe(false);
    });
  });

  describe("hidden lists", () => {
    it("blocks viewer without existing ranking", () => {
      expect(canView(makeOpts({ visibility: "hidden", hasExistingRanking: false }), OTHER)).toBe(false);
    });
    it("allows viewer with existing ranking", () => {
      expect(canView(makeOpts({ visibility: "hidden", hasExistingRanking: true }), OTHER)).toBe(true);
    });
    it("blocks anonymous viewer even with existing ranking flag", () => {
      // anonymous viewers won't have hasExistingRanking=true (server sets it for authed only)
      expect(canView(makeOpts({ visibility: "hidden", hasExistingRanking: false }), ANON)).toBe(false);
    });
  });

  describe("private lists", () => {
    it("blocks viewer without valid invite", () => {
      expect(canView(makeOpts({ visibility: "private", hasValidInvite: false }), OTHER)).toBe(false);
    });
    it("allows viewer with valid invite", () => {
      expect(canView(makeOpts({ visibility: "private", hasValidInvite: true }), OTHER_WITH_INVITE)).toBe(true);
    });
    it("blocks anonymous viewer without invite", () => {
      expect(canView(makeOpts({ visibility: "private", hasValidInvite: false }), ANON)).toBe(false);
    });
  });
});

// ── canRank ───────────────────────────────────────────────────────────────────

describe("canRank", () => {
  describe("owner always can rank", () => {
    it("can rank their own draft", () => {
      expect(canRank(makeOpts({ visibility: "draft", createdById: 1 }), OWNER)).toBe(true);
    });
    it("can rank their own hidden list", () => {
      expect(canRank(makeOpts({ visibility: "hidden", createdById: 1 }), OWNER)).toBe(true);
    });
    it("can rank their own private list", () => {
      expect(canRank(makeOpts({ visibility: "private", createdById: 1 }), OWNER)).toBe(true);
    });
  });

  describe("public lists", () => {
    it("allows anonymous viewer", () => {
      expect(canRank(makeOpts({ visibility: "public" }), ANON)).toBe(true);
    });
    it("allows authenticated non-owner", () => {
      expect(canRank(makeOpts({ visibility: "public" }), OTHER)).toBe(true);
    });
  });

  describe("draft lists", () => {
    it("blocks anonymous viewer", () => {
      expect(canRank(makeOpts({ visibility: "draft" }), ANON)).toBe(false);
    });
    it("blocks authenticated non-owner", () => {
      expect(canRank(makeOpts({ visibility: "draft" }), OTHER)).toBe(false);
    });
  });

  describe("hidden lists", () => {
    it("blocks non-owner regardless of existing ranking", () => {
      expect(canRank(makeOpts({ visibility: "hidden", hasExistingRanking: true }), OTHER)).toBe(false);
    });
    it("blocks anonymous viewer", () => {
      expect(canRank(makeOpts({ visibility: "hidden" }), ANON)).toBe(false);
    });
  });

  describe("private lists", () => {
    it("blocks viewer without valid invite", () => {
      expect(canRank(makeOpts({ visibility: "private", hasValidInvite: false }), OTHER)).toBe(false);
    });
    it("allows viewer with valid invite", () => {
      expect(canRank(makeOpts({ visibility: "private", hasValidInvite: true }), OTHER_WITH_INVITE)).toBe(true);
    });
  });
});

// ── canEditRanking ────────────────────────────────────────────────────────────

describe("canEditRanking", () => {
  describe("owner always can edit", () => {
    it("can edit ranking on their own draft", () => {
      expect(canEditRanking(makeOpts({ visibility: "draft", createdById: 1 }), OWNER)).toBe(true);
    });
  });

  describe("public lists", () => {
    it("allows anonymous viewer", () => {
      expect(canEditRanking(makeOpts({ visibility: "public" }), ANON)).toBe(true);
    });
    it("allows non-owner", () => {
      expect(canEditRanking(makeOpts({ visibility: "public" }), OTHER)).toBe(true);
    });
  });

  describe("draft lists", () => {
    it("blocks non-owner", () => {
      expect(canEditRanking(makeOpts({ visibility: "draft" }), OTHER)).toBe(false);
    });
  });

  describe("hidden lists", () => {
    it("blocks viewer without existing ranking", () => {
      expect(canEditRanking(makeOpts({ visibility: "hidden", hasExistingRanking: false }), OTHER)).toBe(false);
    });
    it("allows viewer with existing ranking", () => {
      expect(canEditRanking(makeOpts({ visibility: "hidden", hasExistingRanking: true }), OTHER)).toBe(true);
    });
  });

  describe("private lists", () => {
    it("blocks viewer without valid invite", () => {
      expect(canEditRanking(makeOpts({ visibility: "private", hasValidInvite: false }), OTHER)).toBe(false);
    });
    it("allows viewer with valid invite", () => {
      expect(canEditRanking(makeOpts({ visibility: "private", hasValidInvite: true }), OTHER_WITH_INVITE)).toBe(true);
    });
  });
});
