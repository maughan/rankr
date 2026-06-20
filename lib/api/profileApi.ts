import { baseApi } from "./baseApi";
import type { ListPreview } from "@/app/types";
import type { ArchetypeSlug, ArchetypeStats } from "@/lib/insightsConfig";

export interface MutualsInfo {
  sample: { username: string; display_name: string | null }[];
  total: number;
}

export interface TasteMatchPreview {
  userId: number;
  username: string;
  displayName: string | null;
  pct: number;
  sharedItems: number;
  sharedLists: number;
}

export interface YouTwo {
  pct: number;
  sharedItems: number;
  sharedLists: number;
}

export interface ProfileUser {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  createdAt: string;
  follower_count: number;
  following_count: number;
  archetype: ArchetypeSlug | null;
  archetype_stats: ArchetypeStats | null;
}

export interface ProfileResponse {
  user: ProfileUser;
  lists: ListPreview[];
  isOwner: boolean;
  viewerFollowsThem: boolean;
  theyFollowViewer: boolean;
  viewerHasBlocked: boolean;
  viewerIsBlocked: boolean;
  mutuals: MutualsInfo | null;
  is_private: boolean;
  taste_matches: { twin: TasteMatchPreview | null; nemesis: TasteMatchPreview | null } | null;
  you_two: YouTwo | null;
}

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<ProfileResponse, string>({
      query: (username) => `/u/${username}`,
      providesTags: (_r, _e, username) => [{ type: "Profile" as const, id: username }],
    }),
    followUser: builder.mutation<void, string>({
      query: (username) => ({ url: `/u/${username}/follow`, method: "POST" }),
      invalidatesTags: (_r, _e, username) => [{ type: "Profile" as const, id: username }],
    }),
    unfollowUser: builder.mutation<void, string>({
      query: (username) => ({ url: `/u/${username}/follow`, method: "DELETE" }),
      invalidatesTags: (_r, _e, username) => [{ type: "Profile" as const, id: username }],
    }),
    blockUser: builder.mutation<void, string>({
      query: (username) => ({ url: `/u/${username}/block`, method: "POST" }),
      invalidatesTags: (_r, _e, username) => [{ type: "Profile" as const, id: username }],
    }),
    unblockUser: builder.mutation<void, string>({
      query: (username) => ({ url: `/u/${username}/block`, method: "DELETE" }),
      invalidatesTags: (_r, _e, username) => [{ type: "Profile" as const, id: username }],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useFollowUserMutation,
  useUnfollowUserMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
} = profileApi;
