"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchLists } from "@/lib/features/lists/listsSlice";

export default function Home() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.lists.status);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchLists());
    }
  }, [dispatch, status]);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center font-sans p-16">
      <Link
        className="rounded-sm text-black font-bold px-4 py-2 bg-white"
        href="/lists"
      >
        Go to lists
      </Link>
    </div>
  );
}
