"use client";

import { fetchItems } from "@/lib/features/lists/listsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect } from "react";

export default function Items() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.lists.items);
  useEffect(() => {
    if (!items.length) {
      dispatch(fetchItems());
    }
  }, [items]);
  return (
    <div>
      {items.map((item) => (
        <p>{item.title}</p>
      ))}
    </div>
  );
}
