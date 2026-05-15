import { createSelector } from "@reduxjs/toolkit";
import { listsApi } from "./api/listsApi";
import { getUserFromToken } from "./helpers";

export const selectRankersByListId = (id: number) =>
  createSelector(
    [(state: any) => listsApi.endpoints.getList.select(id)(state)?.data],
    (list) => {
      if (!list) return [];

      const usersMap = new Map<number, string>();

      list.items.forEach((item: any) => {
        item.rankings?.forEach((ranking: any) => {
          usersMap.set(ranking.user.id, ranking.user.username);
        });
      });
      const user = getUserFromToken();
      return Array.from(usersMap.entries())
        .map(([id, username]) => ({
          id,
          username,
        }))
        .filter((u) => u.id !== user.id);
    }
  );
