import {
  ChevronDown, ChevronUp, Info, Loader2, Play, Plus, TrendingUp, Trash2, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Input, Table } from "@/components/ui";
import * as api from "@/lib/api";
import type { ScaleRuleInput } from "@/lib/api";
import { useAiHighlight } from "@/lib/useAiHighlight";

// ─── Local types ──────────────────────────────────────────────────────────────

type AutoscaleConfig = {
  id: string;
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt?: string;
};

type ScaleRule = {
  id: string;
  name: string;
  geo: string;
  enabled: boolean;
  minSpend: number;
  maxCpa: number;
  minConversions: number;
  cloneCount: number;
  budgetMultiplier: number;
};

type CycleItem = {
  id: string;
  adAccountName: string;
  campaignName: string;
  geo: string;
  action: string;
  clonesCreated: number;
  reason: string;
  metricsJson: Record<string, any>;
};

type Cycle = {
  id: string;
  status: string;
  candidatesChecked: number;
  clonesCreated: number;
  skipped: number;
  startedAt: string;
  completedAt?: string;
  items?: CycleItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function actionTone(action: string): "good" | "neutral" | "warn" {
  switch (action) {
    case "CLONED":  return "good";
    case "SKIPPED": return "neutral";
    default:        return "warn";
  }
}

function actionLabel(action: string, clonesCreated?: number) {
  switch (action) {
    case "CLONED":  return `Клонирован ×${clonesCreated ?? 0}`;
    case "SKIPPED": return "Пропущен";
    case "NO_RULE": return "Нет правила";
    default:        return action;
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

// ─── Section: Config card ─────────────────────────────────────────────────────

function ConfigSection({
  config,
  onSave,
  onRun,
  running,
}: {
  config: AutoscaleConfig | null;
  onSave: (enabled: boolean, interval: number) => void;
  onRun: () => void;
  running: boolean;
}) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [interval, setInterval] = useState(config?.intervalMinutes ?? 30);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setInterval(config.intervalMinutes);
      setDirty(false);
    }
  }, [config]);

  function toggle() {
    setEnabled((v) => !v);
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
          <TrendingUp size={16} className={enabled ? "text-success" : "text-muted"} />
          {enabled ? "Автоскейл активен" : "Автоскейл отключён"}
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
            min={10}
            max={120}
            step={10}
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
              <><Play size={13} /> Запустить скейл</>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Section: Scale rules ─────────────────────────────────────────────────────

const EMPTY_RULE_FORM: ScaleRuleInput = {
  name: "",
  geo: "",
  enabled: true,
  minSpend: 30,
  maxCpa: 15,
  minConversions: 3,
  cloneCount: 2,
  budgetMultiplier: 1.0,
};

type RuleFormState = ScaleRuleInput & {
  minSpendStr: string;
  maxCpaStr: string;
  minConversionsStr: string;
  cloneCountStr: string;
  budgetMultiplierStr: string;
};

function ruleFormFromRule(rule: ScaleRule): RuleFormState {
  return {
    name: rule.name,
    geo: rule.geo,
    enabled: rule.enabled,
    minSpend: rule.minSpend,
    maxCpa: rule.maxCpa,
    minConversions: rule.minConversions,
    cloneCount: rule.cloneCount,
    budgetMultiplier: rule.budgetMultiplier,
    minSpendStr: String(rule.minSpend),
    maxCpaStr: String(rule.maxCpa),
    minConversionsStr: String(rule.minConversions),
    cloneCountStr: String(rule.cloneCount),
    budgetMultiplierStr: String(rule.budgetMultiplier),
  };
}

const defaultFormState: RuleFormState = {
  ...EMPTY_RULE_FORM,
  minSpendStr: "30",
  maxCpaStr: "15",
  minConversionsStr: "3",
  cloneCountStr: "2",
  budgetMultiplierStr: "1.0",
};

function formToInput(form: RuleFormState): ScaleRuleInput {
  return {
    name: form.name.trim(),
    geo: form.geo.trim().toUpperCase(),
    enabled: form.enabled,
    minSpend: parseFloat(form.minSpendStr) || 0,
    maxCpa: parseFloat(form.maxCpaStr) || 0,
    minConversions: parseInt(form.minConversionsStr, 10) || 0,
    cloneCount: parseInt(form.cloneCountStr, 10) || 1,
    budgetMultiplier: parseFloat(form.budgetMultiplierStr) || 1.0,
  };
}

function ScaleRulesSection({
  rules,
  onAdd,
  onUpdate,
  onDelete,
}: {
  rules: ScaleRule[];
  onAdd: (input: ScaleRuleInput) => Promise<void>;
  onUpdate: (id: string, input: ScaleRuleInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RuleFormState>({ ...defaultFormState });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RuleFormState | null>(null);

  function resetForm() {
    setForm({ ...defaultFormState });
    setShowForm(false);
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    setSaving(true);
    await onAdd(formToInput(form));
    resetForm();
    setSaving(false);
  }

  function startEdit(rule: ScaleRule) {
    setEditingId(rule.id);
    setEditForm(ruleFormFromRule(rule));
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    setSaving(true);
    await onUpdate(editingId, formToInput(editForm));
    setEditingId(null);
    setEditForm(null);
    setSaving(false);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold text-ink">Правила скейла</div>
          <div className="text-[11px] text-muted">Пороги победителей и количество клонов для каждого правила</div>
        </div>
        <Button variant="ghost" onClick={() => setShowForm((v) => !v)} className={hlAddScaleRule ? "ai-highlight" : ""}>
          <Plus size={13} /> Добавить правило
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-lg border border-stroke bg-raised p-3 animate-fade-in-up">
          <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Новое правило</div>
          <div className="grid gap-2 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold text-muted">Название *</label>
              <Input
                placeholder="Основное правило DE"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">GEO (пусто = любое)</label>
              <Input
                placeholder="DE, US, FR..."
                value={form.geo}
                onChange={(e) => setForm({ ...form, geo: e.target.value.toUpperCase() })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Min расход ($)</label>
              <Input
                type="number"
                placeholder="30"
                value={form.minSpendStr}
                onChange={(e) => setForm({ ...form, minSpendStr: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Max CPA ($)</label>
              <Input
                type="number"
                placeholder="15"
                value={form.maxCpaStr}
                onChange={(e) => setForm({ ...form, maxCpaStr: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Min конверсий (#)</label>
              <Input
                type="number"
                placeholder="3"
                value={form.minConversionsStr}
                onChange={(e) => setForm({ ...form, minConversionsStr: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Клонов (#)</label>
              <Input
                type="number"
                placeholder="2"
                value={form.cloneCountStr}
                onChange={(e) => setForm({ ...form, cloneCountStr: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Бюджет × (множитель)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="1.0"
                value={form.budgetMultiplierStr}
                onChange={(e) => setForm({ ...form, budgetMultiplierStr: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={!form.name.trim() || saving} onClick={handleAdd}>
              {saving ? "Сохраняем..." : "Добавить"}
            </Button>
            <Button variant="ghost" onClick={resetForm}>Отмена</Button>
          </div>
        </div>
      )}

      {rules.length === 0 && !showForm ? (
        <Empty text="Нет правил скейла. Добавьте первое правило выше." />
      ) : (
        <Table>
          <table className="w-full min-w-[700px] text-left text-[12px]">
            <thead>
              <tr>
                <th className="p-2">Название</th>
                <th>GEO</th>
                <th>MinSpend</th>
                <th>MaxCPA</th>
                <th>MinConv</th>
                <th>Клонов</th>
                <th>Бюджет×</th>
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
                    onClick={() =>
                      editingId === rule.id
                        ? (setEditingId(null), setEditForm(null))
                        : startEdit(rule)
                    }
                  >
                    <td className="p-2 font-semibold text-ink">{rule.name}</td>
                    <td className="font-black text-brand">{rule.geo || <span className="text-muted font-normal italic">Любое</span>}</td>
                    <td className="text-muted">${rule.minSpend}</td>
                    <td className="text-muted">${rule.maxCpa}</td>
                    <td className="text-muted">{rule.minConversions}</td>
                    <td className="font-semibold text-success">{rule.cloneCount}</td>
                    <td className="text-muted">×{rule.budgetMultiplier}</td>
                    <td>
                      <Badge tone={rule.enabled ? "good" : "neutral"}>
                        {rule.enabled ? "Активно" : "Выкл"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded p-1 text-muted hover:text-ink hover:bg-raised"
                          onClick={(e) => {
                            e.stopPropagation();
                            editingId === rule.id
                              ? (setEditingId(null), setEditForm(null))
                              : startEdit(rule);
                          }}
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
                      <td colSpan={9} className="px-3 py-3 animate-fade-in-up">
                        <div className="grid gap-2 md:grid-cols-4">
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[11px] font-semibold text-muted">Название</label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">GEO</label>
                            <Input
                              value={editForm.geo}
                              placeholder="Пусто = любое"
                              onChange={(e) => setEditForm({ ...editForm, geo: e.target.value.toUpperCase() })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">Min расход ($)</label>
                            <Input
                              type="number"
                              value={editForm.minSpendStr}
                              onChange={(e) => setEditForm({ ...editForm, minSpendStr: e.target.value })}
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
                            <label className="text-[11px] font-semibold text-muted">Min конверсий</label>
                            <Input
                              type="number"
                              value={editForm.minConversionsStr}
                              onChange={(e) => setEditForm({ ...editForm, minConversionsStr: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">Клонов (#)</label>
                            <Input
                              type="number"
                              value={editForm.cloneCountStr}
                              onChange={(e) => setEditForm({ ...editForm, cloneCountStr: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">Бюджет×</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={editForm.budgetMultiplierStr}
                              onChange={(e) => setEditForm({ ...editForm, budgetMultiplierStr: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted">Статус</label>
                            <select
                              value={editForm.enabled ? "1" : "0"}
                              onChange={(e) => setEditForm({ ...editForm, enabled: e.target.value === "1" })}
                              className="w-full rounded border border-stroke bg-card px-2 py-1.5 text-[12px] text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            >
                              <option value="1">Активно</option>
                              <option value="0">Выкл</option>
                            </select>
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

// ─── Section: How it works ────────────────────────────────────────────────────

function HowItWorksSection() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Info size={14} className="text-brand" />
          <span className="text-[13px] font-bold text-ink">Как работает Автоскейл</span>
        </div>
        {open ? <ChevronUp size={13} className="text-muted" /> : <ChevronDown size={13} className="text-muted" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2 text-[12px] text-muted animate-fade-in-up">
          <div className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[9px] font-black text-brand">1</span>
            <p>Автоскейл проверяет кампании по заданному интервалу (10–120 мин) и оценивает метрики каждой.</p>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[9px] font-black text-brand">2</span>
            <p>Если расход ≥ <strong className="text-ink">MinSpend</strong>, конверсий ≥ <strong className="text-ink">MinConv</strong> и CPA ≤ <strong className="text-ink">MaxCPA</strong> — кампания считается победителем.</p>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[9px] font-black text-brand">3</span>
            <p>Для победителей создаётся <strong className="text-ink">CloneCount</strong> клонов с бюджетом ×<strong className="text-ink">BudgetMultiplier</strong> от оригинала.</p>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[9px] font-black text-brand">4</span>
            <p>Клоны запускаются с теми же настройками таргетинга и креативами, что и оригинальная кампания.</p>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[9px] font-black text-brand">5</span>
            <p>Правила можно задавать по конкретному GEO или оставить пустым поле GEO — тогда правило применяется ко всем гео без более специфичного правила.</p>
          </div>
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

  return (
    <Card>
      <div className="mb-3">
        <div className="text-[13px] font-bold text-ink">История циклов</div>
        <div className="text-[11px] text-muted">Последние 20 запусков автоскейла</div>
      </div>

      {cycles.length === 0 ? (
        <Empty text="История пуста. Запустите первый цикл кнопкой «Запустить скейл»." />
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
                    {cycle.clonesCreated > 0 && (
                      <span className="text-success font-semibold">
                        {cycle.clonesCreated} клонов создано
                      </span>
                    )}
                    {cycle.candidatesChecked > 0 && (
                      <span className="text-muted">
                        {cycle.candidatesChecked} проверено
                      </span>
                    )}
                    {cycle.skipped > 0 && (
                      <span className="text-muted">
                        {cycle.skipped} пропущено
                      </span>
                    )}
                    {cycle.clonesCreated === 0 && cycle.candidatesChecked === 0 && cycle.skipped === 0 && (
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
                              <th>Кампания</th>
                              <th>GEO</th>
                              <th>Действие</th>
                              <th>Причина</th>
                              <th>Расход</th>
                              <th>Conv.</th>
                              <th>CPA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.items.map((item) => (
                              <tr key={item.id} className="border-t border-stroke/50">
                                <td className="p-1.5 font-semibold">{item.adAccountName}</td>
                                <td className="text-muted max-w-[200px] truncate">{item.campaignName}</td>
                                <td className="font-bold">{item.geo}</td>
                                <td>
                                  <Badge tone={actionTone(item.action)}>
                                    {actionLabel(item.action, item.clonesCreated)}
                                  </Badge>
                                </td>
                                <td className="text-muted max-w-[220px]">{item.reason}</td>
                                <td className="font-mono">${item.metricsJson?.spend ?? "—"}</td>
                                <td className="font-mono">{item.metricsJson?.conversions ?? "—"}</td>
                                <td className="font-mono">${item.metricsJson?.cpa ?? "—"}</td>
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

export function AutoscaleClient() {
  const hlAddScaleRule = useAiHighlight("add-scale-rule");
  const [config, setConfig] = useState<AutoscaleConfig | null>(null);
  const [rules, setRules] = useState<ScaleRule[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [cfgRes, rulesRes, cyclesRes] = await Promise.all([
      api.getAutoscaleConfig(),
      api.getScaleRules(),
      api.getAutoscaleCycles(20),
    ]);
    setConfig((cfgRes as any).config ?? null);
    setRules((rulesRes as any).rules ?? []);
    setCycles((cyclesRes as any).cycles ?? []);
    setLoading(false);
  }

  async function handleSaveConfig(enabled: boolean, intervalMinutes: number) {
    await api.saveAutoscaleConfig(enabled, intervalMinutes);
    const res = await api.getAutoscaleConfig();
    setConfig((res as any).config ?? null);
  }

  async function handleRun() {
    setRunning(true);
    const res = await api.forceRunAutoscale();
    const cycle = (res as any).cycle as Cycle | undefined;
    if (cycle) {
      setCycles((prev) => [cycle, ...prev.slice(0, 19)]);
    }
    const cfgRes = await api.getAutoscaleConfig();
    setConfig((cfgRes as any).config ?? null);
    setRunning(false);
  }

  async function handleAddRule(input: ScaleRuleInput) {
    await api.createScaleRule(input);
    const res = await api.getScaleRules();
    setRules((res as any).rules ?? []);
  }

  async function handleUpdateRule(id: string, input: ScaleRuleInput) {
    await api.updateScaleRule(id, input);
    const res = await api.getScaleRules();
    setRules((res as any).rules ?? []);
  }

  async function handleDeleteRule(id: string) {
    await api.deleteScaleRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleLoadDetail(id: string): Promise<Cycle | null> {
    const res = await api.getAutoscaleCycleDetail(id);
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
        <h1 className="text-xl font-black">Автоскейл</h1>
        <p className="text-[12px] text-muted">
          Автоматическое клонирование победителей: кампании с низким CPA и достаточным расходом масштабируются.
        </p>
      </div>

      <ConfigSection
        config={config}
        onSave={handleSaveConfig}
        onRun={handleRun}
        running={running}
      />

      <ScaleRulesSection
        rules={rules}
        onAdd={handleAddRule}
        onUpdate={handleUpdateRule}
        onDelete={handleDeleteRule}
      />

      <HowItWorksSection />

      <CycleHistorySection
        cycles={cycles}
        onLoadDetail={handleLoadDetail}
      />
    </div>
  );
}
