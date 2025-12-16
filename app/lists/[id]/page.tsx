"use client";

import React from "react";
import Link from "next/link";
import { formatDistance } from "date-fns";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectRankersByListId } from "@/lib/selectors";
import {
  closeCreateItemModal,
  createItem,
  fetchLists,
  getListById,
  openCreateItemModal,
  postItem,
  updateItemMeta,
  updateItemPayload,
} from "@/lib/features/lists/listsSlice";

export default function List(props: PageProps<"/lists/[id]">) {
  const { id } = React.use(props.params);
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => getListById(state, parseInt(id)));
  const users = useAppSelector(selectRankersByListId(parseInt(id)));
  const modals = useAppSelector((state) => state.lists.modals);
  const editItem = useAppSelector((state) => state.lists.editItem);

  const handleShowItemModal = () => {
    dispatch(openCreateItemModal());
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

    dispatch(postItem({ listId: parseInt(id), editItem, user: "Rhys" }))
      .unwrap()
      .then(() => dispatch(closeCreateItemModal()))
      .then(() => dispatch(fetchLists()))
      .catch((e) => console.error("e", e));
  };

  // const handleFilterByUser = (user: string) => {
  //   dispatch(filterRankingsByUser({ id, user }));
  // };

  return (
    <div className="p-16">
      <div className="flex justify-between align-center">
        <Link
          href="/lists"
          className="px-4 py-2 bg-white text-black rounded-sm"
        >{`< Back`}</Link>

        <Link
          href={`/lists/${id}/rank`}
          className="px-4 py-2 bg-orange-200 text-black rounded-sm"
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

          <div className="flex gap-4">
            {users.map((user) => (
              <div
                className="px-4 py-2 bg-white text-black rounded-md cursor-pointer"
                // onClick={}
              >
                {user}
              </div>
            ))}
          </div>

          <br />

          <div className="flex flex-col">
            {list.tiers.map((d) => (
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
                    .map((item) => (
                      <img src={item?.img} className="h-16 w-16" />
                    ))}
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

              return <img src={item.img} className="w-16 h-16" />;
            })}
          </div>
        </>
      ) : null}

      <br />

      <button
        onClick={handleShowItemModal}
        className="text-black bg-white rounded-sm px-4 py-2 cursor-pointer"
      >
        Add item
      </button>

      {modals.createItem ? (
        <>
          <div className="fixed z-998 bg-white inset-0 opacity-40" />

          <div className="fixed z-999 place-self-center bg-black min-w-100 w-fit h-fit p-8 rounded-sm inset-0">
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

                <input
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={editItem.img}
                  type="url"
                  onChange={(e) => handleItemOnChange("img", e.target.value)}
                />
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
