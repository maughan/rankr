import { createSelector } from "@reduxjs/toolkit";
import { listsApi } from "./api/listsApi";

export const selectRankersByListId = (id: number) =>
  createSelector(
    [
      (state: any) => listsApi.endpoints.getLists.select()(state)?.data ?? [], // get cached lists
    ],
    (lists) => {
      const list = lists.find((list: any) => list.id === id);
      if (!list) return [];

      const usersMap = new Map<number, string>();

      list.items.forEach((item: any) => {
        item.rankings?.forEach((ranking: any) => {
          usersMap.set(ranking.user.id, ranking.user.username);
        });
      });

      return Array.from(usersMap.entries()).map(([id, username]) => ({
        id,
        username,
      }));
    }
  );
