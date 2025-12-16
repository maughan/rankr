import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "./store";

export const selectRankersByListId = (id: number) =>
  createSelector(
    (state: RootState) => state.lists.lists[id],
    (list) => {
      const users = new Set<string>();

      list.items.forEach((item) =>
        item.rankings.forEach((ranking) => users.add(ranking.user))
      );

      return [...users];
    }
  );
