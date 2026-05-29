"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { LayoutGrid, ChevronRight, Share2, Flag } from "lucide-react";
import {
  IconBolt,
  IconBrain,
  IconStar,
  IconHeart,
  IconRocket,
  IconMovie,
  IconMoodHappy,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MutualsInfo, ProfileResponse } from "@/lib/api/profileApi";
import { etagFetch } from "@/lib/query/fetchers";
import FollowButton from "@/app/components/FollowButton";
import UserAvatar from "@/app/components/UserAvatar";
import FollowListModal from "./FollowListModal";
import ListCard from "@/app/components/list/ListCard";
import NavAvatar from "@/app/components/NavAvatar";
import Modal from "@/app/components/modal";
import ShareCardModal from "@/app/components/shareCard/ShareCardModal";
import { getUserFromToken } from "@/lib/helpers";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import type { ListPreview, ListVisibility } from "@/app/types";
import { S } from "@/app/content/strings";
import { archetypeStatPct } from "@/lib/insightsConfig";
import type { ArchetypeSlug, ArchetypeStats, ArchetypeReceipt } from "@/lib/insightsConfig";
import LandingFooter from "@/app/landing/LandingFooter";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";
import ReportModal from "@/app/components/ReportModal";

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

// ── Archetype helpers ─────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  S: "#C44545", A: "#E08C2C", B: "#97C459", C: "#5DCAA5", D: "#85B7EB", F: "#AFA9EC",
};

const ARCHETYPE_ICONS: Record<ArchetypeSlug, React.ComponentType<{ size?: number; color?: string }>> = {
  contrarian: IconBolt,
  oracle:     IconBrain,
  purist:     IconStar,
  diplomat:   IconHeart,
  enthusiast: IconRocket,
  critic:     IconMovie,
  wildcard:   IconMoodHappy,
};

function toThirdPerson(text: string): string {
  return text
    .replace(/\bYou're\b/g, "They're")
    .replace(/\byou're\b/g, "they're")
    .replace(/\bYour\b/g, "Their")
    .replace(/\byour\b/g, "their")
    .replace(/\bYou\b/g, "They")
    .replace(/\byou\b/g, "they");
}


function TierChip({ label, color }: { label: string; color?: string }) {
  const bg = color ?? TIER_COLORS[label.toUpperCase()] ?? "#334155";
  return (
    <div
      className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${bg}25`, border: `1px solid ${bg}60` }}
    >
      <span className="text-[11px] font-[700]" style={{ color: bg }}>{label}</span>
    </div>
  );
}

function ReceiptRow({ receipt, archetypeColor }: { receipt: ArchetypeReceipt; archetypeColor: string }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-[8px] bg-rk-page border border-rk-stroke">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-[500] text-rk-primary truncate">{receipt.itemName}</p>
        <p className="text-[11px] text-rk-muted truncate">on {receipt.listName}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <TierChip label={receipt.yourTier} color={archetypeColor} />
        <span className="text-[10px] text-rk-tertiary">vs</span>
        <TierChip label={receipt.crowdTier} />
      </div>
    </div>
  );
}

function ArchetypeSheet({
  archetype,
  stats,
  isOwner,
  open,
  onClose,
  onShare,
}: {
  archetype: ArchetypeSlug;
  stats: ArchetypeStats;
  isOwner: boolean;
  open: boolean;
  onClose: () => void;
  onShare: () => void;
}) {
  const config = S.archetypes[archetype];
  const Icon = ARCHETYPE_ICONS[archetype];
  const pct = archetypeStatPct(archetype, stats.signals);
  const desc = isOwner ? config.desc : toThirdPerson(config.desc);
  const tagline = isOwner ? config.tagline : toThirdPerson(config.tagline);

  return (
    <Modal open={open} handleClose={onClose}>
      <div className="p-6 pt-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon size={20} color={config.color} />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-[600] text-rk-muted uppercase tracking-widest">
                taste archetype
              </p>
              <p className="text-[18px] font-[700] leading-tight" style={{ color: config.color }}>
                {config.name}
              </p>
            </div>
          </div>
          <p className="text-[14px] text-rk-secondary leading-relaxed">{desc}</p>
          <p className="text-[12px] text-rk-muted italic">
            "{tagline}"
          </p>
          <p className="text-[12px] text-rk-tertiary">
            {(config.statLine as (pct?: number) => string)(pct)}
            {" · "}
            {stats.rankedItemCount} items across {stats.rankedListCount} list{stats.rankedListCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Evidence */}
        {stats.evidence.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-[600] text-rk-muted uppercase tracking-widest">
              exhibit a — hottest takes
            </p>
            {stats.evidence.map((r, i) => (
              <ReceiptRow key={i} receipt={r} archetypeColor={config.color} />
            ))}
          </div>
        )}

        {/* Share CTA — owner only */}
        {isOwner && (
          <button
            onClick={onShare}
            className="flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-[13px] font-[600] text-white hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: config.color }}
          >
            <Share2 size={13} />
            {config.shareLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}

function ArchetypeBadge({
  archetype,
  stats,
  onClick,
}: {
  archetype: ArchetypeSlug;
  stats: ArchetypeStats;
  onClick: () => void;
}) {
  const config = S.archetypes[archetype];
  const Icon = ARCHETYPE_ICONS[archetype];
  const pct = archetypeStatPct(archetype, stats.signals);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-[10px] border bg-rk-surface hover:border-rk-secondary/40 transition-colors text-left cursor-pointer"
      style={{ borderColor: `${config.color}40`, borderLeftColor: config.color, borderLeftWidth: 3 }}
    >
      <div
        className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${config.color}18` }}
      >
        <Icon size={15} color={config.color} />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="text-[13px] font-[600] text-rk-primary leading-none">{config.name}</p>
        <p className="text-[12px] text-rk-muted leading-none truncate">
          {(config.statLine as (pct?: number) => string)(pct)}
        </p>
      </div>
      <ChevronRight size={14} className="text-rk-tertiary flex-shrink-0" />
    </button>
  );
}

function FormingState() {
  return (
    <div className="p-4 rounded-[10px] border border-dashed border-rk-stroke flex flex-col gap-1.5">
      <p className="text-[13px] font-[500] text-rk-secondary">{S.archetypeForming.heading}</p>
      <p className="text-[12px] text-rk-muted">{S.archetypeForming.subhead}</p>
      <Link href="/browse" className="text-[12px] text-rk-accent hover:underline mt-0.5 w-fit">
        {S.archetypeForming.cta} →
      </Link>
    </div>
  );
}

function ArchetypeSection({
  archetype,
  archetypeStats,
  isOwner,
}: {
  archetype: ArchetypeSlug | null;
  archetypeStats: ArchetypeStats | null;
  isOwner: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  if (!archetype || !archetypeStats) {
    return isOwner ? <FormingState /> : null;
  }

  return (
    <>
      <ArchetypeBadge
        archetype={archetype}
        stats={archetypeStats}
        onClick={() => setSheetOpen(true)}
      />
      <ArchetypeSheet
        archetype={archetype}
        stats={archetypeStats}
        isOwner={isOwner}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onShare={() => { setSheetOpen(false); setCardOpen(true); }}
      />
      <ShareCardModal
        template="archetype"
        open={cardOpen}
        onClose={() => setCardOpen(false)}
      />
    </>
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
  onReportClick,
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
  onReportClick: () => void;
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
            <div className="flex items-center gap-2">
              <FollowButton
                username={username}
                initialFollowing={viewerFollowsThem}
                initialBlocked={viewerHasBlocked}
                viewerIsBlocked={viewerIsBlocked}
              />
              <button
                onClick={onReportClick}
                title="Report"
                className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-rk-stroke text-rk-tertiary hover:text-rk-muted hover:border-rk-muted transition-colors cursor-pointer"
              >
                <Flag size={13} />
              </button>
            </div>
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
      {/* Hero */}
      <div className="flex gap-5 items-start py-8">
        <div className="w-[72px] h-[72px] rounded-full bg-rk-surface flex-shrink-0" />
        <div className="flex flex-col gap-2.5 flex-1 pt-1">
          <div className="h-5 w-40 bg-rk-surface rounded-[4px]" />
          <div className="h-3.5 w-24 bg-rk-surface rounded-[4px]" />
          <div className="h-3 w-32 bg-rk-surface rounded-[4px]" />
          <div className="flex gap-4 mt-1">
            <div className="h-3 w-16 bg-rk-surface rounded-[4px]" />
            <div className="h-3 w-16 bg-rk-surface rounded-[4px]" />
            <div className="h-3 w-12 bg-rk-surface rounded-[4px]" />
          </div>
        </div>
        <div className="h-8 w-24 bg-rk-surface rounded-[8px] flex-shrink-0" />
      </div>

      {/* List grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-rk-surface border border-rk-stroke rounded-[10px] overflow-hidden">
            <div className="h-36 bg-rk-row" />
            <div className="px-3 py-3 flex flex-col gap-2">
              <div className="h-4 w-3/4 bg-rk-row rounded-[4px]" />
              <div className="h-3 w-1/2 bg-rk-row rounded-[4px]" />
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
  const [reportOpen, setReportOpen] = useState(false);
  const dispatch = useAppDispatch();
  const viewer = getUserFromToken();
  const isLoggedIn = viewer.id !== 0;

  useEffect(() => {
    trackEvent(E.PROFILE_VIEWED, { is_own_profile: viewer.username === username });
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  const nav = (
    <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
      <div className="flex justify-between items-center h-12">
        <Link href={isLoggedIn ? "/feed" : "/"} className="flex items-center gap-2">
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
      <div className="min-h-screen bg-rk-page flex flex-col">
        {nav}
        <div className="max-w-5xl mx-auto px-4 pb-16 w-full flex-1">
          <ProfileSkeleton />
        </div>
        <LandingFooter />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-rk-page flex flex-col">
        {nav}
        <div className="max-w-5xl mx-auto px-4 py-16 text-center flex-1 w-full">
          <p className="text-[14px] text-rk-muted">Could not load profile.</p>
        </div>
        <LandingFooter />
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
    <div className="min-h-screen bg-rk-page flex flex-col">
      {nav}
      <div className="max-w-5xl mx-auto px-4 pb-16 w-full flex-1">
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
          onReportClick={() => setReportOpen(true)}
        />

        {!viewerHasBlocked && !viewerIsBlocked && (
          <div className="mb-5">
            <ArchetypeSection
              archetype={user.archetype}
              archetypeStats={user.archetype_stats}
              isOwner={isOwner}
            />
          </div>
        )}

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
      <LandingFooter />

      {!isOwner && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          reportableType="profile"
          reportableId={user.id}
        />
      )}
    </div>
  );
}
