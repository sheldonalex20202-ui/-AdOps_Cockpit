import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const before = await prisma.accountPool.findFirst({ where: { id: params.id, userId: user.id } });
    if (!before) throw new Error("Pool not found");
    const input = schema.parse(await req.json());
    const pool = await prisma.accountPool.update({ where: { id: before.id }, data: input });
    await audit({ user, action: "pool.updated", objectType: "AccountPool", objectId: pool.id, oldValueJson: before, newValueJson: pool });
    return ok({ pool });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const before = await prisma.accountPool.findFirst({ where: { id: params.id, userId: user.id } });
    if (!before) throw new Error("Pool not found");
    await prisma.accountPool.delete({ where: { id: before.id } });
    await audit({ user, action: "pool.deleted", objectType: "AccountPool", objectId: before.id, oldValueJson: before });
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
