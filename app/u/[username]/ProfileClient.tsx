"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { LayoutGrid } from "lucide-react";
import { useGetProfileQuery } from "@/lib/api/profileApi";
import ListCard from "@/app/components/list/ListCard";
import NavAvatar from "@/app/components/NavAvatar";
import { nameToColor } from "@/lib/itemColor";
import { getUserFromToken } from "@/lib/helpers";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import type { ListPreview, ListVisibility } from "@/app/types";

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ username, size = 64 }: { username: string; size?: number }) {
  const color = nameToColor(username);
  const initial = username[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-[600] flex-shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function ProfileHero({
  username,
  displayName,
  bio,
  createdAt,
  listCount,
  isOwner,
}: {
  username: string;
  displayName: string | null;
  bio: string | null;
  createdAt: string;
  listCount: number;
  isOwner: boolean;
}) {
  const name = displayName ?? username;
  const memberSince = formatDistanceStrict(new Date(createdAt), new Date(), { addSuffix: false });

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center py-8">
      <Avatar username={username} size={72} />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[22px] font-[600] text-rk-primary leading-tight">
            {name}
          </h1>
          {isOwner && (
            <Link
              href="/settings/profile"
              className="text-[12px] text-rk-muted border border-rk-stroke rounded-[6px] px-2 py-0.5 hover:border-rk-secondary hover:text-rk-secondary transition-colors"
            >
              Edit profile
            </Link>
          )}
        </div>
        {displayName && (
          <p className="text-[13px] text-rk-muted">@{username}</p>
        )}
        {bio && (
          <p className="text-[14px] text-rk-secondary leading-snug max-w-lg">{bio}</p>
        )}
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[12px] text-rk-tertiary">
            <span className="text-rk-secondary font-[500]">{listCount}</span> list{listCount !== 1 ? "s" : ""}
          </span>
          <span className="text-rk-tertiary text-[11px]">·</span>
          <span className="text-[12px] text-rk-tertiary">
            Member for {memberSince}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = "all" | "public" | "hidden" | "draft";

const OWNER_TABS: { key: Tab; label: string }[] = [
  { key: "all",    label: "All"         },
  { key: "public", label: "Public"      },
  { key: "hidden", label: "Hidden"      },
  { key: "draft",  label: "Unpublished" },
];

const VISITOR_TABS: { key: Tab; label: string }[] = [
  { key: "public", label: "Lists" },
];

function filterLists(lists: ListPreview[], tab: Tab): ListPreview[] {
  if (tab === "all") return lists;
  return lists.filter((l) => l.visibility === (tab as ListVisibility));
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function ListGrid({
  lists,
  currentUserId,
  emptyMsg,
}: {
  lists: ListPreview[];
  currentUserId: number;
  emptyMsg: string;
}) {
  if (!lists.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <LayoutGrid size={28} className="text-rk-stroke" />
        <p className="text-[14px] text-rk-muted">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-6">
      <div className="flex gap-5 items-center py-8">
        <div className="w-[72px] h-[72px] rounded-full bg-rk-stroke flex-shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-5 w-36 bg-rk-stroke rounded-[4px]" />
          <div className="h-3.5 w-24 bg-rk-stroke rounded-[4px]" />
          <div className="h-3 w-20 bg-rk-stroke rounded-[4px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-rk-surface border border-rk-stroke rounded-[10px] overflow-hidden">
            <div className="h-36 bg-rk-stroke" />
            <div className="px-3 py-3 flex flex-col gap-2">
              <div className="h-4 w-3/4 bg-rk-stroke rounded-[4px]" />
              <div className="h-3 w-1/2 bg-rk-stroke rounded-[4px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfileClient({ username }: { username: string }) {
  const { data, isLoading, isError } = useGetProfileQuery(username);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const dispatch = useAppDispatch();
  const viewer = getUserFromToken();
  const isLoggedIn = viewer.id !== 0;

  const nav = (
    <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
      <div className="flex justify-between items-center h-12">
        <Link href={isLoggedIn ? "/s" : "/"} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
          <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
            tierstack.dev
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <NavAvatar username={viewer.username} />
          ) : (
            <button
              onClick={() => dispatch(uiActions.openAuthModal())}
              className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rk-page">
        {nav}
        <div className="max-w-5xl mx-auto px-4 pb-16">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-rk-page">
        {nav}
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-[14px] text-rk-muted">Could not load profile.</p>
        </div>
      </div>
    );
  }

  const { user, lists, isOwner } = data;

  const tabs = isOwner ? OWNER_TABS : VISITOR_TABS;
  const currentTab = isOwner ? activeTab : "public";
  const visibleLists = filterLists(lists, currentTab);

  const tabEmptyMsg =
    currentTab === "draft"   ? "No unpublished lists."
    : currentTab === "hidden"  ? "No hidden lists."
    : currentTab === "public"  ? (isOwner ? "No public lists yet." : "No public lists.")
    : "No lists yet.";

  return (
    <div className="min-h-screen bg-rk-page">
      {nav}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <ProfileHero
          username={user.username}
          displayName={user.display_name}
          bio={user.bio}
          createdAt={user.createdAt}
          listCount={isOwner ? lists.length : lists.filter((l) => l.visibility === "public").length}
          isOwner={isOwner}
        />

        {/* Tabs — only shown to owner (visitor always sees public lists) */}
        {isOwner && (
          <div className="flex gap-1 mb-5 border-b border-rk-stroke">
            {tabs.map(({ key, label }) => {
              const count = key === "all" ? lists.length : lists.filter((l) => l.visibility === key).length;
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-[500] border-b-2 transition-colors -mb-px ${
                    active
                      ? "border-rk-accent text-rk-primary"
                      : "border-transparent text-rk-muted hover:text-rk-secondary"
                  }`}
                >
                  {label}
                  <span className={`text-[11px] tabular-nums ${active ? "text-rk-secondary" : "text-rk-tertiary"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <ListGrid
          lists={visibleLists}
          currentUserId={isOwner ? user.id : 0}
          emptyMsg={tabEmptyMsg}
        />
      </div>
    </div>
  );
}
