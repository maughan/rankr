"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { COPY } from "./content";
import { getUserFromToken } from "@/lib/helpers";

export default function FinalCtaButton() {
  const dispatch = useAppDispatch();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(getUserFromToken().id > 0);
  }, []);

  if (isLoggedIn) {
    return (
      <Link
        href="/s"
        className="px-8 py-4 text-[15px] font-[600] bg-rk-accent text-white rounded-[12px] hover:opacity-90 transition-opacity"
      >
        Go to app
      </Link>
    );
  }

  return (
    <button
      onClick={() => dispatch(uiActions.openAuthModal())}
      className="px-8 py-4 text-[15px] font-[600] bg-rk-accent text-white rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer"
    >
      {COPY.finalCta}
    </button>
  );
}
