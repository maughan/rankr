"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { COPY } from "./content";
import { getUserFromToken } from "@/lib/helpers";

export default function HeroCta() {
  const dispatch = useAppDispatch();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(getUserFromToken().id > 0);
  }, []);

  return (
    <div className="flex items-center gap-3 mt-2">
      {isLoggedIn ? (
        <Link
          href="/feed"
          className="px-6 py-3 text-[14px] font-[600] bg-rk-accent text-white rounded-[10px] hover:opacity-90 transition-opacity"
        >
          Go to app
        </Link>
      ) : (
        <>
          <button
            onClick={() => dispatch(uiActions.openAuthModal())}
            className="px-6 py-3 text-[14px] font-[600] bg-rk-accent text-white rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
          >
            {COPY.ctaPrimary}
          </button>
          <button
            onClick={() => dispatch(uiActions.openAuthModal())}
            className="px-6 py-3 text-[14px] font-[500] text-rk-secondary hover:text-rk-primary transition-colors cursor-pointer"
          >
            {COPY.ctaSecondary}
          </button>
        </>
      )}
    </div>
  );
}
