import { z } from "zod";
import { ConnectionStatus } from "@prisma/client";
import { fail, ok, withoutSecrets } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).default("Meta mock"),
  accessToken: z.string().optional(),
  status: z.nativeEnum(ConnectionStatus).default("MOCK")
});

export async function GET() {
  try {
    const user = await requireUser();
    const connections = await prisma.metaConnection.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return ok({ connections: connections.map((connection) => withoutSecrets(connection)) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await req.json());
    const connection = await prisma.metaConnection.create({
      data: {
        userId: user.id,
        name: input.name,
        status: input.status,
        accessTokenEncrypted: input.accessToken ? encryptSecret(input.accessToken) : null
      }
    });
    await audit({ user, action: "integration.meta_connected", objectType: "MetaConnection", objectId: connection.id, newValueJson: withoutSecrets(connection) });
    return ok({ connection: withoutSecrets(connection) });
  } catch (error) {
    return fail(error);
  }
}
