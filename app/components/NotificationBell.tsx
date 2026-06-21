"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceStrict } from "date-fns";
import {
  useGetNotificationsQuery,
  useMarkNotificationsSeenMutation,
  type NotificationItem,
} from "@/lib/api/notificationsApi";
import { notificationCopy } from "@/lib/notificationCopy";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data } = useGetNotificationsQuery();
  const [markSeen] = useMarkNotificationsSeenMutation();

  const items = data?.items ?? [];
  const unread = data?.unread_count ?? 0;
  const unreadLabel = unread > 9 ? "9+" : String(unread);

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

  const onItemClick = (item: NotificationItem) => {
    const { href } = notificationCopy(item);
    if (!item.read) markSeen({ ids: [item.id] });
    setOpen(false);
    router.push(href);
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-7 h-7 rounded-full flex items-center justify-center text-rk-secondary hover:text-rk-primary cursor-pointer transition-colors"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-rk-accent text-white text-[9px] font-[600] flex items-center justify-center leading-none"
            aria-hidden="true"
          >
            {unreadLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-rk-surface border border-rk-stroke rounded-[10px] shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-rk-stroke">
            <p className="text-[12px] font-[500] text-rk-primary">Notifications</p>
            {items.length > 0 && (
              <button
                onClick={() => markSeen({})}
                className="text-[11px] text-rk-muted hover:text-rk-secondary transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-5 text-[12px] text-rk-muted text-center">
                No notifications yet.
              </p>
            ) : (
              items.map((item) => {
                const { text } = notificationCopy(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-rk-row transition-colors cursor-pointer"
                  >
                    <span
                      className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        item.read ? "bg-transparent" : "bg-rk-accent"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] text-rk-secondary">
                        {text}
                      </span>
                      <span className="block text-[11px] text-rk-tertiary mt-0.5">
                        {formatDistanceStrict(new Date(item.createdAt), new Date(), {
                          addSuffix: true,
                        })}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
