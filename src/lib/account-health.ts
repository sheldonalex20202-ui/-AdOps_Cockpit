import { BillingStatus, MetaAdAccount, ReadinessStatus } from "@prisma/client";

export function calculateAccountHealth(account: Pick<MetaAdAccount, "status" | "billingStatus" | "tokenStatus" | "spendLimit" | "lastSyncAt">) {
  const checks = {
    tokenValid: ["VALID", "MOCK"].includes(account.tokenStatus),
    accountActive: account.status === "ACTIVE",
    accountLimited: account.status === "LIMITED",
    accountDisabled: account.status === "DISABLED",
    billingOk: account.billingStatus === BillingStatus.OK,
    spendLimitExists: account.spendLimit !== null,
    syncedRecently: account.lastSyncAt ? Date.now() - account.lastSyncAt.getTime() < 24 * 60 * 60 * 1000 : false
  };

  let score = 100;
  if (!checks.tokenValid) score -= account.tokenStatus === "EXPIRED" ? 40 : 25;
  if (checks.accountDisabled) score -= 65;
  else if (checks.accountLimited) score -= 30;
  else if (!checks.accountActive) score -= 15;
  if (!checks.billingOk) score -= account.billingStatus === "ISSUE" ? 35 : 10;
  if (!checks.spendLimitExists) score -= 5;
  if (!checks.syncedRecently) score -= 10;

  score = Math.max(0, Math.min(100, score));
  const status: ReadinessStatus = score >= 80 ? "READY" : score >= 50 ? "NEEDS_ATTENTION" : "BLOCKED";
  return { score, status, checks };
}
