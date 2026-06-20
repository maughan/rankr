"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { formatDistanceStrict } from "date-fns";
import { Users, Trophy, RefreshCw, Layers } from "lucide-react";
import NavAvatar from "../../components/NavAvatar";
import { getUserFromToken, ImageKitLoader } from "@/lib/helpers";
import { nameToColor } from "@/lib/itemColor";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import {
  fetchFeedPage,
  fetchDiscoverUsers,
  markFeedSeen,
  type FeedItem,
  type FeedList,
  type NetworkFeedItem,
  type EngagementFeedItem,
  type NewFollowersFeedItem,
  type MilestoneFeedItem,
  type ReEngagementFeedItem,
  type FallbackList,
  type DiscoverUser,
} from "@/lib/api/feedApi";
import { listUrl } from "@/lib/listUrl";
import { S } from "@/app/content/strings";
import LandingFooter from "../landing/LandingFooter";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";
import Modal from "../../components/modal";
import { CategoryPicker } from "../../components/item/CategoryPicker";
import { toast } from "sonner";
import { useCreateListMutation } from "@/lib/api/listsApi";
import { Button, Logo } from "@/app/components";
// import { SurpriseButton } from "../components/SurpriseButton";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isNetworkItem(item: FeedItem): item is NetworkFeedItem {
  return (
    item.type === "published" ||
    item.type === "ranked" ||
    item.type === "hot_take"
  );
}

// ── Network feed cards ────────────────────────────────────────────────────────

function ActorLine({
  actor,
  label,
  createdAt,
}: {
  actor: NetworkFeedItem["actor"];
  label: string;
  createdAt: string;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Link
        href={`/u/${actor.username}`}
        className="text-[13px] font-[600] text-rk-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {actor.display_name ?? `@${actor.username}`}
      </Link>
      <span className="text-[13px] text-rk-muted">{label}</span>
      <span className="text-[11px] text-rk-tertiary">
        · {formatDistanceStrict(new Date(createdAt), new Date())} ago
      </span>
    </div>
  );
}

function ListMiniCard({ list }: { list: FeedList }) {
  return (
    <Link
      href={listUrl(list)}
      className="mt-2 flex items-center gap-3 p-3 rounded-[8px] bg-rk-row border border-rk-stroke hover:border-rk-muted transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      {list.img && (
        <div className="relative w-10 h-10 rounded-[6px] overflow-hidden flex-shrink-0">
          <Image
            loader={ImageKitLoader}
            src={list.img}
            alt=""
            fill
            sizes="40px"
            style={{ objectFit: "cover" }}
          />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-[500] text-rk-primary truncate">
          {list.title}
        </p>
        <p className="text-[11px] text-rk-tertiary">
          {list.item_count} item{list.item_count !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}

function HotTakeBody({ event }: { event: NetworkFeedItem }) {
  const { item, meta, list } = event;
  if (!item || !meta) return <ListMiniCard list={list} />;

  const direction = meta.userVal > meta.crowdMean ? "higher" : "lower";
  const delta = Math.round(meta.delta);

  return (
    <Link
      href={listUrl(list)}
      className="mt-2 p-3 rounded-[8px] transition-colors block border"
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: "rgba(249, 115, 22, 0.25)",
        borderColor: "rgb(249, 115, 22)",
        color: "rgb(249, 115, 22)",
      }}
    >
      <p className="text-[13px] font-[500] truncate">
        {item.name ?? "Unknown item"}
      </p>
      <p className="text-[11px] mt-0.5">
        Rated {delta} tier{delta !== 1 ? "s" : ""} {direction} than the crowd
        {" · "}
        <span>{list.title}</span>
      </p>
    </Link>
  );
}

function NetworkFeedCard({ event }: { event: NetworkFeedItem }) {
  const label =
    event.type === "published"
      ? "published a stack"
      : event.type === "ranked"
      ? "ranked a stack"
      : "had a hot take";

  return (
    <div className="py-4 border-b border-rk-stroke last:border-0">
      <ActorLine
        actor={event.actor}
        label={label}
        createdAt={event.createdAt}
      />
      {event.type === "hot_take" ? (
        <HotTakeBody event={event} />
      ) : (
        <ListMiniCard list={event.list} />
      )}
    </div>
  );
}

// ── Personal-reward cards ─────────────────────────────────────────────────────

function PersonalCardShell({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4 border-b border-rk-stroke last:border-0">
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center mt-0.5"
          style={{
            backgroundColor: "rgba(74,138,232,0.08)",
            border: "1px solid rgba(74,138,232,0.14)",
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function EngagementCard({ event }: { event: EngagementFeedItem }) {
  return (
    <PersonalCardShell icon={<Layers size={15} className="text-rk-accent" />}>
      <p className="text-[13px] font-[500] text-rk-primary leading-snug">
        {S.feed.engagementLabel(event.newRankerCount, event.list.title)}
      </p>
      <p className="text-[11px] text-rk-muted mt-0.5">
        {S.feed.engagementWindow}
      </p>
      <Link
        href={`${listUrl(event.list)}/results`}
        className="inline-block mt-2 text-[12px] text-rk-accent hover:underline"
      >
        {S.feed.engagementCta} →
      </Link>
    </PersonalCardShell>
  );
}

function NewFollowersCard({ event }: { event: NewFollowersFeedItem }) {
  const [username, setUsername] = useState("");
  useEffect(() => {
    setUsername(getUserFromToken().username);
  }, []);

  return (
    <PersonalCardShell icon={<Users size={15} className="text-rk-accent" />}>
      <p className="text-[13px] font-[500] text-rk-primary leading-snug">
        {event.count === 1
          ? S.feed.newFollowersSingle(event.samples[0]?.username ?? "Someone")
          : S.feed.newFollowersMany(event.count)}
      </p>
      <p className="text-[11px] text-rk-muted mt-0.5">
        {S.feed.newFollowersWindow}
      </p>

      {/* Stacked avatars */}
      {event.samples.length > 0 && (
        <div className="flex items-center gap-[-4px] mt-2">
          {event.samples.slice(0, 4).map((s, i) => {
            const color = nameToColor(s.username);
            const initial = (s.display_name ?? s.username)[0].toUpperCase();
            return (
              <Link
                key={s.username}
                href={`/u/${s.username}`}
                title={s.display_name ?? `@${s.username}`}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-[600] text-white flex-shrink-0 border-2 border-rk-page"
                style={{ backgroundColor: color, marginLeft: i > 0 ? -6 : 0 }}
              >
                {initial}
              </Link>
            );
          })}
          {event.count > 4 && (
            <span
              className="text-[10px] text-rk-muted ml-2"
              style={{ marginLeft: 6 }}
            >
              +{event.count - 4} more
            </span>
          )}
        </div>
      )}

      {username && (
        <Link
          href={`/u/${username}/followers`}
          className="inline-block mt-2 text-[12px] text-rk-accent hover:underline"
        >
          {S.feed.newFollowersCta} →
        </Link>
      )}
    </PersonalCardShell>
  );
}

function MilestoneCard({ event }: { event: MilestoneFeedItem }) {
  return (
    <PersonalCardShell icon={<Trophy size={15} className="text-rk-accent" />}>
      <p className="text-[13px] font-[500] text-rk-primary leading-snug">
        {S.feed.milestoneLabel(event.threshold, event.list.title)}
      </p>
      <Link
        href={listUrl(event.list)}
        className="inline-block mt-2 text-[12px] text-rk-accent hover:underline"
      >
        {S.feed.milestoneCta} →
      </Link>
    </PersonalCardShell>
  );
}

function ReEngagementCard({ event }: { event: ReEngagementFeedItem }) {
  return (
    <PersonalCardShell
      icon={<RefreshCw size={15} className="text-rk-accent" />}
    >
      <p className="text-[13px] font-[500] text-rk-primary leading-snug">
        {S.feed.reEngagementLabel(event.newRankerCount, event.list.title)}
      </p>
      <Link
        href={`${listUrl(event.list)}/results`}
        className="inline-block mt-2 text-[12px] text-rk-accent hover:underline"
      >
        {S.feed.reEngagementCta} →
      </Link>
    </PersonalCardShell>
  );
}

// ── Feed card dispatcher ──────────────────────────────────────────────────────

function FeedCard({ event }: { event: FeedItem }) {
  if (isNetworkItem(event)) return <NetworkFeedCard event={event} />;
  if (event.type === "engagement") return <EngagementCard event={event} />;
  if (event.type === "new_followers") return <NewFollowersCard event={event} />;
  if (event.type === "milestone") return <MilestoneCard event={event} />;
  if (event.type === "re_engagement") return <ReEngagementCard event={event} />;
  return null;
}

// ── All-lists fallback ────────────────────────────────────────────────────────

function FallbackListCard({ list }: { list: FallbackList }) {
  const href = listUrl(list);
  return (
    <div className="rounded-[10px] border border-rk-stroke bg-rk-surface overflow-hidden">
      {list.img ? (
        <div className="relative h-24">
          <Image
            loader={ImageKitLoader}
            src={list.img}
            alt=""
            fill
            sizes="200px"
            style={{ objectFit: "cover" }}
          />
        </div>
      ) : (
        <div className="h-24 bg-rk-row flex items-center justify-center">
          <div className="w-6 h-6 rounded-[4px] bg-rk-stroke" />
        </div>
      )}
      <div className="p-3">
        <p className="text-[13px] font-[500] text-rk-primary truncate leading-snug">
          {list.title}
        </p>
        <p className="text-[11px] text-rk-tertiary mt-0.5">
          {list.item_count} items
          {list.ranking_count > 0 && ` · ${list.ranking_count} rankings`}
        </p>
        <Link
          href={`${href}/s`}
          className="inline-block mt-2 text-[11px] font-[500] text-rk-accent hover:underline"
        >
          {S.feed.fallbackRankCta} →
        </Link>
      </div>
    </div>
  );
}

function FallbackSection({ lists }: { lists: FallbackList[] }) {
  if (lists.length === 0) return null;
  return (
    <div className="pt-6 border-t border-rk-stroke mt-2">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[14px] font-[500] text-rk-primary">
            {S.feed.fallbackHeading}
          </p>
          <p className="text-[12px] text-rk-muted mt-0.5">
            {S.feed.fallbackSubhead}
          </p>
        </div>
        {/* <SurpriseButton className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] border border-rk-stroke text-rk-secondary rounded-[8px] hover:border-rk-muted hover:text-rk-primary transition-colors cursor-pointer disabled:opacity-50" /> */}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {lists.map((l) => (
          <FallbackListCard key={l.id} list={l} />
        ))}
      </div>
    </div>
  );
}

// ── Discover section (zero-follow cold start) ─────────────────────────────────

function DiscoverUserRow({ user }: { user: DiscoverUser }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const color = nameToColor(user.username);
  const initial = (user.display_name ?? user.username)[0].toUpperCase();

  const toggle = async () => {
    setLoading(true);
    try {
      const method = following ? "DELETE" : "POST";
      await fetch(`/api/u/${user.username}/follow`, { method });
      setFollowing(!following);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-rk-stroke last:border-0">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-[500] text-white"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/u/${user.username}`}
          className="text-[13px] font-[600] text-rk-primary hover:underline"
        >
          {user.display_name ?? `@${user.username}`}
        </Link>
        {user.latest_list_title && (
          <p className="text-[11px] text-rk-tertiary truncate">
            {user.latest_list_title}
          </p>
        )}
        {user.pct != null && (
          <p className="text-[11px] text-rk-tertiary truncate">
            ranks like you {user.pct}%
          </p>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex-shrink-0 text-[12px] font-[500] rounded-[8px] px-3 py-1.5 transition-colors disabled:opacity-50 cursor-pointer ${
          following
            ? "border border-rk-stroke text-rk-secondary hover:border-red-400/50 hover:text-red-400"
            : "bg-rk-accent text-white hover:opacity-90"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

function DiscoverSection() {
  const { data: suggestions = [], isLoading } = useQuery<DiscoverUser[]>({
    queryKey: ["feed-discover"],
    queryFn: fetchDiscoverUsers,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center">
        <p className="text-[15px] font-[500] text-rk-primary">
          Your feed is empty
        </p>
        <p className="text-[13px] text-rk-muted mt-1">
          Follow people to see their stacks and rankings here.
        </p>
        <Link
          href="/library"
          className="inline-block mt-3 text-[13px] text-rk-accent hover:underline"
        >
          Browse the library
        </Link>
      </div>

      {(isLoading || suggestions.length > 0) && (
        <div>
          <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
            People to follow
          </p>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-rk-row flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 rounded bg-rk-row" />
                    <div className="h-2.5 w-40 rounded bg-rk-row" />
                  </div>
                  <div className="h-7 w-16 rounded-[8px] bg-rk-row flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div>
              {suggestions.map((u) => (
                <DiscoverUserRow key={u.username} user={u} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feed page ─────────────────────────────────────────────────────────────────

const FEED_KEY = ["feed"] as const;

export default function FeedPage() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  useEffect(() => {
    setUsername(getUserFromToken().username);
  }, []);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { modals, editList } = useAppSelector((state) => state.ui);
  const [createList, { isLoading: isCreating }] = useCreateListMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackEvent(E.FEED_VIEWED);
  }, []);
  const listsKey = ["lists"] as const;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
  } = useInfiniteQuery({
    queryKey: FEED_KEY,
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const handleAddList = async () => {
    if (!editList.title || !editList.description) return;

    try {
      await createList(editList).unwrap();
      queryClient.invalidateQueries({ queryKey: listsKey });
      dispatch(uiActions.closeCreateListModal());
      toast.success(S.lists.created);
    } catch (e) {
      console.error(e);
      toast.error(S.lists.createFailed);
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

  const allItems = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  // Fallback lists come from page 1 only
  const fallbackLists = useMemo(
    () => data?.pages[0]?.fallbackLists ?? [],
    [data]
  );

  // Mark feed seen once first page loads (fire-and-forget, after a brief delay
  // so the initial query reads the previous visit's timestamp)
  const [markedSeen, setMarkedSeen] = useState(false);
  useEffect(() => {
    if (data && !markedSeen) {
      const t = setTimeout(() => {
        markFeedSeen();
        setMarkedSeen(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [data, markedSeen]);

  // Track the id of the top-most network event to detect new arrivals
  const topNetworkItem = useMemo(
    () => allItems.find((i): i is NetworkFeedItem => isNetworkItem(i)),
    [allItems]
  );
  const [seenTopId, setSeenTopId] = useState<number | null>(null);
  useEffect(() => {
    const topId = topNetworkItem?.id ?? null;
    if (topId !== null && seenTopId === null) setSeenTopId(topId);
  }, [topNetworkItem, seenTopId]);

  // Poll for new network events
  const { data: freshCheck } = useQuery({
    queryKey: ["feed-check"],
    queryFn: () => fetchFeedPage(undefined),
    refetchInterval: 60_000,
    enabled: seenTopId !== null,
  });

  const newCount = useMemo(() => {
    if (!freshCheck || seenTopId === null) return 0;
    return freshCheck.items.filter(
      (i): i is NetworkFeedItem => isNetworkItem(i) && i.id > seenTopId!
    ).length;
  }, [freshCheck, seenTopId]);

  const handleLoadNew = () => {
    queryClient.invalidateQueries({ queryKey: FEED_KEY });
    queryClient.removeQueries({ queryKey: ["feed-check"] });
    setSeenTopId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // The feed has content if there are items OR a fallback section
  const hasSomething = allItems.length > 0 || fallbackLists.length > 0;

  return (
    <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto">
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
        <div className="flex justify-between items-center h-12">
          <Logo />

          <div className="flex items-center gap-3">
            <NavAvatar username={username} />

            <Link
              href="/library"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              Library
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <Button
                type="primary"
                onClick={() => dispatch(uiActions.openCreateListModal())}
              >
                + New list
              </Button>
            </div>
            {/* <SurpriseButton className="flex items-center gap-1.5 text-[13px] font-[500] text-rk-secondary hover:text-rk-primary transition-colors cursor-pointer disabled:opacity-50" /> */}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 py-6 max-w-[600px] mx-auto sm:pb-24 min-h-[80%]">
        {/* New items pill */}
        {newCount > 0 && (
          <Button
            onClick={handleLoadNew}
            type="tertiary"
            cssClass="w-full mb-4 py-2 text-[13px] font-[500] text-rk-accent bg-rk-accent/10 border border-rk-accent/30 rounded-[8px] hover:bg-rk-accent/15 transition-colors cursor-pointer"
          >
            {newCount} new post{newCount !== 1 ? "s" : ""} — tap to refresh
          </Button>
        )}

        {isPending ? (
          <FeedSkeleton />
        ) : isError ? (
          <p className="text-[13px] text-rk-muted text-center py-12">
            Couldn&apos;t load feed.{" "}
            <button
              className="text-rk-accent hover:underline cursor-pointer"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: FEED_KEY })
              }
            >
              Try again
            </button>
          </p>
        ) : !hasSomething ? (
          // True zero state: no items, no fallback (very new instance with no public lists)
          <DiscoverSection />
        ) : (
          <>
            {allItems.length > 0 && (
              <div>
                {allItems.map((event) => (
                  <FeedCard key={event.key} event={event} />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <div className="w-4 h-4 rounded-full border-2 border-rk-stroke border-t-rk-accent animate-spin" />
              </div>
            )}

            {!hasNextPage &&
              allItems.length > 0 &&
              fallbackLists.length === 0 && (
                <p className="text-center text-[12px] text-rk-tertiary py-6">
                  You&apos;re all caught up
                </p>
              )}

            {/* All-lists fallback — always below the main feed when present */}
            {fallbackLists.length > 0 && (
              <FallbackSection lists={fallbackLists} />
            )}
          </>
        )}
      </div>

      <LandingFooter />

      {/* ── Create list modal ─────────────────────────────────────────────── */}
      <Modal
        open={modals.createList}
        handleClose={() => dispatch(uiActions.closeCreateListModal())}
      >
        <div className="p-6 flex flex-col gap-4">
          <p className="text-rk-primary text-[17px] font-[500]">Create list</p>

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

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => dispatch(uiActions.closeCreateListModal())}
              type="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddList}
              disabled={isCreating}
              type="primary"
            >
              {isCreating && (
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
              )}
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="py-4 border-b border-rk-stroke animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-rk-row" />
            <div className="h-3 w-40 rounded bg-rk-row" />
          </div>
          <div className="h-[60px] rounded-[8px] bg-rk-row" />
        </div>
      ))}
    </div>
  );
}
