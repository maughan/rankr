import { baseApi } from "./baseApi";
import type { ListPreview } from "@/app/types";

export interface ProfileUser {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  createdAt: string;
}

export interface ProfileResponse {
  user: ProfileUser;
  lists: ListPreview[];
  isOwner: boolean;
}

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<ProfileResponse, string>({
      query: (username) => `/u/${username}`,
    }),
  }),
});

export const { useGetProfileQuery } = profileApi;
