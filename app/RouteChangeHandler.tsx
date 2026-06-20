"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";

export default function RouteChangeHandler() {
  const pathname = usePathname();
  const prev = useRef(pathname);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (prev.current !== pathname) {
      dispatch(uiActions.clearRankings());
    }
    prev.current = pathname;
  }, [pathname, dispatch]);

  return null;
}
