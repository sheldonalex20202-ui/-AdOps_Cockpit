import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { parseCreativeFilename } from "@/lib/launch-engine";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  type: z.string().default("VIDEO"),
  zGroup: z.string().optional().nullable(),
  geo: z.string().optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  primaryText: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  callToAction: z.string().default("LEARN_MORE"),
  destinationUrl: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const creatives = await prisma.creative.findMany({
      where: { userId: user.id },
      orderBy: [{ zGroup: "asc" }, { createdAt: "desc" }],
    });
    return ok({ creatives });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const input = schema.parse(await req.json());
    const parsed = parseCreativeFilename(input.name);
    const zGroup = input.zGroup ?? parsed.zNum ?? null;
    const geo = input.geo ?? parsed.geo ?? null;
    const creative = await prisma.creative.create({
      data: {
        userId: user.id,
        name: input.name,
        type: input.type,
        zGroup,
        geo,
        mediaUrl: input.mediaUrl ?? null,
        headline: input.headline ?? null,
        primaryText: input.primaryText ?? null,
        description: input.description ?? null,
        callToAction: input.callToAction,
        destinationUrl: input.destinationUrl ?? null,
      },
    });
    return ok({ creative });
  } catch (error) {
    return fail(error);
  }
}
