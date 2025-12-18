"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { formatDistance } from "date-fns";
import ImageKit from "imagekit-javascript";
import crypto from "crypto";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectRankersByListId } from "@/lib/selectors";
import {
  closeCreateItemModal,
  fetchLists,
  filterRankingsByUser,
  getListById,
  openCreateItemModal,
  postItem,
  updateItemMeta,
  updateItemPayload,
} from "@/lib/features/lists/listsSlice";
import { toast } from "sonner";
import Image from "next/image";

export default function List(props: PageProps<"/lists/[id]">) {
  const { id } = React.use(props.params);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => getListById(state, parseInt(id)));
  const users = useAppSelector(selectRankersByListId(parseInt(id)));
  const modals = useAppSelector((state) => state.lists.modals);
  const editItem = useAppSelector((state) => state.lists.editItem);
  const status = useAppSelector((state) => state.lists.status);
  const filter = useAppSelector((state) => state.lists.userfilter);
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

  const handleShowItemModal = () => {
    dispatch(openCreateItemModal());
  };

  const handleUploadButton = () => {
    fileInputRef.current?.click(); // triggers the hidden input
  };

  const handleCloseItemModal = () => {
    dispatch(closeCreateItemModal());
  };

  const handleItemOnChange = (key: keyof updateItemPayload, value: string) => {
    dispatch(
      updateItemMeta({
        [key]: value,
      })
    );
  };

  const handleAddItem = () => {
    if (!editItem.title.length || !editItem.img.length) return;

    dispatch(postItem({ listId: parseInt(id), editItem }))
      .unwrap()
      .then(() => dispatch(closeCreateItemModal()))
      .then(() => dispatch(fetchLists()))
      .then(() => toast.success("Item added successfully."))
      .catch((e) => {
        toast.error("Failed to add item.");
        console.error("e", e);
      });
  };

  const handleFilterByUser = (user: string | null) => {
    dispatch(filterRankingsByUser({ user, list }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await fetch("/api/imagekit-auth");
      const { token, expire, signature } = await res.json();
      const result = await imagekit.upload({
        file,
        fileName: `${Date.now()}-${file.name}`,
        folder: "/lists",
        token,
        expire,
        signature,
      } as any);

      dispatch(
        updateItemMeta({
          img: result.url,
        })
      );

      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    }
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
          <p className="text-4xl font-bold">{list.title}</p>

          <p className="italic">{list.description}</p>

          <p className="text-xs flex gap-1">
            Created {formatDistance(list.createdAt, new Date())} by
            <p className="font-bold">{list.createdBy}</p>
          </p>

          <p className="text-xs">
            Last updated {formatDistance(list.updatedAt, new Date())}
          </p>

          <br />

          {!users.length ? null : (
            <div>
              <p className="italic mb-2">Filter results:</p>
              <div className="flex gap-4 items-center flex-wrap">
                {users.map((user) => (
                  <div
                    className={`px-4 py-2 bg-white text-black rounded-md cursor-pointer font-bold ${
                      filter && filter !== user ? "opacity-40" : ""
                    }`}
                    onClick={() => handleFilterByUser(user)}
                  >
                    {user}
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
            {filteredRankings.map((d) => (
              <div className="flex">
                <div
                  style={{ backgroundColor: d.color }}
                  className="text-black text-2xl font-bold p-4 min-w-16 min-h-16 flex justify-center items-center"
                >
                  {d.title}
                </div>
                <div className="flex flex-wrap">
                  {d.items
                    .map((item) => {
                      return list.items.find((it) => it.id === item);
                    })
                    .map(
                      (item) =>
                        item ? (
                          <div className="h-16 w-16 relative">
                            <Image
                              id={item.title}
                              src={item.img}
                              alt={d.title}
                              fill
                              // priority
                            />
                          </div>
                        ) : null

                      // <img src={item?.img} className="h-16 w-16" />
                    )}
                </div>
              </div>
            ))}
          </div>

          <br />

          <div className="w-full min-h-16 flex flex-wrap">
            {list.items.map((item) => {
              const isRanked = list.tiers.find((tier) =>
                tier.items.includes(item.id)
              );

              if (isRanked) return null;

              return (
                <div className="w-16 h-16 relative">
                  <Image
                    src={item.img}
                    alt={item.title}
                    style={{ objectFit: "cover" }}
                    fill
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <br />

      <button
        onClick={handleShowItemModal}
        className="text-black bg-white rounded-sm px-4 py-2 font-bold cursor-pointer"
      >
        Add item
      </button>

      {modals.createItem ? (
        <>
          <div className="fixed z-998 bg-white inset-0 opacity-40" />

          <div className="fixed z-999 place-self-center bg-black w-9/10 sm:w-100 h-fit p-8 rounded-sm inset-0">
            <p className="text-2xl font-bold">Create item</p>

            <div className="flex flex-col gap-8 mt-8 w-full">
              <div className="w-full">
                <p className="font-bold">Item name *</p>

                <input
                  aria-label="Item name"
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={editItem.title}
                  onChange={(e) => handleItemOnChange("title", e.target.value)}
                />
              </div>

              <div>
                <p className="font-bold">Description</p>

                <input
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={editItem.description}
                  type="text"
                  onChange={(e) =>
                    handleItemOnChange("description", e.target.value)
                  }
                />
              </div>

              <div>
                <p className="font-bold">Image *</p>

                {!editItem.img && (
                  <button
                    className="rounded-sm bg-white font-bold text-black px-4 py-2 mt-2"
                    onClick={handleUploadButton}
                  >
                    Upload image
                  </button>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                />

                {editItem.img && (
                  <div className="w-24 h-24 relative">
                    <Image
                      src={editItem.img}
                      alt="Preview"
                      fill
                      style={{ objectFit: "cover" }}
                      className="mt-4 object-cover rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-16">
              <button
                className="rounded-sm bg-red-400 px-4 py-2 font-bold cursor-pointer"
                onClick={handleCloseItemModal}
              >
                Close
              </button>

              <button
                className="rounded-sm bg-green-400 px-4 py-2 font-bold cursor-pointer"
                onClick={handleAddItem}
                disabled={status === "loading"}
              >
                Save
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
