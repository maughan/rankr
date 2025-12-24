import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

import { Tier, TierItem, TierList, User } from "@/app/types";
import {
  createNewItem,
  createNewList,
  fetchUserRankings,
  filterListResponseData,
  getUserFromToken,
  handleDropReorder,
  processRankingData,
  processResponseData,
} from "@/lib/helpers";
import { RootState } from "@/lib/store";
import { toast } from "sonner";

export interface ListState {
  items: Array<TierItem>;
  lists: Array<TierList>;
  userLists: Array<TierList>;
  modals: {
    createList: boolean;
    createTier: boolean;
    createItem: boolean;
    editUser: boolean;
  };
  editItem: Pick<TierItem, "title" | "img" | "description">;
  editList: Pick<TierList, "title" | "description" | "img" | "hidden">;
  editUser: Pick<User, "email" | "username">;
  rankings: Tier[];
  filteredListRankings: Tier[];
  userfilter: number | null;
  status: string;
}

export type updateListPayload = {
  title?: string;
  img?: string;
  hidden?: boolean;
  description?: string;
};

export type updateTierPayload = {
  title?: string;
  color?: string;
  value?: number;
};

export type updateUserPayload = {
  email?: string;
  username?: string;
};

export type updateItemPayload = {
  title?: string;
  description?: string;
  img?: string;
};

const listDefaults: any = {
  title: "",
  description: "",
  img: "",
  hidden: true,
};

const itemDefaults: any = {
  title: "",
  description: "",
  img: "",
};

const editUserDefault: any = {
  username: "",
  email: "",
};

const initialState: ListState = {
  items: [],
  lists: [],
  userLists: [],
  modals: {
    createList: false,
    createTier: false,
    createItem: false,
    editUser: false,
  },
  editItem: itemDefaults,
  editList: listDefaults,
  editUser: editUserDefault,
  rankings: [],
  filteredListRankings: [],
  userfilter: null,
  status: "idle",
};

export const fetchItems = createAsyncThunk("lists/fetchItems", async () => {
  const res: any = await fetch("/api/items");
  const resJson = await res.json();

  if (!res.ok) {
    if (resJson.error === "Invalid token") {
      console.log("LOGOUT");

      document.cookie = `auth_token=; Max-Age=0; path=/;`;
      window.location.href = "/login";
      return [];
    }

    toast.error("Error fetching lists");
    return [];
  }

  return resJson.items as TierItem[];
});

export const fetchMyLists = createAsyncThunk("lists/fetchMyLists", async () => {
  const res: any = await fetch("/api/user/lists");
  const resJson = await res.json();

  if (!res.ok) {
    if (resJson.error === "Invalid token") {
      console.log("LOGOUT");

      document.cookie = `auth_token=; Max-Age=0; path=/;`;
      window.location.href = "/login";
      return [];
    }

    toast.error("Error fetching lists");
    return [];
  }

  return resJson.lists as TierList[];
});

export const fetchLists = createAsyncThunk("lists/fetchLists", async () => {
  const res: any = await fetch("/api/lists");

  if (!res.ok) {
    const resJson = await res.json();
    if (resJson.error === "Invalid token") {
      console.log("LOGOUT");

      document.cookie = `auth_token=; Max-Age=0; path=/;`;
      window.location.href = "/login";
      return [];
    }

    toast.error("Error fetching lists");
    return [];
  }

  return (await res.json()) as TierList[];
});

export const updateUser = createAsyncThunk(
  "users/updateUser",
  async (data: Pick<User, "email" | "username">) => {
    const res = await fetch("/api/user/update", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
);

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
    editList: Pick<TierList, "title" | "description" | "img" | "hidden">;
  }) => {
    const list = createNewList(editList);
    await fetch("/api/lists", {
      method: "POST",
      body: JSON.stringify(list),
    });
  }
);

export const patchList = createAsyncThunk(
  "list/patchList",
  async ({
    editList,
    id,
  }: {
    editList: Pick<TierList, "title" | "description" | "img" | "hidden">;
    id: number;
  }) => {
    const res = await fetch("/api/lists", {
      method: "PATCH",
      body: JSON.stringify({ ...editList, id }),
    });

    if (!res.ok) {
      const resJson = await res.json();
      if (resJson.error === "Invalid token") {
        console.log("LOGOUT");

        document.cookie = `auth_token=; Max-Age=0; path=/;`;
        window.location.href = "/login";
        return [];
      }

      throw new Error("MEME");
      toast.error("Failed to update list");
      return;
    }

    if (res.ok) {
      toast.success("List updated successfully");
    }
  }
);

export const postRankings = createAsyncThunk(
  "lists/postRankings",
  async ({ list, rankings }: { list: TierList; rankings: any[] }) => {
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

    const userRankings = processRankingData(
      rankings,
      { id, username },
      list.id
    );

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
    updateUserMeta: (state, action: PayloadAction<updateUserPayload>) => {
      state.editUser = { ...state.editUser, ...action.payload };
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
    openUpdateListModal: (state, action) => {
      const { img, description, hidden, title } = action.payload;
      state.editList = {
        img,
        description,
        hidden,
        title,
      };
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
    openEditUserModal: (state) => {
      const { email, username } = getUserFromToken();
      state.editUser.email = email;
      state.editUser.username = username;
      state.modals.editUser = true;
    },
    closeEditUserModal: (state) => {
      state.modals.editUser = false;
      state.editUser = editUserDefault;
    },
    handleDropItem: (state, action) => {
      const { over, active } = action.payload;
      state.rankings = handleDropReorder(over, active, state.rankings);
    },
    filterRankingsByUser: (
      state,
      action: PayloadAction<{ user: number | null; list: TierList | undefined }>
    ) => {
      const { user, list } = action.payload;

      if (!list) return;

      if (!user) {
        state.filteredListRankings = list.tiers;
        state.userfilter = null;
      } else {
        state.userfilter = user;
        state.filteredListRankings = filterListResponseData(list, user);
      }
    },
    startRanking: (state, action) => {
      const list = action.payload.list as TierList;
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
    clearRankings: (state) => {
      state.rankings = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchItems.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(fetchMyLists.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMyLists.fulfilled, (state, action) => {
        state.userLists = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchMyLists.rejected, (state) => {
        state.status = "failed";
      })
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
  updateUserMeta,
  clearLists,
  openCreateListModal,
  openUpdateListModal,
  closeCreateListModal,
  openCreateItemModal,
  closeCreateItemModal,
  openEditUserModal,
  closeEditUserModal,
  handleDropItem,
  startRanking,
  filterRankingsByUser,
  clearRankings,
} = listSlice.actions;

export const getListById = (state: RootState, id: number) => {
  return state.lists.lists.find((list) => list.id === id);
};

export default listSlice.reducer;
