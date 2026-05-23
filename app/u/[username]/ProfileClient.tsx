"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { LayoutGrid } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MutualsInfo, ProfileResponse } from "@/lib/api/profileApi";
import { etagFetch } from "@/lib/query/fetchers";
import FollowButton from "@/app/components/FollowButton";
import UserAvatar from "@/app/components/UserAvatar";
import FollowListModal from "./FollowListModal";
import ListCard from "@/app/components/list/ListCard";
import NavAvatar from "@/app/components/NavAvatar";
import { getUserFromToken } from "@/lib/helpers";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import type { ListPreview, ListVisibility } from "@/app/types";

// ── Mutuals line ──────────────────────────────────────────────────────────────

function MutualsLine({ mutuals }: { mutuals: MutualsInfo }) {
  const names = mutuals.sample.map((u) => `@${u.username}`);
  const extra = mutuals.total - names.length;

  let text: string;
  if (names.length === 1 && extra === 0) {
    text = `Followed by ${names[0]}`;
  } else if (names.length === 2 && extra === 0) {
    text = `Followed by ${names[0]} and ${names[1]}`;
  } else if (extra === 0) {
    text = `Followed by ${names[0]}, ${names[1]}, and ${names[2]}`;
  } else {
    text = `Followed by ${names[0]}, ${names[1]}, and ${extra} other${extra !== 1 ? "s" : ""} you follow`;
  }

  return (
    <p className="text-[12px] text-rk-muted leading-snug">{text}</p>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function ProfileHero({
  username,
  displayName,
  bio,
  createdAt,
  listCount,
  followerCount,
  followingCount,
  isOwner,
  viewerFollowsThem,
  theyFollowViewer,
  viewerHasBlocked,
  viewerIsBlocked,
  mutuals,
  onFollowersClick,
  onFollowingClick,
}: {
  username: string;
  displayName: string | null;
  bio: string | null;
  createdAt: string;
  listCount: number;
  followerCount: number;
  followingCount: number;
  isOwner: boolean;
  viewerFollowsThem: boolean;
  theyFollowViewer: boolean;
  viewerHasBlocked: boolean;
  viewerIsBlocked: boolean;
  mutuals: MutualsInfo | null;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
}) {
  const name = displayName ?? username;
  const memberSince = formatDistanceStrict(new Date(createdAt), new Date(), { addSuffix: false });

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center py-8">
      <UserAvatar username={username} size={72} />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-start sm:items-center gap-3 flex-wrap justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-[600] text-rk-primary leading-tight">{name}</h1>
            {isOwner && (
              <Link
                href="/settings/profile"
                className="text-[12px] text-rk-muted border border-rk-stroke rounded-[6px] px-2 py-0.5 hover:border-rk-secondary hover:text-rk-secondary transition-colors"
              >
                Edit profile
              </Link>
            )}
            {theyFollowViewer && !isOwner && (
              <span className="text-[11px] text-rk-muted bg-rk-surface border border-rk-stroke rounded-[4px] px-1.5 py-0.5 leading-none">
                Follows you
              </span>
            )}
          </div>
          {!isOwner && (
            <FollowButton
              username={username}
              initialFollowing={viewerFollowsThem}
              initialBlocked={viewerHasBlocked}
              viewerIsBlocked={viewerIsBlocked}
            />
          )}
        </div>

        {/* @handle */}
        {displayName && (
          <p className="text-[13px] text-rk-muted">@{username}</p>
        )}

        {/* Bio */}
        {bio && (
          <p className="text-[14px] text-rk-secondary leading-snug max-w-lg">{bio}</p>
        )}

        {/* Mutuals social proof */}
        {mutuals && !isOwner && !viewerHasBlocked && !viewerIsBlocked && (
          <MutualsLine mutuals={mutuals} />
        )}

        {/* Stats strip */}
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[12px] text-rk-tertiary">
            <span className="text-rk-secondary font-[500]">{listCount}</span>{" "}
            list{listCount !== 1 ? "s" : ""}
          </span>
          <span className="text-rk-tertiary text-[11px]">·</span>
          <button
            onClick={onFollowersClick}
            className="text-[12px] text-rk-tertiary hover:text-rk-secondary transition-colors"
          >
            <span className="text-rk-secondary font-[500]">{followerCount.toLocaleString()}</span>{" "}
            follower{followerCount !== 1 ? "s" : ""}
          </button>
          <span className="text-rk-tertiary text-[11px]">·</span>
          <button
            onClick={onFollowingClick}
            className="text-[12px] text-rk-tertiary hover:text-rk-secondary transition-colors"
          >
            <span className="text-rk-secondary font-[500]">{followingCount.toLocaleString()}</span>{" "}
            following
          </button>
          <span className="text-rk-tertiary text-[11px]">·</span>
          <span className="text-[12px] text-rk-tertiary">Member for {memberSince}</span>
        </div>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = "all" | "public" | "private" | "hidden" | "draft";

const OWNER_TABS: { key: Tab; label: string }[] = [
  { key: "all",     label: "All"     },
  { key: "public",  label: "Public"  },
  { key: "private", label: "Private" },
  { key: "hidden",  label: "Hidden"  },
  { key: "draft",   label: "Draft"   },
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
  const queryClient = useQueryClient();
  const queryKey = ["profile", username] as const;
  const { data, isPending, isError } = useQuery<ProfileResponse>({
    queryKey,
    queryFn: () =>
      etagFetch<ProfileResponse>(`/api/u/${username}`, queryKey, queryClient),
    staleTime: 60_000,
  });
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
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

  if (isPending) {
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

  const {
    user,
    lists,
    isOwner,
    viewerFollowsThem,
    theyFollowViewer,
    viewerHasBlocked,
    viewerIsBlocked,
    mutuals,
  } = data;

  const tabs = isOwner ? OWNER_TABS : VISITOR_TABS;
  const currentTab = isOwner ? activeTab : "public";
  const visibleLists = filterLists(lists, currentTab);

  const tabEmptyMsg =
    currentTab === "draft"    ? "No drafts."
    : currentTab === "private"  ? "No private lists."
    : currentTab === "hidden"   ? "No hidden lists."
    : currentTab === "public"   ? (isOwner ? "No public lists yet." : "No public lists.")
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
          followerCount={user.follower_count}
          followingCount={user.following_count}
          isOwner={isOwner}
          viewerFollowsThem={viewerFollowsThem}
          theyFollowViewer={theyFollowViewer}
          viewerHasBlocked={viewerHasBlocked}
          viewerIsBlocked={viewerIsBlocked}
          mutuals={mutuals}
          onFollowersClick={() => setFollowModal("followers")}
          onFollowingClick={() => setFollowModal("following")}
        />

        {followModal && (
          <FollowListModal
            username={user.username}
            initialTab={followModal}
            onClose={() => setFollowModal(null)}
          />
        )}

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
