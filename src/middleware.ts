import { NextRequest, NextResponse } from "next/server";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/pricing",
  "/desktop-callback",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/callback",
  "/api/session/verify",
  "/api/version",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  const hasSupabaseCookie = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  if (!hasSupabaseCookie && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (!hasSupabaseCookie && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
