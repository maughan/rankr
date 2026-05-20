"use client";

import { useState, useRef, useEffect } from "react";
import { IconDots } from "@tabler/icons-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { getUserFromToken } from "@/lib/helpers";
import {
  useBlockUserMutation,
  useUnblockUserMutation,
} from "@/lib/api/profileApi";
import type { ProfileResponse } from "@/lib/api/profileApi";

interface Props {
  username: string;
  initialFollowing: boolean;
  initialBlocked: boolean;
  viewerIsBlocked: boolean;
}

export default function FollowButton({
  username,
  initialFollowing,
  initialBlocked,
  viewerIsBlocked,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [followHover, setFollowHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const viewer = getUserFromToken();
  const isLoggedIn = viewer.id !== 0;

  const makeFollowMutationOpts = (method: "POST" | "DELETE", delta: 1 | -1) => ({
    mutationFn: () =>
      fetch(`/api/u/${username}/follow`, { method }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["profile", username] });
      const prev = queryClient.getQueryData<ProfileResponse>(["profile", username]);
      queryClient.setQueryData<ProfileResponse>(["profile", username], (old) =>
        old
          ? {
              ...old,
              viewerFollowsThem: method === "POST",
              user: { ...old.user, follower_count: old.user.follower_count + delta },
            }
          : old
      );
      return prev;
    },
    onError: (_: unknown, __: unknown, prev: ProfileResponse | undefined) => {
      queryClient.setQueryData(["profile", username], prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
      if (viewer.username) {
        queryClient.invalidateQueries({ queryKey: ["profile", viewer.username] });
      }
    },
  });

  const { mutate: followUser, isPending: followLoading } = useMutation<void, Error, void, ProfileResponse | undefined>(makeFollowMutationOpts("POST", 1));
  const { mutate: unfollowUser, isPending: unfollowLoading } = useMutation<void, Error, void, ProfileResponse | undefined>(makeFollowMutationOpts("DELETE", -1));
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  if (viewerIsBlocked) return null;

  const handleFollowToggle = () => {
    if (!isLoggedIn) {
      dispatch(uiActions.openAuthModal());
      return;
    }
    const prev = following;
    setFollowing(!prev);
    const mutate = prev ? unfollowUser : followUser;
    mutate(undefined, { onError: () => setFollowing(prev) });
  };

  const handleBlockToggle = async () => {
    setMenuOpen(false);
    const prev = blocked;
    setBlocked(!prev);
    if (!prev) setFollowing(false);
    try {
      if (prev) {
        await unblockUser(username).unwrap();
      } else {
        await blockUser(username).unwrap();
      }
    } catch {
      setBlocked(prev);
    }
  };

  if (blocked) {
    return (
      <button
        onClick={handleBlockToggle}
        className="text-[13px] text-rk-muted border border-rk-stroke rounded-[8px] px-3 py-1.5 hover:border-red-400/50 hover:text-red-400 transition-colors"
      >
        Blocked
      </button>
    );
  }

  const isLoading = followLoading || unfollowLoading;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleFollowToggle}
        disabled={isLoading}
        onMouseEnter={() => setFollowHover(true)}
        onMouseLeave={() => setFollowHover(false)}
        className={`text-[13px] font-[500] rounded-[8px] px-4 py-1.5 transition-colors min-w-[88px] disabled:opacity-60 ${
          following
            ? followHover
              ? "border border-red-400/50 text-red-400"
              : "border border-rk-stroke text-rk-secondary"
            : "bg-rk-accent text-white hover:opacity-90"
        }`}
      >
        {following ? (followHover ? "Unfollow" : "Following") : "Follow"}
      </button>

      {isLoggedIn && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-rk-stroke text-rk-muted hover:text-rk-secondary hover:border-rk-secondary transition-colors"
          >
            <IconDots size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-rk-surface border border-rk-stroke rounded-[8px] shadow-lg min-w-[148px] py-1 overflow-hidden">
              <button
                onClick={handleBlockToggle}
                className="w-full text-left px-3 py-2 text-[13px] text-red-400 hover:bg-rk-stroke/40 transition-colors"
              >
                Block @{username}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
