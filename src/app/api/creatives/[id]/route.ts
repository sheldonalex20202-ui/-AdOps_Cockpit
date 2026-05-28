import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const creative = await prisma.creative.findFirst({ where: { id: params.id, userId: user.id } });
    if (!creative) return fail(new Error("NOT_FOUND"));
    await prisma.creative.delete({ where: { id: params.id } });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
