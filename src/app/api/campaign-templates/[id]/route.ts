import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, parseMoney } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).optional(),
  objective: z.string().min(2).optional(),
  buyingType: z.string().optional(),
  campaignStatus: z.string().optional(),
  dailyBudget: z.union([z.string(), z.number(), z.null()]).optional(),
  bidStrategy: z.string().optional(),
  optimizationGoal: z.string().optional(),
  billingEvent: z.string().optional(),
  adSetNameTpl: z.string().optional(),
  adNameTpl: z.string().optional(),
});

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const tpl = await prisma.campaignTemplate.findFirst({ where: { id: params.id, userId: user.id } });
    if (!tpl) return fail(new Error("NOT_FOUND"));
    await prisma.campaignTemplate.delete({ where: { id: params.id } });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const tpl = await prisma.campaignTemplate.findFirst({ where: { id: params.id, userId: user.id } });
    if (!tpl) return fail(new Error("NOT_FOUND"));
    const input = schema.parse(await req.json());
    const updated = await prisma.campaignTemplate.update({
      where: { id: params.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.objective && { objective: input.objective }),
        ...(input.buyingType && { buyingType: input.buyingType }),
        ...(input.campaignStatus && { campaignStatus: input.campaignStatus }),
        ...(input.dailyBudget !== undefined && { dailyBudget: parseMoney(input.dailyBudget) }),
        ...(input.bidStrategy && { bidStrategy: input.bidStrategy }),
        ...(input.optimizationGoal && { optimizationGoal: input.optimizationGoal }),
        ...(input.billingEvent && { billingEvent: input.billingEvent }),
        ...(input.adSetNameTpl && { adSetNameTpl: input.adSetNameTpl }),
        ...(input.adNameTpl && { adNameTpl: input.adNameTpl }),
      },
    });
    return ok({ template: updated });
  } catch (error) {
    return fail(error);
  }
}
