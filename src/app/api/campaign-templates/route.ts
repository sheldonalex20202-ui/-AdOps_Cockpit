import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, parseMoney } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  objective: z.string().min(2),
  buyingType: z.string().default("AUCTION"),
  campaignStatus: z.string().default("PAUSED"),
  dailyBudget: z.union([z.string(), z.number(), z.null()]).optional(),
  bidStrategy: z.string().default("LOWEST_COST_WITHOUT_CAP"),
  optimizationGoal: z.string().default("LINK_CLICKS"),
  billingEvent: z.string().default("IMPRESSIONS"),
  adSetNameTpl: z.string().default("{account} - AdSet"),
  adNameTpl: z.string().default("{account} - {creative}"),
});

export async function GET() {
  try {
    const user = await requireUser();
    const templates = await prisma.campaignTemplate.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ templates });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const input = schema.parse(await req.json());
    const template = await prisma.campaignTemplate.create({
      data: {
        userId: user.id,
        name: input.name,
        objective: input.objective,
        buyingType: input.buyingType,
        campaignStatus: input.campaignStatus,
        dailyBudget: parseMoney(input.dailyBudget),
        bidStrategy: input.bidStrategy,
        optimizationGoal: input.optimizationGoal,
        billingEvent: input.billingEvent,
        adSetNameTpl: input.adSetNameTpl,
        adNameTpl: input.adNameTpl,
      },
    });
    return ok({ template });
  } catch (error) {
    return fail(error);
  }
}
