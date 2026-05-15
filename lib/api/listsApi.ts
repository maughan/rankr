import { baseApi } from "./baseApi";
import { ListPreview, TierList, TierItem } from "@/app/types";
import { createNewList, processResponseData } from "@/lib/helpers";

export const listsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getLists: builder.query<ListPreview[], void>({
      query: () => "/lists",
      providesTags: ["Lists"],
    }),

    getList: builder.query<TierList, number>({
      query: (id) => `/lists/${id}`,
      transformResponse: (response: TierList) =>
        processResponseData([response])[0],
      providesTags: (_result, _err, id) => [{ type: "List", id }],
    }),

    getMyLists: builder.query<TierList[], void>({
      query: () => "/user/lists",
    }),

    getItems: builder.query<TierItem[], void>({
      query: () => "/items",
    }),

    createList: builder.mutation<
      void,
      Pick<TierList, "title" | "description" | "img" | "hidden" | "category_icon" | "category_color">
    >({
      query: (editList) => ({
        url: "/lists",
        method: "POST",
        body: createNewList(editList),
      }),
      invalidatesTags: ["Lists"],
    }),

    updateList: builder.mutation<void, { id: number; data: Partial<TierList> }>(
      {
        query: ({ id, data }) => ({
          url: "/lists",
          method: "PATCH",
          body: { id, ...data },
        }),
        invalidatesTags: (_result, _err, { id }) => [
          "Lists",
          { type: "List", id },
        ],
      }
    ),

    createItems: builder.mutation<void, { listId: number; names: string[] }>({
      query: (data) => ({
        url: "/items",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _err, { listId }) => [
        "Lists",
        { type: "List", id: listId },
      ],
    }),

    submitRankings: builder.mutation<void, any[]>({
      query: (userRankings) => ({
        url: `/rankings`,
        method: "PUT",
        body: userRankings,
      }),
      invalidatesTags: (_result, _err, userRankings) => {
        const listId = userRankings[0]?.listId;
        return listId
          ? ["Lists", { type: "List" as const, id: listId }]
          : ["Lists"];
      },
    }),

    togglePin: builder.mutation<{ pinned: boolean }, number>({
      query: (listId) => ({
        url: `/lists/${listId}/pin`,
        method: "POST",
      }),
      invalidatesTags: ["Lists"],
    }),
  }),
});

export const {
  useGetListsQuery,
  useGetListQuery,
  useGetMyListsQuery,
  useGetItemsQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useCreateItemsMutation,
  useSubmitRankingsMutation,
  useTogglePinMutation,
} = listsApi;
