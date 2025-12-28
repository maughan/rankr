"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeClosed } from "lucide-react";

export default function SignupPage() {
  const [passwordInputType, setPasswordInputType] = useState("password");

  const togglePasswordPrivacy = () => {
    setPasswordInputType(
      passwordInputType === "password" ? "text" : "password"
    );
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const username = formData.get("username");
    const password = formData.get("password");

    const response = await fetch("/api/auth/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    if (response.ok) {
      toast.success("User created successfully.");
      window.location.replace("/");
    } else {
      toast.error("Error creating user.");
    }
  }

  return (
    <div className="flex items-center justify-center flex-col h-screen p-4">
      <form
        onSubmit={handleSubmit}
        className="flex-col flex gap-8 w-full sm:w-100"
      >
        <div className="flex flex-col gap-2">
          <p className="font-bold">Email</p>

          <input
            className="outline-none border-b-2 focus:bg-slate-900"
            type="email"
            name="email"
            placeholder="example@rankr.gg"
            required
          />
        </div>

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

          <div className="flex relative">
            <input
              className="outline-none border-b-2 focus:bg-slate-900 w-full"
              type={passwordInputType}
              name="password"
              placeholder="*******"
              required
            />

            {passwordInputType === "password" ? (
              <Eye
                className="h-4 w-4 absolute top-0 right-0 cursor-pointer"
                onClick={togglePasswordPrivacy}
              />
            ) : (
              <EyeClosed
                className="h-4 w-4 absolute top-0 right-0 cursor-pointer"
                onClick={togglePasswordPrivacy}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            className="rounded-sm bg-white px-4 py-2 font-bold text-black mt-4 cursor-pointer"
            type="submit"
          >
            Sign up
          </button>

          <Link
            href="/login"
            className="rounded-sm bg-white px-4 py-2 font-bold text-black w-full text-center"
          >
            Log in
          </Link>
        </div>
      </form>
    </div>
  );
}
