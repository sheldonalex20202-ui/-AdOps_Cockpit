import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { issueDesktopToken, verifyDesktopToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

function isLocalhostUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await req.json().catch(() => ({}))
    : Object.fromEntries((await req.formData()).entries());

  const token = await issueDesktopToken({
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    plan: dbUser.plan,
  });
  const payload = await verifyDesktopToken(token);

  const callback = typeof body.callback === "string" ? body.callback : "";
  const state = typeof body.state === "string" ? body.state : "";

  if (callback) {
    if (!isLocalhostUrl(callback)) {
      return NextResponse.json({ error: "INVALID_CALLBACK" }, { status: 400 });
    }

    const target = new URL("/callback", callback);
    target.searchParams.set("token", token);
    target.searchParams.set("userId", dbUser.id);
    target.searchParams.set("email", dbUser.email);
    target.searchParams.set("name", dbUser.name);
    target.searchParams.set("plan", dbUser.plan);
    if (payload?.expiresAt) target.searchParams.set("expiresAt", payload.expiresAt);
    if (state) target.searchParams.set("state", state);

    return NextResponse.redirect(target, 303);
  }

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
