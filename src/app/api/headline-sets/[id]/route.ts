import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const set = await prisma.headlineSet.findFirst({ where: { id: params.id, userId: user.id } });
    if (!set) return fail(new Error("NOT_FOUND"));
    await prisma.headlineSet.delete({ where: { id: params.id } });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
