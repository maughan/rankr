"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { toast } from "sonner";
import ImageKit from "imagekit-javascript";
import Image from "next/image";

import { useGetListsQuery, useCreateListMutation } from "@/lib/api/listsApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { ImageKitLoader } from "@/lib/helpers";

export default function Lists() {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RTK Query
  const { data: lists = [], isLoading } = useGetListsQuery();
  const [createList, { isLoading: isCreating }] = useCreateListMutation();

  // UI state
  const { modals, editList } = useAppSelector((state) => state.ui);

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
        folder: "/lists",
        token,
        expire,
        signature,
      } as any);

      dispatch(uiActions.updateListMeta({ img: result.url }));
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    }
  };

  const handleAddList = async () => {
    if (!editList.title || !editList.description) return;

    try {
      await createList(editList).unwrap();
      dispatch(uiActions.closeCreateListModal());
      toast.success("List created successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create list");
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 sm:p-16">
      <div className="flex justify-between">
        <p className="text-3xl font-bold">Tier Lists</p>

        {!isLoading && (
          <button
            onClick={() => dispatch(uiActions.openCreateListModal())}
            className="rounded-sm bg-white font-bold text-black px-4 py-2 cursor-pointer"
          >
            Create list
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center">
          <p className="text-2xl font-bold">Loading...</p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-evenly gap-4 pt-4">
          {lists.map((list) => (
            <Link
              key={list.id}
              className="w-90 h-60 border-1 hover:border-2"
              href={`/lists/${list.id}`}
            >
              <div className="flex flex-col h-full">
                {list.img ? (
                  <div className="relative flex-1">
                    <Image
                      loader={ImageKitLoader}
                      src={list.img}
                      alt=""
                      fill
                      sizes="358px"
                      style={{ objectFit: "cover" }}
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <p>IMG.PNG</p>
                  </div>
                )}

                <div className="h-18 border-t-1 px-4 py-2">
                  <p className="text-2xl font-bold">{list.title}</p>

                  <div className="flex justify-between items-end">
                    <p>{`${list.items.length} item(s)`}</p>

                    <p className="italic text-xs">
                      Updated{" "}
                      {formatDistance(new Date(list.updatedAt), new Date())}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modals.createList && (
        <>
          <div className="fixed inset-0 bg-white opacity-40 z-50" />

          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-black w-9/10 sm:w-100 p-8 rounded-sm">
              <p className="text-2xl font-bold">Create list</p>

              <div className="flex flex-col gap-8 mt-8">
                <input
                  className="border-b-2 bg-transparent outline-none"
                  placeholder="List name"
                  value={editList.title}
                  onChange={(e) =>
                    dispatch(
                      uiActions.updateListMeta({
                        title: e.target.value,
                      })
                    )
                  }
                />

                <input
                  className="border-b-2 bg-transparent outline-none"
                  placeholder="Description"
                  value={editList.description}
                  onChange={(e) =>
                    dispatch(
                      uiActions.updateListMeta({
                        description: e.target.value,
                      })
                    )
                  }
                />

                {!editList.img && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-black px-4 py-2 rounded-sm"
                  >
                    Upload image
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />

                {editList.img && (
                  <div className="relative w-24 h-24">
                    <Image
                      loader={ImageKitLoader}
                      src={editList.img}
                      alt=""
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}

                <label className="flex justify-between items-center">
                  <span>Hide list</span>
                  <input
                    type="checkbox"
                    checked={editList.hidden}
                    onChange={(e) =>
                      dispatch(
                        uiActions.updateListMeta({
                          hidden: e.target.checked,
                        })
                      )
                    }
                  />
                </label>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => dispatch(uiActions.closeCreateListModal())}
                  className="bg-red-400 px-4 py-2 rounded-sm"
                >
                  Close
                </button>

                <button
                  onClick={handleAddList}
                  disabled={isCreating}
                  className="bg-green-400 px-4 py-2 rounded-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
