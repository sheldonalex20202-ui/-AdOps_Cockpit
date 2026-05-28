import { useEffect, useState } from "react";
import { Badge, Empty, Table } from "@/components/ui";
import * as api from "@/lib/api";

type AuditLog = {
  id: string; action: string; objectType: string; objectId?: string;
  result: string; errorMessage?: string; createdAt: any;
};

export function AuditClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await api.getAuditLogs(100, 0);
      setLogs(res ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Журнал аудита</h1>
        <p className="text-sm text-slate-500">Все действия пользователя в системе.</p>
      </div>

      {loading ? <Empty text="Загрузка..." /> : logs.length === 0 ? (
        <Empty text="Журнал пуст." />
      ) : (
        <Table>
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-field text-xs text-slate-500">
              <tr>
                <th className="p-3">Время</th>
                <th>Действие</th>
                <th>Объект</th>
                <th>ID</th>
                <th>Результат</th>
                <th>Ошибка</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-line">
                  <td className="p-3 text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString("ru")}
                  </td>
                  <td className="font-mono text-xs font-bold">{log.action}</td>
                  <td className="text-slate-600">{log.objectType}</td>
                  <td className="font-mono text-xs text-slate-400">{log.objectId?.slice(0, 8) ?? "—"}</td>
                  <td>
                    <Badge tone={log.result === "SUCCESS" ? "good" : "bad"}>
                      {log.result === "SUCCESS" ? "OK" : "FAIL"}
                    </Badge>
                  </td>
                  <td className="max-w-[200px] truncate text-xs text-red-600">
                    {log.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
      )}
    </div>
  );
}
