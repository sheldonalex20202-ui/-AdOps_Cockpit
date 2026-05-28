import { AuditResult } from "@prisma/client";
import { SessionUser } from "./auth";
import { prisma } from "./prisma";

export async function audit(input: {
  user?: SessionUser | null;
  userId?: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  oldValueJson?: unknown;
  newValueJson?: unknown;
  result?: AuditResult;
  errorMessage?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.user?.id ?? input.userId ?? null,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      oldValueJson: input.oldValueJson === undefined ? undefined : (input.oldValueJson as object),
      newValueJson: input.newValueJson === undefined ? undefined : (input.newValueJson as object),
      result: input.result ?? "SUCCESS",
      errorMessage: input.errorMessage
    }
  });
}
