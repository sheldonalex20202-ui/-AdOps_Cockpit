import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());

    const input = loginSchema.parse(body);
    const supabase = createSupabaseServerClient(false);
    const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) throw new Error(error.message);

    // Desktop auth flow: redirect to desktop-callback with params
    const callback = body.callback as string | undefined;
    const state = body.state as string | undefined;

    const res = NextResponse.json({ ok: true });

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
