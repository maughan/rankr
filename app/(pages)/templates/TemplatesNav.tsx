"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/app/components";
import NavAvatar from "@/app/components/NavAvatar";
import { getUserFromToken } from "@/lib/helpers";

// In-app nav for the templates gallery (reached from the New-list modal), so it
// matches the feed/library chrome rather than the marketing LandingNav. Login is
// resolved after mount (cookie is client-only); server + first client render show
// the logged-out branch, avoiding a hydration mismatch.
export default function TemplatesNav() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(getUserFromToken().username || null);
  }, []);

  return (
    <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
      <div className="flex justify-between items-center h-12">
        <Logo />

        <div className="flex items-center gap-3">
          {username ? (
            <>
              <NavAvatar username={username} />
              <Link
                href="/feed"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
              >
                Feed
              </Link>
              <Link
                href="/library"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
              >
                Library
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
