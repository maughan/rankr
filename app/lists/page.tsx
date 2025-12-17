"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatDistance } from "date-fns";

import {
  closeCreateListModal,
  fetchLists,
  openCreateListModal,
  postList,
  updateListMeta,
  updateListPayload,
} from "@/lib/features/lists/listsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { toast } from "sonner";

export default function Lists() {
  const dispatch = useAppDispatch();
  const lists = useAppSelector((state) => state.lists);
  const status = useAppSelector((state) => state.lists.status);
  const modals = useAppSelector((state) => state.lists.modals);
  const editList = useAppSelector((state) => state.lists.editList);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchLists());
    }
  }, [dispatch, status]);

  const handleOpenCreateList = () => {
    dispatch(openCreateListModal());
  };

  const handleCloseCreateList = () => {
    dispatch(closeCreateListModal());
  };

  const handleOnChange = (key: keyof updateListPayload, value: string) => {
    dispatch(
      updateListMeta({
        [key]: value,
      })
    );
  };

  const handleAddList = () => {
    if (!editList.title.length || !editList.description.length) return;

    dispatch(postList({ editList }))
      .unwrap()
      .then(() => dispatch(closeCreateListModal()))
      .then(() => dispatch(fetchLists()))
      .then(() => toast.success("Item added successfully."))
      .catch((e) => {
        toast.error("Failed to add item.");
        console.error("e", e);
      });
  };

  return (
    <div className="p-16 flex flex-col gap-4">
      <div className="flex justify-between">
        <p className="text-3xl font-bold">Tier Lists</p>

        {!["idle", "loading"].includes(status) ? (
          <button
            onClick={handleOpenCreateList}
            className="rounded-sm bg-white font-bold text-black px-4 py-2 cursor-pointer"
          >
            Create list
          </button>
        ) : null}
      </div>

      {["idle", "loading"].includes(status) ? (
        <div className="flex justify-center items-center">
          <p className="text-2xl font-bold">Loading ...</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 pt-4">
          {lists.lists.map((list) => (
            <Link
              className="w-90 h-60 border-1 hover:border-2"
              href={`/lists/${list.id}`}
            >
              <div className="flex flex-col h-full">
                <div
                  className="flex justify-center items-center"
                  style={{ height: "inherit" }}
                >
                  <p>IMG.PNG</p>
                </div>

                <div className="h-18 border-t-1 px-4 py-2">
                  <p className="text-2xl font-bold">{list.title}</p>

                  <div className="flex justify-between items-end">
                    <p>{`${list.items.length} item(s)`}</p>

                    <p className="italic text-xs">{`Updated: ${formatDistance(
                      list.updatedAt,
                      new Date()
                    )}`}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modals.createList ? (
        <>
          <div className="fixed z-998 bg-white inset-0 opacity-40" />

          <div className="fixed z-999 place-self-center bg-black min-w-100 w-fit h-fit p-8 rounded-sm inset-0">
            <p className="text-2xl font-bold">Create list</p>

            <div className="flex flex-col gap-8 mt-8 w-full">
              <div className="w-full">
                <p className="font-bold">List name *</p>

                <input
                  aria-label="Item name"
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={editList.title}
                  onChange={(e) => handleOnChange("title", e.target.value)}
                />
              </div>

              <div>
                <p className="font-bold">Description</p>

                <input
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={editList.description}
                  type="text"
                  onChange={(e) =>
                    handleOnChange("description", e.target.value)
                  }
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
                onClick={handleAddList}
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
