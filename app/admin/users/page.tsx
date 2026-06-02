"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ShieldAlert, Search, Loader2, ShieldBan, Clock } from "lucide-react";
import { getUserFromToken } from "@/lib/helpers";
import { formatDistanceStrict } from "date-fns";

interface UserResult {
  id: number;
  username: string;
  display_name: string | null;
  role: string;
  banned_at: string | null;
  suspended_until: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { role } = getUserFromToken();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.users ?? []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  if (role !== "admin" && role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A1220" }}>
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-rk-accent" />
            <h1 className="text-[18px] font-[600] text-rk-primary">User lookup</h1>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
          >
            ← Moderation
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rk-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            placeholder="Search by username…"
            className="w-full pl-9 pr-4 py-2.5 bg-rk-surface border border-rk-stroke rounded-[10px] text-[13px] text-rk-primary placeholder:text-rk-muted focus:outline-none focus:border-rk-accent transition-colors"
          />
          {loading && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-rk-muted" />
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.username.toLowerCase()}`}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-rk-surface border border-rk-stroke rounded-[10px] hover:border-rk-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rk-row flex items-center justify-center text-[12px] font-[600] text-rk-muted">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] font-[500] text-rk-primary">@{u.username}</p>
                    {u.display_name && (
                      <p className="text-[11px] text-rk-muted">{u.display_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.banned_at && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-[500] bg-red-900/20 text-red-400">
                      <ShieldBan size={10} /> Banned
                    </span>
                  )}
                  {u.suspended_until && !u.banned_at && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-[500] bg-amber-900/20 text-amber-400">
                      <Clock size={10} /> Suspended
                    </span>
                  )}
                  {(u.role === "admin" || u.role === "super_admin") && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-[500] bg-rk-accent/10 text-rk-accent capitalize">
                      {u.role.replace("_", " ")}
                    </span>
                  )}
                  <span className="text-[11px] text-rk-muted">
                    {formatDistanceStrict(new Date(u.createdAt), new Date(), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {searched && results.length === 0 && !loading && (
          <p className="text-[13px] text-rk-muted text-center py-8">No users found.</p>
        )}
      </div>
    </div>
  );
}
