"use client";

import { Activity, Archive, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Empty, Input, Select, Table, statusTone } from "@/components/ui";
import { money } from "@/lib/format";
import { ru } from "@/lib/i18n";
import * as api from "@/lib/api";

type Pool = { id: string; name: string; color: string; _count?: { items: number } };
type Account = {
  id: string;
  externalId: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
  readinessStatus: string;
  readinessScore: number;
  billingStatus: string;
  tokenStatus: string;
  spendLimit?: number;
  notes?: string;
  lastSyncAt?: any;
  lastHealthCheckAt?: any;
  pools?: { pool?: Pool }[];
};

export function AccountsClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetPoolId, setTargetPoolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", status: "", readiness: "", poolId: "", problemOnly: false });
  const [form, setForm] = useState({ externalId: "", name: "", currency: "USD", timezone: "Europe/Moscow" });

  const allSelected = useMemo(() => accounts.length > 0 && accounts.every((account) => selectedIds.includes(account.id)), [accounts, selectedIds]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) params.set(key, "true");
      } else if (value) {
        params.set(key, value);
      }
    });
    const [accountsRes, poolsRes] = await Promise.all([
      api.getAccounts(filters.poolId, filters.status, filters.search, false),
      api.getPools(),
    ]);
    setAccounts(accountsRes.accounts ?? []);
    setPools(poolsRes.pools ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [filters]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function createAccount() {
    if (!form.externalId || !form.name) return;
    await api.createAccount(form);
    setForm({ externalId: "", name: "", currency: "USD", timezone: "Europe/Moscow" });
    await load();
  }

  async function syncMock() {
    await api.mockImportAccounts(30);
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

  async function archive(id: string) {
    await api.archiveAccounts([id], true);
    setSelectedIds((current) => current.filter((item) => item !== id));
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Мои кабинеты</h1>
          <p className="text-sm text-slate-500">База Meta кабинетов одного баера: статусы, пулы и готовность к запуску.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Обновить</Button>
          <Button onClick={syncMock}>Загрузить mock</Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-2 md:grid-cols-[1.3fr_160px_180px_180px_auto]">
          <Input placeholder="Поиск по названию или ID" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Meta статус</option>
            <option value="ACTIVE">Активен</option>
            <option value="LIMITED">Ограничен</option>
            <option value="DISABLED">Отключен</option>
            <option value="BILLING_ISSUE">Проблема оплаты</option>
          </Select>
          <Select value={filters.readiness} onChange={(event) => setFilters({ ...filters, readiness: event.target.value })}>
            <option value="">Readiness</option>
            <option value="READY">Готов</option>
            <option value="NEEDS_ATTENTION">Нужно внимание</option>
            <option value="BLOCKED">Заблокирован</option>
          </Select>
          <Select value={filters.poolId} onChange={(event) => setFilters({ ...filters, poolId: event.target.value })}>
            <option value="">Все пулы</option>
            {pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
            <input type="checkbox" checked={filters.problemOnly} onChange={(event) => setFilters({ ...filters, problemOnly: event.target.checked })} />
            Только проблемы
          </label>
        </div>
      </Card>

      <Card>
        <div className="grid gap-2 md:grid-cols-[160px_1fr_100px_180px_auto]">
          <Input placeholder="act_..." value={form.externalId} onChange={(event) => setForm({ ...form, externalId: event.target.value })} />
          <Input placeholder="Название кабинета" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="USD" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} />
          <Input placeholder="Europe/Moscow" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
          <Button onClick={createAccount}><Plus size={16} /> Добавить</Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-slate-600">Выбрано: {selectedIds.length}</span>
        <Button variant="ghost" disabled={!selectedIds.length} onClick={() => healthCheck(selectedIds)}><Activity size={16} /> Проверить выбранные</Button>
        <Select value={targetPoolId} onChange={(event) => setTargetPoolId(event.target.value)}>
          <option value="">Добавить в пул</option>
          {pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name}</option>)}
        </Select>
        <Button variant="ghost" disabled={!selectedIds.length || !targetPoolId} onClick={addToPool}>Применить</Button>
      </div>

      {loading ? <Empty text="Загрузка кабинетов..." /> : accounts.length === 0 ? <Empty text="Кабинетов пока нет. Добавьте вручную или загрузите mock данные." /> : (
        <Table>
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-field text-xs text-slate-500">
              <tr>
                <th className="p-3"><input type="checkbox" checked={allSelected} onChange={(event) => setSelectedIds(event.target.checked ? accounts.map((account) => account.id) : [])} /></th>
                <th>Кабинет</th>
                <th>External ID</th>
                <th>Meta</th>
                <th>Readiness</th>
                <th>Score</th>
                <th>Token</th>
                <th>Billing</th>
                <th>Лимит</th>
                <th>Пулы</th>
                <th>Проверка</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-line">
                  <td className="p-3"><input type="checkbox" checked={selectedIds.includes(account.id)} onChange={() => toggleSelected(account.id)} /></td>
                  <td className="font-bold">{account.name}<div className="text-xs font-normal text-slate-500">{account.timezone}</div></td>
                  <td>{account.externalId}</td>
                  <td><Badge tone={statusTone(account.status)}>{ru(account.status)}</Badge></td>
                  <td><Badge tone={statusTone(account.readinessStatus)}>{ru(account.readinessStatus)}</Badge></td>
                  <td className="font-bold">{account.readinessScore}</td>
                  <td><Badge tone={statusTone(account.tokenStatus)}>{ru(account.tokenStatus)}</Badge></td>
                  <td><Badge tone={account.billingStatus === "OK" ? "good" : account.billingStatus === "ISSUE" ? "bad" : "neutral"}>{ru(account.billingStatus)}</Badge></td>
                  <td>{account.spendLimit ? money(account.spendLimit, account.currency) : "-"}</td>
                  <td className="max-w-[220px]">
                    <div className="flex flex-wrap gap-1">
                      {account.pools?.length ? account.pools.map(({ pool }) => pool && <span key={pool.id} className="rounded px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: `${pool.color}16`, color: pool.color }}>{pool.name}</span>) : "-"}
                    </div>
                  </td>
                  <td>{account.lastHealthCheckAt ? new Date(account.lastHealthCheckAt).toLocaleString("ru-RU") : "-"}</td>
                  <td className="flex gap-2 py-3 pr-3">
                    <button className="font-bold text-blue-600" onClick={() => healthCheck([account.id])}>Проверить</button>
                    <button className="font-bold text-slate-500" onClick={() => archive(account.id)}><Archive className="inline" size={14} /> Архив</button>
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
