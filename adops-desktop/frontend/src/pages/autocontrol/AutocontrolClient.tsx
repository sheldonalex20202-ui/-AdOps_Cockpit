"use client";

import {
  ChevronDown, ChevronUp, Loader2, Play, Plus, Shield, Trash2, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Input, Table } from "@/components/ui";
import * as api from "@/lib/api";
import type { GeoRuleInput, PauseWindowInput } from "@/lib/api";
import { useAiHighlight } from "@/lib/useAiHighlight";

// ─── Types ────────────────────────────────────────────────────────────────────

type AutocontrolConfig = {
  id: string;
  userId: string;
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt?: string;
};

type GeoRule = {
  id: string;
  geo: string;
  enabled: boolean;
  maxCpa?: number;
  maxSpendNoConv?: number;
  maxUcpcNoConv?: number;
  maxSpendHighUcpc?: number;
};

type PauseWindow = {
  id: string;
  label: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  enabled: boolean;
};

type CycleItem = {
  id: string;
  adAccountName: string;
  adSetName: string;
  geo: string;
  action: string;
  reason: string;
  metricsJson: Record<string, any>;
};

type Cycle = {
  id: string;
  status: string;
  actionsTaken: number;
  paused: number;
  resumed: number;
  skipped: number;
  startedAt: string;
  completedAt?: string;
  items?: CycleItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  [-1]: "Каждый день",
  0: "Воскресенье",
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function actionTone(action: string): "bad" | "good" | "neutral" | "warn" {
  switch (action) {
    case "PAUSED":  return "bad";
    case "RESUMED": return "good";
    case "SKIPPED": return "neutral";
    default:        return "warn";
  }
}

function actionLabel(action: string) {
  switch (action) {
    case "PAUSED":  return "Пауза";
    case "RESUMED": return "Возобновлён";
    case "SKIPPED": return "Пропущен";
    case "NO_RULE": return "Нет правила";
    default:        return action;
  }
}

function parseFloatOrNull(s: string): number | null {
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

// ─── Section: Config bar ──────────────────────────────────────────────────────

function ConfigSection({
  config,
  onSave,
  onRun,
  running,
}: {
  config: AutocontrolConfig | null;
  onSave: (enabled: boolean, interval: number) => void;
  onRun: () => void;
  running: boolean;
}) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [interval, setInterval] = useState(config?.intervalMinutes ?? 20);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setInterval(config.intervalMinutes);
      setDirty(false);
    }
  }, [config]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setDirty(true);
  }

  function changeInterval(v: number) {
    setInterval(v);
    setDirty(true);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4">
        {/* Big toggle */}
        <button
          onClick={toggle}
          className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-[13px] font-bold transition-all ${
            enabled
              ? "bg-success/10 text-success ring-2 ring-success/30 hover:bg-success/20"
              : "bg-raised text-muted ring-1 ring-stroke hover:bg-selected hover:text-ink"
          }`}
        >
          <Shield size={16} className={enabled ? "text-success" : "text-muted"} />
          {enabled ? "Автоконтроль активен" : "Автоконтроль отключён"}
          <div
            className={`relative h-5 w-9 rounded-full transition-colors ${
              enabled ? "bg-success" : "bg-stroke"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        {/* Interval slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-muted whitespace-nowrap">Интервал:</span>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={interval}
            onChange={(e) => changeInterval(Number(e.target.value))}
            className="w-32"
          />
          <span className="w-16 text-[12px] font-black text-brand">{interval} мин</span>
        </div>

        {/* Last run */}
        <div className="text-[11px] text-muted">
          Последний запуск:{" "}
          <span className="font-semibold text-ink">{fmtTime(config?.lastRunAt)}</span>
        </div>

        {/* Buttons */}
        <div className="ml-auto flex gap-2">
          {dirty && (
            <Button onClick={() => { onSave(enabled, interval); setDirty(false); }}>
              Сохранить
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={running}
            onClick={onRun}
            className="gap-1.5"
          >
            {running ? (
              <><Loader2 size={13} className="animate-spin" /> Запускаем...</>
            ) : (
              <><Play size={13} /> Принудительный запуск</>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Section: GEO rules ───────────────────────────────────────────────────────

const EMPTY_RULE_FORM: GeoRuleInput = {
  geo: "",
  enabled: true,
  maxCpa: null,
  maxSpendNoConv: null,
  maxUcpcNoConv: null,
  maxSpendHighUcpc: null,
};

function GeoRulesSection({
  rules,
  onAdd,
  onUpdate,
  onDelete,
}: {
  rules: GeoRule[];
  onAdd: (input: GeoRuleInput) => Promise<void>;
  onUpdate: (id: string, input: GeoRuleInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const hlAddGeoRule = useAiHighlight("add-geo-rule");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_RULE_FORM, geoStr: "", maxCpaStr: "", maxSpendNoConvStr: "", maxUcpcNoConvStr: "", maxSpendHighUcpcStr: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof form | null>(null);

  function resetForm() {
    setForm({ ...EMPTY_RULE_FORM, geoStr: "", maxCpaStr: "", maxSpendNoConvStr: "", maxUcpcNoConvStr: "", maxSpendHighUcpcStr: "" });
    setShowForm(false);
  }

  async function handleAdd() {
    if (!form.geoStr.trim()) return;
    setSaving(true);
    await onAdd({
      geo: form.geoStr.trim(),
      enabled: true,
      maxCpa: parseFloatOrNull(form.maxCpaStr),
      maxSpendNoConv: parseFloatOrNull(form.maxSpendNoConvStr),
      maxUcpcNoConv: parseFloatOrNull(form.maxUcpcNoConvStr),
      maxSpendHighUcpc: parseFloatOrNull(form.maxSpendHighUcpcStr),
    });
    resetForm();
    setSaving(false);
  }

  function startEdit(rule: GeoRule) {
    setEditingId(rule.id);
    setEditForm({
      ...EMPTY_RULE_FORM,
      geoStr: rule.geo,
      maxCpaStr: rule.maxCpa != null ? String(rule.maxCpa) : "",
      maxSpendNoConvStr: rule.maxSpendNoConv != null ? String(rule.maxSpendNoConv) : "",
      maxUcpcNoConvStr: rule.maxUcpcNoConv != null ? String(rule.maxUcpcNoConv) : "",
      maxSpendHighUcpcStr: rule.maxSpendHighUcpc != null ? String(rule.maxSpendHighUcpc) : "",
    });
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    setSaving(true);
    await onUpdate(editingId, {
      geo: editForm.geoStr.trim(),
      enabled: true,
      maxCpa: parseFloatOrNull(editForm.maxCpaStr),
      maxSpendNoConv: parseFloatOrNull(editForm.maxSpendNoConvStr),
      maxUcpcNoConv: parseFloatOrNull(editForm.maxUcpcNoConvStr),
      maxSpendHighUcpc: parseFloatOrNull(editForm.maxSpendHighUcpcStr),
    });
    setEditingId(null);
    setEditForm(null);
    setSaving(false);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold text-ink">GEO правила</div>
          <div className="text-[11px] text-muted">Пороговые значения CPA и расходов для каждого ГЕО</div>
        </div>
        <Button variant="ghost" onClick={() => setShowForm((v) => !v)} className={hlAddGeoRule ? "ai-highlight" : ""}>
          <Plus size={13} /> Добавить GEO
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-lg border border-stroke bg-raised p-3 animate-fade-in-up">
          <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Новое правило</div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">GEO *</label>
              <Input
                placeholder="DE, US, FR..."
                value={form.geoStr}
                onChange={(e) => setForm({ ...form, geoStr: e.target.value.toUpperCase() })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Max CPA ($)</label>
              <Input
                type="number"
                placeholder="напр. 15.00"
                value={form.maxCpaStr}
                onChange={(e) => setForm({ ...form, maxCpaStr: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Max расход без конверсий ($)</label>
              <Input
                type="number"
                placeholder="напр. 50.00"
                value={form.maxSpendNoConvStr}
                onChange={(e) => setForm({ ...form, maxSpendNoConvStr: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Max uCPC без конверсий ($)</label>
              <Input
                type="number"
                placeholder="напр. 1.50"
                value={form.maxUcpcNoConvStr}
                onChange={(e) => setForm({ ...form, maxUcpcNoConvStr: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Max расход при высоком uCPC ($)</label>
              <Input
                type="number"
                placeholder="напр. 100.00"
                value={form.maxSpendHighUcpcStr}
                onChange={(e) => setForm({ ...form, maxSpendHighUcpcStr: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={!form.geoStr.trim() || saving} onClick={handleAdd}>
              {saving ? "Сохраняем..." : "Добавить"}
            </Button>
            <Button variant="ghost" onClick={resetForm}>Отмена</Button>
          </div>
        </div>
      )}

      {rules.length === 0 && !showForm ? (
        <Empty text="Нет GEO правил. Добавьте первое правило выше." />
      ) : (
        <Table>
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead>
              <tr>
                <th className="p-2">GEO</th>
                <th>Max CPA</th>
                <th>Max расход/нет конв.</th>
                <th>Max uCPC/нет конв.</th>
                <th>Max расход/выс. uCPC</th>
                <th>Статус</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <>
                  <tr
                    key={rule.id}
                    className="border-t border-stroke cursor-pointer hover:bg-raised"
                    onClick={() => editingId === rule.id ? (setEditingId(null), setEditForm(null)) : startEdit(rule)}
                  >
                    <td className="p-2 font-black text-ink">{rule.geo}</td>
                    <td className="text-muted">{rule.maxCpa != null ? `$${rule.maxCpa}` : "—"}</td>
                    <td className="text-muted">{rule.maxSpendNoConv != null ? `$${rule.maxSpendNoConv}` : "—"}</td>
                    <td className="text-muted">{rule.maxUcpcNoConv != null ? `$${rule.maxUcpcNoConv}` : "—"}</td>
                    <td className="text-muted">{rule.maxSpendHighUcpc != null ? `$${rule.maxSpendHighUcpc}` : "—"}</td>
                    <td>
                      <Badge tone={rule.enabled ? "good" : "neutral"}>
                        {rule.enabled ? "Активно" : "Выкл"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded p-1 text-muted hover:text-ink hover:bg-raised"
                          onClick={(e) => { e.stopPropagation(); editingId === rule.id ? (setEditingId(null), setEditForm(null)) : startEdit(rule); }}
                          title="Редактировать"
                        >
                          {editingId === rule.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                        <button
                          className="rounded p-1 text-muted hover:text-danger hover:bg-danger/10"
                          onClick={(e) => { e.stopPropagation(); void onDelete(rule.id); }}
                          title="Удалить"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === rule.id && editForm && (
                    <tr key={`${rule.id}-edit`} className="border-t border-stroke bg-raised/60">
                      <td colSpan={7} className="px-3 py-3 animate-fade-in-up">
                        <div className="grid gap-2 md:grid-cols-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">GEO</label>
                            <Input
                              value={editForm.geoStr}
                              onChange={(e) => setEditForm({ ...editForm, geoStr: e.target.value.toUpperCase() })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">Max CPA ($)</label>
                            <Input
                              type="number"
                              value={editForm.maxCpaStr}
                              onChange={(e) => setEditForm({ ...editForm, maxCpaStr: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">Max расход/нет конв. ($)</label>
                            <Input
                              type="number"
                              value={editForm.maxSpendNoConvStr}
                              onChange={(e) => setEditForm({ ...editForm, maxSpendNoConvStr: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">Max uCPC/нет конв. ($)</label>
                            <Input
                              type="number"
                              value={editForm.maxUcpcNoConvStr}
                              onChange={(e) => setEditForm({ ...editForm, maxUcpcNoConvStr: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">Max расход/выс. uCPC ($)</label>
                            <Input
                              type="number"
                              value={editForm.maxSpendHighUcpcStr}
                              onChange={(e) => setEditForm({ ...editForm, maxSpendHighUcpcStr: e.target.value })}
                              className="w-full"
                            />
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button disabled={saving} onClick={saveEdit}>
                            {saving ? "Сохраняем..." : "Сохранить"}
                          </Button>
                          <Button variant="ghost" onClick={() => { setEditingId(null); setEditForm(null); }}>
                            Отмена
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </Table>
      )}
    </Card>
  );
}

// ─── Section: Pause windows ───────────────────────────────────────────────────

const EMPTY_WINDOW_FORM: PauseWindowInput = {
  label: "",
  dayOfWeek: -1,
  startHour: 23,
  endHour: 6,
  enabled: true,
};

function PauseWindowsSection({
  windows,
  onAdd,
  onDelete,
}: {
  windows: PauseWindow[];
  onAdd: (input: PauseWindowInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_WINDOW_FORM });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!form.label.trim()) return;
    setSaving(true);
    await onAdd(form);
    setForm({ ...EMPTY_WINDOW_FORM });
    setShowForm(false);
    setSaving(false);
  }

  function windowDesc(w: PauseWindow) {
    return `${DAY_LABELS[w.dayOfWeek] ?? `День ${w.dayOfWeek}`}  ${pad(w.startHour)}:00 – ${pad(w.endHour)}:00`;
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold text-ink">Паузные окна</div>
          <div className="text-[11px] text-muted">Временные интервалы, когда автоконтроль не запускается</div>
        </div>
        <Button variant="ghost" onClick={() => setShowForm((v) => !v)}>
          <Plus size={13} /> Добавить окно
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-lg border border-stroke bg-raised p-3 animate-fade-in-up">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold text-muted">Название *</label>
              <Input
                placeholder="Ночной перерыв"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">День недели</label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                className="w-full rounded border border-stroke bg-card px-2 py-1.5 text-[12px] text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                {Object.entries(DAY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Начало (час)</label>
              <Input
                type="number"
                min={0}
                max={23}
                value={form.startHour}
                onChange={(e) => setForm({ ...form, startHour: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Конец (час)</label>
              <Input
                type="number"
                min={0}
                max={23}
                value={form.endHour}
                onChange={(e) => setForm({ ...form, endHour: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={!form.label.trim() || saving} onClick={handleAdd}>
              {saving ? "Сохраняем..." : "Добавить"}
            </Button>
            <Button variant="ghost" onClick={() => { setForm({ ...EMPTY_WINDOW_FORM }); setShowForm(false); }}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {windows.length === 0 && !showForm ? (
        <Empty text="Нет паузных окон. Автоконтроль будет запускаться круглосуточно." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {windows.map((w) => (
            <div
              key={w.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] ${
                w.enabled ? "border-stroke bg-card" : "border-stroke bg-raised opacity-60"
              }`}
            >
              <div>
                <div className="font-semibold text-ink">{w.label}</div>
                <div className="text-[11px] text-muted">{windowDesc(w)}</div>
              </div>
              {w.enabled && <Badge tone="good">Активно</Badge>}
              <button
                className="ml-1 rounded p-0.5 text-muted hover:text-danger hover:bg-danger/10"
                onClick={() => void onDelete(w.id)}
                title="Удалить"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section: Cycle history ───────────────────────────────────────────────────

function CycleHistorySection({ cycles, onLoadDetail }: {
  cycles: Cycle[];
  onLoadDetail: (id: string) => Promise<Cycle | null>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, Cycle>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      setLoading(id);
      const detail = await onLoadDetail(id);
      if (detail) setDetailCache((prev) => ({ ...prev, [id]: detail }));
      setLoading(null);
    }
  }

  function cycleTone(status: string): "good" | "bad" | "warn" | "neutral" {
    switch (status) {
      case "COMPLETED": return "good";
      case "FAILED":    return "bad";
      case "RUNNING":   return "warn";
      default:          return "neutral";
    }
  }

  return (
    <Card>
      <div className="mb-3">
        <div className="text-[13px] font-bold text-ink">История циклов</div>
        <div className="text-[11px] text-muted">Последние 20 запусков автоконтроля</div>
      </div>

      {cycles.length === 0 ? (
        <Empty text="История пуста. Запустите первый цикл кнопкой «Принудительный запуск»." />
      ) : (
        <div className="space-y-1">
          {cycles.map((cycle) => {
            const expanded = expandedId === cycle.id;
            const detail = detailCache[cycle.id];
            return (
              <div key={cycle.id} className="rounded-lg border border-stroke overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-raised transition-colors"
                  onClick={() => void toggle(cycle.id)}
                >
                  <Badge tone={cycleTone(cycle.status)}>
                    {cycle.status === "COMPLETED" ? "Завершён" : cycle.status === "RUNNING" ? "В процессе" : cycle.status}
                  </Badge>
                  <span className="text-[12px] font-semibold text-ink">
                    {fmtTime(cycle.startedAt)}
                  </span>
                  <div className="flex items-center gap-3 text-[11px] ml-2">
                    {cycle.paused > 0 && (
                      <span className="text-danger font-semibold">
                        {cycle.paused} поставлено на паузу
                      </span>
                    )}
                    {cycle.resumed > 0 && (
                      <span className="text-success font-semibold">
                        {cycle.resumed} возобновлено
                      </span>
                    )}
                    {cycle.skipped > 0 && (
                      <span className="text-muted">
                        {cycle.skipped} пропущено
                      </span>
                    )}
                    {cycle.paused === 0 && cycle.resumed === 0 && cycle.skipped === 0 && (
                      <span className="text-muted">нет действий</span>
                    )}
                  </div>
                  <div className="ml-auto text-muted">
                    {loading === cycle.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : expanded
                      ? <ChevronUp size={13} />
                      : <ChevronDown size={13} />
                    }
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-stroke bg-raised/40 px-3 py-2 animate-fade-in-up">
                    {!detail ? (
                      <div className="text-[11px] text-muted py-2">Загружаем детали...</div>
                    ) : !detail.items || detail.items.length === 0 ? (
                      <div className="text-[11px] text-muted py-2">Нет действий в этом цикле</div>
                    ) : (
                      <Table>
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr>
                              <th className="p-1.5">Кабинет</th>
                              <th>Adset</th>
                              <th>GEO</th>
                              <th>Действие</th>
                              <th>Причина</th>
                              <th>Расход</th>
                              <th>Conv.</th>
                              <th>CPA</th>
                              <th>uCPC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.items.map((item) => (
                              <tr key={item.id} className="border-t border-stroke/50">
                                <td className="p-1.5 font-semibold">{item.adAccountName}</td>
                                <td className="text-muted max-w-[180px] truncate">{item.adSetName}</td>
                                <td className="font-bold">{item.geo}</td>
                                <td>
                                  <Badge tone={actionTone(item.action)}>
                                    {actionLabel(item.action)}
                                  </Badge>
                                </td>
                                <td className="text-muted max-w-[200px]">{item.reason}</td>
                                <td className="font-mono">${item.metricsJson?.spend ?? "—"}</td>
                                <td className="font-mono">{item.metricsJson?.conversions ?? "—"}</td>
                                <td className="font-mono">${item.metricsJson?.cpa ?? "—"}</td>
                                <td className="font-mono">${item.metricsJson?.ucpc ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AutocontrolClient() {
  const [config, setConfig] = useState<AutocontrolConfig | null>(null);
  const [rules, setRules] = useState<GeoRule[]>([]);
  const [windows, setWindows] = useState<PauseWindow[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [cfgRes, rulesRes, windowsRes, cyclesRes] = await Promise.all([
      api.getAutocontrolConfig(),
      api.getGeoRules(),
      api.getPauseWindows(),
      api.getAutocontrolCycles(20),
    ]);
    setConfig((cfgRes as any).config ?? null);
    setRules((rulesRes as any).rules ?? []);
    setWindows((windowsRes as any).windows ?? []);
    setCycles((cyclesRes as any).cycles ?? []);
    setLoading(false);
  }

  async function handleSaveConfig(enabled: boolean, intervalMinutes: number) {
    await api.saveAutocontrolConfig(enabled, intervalMinutes);
    const res = await api.getAutocontrolConfig();
    setConfig((res as any).config ?? null);
  }

  async function handleRun() {
    setRunning(true);
    const res = await api.forceRunAutocontrol();
    const cycle = (res as any).cycle as Cycle | undefined;
    if (cycle) {
      setCycles((prev) => [cycle, ...prev.slice(0, 19)]);
    }
    const cfgRes = await api.getAutocontrolConfig();
    setConfig((cfgRes as any).config ?? null);
    setRunning(false);
  }

  async function handleAddRule(input: GeoRuleInput) {
    await api.createGeoRule(input);
    const res = await api.getGeoRules();
    setRules((res as any).rules ?? []);
  }

  async function handleUpdateRule(id: string, input: GeoRuleInput) {
    await api.updateGeoRule(id, input);
    const res = await api.getGeoRules();
    setRules((res as any).rules ?? []);
  }

  async function handleDeleteRule(id: string) {
    await api.deleteGeoRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleAddWindow(input: PauseWindowInput) {
    await api.createPauseWindow(input);
    const res = await api.getPauseWindows();
    setWindows((res as any).windows ?? []);
  }

  async function handleDeleteWindow(id: string) {
    await api.deletePauseWindow(id);
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleLoadDetail(id: string): Promise<Cycle | null> {
    const res = await api.getAutocontrolCycleDetail(id);
    return (res as any).cycle ?? null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black">Автоконтроль</h1>
        <p className="text-[12px] text-muted">
          Автоматическая пауза и возобновление adset-ов по GEO-правилам CPA и расходов.
        </p>
      </div>

      <ConfigSection
        config={config}
        onSave={handleSaveConfig}
        onRun={handleRun}
        running={running}
      />

      <GeoRulesSection
        rules={rules}
        onAdd={handleAddRule}
        onUpdate={handleUpdateRule}
        onDelete={handleDeleteRule}
      />

      <PauseWindowsSection
        windows={windows}
        onAdd={handleAddWindow}
        onDelete={handleDeleteWindow}
      />

      <CycleHistorySection
        cycles={cycles}
        onLoadDetail={handleLoadDetail}
      />
    </div>
  );
}
