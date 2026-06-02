import { FileClock } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Empty, Loading, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import * as api from "@/lib/api";

type AuditLog = {
  id: string; action: string; objectType: string; objectId?: string;
  result: string; errorMessage?: string; createdAt: string;
};

export function AuditClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.getAuditLogs(100, 0).then((res) => {
      setLogs(res ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Журнал аудита"
        subtitle="Все действия пользователя в системе"
        icon={FileClock}
        stats={[{ label: "записей", value: logs.length }]}
      />

      {loading ? (
        <Loading />
      ) : logs.length === 0 ? (
        <Empty icon={FileClock} text="Журнал пуст." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Время</Th>
              <Th>Действие</Th>
              <Th>Объект</Th>
              <Th>ID</Th>
              <Th>Результат</Th>
              <Th>Ошибка</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <Tr key={log.id}>
                <Td>
                  <span className="text-[11px] text-muted tabular-nums">
                    {new Date(log.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-[12px] font-medium text-ink">{log.action}</span>
                </Td>
                <Td>
                  <span className="text-[12px] text-muted">{log.objectType}</span>
                </Td>
                <Td>
                  <span className="font-mono text-[11px] text-subtle">{log.objectId?.slice(0, 8) ?? "—"}</span>
                </Td>
                <Td>
                  <Badge tone={log.result === "SUCCESS" ? "good" : "bad"}>
                    {log.result === "SUCCESS" ? "OK" : "FAIL"}
                  </Badge>
                </Td>
                <Td className="max-w-[240px]">
                  <span className="truncate text-[11px] text-danger block">
                    {log.errorMessage ?? <span className="text-muted">—</span>}
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
