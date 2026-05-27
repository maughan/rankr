import { baseApi } from "./baseApi";
import { ListPreview, TierList, TierItem } from "@/app/types";
import { createNewList, processResponseData } from "@/lib/helpers";

export interface SubmitRankingsResponse {
  isFirstSubmit: boolean;
}

export interface PayoffData {
  completion: { rankedCount: number; totalCount: number; isComplete: boolean };
  alignment: {
    pct: number;
    withinOneTier: number;
    perfectMatches: number;
    rankerCount: number;
  };
  hottestTake: {
    itemId: number;
    itemName: string;
    yourTier: string;
    crowdMeanTier: string;
    delta: number;
    pctOfRankersDisagree: number;
  } | null;
  closestMatch: {
    userId: number;
    handle: string;
    avatarColor: string;
    alignmentPct: number;
    agreedCount: number;
    totalCount: number;
  } | null;
  tasteNemesis: {
    userId: number;
    handle: string;
    avatarColor: string;
    alignmentPct: number;
    disagreedCount: number;
    totalCount: number;
  } | null;
  extras: {
    contrarianPicks: number;
    perfectMatchCount: number;
    sTierCount: number;
  };
  rankSimilar: {
    id: number;
    short_id: string;
    slug: string;
    title: string;
    description: string | null;
    category: string;
    img: string | null;
    co_ranker_count: number;
  }[];
  shareToken: string | null;
}

export interface SharedListItem {
  id: number;
  img: string | null;
  name: string | null;
  color: string | null;
  short_label: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; username: string };
}

export interface SharedList {
  id: number;
  title: string;
  description: string;
  img: string | null;
  is_shareable: boolean;
  anonymous_rankings_enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; username: string };
  tiers: Array<{
    id: number;
    title: string;
    color: string;
    value: number;
    items: number[];
  }>;
  items: SharedListItem[];
  ranker_count: number;
}

export interface ShareStats {
  is_shareable: boolean;
  share_token: string | null;
  share_token_created_at: string | null;
  anonymous_rankings_enabled: boolean;
  share_url: string | null;
  ranker_count: number;
  authed_ranker_count: number;
  anon_ranker_count: number;
}

export interface ShareResponse {
  share_token: string;
  share_url: string;
}

export interface Invite {
  id: number;
  invite_url: string;
  created_at: string;
}

export interface CreateInviteResponse {
  id: number;
  invite_url: string;
  created_at: string;
}

export const listsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getLists: builder.query<ListPreview[], void>({
      query: () => "/s",
      providesTags: ["Lists"],
    }),

    getList: builder.query<TierList, number>({
      query: (id) => `/s/${id}`,
      transformResponse: (response: TierList) =>
        processResponseData([response])[0],
      providesTags: (_result, _err, id) => [{ type: "List", id }],
    }),

    getMyLists: builder.query<TierList[], void>({
      query: () => "/user/s",
    }),

    getItems: builder.query<TierItem[], void>({
      query: () => "/items",
    }),

    createList: builder.mutation<
      void,
      Pick<
        TierList,
        | "title"
        | "description"
        | "img"
        | "category"
        | "visibility"
      >
    >({
      query: (editList) => ({
        url: "/s",
        method: "POST",
        body: createNewList(editList),
      }),
      invalidatesTags: ["Lists"],
    }),

    updateList: builder.mutation<void, { id: number; data: Partial<TierList> }>(
      {
        query: ({ id, data }) => ({
          url: "/s",
          method: "PATCH",
          body: { id, ...data },
        }),
        invalidatesTags: (_result, _err, { id }) => [
          "Lists",
          { type: "List", id },
        ],
      }
    ),

    copyList: builder.mutation<{ id: number; short_id: string; slug: string }, number>({
      query: (listId) => ({
        url: `/s/${listId}/copy`,
        method: "POST",
      }),
      invalidatesTags: ["Lists"],
    }),

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

    submitRankings: builder.mutation<SubmitRankingsResponse, any[]>({
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
        url: `/s/${listId}/pin`,
        method: "POST",
      }),
      invalidatesTags: ["Lists"],
    }),

    enableShare: builder.mutation<ShareResponse, number>({
      query: (listId) => ({
        url: `/s/${listId}/share`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, listId) => [{ type: "List", id: listId }],
    }),

    disableShare: builder.mutation<void, number>({
      query: (listId) => ({
        url: `/s/${listId}/share`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, listId) => [{ type: "List", id: listId }],
    }),

    updateShare: builder.mutation<
      Partial<ShareResponse & { anonymous_rankings_enabled: boolean }>,
      { listId: number; rotate?: boolean; anonymous_rankings_enabled?: boolean }
    >({
      query: ({ listId, ...body }) => ({
        url: `/s/${listId}/share`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { listId }) => [{ type: "List", id: listId }],
    }),

    updateItem: builder.mutation<
      TierItem,
      { listId: number; itemId: number; name?: string; short_label?: string }
    >({
      query: ({ listId, itemId, ...body }) => ({
        url: `/s/${listId}/items/${itemId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { listId }) => [{ type: "List", id: listId }],
    }),

    deleteItemImage: builder.mutation<
      TierItem,
      { listId: number; itemId: number }
    >({
      query: ({ listId, itemId }) => ({
        url: `/s/${listId}/items/${itemId}/image`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { listId }) => [{ type: "List", id: listId }],
    }),

    deleteItem: builder.mutation<
      { deleted_rankings_count: number },
      { listId: number; itemId: number }
    >({
      query: ({ listId, itemId }) => ({
        url: `/s/${listId}/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { listId }) => [
        "Lists",
        { type: "List", id: listId },
      ],
    }),

    getShareStats: builder.query<ShareStats, number>({
      query: (listId) => `/s/${listId}/share/stats`,
      providesTags: (_r, _e, listId) => [{ type: "List", id: listId }],
    }),

    getSharedList: builder.query<SharedList, string>({
      query: (token) => `/r/${token}`,
      providesTags: (_r, _e, token) => [
        { type: "SharedList" as const, id: token },
      ],
    }),

    getMyRanking: builder.query<
      {
        tiers: Array<{
          id: number;
          title: string;
          color: string;
          value: number;
          items: number[];
        }>;
      } | null,
      string
    >({
      query: (token) => `/r/${token}/my-ranking`,
    }),

    getCreatorRanking: builder.query<
      {
        tiers: Array<{
          id: number;
          title: string;
          color: string;
          value: number;
          items: number[];
        }>;
      } | null,
      string
    >({
      query: (token) => `/r/${token}/creator-ranking`,
    }),

    getPayoff: builder.query<PayoffData, number>({
      query: (listId) => `/s/${listId}/payoff`,
    }),

    getAnonPayoff: builder.query<PayoffData, string>({
      query: (token) => `/r/${token}/payoff`,
    }),

    getInvites: builder.query<Invite[], number>({
      query: (listId) => `/s/${listId}/invites`,
      providesTags: (_r, _e, listId) => [{ type: "Invites" as const, id: listId }],
    }),

    createInvite: builder.mutation<CreateInviteResponse, number>({
      query: (listId) => ({
        url: `/s/${listId}/invites`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, listId) => [{ type: "Invites" as const, id: listId }],
    }),

    revokeInvite: builder.mutation<void, { listId: number; inviteId: number }>({
      query: ({ listId, inviteId }) => ({
        url: `/s/${listId}/invites/${inviteId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { listId }) => [{ type: "Invites" as const, id: listId }],
    }),

    deleteList: builder.mutation<{ success: boolean }, number>({
      query: (listId) => ({ url: `/s/${listId}`, method: "DELETE" }),
      invalidatesTags: ["Lists", "Profile"],
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
  useCopyListMutation,
  useCreateItemsMutation,
  useSubmitRankingsMutation,
  useTogglePinMutation,
  useEnableShareMutation,
  useDisableShareMutation,
  useUpdateShareMutation,
  useUpdateItemMutation,
  useDeleteItemImageMutation,
  useDeleteItemMutation,
  useGetShareStatsQuery,
  useGetSharedListQuery,
  useGetMyRankingQuery,
  useGetCreatorRankingQuery,
  useGetPayoffQuery,
  useGetAnonPayoffQuery,
  useGetInvitesQuery,
  useCreateInviteMutation,
  useRevokeInviteMutation,
  useDeleteListMutation,
} = listsApi;
