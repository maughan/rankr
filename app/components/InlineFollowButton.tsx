"use client";

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAppDispatch } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { getUserFromToken } from "@/lib/helpers";
import type { ProfileResponse } from "@/lib/api/profileApi";

interface Props {
  username: string;
  initialFollowing: boolean;
}

export default function InlineFollowButton({ username, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [hover, setHover] = useState(false);

  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const viewer = getUserFromToken();
  const isLoggedIn = viewer.id !== 0;

  const makeOpts = (method: "POST" | "DELETE", delta: 1 | -1) => ({
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

  const { mutate: followUser, isPending: followLoading } = useMutation<void, Error, void, ProfileResponse | undefined>(makeOpts("POST", 1));
  const { mutate: unfollowUser, isPending: unfollowLoading } = useMutation<void, Error, void, ProfileResponse | undefined>(makeOpts("DELETE", -1));

  const handleToggle = () => {
    if (!isLoggedIn) {
      dispatch(uiActions.openAuthModal());
      return;
    }
    const prev = following;
    setFollowing(!prev);
    const mutate = prev ? unfollowUser : followUser;
    mutate(undefined, { onError: () => setFollowing(prev) });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={followLoading || unfollowLoading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`text-[12px] font-[500] rounded-[6px] px-3 py-1 transition-colors min-w-[76px] disabled:opacity-60 flex-shrink-0 ${
        following
          ? hover
            ? "border border-red-400/50 text-red-400"
            : "border border-rk-stroke text-rk-secondary"
          : "bg-rk-accent text-white hover:opacity-90"
      }`}
    >
      {following ? (hover ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}
