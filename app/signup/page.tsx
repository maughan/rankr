"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    const response = await fetch("/api/auth/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      toast.success("User created successfully.");
      router.push("/lists");
    } else {
      toast.error("Error creating user.");
    }
  }

  return (
    <div className="flex items-center justify-center flex-col h-screen">
      <form onSubmit={handleSubmit} className="flex-col flex gap-8">
        <div className="flex flex-col gap-2">
          <p className="font-bold">Username</p>

          <input
            className="outline-none border-b-2 focus:bg-slate-900"
            type="text"
            name="username"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-bold">Password</p>

          <input
            className="outline-none border-b-2 focus:bg-slate-900"
            type="password"
            name="password"
            required
          />
        </div>

        <button
          className="rounded-sm bg-white px-4 py-2 font-bold text-black mt-4 cursor-pointer"
          type="submit"
        >
          Sign up
        </button>
      </form>

      <Link
        href="/login"
        className="rounded-sm bg-white px-4 py-2 font-bold text-black mt-4 w-42 text-center"
      >
        Log in
      </Link>
    </div>
  );
}
