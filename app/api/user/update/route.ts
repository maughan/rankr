import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;

    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      throw new Error("Token invalid");
    }

    const data = await req.json();

    const updatedUser = await prisma.user.update({
      where: {
        id: decoded.sub,
        username: decoded.username,
      },
      data: {
        email: data.email,
        username: data.username,
      },
    });

    const newToken = jwt.sign(
      {
        sub: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        tokenVersion: updatedUser.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    biscuits.set({
      name: "auth_token",
      value: newToken,
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return Response.json({ success: true });
  } catch (e) {
    return Response.error();
  }
}
