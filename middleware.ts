import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const hasAuth = req.cookies.has("auth_token");
  const { pathname } = req.nextUrl;

  if (pathname === "/" && hasAuth) {
    return NextResponse.redirect(new URL("/feed", req.url));
  }
  if (pathname === "/feed" && !hasAuth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/feed"],
};
