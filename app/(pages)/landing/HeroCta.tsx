"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/app/components";

import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { getUserFromToken } from "@/lib/helpers";

import { COPY } from "./content";

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
          <Button
            onClick={() => dispatch(uiActions.openAuthModal())}
            type="primary"
          >
            {COPY.ctaPrimary}
          </Button>

          <Button
            onClick={() => dispatch(uiActions.openAuthModal())}
            type="tertiary"
          >
            {COPY.ctaSecondary}
          </Button>
        </>
      )}
    </div>
  );
}
