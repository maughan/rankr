import {
  Tier,
  TierItemMetaData,
  TierList,
  TierListMetadata,
  TierMetaData,
} from "@/app/types";
import {
  createMockLists,
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
  list: TierListMetadata;
  tier: TierMetaData;
  item: TierItemMetaData;
  rankings: Tier[];
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

const listDefaults: TierListMetadata = {
  title: "",
  description: "",
  createdAt: "",
  updatedAt: "",
  createdBy: "",
  tags: [],
};

const tierDefaults: TierMetaData = {
  title: "",
  color: "",
  value: 0,
};

const itemDefaults: TierItemMetaData = {
  title: "",
  description: "",
  img: "",
  createdAt: "",
  updatedAt: "",
  createdBy: "",
};

const initialState: ListState = {
  lists: [],
  modals: {
    createList: false,
    createTier: false,
    createItem: false,
  },
  list: {
    ...listDefaults,
  },
  tier: {
    ...tierDefaults,
  },
  item: {
    ...itemDefaults,
  },
  rankings: [],
};

export const fetchLists = createAsyncThunk("lists/fetchLists", async () => {
  return [];
});

export const listSlice = createSlice({
  name: "lists",
  initialState,
  reducers: {
    populateData: (state) => {
      let listData = createMockLists();
      state.lists = processResponseData(listData);
    },
    createList: (state) => {
      state.lists = [...state.lists, createNewList(state.list, "Rhys")];
      state.modals.createList = false;
    },
    createTier: (state) => {
      state.lists[0].tiers = [
        ...state.lists[0].tiers,
        createNewTier(state.tier, "Rhys"),
      ];
      state.modals.createTier = false;
    },
    // createItem: (state) => {
    //   state.lists[0].tiers[0].items = [
    //     ...state.lists[0].tiers[0].items,
    //     createNewItem(state.item, "Rhys"),
    //   ];
    // },
    updateListMeta: (state, action: PayloadAction<updateListPayload>) => {
      state.list = { ...state.list, ...action.payload };
    },
    updateTierMeta: (state, action: PayloadAction<updateTierPayload>) => {
      state.tier = { ...state.tier, ...action.payload };
    },
    updateItemMeta: (state, action: PayloadAction<updateItemPayload>) => {
      state.item = { ...state.item, ...action.payload };
    },
    addItemToList: (state, action: PayloadAction<any>) => {
      state.lists[action.payload.id].tiers.push(action.payload);
    },
    clearLists: (state) => {
      state.lists = [];
    },
    openCreateListModal: (state) => {
      state.list = listDefaults;
      state.modals.createList = true;
    },
    closeCreateListModal: (state) => {
      state.modals.createList = false;
      state.list = listDefaults;
    },
    openCreateTierModal: (state) => {
      state.tier = tierDefaults;
      state.modals.createTier = true;
    },
    closeCreateTierModal: (state) => {
      state.modals.createTier = false;
      state.tier = tierDefaults;
    },
    openCreateItemModal: (state) => {
      state.item = itemDefaults;
      state.modals.createItem = true;
    },
    closeCreateItemModal: (state) => {
      state.modals.createItem = false;
      state.item = itemDefaults;
    },
    handleDropItem: (state, action) => {
      const { over, active } = action.payload;
      state.rankings = handleDropReorder(over, active, state.rankings);
    },
    submitRanks: (state) => {
      state.lists[0] = processRankingData(
        state.rankings,
        state.lists[0],
        "Rhys"
      );
    },
    startRanking: (state, action) => {
      const userRankings = fetchUserRankings(
        state.lists[parseInt(action.payload.id)],
        "Rhys"
      );

      if (!userRankings.length) {
        state.rankings = state.lists[parseInt(action.payload.id)].tiers.map(
          (tier) => ({ ...tier, items: [] })
        );
      }

      state.rankings = state.lists[parseInt(action.payload.id)].tiers.map(
        (tier) => {
          tier.items = [];
          const correspondingRanking = userRankings.find(
            (ranking) => ranking.value === tier.metadata.value
          );

          if (correspondingRanking) tier.items.push(correspondingRanking.id);

          return tier;
        }
      );
    },
    filterRankingsByUser: (state, action) => {},
  },
});

export const {
  createList,
  createTier,
  updateListMeta,
  updateTierMeta,
  updateItemMeta,
  clearLists,
  openCreateListModal,
  closeCreateListModal,
  openCreateTierModal,
  closeCreateTierModal,
  openCreateItemModal,
  closeCreateItemModal,
  populateData,
  handleDropItem,
  submitRanks,
  startRanking,
} = listSlice.actions;

export const selectLists = (state: RootState) => state.lists;

export default listSlice.reducer;
