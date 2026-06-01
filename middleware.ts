import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that bypass the pending-onboarding redirect.
const ONBOARDING_SKIP_PREFIXES = ["/onboarding", "/r/", "/community-guidelines"];

function isOnboardingSkip(pathname: string): boolean {
  return ONBOARDING_SKIP_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const hasAuth = req.cookies.has("auth_token");
  const { pathname } = req.nextUrl;

  // Unauthenticated users can't access the feed.
  if (pathname === "/feed" && !hasAuth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (hasAuth) {
    const obState = req.cookies.get("rk_ob_state")?.value;

    // Pending users are funnelled into onboarding before they can do anything else.
    if (obState === "pending" && !isOnboardingSkip(pathname)) {
      return NextResponse.redirect(new URL("/onboarding/topic", req.url));
    }

    // Landing page → feed for everyone who has already onboarded.
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/feed", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
