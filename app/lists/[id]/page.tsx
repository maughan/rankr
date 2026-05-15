"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { toast } from "sonner";
import Image from "next/image";
import { Pencil, LayoutGrid, Lock } from "lucide-react";

import { useParams } from "next/navigation";

import { useGetListQuery, useCreateItemsMutation } from "@/lib/api/listsApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import Modal from "../../components/modal";
import { ImageKitLoader, getUserFromToken } from "@/lib/helpers";
import { selectRankersByListId } from "@/lib/selectors";
import { Tier, TierItem } from "@/app/types";
import TierComparison from "../../components/tierComparison";
import { nameToColor } from "@/lib/itemColor";

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

function ItemCard({ item }: { item: TierItem }) {
  const base =
    "w-[70px] bg-rk-surface border border-rk-stroke rounded-[8px] overflow-hidden transition-transform hover:scale-[1.04] cursor-default";

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

export default function List() {
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);

  const dispatch = useAppDispatch();

  const { data: list, isLoading } = useGetListQuery(listId);
  const [createItems, { isLoading: isCreating }] = useCreateItemsMutation();

  const { modals, imageModalUrl, filteredListRankings, userfilter } =
    useAppSelector((state) => state.ui);

  const users = useAppSelector(selectRankersByListId(listId));

  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [itemsText, setItemsText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!modals.auth) {
      const { id } = getUserFromToken();
      setIsLoggedIn(id > 0);
    }
  }, [modals.auth]);

  useEffect(() => {
    if (list) {
      dispatch(uiActions.filterRankingsByUser({ user: null, list }));
    }
  }, [list, dispatch]);

  const handleFilterByUser = (userId: number | null) => {
    if (!list) return;
    if (userId === null) {
      dispatch(uiActions.filterRankingsByUser({ user: null, list }));
    } else {
      dispatch(uiActions.setUserFilter(userId));
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
      toast.error("No valid items — names must be under 60 chars");
      return;
    }

    try {
      await createItems({ listId, names }).unwrap();
      setItemsText("");
      setAddItemsOpen(false);
      toast.success(
        `${names.length} item${names.length !== 1 ? "s" : ""} added`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to add items");
    }
  };

  if (isLoading || !list) {
    return (
      <div className="fixed inset-0 z-10 bg-rk-page flex items-center justify-center">
        <p className="text-rk-muted text-[15px]">Loading…</p>
      </div>
    );
  }

  // Meta row data
  const timeAgo =
    formatDistanceStrict(new Date(list.createdAt), new Date()) + " ago";
  const rankerCount = users.length;

  // Unranked items (not placed in any tier in the current view)
  const rankedIds = new Set(filteredListRankings.flatMap((t) => t.items));
  const unranked = list.items.filter(
    (item: TierItem) => !rankedIds.has(item.id)
  );

  return (
    <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke flex justify-between items-center px-4 sm:px-8 h-12">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
          <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
            Rankr
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/lists"
            className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
          >
            Back
          </Link>
          {isLoggedIn && (
            <Link
              href={`/lists/${id}/rank`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
            >
              <Pencil size={12} strokeWidth={2.5} />
              Rank it
            </Link>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 py-6 flex flex-col gap-6 max-w-3xl mx-auto">
        {/* ── Header block ──────────────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          {/* Category icon tile */}
          <div className="w-11 h-11 rounded-[10px] bg-rk-surface border border-rk-stroke flex-shrink-0 flex items-center justify-center">
            <LayoutGrid size={20} className="text-rk-muted" />
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
                by {list.createdBy.username}
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
                    {rankerCount} ranker{rankerCount !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Filter / compare pills ─────────────────────────────────────── */}
        {!!users.length && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
              {isLoggedIn ? "Compare with" : "Rankings"}
            </span>
            {isLoggedIn ? (
              <div className="flex gap-2 flex-wrap">
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
                    className="px-2.5 py-1.5 rounded-[8px] text-[12px] text-rk-muted hover:text-rk-secondary transition-colors"
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
                Log in or sign up to see what {users.length} other
                {users.length !== 1 ? "s" : ""} ranked
              </button>
            )}
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────── */}
        {userfilter ? (
          <TierComparison
            list={list}
            compareUserId={userfilter}
            compareUsername={
              users.find((u) => u.id === userfilter)?.username ?? ""
            }
          />
        ) : (
          <>
            {/* Tier rows */}
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
                  .filter((i): i is TierItem => !!i);

                return (
                  <div
                    key={tier.id}
                    className="flex overflow-hidden border border-rk-stroke"
                    style={{ borderRadius: 10 }}
                  >
                    {/* Tier label column */}
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

                    {/* Items area */}
                    <div
                      className="flex flex-wrap gap-2 p-3 flex-1 min-h-[76px] content-start"
                      style={{ backgroundColor: "#0F1828" }}
                    >
                      {tierItems.map((item) => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unranked pool */}
            {isLoggedIn && unranked.length > 0 && (
              <div>
                <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
                  Unranked
                </p>
                <div className="flex flex-wrap gap-2">
                  {unranked.map((item: TierItem) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Add items ────────────────────────────────────────────────── */}
        {isLoggedIn && (
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
          <p className="text-[12px] text-rk-muted">
            One item per line or comma-separated. Max 60 chars each.
          </p>
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
              className="px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

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
    </div>
  );
}
