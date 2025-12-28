"use client";

import React, { useEffect } from "react";
import { DndContext } from "@dnd-kit/core";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  clearRankings,
  closeImageModal,
  closeTierModal,
  fetchLists,
  getListById,
  handleDropItem,
  openTierModal,
  postRankings,
  saveTierModal,
  startRanking,
  toggleSelectItem,
} from "@/lib/features/lists/listsSlice";
import Draggable from "@/app/Draggable";
import Droppable from "@/app/Droppable";
import { formatDistance } from "date-fns";
import { ImageKitLoader } from "@/lib/helpers";
import { Tier } from "@/app/types";

export default function Rank(props: PageProps<"/lists/[id]">) {
  const router = useRouter();
  const { id } = React.use(props.params);
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => getListById(state, parseInt(id)));
  const rankings = useAppSelector((state) => state.lists.rankings);
  const status = useAppSelector((state) => state.lists.status);
  const modals = useAppSelector((state) => state.lists.modals);
  const selectedItems = useAppSelector((state) => state.lists.selectedItems);
  const openTier = useAppSelector((state) => state.lists.openTier);
  const imageModalUrl = useAppSelector((state) => state.lists.imageModalUrl);

  useEffect(() => {
    if (status === "idle" && !list) {
      dispatch(fetchLists()).unwrap();
    }

    if (list && rankings.length === 0) {
      dispatch(startRanking({ list }));
    }
  }, [dispatch, status, list, rankings.length]);

  const handleDragEnd = (event: any) => {
    const { over, active } = event;

    if (over) {
      dispatch(handleDropItem({ over: over.id, active: active.id }));
    }
  };

  const handleCloseImageModal = () => {
    dispatch(closeImageModal());
  };

  const handleOpenTierModal = (tier: Tier) => {
    dispatch(openTierModal({ tier }));
  };

  const handleCloseTierModal = () => {
    dispatch(closeTierModal());
  };

  const handleSaveTierModal = () => {
    dispatch(saveTierModal());
  };

  const handleToggleSelectItem = (id: number) => {
    dispatch(toggleSelectItem({ id }));
  };

  const handleRankSubmit = () => {
    if (!list) return;
    dispatch(postRankings({ list, rankings }))
      .unwrap()
      .then(() => toast.success("Ratings saved successfully."))
      .then(() => dispatch(clearRankings()))
      .then(() => router.push(`/lists/${id}`))
      .then(() => dispatch(fetchLists()))
      .catch((e) => {
        toast.error("Error saving rankings.");
        console.error(e);
      });
  };

  if (["idle", "loading"].includes(status) && !list)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-2xl font-bold">Loading ...</p>
      </div>
    );

  return (
    <div
      className={`${modals.tierItems ? "max-h-screen overflow-hidden" : ""}`}
    >
      <DndContext onDragEnd={handleDragEnd}>
        <div className="p-4 sm:p-20">
          <div className="flex justify-between">
            <Link
              className="rounded-sm bg-white font-bold text-black px-4 py-2"
              href={`/lists/${id}`}
            >
              {`< Back`}
            </Link>

            <button
              className="rounded-sm bg-green-400 font-bold px-4 py-2 cursor-pointer"
              onClick={handleRankSubmit}
              disabled={status === "loading"}
            >
              Submit
            </button>
          </div>

          <br />

          {list ? (
            <>
              <p className="text-4xl font-bold">{list.title}</p>

              <p className="italic">{list.description}</p>

              <p className="text-xs flex gap-1">
                Created {formatDistance(list.createdAt, new Date())} by
                <p className="font-bold">{list.createdBy.username}</p>
              </p>

              <p className="text-xs">
                Last updated {formatDistance(list.updatedAt, new Date())}
              </p>

              <br />

              <div className="flex flex-col">
                {rankings.map((d) => (
                  <div className="flex">
                    <div
                      style={{ backgroundColor: d.color }}
                      className="text-black text-2xl font-bold p-4 min-w-20 min-h-20 flex justify-center items-center cursor-pointer"
                      onClick={() => handleOpenTierModal(d)}
                    >
                      {d.title}
                    </div>
                    <Droppable id={d.id}>
                      {d.items
                        .map((item) => {
                          return list.items.find((it) => it.id === item);
                        })
                        .map((item) => (
                          <Draggable id={item?.id} url={item?.img}>
                            {item ? (
                              <div className="w-20 h-20 relative">
                                <Image
                                  loader={ImageKitLoader}
                                  src={item.img}
                                  alt={item.title}
                                  sizes="64px"
                                  fill
                                  priority
                                  style={{ objectFit: "cover" }}
                                />
                              </div>
                            ) : null}
                          </Draggable>
                        ))}
                    </Droppable>
                  </div>
                ))}
              </div>

              <br />

              <div className="w-full h-20">
                <Droppable id={-1}>
                  {list.items.map((item) => {
                    const isRanked = rankings.find((tier) =>
                      tier.items.includes(item.id)
                    );

                    if (isRanked) return null;

                    return (
                      <Draggable id={item.id} url={item.img}>
                        <div className="w-20 h-20 relative">
                          <Image
                            loader={ImageKitLoader}
                            src={item.img}
                            alt={item.title}
                            fill
                            sizes="64px"
                            priority
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      </Draggable>
                    );
                  })}
                </Droppable>
              </div>
            </>
          ) : null}
        </div>
      </DndContext>

      {modals.tierItems ? (
        <>
          <div className="fixed z-998 bg-white inset-0 opacity-40" />

          <div className="fixed z-999 place-self-center bg-black max-h-9/10 overflow-scroll w-9/10 p-8 rounded-sm inset-0 sm:w-100">
            <div className="flex justify-center items-center relative w-full">
              <div
                style={{ backgroundColor: openTier?.color }}
                className="text-black text-2xl font-bold p-4 min-w-20 min-h-20 flex justify-center items-center"
              >
                {openTier?.title}
              </div>

              <p
                className="absolute top-0 right-0 text-xl font-bold"
                onClick={handleCloseTierModal}
              >
                X
              </p>
            </div>

            <div className="flex flex-wrap mt-8 justify-around">
              {list?.items.map((item) => (
                <div
                  className={`w-20 h-20 relative border-2 border-black ${
                    selectedItems.includes(item.id) ? "border-green-400" : ""
                  }`}
                  onClick={() => handleToggleSelectItem(item.id)}
                >
                  <Image
                    loader={ImageKitLoader}
                    src={item.img}
                    alt={item.title}
                    fill
                    sizes="64px"
                    priority
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>

            <button
              className="bg-white rounded-sm font-bold text-black px-4 py-2 mt-8"
              onClick={handleSaveTierModal}
            >
              Submit
            </button>
          </div>
        </>
      ) : null}

      {modals.imageModal ? (
        <>
          <div className="fixed z-998 bg-white inset-0 opacity-40" />

          <div className="fixed z-999 fixed bg-black max-h-9/10 overflow-scroll w-9/10 rounded-sm inset-0 sm:w-100">
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
