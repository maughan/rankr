"use client";

import React, { useEffect } from "react";
import { DndContext } from "@dnd-kit/core";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  handleDropItem,
  startRanking,
  submitRanks,
} from "@/lib/features/lists/listsSlice";
import Link from "next/link";
import Draggable from "@/app/Draggable";
import Droppable from "@/app/Droppable";

export default function Rank(props: PageProps<"/lists/[id]">) {
  const { id } = React.use(props.params);
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.lists.lists[parseInt(id)]);
  const rankings = useAppSelector((state) => state.lists.rankings);
  useEffect(() => {
    console.log("RANKINGS", rankings);

    if (!rankings.length) {
      dispatch(startRanking({ id }));
    }
  }, [dispatch, id, rankings]);

  const handleDragEnd = (event: any) => {
    const { over, active } = event;
    if (over) {
      dispatch(handleDropItem({ over: over.id, active: active.id }));
    }
  };

  const handleRankSubmit = () => {
    dispatch(submitRanks());
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="p-16">
        <div className="flex justify-between">
          <Link href="/lists">Back</Link>

          <button onClick={handleRankSubmit}>Submit</button>
        </div>

        {list ? (
          <>
            <p className="text-4xl">{list.metadata.title}</p>

            <p>{list.metadata.description}</p>

            <p>
              Created: {list.metadata.createdAt}; by: {list.metadata.createdBy}
            </p>

            <p>Updated: {list.metadata.updatedAt}</p>

            <br />

            <div className="flex flex-col">
              {rankings.map((d) => (
                <div className="flex">
                  <div
                    style={{ backgroundColor: d.metadata.color }}
                    className="text-black text-2xl font-bold p-4 min-w-16 min-h-16 flex justify-center items-center"
                  >
                    {d.metadata.title}
                  </div>
                  <Droppable id={d.id}>
                    {d.items
                      .map((item) => {
                        return list.items.find((it) => it.id === item);
                      })
                      .map((item) => (
                        <Draggable id={item?.id}>
                          <img src={item?.metadata.img} className="h-16 w-16" />
                        </Draggable>
                      ))}
                  </Droppable>
                </div>
              ))}
            </div>

            <div className="w-full h-16">
              <Droppable id={-1}>
                {list.items.map((item) => {
                  const isRanked = rankings.find((tier) =>
                    tier.items.includes(item.id)
                  );

                  if (isRanked) return null;

                  return (
                    <Draggable id={item.id}>
                      <img src={item.metadata.img} className="w-16 h-16" />
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
