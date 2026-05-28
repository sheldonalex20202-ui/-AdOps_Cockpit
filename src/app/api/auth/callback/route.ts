import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const desktopCallback = searchParams.get("desktop_callback");
  const desktopState = searchParams.get("desktop_state");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  const supabase = createSupabaseServerClient(false);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  const authUser = data.user;
  const name =
    authUser.user_metadata?.full_name ??
    authUser.user_metadata?.name ??
    authUser.email?.split("@")[0] ??
    "User";

  await prisma.user.upsert({
    where: { authUserId: authUser.id },
    update: {},
    create: {
      authUserId: authUser.id,
      email: authUser.email!,
      name,
    },
  });

  if (desktopCallback) {
    const url = new URL("/desktop-callback", origin);
    url.searchParams.set("callback", desktopCallback);
    if (desktopState) url.searchParams.set("state", desktopState);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL("/me", origin));
}
