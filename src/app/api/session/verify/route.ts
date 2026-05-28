import { NextRequest, NextResponse } from "next/server";
import { verifyDesktopToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const token = auth.slice(7);
  const payload = await verifyDesktopToken(token);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
  }

  return NextResponse.json({
    valid: true,
    user: {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      plan: payload.plan,
      expiresAt: payload.expiresAt,
    },
  });
}
