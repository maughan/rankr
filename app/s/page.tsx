"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { toast } from "sonner";
import ImageKit from "imagekit-javascript";
import Image from "next/image";
import { LayoutGrid, EyeClosed } from "lucide-react";
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
  useGetListsQuery,
  useCreateListMutation,
} from "@/lib/api/listsApi";
import ListCardSkeleton from "./ListCardSkeleton";
import UpdatingToast from "../components/UpdatingToast";
import ErrorBanner from "../components/ErrorBanner";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { ImageKitLoader, getUserFromToken } from "@/lib/helpers";
import Modal from "../components/modal";
import EmptyState from "../components/EmptyState";
import { TopTierItem } from "@/app/types";
import { S } from "@/app/content/strings";
import {
  ICON_NAMES,
  COLOR_NAMES,
  COLOR_HEX,
  CategoryIcon,
  CategoryColor,
} from "@/lib/categoryIcons";
import { nameToColor } from "@/lib/itemColor";
import { listUrl } from "@/lib/listUrl";

// ── Icon registry ─────────────────────────────────────────────────────────────

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

// ── List card ─────────────────────────────────────────────────────────────────

function ListCard({
  list,
  currentUserId,
}: {
  list: import("@/app/types").ListPreview;
  currentUserId: number;
}) {
  return (
    <div className="relative">
      <Link href={listUrl(list)}>
        <div className="bg-rk-surface border border-rk-stroke rounded-[10px] overflow-hidden hover:border-rk-muted transition-colors">
          {list.img ? (
            <div className="relative h-36">
              <Image
                loader={ImageKitLoader}
                src={list.img}
                alt=""
                fill
                sizes="360px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          ) : (
            <div
              className="h-36 p-3 flex flex-wrap gap-1.5 content-start overflow-hidden"
              style={{ backgroundColor: "#0F1828" }}
            >
              {list.top_tier_items.map((item: TopTierItem) => (
                <div
                  key={item.id}
                  className="w-[22px] h-[22px] rounded-[4px] flex-shrink-0"
                  style={{ backgroundColor: item.color ?? "#334155" }}
                />
              ))}
              {list.top_tier_items.length === 0 && (
                <p className="text-[11px] text-rk-tertiary">No items yet</p>
              )}
            </div>
          )}
          <div className="px-3 py-3">
            <p className="text-[15px] font-[500] text-rk-primary truncate">
              {list.title}
            </p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="text-[11px] text-rk-tertiary">
                {list.item_count} item{list.item_count !== 1 ? "s" : ""}
              </span>
              <span className="text-rk-tertiary text-[11px]">·</span>
              <span className="text-[11px] text-rk-tertiary">
                {formatDistanceStrict(new Date(list.updatedAt), new Date())} ago
              </span>
              {list.ranker_count > 0 && (
                <>
                  <span className="text-rk-tertiary text-[11px]">·</span>
                  <span className="text-[11px] text-rk-tertiary">
                    {list.ranker_count} stacker
                    {list.ranker_count !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>

      {list.createdBy.id === currentUserId && list.hidden && (
        <div
          className="absolute top-2 right-2"
          title="Hidden"
        >
          <div
            className="w-8 h-8 flex items-center justify-center rounded-[6px]"
            style={{ backgroundColor: "rgba(10,18,32,0.72)" }}
          >
            <EyeClosed size={14} className="text-rk-accent" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  lists,
  currentUserId,
}: {
  title: string;
  lists: import("@/app/types").ListPreview[];
  currentUserId: number;
}) {
  if (!lists.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {lists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sectioned content ─────────────────────────────────────────────────────────

function ListsContent({
  lists,
  isLoggedIn,
  currentUserId,
  isFetching,
  onCreateList,
  onLogin,
}: {
  lists: import("@/app/types").ListPreview[];
  isLoggedIn: boolean;
  currentUserId: number;
  isFetching: boolean;
  onCreateList: () => void;
  onLogin: () => void;
}) {
  const myLists = lists.filter((l) => l.createdBy.id === currentUserId);
  const rankedLists = lists.filter(
    (l) => l.user_has_ranked && l.createdBy.id !== currentUserId
  );
  const exploreLists = lists.filter(
    (l) => l.createdBy.id !== currentUserId && !l.user_has_ranked
  );

  const sharedProps = { currentUserId };

  if (lists.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        heading={S.empty.library.heading}
        subhead={
          isLoggedIn
            ? S.empty.library.subheadLoggedIn
            : S.empty.library.subheadLoggedOut
        }
        ctaLabel={
          isLoggedIn
            ? S.empty.library.ctaLoggedIn
            : S.empty.library.ctaLoggedOut
        }
        ctaAction={isLoggedIn ? onCreateList : onLogin}
      />
    );
  }

  return (
    <div className="relative flex flex-col gap-8">
      {isFetching && (
        <div className="absolute top-0 right-0 z-10">
          <UpdatingToast />
        </div>
      )}
      <Section title="Your stacks" lists={myLists} {...sharedProps} />
      <Section title="Stacks you've ranked" lists={rankedLists} {...sharedProps} />
      <Section title="Explore" lists={exploreLists} {...sharedProps} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Lists() {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: lists = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetListsQuery();
  const [createList, { isLoading: isCreating }] = useCreateListMutation();

  const { modals, editList } = useAppSelector((state) => state.ui);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(0);

  // Re-check the cookie whenever the auth modal closes (catches post-login state)
  useEffect(() => {
    if (!modals.auth) {
      const { id } = getUserFromToken();
      setIsLoggedIn(id > 0);
      setCurrentUserId(id);
    }
  }, [modals.auth]);

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

  const handleAddList = async () => {
    if (!editList.title || !editList.description) return;

    try {
      await createList(editList).unwrap();
      dispatch(uiActions.closeCreateListModal());
      toast.success(S.lists.created);
    } catch (e) {
      console.error(e);
      toast.error(S.lists.createFailed);
    }
  };

  return (
    <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
            <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
              tierstack.dev
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-[500] text-white cursor-pointer flex-shrink-0"
                  style={{
                    backgroundColor: nameToColor(getUserFromToken().username),
                  }}
                >
                  {getUserFromToken().username[0].toUpperCase()}
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => dispatch(uiActions.openCreateListModal())}
                    className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    + New list
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => dispatch(uiActions.openAuthModal())}
                className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Log in / Sign up
              </button>
            )}
          </div>
        </div>
        {isLoggedIn && (
          <div className="flex sm:hidden items-center gap-2 pb-3 justify-end">
            <button
              onClick={() => dispatch(uiActions.openCreateListModal())}
              className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              + New list
            </button>
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 py-6 max-w-[750px] mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {([0, 1, 2, 3, 4, 5] as const).map((i) => (
              <ListCardSkeleton key={i} variant={(i % 3) as 0 | 1 | 2} />
            ))}
          </div>
        ) : isError ? (
          <ErrorBanner message="Couldn't load lists" onRetry={refetch} />
        ) : (
          <ListsContent
            lists={lists}
            isLoggedIn={isLoggedIn}
            currentUserId={currentUserId}
            isFetching={isFetching}
            onCreateList={() => dispatch(uiActions.openCreateListModal())}
            onLogin={() => dispatch(uiActions.openAuthModal())}
          />
        )}
      </div>

      {/* ── Create list modal ─────────────────────────────────────────────── */}
      <Modal
        open={modals.createList}
        handleClose={() => dispatch(uiActions.closeCreateListModal())}
      >
        <div className="p-6 flex flex-col gap-4">
          <p className="text-rk-primary text-[17px] font-[500]">Create list</p>

          <input
            className="bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-[13px] outline-none placeholder:text-rk-tertiary"
            placeholder="List name"
            value={editList.title}
            onChange={(e) =>
              dispatch(uiActions.updateListMeta({ title: e.target.value }))
            }
            autoFocus
          />

          <input
            className="bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-[13px] outline-none placeholder:text-rk-tertiary"
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
            <span className="text-[13px] text-rk-secondary">Hide list</span>
            <input
              type="checkbox"
              checked={editList.hidden}
              onChange={(e) =>
                dispatch(uiActions.updateListMeta({ hidden: e.target.checked }))
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
              onClick={handleAddList}
              disabled={isCreating}
              className="px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating && (
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
              )}
              Create
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
