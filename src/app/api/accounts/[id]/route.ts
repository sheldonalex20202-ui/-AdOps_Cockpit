import { NextRequest } from "next/server";
import { AccountStatus, BillingStatus, ReadinessStatus, TokenStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok, parseMoney } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateAccountSchema = z.object({
  name: z.string().min(2).optional(),
  currency: z.string().min(3).max(3).optional(),
  timezone: z.string().min(2).optional(),
  status: z.nativeEnum(AccountStatus).optional(),
  readinessStatus: z.nativeEnum(ReadinessStatus).optional(),
  billingStatus: z.nativeEnum(BillingStatus).optional(),
  tokenStatus: z.nativeEnum(TokenStatus).optional(),
  spendLimit: z.union([z.string(), z.number(), z.null()]).optional(),
  notes: z.string().nullable().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const before = await prisma.metaAdAccount.findFirst({ where: { id: params.id, userId: user.id, archived: false } });
    if (!before) throw new Error("Account not found");
    const input = updateAccountSchema.parse(await req.json());
    const updated = await prisma.metaAdAccount.update({
      where: { id: before.id },
      data: {
        ...input,
        currency: input.currency?.toUpperCase(),
        spendLimit: input.spendLimit === undefined ? undefined : parseMoney(input.spendLimit)
      }
    });
    await audit({ user, action: "account.updated", objectType: "MetaAdAccount", objectId: updated.id, oldValueJson: before, newValueJson: updated });
    return ok({ account: updated });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const before = await prisma.metaAdAccount.findFirst({ where: { id: params.id, userId: user.id, archived: false } });
    if (!before) throw new Error("Account not found");
    const updated = await prisma.metaAdAccount.update({ where: { id: before.id }, data: { archived: true } });
    await audit({ user, action: "account.archived", objectType: "MetaAdAccount", objectId: updated.id, oldValueJson: before, newValueJson: updated });
    return ok({ account: updated });
  } catch (error) {
    return fail(error);
  }
}
