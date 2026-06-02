"use client";

import React, { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { toast } from "sonner";
import Image from "next/image";
import {
  Pencil,
  Lock,
  Share2,
  EyeOff,
  Eye,
  LockOpen,
  SquarePen,
  Undo2,
  ImageIcon,
  Flame,
  Zap,
  Copy,
  Flag,
} from "lucide-react";
import { IconStack2 } from "@tabler/icons-react";

import {
  useCreateItemsMutation,
  useUpdateListMutation,
  useDeleteItemMutation,
  useCopyListMutation,
} from "@/lib/api/listsApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { processResponseData } from "@/lib/helpers";
import EditItemModal from "./EditItemModal";
import Skeleton from "@/app/components/Skeleton";
import {
  TierRowSkeleton,
  FilterPillSkeleton,
  ItemCardSkeleton,
} from "./skeletons";
import ErrorBanner from "@/app/components/ErrorBanner";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import Modal from "../../components/modal";
import ReportModal from "@/app/components/ReportModal";
import ShareModal from "./ShareModal";
import ShareCardModal from "@/app/components/shareCard/ShareCardModal";
import { ImageKitLoader, getUserFromToken } from "@/lib/helpers";
import { ItemCard } from "@/app/components/item/ItemCard";
import { TierItem } from "@/app/types";
import TierComparison from "../../components/tierComparison";
import { nameToColor } from "@/lib/itemColor";
import EmptyState from "@/app/components/EmptyState";
import NavAvatar from "@/app/components/NavAvatar";
import { S } from "@/app/content/strings";
import { getCategoryMeta } from "@/lib/categories";
import { listUrl } from "@/lib/listUrl";
import { CategoryIcon } from "@/app/components/item/CategoryIcon";
import { CategoryPicker } from "@/app/components/item/CategoryPicker";
import LandingFooter from "@/app/landing/LandingFooter";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";
import PublishingLoader from "@/app/components/PublishingLoader";
import PublishCelebration from "@/app/components/PublishCelebration";
import {
  MIN_RANKERS_FOR_INSIGHTS,
  MIN_ITEM_RANKERS_FOR_BADGE,
  classifyAgreement,
  type AgreementTier,
} from "@/lib/insightsConfig";
import ListAwards, { type AwardUser, type SpiciestPick } from "./ListAwards";

// ── Invite param reader — isolated in Suspense so useSearchParams doesn't
//    block static prerendering of the parent page. ──────────────────────────

function InviteParamReader({
  listId,
  onToken,
}: {
  listId: number;
  onToken: () => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const token = searchParams.get("invite");
    console.log("TOKEN", token);
    if (!token) return;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `rankr_invite_${listId}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    onToken();
    // Run once per listId mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);
  return null;
}

// ── Tier label colours from spec ────────────────────────────────────────────

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};

// ── Item card ────────────────────────────────────────────────────────────────

function AgreementBadge({ pct, tier }: { pct: number; tier: AgreementTier }) {
  const base =
    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-[5px] text-[9px] font-[600] leading-none w-full justify-center";

  if (tier === "unique") {
    return (
      <div
        className={base}
        style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#F87171" }}
      >
        <Zap size={8} />
        <span>only you</span>
      </div>
    );
  }
  if (tier === "rare") {
    return (
      <div
        className={base}
        style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#F87171" }}
      >
        <Flame size={8} />
        <span>{pct}% · rare</span>
      </div>
    );
  }
  if (tier === "mid") {
    return (
      <div
        className={base}
        style={{ backgroundColor: "rgba(148,163,184,0.10)", color: "#94A3B8" }}
      >
        <span>{pct}% agree</span>
      </div>
    );
  }
  // high
  return (
    <div
      className={base}
      style={{ backgroundColor: "rgba(134,239,172,0.12)", color: "#86EFAC" }}
    >
      <span>{pct}% agree</span>
    </div>
  );
}

// ── Dot separator for meta row ───────────────────────────────────────────────

function Dot() {
  return (
    <span className="text-rk-tertiary text-[11px]" style={{ margin: "0 3px" }}>
      ·
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ListDetail({
  listId,
  listHref,
}: {
  listId: number;
  listHref: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const listKey = ["list", listId] as const;

  const {
    data: list,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const res = await fetch(`/api/s/${listId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      return processResponseData([raw])[0];
    },
    staleTime: 30_000,
  });
  const router = useRouter();
  const [createItems, { isLoading: isCreating }] = useCreateItemsMutation();
  const [saveList, { isLoading: isSaving }] = useUpdateListMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [copyList, { isLoading: isCopying }] = useCopyListMutation();

  const { modals, imageModalUrl, filteredListRankings, userfilter, editList } =
    useAppSelector((state) => state.ui);

  const users = useMemo(() => {
    if (!list) return [];
    const usersMap = new Map<number, string>();
    list.items.forEach((item: any) => {
      item.rankings?.forEach((ranking: any) => {
        if (!ranking.user) return;
        usersMap.set(ranking.user.id, ranking.user.username);
      });
    });
    const currentUser = getUserFromToken();
    return Array.from(usersMap.entries())
      .map(([id, username]) => ({ id, username }))
      .filter((u) => u.id !== currentUser.id);
  }, [list]);

  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCardTemplate, setShareCardTemplate] = useState<
    "head-to-head" | "hot-takes" | "divisive-item" | null
  >(null);
  const [itemsText, setItemsText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(0);
  const [pendingItems, setPendingItems] = useState<
    { id: number; name: string }[]
  >([]);
  const [fadingItemIds, setFadingItemIds] = useState(new Set<number>());
  const [editItem, setEditItem] = useState<TierItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibilityWarning, setVisibilityWarning] = useState<
    "hidden-suggest-draft" | "public-to-private-anon" | null
  >(null);
  const [isPublishingList, setIsPublishingList] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const isListOwner = list?.createdBy.id === currentUserId;

  const totalRankingCount = useMemo(() => {
    if (!list) return 0;
    return list.items.reduce(
      (acc: number, item: any) =>
        acc + (item.rankings?.filter((r: any) => r.value !== 0).length ?? 0),
      0
    );
  }, [list]);

  const anonRankingCount = useMemo(() => {
    if (!list) return 0;
    return list.items.reduce(
      (acc: number, item: any) =>
        acc +
        (item.rankings?.filter((r: any) => r.value !== 0 && !r.user).length ??
          0),
      0
    );
  }, [list]);

  // Count distinct rankers across all items for insight gating.
  const distinctRankerCount = useMemo(() => {
    if (!list) return 0;
    const userIds = new Set<number>();
    let hasAnon = false;
    for (const item of list.items) {
      for (const r of item.rankings as any[]) {
        if (r.value !== 0) {
          if (r.user?.id) userIds.add(r.user.id);
          else hasAnon = true;
        }
      }
    }
    return userIds.size + (hasAnon ? 1 : 0);
  }, [list]);

  // Most divisive item — highest SD of tier index across all rankers.
  const divisiveItem = useMemo(() => {
    if (!list || !list.items.length) return null;
    if (distinctRankerCount < MIN_RANKERS_FOR_INSIGHTS) return null;

    const sortedTiers = [...list.tiers]
      .filter((t) => t.value > 0)
      .sort((a, b) => b.value - a.value);
    if (sortedTiers.length < 2) return null;

    const tierValueToIdx = new Map(sortedTiers.map((t, i) => [t.value, i]));

    let best: {
      itemId: number;
      itemName: string;
      sd: number;
      distribution: { title: string; color: string; count: number }[];
      totalRankers: number;
    } | null = null;

    for (const item of list.items) {
      const nonZero = (item.rankings as any[]).filter((r) => r.value !== 0);
      if (nonZero.length < MIN_ITEM_RANKERS_FOR_BADGE) continue;

      const indices = nonZero
        .map((r: any) => tierValueToIdx.get(r.value) ?? -1)
        .filter((i) => i >= 0);
      if (indices.length < 2) continue;

      const mean =
        indices.reduce((s: number, v: number) => s + v, 0) / indices.length;
      const variance =
        indices.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) /
        indices.length;
      const sd = Math.sqrt(variance);

      if (!best || sd > best.sd) {
        const distribution = sortedTiers.map((tier) => ({
          title: tier.title,
          color: (TIER_STYLE[tier.title] ?? { bg: tier.color }).bg,
          count: nonZero.filter((r: any) => r.value === tier.value).length,
        }));
        best = {
          itemId: item.id,
          itemName: item.name ?? "?",
          sd,
          distribution,
          totalRankers: nonZero.length,
        };
      }
    }

    return best;
  }, [list, distinctRankerCount]);

  // Per-item crowd average (rounded tier value). Used for awards computation.
  const crowdAvgByItemId = useMemo<Map<number, number>>(() => {
    if (!list) return new Map();
    const map = new Map<number, number>();
    for (const item of list.items) {
      const nonZero = (item.rankings as any[]).filter((r: any) => r.value > 0);
      if (!nonZero.length) continue;
      const avg =
        nonZero.reduce((s: number, r: any) => s + r.value, 0) / nonZero.length;
      map.set(item.id, Math.round(avg));
    }
    return map;
  }, [list]);

  // Awards: score each authed non-viewer ranker vs crowd avg in a single pass.
  // Contrarian/Most Agreeable require >= 2 other authed rankers; Spiciest Pick needs >= 1.
  const listAwards = useMemo<{
    contrarian: AwardUser | null;
    agreeable: AwardUser | null;
    spiciest: SpiciestPick | null;
  } | null>(() => {
    if (
      !list ||
      distinctRankerCount < MIN_RANKERS_FOR_INSIGHTS ||
      users.length === 0
    )
      return null;

    const itemNameMap = new Map<number, string>(
      (list.items as any[]).map((i: any) => [i.id, i.name ?? "?"])
    );

    let contrarian: AwardUser | null = null;
    let agreeable: AwardUser | null = null;
    let spiciest: SpiciestPick | null = null;
    let lowestPct = Infinity;
    let highestPct = -1;
    let highestDelta = 1; // require at least 2 tiers off to qualify as spicy

    for (const user of users) {
      const userValueMap = new Map<number, number>();
      for (const item of list.items) {
        const r = (item.rankings as any[]).find(
          (r: any) => r.user?.id === user.id && r.value > 0
        );
        if (r) userValueMap.set(item.id, r.value);
      }

      let within = 0,
        both = 0;
      let userMaxDelta = 0;
      let userMaxDeltaItemId = 0;

      for (const [itemId, userValue] of userValueMap) {
        const crowdAvg = crowdAvgByItemId.get(itemId);
        if (!crowdAvg) continue;
        both++;
        const delta = Math.abs(userValue - crowdAvg);
        if (delta <= 1) within++;
        if (delta > userMaxDelta) {
          userMaxDelta = delta;
          userMaxDeltaItemId = itemId;
        }
      }

      // Contrarian / Most Agreeable — only meaningful with >= 2 comparable users
      if (users.length >= 2 && both > 0) {
        const pct = Math.round((within / both) * 100);
        if (pct < lowestPct) {
          lowestPct = pct;
          contrarian = { userId: user.id, username: user.username, pct };
        }
        if (pct > highestPct) {
          highestPct = pct;
          agreeable = { userId: user.id, username: user.username, pct };
        }
      }

      // Spiciest Pick — person with the single most extreme individual placement
      if (userMaxDelta > highestDelta && userMaxDeltaItemId !== 0) {
        highestDelta = userMaxDelta;
        spiciest = {
          userId: user.id,
          username: user.username,
          itemName: itemNameMap.get(userMaxDeltaItemId) ?? "?",
          delta: userMaxDelta,
        };
      }
    }

    // Suppress contrarian/agreeable if only one user scored valid rankings.
    if (contrarian?.userId === agreeable?.userId) {
      contrarian = null;
      agreeable = null;
    }

    if (!contrarian && !agreeable && !spiciest) return null;
    return { contrarian, agreeable, spiciest };
  }, [list, users, crowdAvgByItemId, distinctRankerCount]);

  // Per-item agreement data — only when viewing own ranking with enough rankers.
  const agreementByItemId = useMemo<
    Map<number, { pct: number; tier: AgreementTier } | null>
  >(() => {
    const empty = new Map<
      number,
      { pct: number; tier: AgreementTier } | null
    >();
    if (!list || !currentUserId || userfilter !== currentUserId) return empty;
    if (distinctRankerCount < MIN_RANKERS_FOR_INSIGHTS) return empty;

    const result = new Map<
      number,
      { pct: number; tier: AgreementTier } | null
    >();
    for (const item of list.items) {
      const allRankings = (item.rankings as any[]).filter((r) => r.value !== 0);
      if (allRankings.length < MIN_ITEM_RANKERS_FOR_BADGE) {
        result.set(item.id, null);
        continue;
      }
      const myRanking = allRankings.find((r) => r.user?.id === currentUserId);
      if (!myRanking) {
        result.set(item.id, null);
        continue;
      }
      const matches = allRankings.filter(
        (r) => r.value === myRanking.value
      ).length;
      const pct = Math.round((matches / allRankings.length) * 100);
      const tier = classifyAgreement(pct, allRankings.length);
      result.set(item.id, { pct, tier });
    }
    return result;
  }, [list, currentUserId, userfilter, distinctRankerCount]);

  // Read invite token from URL on mount and bake it into a cookie so the server
  // access check can see it on the very next fetch — before any render gate fires.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) return;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `rankr_invite_${listId}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    refetch();
  }, [listId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!modals.auth) {
      const { id } = getUserFromToken();
      setIsLoggedIn(id > 0);
      setCurrentUserId(id);
    }
  }, [modals.auth]);

  useEffect(() => {
    if (list) {
      dispatch(uiActions.filterRankingsByUser({ user: null, list }));
    }
  }, [list, dispatch]);

  const handleFilterByUser = (userId: number | null) => {
    if (!list) return;
    dispatch(uiActions.filterRankingsByUser({ user: userId, list }));
    if (userId !== null && userId !== currentUserId) {
      trackEvent(E.COMPARISON_VIEWED, { list_id: list.id });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/cover", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? S.lists.imageUploadFailed);
        return;
      }

      const { url } = await res.json();
      dispatch(uiActions.updateListMeta({ img: url }));
      toast.success(S.lists.imageUploaded);
    } catch {
      toast.error(S.lists.imageUploadFailed);
    }
  };

  const handleEditList = () => {
    dispatch(
      uiActions.openEditListModal({
        title: list?.title ?? "",
        img: list?.img ?? "",
        description: list?.description ?? "",
        visibility: list?.visibility ?? "draft",
        category: list?.category ?? "other",
        allow_contributions: list?.allow_contributions ?? false,
      })
    );
  };

  const handleCopyList = async () => {
    try {
      const result = await copyList(listId).unwrap();
      toast.success("List copied — editing your draft now");
      router.push(listUrl(result));
    } catch {
      toast.error("Failed to copy list");
    }
  };

  const handleVisibilityChange = (newVis: string) => {
    const currentVis = list?.visibility ?? "draft";
    if (newVis === "hidden" && totalRankingCount === 0) {
      setVisibilityWarning("hidden-suggest-draft");
    } else if (
      newVis === "private" &&
      currentVis === "public" &&
      anonRankingCount > 0
    ) {
      setVisibilityWarning("public-to-private-anon");
    } else {
      setVisibilityWarning(null);
    }
    dispatch(uiActions.updateListMeta({ visibility: newVis as any }));
  };

  const handleSaveList = async () => {
    if (!editList.title || !editList.description) return;

    const isPublishingNow =
      editList.visibility === "public" && list?.visibility !== "public";

    if (isPublishingNow) {
      dispatch(uiActions.closeEditListModal());
      setVisibilityWarning(null);
      setIsPublishingList(true);
    }

    try {
      const minDwell = isPublishingNow
        ? new Promise<void>((r) => setTimeout(r, 1200))
        : Promise.resolve();
      await Promise.all([
        saveList({ id: listId, data: editList }).unwrap(),
        minDwell,
      ]);
      queryClient.invalidateQueries({ queryKey: listKey });

      if (isPublishingNow) {
        setIsPublishingList(false);
        setShowCelebration(true);
      } else {
        dispatch(uiActions.closeEditListModal());
        setVisibilityWarning(null);
        toast.success(S.lists.updated);
      }
    } catch (e: any) {
      console.error(e);
      setIsPublishingList(false);
      if (e?.status === 409) {
        toast.error(S.visibility.draftBlockedByRankings);
      } else {
        toast.error(S.lists.updateFailed);
      }
    }
  };

  const handleAddItems = async () => {
    if (!list || !itemsText.trim()) return;

    const raw = itemsText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const names: string[] = [];
    for (const n of raw) {
      const key = n.toLowerCase();
      if (!seen.has(key) && n.length <= 60) {
        seen.add(key);
        names.push(n);
      }
    }

    if (!names.length) {
      toast.error(S.items.invalidNames);
      return;
    }

    // Close modal and show ghost cards immediately
    const ghosts = names.map((name, i) => ({ id: -(Date.now() + i), name }));
    setPendingItems(ghosts);
    setItemsText("");
    setAddItemsOpen(false);

    try {
      await createItems({ listId, names }).unwrap();
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      setPendingItems([]);
      toast.success(S.items.addedCount(names.length));
    } catch (err) {
      console.error(err);
      // Fade then remove ghost cards
      const ids = new Set(ghosts.map((g) => g.id));
      setFadingItemIds(ids);
      setTimeout(() => {
        setPendingItems([]);
        setFadingItemIds(new Set());
      }, 350);
      toast.error(S.items.addFailed);
    }
  };

  const handleDeleteRequest = (item: TierItem) => {
    setEditItem(null);
    setPendingDeleteId(item.id);
    const timeoutId = setTimeout(async () => {
      try {
        await deleteItem({ listId, itemId: item.id }).unwrap();
        queryClient.invalidateQueries({ queryKey: listKey });
        queryClient.invalidateQueries({ queryKey: ["lists"] });
      } catch {
        setPendingDeleteId(null);
        toast.error(S.items.removeFailed(item.name ?? "item"));
      }
      setPendingDeleteId(null);
    }, 5000);
    deleteTimeoutRef.current = timeoutId;
    toast(S.items.removedUndo(item.name ?? "item"), {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timeoutId);
          setPendingDeleteId(null);
        },
      },
    });
  };

  if (isError) {
    return (
      <div className=" z-10 bg-rk-page overflow-y-auto sm:pb-24">
        <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
          <div className="flex justify-between items-center h-12">
            <Link
              href={isLoggedIn ? "/feed" : "/"}
              className="flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/feed"
                className="flex px-3 py-1.5 text-[13px] font-[500] items-center text-rk-secondary border border-rk-stroke rounded-[8px]"
              >
                <Undo2 size={13} />
                Back
              </Link>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-2 pb-3">
            <Link
              href="/feed"
              className="px-3 py-1.5 flex gap-1.5 text-[13px] font-[500] items-center text-rk-secondary border border-rk-stroke rounded-[8px]"
            >
              <Undo2 size={13} />
              Back
            </Link>
          </div>
        </div>
        <div className="px-4 sm:px-8 py-6 max-w-3xl">
          <ErrorBanner message={S.errors.loadList} onRetry={refetch} />
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className=" z-10 bg-rk-page overflow-y-auto sm:pb-24">
        {/* Top bar — real chrome */}
        <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
          <div className="flex justify-between items-center h-12">
            <Link
              href={isLoggedIn ? "/feed" : "/"}
              className="flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </Link>
          </div>
          <div className="flex sm:hidden items-center justify-between gap-2 pb-3">
            <Link
              href="/feed"
              className="flex gap-1.5 px-3 py-1.5 text-[13px] font-[500] items-center text-rk-secondary border border-rk-stroke rounded-[8px]"
            >
              <Undo2 size={13} />
              Back
            </Link>

            {!isLoggedIn && (
              <button
                onClick={() => dispatch(uiActions.openAuthModal())}
                className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Log in / Sign up
              </button>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-8 py-6 flex flex-col gap-6 max-w-3xl mx-auto">
          <Link
            href="/feed"
            className="px-3 hidden sm:flex gap-1.5 py-1.5 items-center text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors w-fit"
          >
            <Undo2 size={13} />
            Back
          </Link>
          {/* Header skeleton — icon tile is real chrome */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-[10px] bg-rk-surface border border-rk-stroke flex-shrink-0" />
            <div className="flex flex-col gap-2 flex-1 pt-0.5">
              <Skeleton height={20} width="55%" />
              <Skeleton height={11} width="38%" />
              <Skeleton height={10} width="30%" />
            </div>
          </div>

          {/* Filter pills skeleton */}
          <div className="flex flex-col gap-2">
            <Skeleton height={10} width={88} />
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <FilterPillSkeleton key={i} index={i} />
              ))}
            </div>
          </div>

          {/* Tier rows skeleton — real labels, skeleton items */}
          <div className="flex flex-col gap-[6px]">
            <TierRowSkeleton tier="S" count={2} />
            <TierRowSkeleton tier="A" count={3} />
            <TierRowSkeleton tier="B" count={4} />
            <TierRowSkeleton tier="C" count={3} />
            <TierRowSkeleton tier="D" count={2} />
            <TierRowSkeleton tier="F" count={1} />
          </div>
        </div>
      </div>
    );
  }

  // ── Divisive item callout ────────────────────────────────────────────────

  function DivisiveItemCallout() {
    if (!divisiveItem) return null;
    const { itemName, distribution, totalRankers } = divisiveItem;
    const maxCount = Math.max(...distribution.map((d) => d.count), 1);
    const BAR_MAX_H = 40; // px

    return (
      <div className="rounded-[10px] border border-rk-stroke bg-rk-surface p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-[10px] font-[500] text-rk-tertiary uppercase tracking-widest">
              {S.divisive.eyebrow}
            </p>
            <p className="text-[15px] font-[600] text-rk-primary leading-snug truncate">
              {itemName}
            </p>
          </div>
          {list?.is_shareable && list?.share_token && (
            <button
              onClick={() => setShareCardTemplate("divisive-item")}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-[500] text-rk-muted border border-rk-stroke rounded-[6px] hover:text-rk-secondary hover:border-rk-secondary transition-colors cursor-pointer"
            >
              <ImageIcon size={11} />
              Share
            </button>
          )}
        </div>

        {/* Histogram */}
        <div className="flex items-end gap-1.5">
          {distribution.map((d) => (
            <div
              key={d.title}
              className="flex flex-col items-center gap-1 flex-1"
            >
              <div
                className="w-full rounded-t-[3px]"
                style={{
                  height: Math.max(
                    2,
                    Math.round((d.count / maxCount) * BAR_MAX_H)
                  ),
                  backgroundColor:
                    d.count > 0 ? d.color : "rgba(255,255,255,0.06)",
                  opacity: d.count > 0 ? 1 : 0.4,
                  minWidth: 8,
                }}
              />
              <span className="text-[10px] font-[600] text-rk-tertiary">
                {d.title}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-rk-muted leading-snug">
          {S.divisive.caption(totalRankers)}
        </p>
      </div>
    );
  }

  // Meta row data
  const timeAgo =
    formatDistanceStrict(new Date(list.createdAt), new Date()) + " ago";
  const rankerCount = users.length;

  const hasMyRankings =
    isLoggedIn &&
    list.items.some((item: TierItem) =>
      item.rankings?.some(
        (r: any) => r.user?.id === currentUserId && r.value !== 0
      )
    );

  // Unranked items (not placed in any tier in the current view)
  const rankedIds = new Set(filteredListRankings.flatMap((t) => t.items));
  const unranked = list.items.filter(
    (item: TierItem) => !rankedIds.has(item.id) && item.id !== pendingDeleteId
  );

  const { role: currentUserRole } = getUserFromToken();
  const isPrivileged =
    isListOwner ||
    currentUserRole === "admin" ||
    currentUserRole === "super_admin";

  // Owner and admins can edit everything; contributors can only edit unranked items
  const getOnEdit = (item: TierItem) => {
    if (isPrivileged) return () => setEditItem(item);
    if (list.allow_contributions) {
      const isRanked = item.rankings?.some((r) => r.value !== 0);
      if (!isRanked) return () => setEditItem(item);
    }
    return undefined;
  };

  return (
    <>
      {/* useSearchParams must be inside Suspense to avoid blocking static prerender */}
      <Suspense>
        <InviteParamReader listId={listId} onToken={refetch} />
      </Suspense>
      {isPublishingList && <PublishingLoader />}
      {showCelebration && (
        <PublishCelebration
          listTitle={list?.title ?? ""}
          listHref={listHref}
          onDismiss={() => setShowCelebration(false)}
          onShare={() => {
            setShowCelebration(false);
            setShareOpen(true);
          }}
        />
      )}
      <div className=" z-10 bg-rk-page overflow-y-auto sm:pb-24">
        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
          <div className="flex justify-between items-center h-12">
            {/* Logo */}
            <Link
              href={isLoggedIn ? "/feed" : "/"}
              className="flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  <NavAvatar username={getUserFromToken().username} />
                  {/* Desktop actions */}
                  <div className="hidden sm:flex items-center gap-2">
                    {list && currentUserId === list.createdBy.id && (
                      <button
                        onClick={() => setShareOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer"
                      >
                        <Share2 size={13} />
                        Share
                      </button>
                    )}
                    <button
                      onClick={handleCopyList}
                      disabled={isCopying}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Copy size={13} />
                      Copy
                    </button>
                    <Link
                      href={`${listHref}/s`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
                    >
                      <Pencil size={12} strokeWidth={2.5} />
                      Stack it
                    </Link>
                  </div>
                </>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => dispatch(uiActions.openAuthModal())}
                    className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Log in / Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Mobile action row */}
          <div className="flex sm:hidden items-center justify-between pb-3">
            <div>
              <Link
                href="/feed"
                className="px-3 gap-1.5 flex items-center py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
              >
                <Undo2 size={13} />
                Back
              </Link>
            </div>

            <div className="flex gap-2">
              {!isLoggedIn && (
                <button
                  onClick={() => dispatch(uiActions.openAuthModal())}
                  className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Log in / Sign up
                </button>
              )}
              {isLoggedIn && list && currentUserId === list.createdBy.id && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer"
                >
                  <Share2 size={13} />
                  Share
                </button>
              )}
              {isLoggedIn && (
                <button
                  onClick={handleCopyList}
                  disabled={isCopying}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Copy size={13} />
                  Copy
                </button>
              )}
              {isLoggedIn && (
                <Link
                  href={`${listHref}/s`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
                >
                  <Pencil size={12} strokeWidth={2.5} />
                  Stack it
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-8 py-6 flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-end sm:justify-between">
            <Link
              href="/feed"
              className="px-3 hidden sm:flex items-center gap-1.5 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors w-fit"
            >
              <Undo2 size={13} />
              Back
            </Link>

            {isListOwner && (
              <p
                className="flex px-3 items-center gap-1.5 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke cursor-pointer rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors w-fit"
                onClick={handleEditList}
              >
                <SquarePen size={13} />
                Edit stack
              </p>
            )}
          </div>
          {/* ── Header block ──────────────────────────────────────────────── */}
          <div className="flex items-start gap-3">
            {/* Category icon tile */}
            {(() => {
              const cat = getCategoryMeta(list.category);
              return (
                <div
                  className="w-11 h-11 rounded-[10px] border flex-shrink-0 flex items-center justify-center"
                  style={{
                    backgroundColor: `${cat.color}40`,
                    borderColor: cat.color,
                    color: cat.color,
                  }}
                >
                  <CategoryIcon slug={list.category} size={20} />
                </div>
              );
            })()}

            <div className="min-w-0">
              <p
                className="text-rk-primary font-[500] leading-tight"
                style={{ fontSize: 22, letterSpacing: "-0.4px" }}
              >
                {list.title}
              </p>
              {list.description && (
                <p className="text-[12px] text-rk-muted mt-0.5 leading-snug">
                  {list.description}
                </p>
              )}
              <div className="flex items-center flex-wrap mt-1.5">
                <span className="text-[11px] text-rk-tertiary">
                  by{" "}
                  <Link
                    href={`/u/${list.createdBy.username.toLowerCase()}`}
                    className="text-rk-primary hover:text-rk-secondary transition-colors font-bold"
                  >
                    {isListOwner ? "You" : list.createdBy.username}
                  </Link>
                </span>
                <Dot />
                <span className="text-[11px] text-rk-tertiary">{timeAgo}</span>
                <Dot />
                <span className="text-[11px] text-rk-tertiary">
                  {list.items.length} items
                </span>
                {rankerCount > 0 && (
                  <>
                    <Dot />
                    <span className="text-[11px] text-rk-tertiary">
                      {rankerCount} stacker{rankerCount !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
                <Dot />
                <div className="flex gap-1 items-center">
                  {list.visibility === "public" ? (
                    <Eye size={11} className="text-rk-tertiary" />
                  ) : list.visibility === "private" ? (
                    <Lock size={11} className="text-rk-tertiary" />
                  ) : (
                    <EyeOff size={11} className="text-rk-tertiary" />
                  )}
                  <p className="text-[11px] text-rk-tertiary capitalize">
                    {list.visibility === "public" ? "Visible" : list.visibility}
                  </p>
                </div>
                <Dot />
                <div className="flex gap-1 items-center">
                  {list.allow_contributions ? (
                    <Lock size={11} className="text-rk-tertiary" />
                  ) : (
                    <LockOpen size={11} className="text-rk-tertiary" />
                  )}

                  <p className="text-[11px] text-rk-tertiary">
                    {list.allow_contributions
                      ? "Contributions enabled"
                      : "Contributions disabled"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Report button — non-owners only */}
          {isLoggedIn && !isListOwner && list && (
            <div>
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1 text-[11px] text-rk-tertiary hover:text-rk-muted transition-colors cursor-pointer"
              >
                <Flag size={11} />
                Report
              </button>
            </div>
          )}

          {/* ── Hidden read-only banner ───────────────────────────────────── */}
          {list.visibility === "hidden" && (
            <div
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-[10px] border"
              style={{ backgroundColor: "#0F1828", borderColor: "#1E2C44" }}
            >
              <p className="text-[13px] text-rk-secondary">
                {isListOwner ? S.hidden.creatorBanner : S.hidden.rankerBanner}
              </p>
              {isListOwner && (
                <button
                  onClick={() => {
                    // Open edit modal then pre-select "public" visibility
                    handleEditList();
                    dispatch(
                      uiActions.updateListMeta({ visibility: "public" })
                    );
                  }}
                  className="flex-shrink-0 text-[12px] font-[500] text-rk-accent hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap"
                >
                  {S.hidden.creatorCta}
                </button>
              )}
            </div>
          )}

          {/* ── Filter / compare pills ─────────────────────────────────────── */}
          {(!!users.length || hasMyRankings) && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
                {isLoggedIn ? "View" : "Rankings"}
              </span>
              {isLoggedIn ? (
                <div className="flex gap-2 flex-wrap">
                  {/* My ranking pill */}
                  {hasMyRankings && (
                    <button
                      onClick={() =>
                        handleFilterByUser(
                          userfilter === currentUserId ? null : currentUserId
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-[8px] text-[12px] cursor-pointer font-[500] transition-colors ${
                        userfilter === currentUserId
                          ? "bg-rk-accent text-white"
                          : "text-rk-secondary hover:text-rk-primary"
                      }`}
                      style={
                        userfilter !== currentUserId
                          ? { backgroundColor: "rgba(255,255,255,0.04)" }
                          : undefined
                      }
                    >
                      My ranking
                    </button>
                  )}

                  {/* Other rankers — clicking triggers TierComparison */}
                  {users.map((user) => {
                    const isActive = userfilter === user.id;
                    const avatarColor = nameToColor(user.username);
                    return (
                      <button
                        key={user.id}
                        onClick={() =>
                          handleFilterByUser(isActive ? null : user.id)
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] cursor-pointer font-[500] transition-colors ${
                          isActive
                            ? "bg-rk-accent text-white"
                            : "text-rk-secondary hover:text-rk-primary"
                        }`}
                        style={
                          !isActive
                            ? { backgroundColor: "rgba(255,255,255,0.04)" }
                            : undefined
                        }
                      >
                        <div
                          className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-[700] text-white flex-shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {user.username[0]?.toUpperCase()}
                        </div>
                        {user.username}
                      </button>
                    );
                  })}

                  {userfilter && (
                    <button
                      onClick={() => handleFilterByUser(null)}
                      className="px-2.5 py-1.5 rounded-[8px] text-[12px] text-rk-muted hover:text-rk-secondary transition-colors cursor-pointer"
                      style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => dispatch(uiActions.openAuthModal())}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] cursor-pointer text-[12px] text-rk-muted hover:text-rk-secondary transition-colors self-start"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                >
                  <Lock size={12} className="flex-shrink-0" />
                  Log in or sign up to see how {users.length} other
                  {users.length !== 1 ? "s" : ""} stacked
                </button>
              )}
            </div>
          )}

          {/* ── No items state ────────────────────────────────────────────── */}
          {list.items.length === 0 && (
            <EmptyState
              icon={IconStack2}
              heading={S.empty.listNoItems.heading}
              subhead={S.empty.listNoItems.subhead}
              ctaLabel={
                isLoggedIn && (isListOwner || list.allow_contributions)
                  ? S.empty.listNoItems.cta
                  : undefined
              }
              ctaAction={
                isLoggedIn && (isListOwner || list.allow_contributions)
                  ? () => setAddItemsOpen(true)
                  : undefined
              }
            />
          )}

          {/* ── List awards — aggregate view only ───────────────────────── */}
          {!userfilter && (
            <ListAwards
              contrarian={listAwards?.contrarian ?? null}
              agreeable={listAwards?.agreeable ?? null}
              spiciest={listAwards?.spiciest ?? null}
              onSelectUser={handleFilterByUser}
            />
          )}

          {/* ── Divisive item callout — aggregate view only ──────────────── */}
          {!userfilter && <DivisiveItemCallout />}

          {/* ── Tier rows — always shown, driven by filteredListRankings ──── */}
          {list.items.length > 0 && (
            <div className="flex flex-col gap-[6px]">
              {filteredListRankings.map((tier) => {
                if (tier.value === 0) return null;

                const style = TIER_STYLE[tier.title] ?? {
                  bg: tier.color,
                  text: "#000000",
                };
                const tierItems = tier.items
                  .map((itemId) =>
                    list.items.find((i: TierItem) => i.id === itemId)
                  )
                  .filter(
                    (i): i is TierItem => !!i && i.id !== pendingDeleteId
                  );

                return (
                  <div
                    key={tier.id}
                    className="flex overflow-hidden border border-rk-stroke"
                    style={{ borderRadius: 10 }}
                  >
                    <div
                      className="w-16 flex-shrink-0 flex flex-col items-center justify-center py-3 gap-[3px]"
                      style={{ backgroundColor: style.bg, minHeight: 76 }}
                    >
                      <span
                        className="text-[26px] font-[500] leading-none select-none"
                        style={{ color: style.text }}
                      >
                        {tier.title}
                      </span>
                      <span
                        className="text-[10px] leading-none"
                        style={{ color: style.text, opacity: 0.65 }}
                      >
                        {tierItems.length}
                      </span>
                    </div>
                    <div
                      className="flex flex-wrap gap-2 p-3 flex-1 min-h-[96px] content-start"
                      style={{ backgroundColor: "#0F1828", borderRadius: 9 }}
                    >
                      {tierItems.map((item) => {
                        const badge = agreementByItemId.get(item.id);
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col items-stretch gap-1"
                            style={{ width: 70 }}
                          >
                            <ItemCard item={item} onEdit={getOnEdit(item)} />
                            {badge && (
                              <AgreementBadge
                                pct={badge.pct}
                                tier={badge.tier}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unranked pool — only relevant when viewing own or aggregate rankings */}
          {(!userfilter || userfilter === currentUserId) &&
          ((isLoggedIn && unranked.length > 0) || pendingItems.length > 0) ? (
            <div>
              <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
                Unstacked
              </p>
              <div className="flex flex-wrap gap-2 p-3">
                {isLoggedIn &&
                  unranked.map((item: TierItem) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={getOnEdit(item)}
                    />
                  ))}
                {pendingItems.map((ghost, i) => (
                  <div
                    key={ghost.id}
                    className="transition-opacity duration-300"
                    style={{
                      opacity: fadingItemIds.has(ghost.id) ? 0 : 0.65,
                    }}
                  >
                    <ItemCardSkeleton index={i} dashed />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Comparison matrix — shown below tier rows when viewing another user */}
          {userfilter && userfilter !== currentUserId && (
            <div className="pt-2 border-t border-rk-stroke">
              <TierComparison
                list={list}
                compareUserId={userfilter}
                compareUsername={
                  users.find((u) => u.id === userfilter)?.username ?? ""
                }
              />
            </div>
          )}

          {/* ── Share card buttons ──────────────────────────────────────── */}
          {hasMyRankings && list.is_shareable && list.share_token && (
            <div className="pt-2 border-t border-rk-stroke flex items-center gap-2 flex-wrap">
              {!isListOwner && (
                <button
                  onClick={() => setShareCardTemplate("head-to-head")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer"
                >
                  <ImageIcon size={13} />
                  Share your results
                </button>
              )}
              <button
                onClick={() => setShareCardTemplate("hot-takes")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer"
              >
                <ImageIcon size={13} />
                Share hot takes
              </button>
              {divisiveItem && (
                <button
                  onClick={() => setShareCardTemplate("divisive-item")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer"
                >
                  <ImageIcon size={13} />
                  {S.divisive.shareLabel}
                </button>
              )}
            </div>
          )}

          {/* ── Add items ────────────────────────────────────────────────── */}
          {isLoggedIn && (isListOwner || list.allow_contributions) && (
            <button
              onClick={() => setAddItemsOpen(true)}
              className="self-start px-4 py-2 text-[13px] cursor-pointer font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
            >
              + Add items
            </button>
          )}
        </div>

        {/* ── Bulk add modal ────────────────────────────────────────────────── */}
        <Modal
          open={addItemsOpen}
          handleClose={() => {
            setAddItemsOpen(false);
            setItemsText("");
          }}
        >
          <div className="p-6 flex flex-col gap-4">
            <p className="text-rk-primary text-[17px] font-[500]">Add items</p>
            <p className="text-[12px] text-rk-muted">{S.lists.addItemsHint}</p>
            <textarea
              className="bg-rk-row border border-rk-stroke rounded-[8px] p-3 text-rk-primary text-[13px] outline-none resize-none h-40 placeholder:text-rk-tertiary"
              placeholder={"Tim Tams\nKit Kat\nSnickers"}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setAddItemsOpen(false);
                  setItemsText("");
                }}
                className="px-4 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItems}
                disabled={isCreating}
                className="px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating && (
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
                )}
                Add
              </button>
            </div>
          </div>
        </Modal>

        {/* ── Share modal ──────────────────────────────────────────────────── */}
        <ShareModal
          listId={listId}
          visibility={list?.visibility ?? "draft"}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />

        {/* ── Report modal ─────────────────────────────────────────────────── */}
        {list && (
          <ReportModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            reportableType="list"
            reportableId={list.id}
          />
        )}

        {/* ── Share card modal ─────────────────────────────────────────────── */}
        {shareCardTemplate && list.share_token && (
          <ShareCardModal
            token={list.share_token}
            template={shareCardTemplate}
            open={shareCardTemplate !== null}
            onClose={() => setShareCardTemplate(null)}
          />
        )}

        {/* ── Edit item modal ───────────────────────────────────────────────── */}
        {editItem && (
          <EditItemModal
            item={editItem}
            listId={listId}
            open={!!editItem}
            onClose={() => setEditItem(null)}
            onDeleteRequest={handleDeleteRequest}
          />
        )}

        {/* ── Legacy image zoom modal ──────────────────────────────────────── */}
        <Modal
          open={modals.imageModal}
          handleClose={() => dispatch(uiActions.closeImageModal())}
        >
          <div className="relative w-full max-w-md">
            <Image
              loader={ImageKitLoader}
              src={imageModalUrl}
              alt=""
              width={400}
              height={300}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
        </Modal>

        <Modal
          open={modals.editList}
          handleClose={() => {
            dispatch(uiActions.closeEditListModal());
            setVisibilityWarning(null);
          }}
        >
          <div className="p-6 flex flex-col gap-4">
            <p className="text-rk-primary text-[17px] font-[500]">Edit list</p>

            <input
              className="bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-base sm:text-[13px] outline-none placeholder:text-rk-tertiary"
              placeholder="List name"
              value={editList.title}
              onChange={(e) =>
                dispatch(uiActions.updateListMeta({ title: e.target.value }))
              }
              autoFocus
            />

            <input
              className="bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-base sm:text-[13px] outline-none placeholder:text-rk-tertiary"
              placeholder="Description"
              value={editList.description}
              onChange={(e) =>
                dispatch(
                  uiActions.updateListMeta({ description: e.target.value })
                )
              }
            />

            <CategoryPicker
              value={editList.category}
              onChange={(slug) =>
                dispatch(uiActions.updateListMeta({ category: slug }))
              }
            />

            {/* ── Cover image ─────────────────────────────────────────────── */}
            {editList.img ? (
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-[6px] overflow-hidden">
                  <Image
                    loader={ImageKitLoader}
                    src={editList.img}
                    alt=""
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <button
                  onClick={() =>
                    dispatch(uiActions.updateListMeta({ img: "" }))
                  }
                  className="text-[12px] text-rk-muted hover:text-rk-secondary transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
              >
                Upload cover image (optional)
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageUpload}
            />

            <label className="flex items-center justify-between">
              <span className="text-[13px] text-rk-secondary">Visibility</span>
              <select
                value={editList.visibility}
                onChange={(e) => handleVisibilityChange(e.target.value)}
                className="text-[13px] text-rk-primary bg-rk-bg border border-rk-stroke rounded-[6px] px-2 py-1"
              >
                <option value="draft">Draft</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>

            {visibilityWarning === "hidden-suggest-draft" && (
              <div className="rounded-[8px] border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 flex flex-col gap-1.5">
                <p className="text-[12px] text-amber-400 leading-snug">
                  {S.visibility.hiddenNoRankings}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(uiActions.updateListMeta({ visibility: "draft" }));
                    setVisibilityWarning(null);
                  }}
                  className="text-[12px] font-[500] text-amber-400 underline self-start cursor-pointer"
                >
                  {S.visibility.hiddenNoRankingsCta}
                </button>
              </div>
            )}

            {visibilityWarning === "public-to-private-anon" && (
              <div className="rounded-[8px] border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 flex flex-col gap-1.5">
                <p className="text-[12px] text-amber-400 leading-snug">
                  {S.visibility.publicToPrivateAnon(anonRankingCount)}
                </p>
                <button
                  type="button"
                  onClick={() => setVisibilityWarning(null)}
                  className="text-[12px] font-[500] text-amber-400 underline self-start cursor-pointer"
                >
                  {S.visibility.publicToPrivateAnonCta}
                </button>
              </div>
            )}

            <label className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-rk-secondary">
                  Allow contributions
                </span>
                <span className="text-[11px] text-rk-muted">
                  Let logged-in users add items to this list
                </span>
              </div>
              <input
                type="checkbox"
                checked={editList.allow_contributions}
                onChange={(e) =>
                  dispatch(
                    uiActions.updateListMeta({
                      allow_contributions: e.target.checked,
                    })
                  )
                }
                className="accent-rk-accent"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  dispatch(uiActions.closeEditListModal());
                  setVisibilityWarning(null);
                }}
                className="px-4 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveList}
                disabled={isSaving}
                className="px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && (
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
                )}
                Save
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
