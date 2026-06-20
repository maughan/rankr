// Signed reference to a sharer's result, embedded in a /r/[token]/v/[ref] URL.
//
// The OG image route is hit by crawlers with no cookie, so identity cannot come
// from a session — it must travel in the URL. Signing with JWT_SECRET makes the
// ref unforgeable: a crawler can render a ref it was given, but cannot mint one
// for an arbitrary userId / anon session. Read the secret at call time so the
// value is never captured at module load (and so tests can swap it).

import jwt from "jsonwebtoken";

export type VerdictIdentity =
  | { k: "user"; id: number }
  | { k: "anon"; sid: string };

export type VerdictTemplate = "verdict" | "hot-takes" | "crowd";

export interface VerdictRef {
  l: number; // listId
  i: VerdictIdentity; // sharer identity
  t: VerdictTemplate; // chosen card template
}

const TEMPLATES: VerdictTemplate[] = ["verdict", "hot-takes", "crowd"];

// Defence in depth: a validly-signed token with the wrong claims (e.g. an old
// ref format) must still be rejected, not trusted because the signature checks.
function isVerdictRef(x: unknown): x is VerdictRef {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  if (typeof r.l !== "number" || !Number.isFinite(r.l)) return false;
  if (!TEMPLATES.includes(r.t as VerdictTemplate)) return false;
  const i = r.i as Record<string, unknown> | undefined;
  if (!i || typeof i !== "object") return false;
  if (i.k === "user") return typeof i.id === "number" && Number.isFinite(i.id);
  if (i.k === "anon") return typeof i.sid === "string" && i.sid.length > 0;
  return false;
}

export function signVerdictRef(ref: VerdictRef): string {
  return jwt.sign({ l: ref.l, i: ref.i, t: ref.t }, process.env.JWT_SECRET!, {
    algorithm: "HS256",
    noTimestamp: true, // durable link — no iat/exp
  });
}

export function verifyVerdictRef(ref: string): VerdictRef | null {
  if (!ref) return null;
  try {
    const decoded = jwt.verify(ref, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
    });
    if (!isVerdictRef(decoded)) return null;
    return { l: decoded.l, i: decoded.i, t: decoded.t };
  } catch {
    return null;
  }
}
