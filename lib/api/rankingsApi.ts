import { baseApi } from "./baseApi";
import { TierList } from "@/app/types";
import { jwtDecode } from "jwt-decode";
import { processRankingData } from "@/lib/helpers";

export const rankingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    postRankings: builder.mutation<void, { list: TierList; rankings: any[] }>({
      query: ({ list, rankings }) => {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth_token="))
          ?.split("=")[1];

        if (!token) throw new Error("Not authenticated");

        const { sub, username } = jwtDecode<{ sub: number; username: string }>(
          token
        );

        const body = processRankingData(
          rankings,
          { id: sub, username },
          list.id
        );

        return {
          url: "/rankings",
          method: "PUT",
          body,
        };
      },
    }),
  }),
});

export const { usePostRankingsMutation } = rankingsApi;
