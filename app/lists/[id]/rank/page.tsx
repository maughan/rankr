"use client";

import { useEffect } from "react";
import { DndContext } from "@dnd-kit/core";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { formatDistance } from "date-fns";

import {
  useGetListsQuery,
  useSubmitRankingsMutation,
} from "@/lib/api/listsApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import Draggable from "@/app/Draggable";
import Droppable from "@/app/Droppable";
import {
  getUserFromToken,
  ImageKitLoader,
  processRankingData,
} from "@/lib/helpers";
import { Tier, TierItem } from "@/app/types";

export default function Rank() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);

  const dispatch = useAppDispatch();

  /** RTK Query */
  const { data: lists = [], isLoading } = useGetListsQuery();
  const [submitRankings, { isLoading: isSubmitting }] =
    useSubmitRankingsMutation();

  const list = lists.find((l) => l.id === listId);

  /** UI state */
  const { rankings, modals, selectedItems, openTier, imageModalUrl } =
    useAppSelector((state) => state.ui);

  /** Init rankings */
  useEffect(() => {
    if (list && rankings.length === 0) {
      dispatch(uiActions.startRanking(list));
    }
  }, [list]);

  const handleDragEnd = (event: any) => {
    const { over, active } = event;
    if (over) {
      dispatch(
        uiActions.handleDropItem({
          over: over.id,
          active: active.id,
        })
      );
    }
  };

  const handleRankSubmit = async () => {
    if (!list) return;

    try {
      const { id, username } = getUserFromToken();
      const userRankings = processRankingData(
        rankings,
        { id, username },
        list.id
      );

      await submitRankings(userRankings).unwrap();

      toast.success("Ratings saved successfully.");
      router.push(`/lists/${id}`);
      dispatch(uiActions.clearRankings());
    } catch (e) {
      console.error(e);
      toast.error("Error saving rankings.");
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
    <div className={modals.tierItems ? "max-h-screen overflow-hidden" : ""}>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="p-4 sm:p-20">
          <div className="flex justify-between">
            <Link
              href={`/lists/${id}`}
              className="rounded-sm bg-white font-bold text-black px-4 py-2"
            >
              {"< Back"}
            </Link>

            <button
              className="rounded-sm bg-green-400 font-bold px-4 py-2"
              onClick={handleRankSubmit}
              disabled={isSubmitting}
            >
              Submit
            </button>
          </div>

          <br />

          <p className="text-4xl font-bold">{list.title}</p>
          <p className="italic">{list.description}</p>

          <p className="text-xs flex gap-1">
            Created {formatDistance(list.createdAt, new Date())} by
            <span className="font-bold">{list.createdBy.username}</span>
          </p>

          <p className="text-xs">
            Last updated {formatDistance(list.updatedAt, new Date())}
          </p>

          <br />

          <div className="flex flex-col">
            {rankings.map((tier) => (
              <div key={tier.id} className="flex">
                <div
                  style={{ backgroundColor: tier.color }}
                  className="text-black text-2xl font-bold p-4 min-w-20 min-h-20 flex justify-center items-center cursor-pointer"
                  onClick={() => dispatch(uiActions.openTierModal(tier))}
                >
                  {tier.title}
                </div>

                <Droppable id={tier.id}>
                  {tier.items
                    .map((itemId) =>
                      list.items.find((i: TierItem) => i.id === itemId)
                    )
                    .map(
                      (item) =>
                        item && (
                          <Draggable key={item.id} id={item.id} url={item.img}>
                            <div className="w-20 h-20 relative">
                              <Image
                                loader={ImageKitLoader}
                                src={item.img}
                                alt={item.title}
                                fill
                                sizes="64px"
                                style={{ objectFit: "cover" }}
                              />
                            </div>
                          </Draggable>
                        )
                    )}
                </Droppable>
              </div>
            ))}
          </div>

          <br />

          <Droppable id={-1}>
            <div className="flex flex-wrap">
              {list.items.map((item: TierItem) => {
                const isRanked = rankings.some((tier) =>
                  tier.items.includes(item.id)
                );

                if (isRanked) return null;

                return (
                  <Draggable key={item.id} id={item.id} url={item.img}>
                    <div className="w-20 h-20 relative">
                      <Image
                        loader={ImageKitLoader}
                        src={item.img}
                        alt={item.title}
                        fill
                        sizes="64px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  </Draggable>
                );
              })}
            </div>
          </Droppable>
        </div>
      </DndContext>

      {/* Tier modal */}
      {modals.tierItems && (
        <>
          <div className="fixed inset-0 z-40 bg-white opacity-40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-black max-h-[90%] w-[90%] sm:w-full rounded-sm p-4 overflow-auto relative">
              <div className="flex justify-center relative">
                <div
                  style={{ backgroundColor: openTier?.color }}
                  className="text-black text-2xl font-bold p-4 min-w-20 min-h-20 flex justify-center items-center"
                >
                  {openTier?.title}
                </div>

                <X
                  className="absolute top-0 right-0 cursor-pointer"
                  onClick={() => dispatch(uiActions.closeTierModal())}
                />
              </div>

              <div className="flex flex-wrap mt-8 justify-around">
                {list.items.map((item: TierItem) => (
                  <div
                    key={item.id}
                    className={`w-20 h-20 relative border-2 ${
                      selectedItems.includes(item.id)
                        ? "border-green-400"
                        : "border-black"
                    }`}
                    onClick={() =>
                      dispatch(uiActions.toggleSelectItem(item.id))
                    }
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
                ))}
              </div>

              <button
                className="bg-white rounded-sm font-bold text-black px-4 py-2 mt-8"
                onClick={() => dispatch(uiActions.saveTierModal())}
              >
                Submit
              </button>
            </div>
          </div>
        </>
      )}

      {/* Image modal */}
      {modals.imageModal && (
        <>
          <div className="fixed inset-0 z-40 bg-white opacity-40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-black rounded-sm p-4 relative">
              <div className="relative w-full max-w-md">
                <Image
                  loader={ImageKitLoader}
                  src={imageModalUrl}
                  alt=""
                  width={400}
                  height={300}
                  className="w-full h-auto object-contain"
                />
                <button
                  className="absolute top-2 right-2 bg-red-400 rounded-full w-7 h-7 flex items-center justify-center font-bold"
                  onClick={() => dispatch(uiActions.closeImageModal())}
                >
                  X
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
