import { baseApi } from "./baseApi";
import { TierList } from "@/app/types";
import { getUserFromToken, processRankingData } from "@/lib/helpers";

export const rankingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    postRankings: builder.mutation<void, { list: TierList; rankings: any[] }>({
      query: ({ list, rankings }) => {
        const { id, username } = getUserFromToken();

        if (!id) throw new Error("Not authenticated");

        const body = processRankingData(
          rankings,
          { id, username },
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
