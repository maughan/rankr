import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

import { Tier, TierItem, TierList } from "@/app/types";
import {
  createNewItem,
  createNewList,
  fetchUserRankings,
  handleDropReorder,
  processRankingData,
  processResponseData,
} from "@/lib/helpers";
import { RootState } from "@/lib/store";

export interface ListState {
  lists: Array<TierList>;
  modals: {
    createList: boolean;
    createTier: boolean;
    createItem: boolean;
  };
  editItem: Pick<TierItem, "title" | "img" | "description">;
  editList: Pick<TierList, "title" | "description">;
  rankings: Tier[];
  status: string;
}

export type updateListPayload = {
  title?: string;
  description?: string;
};

export type updateTierPayload = {
  title?: string;
  color?: string;
  value?: number;
};

export type updateItemPayload = {
  title?: string;
  description?: string;
  img?: string;
};

const listDefaults: any = {
  title: "",
  description: "",
};

const itemDefaults: any = {
  title: "",
  description: "",
  img: "",
};

const initialState: ListState = {
  lists: [],
  modals: {
    createList: false,
    createTier: false,
    createItem: false,
  },
  editItem: itemDefaults,
  editList: listDefaults,
  rankings: [],
  status: "idle",
};

export const fetchLists = createAsyncThunk("lists/fetchLists", async () => {
  const res = await fetch("/api/lists");

  return (await res.json()) as TierList[];
});

export const postItem = createAsyncThunk(
  "lists/postItem",
  async ({
    listId,
    editItem,
  }: {
    listId: number;
    editItem: Pick<TierItem, "img" | "title" | "description">;
  }) => {
    const item = createNewItem(editItem);
    await fetch("/api/items", {
      method: "POST",
      body: JSON.stringify({ ...item, listId }),
    });
  }
);

export const postList = createAsyncThunk(
  "list/postList",
  async ({
    editList,
  }: {
    editList: Pick<TierList, "title" | "description">;
  }) => {
    const list = createNewList(editList);
    await fetch("/api/lists", {
      method: "POST",
      body: JSON.stringify(list),
    });
  }
);

export const postRankings = createAsyncThunk(
  "lists/postRankings",
  async ({ list, rankings }: { list: any; rankings: any[] }) => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth_token="))
      ?.split("=")[1];

    let username = "";

    if (token) {
      const decoded = jwtDecode<{ username: string }>(token);
      username = decoded.username;
    }
    if (!username.length) return;

    const userRankings = processRankingData(rankings, list, username);

    const res = await fetch("/api/rankings", {
      method: "PUT",
      body: JSON.stringify(userRankings),
    });
  }
);

export const listSlice = createSlice({
  name: "lists",
  initialState,
  reducers: {
    updateListMeta: (state, action: PayloadAction<updateListPayload>) => {
      state.editList = { ...state.editList, ...action.payload };
    },
    updateItemMeta: (state, action: PayloadAction<updateItemPayload>) => {
      state.editItem = { ...state.editItem, ...action.payload };
    },
    addItemToList: (state, action: PayloadAction<any>) => {
      state.lists[action.payload.id].tiers.push(action.payload);
    },
    clearLists: (state) => {
      state.lists = [];
    },
    openCreateListModal: (state) => {
      state.editList = listDefaults;
      state.modals.createList = true;
    },
    closeCreateListModal: (state) => {
      state.modals.createList = false;
      state.editList = listDefaults;
    },
    openCreateItemModal: (state) => {
      state.editItem = itemDefaults;
      state.modals.createItem = true;
    },
    closeCreateItemModal: (state) => {
      state.modals.createItem = false;
      state.editItem = itemDefaults;
    },
    handleDropItem: (state, action) => {
      const { over, active } = action.payload;
      state.rankings = handleDropReorder(over, active, state.rankings);
    },
    startRanking: (state, action) => {
      const list = action.payload.list as TierList;
      if (!list) return;

      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth_token="))
        ?.split("=")[1];

      let username = "";

      if (token) {
        const decoded = jwtDecode<{ username: string }>(token);
        username = decoded.username;
      }

      if (!username.length) return;

      const userRankings = fetchUserRankings(list, username);

      state.rankings = list.tiers.map((tier) => {
        // collect all userRankings with the same value
        const correspondingItems = userRankings
          .filter((ranking) => ranking.value === tier.value)
          .map((ranking) => ranking.itemId);

        return {
          ...tier,
          items: correspondingItems,
        };
      });

      if (!state.rankings.length) {
        state.rankings = [...list.tiers];
      }
    },
    filterRankingsByUser: (state, action) => {},
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLists.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchLists.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lists = processResponseData(action.payload);
      })
      .addCase(fetchLists.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(postItem.pending, (state) => {
        state.status = "loading";
      })
      .addCase(postItem.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(postItem.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(postRankings.pending, (state) => {
        state.status = "loading";
      })
      .addCase(postRankings.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(postRankings.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export const {
  updateListMeta,
  updateItemMeta,
  clearLists,
  openCreateListModal,
  closeCreateListModal,
  openCreateItemModal,
  closeCreateItemModal,
  handleDropItem,
  startRanking,
} = listSlice.actions;

export const getListById = (state: RootState, id: number) =>
  state.lists.lists.find((list) => list.id === id);

export default listSlice.reducer;
