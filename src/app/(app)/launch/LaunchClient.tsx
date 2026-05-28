"use client";

import {
  CheckCircle, ChevronLeft, ChevronRight, Image, Layers, Loader2,
  Plus, Rocket, Video, XCircle,
} from "lucide-react";
import { calcTotals } from "@/lib/launch-engine";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Empty, Input, Select, Table, statusTone } from "@/components/ui";
import { ru } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type Pool = { id: string; name: string; color: string };
type Account = {
  id: string; name: string; externalId: string;
  status: string; readinessStatus: string; readinessScore: number;
  pools: { pool: Pool }[];
};
type Creative = {
  id: string; name: string; type: string;
  zGroup: string | null; geo: string | null;
  headline: string | null; primaryText: string | null;
  callToAction: string; destinationUrl: string | null;
};
type Template = {
  id: string; name: string; objective: string;
  dailyBudget: number | null; bidStrategy: string;
  optimizationGoal: string; campaignStatus: string;
};

type Structure = "CBO" | "ABO" | "ISOLATION" | "Z_GROUPED";

type HeadlineSet = {
  id: string; name: string; source: string; geo: string | null;
  headlinesJson: Record<string, string>;
};

type Rules = {
  structure: Structure;
  objective: string;
  campaignStatus: string;
  dailyBudget: string;
  bidStrategy: string;
  optimizationGoal: string;
  campaignsPerAccount: number;
  headlineSetId: string;
  campaignNameTpl: string;
  adSetNameTpl: string;
  adNameTpl: string;
};

type JobItem = {
  id: string; status: string; errorMessage: string | null;
  adAccount: { id: string; name: string; externalId: string };
  resultJson: {
    structure: string;
    totalCampaigns: number; totalAdSets: number; totalAds: number;
    // CBO
    campaign?: { id: string; name: string };
    adSets?: { adSetId: string; adSetName: string; adId: string; creativeName: string }[];
    // ABO
    adSet?: { id: string; name: string };
    ads?: { adId: string; creativeName: string }[];
    // ISOLATION
    campaigns?: { campaignId: string; campaignName: string; creativeName: string }[];
  } | null;
};
type JobResult = {
  id: string; status: string;
  successCount: number; failedCount: number; totalAccounts: number;
  configJson: { structure: string } | null;
  items: JobItem[];
};

const DEFAULT_RULES: Rules = {
  structure: "CBO",
  objective: "TRAFFIC",
  campaignStatus: "PAUSED",
  dailyBudget: "",
  bidStrategy: "LOWEST_COST_WITHOUT_CAP",
  optimizationGoal: "LINK_CLICKS",
  campaignsPerAccount: 3,
  headlineSetId: "",
  campaignNameTpl: "{account} | {objective} | {date}",
  adSetNameTpl: "{account} | {zGroup}",
  adNameTpl: "{account} | {creative}",
};

const OBJECTIVES = ["AWARENESS", "TRAFFIC", "ENGAGEMENT", "LEADS", "APP_PROMOTION", "SALES"];
const BID_STRATEGIES = ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "MINIMUM_ROAS"];
const OPT_GOALS = ["LINK_CLICKS", "LANDING_PAGE_VIEWS", "REACH", "IMPRESSIONS", "LEAD_GENERATION", "CONVERSIONS", "APP_INSTALLS"];
const CTA_OPTIONS = ["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "GET_OFFER", "SUBSCRIBE", "BOOK_NOW", "CONTACT_US", "DOWNLOAD"];

// ─── Helpers ──────────────────────────────────────────────────────────────────



function Num({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-black text-slate-900">{n.toLocaleString()}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current }: { current: number }) {
  const steps = ["Кабинеты", "Правила", "Креативы", "Запуск"];
  return (
    <div className="flex flex-wrap items-center gap-0">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${done ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
              {done ? <CheckCircle size={16} /> : n}
            </div>
            <span className={`ml-2 text-sm font-semibold ${active ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
            {i < steps.length - 1 && <div className="mx-3 h-px w-8 bg-slate-200" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Structure card ───────────────────────────────────────────────────────────
function StructureCard({
  value, selected, onClick, title, subtitle, schema,
}: {
  value: Structure; selected: boolean; onClick: () => void;
  title: string; subtitle: string; schema: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${selected ? "border-blue-500 bg-blue-50" : "border-line bg-white hover:border-blue-200"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${selected ? "border-blue-500 bg-blue-500" : "border-slate-300"}`} />
      </div>
      <pre className="mt-3 rounded bg-slate-900 px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-400 whitespace-pre-wrap">{schema}</pre>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LaunchClient() {
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<JobResult | null>(null);
  const [launching, setLaunching] = useState(false);
  const [jobName, setJobName] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolFilter, setPoolFilter] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [headlineSets, setHeadlineSets] = useState<HeadlineSet[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  // Keitaro sync modal
  const [showKeitaroForm, setShowKeitaroForm] = useState(false);
  const [keitaroForm, setKeitaroForm] = useState({ name: "", keitaroUrl: "", apiKey: "", campaignId: "", geo: "" });
  const [syncingKeitaro, setSyncingKeitaro] = useState(false);

  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [selectedCreativeIds, setSelectedCreativeIds] = useState<string[]>([]);
  const [showCreativeForm, setShowCreativeForm] = useState(false);
  const [newCreative, setNewCreative] = useState({ name: "", headline: "", primaryText: "", destinationUrl: "", callToAction: "LEARN_MORE" });
  const [savingCreative, setSavingCreative] = useState(false);

  useEffect(() => { void loadAccounts(); void loadTemplates(); void loadCreatives(); void loadHeadlineSets(); }, []);
  useEffect(() => { void loadAccounts(); }, [poolFilter]);

  async function loadAccounts() {
    setLoadingAccounts(true);
    const params = new URLSearchParams(poolFilter ? { poolId: poolFilter } : {});
    const [ar, pr] = await Promise.all([fetch(`/api/accounts?${params}`), fetch("/api/account-pools")]);
    setAccounts((await ar.json()).accounts ?? []);
    setPools((await pr.json()).pools ?? []);
    setLoadingAccounts(false);
  }

  async function loadTemplates() {
    const res = await fetch("/api/campaign-templates");
    setTemplates((await res.json()).templates ?? []);
  }

  async function loadHeadlineSets() {
    const res = await fetch("/api/headline-sets");
    setHeadlineSets((await res.json()).sets ?? []);
  }

  async function syncKeitaro() {
    if (!keitaroForm.name || !keitaroForm.keitaroUrl || !keitaroForm.apiKey) return;
    setSyncingKeitaro(true);
    const res = await fetch("/api/headline-sets/keitaro-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...keitaroForm, geo: keitaroForm.geo || null }),
    });
    const data = await res.json();
    if (data.set) {
      await loadHeadlineSets();
      setRules((r) => ({ ...r, headlineSetId: data.set.id }));
    }
    setKeitaroForm({ name: "", keitaroUrl: "", apiKey: "", campaignId: "", geo: "" });
    setShowKeitaroForm(false);
    setSyncingKeitaro(false);
  }

  async function loadCreatives() {
    const res = await fetch("/api/creatives");
    setCreatives((await res.json()).creatives ?? []);
  }

  async function saveTemplate() {
    if (!templateName) return;
    setSavingTemplate(true);
    await fetch("/api/campaign-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateName, objective: rules.objective,
        campaignStatus: rules.campaignStatus,
        dailyBudget: rules.dailyBudget || null,
        bidStrategy: rules.bidStrategy,
        optimizationGoal: rules.optimizationGoal,
        adSetNameTpl: rules.adSetNameTpl,
        adNameTpl: rules.adNameTpl,
      }),
    });
    setTemplateName("");
    setSavingTemplate(false);
    await loadTemplates();
  }

  async function addCreative() {
    if (!newCreative.name) return;
    setSavingCreative(true);
    const res = await fetch("/api/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCreative, type: "TEXT_ONLY", headline: newCreative.headline || null, primaryText: newCreative.primaryText || null, destinationUrl: newCreative.destinationUrl || null }),
    });
    const data = await res.json();
    if (data.creative) {
      setCreatives((prev) => [data.creative, ...prev]);
      setSelectedCreativeIds((prev) => [...prev, data.creative.id]);
    }
    setNewCreative({ name: "", headline: "", primaryText: "", destinationUrl: "", callToAction: "LEARN_MORE" });
    setShowCreativeForm(false);
    setSavingCreative(false);
  }

  async function launch() {
    if (!jobName || !selectedAccountIds.length || !selectedCreativeIds.length) return;
    setLaunching(true);
    const res = await fetch("/api/launch-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: jobName,
        accountIds: selectedAccountIds,
        creativeIds: selectedCreativeIds,
        structure: rules.structure,
        headlineSetId: rules.headlineSetId || null,
        campaignsPerAccount: rules.campaignsPerAccount,
        config: {
          objective: rules.objective,
          buyingType: "AUCTION",
          campaignStatus: rules.campaignStatus,
          dailyBudget: rules.dailyBudget ? Number(rules.dailyBudget) : null,
          bidStrategy: rules.bidStrategy,
          optimizationGoal: rules.optimizationGoal,
          billingEvent: "IMPRESSIONS",
          campaignNameTpl: rules.campaignNameTpl,
          adSetNameTpl: rules.adSetNameTpl,
          adNameTpl: rules.adNameTpl,
        },
      }),
    });
    const data = await res.json();
    setResult(data.job ?? null);
    setLaunching(false);
  }

  function reset() { setStep(1); setResult(null); setSelectedAccountIds([]); setSelectedCreativeIds([]); setJobName(""); setRules(DEFAULT_RULES); }

  const selectedCreatives = creatives.filter((c) => selectedCreativeIds.includes(c.id));
  const zGroups = useMemo(() => {
    const groups = new Set(selectedCreatives.map((c) => c.zGroup).filter(Boolean));
    return groups.size;
  }, [selectedCreativeIds, creatives]);

  // Auto-detect geo from selected creatives for headline set matching
  const detectedGeos = useMemo(() => {
    const geos = new Set(selectedCreatives.map((c) => c.geo).filter(Boolean));
    return [...geos] as string[];
  }, [selectedCreatives]);

  const totals = useMemo(
    () => calcTotals(rules.structure, selectedAccountIds.length, selectedCreativeIds.length, zGroups, rules.campaignsPerAccount),
    [rules.structure, selectedAccountIds.length, selectedCreativeIds.length, zGroups, rules.campaignsPerAccount]
  );

  const allVisible = accounts.length > 0 && accounts.every((a) => selectedAccountIds.includes(a.id));

  // ── Results ───────────────────────────────────────────────────────────────
  if (result) {
    const successRate = result.totalAccounts > 0 ? Math.round((result.successCount / result.totalAccounts) * 100) : 0;
    const totalAds = result.items.reduce((sum, it) => sum + (it.resultJson?.totalAds ?? 0), 0);
    const totalAdSets = result.items.reduce((sum, it) => sum + (it.resultJson?.totalAdSets ?? 0), 0);
    const totalCampaigns = result.items.reduce((sum, it) => sum + (it.resultJson?.totalCampaigns ?? 0), 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Результаты залива</h1>
            <p className="text-sm text-slate-500">Структура: {result.configJson?.structure ?? "—"}</p>
          </div>
          <Button variant="ghost" onClick={reset}><Rocket size={16} /> Новый залив</Button>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          <Card className="text-center col-span-2 md:col-span-1">
            <Num n={result.totalAccounts} label="Кабинетов" />
          </Card>
          <Card className="text-center">
            <Num n={result.successCount} label="Успешно" />
          </Card>
          <Card className="text-center">
            <Num n={result.failedCount} label="Ошибок" />
          </Card>
          <Card className="text-center">
            <Num n={totalCampaigns} label="Кампаний" />
          </Card>
          <Card className="text-center">
            <Num n={totalAdSets} label="Групп" />
          </Card>
          <Card className="text-center">
            <Num n={totalAds} label="Объявлений" />
          </Card>
        </div>

        <Card>
          <div className="mb-2 flex items-center gap-3">
            <Badge tone={result.status === "COMPLETED" ? "good" : result.status === "PARTIAL" ? "warn" : "bad"}>
              {ru(result.status)}
            </Badge>
            <span className="text-sm text-slate-500">Успешность: {successRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${successRate}%` }} />
          </div>
        </Card>

        <Table>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-field text-xs text-slate-500">
              <tr>
                <th className="p-3">Кабинет</th>
                <th>Ext ID</th>
                <th>Статус</th>
                <th>Кампаний</th>
                <th>Групп</th>
                <th>Объявлений</th>
                <th>Кампания (ID)</th>
                <th>Ошибка</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="p-3 font-bold">{item.adAccount.name}</td>
                  <td className="text-slate-500 text-xs">{item.adAccount.externalId}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {item.status === "SUCCESS"
                        ? <CheckCircle size={13} className="text-emerald-500" />
                        : <XCircle size={13} className="text-red-500" />}
                      <Badge tone={statusTone(item.status)}>{ru(item.status)}</Badge>
                    </div>
                  </td>
                  <td className="font-bold">{item.resultJson?.totalCampaigns ?? "—"}</td>
                  <td className="font-bold">{item.resultJson?.totalAdSets ?? "—"}</td>
                  <td className="font-bold text-blue-700">{item.resultJson?.totalAds ?? "—"}</td>
                  <td className="font-mono text-[11px] text-slate-500">
                    {item.resultJson?.campaign?.id ?? item.resultJson?.campaigns?.[0]?.campaignId ?? "—"}
                  </td>
                  <td className="max-w-[220px] text-xs text-red-600">{item.errorMessage ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Автозалив</h1>
          <p className="text-sm text-slate-500">Массовый запуск кампаний по выбранным кабинетам с правилами структуры.</p>
        </div>
        {(selectedAccountIds.length > 0 || selectedCreativeIds.length > 0) && (
          <div className="flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
            <Num n={selectedAccountIds.length} label="кабинетов" />
            <div className="h-8 w-px bg-blue-200" />
            <Num n={selectedCreativeIds.length} label="креативов" />
            <div className="h-8 w-px bg-blue-200" />
            <Num n={totals.campaigns} label="кампаний" />
            <div className="h-8 w-px bg-blue-200" />
            <Num n={totals.adSets} label="групп" />
            <div className="h-8 w-px bg-blue-200" />
            <Num n={totals.ads} label="объявлений" />
          </div>
        )}
      </div>

      <Steps current={step} />

      {/* ── Step 1: Accounts ── */}
      {step === 1 && (
        <div className="space-y-3">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)}>
                <option value="">Все пулы</option>
                {pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <span className="text-sm text-slate-600">
                Выбрано: <strong className="text-blue-700">{selectedAccountIds.length}</strong> из {accounts.length}
              </span>
              {selectedAccountIds.length > 0 && (
                <button className="text-xs text-slate-400 hover:text-red-500" onClick={() => setSelectedAccountIds([])}>
                  Сбросить
                </button>
              )}
              {accounts.length > 0 && (
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  onClick={() => setSelectedAccountIds(accounts.map((a) => a.id))}>
                  Выбрать все ({accounts.length})
                </button>
              )}
            </div>
          </Card>

          {loadingAccounts ? (
            <Empty text="Загрузка кабинетов..." />
          ) : accounts.length === 0 ? (
            <Empty text="Нет доступных кабинетов. Добавьте их в разделе «Мои кабинеты»." />
          ) : (
            <Table>
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-field text-xs text-slate-500">
                  <tr>
                    <th className="p-3">
                      <input type="checkbox" checked={allVisible}
                        onChange={(e) => setSelectedAccountIds(e.target.checked ? accounts.map((a) => a.id) : [])} />
                    </th>
                    <th>Кабинет</th>
                    <th>External ID</th>
                    <th>Meta</th>
                    <th>Readiness</th>
                    <th>Score</th>
                    <th>Пулы</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => {
                    const sel = selectedAccountIds.includes(acc.id);
                    return (
                      <tr key={acc.id}
                        className={`cursor-pointer border-t border-line ${sel ? "bg-blue-50" : "hover:bg-slate-50"}`}
                        onClick={() => setSelectedAccountIds((prev) => sel ? prev.filter((id) => id !== acc.id) : [...prev, acc.id])}>
                        <td className="p-3"><input type="checkbox" checked={sel} onChange={() => {}} /></td>
                        <td className="font-bold">{acc.name}</td>
                        <td className="text-xs text-slate-500">{acc.externalId}</td>
                        <td><Badge tone={statusTone(acc.status)}>{ru(acc.status)}</Badge></td>
                        <td><Badge tone={statusTone(acc.readinessStatus)}>{ru(acc.readinessStatus)}</Badge></td>
                        <td className="font-bold">{acc.readinessScore}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {acc.pools.map(({ pool }) => (
                              <span key={pool.id} className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                                style={{ backgroundColor: `${pool.color}18`, color: pool.color }}>{pool.name}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Table>
          )}

          <div className="flex justify-end">
            <Button disabled={selectedAccountIds.length === 0} onClick={() => setStep(2)}>
              Далее: Правила <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Rules ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Structure */}
          <Card>
            <div className="mb-3 text-sm font-bold text-slate-700">Структура залива</div>
            <div className="grid gap-3 md:grid-cols-2">
              <StructureCard value="Z_GROUPED" selected={rules.structure === "Z_GROUPED"} onClick={() => setRules({ ...rules, structure: "Z_GROUPED" })}
                title="Z-группы + Keitaro — основной"
                subtitle="N кампаний на кабинет. Группы по Z-номеру крео, заголовки из Keitaro."
                schema={`Кабинет\n├─ Кампания C1 (CBO)\n│  ├─ Группа Z1 + headline_Z1 → Ad\n│  ├─ Группа Z2 + headline_Z2 → Ad\n│  └─ Группа Z3 + headline_Z3 → Ad\n├─ Кампания C2 (CBO) [дубль]\n│  ├─ Группа Z1 ... └─ ...`} />
              <StructureCard value="CBO" selected={rules.structure === "CBO"} onClick={() => setRules({ ...rules, structure: "CBO" })}
                title="CBO — стандартный"
                subtitle="1 кампания → N групп (по крео). Facebook оптимизирует бюджет."
                schema={`Кабинет\n└─ Кампания (x1, CBO бюджет)\n   ├─ Группа: Крео_1 → Объявление\n   ├─ Группа: Крео_2 → Объявление\n   └─ Группа: Крео_N → Объявление`} />
              <StructureCard value="ABO" selected={rules.structure === "ABO"} onClick={() => setRules({ ...rules, structure: "ABO" })}
                title="ABO — фиксированный бюджет"
                subtitle="1 кампания → 1 группа → N объявлений."
                schema={`Кабинет\n└─ Кампания (x1)\n   └─ Группа (x1, ABO бюджет)\n      ├─ Объявление: Крео_1\n      └─ Объявление: Крео_N`} />
              <StructureCard value="ISOLATION" selected={rules.structure === "ISOLATION"} onClick={() => setRules({ ...rules, structure: "ISOLATION" })}
                title="Изоляция — A/B тест"
                subtitle="N кампаний (по 1 на каждый крео). Максимальная чистота данных."
                schema={`Кабинет\n├─ Кампания: Крео_1\n│  └─ Группа → Объявление\n└─ Кампания: Крео_N\n   └─ Группа → Объявление`} />
            </div>
          </Card>

          {/* Z_GROUPED specific settings */}
          {rules.structure === "Z_GROUPED" && (
            <Card className="border-blue-200 bg-blue-50/40">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold text-slate-800">Настройки Z-группового залива</div>
                <Button variant="ghost" onClick={() => setShowKeitaroForm((v) => !v)}>
                  <Layers size={14} /> Синхронизировать с Keitaro
                </Button>
              </div>

              {showKeitaroForm && (
                <div className="mb-4 grid gap-3 rounded-lg bg-white p-3 shadow-sm md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <div className="text-xs font-bold text-slate-600">Подключение к Keitaro (mock)</div>
                  </div>
                  <Input placeholder="Название набора (напр. Похудение — USA)" value={keitaroForm.name}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, name: e.target.value })} className="w-full" />
                  <Input placeholder="URL трекера (https://tracker.example.com)" value={keitaroForm.keitaroUrl}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, keitaroUrl: e.target.value })} className="w-full" />
                  <Input placeholder="API ключ" value={keitaroForm.apiKey}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, apiKey: e.target.value })} className="w-full" />
                  <Input placeholder="ID кампании в Keitaro (необязательно)" value={keitaroForm.campaignId}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, campaignId: e.target.value })} className="w-full" />
                  <Input placeholder="Гео (напр. ES, US, DE)" value={keitaroForm.geo}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, geo: e.target.value.toUpperCase() })} className="w-full" />
                  <div className="flex gap-2 md:col-span-2">
                    <Button disabled={!keitaroForm.name || !keitaroForm.keitaroUrl || !keitaroForm.apiKey || syncingKeitaro} onClick={syncKeitaro}>
                      {syncingKeitaro ? "Синхронизируем..." : "Синхронизировать заголовки"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowKeitaroForm(false)}>Отмена</Button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Кампаний на кабинет</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={10} value={rules.campaignsPerAccount}
                      onChange={(e) => setRules({ ...rules, campaignsPerAccount: Number(e.target.value) })}
                      className="flex-1" />
                    <span className="w-8 text-center font-black text-blue-700">{rules.campaignsPerAccount}</span>
                  </div>
                  <div className="text-xs text-slate-400">Каждая кампания — дубль структуры, для масштаба</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Набор заголовков (Keitaro)</label>
                  <Select value={rules.headlineSetId} onChange={(e) => setRules({ ...rules, headlineSetId: e.target.value })} className="w-full">
                    <option value="">— Без заголовков —</option>
                    {headlineSets.map((hs) => {
                      const geoMatch = hs.geo && detectedGeos.includes(hs.geo);
                      return (
                        <option key={hs.id} value={hs.id}>
                          {geoMatch ? "★ " : ""}{hs.name}{hs.geo ? ` [${hs.geo}]` : ""} ({Object.keys(hs.headlinesJson).join(", ")})
                        </option>
                      );
                    })}
                  </Select>
                  {detectedGeos.length > 0 && !rules.headlineSetId && (
                    <div className="text-xs text-amber-700">
                      Выбраны креативы гео {detectedGeos.join(", ")} — выберите набор заголовков для этого гео
                    </div>
                  )}
                  {rules.headlineSetId && (() => {
                    const hs = headlineSets.find((h) => h.id === rules.headlineSetId);
                    if (!hs) return null;
                    return (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(hs.headlinesJson).slice(0, 4).map(([z, text]) => (
                          <div key={z} className="flex gap-2 text-xs">
                            <span className="w-6 font-bold text-blue-700">{z}:</span>
                            <span className="text-slate-600 truncate">{text}</span>
                          </div>
                        ))}
                        {Object.keys(hs.headlinesJson).length > 4 && (
                          <div className="text-xs text-slate-400">+{Object.keys(hs.headlinesJson).length - 4} ещё...</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Card>
          )}

          {/* Campaigns per account for other structures */}
          {rules.structure !== "Z_GROUPED" && (
            <Card>
              <div className="mb-1 text-sm font-bold text-slate-700">Кампаний на кабинет</div>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={10} value={rules.campaignsPerAccount}
                  onChange={(e) => setRules({ ...rules, campaignsPerAccount: Number(e.target.value) })}
                  className="flex-1 max-w-xs" />
                <span className="w-8 text-center font-black text-blue-700">{rules.campaignsPerAccount}</span>
                <span className="text-xs text-slate-400">× {selectedAccountIds.length} кабинетов = {rules.campaignsPerAccount * selectedAccountIds.length} кампаний</span>
              </div>
            </Card>
          )}

          {/* Campaign settings */}
          <Card>
            <div className="mb-3 text-sm font-bold text-slate-700">Параметры кампании</div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Цель</label>
                <Select value={rules.objective} onChange={(e) => setRules({ ...rules, objective: e.target.value })} className="w-full">
                  {OBJECTIVES.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Статус при создании</label>
                <Select value={rules.campaignStatus} onChange={(e) => setRules({ ...rules, campaignStatus: e.target.value })} className="w-full">
                  <option value="PAUSED">Пауза (рекомендуется)</option>
                  <option value="ACTIVE">Активна сразу</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Дневной бюджет ($)</label>
                <Input type="number" placeholder="Например: 50" value={rules.dailyBudget}
                  onChange={(e) => setRules({ ...rules, dailyBudget: e.target.value })} className="w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Стратегия ставок</label>
                <Select value={rules.bidStrategy} onChange={(e) => setRules({ ...rules, bidStrategy: e.target.value })} className="w-full">
                  {BID_STRATEGIES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Цель оптимизации</label>
                <Select value={rules.optimizationGoal} onChange={(e) => setRules({ ...rules, optimizationGoal: e.target.value })} className="w-full">
                  {OPT_GOALS.map((g) => <option key={g} value={g}>{g.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
            </div>
          </Card>

          {/* Naming templates */}
          <Card>
            <div className="mb-1 text-sm font-bold text-slate-700">Шаблоны названий</div>
            <p className="mb-3 text-xs text-slate-500">Переменные: <code className="rounded bg-slate-100 px-1">{"{account}"}</code> <code className="rounded bg-slate-100 px-1">{"{creative}"}</code> <code className="rounded bg-slate-100 px-1">{"{date}"}</code> <code className="rounded bg-slate-100 px-1">{"{objective}"}</code></p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Кампания</label>
                <Input value={rules.campaignNameTpl} onChange={(e) => setRules({ ...rules, campaignNameTpl: e.target.value })} className="w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Группа объявлений</label>
                <Input value={rules.adSetNameTpl} onChange={(e) => setRules({ ...rules, adSetNameTpl: e.target.value })} className="w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Объявление</label>
                <Input value={rules.adNameTpl} onChange={(e) => setRules({ ...rules, adNameTpl: e.target.value })} className="w-full" />
              </div>
            </div>
          </Card>

          {/* Save as template */}
          <Card>
            <div className="mb-2 text-sm font-bold text-slate-700">Сохранить правила как шаблон</div>
            <div className="flex gap-2">
              {templates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => setRules({ ...rules, objective: t.objective, campaignStatus: t.campaignStatus, dailyBudget: t.dailyBudget ? String(t.dailyBudget) : "", bidStrategy: t.bidStrategy, optimizationGoal: t.optimizationGoal })}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-blue-50">
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
              <Input placeholder="Название шаблона..." value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              <Button variant="ghost" disabled={!templateName || savingTemplate} onClick={saveTemplate}>
                {savingTemplate ? "..." : "Сохранить"}
              </Button>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft size={16} /> Назад</Button>
            <Button onClick={() => setStep(3)}>Далее: Креативы <ChevronRight size={16} /></Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Creatives ── */}
      {step === 3 && (
        <div className="space-y-3">
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                Выбрано: <strong className="text-blue-700">{selectedCreativeIds.length}</strong> из {creatives.length}
                {selectedCreativeIds.length > 0 && (
                  <span className="ml-2 text-slate-400">→ {totals.ads} объявлений на {selectedAccountIds.length} кабинетах</span>
                )}
              </span>
              <Button variant="ghost" onClick={() => setShowCreativeForm((v) => !v)}>
                <Plus size={14} /> Добавить крео
              </Button>
            </div>

            {showCreativeForm && (
              <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Input placeholder="Название*" value={newCreative.name} onChange={(e) => setNewCreative({ ...newCreative, name: e.target.value })} className="w-full" />
                  <Input placeholder="Заголовок" value={newCreative.headline} onChange={(e) => setNewCreative({ ...newCreative, headline: e.target.value })} className="w-full" />
                  <Select value={newCreative.callToAction} onChange={(e) => setNewCreative({ ...newCreative, callToAction: e.target.value })} className="w-full">
                    {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </Select>
                  <Input placeholder="URL назначения" value={newCreative.destinationUrl} onChange={(e) => setNewCreative({ ...newCreative, destinationUrl: e.target.value })} className="w-full" />
                </div>
                <textarea placeholder="Основной текст" value={newCreative.primaryText}
                  onChange={(e) => setNewCreative({ ...newCreative, primaryText: e.target.value })}
                  rows={5} className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <div className="flex gap-2 md:col-span-2">
                  <Button onClick={addCreative} disabled={!newCreative.name || savingCreative}>{savingCreative ? "..." : "Добавить и выбрать"}</Button>
                  <Button variant="ghost" onClick={() => setShowCreativeForm(false)}>Отмена</Button>
                </div>
              </div>
            )}
          </Card>

          {creatives.length === 0 ? (
            <Empty text="Нет креативов. Добавьте первый выше." />
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {creatives.map((c) => {
                const sel = selectedCreativeIds.includes(c.id);
                return (
                  <div key={c.id} onClick={() => setSelectedCreativeIds((prev) => sel ? prev.filter((id) => id !== c.id) : [...prev, c.id])}
                    className={`cursor-pointer rounded-lg border p-3 transition-all ${sel ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-line bg-white hover:border-slate-300"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.type === "VIDEO" ? <Video size={13} className="flex-shrink-0 text-purple-500" /> : <Image size={13} className="flex-shrink-0 text-blue-400" />}
                        <span className="truncate font-bold text-sm text-slate-900">{c.name}</span>
                      </div>
                      <input type="checkbox" checked={sel} onChange={() => {}} className="mt-0.5 flex-shrink-0" />
                    </div>
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {c.geo && <Badge tone="neutral">{c.geo}</Badge>}
                      {c.zGroup && <Badge tone="good">{c.zGroup}</Badge>}
                    </div>
                    {c.headline && <div className="mt-1 text-sm font-semibold text-slate-700 truncate">{c.headline}</div>}
                    {c.primaryText && <div className="mt-1 line-clamp-2 text-xs text-slate-500">{c.primaryText}</div>}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone="neutral">{c.callToAction.replace(/_/g, " ")}</Badge>
                      {c.destinationUrl && <span className="truncate text-xs text-blue-600 max-w-[130px]">{c.destinationUrl}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}><ChevronLeft size={16} /> Назад</Button>
            <Button disabled={selectedCreativeIds.length === 0} onClick={() => setStep(4)}>
              Далее: Запуск <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review & Launch ── */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Volume preview */}
          <Card>
            <div className="mb-3 text-sm font-bold text-slate-700">Что будет создано</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-xl font-black text-slate-700">{selectedAccountIds.length}</div>
                <div className="text-xs text-slate-500">Кабинетов</div>
              </div>
              <div className="flex items-center justify-center text-slate-300 text-xl font-bold">×</div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-xl font-black text-slate-700">{selectedCreativeIds.length}</div>
                <div className="text-xs text-slate-500">Креативов</div>
              </div>
              <div className="flex items-center justify-center text-slate-300 text-xl font-bold">=</div>
              <div className="rounded-lg bg-blue-50 p-3 text-center ring-2 ring-blue-200">
                <div className="text-xl font-black text-blue-700">{totals.ads}</div>
                <div className="text-xs text-blue-600">Объявлений</div>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-sm">
              <span className="text-slate-500">Кампаний: <strong>{totals.campaigns}</strong></span>
              <span className="text-slate-500">Групп объявлений: <strong>{totals.adSets}</strong></span>
              <span className="text-slate-500">Структура: <strong>{rules.structure}</strong></span>
            </div>
          </Card>

          {/* Config summary */}
          <Card>
            <div className="mb-2 text-sm font-bold text-slate-700">Параметры кампании</div>
            <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              <div><dt className="text-xs text-slate-500">Цель</dt><dd className="font-semibold">{rules.objective}</dd></div>
              <div><dt className="text-xs text-slate-500">Статус</dt><dd className="font-semibold">{rules.campaignStatus}</dd></div>
              <div><dt className="text-xs text-slate-500">Бюджет/день</dt><dd className="font-semibold">{rules.dailyBudget ? `$${rules.dailyBudget}` : "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Стратегия</dt><dd className="font-semibold text-xs">{rules.bidStrategy.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-xs text-slate-500">Оптимизация</dt><dd className="font-semibold text-xs">{rules.optimizationGoal.replace(/_/g, " ")}</dd></div>
            </dl>
          </Card>

          {/* Naming preview */}
          <Card>
            <div className="mb-2 text-sm font-bold text-slate-700">Пример названий (первый кабинет)</div>
            <div className="space-y-1 font-mono text-xs text-slate-600">
              <div><span className="text-slate-400">Кампания:  </span>{rules.campaignNameTpl.replace("{account}", accounts.find((a) => selectedAccountIds[0] === a.id)?.name ?? "Кабинет_1").replace("{objective}", rules.objective).replace("{date}", new Date().toISOString().slice(0, 10)).replace("{creative}", creatives.find((c) => selectedCreativeIds[0] === c.id)?.name ?? "Крео")}</div>
              <div><span className="text-slate-400">Группа:    </span>{rules.adSetNameTpl.replace("{account}", accounts.find((a) => selectedAccountIds[0] === a.id)?.name ?? "Кабинет_1").replace("{creative}", creatives.find((c) => selectedCreativeIds[0] === c.id)?.name ?? "Крео").replace("{objective}", rules.objective).replace("{date}", new Date().toISOString().slice(0, 10))}</div>
              <div><span className="text-slate-400">Объявление:</span>{rules.adNameTpl.replace("{account}", accounts.find((a) => selectedAccountIds[0] === a.id)?.name ?? "Кабинет_1").replace("{creative}", creatives.find((c) => selectedCreativeIds[0] === c.id)?.name ?? "Крео").replace("{objective}", rules.objective).replace("{date}", new Date().toISOString().slice(0, 10))}</div>
            </div>
          </Card>

          {/* Job name */}
          <Card>
            <div className="mb-2 text-sm font-bold text-slate-700">Название задачи</div>
            <Input placeholder="Например: Лето 2026 | CBO | USA | Трафик" value={jobName}
              onChange={(e) => setJobName(e.target.value)} className="w-full max-w-lg" />
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}><ChevronLeft size={16} /> Назад</Button>
            <Button disabled={!jobName || launching} onClick={launch}
              className="gap-3 bg-emerald-600 px-8 py-2 text-base hover:bg-emerald-700">
              {launching ? (
                <><Loader2 size={18} className="animate-spin" /> Заливаем {selectedAccountIds.length} кабинетов...</>
              ) : (
                <><Rocket size={18} /> Запустить залив — {totals.ads} объявлений</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
