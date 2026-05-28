import { z } from "zod";
import { fail, ok, parseMoney } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const accountSchema = z.object({
  externalId: z.string().min(3),
  name: z.string().min(2),
  currency: z.string().min(3).max(3).default("USD"),
  timezone: z.string().min(2).default("UTC"),
  spendLimit: z.union([z.string(), z.number(), z.null()]).optional()
});

const schema = z.object({ accounts: z.array(accountSchema).min(1).max(500) });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await req.json());
    const result = await prisma.metaAdAccount.createMany({
      data: input.accounts.map((account) => ({
        userId: user.id,
        externalId: account.externalId,
        name: account.name,
        currency: account.currency.toUpperCase(),
        timezone: account.timezone,
        spendLimit: parseMoney(account.spendLimit)
      })),
      skipDuplicates: true
    });
    await audit({ user, action: "account.bulk_import", objectType: "MetaAdAccount", newValueJson: { count: result.count } });
    return ok({ created: result.count });
  } catch (error) {
    return fail(error);
  }
}
