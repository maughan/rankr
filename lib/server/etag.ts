import { createHash } from "crypto";

export function computeETag(data: unknown): string {
  return `"${createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 27)}"`;
}

export function checkETagMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(",")
    .map((e) => e.trim())
    .includes(etag);
}
