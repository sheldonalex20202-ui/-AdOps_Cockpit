import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueDesktopToken, verifyDesktopToken } from "@/lib/jwt";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const token = await issueDesktopToken({
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    plan: dbUser.plan,
  });
  const payload = await verifyDesktopToken(token);

  return NextResponse.json({
    token,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      plan: dbUser.plan,
      expiresAt: payload?.expiresAt,
    },
  });
}
