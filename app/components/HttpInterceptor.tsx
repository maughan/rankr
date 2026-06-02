"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HttpInterceptor() {
  const router = useRouter();

  useEffect(() => {
    const original = window.fetch;

    window.fetch = async (...args) => {
      const response = await original(...args);
      if (response.status === 403) {
        router.replace("/");
      }
      return response;
    };

    return () => {
      window.fetch = original;
    };
  }, [router]);

  return null;
}
