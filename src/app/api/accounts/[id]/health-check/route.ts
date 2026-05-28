import { fail, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { calculateAccountHealth } from "@/lib/account-health";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const account = await prisma.metaAdAccount.findFirst({ where: { id: params.id, userId: user.id, archived: false } });
    if (!account) throw new Error("Account not found");
    const result = calculateAccountHealth(account);
    const healthCheck = await prisma.accountHealthCheck.create({
      data: {
        userId: user.id,
        adAccountId: account.id,
        score: result.score,
        status: result.status,
        checksJson: result.checks
      }
    });
    const updated = await prisma.metaAdAccount.update({
      where: { id: account.id },
      data: { readinessScore: result.score, readinessStatus: result.status, lastHealthCheckAt: new Date() }
    });
    await audit({ user, action: "account.health_check", objectType: "MetaAdAccount", objectId: account.id, oldValueJson: account, newValueJson: updated });
    return ok({ healthCheck, score: result.score, status: result.status, checks: result.checks });
  } catch (error) {
    return fail(error);
  }
}
