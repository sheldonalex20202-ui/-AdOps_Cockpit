import { Activity, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Table, statusTone } from "@/components/ui";
import { ru } from "@/lib/i18n";
import * as api from "@/lib/api";

type Account = { id: string; name: string; externalId: string; readinessStatus: string; readinessScore: number };

export function HealthClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const res = await api.getAccounts("", "", "", false);
    setAccounts(res.accounts ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function runCheck(id: string) {
    setRunning((r) => [...r, id]);
    await api.runHealthCheck(id);
    await load();
    setRunning((r) => r.filter((x) => x !== id));
  }

  async function runAll() {
    const ids = accounts.map((a) => a.id);
    setRunning(ids);
    await api.runBulkHealthCheck(ids);
    await load();
    setRunning([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Health Checks</h1>
          <p className="text-sm text-slate-500">Readiness score 0–100 для каждого кабинета.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Обновить</Button>
          <Button onClick={runAll} disabled={running.length > 0}>
            <Activity size={16} /> Проверить все
          </Button>
        </div>
      </div>

      {loading ? <Empty text="Загрузка..." /> : accounts.length === 0 ? (
        <Empty text="Нет кабинетов. Добавьте их в разделе «Мои кабинеты»." />
      ) : (
        <Table>
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-field text-xs text-slate-500">
              <tr>
                <th className="p-3">Кабинет</th>
                <th>Ext ID</th>
                <th>Readiness</th>
                <th>Score</th>
                <th className="pr-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} className="border-t border-line">
                  <td className="p-3 font-bold">{acc.name}</td>
                  <td className="text-xs text-slate-500">{acc.externalId}</td>
                  <td><Badge tone={statusTone(acc.readinessStatus)}>{ru(acc.readinessStatus)}</Badge></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-raised">
                        <div className="h-1.5 rounded-full bg-brand" style={{ width: `${acc.readinessScore}%` }} />
                      </div>
                      <span className="text-xs font-bold">{acc.readinessScore}</span>
                    </div>
                  </td>
                  <td className="pr-3 text-right">
                    <Button variant="ghost" onClick={() => runCheck(acc.id)} disabled={running.includes(acc.id)}>
                      {running.includes(acc.id) ? "..." : <><Activity size={13} /> Check</>}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
      )}

      {accounts.length > 0 && (
        <Card>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            {(["READY", "NEEDS_ATTENTION", "BLOCKED"] as const).map((s) => {
              const count = accounts.filter((a) => a.readinessStatus === s).length;
              return (
                <div key={s}>
                  <div className="text-xl font-black">{count}</div>
                  <Badge tone={statusTone(s)}>{ru(s)}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
