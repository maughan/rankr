"use client";

import { populateData } from "@/lib/features/lists/listsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectRankersByListId } from "@/lib/selectors";
import Link from "next/link";

export default function Lists() {
  const dispatch = useAppDispatch();
  const lists = useAppSelector((state) => state.lists);

  const popData = () => {
    dispatch(populateData());
  };

  return (
    <div className="p-16 flex flex-col gap-4">
      <button onClick={popData}>Gen</button>
      {lists.lists.map((list) => (
        <Link href={`/lists/${list.id}`}>
          {`${list.metadata.title} - ${list.items.length} items - updated ${
            list.metadata.updatedAt
          } - ${list.metadata.tags.join(", ")}`}
        </Link>
      ))}
    </div>
  );
}
