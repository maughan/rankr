import { baseApi } from "./baseApi";
import type { NotificationType, NotificationView } from "@/lib/notificationCopy";

export type { NotificationType };

export interface NotificationItem extends NotificationView {
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  unread_count: number;
  nextCursor: number | null;
}

export interface MarkSeenArgs {
  ids?: number[];
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsResponse, void>({
      query: () => "/notifications",
      providesTags: [{ type: "Notifications" as const }],
    }),
    markNotificationsSeen: builder.mutation<void, MarkSeenArgs>({
      query: ({ ids } = {}) => ({
        url: "/notifications/seen",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [{ type: "Notifications" as const }],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationsSeenMutation } = notificationsApi;
