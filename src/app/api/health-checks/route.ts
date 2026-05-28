import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const healthChecks = await prisma.accountHealthCheck.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { adAccount: { select: { id: true, name: true, externalId: true, status: true } } }
    });
    return ok({ healthChecks });
  } catch (error) {
    return fail(error);
  }
}
