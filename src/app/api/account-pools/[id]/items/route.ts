import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ accountIds: z.array(z.string()).min(1).max(500) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { accountIds } = schema.parse(await req.json());
    const pool = await prisma.accountPool.findFirst({ where: { id: params.id, userId: user.id } });
    if (!pool) throw new Error("Pool not found");
    const accounts = await prisma.metaAdAccount.findMany({ where: { userId: user.id, id: { in: accountIds }, archived: false }, select: { id: true } });
    const result = await prisma.accountPoolItem.createMany({
      data: accounts.map((account) => ({ userId: user.id, poolId: pool.id, adAccountId: account.id })),
      skipDuplicates: true
    });
    await audit({ user, action: "pool.items_added", objectType: "AccountPool", objectId: pool.id, newValueJson: { count: result.count } });
    return ok({ created: result.count });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { accountIds } = schema.parse(await req.json());
    const pool = await prisma.accountPool.findFirst({ where: { id: params.id, userId: user.id } });
    if (!pool) throw new Error("Pool not found");
    const result = await prisma.accountPoolItem.deleteMany({ where: { userId: user.id, poolId: pool.id, adAccountId: { in: accountIds } } });
    await audit({ user, action: "pool.items_removed", objectType: "AccountPool", objectId: pool.id, newValueJson: { count: result.count } });
    return ok({ deleted: result.count });
  } catch (error) {
    return fail(error);
  }
}
