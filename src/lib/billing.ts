import Stripe from "stripe";
import { Plan } from "@prisma/client";

export const paidPlans = ["pro", "team"] as const;
export type PaidPlan = (typeof paidPlans)[number];

export const planLabels: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

export const planPriceEnv: Record<PaidPlan, string> = {
  pro: "STRIPE_PRO_PRICE_ID",
  team: "STRIPE_TEAM_PRICE_ID",
};

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required");
  return new Stripe(secretKey);
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getPriceId(plan: PaidPlan) {
  const envName = planPriceEnv[plan];
  const priceId = process.env[envName];
  if (!priceId) throw new Error(`${envName} is required`);
  return priceId;
}

export function isPaidPlan(value: string): value is PaidPlan {
  return paidPlans.includes(value as PaidPlan);
}

export function normalizeReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/me";
  if (value.startsWith("//")) return "/me";
  return value;
}
