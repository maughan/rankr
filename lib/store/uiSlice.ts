import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Tier, TierItem, TierList, User } from "@/app/types";
import {
  fetchUserRankings,
  filterListResponseData,
  handleDropReorder,
} from "@/lib/helpers";
import { jwtDecode } from "jwt-decode";

interface UIState {
  modals: {
    createList: boolean;
    createTier: boolean;
    createItem: boolean;
    editUser: boolean;
    tierItems: boolean;
    imageModal: boolean;
  };
  editItem: Pick<TierItem, "title" | "img" | "description">;
  editList: Pick<TierList, "title" | "description" | "img" | "hidden">;
  editUser: Pick<User, "email" | "username">;
  rankings: Tier[];
  filteredListRankings: Tier[];
  userfilter: number | null;
  openTier: Tier | null;
  selectedItems: number[];
  imageModalUrl: string;
}

const initialState: UIState = {
  modals: {
    createList: false,
    createTier: false,
    createItem: false,
    editUser: false,
    tierItems: false,
    imageModal: false,
  },
  editItem: { title: "", img: "", description: "" },
  editList: { title: "", img: "", description: "", hidden: true },
  editUser: { email: "", username: "" },
  rankings: [],
  filteredListRankings: [],
  userfilter: null,
  openTier: null,
  selectedItems: [],
  imageModalUrl: "",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    updateListMeta: (s, a) => {
      s.editList = { ...s.editList, ...a.payload };
    },
    updateItemMeta: (s, a) => {
      s.editItem = { ...s.editItem, ...a.payload };
    },
    openImageModal: (s, a: PayloadAction<string>) => {
      s.imageModalUrl = a.payload;
      s.modals.imageModal = true;
    },
    closeImageModal: (s) => {
      s.modals.imageModal = false;
      s.imageModalUrl = "";
    },
    handleDropItem: (s, a) => {
      const { over, active } = a.payload;
      s.rankings = handleDropReorder(over, [active], s.rankings);
    },
    clearRankings: (s) => {
      s.rankings = [];
    },
    openTierModal: (s, a) => {
      s.modals.createTier = true;
      s.openTier = a.payload;
    },
    closeTierModal: (s) => {
      s.modals.createTier = false;
      s.openTier = null;
    },
    saveTierModal: (s) => {
      s.rankings = handleDropReorder(
        s.openTier?.id ?? 0,
        s.selectedItems,
        s.rankings
      );
      s.modals.tierItems = false;
      s.openTier = null;
      s.selectedItems = [];
    },
    toggleSelectItem: (s, a) => {
      const { id } = a.payload;
      s.selectedItems.includes(id)
        ? (s.selectedItems = s.selectedItems.filter((item) => item !== id))
        : (s.selectedItems = [...s.selectedItems, id]);
    },
    openCreateListModal: (s) => {
      s.modals.createList = true;
    },
    closeCreateListModal: (s) => {
      s.modals.createList = false;
      s.editList = { title: "", img: "", description: "", hidden: true };
    },
    filterRankingsByUser: (
      s,
      a: PayloadAction<{ user: number | null; list: TierList | undefined }>
    ) => {
      const { user, list } = a.payload;

      if (!list) return;

      if (!user) {
        s.filteredListRankings = list.tiers;
        s.userfilter = null;
      } else {
        s.userfilter = user;
        s.filteredListRankings = filterListResponseData(list, user);
      }
    },
    startRanking: (state, action) => {
      const list = action.payload as TierList;
      if (!list) return;

      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth_token="))
        ?.split("=")[1];

      let username = "";
      let id = 0;

      if (token) {
        const decoded = jwtDecode<{ sub: number; username: string }>(token);
        username = decoded.username;
        id = decoded.sub;
      }

      if (!username.length) return;
      if (id === 0) return;

      const userRankings = fetchUserRankings(list, id);

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
  },
});

export const uiActions = uiSlice.actions;
export default uiSlice.reducer;
