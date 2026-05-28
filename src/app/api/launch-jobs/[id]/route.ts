import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const job = await prisma.launchJob.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        items: {
          include: {
            adAccount: { select: { id: true, name: true, externalId: true } },
          },
          orderBy: { status: "asc" },
        },
        template: { select: { id: true, name: true } },
      },
    });
    if (!job) return fail(new Error("NOT_FOUND"));
    return ok({ job });
  } catch (error) {
    return fail(error);
  }
}
