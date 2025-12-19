"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch } from "@/lib/hooks";
import { clearRankings } from "@/lib/features/lists/listsSlice";

export default function RouteChangeHandler() {
  const pathname = usePathname();
  const prev = useRef(pathname);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (prev.current !== pathname) {
      dispatch(clearRankings());
    }
    prev.current = pathname;
  }, [pathname, dispatch]);

  return null;
}
