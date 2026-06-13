import { Activity, Archive, BriefcaseBusiness, Plus, RefreshCw, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge, Button, Empty, FilterBar, Input, Loading,
  PageHeader, ScoreBar, Select, Table, Td, Th, Tr, statusTone,
} from "@/components/ui";
import { money } from "@/lib/format";
import { ru } from "@/lib/i18n";
import * as api from "@/lib/api";
import { useAiHighlight } from "@/lib/useAiHighlight";

type Pool = { id: string; name: string; color: string };
type Account = {
  id: string; externalId: string; name: string;
  currency: string; timezone: string;
  status: string; readinessStatus: string; readinessScore: number;
  billingStatus: string; tokenStatus: string;
  spendLimit?: number; lastHealthCheckAt?: string;
  pools?: { pool?: Pool }[];
};

export function AccountsClient() {
  const hlAddAccount = useAiHighlight("add-account");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetPoolId, setTargetPoolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "", readiness: "", poolId: "" });
  const [form, setForm] = useState({ externalId: "", name: "", currency: "USD", timezone: "Europe/Moscow" });
  const [adding, setAdding] = useState(false);

  const allSelected = useMemo(
    () => accounts.length > 0 && accounts.every((a) => selectedIds.includes(a.id)),
    [accounts, selectedIds]
  );

  const stats = useMemo(() => ({
    total:   accounts.length,
    ready:   accounts.filter((a) => a.readinessStatus === "READY").length,
    issues:  accounts.filter((a) => ["BLOCKED", "BILLING_ISSUE", "DISABLED"].includes(a.status)).length,
    avgScore: accounts.length
      ? Math.round(accounts.reduce((s, a) => s + a.readinessScore, 0) / accounts.length)
      : 0,
  }), [accounts]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ar, pr] = await Promise.all([
        api.getAccounts(filters.poolId, filters.status, filters.search, false),
        api.getPools(),
      ]);
      if (ar.error) { setError(ar.error); setLoading(false); return; }
      setAccounts(ar.accounts ?? []);
      setPools(pr.pools ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e ?? "Ошибка загрузки"));
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [filters]);

  function toggle(id: string) {
    setSelectedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  async function createAccount() {
    if (!form.externalId || !form.name) return;
    await api.createAccount(form);
    setForm({ externalId: "", name: "", currency: "USD", timezone: "Europe/Moscow" });
    setAdding(false);
    await load();
  }

  async function healthCheck(ids: string[]) {
    if (!ids.length) return;
    await api.runBulkHealthCheck(ids);
    await load();
  }

  async function addToPool() {
    if (!targetPoolId || !selectedIds.length) return;
    await api.addAccountsToPool(targetPoolId, selectedIds);
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Мои кабинеты"
        subtitle="Meta рекламные кабинеты — статусы, пулы, готовность к заливу"
        icon={BriefcaseBusiness}
        stats={[
          { label: "всего",   value: stats.total },
          { label: "готовы",  value: stats.ready,  tone: "good" },
          { label: "проблем", value: stats.issues,  tone: stats.issues > 0 ? "bad" : "good" },
          { label: "avg score", value: stats.avgScore },
        ]}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /> Обновить</Button>
            <Button
              variant="ghost" size="sm"
              disabled={importing}
              onClick={async () => {
                setImporting(true);
                try { await api.mockImportAccounts(30); } catch {}
                setImporting(false);
                await load();
              }}
            >
              <Upload size={13} /> {importing ? "Импорт..." : "Mock import"}
            </Button>
            <Button size="sm" onClick={() => setAdding((v) => !v)} className={hlAddAccount ? "ai-highlight" : ""}>
              <Plus size={13} /> Добавить
            </Button>
          </>
        }
      />

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border border-stroke bg-card p-3 animate-fade-in-up">
          <p className="mb-2 text-[12px] font-semibold text-muted uppercase tracking-wide">Новый кабинет</p>
          <div className="grid grid-cols-[160px_1fr_90px_200px_auto] gap-2">
            <Input placeholder="act_..." value={form.externalId} onChange={(e) => setForm({ ...form, externalId: e.target.value })} />
            <Input placeholder="Название кабинета" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="USD" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Input placeholder="Europe/Moscow" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            <Button onClick={createAccount}><Plus size={13} /> Создать</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar>
        <Input
          className="w-52"
          placeholder="Поиск по названию или ID..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Любой статус</option>
          <option value="ACTIVE">Активен</option>
          <option value="LIMITED">Ограничен</option>
          <option value="DISABLED">Отключён</option>
          <option value="BILLING_ISSUE">Проблема оплаты</option>
        </Select>
        <Select value={filters.readiness} onChange={(e) => setFilters({ ...filters, readiness: e.target.value })}>
          <option value="">Любой readiness</option>
          <option value="READY">Готов</option>
          <option value="NEEDS_ATTENTION">Нужно внимание</option>
          <option value="BLOCKED">Заблокирован</option>
        </Select>
        <Select value={filters.poolId} onChange={(e) => setFilters({ ...filters, poolId: e.target.value })}>
          <option value="">Все пулы</option>
          {pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>

        {selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-muted">Выбрано: <strong className="text-ink">{selectedIds.length}</strong></span>
            <Button variant="ghost" size="sm" onClick={() => healthCheck(selectedIds)}>
              <Activity size={12} /> Health Check
            </Button>
            <Select value={targetPoolId} onChange={(e) => setTargetPoolId(e.target.value)} className="h-7 text-[12px]">
              <option value="">Добавить в пул…</option>
              {pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            {targetPoolId && (
              <Button size="sm" onClick={addToPool}>Применить</Button>
            )}
          </div>
        )}
      </FilterBar>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Loading />
      ) : accounts.length === 0 ? (
        <Empty icon={BriefcaseBusiness} text="Кабинетов пока нет. Добавьте вручную или загрузите mock данные." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="w-8">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={allSelected}
                  onChange={(e) => setSelectedIds(e.target.checked ? accounts.map((a) => a.id) : [])}
                />
              </Th>
              <Th>Кабинет</Th>
              <Th>External ID</Th>
              <Th>Meta статус</Th>
              <Th>Readiness</Th>
              <Th>Score</Th>
              <Th>Token</Th>
              <Th>Billing</Th>
              <Th>Лимит</Th>
              <Th>Пулы</Th>
              <Th>Последняя проверка</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <Tr key={a.id} selected={selectedIds.includes(a.id)}>
                <Td className="w-8">
                  <input
                    type="checkbox"
                    className="accent-brand"
                    checked={selectedIds.includes(a.id)}
                    onChange={() => toggle(a.id)}
                  />
                </Td>
                <Td>
                  <div className="font-medium text-ink">{a.name}</div>
                  <div className="text-[11px] text-muted">{a.timezone}</div>
                </Td>
                <Td>
                  <span className="font-mono text-[11px] text-muted">{a.externalId}</span>
                </Td>
                <Td><Badge tone={statusTone(a.status)} dot>{ru(a.status)}</Badge></Td>
                <Td><Badge tone={statusTone(a.readinessStatus)} dot>{ru(a.readinessStatus)}</Badge></Td>
                <Td><ScoreBar score={a.readinessScore} /></Td>
                <Td><Badge tone={statusTone(a.tokenStatus)}>{ru(a.tokenStatus)}</Badge></Td>
                <Td>
                  <Badge tone={a.billingStatus === "OK" ? "good" : a.billingStatus === "ISSUE" ? "bad" : "neutral"}>
                    {ru(a.billingStatus)}
                  </Badge>
                </Td>
                <Td>
                  <span className="font-mono text-[12px]">
                    {a.spendLimit ? money(a.spendLimit, a.currency) : <span className="text-muted">—</span>}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {a.pools?.length
                      ? a.pools.map(({ pool }) =>
                          pool && (
                            <span
                              key={pool.id}
                              className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                              style={{ backgroundColor: `${pool.color}18`, color: pool.color }}
                            >
                              {pool.name}
                            </span>
                          )
                        )
                      : <span className="text-muted">—</span>}
                  </div>
                </Td>
                <Td>
                  <span className="text-[11px] text-muted">
                    {a.lastHealthCheckAt
                      ? new Date(a.lastHealthCheckAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </Td>
                <Td className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => healthCheck([a.id])}>
                      <Activity size={12} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => api.archiveAccounts([a.id], true).then(load)}>
                      <Archive size={12} />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
