import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  source: z.string().default("MANUAL"),
  externalId: z.string().optional().nullable(),
  geo: z.string().optional().nullable(),
  headlinesJson: z.record(z.string(), z.string()),
});

export async function GET() {
  try {
    const user = await requireUser();
    const sets = await prisma.headlineSet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ sets });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const input = schema.parse(await req.json());
    const set = await prisma.headlineSet.create({
      data: {
        userId: user.id,
        name: input.name,
        source: input.source,
        externalId: input.externalId ?? null,
        geo: input.geo ? input.geo.toUpperCase() : null,
        headlinesJson: input.headlinesJson,
      },
    });
    return ok({ set });
  } catch (error) {
    return fail(error);
  }
}
