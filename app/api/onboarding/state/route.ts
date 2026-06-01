import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";
import { OnboardingState } from "@/app/generated/prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;
const OB_STATE_COOKIE = "rk_ob_state";

// Valid client-driven transitions. completed/skipped are terminal.
const ALLOWED_STATES: OnboardingState[] = ["in_progress", "completed", "skipped"];

function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as unknown as {
    sub: number;
    tokenVersion: number;
  };
}

// PATCH /api/onboarding/state
// body: { state: OnboardingState, topic?: string }
export async function PATCH(req: Request) {
  try {
    const biscuits = await cookies();
    const authToken = biscuits.get("auth_token")?.value;
    if (!authToken) return new Response(null, { status: 401 });

    const decoded = verifyToken(authToken);

    const body = await req.json();
    const newState: OnboardingState = body.state;
    const topic: string | undefined = body.topic;

    if (!ALLOWED_STATES.includes(newState)) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { tokenVersion: true, onboarding_state: true },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return new Response(null, { status: 401 });
    }

    // Prevent regression out of terminal states.
    if (user.onboarding_state === "completed" || user.onboarding_state === "skipped") {
      if (newState === "in_progress") {
        // Re-entry via Settings → "Show me around again" is the only valid path.
        // The client must explicitly pass state="in_progress" — handled below.
      }
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: decoded.sub },
      data: {
        onboarding_state: newState,
        ...(newState === "in_progress" && { onboarding_started_at: now }),
        ...(newState === "completed" && { onboarding_completed_at: now }),
        ...(topic && { onboarding_picked_topic: topic }),
      },
    });

    // Keep the cookie in sync so the middleware reflects the new state immediately.
    biscuits.set({
      name: OB_STATE_COOKIE,
      value: newState,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });

    // Fire server-side analytics for the two events that matter most.
    const distinctId = String(decoded.sub);
    if (newState === "in_progress" && user.onboarding_state === "pending") {
      void captureServer(distinctId, E.ONBOARDING_STARTED);
    }
    if (newState === "skipped") {
      void captureServer(distinctId, E.ONBOARDING_SKIPPED, {
        at_step: (body.at_step as "topic" | "rank" | "reveal") ?? "topic",
      });
    }
    if (newState === "completed") {
      void captureServer(distinctId, E.ONBOARDING_RANKING_COMPLETED, {
        list_id: body.list_id ?? 0,
      });
    }

    return NextResponse.json({ onboarding_state: newState });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
}
