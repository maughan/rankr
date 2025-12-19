"use client";

import React, { useEffect } from "react";
import { DndContext } from "@dnd-kit/core";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchLists,
  getListById,
  handleDropItem,
  postRankings,
  startRanking,
} from "@/lib/features/lists/listsSlice";
import Draggable from "@/app/Draggable";
import Droppable from "@/app/Droppable";
import { formatDistance } from "date-fns";

export default function Rank(props: PageProps<"/lists/[id]">) {
  const router = useRouter();
  const { id } = React.use(props.params);
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => getListById(state, parseInt(id)));
  const rankings = useAppSelector((state) => state.lists.rankings);
  const status = useAppSelector((state) => state.lists.status);

  useEffect(() => {
    if (status === "idle" && !list) {
      dispatch(fetchLists())
        .unwrap()
        .then(() => {
          if (!rankings.length) {
            dispatch(startRanking({ list }));
          }
        });
    }

    if (list && !rankings.length) {
      dispatch(startRanking({ list }));
    }
  }, [dispatch, status, rankings]);

  const handleDragEnd = (event: any) => {
    const { over, active } = event;
    if (over) {
      dispatch(handleDropItem({ over: over.id, active: active.id }));
    }
  };

  const handleRankSubmit = () => {
    dispatch(postRankings({ list, rankings }))
      .unwrap()
      .then(() => toast.success("Ratings saved successfully."))
      .then(() => dispatch(fetchLists()))
      .then(() => router.push(`/lists/${id}`))
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
    <DndContext onDragEnd={handleDragEnd}>
      <div className="p-4 sm:p-16">
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
                    className="text-black text-2xl font-bold p-4 min-w-16 min-h-16 flex justify-center items-center"
                  >
                    {d.title}
                  </div>
                  <Droppable id={d.id}>
                    {d.items
                      .map((item) => {
                        return list.items.find((it) => it.id === item);
                      })
                      .map((item) => (
                        <Draggable id={item?.id}>
                          {item ? (
                            <div className="w-16 h-16 relative">
                              <Image
                                src={item.img}
                                alt={item.title}
                                fill
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

            <div className="w-full h-16">
              <Droppable id={-1}>
                {list.items.map((item) => {
                  const isRanked = rankings.find((tier) =>
                    tier.items.includes(item.id)
                  );

                  if (isRanked) return null;

                  return (
                    <Draggable id={item.id}>
                      <div className="w-16 h-16 relative">
                        <Image
                          src={item.img}
                          alt={item.title}
                          fill
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
  );
}
