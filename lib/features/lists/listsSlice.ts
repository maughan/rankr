import { Tier, TierItem, TierList } from "@/app/types";
import {
  createNewItem,
  createNewList,
  createNewTier,
  fetchUserRankings,
  handleDropReorder,
  processRankingData,
  processResponseData,
} from "@/lib/helpers";
import { RootState } from "@/lib/store";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ListState {
  lists: Array<TierList>;
  modals: {
    createList: boolean;
    createTier: boolean;
    createItem: boolean;
  };
  // list: TierListMetadata;
  // tier: TierMetaData;
  editItem: Pick<TierItem, "title" | "img" | "description">;
  rankings: Tier[];
  status: string;
}

export type updateListPayload = {
  title?: string;
  description?: string;
  tags?: Array<string>;
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
  createdAt: "",
  updatedAt: "",
  createdBy: "",
  tags: [],
};

const tierDefaults: any = {
  title: "",
  color: "",
  value: 0,
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
    user,
  }: {
    listId: number;
    editItem: Pick<TierItem, "img" | "title" | "description">;
    user: string;
  }) => {
    const item = createNewItem(editItem, user);
    const res = await fetch("/api/items", {
      method: "POST",
      body: JSON.stringify({ ...item, listId }),
    });
  }
);

export const postRankings = createAsyncThunk(
  "lists/postRankings",
  async ({
    list,
    rankings,
    user,
  }: {
    list: any;
    rankings: any[];
    user: string;
  }) => {
    const userRankings = processRankingData(rankings, list, user);

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
    // createList: (state) => {
    //   state.lists = [...state.lists, createNewList(state.list, "Rhys")];
    //   state.modals.createList = false;
    // },
    // createTier: (state) => {
    //   state.lists[0].tiers = [
    //     ...state.lists[0].tiers,
    //     createNewTier(state.tier, "Rhys"),
    //   ];
    //   state.modals.createTier = false;
    // },
    createItem: (state) => {},
    // updateListMeta: (state, action: PayloadAction<updateListPayload>) => {
    //   state.list = { ...state.list, ...action.payload };
    // },
    // updateTierMeta: (state, action: PayloadAction<updateTierPayload>) => {
    //   state.tier = { ...state.tier, ...action.payload };
    // },
    updateItemMeta: (state, action: PayloadAction<updateItemPayload>) => {
      state.editItem = { ...state.editItem, ...action.payload };
    },
    addItemToList: (state, action: PayloadAction<any>) => {
      state.lists[action.payload.id].tiers.push(action.payload);
    },
    clearLists: (state) => {
      state.lists = [];
    },
    // openCreateListModal: (state) => {
    //   state.list = listDefaults;
    //   state.modals.createList = true;
    // },
    // closeCreateListModal: (state) => {
    //   state.modals.createList = false;
    //   state.list = listDefaults;
    // },
    // openCreateTierModal: (state) => {
    //   state.tier = tierDefaults;
    //   state.modals.createTier = true;
    // },
    // closeCreateTierModal: (state) => {
    //   state.modals.createTier = false;
    //   state.tier = tierDefaults;
    // },
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
      const list = state.lists[parseInt(action.payload.id)];

      const userRankings = fetchUserRankings(list, "Rhys");

      if (!userRankings.length) {
        state.rankings = list.tiers.map((tier) => ({ ...tier, items: [] }));
      }

      state.rankings = list.tiers.map((tier) => {
        tier.items = [];
        const correspondingRanking = userRankings.find(
          (ranking) => ranking.value === tier.value
        );

        if (correspondingRanking) tier.items.push(correspondingRanking.id);

        return tier;
      });
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
      .addCase(postItem.fulfilled, (state, action) => {
        state.status = "succeeded";
      })
      .addCase(postItem.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export const {
  // createList,
  // createTier,
  // updateListMeta,
  // updateTierMeta,
  updateItemMeta,
  clearLists,
  createItem,
  // openCreateListModal,
  // closeCreateListModal,
  // openCreateTierModal,
  // closeCreateTierModal,
  openCreateItemModal,
  closeCreateItemModal,
  handleDropItem,
  startRanking,
} = listSlice.actions;

export const selectLists = (state: RootState) => state.lists;

export default listSlice.reducer;
