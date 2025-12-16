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
      {lists.lists.map((list) => (
        <Link href={`/lists/${list.id}`}>
          {`${list.title} - ${
            list.items.length
          } items - updated ${formatDistance(
            list.updatedAt,
            new Date()
          )} ago - ${list.tags.join(", ")}`}
        </Link>
      ))}
    </div>
  );
}
