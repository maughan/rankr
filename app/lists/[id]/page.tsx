"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistance } from "date-fns";
import ImageKit from "imagekit-javascript";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectRankersByListId } from "@/lib/selectors";
import {
  closeCreateItemModal,
  closeImageModal,
  fetchLists,
  filterRankingsByUser,
  getListById,
  openCreateItemModal,
  openImageModal,
  postItem,
  updateItemMeta,
  updateItemPayload,
} from "@/lib/features/lists/listsSlice";
import { toast } from "sonner";
import Image from "next/image";
import { ImageKitLoader } from "@/lib/helpers";

const DOUBLE_TAP_DELAY = 300;

export default function List(props: PageProps<"/lists/[id]">) {
  const { id } = React.use(props.params);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => getListById(state, parseInt(id)));
  const users = useAppSelector(selectRankersByListId(parseInt(id)));
  const modals = useAppSelector((state) => state.lists.modals);
  const status = useAppSelector((state) => state.lists.status);
  const filter = useAppSelector((state) => state.lists.userfilter);
  const imageModalUrl = useAppSelector((state) => state.lists.imageModalUrl);

  const filteredRankings = useAppSelector(
    (state) => state.lists.filteredListRankings
  );

  const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    authenticationEndpoint: "/api/imagekit-auth",
  } as any);

  useEffect(() => {
    if (status === "idle" && !list) {
      dispatch(fetchLists());
    }

    if (list) {
      dispatch(filterRankingsByUser({ user: null, list }));
    }
  }, [dispatch, status, list]);

  const handleUploadButton = () => {
    fileInputRef.current?.click(); // triggers the hidden input
  };

  const lastTap = useRef(0);

  const handleDoubleTap = (url: string) => {
    dispatch(openImageModal({ url }));
  };

  const handlePointerUp = (url: string) => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = 0;
      handleDoubleTap(url);
    } else {
      lastTap.current = now;
    }
  };

  const handleAddItems = (urls: string[]) => {
    if (!urls || !urls.length) return;

    dispatch(postItem({ listId: parseInt(id), urls }))
      .unwrap()
      .then(() => dispatch(closeCreateItemModal()))
      .then(() => dispatch(fetchLists()))
      .then(() => toast.success("Item added successfully."))
      .catch((e) => {
        toast.error("Failed to add item.");
        console.error("e", e);
      });
  };

  const handleFilterByUser = (user: number | null) => {
    dispatch(filterRankingsByUser({ user, list }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    try {
      const uploadPromises = Array.from(files).map(async (file, i) => {
        const res = await fetch("/api/imagekit-auth");
        const { token, expire, signature } = await res.json();
        return imagekit.upload({
          file,
          fileName: `${Date.now()}-${list?.title}-${i}`,
          folder: "/lists",
          token,
          expire,
          signature,
        } as any);
      });

      const results = await Promise.all(uploadPromises);
      const imageUrls = results.map((r) => r.url);
      handleAddItems(imageUrls);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add items");
    }
  };

  const handleCloseImageModal = () => {
    dispatch(closeImageModal());
  };

  if (["idle", "loading"].includes(status) && !list)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-2xl font-bold">Loading ...</p>
      </div>
    );

  return (
    <div className="p-4 sm:p-16">
      <div className="flex justify-between align-center">
        <Link
          href="/lists"
          className="px-4 py-2 bg-white text-black rounded-sm font-bold"
        >{`< Back`}</Link>

        <Link
          href={`/lists/${id}/rank`}
          className="px-4 py-2 bg-orange-200 text-black rounded-sm font-bold"
        >
          Rank it
        </Link>
      </div>

      <br />

      {list ? (
        <>
          <div className="flex justify-between">
            <div>
              <p className="text-4xl font-bold">{list.title}</p>

              <p className="italic">{list.description}</p>

              <p className="text-xs flex gap-1">
                Created {formatDistance(list.createdAt, new Date())} by
                <p className="font-bold">{list.createdBy.username}</p>
              </p>

              <p className="text-xs">
                Last updated {formatDistance(list.updatedAt, new Date())}
              </p>
            </div>
          </div>
          <br />

          {!users.length ? null : (
            <div>
              <p className="italic mb-2">Filter results:</p>
              <div className="flex gap-4 items-center flex-wrap">
                {users.map((user) => (
                  <div
                    className={`px-4 py-2 bg-white text-black rounded-md cursor-pointer font-bold ${
                      filter && filter !== user.id ? "opacity-40" : ""
                    }`}
                    onClick={() => handleFilterByUser(user.id)}
                  >
                    {user.username}
                  </div>
                ))}

                {filter ? (
                  <div
                    className="rounded-sm bg-red-400 font-bold px-4 py-2 cursor-pointer"
                    onClick={() => handleFilterByUser(null)}
                  >
                    Clear filter
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <br />

          <div className="flex flex-col">
            {filteredRankings.map((d) => {
              if (d.value === 0) return null;
              return (
                <div className="flex">
                  <div
                    style={{ backgroundColor: d.color }}
                    className="text-black text-2xl font-bold p-4 min-w-20 min-h-20 flex justify-center items-center"
                  >
                    {d.title}
                  </div>
                  <div className="flex flex-wrap">
                    {d.items
                      .map((item) => {
                        return list.items.find((it) => it.id === item);
                      })
                      .map((item) =>
                        item ? (
                          <div
                            className="h-20 w-20 relative"
                            onPointerUp={() => handlePointerUp(item.img)}
                          >
                            <Image
                              loader={ImageKitLoader}
                              id={item.title}
                              src={item.img}
                              alt={d.title}
                              sizes="64px"
                              fill
                              priority
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                        ) : null
                      )}
                  </div>
                </div>
              );
            })}
          </div>

          <br />

          <div className="w-full min-h-20 flex flex-wrap">
            {list.items.map((item) => {
              const isRanked = list.tiers.find((tier) =>
                tier.items.includes(item.id)
              );

              if (isRanked) return null;

              return (
                <div
                  className="w-20 h-20 relative"
                  onPointerUp={() => handlePointerUp(item.img)}
                >
                  <Image
                    loader={ImageKitLoader}
                    src={item.img}
                    alt={item.title}
                    style={{ objectFit: "cover" }}
                    fill
                    priority
                    sizes="64px"
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <br />

      <button
        className="rounded-sm bg-white font-bold text-black px-4 py-2 mt-2 cursor-pointer"
        onClick={handleUploadButton}
      >
        Add items
      </button>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        multiple
        onChange={handleImageUpload}
        ref={fileInputRef}
      />

      {modals.imageModal ? (
        <>
          <div className="fixed z-998 bg-white inset-0 opacity-40" />

          <div className="fixed z-999 place-self-center bg-black max-h-9/10 overflow-scroll w-9/10 rounded-sm inset-0 sm:w-100">
            <div className="relative w-full max-w-md border-2 border-black">
              <Image
                loader={ImageKitLoader}
                src={imageModalUrl}
                alt={""}
                width={400}
                height={300}
                className="w-full h-auto object-contain"
                priority
              />

              <p
                className="absolute top-2 right-2 font-bold text-black px-2 py-1 bg-red-400 rounded-3xl w-7 h-7 flex items-center justify-center cursor-pointer"
                onClick={handleCloseImageModal}
              >
                X
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
