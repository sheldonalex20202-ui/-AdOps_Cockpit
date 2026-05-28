import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { runLaunchJob, type LaunchStructure } from "@/lib/launch-engine";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  accountIds: z.array(z.string()).min(1),
  creativeIds: z.array(z.string()).min(1),
  campaignTemplateId: z.string().optional().nullable(),
  structure: z.enum(["CBO", "ABO", "ISOLATION", "Z_GROUPED"]).default("CBO"),
  headlineSetId: z.string().optional().nullable(),
  campaignsPerAccount: z.number().int().min(1).max(20).default(1),
  config: z.object({
    objective: z.string(),
    buyingType: z.string().default("AUCTION"),
    campaignStatus: z.string().default("PAUSED"),
    dailyBudget: z.number().optional().nullable(),
    bidStrategy: z.string().default("LOWEST_COST_WITHOUT_CAP"),
    optimizationGoal: z.string().default("LINK_CLICKS"),
    billingEvent: z.string().default("IMPRESSIONS"),
    campaignNameTpl: z.string().default("{account} | {objective} | {date}"),
    adSetNameTpl: z.string().default("{account} | {creative}"),
    adNameTpl: z.string().default("{account} | {creative}"),
  }),
});

export async function GET() {
  try {
    const user = await requireUser();
    const jobs = await prisma.launchJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { template: { select: { id: true, name: true } } },
    });
    return ok({ jobs });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const input = schema.parse(await req.json());

    const accounts = await prisma.metaAdAccount.findMany({
      where: { id: { in: input.accountIds }, userId: user.id, archived: false },
      select: { id: true, name: true },
    });
    if (accounts.length === 0) throw new Error("No valid accounts selected");

    const creatives = await prisma.creative.findMany({
      where: { id: { in: input.creativeIds }, userId: user.id },
      select: { id: true, name: true, zGroup: true, geo: true },
    });
    if (creatives.length === 0) throw new Error("No valid creatives selected");

    // Load headline set if provided
    let headlines: Record<string, string> = {};
    if (input.headlineSetId) {
      const hs = await prisma.headlineSet.findFirst({
        where: { id: input.headlineSetId, userId: user.id },
      });
      if (hs) headlines = hs.headlinesJson as Record<string, string>;
    }

    const job = await prisma.launchJob.create({
      data: {
        userId: user.id,
        name: input.name,
        campaignTemplateId: input.campaignTemplateId ?? null,
        status: "RUNNING",
        totalAccounts: accounts.length,
        configJson: {
          structure: input.structure,
          campaignsPerAccount: input.campaignsPerAccount,
          headlineSetId: input.headlineSetId,
          ...input.config,
          creativeIds: input.creativeIds,
        },
        items: {
          create: accounts.map((acc) => ({
            adAccountId: acc.id,
            userId: user.id,
            status: "PENDING",
          })),
        },
      },
    });

    await runLaunchJob(
      job.id,
      creatives,
      input.structure as LaunchStructure,
      {
        objective: input.config.objective,
        campaignNameTpl: input.config.campaignNameTpl,
        adSetNameTpl: input.config.adSetNameTpl,
        adNameTpl: input.config.adNameTpl,
      },
      headlines,
      input.campaignsPerAccount
    );

    const completed = await prisma.launchJob.findUnique({
      where: { id: job.id },
      include: {
        items: {
          include: { adAccount: { select: { id: true, name: true, externalId: true } } },
          orderBy: { status: "asc" },
        },
      },
    });

    await audit({
      user,
      action: "launch.completed",
      objectType: "LaunchJob",
      objectId: job.id,
      newValueJson: {
        status: completed?.status,
        total: accounts.length,
        structure: input.structure,
        campaignsPerAccount: input.campaignsPerAccount,
      },
    });

    return ok({ job: completed });
  } catch (error) {
    return fail(error);
  }
}
