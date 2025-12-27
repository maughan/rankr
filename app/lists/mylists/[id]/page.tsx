"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { formatDistance } from "date-fns";
import ImageKit from "imagekit-javascript";
import { toast } from "sonner";
import Image from "next/image";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectRankersByListId } from "@/lib/selectors";
import {
  closeCreateItemModal,
  closeCreateListModal,
  fetchLists,
  filterRankingsByUser,
  getListById,
  openCreateItemModal,
  openUpdateListModal,
  patchList,
  postItem,
  updateItemMeta,
  updateItemPayload,
  updateListMeta,
  updateListPayload,
} from "@/lib/features/lists/listsSlice";

import { getUserFromToken, ImageKitLoader } from "@/lib/helpers";

export default function MyList(props: PageProps<"/lists/[id]">) {
  const { id } = React.use(props.params);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => getListById(state, parseInt(id)));
  const users = useAppSelector(selectRankersByListId(parseInt(id)));
  const modals = useAppSelector((state) => state.lists.modals);
  const editItem = useAppSelector((state) => state.lists.editItem);
  const editList = useAppSelector((state) => state.lists.editList);
  const status = useAppSelector((state) => state.lists.status);
  const filter = useAppSelector((state) => state.lists.userfilter);
  const filteredRankings = useAppSelector(
    (state) => state.lists.filteredListRankings
  );
  const user = getUserFromToken();

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

  const handleOpenCreateList = () => {
    dispatch(openUpdateListModal(list));
  };

  const handleCloseCreateList = () => {
    dispatch(closeCreateListModal());
  };

  const handleItemOnChange = (key: keyof updateItemPayload, value: string) => {
    dispatch(
      updateItemMeta({
        [key]: value,
      })
    );
  };

  const handleListOnChange = (
    key: keyof updateListPayload,
    value: string | boolean
  ) => {
    dispatch(
      updateListMeta({
        [key]: value,
      })
    );
  };

  const handleAddItems = (urls: string[]) => {
    if (!urls || !urls.length) return;

    dispatch(postItem({ listId: parseInt(id), urls }))
      .unwrap()
      .then(() => dispatch(closeCreateItemModal()))
      .then(() => dispatch(fetchLists()))
      .then(() => toast.success("Item(s) added successfully."))
      .catch((e) => {
        toast.error("Failed to add item(s).");
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
      console.log("IMGI", imageUrls);
      handleAddItems(imageUrls);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add items");
    }
  };

  const handleListImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
        updateListMeta({
          img: result.url,
        })
      );

      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    }
  };

  const handleUpdateList = () => {
    if (!editList.title.length || !editList.description.length) return;

    dispatch(patchList({ editList, id: parseInt(id) }))
      .unwrap()
      .then(() => dispatch(closeCreateListModal()))
      .then(() => dispatch(fetchLists()))
      .catch((e) => {
        console.error("e", e);
      });
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

            {list.createdBy.id === user.id ? (
              <button
                onClick={handleOpenCreateList}
                className="rounded-sm font-bold text-black bg-white px-4 py-2 h-min cursor-pointer"
              >
                Edit list
              </button>
            ) : null}
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
            {filteredRankings.map((d) => (
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
                        <div className="h-20 w-20 relative">
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
            ))}
          </div>

          <br />

          <div className="w-full min-h-20 flex flex-wrap">
            {list.items.map((item) => {
              const isRanked = list.tiers.find((tier) =>
                tier.items.includes(item.id)
              );

              if (isRanked) return null;

              return (
                <div className="w-20 h-20 relative">
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

      {modals.createList ? (
        <>
          <div className="fixed z-998 bg-white inset-0 opacity-40" />

          <div className="fixed z-999 place-self-center bg-black h-fit w-9/10 p-8 rounded-sm inset-0 sm:w-100">
            <p className="text-2xl font-bold">Create list</p>

            <div className="flex flex-col gap-8 mt-8 w-full">
              <div className="w-full">
                <p className="font-bold">List name *</p>

                <input
                  aria-label="Item name"
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={editList.title}
                  onChange={(e) => handleListOnChange("title", e.target.value)}
                />
              </div>

              <div>
                <p className="font-bold">Description</p>

                <input
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={editList.description}
                  type="text"
                  onChange={(e) =>
                    handleListOnChange("description", e.target.value)
                  }
                />
              </div>

              <div>
                <p className="font-bold">Image *</p>

                {!editList.img && (
                  <button
                    className="rounded-sm bg-white font-bold text-black px-4 py-2 mt-2 cursor-pointer"
                    onClick={handleUploadButton}
                  >
                    Upload image
                  </button>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleListImageUpload}
                  ref={fileInputRef}
                />

                {editList.img && (
                  <div className="w-24 h-24 relative">
                    <Image
                      loader={ImageKitLoader}
                      src={editList.img}
                      alt="Preview"
                      fill
                      sizes="96px"
                      style={{ objectFit: "cover" }}
                      className="mt-4 object-cover rounded"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <p className="font-bold">Hide list</p>

                <input
                  type="checkbox"
                  checked={editList.hidden}
                  onChange={(e) => {
                    handleListOnChange("hidden", e.target.checked);
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between mt-16">
              <button
                className="rounded-sm bg-red-400 px-4 py-2 font-bold cursor-pointer"
                onClick={handleCloseCreateList}
              >
                Close
              </button>

              <button
                className="rounded-sm bg-green-400 px-4 py-2 font-bold cursor-pointer"
                onClick={handleUpdateList}
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
