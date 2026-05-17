"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { COPY } from "./content";
import { getUserFromToken } from "@/lib/helpers";

export default function LandingNav() {
  const dispatch = useAppDispatch();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(getUserFromToken().id > 0);
  }, []);

  return (
    <nav className="flex items-center justify-between px-6 py-4 sm:px-10">
      <span className="text-rk-primary font-bold text-[17px] tracking-tight">
        tierstack.dev
      </span>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <Link
            href="/s"
            className="text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Go to app
          </Link>
        ) : (
          <>
            <button
              onClick={() => dispatch(uiActions.openAuthModal())}
              className="text-[13px] font-[500] text-rk-secondary hover:text-rk-primary transition-colors px-3 py-1.5 cursor-pointer"
            >
              {COPY.ctaSecondary}
            </button>
            <button
              onClick={() => dispatch(uiActions.openAuthModal())}
              className="text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              {COPY.ctaPrimary}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
