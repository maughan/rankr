"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, LogOut, ShieldAlert } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { baseApi } from "@/lib/api/baseApi";
import { nameToColor } from "@/lib/itemColor";
import { getUserFromToken } from "@/lib/helpers";
import { usePostHog } from "posthog-js/react";

export default function NavAvatar({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const ph = usePostHog();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const signOut = () => {
    ph?.reset(); // disassociate this browser session from the user
    // auth_token is httpOnly: false so we can clear it client-side
    document.cookie = "auth_token=; max-age=0; path=/;";
    dispatch(baseApi.util.resetApiState());
    window.location.href = "/";
  };

  const { role } = getUserFromToken();
  const isSuperAdmin = role === "super_admin";

  const color = nameToColor(username);
  const initial = username[0]?.toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-[500] text-white cursor-pointer hover:opacity-85 transition-opacity"
        style={{ backgroundColor: color }}
        aria-label="User menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-rk-surface border border-rk-stroke rounded-[10px] shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-rk-stroke">
            <p className="text-[12px] text-rk-muted truncate">@{username}</p>
          </div>

          <Link
            href={`/u/${username}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-rk-secondary hover:text-rk-primary hover:bg-rk-row transition-colors"
          >
            <User size={13} />
            Profile
          </Link>

          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-rk-secondary hover:text-rk-primary hover:bg-rk-row transition-colors"
          >
            <Settings size={13} />
            Settings
          </Link>

          {isSuperAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-rk-accent hover:text-rk-primary hover:bg-rk-row transition-colors"
            >
              <ShieldAlert size={13} />
              Admin
            </Link>
          )}

          <div className="border-t border-rk-stroke">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-rk-muted hover:text-rk-secondary hover:bg-rk-row transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
