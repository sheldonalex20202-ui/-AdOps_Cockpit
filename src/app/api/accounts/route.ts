import { NextRequest } from "next/server";
import { AccountStatus, Prisma, ReadinessStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok, parseMoney } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createAccountSchema = z.object({
  externalId: z.string().min(3),
  name: z.string().min(2),
  currency: z.string().min(3).max(3).default("USD"),
  timezone: z.string().min(2).default("UTC"),
  status: z.nativeEnum(AccountStatus).default("UNKNOWN"),
  spendLimit: z.union([z.string(), z.number(), z.null()]).optional(),
  notes: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status") as AccountStatus | null;
    const readiness = searchParams.get("readiness") as ReadinessStatus | null;
    const poolId = searchParams.get("poolId");
    const problemOnly = searchParams.get("problemOnly") === "true";

    const where: Prisma.MetaAdAccountWhereInput = {
      userId: user.id,
      archived: false,
      ...(status ? { status } : {}),
      ...(readiness ? { readinessStatus: readiness } : {}),
      ...(poolId ? { pools: { some: { poolId } } } : {})
    };
    const and: Prisma.MetaAdAccountWhereInput[] = [];
    if (search) and.push({ OR: [{ name: { contains: search, mode: "insensitive" } }, { externalId: { contains: search, mode: "insensitive" } }] });
    if (problemOnly) and.push({ OR: [{ status: { not: "ACTIVE" } }, { readinessStatus: { not: "READY" } }] });
    if (and.length) where.AND = and;

    const accounts = await prisma.metaAdAccount.findMany({
      where,
      orderBy: [{ readinessStatus: "asc" }, { updatedAt: "desc" }],
      include: {
        pools: { include: { pool: true }, orderBy: { createdAt: "desc" } },
        healthChecks: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    return ok({ accounts });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const input = createAccountSchema.parse(await req.json());
    const account = await prisma.metaAdAccount.create({
      data: {
        userId: user.id,
        externalId: input.externalId,
        name: input.name,
        currency: input.currency.toUpperCase(),
        timezone: input.timezone,
        status: input.status,
        spendLimit: parseMoney(input.spendLimit),
        notes: input.notes
      }
    });
    await audit({ user, action: "account.created", objectType: "MetaAdAccount", objectId: account.id, newValueJson: account });
    return ok({ account });
  } catch (error) {
    return fail(error);
  }
}
