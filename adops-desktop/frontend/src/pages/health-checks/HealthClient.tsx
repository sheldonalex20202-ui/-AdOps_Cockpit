import { Activity, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Loading, Empty, PageHeader, ScoreBar, Table, Td, Th, Tr, statusTone } from "@/components/ui";
import { ru } from "@/lib/i18n";
import * as api from "@/lib/api";

type Account = {
  id: string; name: string; externalId: string;
  readinessStatus: string; readinessScore: number;
  status: string; tokenStatus: string; billingStatus: string;
  lastHealthCheckAt?: string;
};

export function HealthClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const res = await api.getAccounts("", "", "", false);
    setAccounts(res.accounts ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function runCheck(id: string) {
    setRunning((r) => new Set([...r, id]));
    await api.runHealthCheck(id);
    await load();
    setRunning((r) => { const n = new Set(r); n.delete(id); return n; });
  }

  async function runAll() {
    const ids = accounts.map((a) => a.id);
    setRunning(new Set(ids));
    await api.runBulkHealthCheck(ids);
    await load();
    setRunning(new Set());
  }

  const stats = useMemo(() => ({
    ready:  accounts.filter((a) => a.readinessStatus === "READY").length,
    issues: accounts.filter((a) => a.readinessScore < 50).length,
    avg:    accounts.length
      ? Math.round(accounts.reduce((s, a) => s + a.readinessScore, 0) / accounts.length)
      : 0,
  }), [accounts]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Health Checks"
        subtitle="Readiness score 0–100 — токен, биллинг, лимиты, статус кабинета"
        icon={ShieldCheck}
        stats={[
          { label: "кабинетов",  value: accounts.length },
          { label: "готовы",     value: stats.ready,  tone: "good" },
          { label: "проблемных", value: stats.issues,  tone: stats.issues > 0 ? "bad" : "good" },
          { label: "avg score",  value: stats.avg },
        ]}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /> Обновить</Button>
            <Button size="sm" onClick={runAll} disabled={running.size > 0}>
              <Activity size={13} /> Проверить все
            </Button>
          </>
        }
      />

      {loading ? (
        <Loading />
      ) : accounts.length === 0 ? (
        <Empty icon={ShieldCheck} text="Нет кабинетов. Добавьте их в разделе «Мои кабинеты»." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Кабинет</Th>
              <Th>Score</Th>
              <Th>Readiness</Th>
              <Th>Meta</Th>
              <Th>Token</Th>
              <Th>Billing</Th>
              <Th>Последняя проверка</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {accounts
              .slice()
              .sort((a, b) => a.readinessScore - b.readinessScore)
              .map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <div className="font-medium text-ink">{a.name}</div>
                    <div className="font-mono text-[11px] text-muted">{a.externalId}</div>
                  </Td>
                  <Td><ScoreBar score={a.readinessScore} /></Td>
                  <Td><Badge tone={statusTone(a.readinessStatus)} dot>{ru(a.readinessStatus)}</Badge></Td>
                  <Td><Badge tone={statusTone(a.status)} dot>{ru(a.status)}</Badge></Td>
                  <Td><Badge tone={statusTone(a.tokenStatus)}>{ru(a.tokenStatus)}</Badge></Td>
                  <Td>
                    <Badge tone={a.billingStatus === "OK" ? "good" : a.billingStatus === "ISSUE" ? "bad" : "neutral"}>
                      {ru(a.billingStatus)}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="text-[11px] text-muted">
                      {a.lastHealthCheckAt
                        ? new Date(a.lastHealthCheckAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "Не проверялся"}
                    </span>
                  </Td>
                  <Td>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={running.has(a.id)}
                      onClick={() => runCheck(a.id)}
                    >
                      {running.has(a.id)
                        ? <span className="animate-spin inline-block h-3 w-3 rounded-full border-2 border-stroke border-t-brand" />
                        : <Activity size={12} />}
                      Проверить
                    </Button>
                  </Td>
                </Tr>
              ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
