import { fail, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { makeMockAccounts } from "@/lib/mock-accounts";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireUser();
    const connection = await prisma.metaConnection.upsert({
      where: { id: (await prisma.metaConnection.findFirst({ where: { userId: user.id }, select: { id: true } }))?.id ?? "__missing__" },
      update: { status: "MOCK", updatedAt: new Date() },
      create: { userId: user.id, name: "Meta mock", status: "MOCK" }
    });
    const result = await prisma.metaAdAccount.createMany({
      data: makeMockAccounts(user.id, connection.id, 30),
      skipDuplicates: true
    });
    await audit({ user, action: "integration.meta_mock_sync", objectType: "MetaConnection", objectId: connection.id, newValueJson: { createdAccounts: result.count } });
    return ok({ createdAccounts: result.count });
  } catch (error) {
    return fail(error);
  }
}
