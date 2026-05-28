import { Badge, Card, Table, statusTone } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ru } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function AuditLogsPage() {
  const user = await requireUser();
  const logs = await prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 150
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Аудит</h1>
        <p className="text-sm text-slate-500">История действий в вашем личном кабинете.</p>
      </div>
      <Card>
        <Table>
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-field text-slate-500">
              <tr>
                <th className="p-3">Время</th>
                <th>Действие</th>
                <th>Объект</th>
                <th>Результат</th>
                <th>Ошибка</th>
                <th>Данные</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-line">
                  <td className="p-3">{log.createdAt.toLocaleString("ru-RU")}</td>
                  <td className="font-bold">{log.action}</td>
                  <td>{log.objectType} {log.objectId ?? ""}</td>
                  <td><Badge tone={statusTone(log.result)}>{ru(log.result)}</Badge></td>
                  <td>{log.errorMessage ?? "-"}</td>
                  <td className="max-w-[360px] truncate">{log.newValueJson ? JSON.stringify(log.newValueJson) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
      </Card>
    </div>
  );
}
