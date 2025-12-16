"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatDistance } from "date-fns";

import { fetchLists } from "@/lib/features/lists/listsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function Lists() {
  const dispatch = useAppDispatch();
  const lists = useAppSelector((state) => state.lists);
  const status = useAppSelector((state) => state.lists.status);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchLists());
    }
  }, [dispatch, status]);

  return (
    <div className="p-16 flex flex-col gap-4">
      <p className="text-3xl font-bold">Tier Lists</p>

      {["idle", "loading"].includes(status) ? (
        <div className="flex justify-center items-center">
          <p className="text-2xl font-bold">Loading ...</p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
