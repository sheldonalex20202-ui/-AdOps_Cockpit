import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createSupabaseServerClient(false);
  await supabase.auth.signOut();
  const res = Response.json({ ok: true });
  res.headers.set("location", "/login");
  return new Response(null, { status: 303, headers: res.headers });
}
