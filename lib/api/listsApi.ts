import { baseApi } from "./baseApi";
import { TierList, TierItem } from "@/app/types";
import { createNewList, processResponseData } from "@/lib/helpers";

export const listsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getLists: builder.query<any[], void>({
      query: () => "/lists",
      transformResponse: (response: any) => processResponseData(response),
    }),

    getMyLists: builder.query<TierList[], void>({
      query: () => "/user/lists",
    }),

    getItems: builder.query<TierItem[], void>({
      query: () => "/items",
    }),

    createList: builder.mutation<
      void,
      Pick<TierList, "title" | "description" | "img" | "hidden">
    >({
      query: (editList) => ({
        url: "/lists",
        method: "POST",
        body: createNewList(editList),
      }),
    }),

    updateList: builder.mutation<void, { id: number; data: Partial<TierList> }>(
      {
        query: ({ id, data }) => ({
          url: "/lists",
          method: "PATCH",
          body: { id, ...data },
        }),
      }
    ),

    createItems: builder.mutation<void, { listId: number; urls: string[] }>({
      query: (data) => ({
        url: "/items",
        method: "POST",
        body: data,
      }),
    }),

    submitRankings: builder.mutation<void, any[]>({
      query: (userRankings) => ({
        url: `/rankings`,
        method: "PUT",
        body: userRankings,
      }),
    }),
  }),
});

export const {
  useGetListsQuery,
  useGetMyListsQuery,
  useGetItemsQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useCreateItemsMutation,
  useSubmitRankingsMutation,
} = listsApi;
