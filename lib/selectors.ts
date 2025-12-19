import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "./store";

export const selectRankersByListId = (id: number) =>
  createSelector(
    (state: RootState) => state.lists.lists.find((list) => list.id === id),
    (list) => {
      if (!list) return [];

      const users: { id: number; username: string }[] = [];

      list.items.forEach((item) =>
        item?.rankings?.forEach((ranking) =>
          users.push({ id: ranking.user.id, username: ranking.user.username })
        )
      );

      return Array.from(new Map(users.map((item) => [item.id, item])).values());
    }
  );
