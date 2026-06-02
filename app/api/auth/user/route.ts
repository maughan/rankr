import { prisma } from "@/lib/prisma";
import * as argon2 from "argon2";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { isReservedUsername } from "@/lib/reservedUsernames";
import { captureServer, identifyServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";
import { readAnonSession } from "@/lib/anonSession";
import { OnboardingState } from "@/app/generated/prisma/client";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const JWT_SECRET = process.env.JWT_SECRET!;

const OB_STATE_COOKIE = "rk_ob_state";

function setOnboardingStateCookie(
  biscuits: Awaited<ReturnType<typeof cookies>>,
  state: OnboardingState
) {
  biscuits.set({
    name: OB_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days — outlives any reasonable onboarding gap
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    const username = (body.username as string).toLowerCase();

    if (!USERNAME_RE.test(username)) {
      return new Response("Username must be 3–20 characters: letters, numbers, underscores only.", { status: 422 });
    }
    if (isReservedUsername(username)) {
      return new Response("That username is reserved.", { status: 422 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: "insensitive" } as any },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      return new Response("Invalid credentials", { status: 401 });
    }

    // ── Determine initial onboarding state ────────────────────────────────────

    const biscuits = await cookies();

    // 1. Returning anonymous user — they've already had the aha moment.
    const anonToken = await readAnonSession();
    const hasAnonRankings = anonToken
      ? (await prisma.ranking.count({
          where: { anonymous_session_token: anonToken, value: { gt: 0 } },
        })) > 0
      : false;

    // 2. Deep-link arrival — they signed up from a shared list link.
    let shareRefListId: number | null = null;
    const shareRefVal = biscuits.get("rankr_share_ref")?.value;
    if (shareRefVal) {
      try {
        const ref = JSON.parse(shareRefVal) as {
          listId: number;
          refUserId: number;
          visitedAt: string;
        };
        shareRefListId = ref.listId;
      } catch { /* malformed cookie — ignore */ }
    }

    let initialState: OnboardingState;
    if (hasAnonRankings) {
      // Already used the product anonymously — skip onboarding entirely.
      initialState = "completed";
    } else if (shareRefListId !== null) {
      // Came in via a shared link — skip topic pick, go straight to ranking.
      initialState = "in_progress";
    } else {
      initialState = "pending";
    }

    // ── Create user ───────────────────────────────────────────────────────────

    const hashPass = await argon2.hash(password);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashPass,
        onboarding_state: initialState,
        ...(initialState === "in_progress" && {
          onboarding_started_at: new Date(),
          onboarding_picked_topic: "deep_link",
        }),
      },
    });

    if (!newUser) {
      return new Response("Invalid credentials", { status: 401 });
    }

    // ── Auth cookie ───────────────────────────────────────────────────────────

    const token = jwt.sign(
      {
        sub: newUser.id,
        username: newUser.username,
        email: newUser.email,
        tokenVersion: newUser.tokenVersion,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    biscuits.set({
      name: "auth_token",
      value: token,
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // ── Onboarding state cookie (for middleware) ───────────────────────────────

    setOnboardingStateCookie(biscuits, initialState);

    // ── Analytics (fire-and-forget) ───────────────────────────────────────────

    const distinctId = String(newUser.id);
    const phOps: Promise<void>[] = [
      captureServer(distinctId, E.SIGNUP_COMPLETED, {
        user_id: newUser.id,
        username: newUser.username,
      }),
      identifyServer(distinctId, {
        username: newUser.username,
        signed_up_at: newUser.createdAt.toISOString(),
      }),
    ];

    if (shareRefVal && shareRefListId !== null) {
      try {
        const ref = JSON.parse(shareRefVal) as {
          listId: number;
          refUserId: number;
          visitedAt: string;
        };
        const timeToSignup = Math.round(
          (Date.now() - new Date(ref.visitedAt).getTime()) / 1000
        );
        phOps.push(
          captureServer(distinctId, E.SHARED_LINK_VISITOR_SIGNED_UP, {
            ref_list_id: ref.listId,
            ref_user_id: ref.refUserId,
            time_to_first_visit_seconds: timeToSignup,
          })
        );
        biscuits.delete("rankr_share_ref");
      } catch { /* malformed cookie — ignore */ }
    }

    await Promise.all(phOps);

    // ── Response ──────────────────────────────────────────────────────────────

    return Response.json({
      onboarding_state: initialState,
      ...(shareRefListId !== null && { onboarding_list_id: shareRefListId }),
    });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
}
