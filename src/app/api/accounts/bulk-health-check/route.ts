import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { calculateAccountHealth } from "@/lib/account-health";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ accountIds: z.array(z.string()).min(1).max(100) });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { accountIds } = schema.parse(await req.json());
    const accounts = await prisma.metaAdAccount.findMany({ where: { userId: user.id, id: { in: accountIds }, archived: false } });
    const results = [];
    for (const account of accounts) {
      const health = calculateAccountHealth(account);
      await prisma.accountHealthCheck.create({
        data: { userId: user.id, adAccountId: account.id, score: health.score, status: health.status, checksJson: health.checks }
      });
      await prisma.metaAdAccount.update({
        where: { id: account.id },
        data: { readinessScore: health.score, readinessStatus: health.status, lastHealthCheckAt: new Date() }
      });
      results.push({ id: account.id, score: health.score, status: health.status });
    }
    await audit({ user, action: "account.bulk_health_check", objectType: "MetaAdAccount", newValueJson: { count: results.length } });
    return ok({ results });
  } catch (error) {
    return fail(error);
  }
}
