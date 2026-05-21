"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import {
  IconStack2,
  IconBurger,
  IconCookie,
  IconCandy,
  IconPizza,
  IconRobot,
  IconBrain,
  IconRocket,
  IconHeart,
  IconStar,
  IconLeaf,
  IconTree,
  IconSun,
  IconMountain,
  IconMoon,
  IconMoodHappy,
  IconMusic,
  IconMovie,
  IconCamera,
  IconUser,
} from "@tabler/icons-react";

import {
  useCreateItemsMutation,
  useUpdateListMutation,
  useDeleteItemMutation,
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
import ShareModal from "./ShareModal";
import ShareCardModal from "@/app/components/shareCard/ShareCardModal";
import { ImageKitLoader, getUserFromToken } from "@/lib/helpers";
import { TierItem } from "@/app/types";
import TierComparison from "../../components/tierComparison";
import { nameToColor } from "@/lib/itemColor";
import EmptyState from "@/app/components/EmptyState";
import NavAvatar from "@/app/components/NavAvatar";
import { S } from "@/app/content/strings";
import {
  ICON_NAMES,
  COLOR_NAMES,
  COLOR_HEX,
  CategoryIcon,
  CategoryColor,
} from "@/lib/categoryIcons";
import ImageKit from "imagekit-javascript";
import LandingFooter from "@/app/landing/LandingFooter";

// ── Tier label colours from spec ────────────────────────────────────────────

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};

const ICON_COMPONENTS: Record<
  CategoryIcon,
  React.ComponentType<{ size?: number }>
> = {
  "ti-stack-2": IconStack2,
  "ti-burger": IconBurger,
  "ti-cookie": IconCookie,
  "ti-candy": IconCandy,
  "ti-pizza": IconPizza,
  "ti-robot": IconRobot,
  "ti-brain": IconBrain,
  "ti-rocket": IconRocket,
  "ti-heart": IconHeart,
  "ti-star": IconStar,
  "ti-leaf": IconLeaf,
  "ti-tree": IconTree,
  "ti-sun": IconSun,
  "ti-mountain": IconMountain,
  "ti-moon": IconMoon,
  "ti-mood-happy": IconMoodHappy,
  "ti-music": IconMusic,
  "ti-movie": IconMovie,
  "ti-camera": IconCamera,
  "ti-user": IconUser,
};

function CategoryIconDisplay({
  name,
  size = 16,
}: {
  name: string;
  size?: number;
}) {
  const Comp = ICON_COMPONENTS[name as CategoryIcon];
  return Comp ? <Comp size={size} /> : null;
}

// ── Item card ────────────────────────────────────────────────────────────────

function ItemCard({ item, onEdit }: { item: TierItem; onEdit?: () => void }) {
  const editable = !!onEdit;
  const base = [
    "w-[70px] bg-rk-surface border border-rk-stroke rounded-[8px] overflow-hidden relative",
    editable
      ? "cursor-pointer group"
      : "transition-transform hover:scale-[1.04] cursor-default",
  ].join(" ");

  const overlay = editable ? (
    <div
      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      onClick={onEdit}
    >
      <Pencil size={14} className="text-white" />
    </div>
  ) : null;

  if (item.img) {
    return (
      <div className={base}>
        <div className="relative h-[44px]">
          <Image
            loader={ImageKitLoader}
            src={item.img}
            alt=""
            fill
            sizes="70px"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="px-1.5 py-1.5">
          <p className="text-[11px] text-rk-secondary leading-tight truncate">
            {item.name ?? "—"}
          </p>
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <div className={base}>
      <div
        className="h-[44px] flex items-center justify-center rounded-t-[6px]"
        style={{ backgroundColor: item.color ?? "#334155" }}
      >
        <span className="text-white text-[11px] font-[500] select-none">
          {item.short_label}
        </span>
      </div>
      <div className="px-1.5 py-1.5">
        <p className="text-[11px] text-rk-secondary leading-tight truncate">
          {item.name}
        </p>
      </div>
      {overlay}
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

  const { data: list, isPending, isError, refetch } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const res = await fetch(`/api/s/${listId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      return processResponseData([raw])[0];
    },
    staleTime: 30_000,
  });
  const [createItems, { isLoading: isCreating }] = useCreateItemsMutation();
  const [saveList, { isLoading: isSaving }] = useUpdateListMutation();
  const [deleteItem] = useDeleteItemMutation();

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
    "head-to-head" | "hot-takes" | null
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
  const isListOwner = list?.createdBy.id === currentUserId;

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
  };

  const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    authenticationEndpoint: "/api/imagekit-auth",
  } as any);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await fetch("/api/imagekit-auth");
      const { token, expire, signature } = await res.json();

      const result = await imagekit.upload({
        file,
        fileName: `${Date.now()}-${file.name}`,
        folder: "/s",
        token,
        expire,
        signature,
      } as any);

      dispatch(uiActions.updateListMeta({ img: result.url }));
      toast.success(S.lists.imageUploaded);
    } catch (err) {
      console.error(err);
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
        category_icon: list?.category_icon ?? "ti-stack-2",
        category_color: list?.category_color ?? "blue",
        allow_contributions: list?.allow_contributions ?? false,
      })
    );
  };

  const handleSaveList = async () => {
    if (!editList.title || !editList.description) return;

    try {
      await saveList({ id: listId, data: editList }).unwrap();
      queryClient.invalidateQueries({ queryKey: listKey });
      dispatch(uiActions.closeEditListModal());
      toast.success(S.lists.updated);
    } catch (e) {
      console.error(e);
      toast.error(S.lists.updateFailed);
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
              href={isLoggedIn ? "/s" : "/"}
              className="flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/s"
                className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
              >
                Back
              </Link>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-2 pb-3">
            <Link
              href="/s"
              className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
            >
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
              href={isLoggedIn ? "/s" : "/"}
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
              href="/s"
              className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
            >
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
            href="/s"
            className="px-3 hidden sm:block py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors w-fit"
          >
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

  // Owner can edit everything; contributors can only edit items with no rankings yet
  const getOnEdit = (item: TierItem) => {
    if (isListOwner) return () => setEditItem(item);
    if (list.allow_contributions) {
      const isRanked = item.rankings?.some((r) => r.value !== 0);
      if (!isRanked) return () => setEditItem(item);
    }
    return undefined;
  };

  return (
    <div className=" z-10 bg-rk-page overflow-y-auto sm:pb-24">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
        <div className="flex justify-between items-center h-12">
          {/* Logo */}
          <Link
            href={isLoggedIn ? "/s" : "/"}
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
              href="/s"
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
            href="/s"
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
          <div
            className={`w-11 h-11 rounded-[10px] border flex-shrink-0 flex items-center justify-center`}
            style={{
              backgroundColor: `${
                COLOR_HEX[list.category_color as CategoryColor]
              }40`,
              borderColor: COLOR_HEX[list.category_color as CategoryColor],
              color: COLOR_HEX[list.category_color as CategoryColor],
            }}
          >
            <CategoryIconDisplay name={list.category_icon} size={20} />
          </div>

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
                ) : (
                  <EyeOff size={11} className="text-rk-tertiary" />
                )}
                <p className="text-[11px] text-rk-tertiary">
                  {list.visibility === "public"
                    ? "Visible"
                    : list.visibility === "hidden"
                    ? "Hidden"
                    : "Draft"}
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
                .filter((i): i is TierItem => !!i && i.id !== pendingDeleteId);

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
                    {tierItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onEdit={getOnEdit(item)}
                      />
                    ))}
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
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />

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
        handleClose={() => dispatch(uiActions.closeEditListModal())}
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

          {/* ── Icon picker ─────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
              Icon
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {ICON_NAMES.map((name) => {
                const isSelected = editList.category_icon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      dispatch(
                        uiActions.updateListMeta({ category_icon: name })
                      )
                    }
                    className={`aspect-square flex items-center justify-center rounded-[8px] border transition-colors cursor-pointer ${
                      isSelected
                        ? "border-rk-accent bg-rk-accent/10 text-rk-accent"
                        : "border-rk-stroke bg-rk-row text-rk-muted hover:border-rk-muted hover:text-rk-secondary"
                    }`}
                  >
                    <CategoryIconDisplay name={name} size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Color picker ────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
              Color
            </p>
            <div className="flex gap-2 flex-wrap">
              {COLOR_NAMES.map((name) => {
                const isSelected = editList.category_color === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      dispatch(
                        uiActions.updateListMeta({ category_color: name })
                      )
                    }
                    title={name}
                    className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-rk-accent ring-offset-rk-surface scale-110"
                        : "hover:scale-110"
                    }`}
                    style={{
                      backgroundColor: COLOR_HEX[name as CategoryColor],
                    }}
                  />
                );
              })}
            </div>
          </div>

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
                onClick={() => dispatch(uiActions.updateListMeta({ img: "" }))}
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
              onChange={(e) =>
                dispatch(
                  uiActions.updateListMeta({
                    visibility: e.target.value as "public" | "hidden" | "draft",
                  })
                )
              }
              className="text-[13px] text-rk-primary bg-rk-bg border border-rk-stroke rounded-[6px] px-2 py-1"
            >
              <option value="draft">Draft</option>
              <option value="public">Public</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>

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
              onClick={() => dispatch(uiActions.closeCreateListModal())}
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
  );
}
