// lib/api.ts
import { toast } from "sonner";

export function logout() {
  document.cookie = `auth_token=; Max-Age=0; path=/;`;
  window.location.href = "/login";
}

export async function apiFetch<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const json = await res.json();

  if (!res.ok) {
    if (json?.error === "Invalid token") {
      logout();
    }
    throw new Error(json?.error ?? "API Error");
  }

  return json as T;
}
