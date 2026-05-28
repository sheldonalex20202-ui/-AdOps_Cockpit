import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireUser();
    const connection = await prisma.metaConnection.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return ok({ ok: true, mode: connection?.status ?? "MOCK", message: "Mock Meta adapter отвечает корректно" });
  } catch (error) {
    return fail(error);
  }
}
