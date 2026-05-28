import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());

    const input = registerSchema.parse(body);
    const admin = createSupabaseAdminClient();

    const { data: authCreated, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { app: "adops-cockpit" },
    });
    if (authError || !authCreated.user) throw new Error(authError?.message ?? "Failed to create auth user");

    const user = await prisma.user.create({
      data: { authUserId: authCreated.user.id, email: input.email, name: input.name },
    });

    const supabase = createSupabaseServerClient(false);
    await supabase.auth.signInWithPassword({ email: input.email, password: input.password });

    const callback = body.callback as string | undefined;
    const state = body.state as string | undefined;

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });

    if (!contentType.includes("application/json")) {
      const next = callback
        ? `/desktop-callback?callback=${encodeURIComponent(callback)}${state ? `&state=${encodeURIComponent(state)}` : ""}`
        : "/me";
      return NextResponse.redirect(new URL(next, req.url), 303);
    }

    return res;
  } catch (error) {
    return fail(error);
  }
}
