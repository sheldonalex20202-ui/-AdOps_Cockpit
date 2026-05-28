import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAppUrl, getPriceId, getStripe, isPaidPlan, normalizeReturnTo } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const form = await req.formData();
  const plan = String(form.get("plan") ?? "");
  const returnTo = normalizeReturnTo(form.get("returnTo"));

  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const stripe = getStripe();
  let customerId = dbUser.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email,
      name: dbUser.name,
      metadata: { userId: dbUser.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    success_url: `${getAppUrl()}${returnTo}`,
    cancel_url: `${getAppUrl()}/pricing`,
    client_reference_id: dbUser.id,
    metadata: { userId: dbUser.id, plan },
    subscription_data: {
      metadata: { userId: dbUser.id, plan },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "CHECKOUT_URL_MISSING" }, { status: 500 });
  }

  return NextResponse.redirect(session.url, 303);
}
