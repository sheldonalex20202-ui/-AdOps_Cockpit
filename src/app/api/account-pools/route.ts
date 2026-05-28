import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const poolSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb")
});

export async function GET() {
  try {
    const user = await requireUser();
    const pools = await prisma.accountPool.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } }
    });
    return ok({ pools });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = poolSchema.parse(await req.json());
    const pool = await prisma.accountPool.create({ data: { userId: user.id, ...input } });
    await audit({ user, action: "pool.created", objectType: "AccountPool", objectId: pool.id, newValueJson: pool });
    return ok({ pool });
  } catch (error) {
    return fail(error);
  }
}
