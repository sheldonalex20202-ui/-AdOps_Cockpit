import { AccountStatus, BillingStatus, Prisma, ReadinessStatus, TokenStatus } from "@prisma/client";

const names = ["Blue", "North", "Scale", "Orbit", "Prime", "River", "Atlas", "Pulse", "Spark", "Edge"];
const currencies = ["USD", "EUR", "GBP"];
const timezones = ["Europe/Moscow", "Europe/Warsaw", "Europe/London", "Asia/Dubai"];

function readinessFromStatus(status: AccountStatus, billingStatus: BillingStatus, tokenStatus: TokenStatus): ReadinessStatus {
  if (status === "ACTIVE" && billingStatus === "OK" && ["VALID", "MOCK"].includes(tokenStatus)) return "READY";
  if (status === "DISABLED" || billingStatus === "ISSUE" || tokenStatus === "EXPIRED") return "BLOCKED";
  return "NEEDS_ATTENTION";
}

function scoreFromReadiness(status: ReadinessStatus, index: number) {
  if (status === "READY") return 82 + (index % 16);
  if (status === "NEEDS_ATTENTION") return 55 + (index % 20);
  return 18 + (index % 28);
}

export function makeMockAccounts(userId: string, connectionId: string, count = 30): Prisma.MetaAdAccountCreateManyInput[] {
  return Array.from({ length: count }).map((_, index) => {
    const status: AccountStatus = index % 17 === 0 ? "DISABLED" : index % 9 === 0 ? "BILLING_ISSUE" : index % 5 === 0 ? "LIMITED" : "ACTIVE";
    const billingStatus: BillingStatus = status === "BILLING_ISSUE" || index % 11 === 0 ? "ISSUE" : "OK";
    const tokenStatus: TokenStatus = index % 13 === 0 ? "EXPIRED" : index % 7 === 0 ? "MOCK" : "VALID";
    const readinessStatus = readinessFromStatus(status, billingStatus, tokenStatus);
    return {
      userId,
      connectionId,
      externalId: `act_${1000000000 + index}`,
      name: `${names[index % names.length]} account ${index + 1}`,
      currency: currencies[index % currencies.length],
      timezone: timezones[index % timezones.length],
      status,
      billingStatus,
      tokenStatus,
      readinessStatus,
      readinessScore: scoreFromReadiness(readinessStatus, index),
      spendLimit: index % 6 === 0 ? null : new Prisma.Decimal(500 + index * 75),
      notes: status === "ACTIVE" ? null : "Требует внимания перед масштабированием",
      lastSyncAt: new Date(),
      lastHealthCheckAt: index % 3 === 0 ? new Date() : null
    };
  });
}
