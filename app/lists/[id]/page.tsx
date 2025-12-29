"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistance } from "date-fns";
import ImageKit from "imagekit-javascript";
import { toast } from "sonner";
import Image from "next/image";

import { useParams } from "next/navigation";

import { useGetListsQuery, useCreateItemsMutation } from "@/lib/api/listsApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import Modal from "../../components/modal";
import Button from "../../components/button";
import { ImageKitLoader } from "@/lib/helpers";
import { selectRankersByListId } from "@/lib/selectors";
import { Tier, TierItem } from "@/app/types";

const DOUBLE_TAP_DELAY = 300;

export default function List() {
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);

  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTap = useRef(0);

  /** RTK Query */
  const { data: lists = [], isLoading } = useGetListsQuery();
  const [createItems] = useCreateItemsMutation();

  const list = lists.find((l) => l.id === listId);

  /** UI state */
  const { modals, imageModalUrl, filteredListRankings, userfilter } =
    useAppSelector((state) => state.ui);

  /** Derived selectors */
  const users = useAppSelector(selectRankersByListId(listId));

  /** Initialize rankings when list loads */
  useEffect(() => {
    if (list) {
      dispatch(
        uiActions.filterRankingsByUser({
          user: null,
          list,
        })
      );
    }
  }, [list, dispatch]);

  /** ImageKit */
  const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    authenticationEndpoint: "/api/imagekit-auth",
  } as any);

  const handlePointerUp = (url: string) => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = 0;
      dispatch(uiActions.openImageModal(url));
    } else {
      lastTap.current = now;
    }
  };

  const handleFilterByUser = (user: number | null) => {
    if (!list) return;
    dispatch(uiActions.filterRankingsByUser({ user, list }));
  };

  const handleUploadButton = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !list) return;

    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file, i) => {
          const res = await fetch("/api/imagekit-auth");
          const { token, expire, signature } = await res.json();

          return imagekit.upload({
            file,
            fileName: `${Date.now()}-${list.title}-${i}`,
            folder: "/lists",
            token,
            expire,
            signature,
          } as any);
        })
      );

      const urls = uploads.map((u) => u.url);
      await createItems({ listId, urls }).unwrap();
      toast.success("Items added successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add items");
    }
  };

  if (isLoading || !list) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-2xl font-bold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-16">
      <div className="flex justify-between">
        <Link
          href="/lists"
          className="px-4 py-2 bg-white text-black rounded-sm font-bold"
        >
          {"< Back"}
        </Link>

        <Link
          href={`/lists/${id}/rank`}
          className="px-4 py-2 bg-orange-200 text-black rounded-sm font-bold"
        >
          Rank it
        </Link>
      </div>

      <br />

      <p className="text-4xl font-bold">{list.title}</p>
      <p className="italic">{list.description}</p>

      <p className="text-xs flex gap-1">
        Created {formatDistance(list.createdAt, new Date())} by
        <span className="font-bold">{list.createdBy.username}</span>
      </p>

      <p className="text-xs">
        Updated {formatDistance(list.updatedAt, new Date())}
      </p>

      <br />

      {!!users.length && (
        <>
          <p className="italic mb-2">Filter results:</p>
          <div className="flex gap-4 flex-wrap">
            {users.map((user) => (
              <div
                key={user.id}
                className={`px-4 py-2 bg-white text-black rounded-md cursor-pointer font-bold ${
                  userfilter && userfilter !== user.id ? "opacity-40" : ""
                }`}
                onClick={() => handleFilterByUser(user.id)}
              >
                {user.username}
              </div>
            ))}

            {userfilter && (
              <div
                className="px-4 py-2 bg-red-400 rounded-sm cursor-pointer font-bold"
                onClick={() => handleFilterByUser(null)}
              >
                Clear filter
              </div>
            )}
          </div>
        </>
      )}

      <br />

      <div className="flex flex-col">
        {filteredListRankings.map((tier) =>
          tier.value === 0 ? null : (
            <div key={tier.id} className="flex">
              <div
                style={{ backgroundColor: tier.color }}
                className="text-black text-2xl font-bold p-4 min-w-20 min-h-20 flex justify-center items-center"
              >
                {tier.title}
              </div>

              <div className="flex flex-wrap">
                {tier.items
                  .map((itemId) =>
                    list.items.find((i: TierItem) => i.id === itemId)
                  )
                  .map(
                    (item) =>
                      item && (
                        <div
                          key={item.id}
                          className="w-20 h-20 relative"
                          onPointerUp={() => handlePointerUp(item.img)}
                        >
                          <Image
                            loader={ImageKitLoader}
                            src={item.img}
                            alt={tier.title}
                            fill
                            sizes="64px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      )
                  )}
              </div>
            </div>
          )
        )}
      </div>

      <br />

      <div className="flex flex-wrap">
        {list.items.map((item: TierItem) => {
          const isRanked = list.tiers.some((t: Tier) =>
            t.items.includes(item.id)
          );

          if (isRanked) return null;

          return (
            <div
              key={item.id}
              className="w-20 h-20 relative"
              onPointerUp={() => handlePointerUp(item.img)}
            >
              <Image
                loader={ImageKitLoader}
                src={item.img}
                alt={item.title}
                fill
                sizes="64px"
                style={{ objectFit: "cover" }}
              />
            </div>
          );
        })}
      </div>

      <br />

      <Button onClick={handleUploadButton}>Add items</Button>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept="image/*"
        onChange={handleImageUpload}
      />

      <Modal
        open={modals.imageModal}
        handleClose={() => dispatch(uiActions.closeImageModal())}
      >
        <div className="relative w-full max-w-md border-2 border-black">
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
