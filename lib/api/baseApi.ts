import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { User } from "@/app/types";

export const baseApi = createApi({
  reducerPath: "api",
  tagTypes: ["Lists", "List", "SharedList", "Profile", "Invites", "Notifications"],
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  endpoints: (builder) => ({
    updateUser: builder.mutation<User, Partial<User>>({
      query: (user) => ({
        url: "/user/update",
        method: "POST",
        body: user,
      }),
    }),
  }),
});

export const { useUpdateUserMutation } = baseApi;
