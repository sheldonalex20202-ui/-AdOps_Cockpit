import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAppUrl, getStripe, normalizeReturnTo } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const form = await req.formData();
  const returnTo = normalizeReturnTo(form.get("returnTo"));

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.stripeCustomerId) {
    return NextResponse.redirect(`${getAppUrl()}/pricing`, 303);
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${getAppUrl()}${returnTo}`,
  });

  return NextResponse.redirect(session.url, 303);
}
