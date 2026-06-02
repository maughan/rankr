import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that bypass the pending-onboarding redirect.
const ONBOARDING_SKIP_PREFIXES = ["/onboarding", "/r/", "/community-guidelines"];

function isOnboardingSkip(pathname: string): boolean {
  return ONBOARDING_SKIP_PREFIXES.some((p) => pathname.startsWith(p));
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Impersonation control endpoints are the only mutations allowed during impersonation.
const IMP_CONTROL_PREFIX = "/api/impersonation/";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasAuth = req.cookies.has("auth_token");

  // ── Impersonation write-block ─────────────────────────────────────────────
  // The rk_imp cookie is httpOnly — only the server can set it.
  // Presence means an admin has an active impersonation session.
  // Block all mutations except the impersonation control endpoints themselves.
  if (
    req.cookies.has("rk_imp") &&
    MUTATING_METHODS.has(req.method) &&
    !pathname.startsWith(IMP_CONTROL_PREFIX)
  ) {
    return NextResponse.json(
      {
        error: "Action not allowed during impersonation.",
        code: "IMPERSONATION_WRITE_BLOCKED",
      },
      { status: 403 }
    );
  }

  // ── Auth + onboarding routing ─────────────────────────────────────────────
  if (pathname === "/feed" && !hasAuth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (hasAuth) {
    const obState = req.cookies.get("rk_ob_state")?.value;

    if (obState === "pending" && !isOnboardingSkip(pathname)) {
      return NextResponse.redirect(new URL("/onboarding/topic", req.url));
    }

    if (pathname === "/") {
      return NextResponse.redirect(new URL("/feed", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/api/:path*",
  ],
};
