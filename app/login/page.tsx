"use client";

export default function Login() {
  return (
    <div className="flex flex-col justify-center items-center p-16 gap-16 h-screen">
      <p className="text-4xl font-bold">Sign in</p>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col">
          <p>Username</p>

          <input className="bg-white" />
        </div>

        <div className="flex flex-col">
          <p>Password</p>

          <input className="bg-white" />
        </div>

        <div className="flex justify-end">
          <button>Go</button>
        </div>
      </div>
    </div>
  );
}
