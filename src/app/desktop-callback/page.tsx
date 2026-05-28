import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { planLabels } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { issueDesktopToken, verifyDesktopToken } from "@/lib/jwt";
import { RedirectClient } from "./RedirectClient";

function isLocalhostUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

interface Props {
  searchParams: Promise<{ callback?: string; state?: string }>;
}

export default async function DesktopCallbackPage({ searchParams }: Props) {
  const { callback, state } = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    const loginUrl = callback
      ? `/login?callback=${encodeURIComponent(callback)}${state ? `&state=${encodeURIComponent(state)}` : ""}`
      : "/login";
    redirect(loginUrl);
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  // Validate callback – must be localhost only
  if (callback && !isLocalhostUrl(callback)) {
    return <RedirectClient redirectUrl={null} error="Недопустимый адрес перенаправления." />;
  }

  let redirectUrl: string | null = null;

  if (callback) {
    const token = await issueDesktopToken({
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      plan: dbUser.plan,
    });
    const tokenPayload = await verifyDesktopToken(token);

    const target = new URL("/callback", callback);
    target.searchParams.set("token", token);
    target.searchParams.set("userId", dbUser.id);
    target.searchParams.set("email", dbUser.email);
    target.searchParams.set("name", dbUser.name);
    target.searchParams.set("plan", dbUser.plan);
    if (tokenPayload?.expiresAt) target.searchParams.set("expiresAt", tokenPayload.expiresAt);
    if (state) target.searchParams.set("state", state);

    redirectUrl = target.toString();
  }

  const pricingHref = callback
    ? `/pricing?returnTo=${encodeURIComponent(`/desktop-callback?callback=${encodeURIComponent(callback)}${state ? `&state=${encodeURIComponent(state)}` : ""}`)}`
    : "/pricing";

  return (
    <RedirectClient
      redirectUrl={redirectUrl}
      error={null}
      account={{
        name: dbUser.name,
        email: dbUser.email,
        plan: dbUser.plan,
        planLabel: planLabels[dbUser.plan],
        planExpiresAt: dbUser.planExpiresAt?.toISOString() ?? null,
        pricingHref,
        portalEnabled: Boolean(dbUser.stripeCustomerId),
      }}
    />
  );
}
