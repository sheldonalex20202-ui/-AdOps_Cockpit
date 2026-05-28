import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntegrationsClient } from "./IntegrationsClient";

export default async function IntegrationsPage() {
  const user = await requireUser();
  const meta = await prisma.metaConnection.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return <IntegrationsClient meta={meta.map((m) => ({ id: m.id, name: m.name, status: m.status }))} />;
}
