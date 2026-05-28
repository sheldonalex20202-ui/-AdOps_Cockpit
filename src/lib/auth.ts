import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabase/server";
import { ttlCache } from "./ttl-cache";

export type SessionUser = {
  id: string;
  authUserId: string;
  email: string;
  name: string;
};

export async function getCurrentUser() {
  const supabase = createSupabaseServerClient(true);
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const authUser = session?.user;
  if (!authUser) return null;
  const user = await ttlCache(`profile:${authUser.id}`, 30_000, () =>
    prisma.user.findUnique({ where: { authUserId: authUser.id } })
  );
  if (!user) return null;
  return {
    id: user.id,
    authUserId: user.authUserId,
    email: user.email,
    name: user.name
  } satisfies SessionUser;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
