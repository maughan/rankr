"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  closeEditUserModal,
  fetchLists,
  openEditUserModal,
  updateUser,
  updateUserMeta,
  updateUserPayload,
} from "@/lib/features/lists/listsSlice";
import { toast } from "sonner";

export default function Home() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.lists.status);
  const modals = useAppSelector((state) => state.lists.modals);
  const userData = useAppSelector((state) => state.lists.editUser);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchLists());
    }
  }, [dispatch, status]);

  const handleOpenEditUser = () => {
    dispatch(openEditUserModal());
  };

  const handleCloseEditUser = () => {
    dispatch(closeEditUserModal());
  };

  const handleUpdateUserData = () => {
    dispatch(updateUser(userData))
      .unwrap()
      .then(() => dispatch(closeEditUserModal()))
      .then(() => toast.success("User updated successfully"))
      .catch((e) => {
        console.error(e);
        toast.error("Failed to update user");
      });
  };

  const handleOnChange = (key: keyof updateUserPayload, value: string) => {
    dispatch(
      updateUserMeta({
        [key]: value,
      })
    );
  };

  return (
    <div className="flex flex-col sm:min-h-screen items-center justify-center font-sans p-16 gap-4">
      <button
        onClick={handleOpenEditUser}
        className="rounded-sm text-black font-bold px-4 py-2 bg-white cursor-pointer absolute top-4 sm:top-6 right-6"
      >
        Edit user
      </button>
      <div className="flex flex-col items-center justify-center font-sans p-16 gap-4">
        <Link
          className="rounded-sm text-black font-bold px-4 py-2 bg-white"
          href="/lists"
        >
          Go to lists
        </Link>
      </div>

      {modals.editUser ? (
        <>
          <div className="fixed z-998 bg-white inset-0 opacity-40" />

          <div className="fixed z-999 place-self-center bg-black h-fit w-9/10 p-8 rounded-sm inset-0 sm:w-100">
            <p className="text-2xl font-bold">Edit user</p>

            <div className="flex flex-col gap-8 mt-8 w-full">
              <div className="w-full">
                <p className="font-bold">Email *</p>

                <input
                  aria-label="Email"
                  type="email"
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={userData.email}
                  onChange={(e) => handleOnChange("email", e.target.value)}
                />
              </div>

              <div className="w-full">
                <p className="font-bold">Username *</p>

                <input
                  aria-label="Username"
                  className="w-full h-8 text-white outline-none border-solid border-white border-b-2 focus:bg-slate-900"
                  value={userData.username}
                  onChange={(e) => handleOnChange("username", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between mt-16">
              <button
                className="rounded-sm bg-red-400 px-4 py-2 font-bold cursor-pointer"
                onClick={handleCloseEditUser}
              >
                Close
              </button>

              <button
                className="rounded-sm bg-green-400 px-4 py-2 font-bold cursor-pointer"
                onClick={handleUpdateUserData}
              >
                Save
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
