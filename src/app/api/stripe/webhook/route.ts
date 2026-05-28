import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Plan } from "@prisma/client";
import { getStripe, isPaidPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is required" }, { status: 500 });

  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object);
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.created"
  ) {
    await handleSubscription(event.data.object, event.type === "customer.subscription.deleted");
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId ?? session.client_reference_id;
  const plan = session.metadata?.plan;
  if (!userId || !plan || !isPaidPlan(plan)) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
    },
  });
}

async function handleSubscription(subscription: Stripe.Subscription, deleted: boolean) {
  const userId = subscription.metadata.userId;
  const plan = subscription.metadata.plan;
  const periodEnd = subscription.items.data[0]?.current_period_end ?? null;
  if (!userId) return;

  if (deleted || subscription.status === "canceled" || subscription.status === "unpaid") {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: Plan.free, planExpiresAt: null },
    });
    return;
  }

  if (!plan || !isPaidPlan(plan)) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      planExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : undefined,
    },
  });
}
