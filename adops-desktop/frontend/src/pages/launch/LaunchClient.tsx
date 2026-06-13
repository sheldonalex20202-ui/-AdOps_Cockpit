"use client";

import {
  CheckCircle, ChevronLeft, ChevronRight, Image, Layers, Loader2,
  Plus, Rocket, Video, XCircle, RotateCcw,
} from "lucide-react";
import { calcTotals } from "@/lib/launch-engine";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Empty, Input, Select, Table, statusTone } from "@/components/ui";
import { ru } from "@/lib/i18n";
import * as api from "@/lib/api";
import { useAiHighlight } from "@/lib/useAiHighlight";
import {
  VERTICAL_PRESETS, NAMING_PRESETS, ANGLE_LABELS,
  type Vertical, type CreativeAngle,
} from "@/lib/presets";

// ─── Types ────────────────────────────────────────────────────────────────────

type Pool = { id: string; name: string; color: string };
type Account = {
  id: string; name: string; externalId: string;
  status: string; readinessStatus: string; readinessScore: number;
  spendLimit?: number;
  pools?: { pool?: Pool }[];
};
type Creative = {
  id: string; name: string; type: string;
  zGroup?: string; geo?: string; angle?: string;
  headline?: string; primaryText?: string;
  callToAction: string; destinationUrl?: string;
};
type Template = {
  id: string; name: string; objective: string;
  dailyBudget?: number; bidStrategy: string;
  optimizationGoal: string; campaignStatus: string;
  campaignNameTpl?: string; adSetNameTpl?: string; adNameTpl?: string;
  vertical?: string;
};

type Structure = "CBO" | "ABO" | "ISOLATION" | "Z_GROUPED";

type HeadlineSet = {
  id: string; name: string; source: string; geo?: string;
  headlinesJson: Record<string, any>;
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
  id: string; status: string; errorMessage?: string;
  adAccount?: { id: string; name: string; externalId: string };
  resultJson: Record<string, any>;
};
type JobResult = {
  id: string; status: string;
  successCount: number; failedCount: number; totalAccounts: number;
  configJson: Record<string, any>;
  items?: JobItem[];
};

const DEFAULT_RULES: Rules = {
  structure: "CBO",
  objective: "OUTCOME_TRAFFIC",
  campaignStatus: "PAUSED",
  dailyBudget: "",
  bidStrategy: "LOWEST_COST_WITHOUT_CAP",
  optimizationGoal: "LINK_CLICKS",
  campaignsPerAccount: 3,
  headlineSetId: "",
  campaignNameTpl: "{vertical}_{geo}_{date}_{num}",
  adSetNameTpl: "{geo}_{audience}_{zGroup}",
  adNameTpl: "{creative}_{angle}_{num}",
};

const OBJECTIVES = [
  "OUTCOME_AWARENESS", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS", "OUTCOME_APP_PROMOTION", "OUTCOME_SALES",
];
const BID_STRATEGIES = ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "MINIMUM_ROAS"];
const OPT_GOALS = ["LINK_CLICKS", "LANDING_PAGE_VIEWS", "REACH", "IMPRESSIONS", "LEAD_GENERATION", "OFFSITE_CONVERSIONS", "APP_INSTALLS"];
const CTA_OPTIONS = ["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "GET_OFFER", "SUBSCRIBE", "BOOK_NOW", "CONTACT_US", "DOWNLOAD", "PLAY_GAME", "GET_STARTED", "ORDER_NOW"];

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current, onClick }: { current: number; onClick: (n: number) => void }) {
  const steps = ["Кабинеты", "Настройка", "Креативы", "Запуск"];
  return (
    <div className="flex flex-wrap items-center gap-0">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        const clickable = n < current;
        return (
          <div key={n} className="flex items-center">
            <button
              onClick={() => clickable && onClick(n)}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                done
                  ? "bg-success text-white scale-90 cursor-pointer hover:scale-100"
                  : active
                  ? "bg-brand text-brand-fg ring-4 ring-brand/20"
                  : "bg-raised text-muted cursor-default"
              }`}
            >
              {done ? <CheckCircle size={14} /> : n}
            </button>
            <span className={`ml-2 text-xs font-semibold ${active ? "text-ink" : "text-muted"}`}>{label}</span>
            {i < steps.length - 1 && (
              <div className="mx-3 h-px w-8 bg-stroke relative overflow-hidden">
                {done && <div className="absolute inset-0 bg-success transition-all" />}
              </div>
            )}
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
      className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${selected ? "border-brand bg-selected" : "border-stroke bg-card hover:border-brand/50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-bold text-ink">{title}</div>
          <div className="mt-0.5 text-[11px] text-muted">{subtitle}</div>
        </div>
        <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-all ${selected ? "border-brand bg-brand" : "border-stroke"}`} />
      </div>
      <pre className="mt-2 rounded bg-slate-900 px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-400 whitespace-pre-wrap">{schema}</pre>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, tone = "default", delay = 0 }: {
  value: number | string; label: string; tone?: "default" | "good" | "bad" | "warn"; delay?: number;
}) {
  const colors = {
    default: "text-ink",
    good: "text-success",
    bad: "text-danger",
    warn: "text-warn",
  };
  return (
    <Card className="text-center animate-count-pop" style={{ animationDelay: `${delay}ms` }}>
      <div className={`text-2xl font-black ${colors[tone]}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LaunchClient() {
  const hlRunLaunch = useAiHighlight("run-launch");
  const [step, setStep] = useState(1);
  const [stepDir, setStepDir] = useState<"forward" | "back">("forward");
  const [result, setResult] = useState<JobResult | null>(null);
  const [launching, setLaunching] = useState(false);
  const [jobName, setJobName] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Step 1
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolFilter, setPoolFilter] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [readinessFilter, setReadinessFilter] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Step 2
  const [vertical, setVertical] = useState<Vertical | "">("");
  const [namingPresetIdx, setNamingPresetIdx] = useState(1);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [headlineSets, setHeadlineSets] = useState<HeadlineSet[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showKeitaroForm, setShowKeitaroForm] = useState(false);
  const [keitaroForm, setKeitaroForm] = useState({ name: "", keitaroUrl: "", apiKey: "", campaignId: "", geo: "" });
  const [syncingKeitaro, setSyncingKeitaro] = useState(false);

  // Step 3
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [selectedCreativeIds, setSelectedCreativeIds] = useState<string[]>([]);
  const [showCreativeForm, setShowCreativeForm] = useState(false);
  const [newCreative, setNewCreative] = useState({ name: "", headline: "", primaryText: "", destinationUrl: "", callToAction: "LEARN_MORE", angle: "" });
  const [savingCreative, setSavingCreative] = useState(false);
  const [creativeZFilter, setCreativeZFilter] = useState("");
  const [creativeAngleFilter, setCreativeAngleFilter] = useState("");
  const [creativeGeoFilter, setCreativeGeoFilter] = useState("");

  useEffect(() => { void loadAccounts(); void loadTemplates(); void loadCreatives(); void loadHeadlineSets(); }, []);
  useEffect(() => { void loadAccounts(); }, [poolFilter]);

  function goTo(n: number) {
    setStepDir(n > step ? "forward" : "back");
    setStep(n);
  }

  async function loadAccounts() {
    setLoadingAccounts(true);
    const [ar, pr] = await Promise.all([api.getAccounts(poolFilter), api.getPools()]);
    setAccounts(ar.accounts ?? []);
    setPools(pr.pools ?? []);
    setLoadingAccounts(false);
  }

  async function loadTemplates() {
    const res = await api.getTemplates();
    setTemplates(res.templates ?? []);
  }

  async function loadHeadlineSets() {
    const res = await api.getHeadlineSets();
    setHeadlineSets(res.sets ?? []);
  }

  async function syncKeitaro() {
    if (!keitaroForm.name || !keitaroForm.keitaroUrl || !keitaroForm.apiKey) return;
    setSyncingKeitaro(true);
    const set = await api.keitaroSync(
      keitaroForm.name, keitaroForm.keitaroUrl, keitaroForm.apiKey,
      keitaroForm.campaignId, keitaroForm.geo || undefined
    );
    if (set?.id) {
      await loadHeadlineSets();
      setRules((r) => ({ ...r, headlineSetId: set.id }));
    }
    setKeitaroForm({ name: "", keitaroUrl: "", apiKey: "", campaignId: "", geo: "" });
    setShowKeitaroForm(false);
    setSyncingKeitaro(false);
  }

  async function loadCreatives() {
    const res = await api.getCreatives();
    setCreatives(res.creatives ?? []);
  }

  function applyVerticalPreset(v: Vertical) {
    const p = VERTICAL_PRESETS[v];
    setVertical(v);
    setRules((r) => ({
      ...r,
      objective: p.objective,
      bidStrategy: p.bidStrategy,
      optimizationGoal: p.optimizationGoal,
      campaignStatus: p.campaignStatus,
      dailyBudget: p.dailyBudget,
    }));
  }

  function applyNamingPreset(idx: number) {
    setNamingPresetIdx(idx);
    const p = NAMING_PRESETS[idx];
    if (p.campaignNameTpl || idx < NAMING_PRESETS.length - 1) {
      setRules((r) => ({
        ...r,
        campaignNameTpl: p.campaignNameTpl || r.campaignNameTpl,
        adSetNameTpl: p.adSetNameTpl || r.adSetNameTpl,
        adNameTpl: p.adNameTpl || r.adNameTpl,
      }));
    }
  }

  async function saveTemplate() {
    if (!templateName) return;
    setSavingTemplate(true);
    await api.createTemplate({
      name: templateName, objective: rules.objective,
      campaignStatus: rules.campaignStatus,
      dailyBudget: rules.dailyBudget ? Number(rules.dailyBudget) : undefined,
      bidStrategy: rules.bidStrategy,
      optimizationGoal: rules.optimizationGoal,
      adSetNameTpl: rules.adSetNameTpl,
      adNameTpl: rules.adNameTpl,
      campaignNameTpl: rules.campaignNameTpl,
      vertical: vertical,
    });
    setTemplateName("");
    setSavingTemplate(false);
    await loadTemplates();
  }

  async function addCreative() {
    if (!newCreative.name) return;
    setSavingCreative(true);
    const creative = await api.createCreative({
      ...newCreative, type: "TEXT_ONLY",
      headline: newCreative.headline || undefined,
      primaryText: newCreative.primaryText || undefined,
      destinationUrl: newCreative.destinationUrl || undefined,
      angle: newCreative.angle || undefined,
    });
    if (creative?.id) {
      setCreatives((prev) => [creative, ...prev]);
      setSelectedCreativeIds((prev) => [...prev, creative.id]);
    }
    setNewCreative({ name: "", headline: "", primaryText: "", destinationUrl: "", callToAction: "LEARN_MORE", angle: "" });
    setShowCreativeForm(false);
    setSavingCreative(false);
  }

  async function launch() {
    if (!jobName || !selectedAccountIds.length || !selectedCreativeIds.length) return;
    setLaunching(true);
    const data = await api.createLaunchJob({
      name: jobName,
      accountIds: selectedAccountIds,
      creativeIds: selectedCreativeIds,
      structure: rules.structure,
      headlineSetId: rules.headlineSetId || "",
      campaignsPerAccount: rules.campaignsPerAccount,
      config: {
        objective: rules.objective,
        buyingType: "AUCTION",
        campaignStatus: rules.campaignStatus,
        dailyBudget: rules.dailyBudget || "",
        bidStrategy: rules.bidStrategy,
        optimizationGoal: rules.optimizationGoal,
        billingEvent: "IMPRESSIONS",
        campaignNameTpl: rules.campaignNameTpl,
        adSetNameTpl: rules.adSetNameTpl,
        adNameTpl: rules.adNameTpl,
        vertical: vertical,
      },
    });
    setResult(data.job ?? null);
    setLaunching(false);
  }

  function reset() {
    setStep(1); setResult(null); setSelectedAccountIds([]);
    setSelectedCreativeIds([]); setJobName(""); setRules(DEFAULT_RULES);
    setVertical(""); setNamingPresetIdx(1); setExpandedItems(new Set());
  }

  function toggleItem(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedCreatives = creatives.filter((c) => selectedCreativeIds.includes(c.id));
  const zGroups = useMemo(() => {
    const groups = new Set(selectedCreatives.map((c) => c.zGroup).filter(Boolean));
    return groups.size;
  }, [selectedCreativeIds, creatives]);

  const detectedGeos = useMemo(() => {
    const geos = new Set(selectedCreatives.map((c) => c.geo).filter(Boolean));
    return [...geos] as string[];
  }, [selectedCreatives]);

  const totals = useMemo(
    () => calcTotals(rules.structure, selectedAccountIds.length, selectedCreativeIds.length, zGroups, rules.campaignsPerAccount),
    [rules.structure, selectedAccountIds.length, selectedCreativeIds.length, zGroups, rules.campaignsPerAccount]
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (readinessFilter && a.readinessStatus !== readinessFilter) return false;
      if (accountSearch && !a.name.toLowerCase().includes(accountSearch.toLowerCase()) && !a.externalId.includes(accountSearch)) return false;
      return true;
    });
  }, [accounts, readinessFilter, accountSearch]);

  const allVisible = filteredAccounts.length > 0 && filteredAccounts.every((a) => selectedAccountIds.includes(a.id));

  const filteredCreatives = useMemo(() => {
    return creatives.filter((c) => {
      if (creativeZFilter && c.zGroup !== creativeZFilter) return false;
      if (creativeAngleFilter && c.angle !== creativeAngleFilter) return false;
      if (creativeGeoFilter && (!c.geo || !c.geo.toLowerCase().includes(creativeGeoFilter.toLowerCase()))) return false;
      return true;
    });
  }, [creatives, creativeZFilter, creativeAngleFilter, creativeGeoFilter]);

  const allZGroups = useMemo(() => [...new Set(creatives.map((c) => c.zGroup).filter(Boolean))] as string[], [creatives]);

  const stepClass = stepDir === "forward" ? "animate-slide-from-right" : "animate-slide-from-left";

  const firstAccount = accounts.find((a) => selectedAccountIds[0] === a.id);
  const firstCreative = creatives.find((c) => selectedCreativeIds[0] === c.id);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  function previewName(tpl: string) {
    return tpl
      .replace("{account}", firstAccount?.name ?? "Кабинет_1")
      .replace("{vertical}", vertical || "V")
      .replace("{geo}", firstCreative?.geo ?? "GEO")
      .replace("{objective}", rules.objective.replace("OUTCOME_", ""))
      .replace("{date}", today)
      .replace("{creative}", firstCreative?.name ?? "Крео_1")
      .replace("{angle}", (firstCreative?.angle ?? "BA"))
      .replace("{zGroup}", firstCreative?.zGroup ?? "Z1")
      .replace("{num}", "001")
      .replace("{structure}", rules.structure)
      .replace("{audience}", "BROAD");
  }

  // ── Results screen ────────────────────────────────────────────────────────────
  if (result) {
    const successRate = result.totalAccounts > 0 ? Math.round((result.successCount / result.totalAccounts) * 100) : 0;
    const totalAds = (result.items ?? []).reduce((sum, it) => sum + (it.resultJson?.totalAds ?? 0), 0);
    const totalAdSets = (result.items ?? []).reduce((sum, it) => sum + (it.resultJson?.totalAdSets ?? 0), 0);
    const totalCampaigns = (result.items ?? []).reduce((sum, it) => sum + (it.resultJson?.totalCampaigns ?? 0), 0);

    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">Результаты залива</h1>
            <p className="text-xs text-muted">Структура: {result.configJson?.structure ?? "—"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => {
              window.dispatchEvent(new CustomEvent("navigate", { detail: "launch-history" }));
            }}>
              История
            </Button>
            <Button variant="ghost" onClick={reset}><Rocket size={14} /> Новый залив</Button>
          </div>
        </div>

        <div className="grid gap-2 grid-cols-3 md:grid-cols-6">
          {[
            { value: result.totalAccounts, label: "Кабинетов" },
            { value: result.successCount, label: "Успешно", tone: "good" as const },
            { value: result.failedCount, label: "Ошибок", tone: result.failedCount > 0 ? "bad" as const : "default" as const },
            { value: totalCampaigns, label: "Кампаний" },
            { value: totalAdSets, label: "Групп" },
            { value: totalAds, label: "Объявлений" },
          ].map((s, i) => (
            <StatCard key={i} value={s.value} label={s.label} tone={s.tone} delay={i * 60} />
          ))}
        </div>

        <Card>
          <div className="mb-2 flex items-center gap-3">
            <Badge tone={result.status === "COMPLETED" ? "good" : result.status === "PARTIAL" ? "warn" : "bad"}>
              {ru(result.status)}
            </Badge>
            <span className="text-xs text-muted">Успешность: {successRate}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-raised">
            <div className="h-1.5 rounded-full bg-success transition-[width] duration-700 ease-out" style={{ width: `${successRate}%` }} />
          </div>
        </Card>

        <Table>
          <table className="w-full min-w-[860px] text-left text-[12px]">
            <thead>
              <tr>
                <th className="p-2">Кабинет</th>
                <th>Ext ID</th>
                <th>Статус</th>
                <th>Кампаний</th>
                <th>Групп</th>
                <th>Объявлений</th>
                <th>Ошибка</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(result.items ?? []).map((item) => (
                <>
                  <tr key={item.id} className="border-t border-stroke cursor-pointer hover:bg-raised" onClick={() => toggleItem(item.id)}>
                    <td className="p-2 font-bold">{item.adAccount?.name ?? "—"}</td>
                    <td className="text-muted text-[11px]">{item.adAccount?.externalId ?? "—"}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {item.status === "SUCCESS"
                          ? <CheckCircle size={12} className="text-success" />
                          : <XCircle size={12} className="text-danger" />}
                        <Badge tone={statusTone(item.status)}>{ru(item.status)}</Badge>
                      </div>
                    </td>
                    <td className="font-bold">{item.resultJson?.totalCampaigns ?? "—"}</td>
                    <td className="font-bold">{item.resultJson?.totalAdSets ?? "—"}</td>
                    <td className="font-bold text-brand">{item.resultJson?.totalAds ?? "—"}</td>
                    <td className="max-w-[200px] text-[11px] text-danger">{item.errorMessage ?? "—"}</td>
                    <td className="text-muted text-[11px]">{expandedItems.has(item.id) ? "▲" : "▼"}</td>
                  </tr>
                  {expandedItems.has(item.id) && (
                    <tr key={`${item.id}-detail`} className="border-t border-stroke bg-raised/50">
                      <td colSpan={8} className="px-4 py-2 animate-fade-in-up">
                        <div className="space-y-1">
                          {item.resultJson?.campaigns?.map((c: any, ci: number) => (
                            <div key={ci} className="font-mono text-[11px] text-muted">
                              <span className="text-brand font-bold">{c.campaignId ?? `camp_${ci}`}</span>
                              {" · "}
                              <span>{c.adSets ?? 0} adSets · {c.ads ?? 0} ads</span>
                            </div>
                          )) ?? (
                            <div className="font-mono text-[11px] text-muted">
                              Campaign: {item.resultJson?.campaign?.id ?? "—"} · {item.resultJson?.totalAdSets ?? 0} adSets · {item.resultJson?.totalAds ?? 0} ads
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </Table>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">Автозалив</h1>
          <p className="text-[12px] text-muted">Массовый запуск кампаний по выбранным кабинетам.</p>
        </div>
        {(selectedAccountIds.length > 0 || selectedCreativeIds.length > 0) && (
          <div className="flex items-center gap-3 rounded-lg border border-stroke bg-raised px-3 py-1.5 text-[12px]">
            <span><strong className="text-ink">{selectedAccountIds.length}</strong> <span className="text-muted">кабинетов</span></span>
            <span className="text-stroke">·</span>
            <span><strong className="text-ink">{selectedCreativeIds.length}</strong> <span className="text-muted">крео</span></span>
            <span className="text-stroke">·</span>
            <span><strong className="text-brand">{totals.ads}</strong> <span className="text-muted">объявлений</span></span>
          </div>
        )}
      </div>

      <Steps current={step} onClick={goTo} />

      {/* ── Step 1: Accounts ── */}
      {step === 1 && (
        <div key="s1" className={`space-y-3 ${stepClass}`}>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)} className="w-36">
                <option value="">Все пулы</option>
                {pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Select value={readinessFilter} onChange={(e) => setReadinessFilter(e.target.value)} className="w-36">
                <option value="">Любой статус</option>
                <option value="READY">READY</option>
                <option value="NEEDS_ATTENTION">NEEDS_ATTENTION</option>
                <option value="BLOCKED">BLOCKED</option>
              </Select>
              <Input placeholder="Поиск по имени / ID..." value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)} className="w-48" />
              <div className="ml-auto flex items-center gap-3 text-[12px]">
                <span className="text-muted">
                  Выбрано: <strong className="text-ink">{selectedAccountIds.length}</strong> / {accounts.length}
                </span>
                {selectedAccountIds.length > 0 && (
                  <button className="text-muted hover:text-danger text-[11px]" onClick={() => setSelectedAccountIds([])}>
                    Сбросить
                  </button>
                )}
                {filteredAccounts.some((a) => a.readinessStatus === "READY") && (
                  <button className="text-[11px] font-semibold text-brand hover:text-brand-dim"
                    onClick={() => setSelectedAccountIds(filteredAccounts.filter((a) => a.readinessStatus === "READY").map((a) => a.id))}>
                    Выбрать READY
                  </button>
                )}
                {filteredAccounts.length > 0 && (
                  <button className="text-[11px] font-semibold text-muted hover:text-ink"
                    onClick={() => setSelectedAccountIds(allVisible ? [] : filteredAccounts.map((a) => a.id))}>
                    {allVisible ? "Снять все" : `Все (${filteredAccounts.length})`}
                  </button>
                )}
              </div>
            </div>
          </Card>

          {loadingAccounts ? (
            <Empty text="Загрузка кабинетов..." />
          ) : filteredAccounts.length === 0 ? (
            <Empty text={accounts.length === 0 ? "Нет кабинетов. Добавьте в разделе «Мои кабинеты»." : "Нет кабинетов, подходящих под фильтр."} />
          ) : (
            <Table>
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead>
                  <tr>
                    <th className="p-2 w-8">
                      <input type="checkbox" checked={allVisible}
                        onChange={(e) => setSelectedAccountIds(e.target.checked ? filteredAccounts.map((a) => a.id) : [])} />
                    </th>
                    <th>Кабинет</th>
                    <th>Ext ID</th>
                    <th>Статус</th>
                    <th>Readiness</th>
                    <th>Score</th>
                    <th>Лимит</th>
                    <th>Пулы</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((acc) => {
                    const sel = selectedAccountIds.includes(acc.id);
                    const score = acc.readinessScore;
                    const dotColor = score >= 80 ? "bg-success" : score >= 50 ? "bg-warn" : "bg-danger";
                    return (
                      <tr key={acc.id}
                        className={`cursor-pointer border-t border-stroke h-9 ${sel ? "bg-selected" : "hover:bg-raised"}`}
                        onClick={() => setSelectedAccountIds((prev) => sel ? prev.filter((id) => id !== acc.id) : [...prev, acc.id])}>
                        <td className="p-2"><input type="checkbox" checked={sel} onChange={() => {}} /></td>
                        <td className="font-bold py-0">{acc.name}</td>
                        <td className="text-muted py-0">{acc.externalId}</td>
                        <td className="py-0"><Badge tone={statusTone(acc.status)}>{ru(acc.status)}</Badge></td>
                        <td className="py-0"><Badge tone={statusTone(acc.readinessStatus)}>{ru(acc.readinessStatus)}</Badge></td>
                        <td className="py-0">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                            <span className="font-bold">{score}</span>
                          </div>
                        </td>
                        <td className="py-0 text-muted">{acc.spendLimit ? `$${acc.spendLimit}` : "—"}</td>
                        <td className="py-0">
                          <div className="flex flex-wrap gap-1">
                            {(acc.pools ?? []).map(({ pool }) => pool && (
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
            <Button disabled={selectedAccountIds.length === 0} onClick={() => goTo(2)}>
              Далее: Настройка <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Rules ── */}
      {step === 2 && (
        <div key="s2" className={`space-y-3 ${stepClass}`}>
          {/* Vertical presets */}
          <Card>
            <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Вертикаль</div>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(VERTICAL_PRESETS) as [Vertical, typeof VERTICAL_PRESETS[Vertical]][]).map(([key, p]) => (
                <button key={key}
                  onClick={() => applyVerticalPreset(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-all ${
                    vertical === key
                      ? "bg-brand text-brand-fg ring-2 ring-brand/30"
                      : "bg-raised text-muted hover:bg-selected hover:text-ink"
                  }`}>
                  {p.emoji} {p.label}
                </button>
              ))}
              {vertical && (
                <button onClick={() => setVertical("")}
                  className="text-[11px] text-muted hover:text-danger px-1">✕ Сбросить</button>
              )}
            </div>
            {vertical && (
              <div className="mt-2 text-[11px] text-muted">
                Применён пресет {VERTICAL_PRESETS[vertical].label}: бюджет ${VERTICAL_PRESETS[vertical].dailyBudget}, цель {VERTICAL_PRESETS[vertical].objective.replace("OUTCOME_", "")}
              </div>
            )}
          </Card>

          {/* Structure */}
          <Card>
            <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Структура залива</div>
            <div className="grid gap-2 md:grid-cols-2">
              <StructureCard value="Z_GROUPED" selected={rules.structure === "Z_GROUPED"} onClick={() => setRules({ ...rules, structure: "Z_GROUPED" })}
                title="Z-группы + Keitaro"
                subtitle="N кампаний на кабинет. Группы по Z-номеру крео."
                schema={`Кабинет\n├─ Кампания C1 (CBO)\n│  ├─ Группа Z1 → Ad\n│  └─ Группа Z2 → Ad\n└─ Кампания C2 [дубль]`} />
              <StructureCard value="CBO" selected={rules.structure === "CBO"} onClick={() => setRules({ ...rules, structure: "CBO" })}
                title="CBO — стандартный"
                subtitle="1 кампания → N групп (по крео)."
                schema={`Кабинет\n└─ Кампания (CBO)\n   ├─ Группа: Крео_1 → Ad\n   └─ Группа: Крео_N → Ad`} />
              <StructureCard value="ABO" selected={rules.structure === "ABO"} onClick={() => setRules({ ...rules, structure: "ABO" })}
                title="ABO — фиксированный бюджет"
                subtitle="1 кампания → 1 группа → N объявлений."
                schema={`Кабинет\n└─ Кампания\n   └─ Группа (ABO)\n      ├─ Ad: Крео_1\n      └─ Ad: Крео_N`} />
              <StructureCard value="ISOLATION" selected={rules.structure === "ISOLATION"} onClick={() => setRules({ ...rules, structure: "ISOLATION" })}
                title="Изоляция — A/B тест"
                subtitle="N кампаний (1 на каждый крео)."
                schema={`Кабинет\n├─ Кампания: Крео_1\n│  └─ Группа → Ad\n└─ Кампания: Крео_N\n   └─ Группа → Ad`} />
            </div>
          </Card>

          {/* Z-grouped specific */}
          {rules.structure === "Z_GROUPED" && (
            <Card className="border-brand/20 bg-selected/30">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-bold text-muted uppercase tracking-wide">Настройки Z-залива</div>
                <Button variant="ghost" onClick={() => setShowKeitaroForm((v) => !v)}>
                  <Layers size={12} /> Keitaro sync
                </Button>
              </div>

              {showKeitaroForm && (
                <div className="mb-3 grid gap-2 rounded-lg bg-card p-3 shadow-card md:grid-cols-2">
                  <div className="text-[11px] font-bold text-muted md:col-span-2">Подключение к Keitaro (mock)</div>
                  <Input placeholder="Название набора" value={keitaroForm.name}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, name: e.target.value })} className="w-full" />
                  <Input placeholder="URL трекера" value={keitaroForm.keitaroUrl}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, keitaroUrl: e.target.value })} className="w-full" />
                  <Input placeholder="API ключ" value={keitaroForm.apiKey}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, apiKey: e.target.value })} className="w-full" />
                  <Input placeholder="ID кампании (необязательно)" value={keitaroForm.campaignId}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, campaignId: e.target.value })} className="w-full" />
                  <Input placeholder="Гео (DE, US...)" value={keitaroForm.geo}
                    onChange={(e) => setKeitaroForm({ ...keitaroForm, geo: e.target.value.toUpperCase() })} className="w-full" />
                  <div className="flex gap-2 md:col-span-2">
                    <Button disabled={!keitaroForm.name || !keitaroForm.keitaroUrl || !keitaroForm.apiKey || syncingKeitaro} onClick={syncKeitaro}>
                      {syncingKeitaro ? "Синхронизируем..." : "Синхронизировать"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowKeitaroForm(false)}>Отмена</Button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Кампаний на кабинет</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={10} value={rules.campaignsPerAccount}
                      onChange={(e) => setRules({ ...rules, campaignsPerAccount: Number(e.target.value) })}
                      className="flex-1" />
                    <span className="w-8 text-center font-black text-brand">{rules.campaignsPerAccount}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Набор заголовков (Keitaro)</label>
                  <Select value={rules.headlineSetId} onChange={(e) => setRules({ ...rules, headlineSetId: e.target.value })} className="w-full">
                    <option value="">— Без заголовков —</option>
                    {headlineSets.map((hs) => {
                      const geoMatch = hs.geo && detectedGeos.includes(hs.geo);
                      return (
                        <option key={hs.id} value={hs.id}>
                          {geoMatch ? "★ " : ""}{hs.name}{hs.geo ? ` [${hs.geo}]` : ""}
                        </option>
                      );
                    })}
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {rules.structure !== "Z_GROUPED" && (
            <Card>
              <div className="mb-1 text-[11px] font-bold text-muted uppercase tracking-wide">Кампаний на кабинет</div>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={10} value={rules.campaignsPerAccount}
                  onChange={(e) => setRules({ ...rules, campaignsPerAccount: Number(e.target.value) })}
                  className="flex-1 max-w-xs" />
                <span className="w-8 text-center font-black text-brand">{rules.campaignsPerAccount}</span>
                <span className="text-[11px] text-muted">× {selectedAccountIds.length} кабинетов = {rules.campaignsPerAccount * selectedAccountIds.length} кампаний</span>
              </div>
            </Card>
          )}

          {/* Campaign params */}
          <Card>
            <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Параметры кампании</div>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">Цель (ODAX)</label>
                <Select value={rules.objective} onChange={(e) => setRules({ ...rules, objective: e.target.value })} className="w-full">
                  {OBJECTIVES.map((o) => <option key={o} value={o}>{o.replace("OUTCOME_", "")}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">Статус при создании</label>
                <Select value={rules.campaignStatus} onChange={(e) => setRules({ ...rules, campaignStatus: e.target.value })} className="w-full">
                  <option value="PAUSED">Пауза (рекомендуется)</option>
                  <option value="ACTIVE">Активна сразу</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">Дневной бюджет ($)</label>
                <Input type="number" placeholder="50" value={rules.dailyBudget}
                  onChange={(e) => setRules({ ...rules, dailyBudget: e.target.value })} className="w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">Стратегия ставок</label>
                <Select value={rules.bidStrategy} onChange={(e) => setRules({ ...rules, bidStrategy: e.target.value })} className="w-full">
                  {BID_STRATEGIES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">Цель оптимизации</label>
                <Select value={rules.optimizationGoal} onChange={(e) => setRules({ ...rules, optimizationGoal: e.target.value })} className="w-full">
                  {OPT_GOALS.map((g) => <option key={g} value={g}>{g.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
            </div>
          </Card>

          {/* Naming presets + templates */}
          <Card>
            <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Шаблоны названий</div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {NAMING_PRESETS.map((p, i) => (
                <button key={i}
                  onClick={() => applyNamingPreset(i)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                    namingPresetIdx === i
                      ? "bg-brand text-brand-fg"
                      : "bg-raised text-muted hover:bg-selected hover:text-ink"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mb-2 text-[11px] text-muted">
              Переменные: {["{account}", "{vertical}", "{geo}", "{date}", "{creative}", "{angle}", "{zGroup}", "{num}", "{structure}"].map((v) => (
                <code key={v} className="mx-0.5 rounded bg-raised px-1 text-ink">{v}</code>
              ))}
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">Кампания</label>
                <Input value={rules.campaignNameTpl}
                  onChange={(e) => { setRules({ ...rules, campaignNameTpl: e.target.value }); setNamingPresetIdx(NAMING_PRESETS.length - 1); }}
                  className="w-full font-mono text-[11px]" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">Группа объявлений</label>
                <Input value={rules.adSetNameTpl}
                  onChange={(e) => { setRules({ ...rules, adSetNameTpl: e.target.value }); setNamingPresetIdx(NAMING_PRESETS.length - 1); }}
                  className="w-full font-mono text-[11px]" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">Объявление</label>
                <Input value={rules.adNameTpl}
                  onChange={(e) => { setRules({ ...rules, adNameTpl: e.target.value }); setNamingPresetIdx(NAMING_PRESETS.length - 1); }}
                  className="w-full font-mono text-[11px]" />
              </div>
            </div>
          </Card>

          {/* Save/load template */}
          <Card>
            <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Шаблоны правил</div>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button key={t.id}
                  onClick={() => setRules({
                    ...rules,
                    objective: t.objective,
                    campaignStatus: t.campaignStatus,
                    dailyBudget: t.dailyBudget ? String(t.dailyBudget) : "",
                    bidStrategy: t.bidStrategy,
                    optimizationGoal: t.optimizationGoal,
                    campaignNameTpl: t.campaignNameTpl ?? rules.campaignNameTpl,
                    adSetNameTpl: t.adSetNameTpl ?? rules.adSetNameTpl,
                    adNameTpl: t.adNameTpl ?? rules.adNameTpl,
                  })}
                  className="rounded border border-stroke bg-raised px-2 py-1 text-[11px] font-semibold text-ink hover:bg-selected">
                  {t.name}
                  {t.vertical && <span className="ml-1 text-muted">({t.vertical})</span>}
                </button>
              ))}
              <div className="flex gap-1.5">
                <Input placeholder="Сохранить как шаблон..." value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)} className="w-44" />
                <Button variant="ghost" disabled={!templateName || savingTemplate} onClick={saveTemplate}>
                  {savingTemplate ? "..." : "Сохранить"}
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => goTo(1)}><ChevronLeft size={14} /> Назад</Button>
            <Button onClick={() => goTo(3)}>Далее: Креативы <ChevronRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Creatives ── */}
      {step === 3 && (
        <div key="s3" className={`space-y-3 ${stepClass}`}>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              {/* Z-group filter chips */}
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setCreativeZFilter("")}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${!creativeZFilter ? "bg-brand text-brand-fg" : "bg-raised text-muted hover:bg-selected"}`}>
                  Все Z
                </button>
                {allZGroups.map((z) => (
                  <button key={z} onClick={() => setCreativeZFilter(creativeZFilter === z ? "" : z)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                      creativeZFilter === z ? "bg-success text-white" : "bg-raised text-muted hover:bg-selected"
                    }`}>
                    {z}
                  </button>
                ))}
              </div>
              <Select value={creativeAngleFilter} onChange={(e) => setCreativeAngleFilter(e.target.value)} className="w-36">
                <option value="">Все углы</option>
                {(Object.entries(ANGLE_LABELS) as [CreativeAngle, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
              <Input placeholder="Гео..." value={creativeGeoFilter}
                onChange={(e) => setCreativeGeoFilter(e.target.value.toUpperCase())} className="w-20" />
              <div className="ml-auto flex items-center gap-2 text-[12px]">
                <span className="text-muted">
                  Выбрано <strong className="text-ink">{selectedCreativeIds.length}</strong> / {filteredCreatives.length}
                  {selectedCreativeIds.length > 0 && <span className="ml-1 text-muted">→ {totals.ads} объявлений</span>}
                </span>
                <Button variant="ghost" onClick={() => setShowCreativeForm((v) => !v)}>
                  <Plus size={12} /> Добавить
                </Button>
              </div>
            </div>

            {showCreativeForm && (
              <div className="mt-3 grid gap-2 rounded-lg bg-raised p-3 md:grid-cols-2 animate-fade-in-up">
                <div className="space-y-2">
                  <Input placeholder="Название*" value={newCreative.name}
                    onChange={(e) => setNewCreative({ ...newCreative, name: e.target.value })} className="w-full" />
                  <Input placeholder="Заголовок" value={newCreative.headline}
                    onChange={(e) => setNewCreative({ ...newCreative, headline: e.target.value })} className="w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newCreative.callToAction}
                      onChange={(e) => setNewCreative({ ...newCreative, callToAction: e.target.value })} className="w-full">
                      {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                    </Select>
                    <Select value={newCreative.angle}
                      onChange={(e) => setNewCreative({ ...newCreative, angle: e.target.value })} className="w-full">
                      <option value="">— Угол —</option>
                      {(Object.entries(ANGLE_LABELS) as [CreativeAngle, string][]).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </Select>
                  </div>
                  <Input placeholder="URL назначения" value={newCreative.destinationUrl}
                    onChange={(e) => setNewCreative({ ...newCreative, destinationUrl: e.target.value })} className="w-full" />
                </div>
                <textarea placeholder="Основной текст" value={newCreative.primaryText}
                  onChange={(e) => setNewCreative({ ...newCreative, primaryText: e.target.value })}
                  rows={5} className="w-full rounded border border-stroke bg-card px-3 py-2 text-[12px] text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand" />
                <div className="flex gap-2 md:col-span-2">
                  <Button onClick={addCreative} disabled={!newCreative.name || savingCreative}>
                    {savingCreative ? "..." : "Добавить и выбрать"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreativeForm(false)}>Отмена</Button>
                </div>
              </div>
            )}
          </Card>

          {filteredCreatives.length === 0 ? (
            <Empty text={creatives.length === 0 ? "Нет креативов. Добавьте первый выше." : "Нет крео под фильтр."} />
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {filteredCreatives.map((c) => {
                const sel = selectedCreativeIds.includes(c.id);
                return (
                  <div key={c.id}
                    onClick={() => setSelectedCreativeIds((prev) => sel ? prev.filter((id) => id !== c.id) : [...prev, c.id])}
                    className={`cursor-pointer rounded-lg border p-2.5 transition-all ${sel ? "border-brand bg-selected ring-2 ring-brand/20" : "border-stroke bg-card hover:border-muted"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {c.type === "VIDEO"
                          ? <Video size={12} className="flex-shrink-0 text-purple-500" />
                          : <Image size={12} className="flex-shrink-0 text-brand" />}
                        <span className="truncate font-bold text-[12px]">{c.name}</span>
                      </div>
                      <input type="checkbox" checked={sel} onChange={() => {}} className="mt-0.5 flex-shrink-0" />
                    </div>
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {c.zGroup && <Badge tone="good">{c.zGroup}</Badge>}
                      {c.geo && <Badge tone="neutral">{c.geo}</Badge>}
                      {c.angle && <Badge tone="neutral">{ANGLE_LABELS[c.angle as CreativeAngle] ?? c.angle}</Badge>}
                    </div>
                    {c.headline && <div className="mt-1 text-[12px] font-semibold text-ink truncate">{c.headline}</div>}
                    {c.primaryText && <div className="mt-0.5 line-clamp-2 text-[11px] text-muted">{c.primaryText}</div>}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge tone="neutral">{c.callToAction.replace(/_/g, " ")}</Badge>
                      {c.destinationUrl && <span className="truncate text-[11px] text-brand max-w-[120px]">{c.destinationUrl}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => goTo(2)}><ChevronLeft size={14} /> Назад</Button>
            <Button disabled={selectedCreativeIds.length === 0} onClick={() => goTo(4)}>
              Далее: Запуск <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review & Launch ── */}
      {step === 4 && (
        <div key="s4" className={`space-y-3 ${stepClass}`}>
          {/* Volume cards */}
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {[
              { value: selectedAccountIds.length, label: "Кабинетов" },
              { value: selectedCreativeIds.length, label: "Креативов" },
              { value: totals.campaigns, label: "Кампаний" },
              { value: totals.adSets, label: "Групп" },
              { value: totals.ads, label: "Объявлений" },
            ].map((s, i) => (
              <StatCard key={i} value={s.value} label={s.label} tone={i === 4 ? "good" : "default"} delay={i * 60} />
            ))}
          </div>

          {/* Config summary */}
          <Card>
            <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Параметры</div>
            <dl className="grid grid-cols-2 gap-2 text-[12px] md:grid-cols-4">
              <div><dt className="text-muted text-[10px]">Вертикаль</dt><dd className="font-semibold">{vertical ? VERTICAL_PRESETS[vertical].emoji + " " + VERTICAL_PRESETS[vertical].label : "—"}</dd></div>
              <div><dt className="text-muted text-[10px]">Структура</dt><dd className="font-semibold">{rules.structure}</dd></div>
              <div><dt className="text-muted text-[10px]">Цель</dt><dd className="font-semibold">{rules.objective.replace("OUTCOME_", "")}</dd></div>
              <div><dt className="text-muted text-[10px]">Статус</dt><dd className="font-semibold">{rules.campaignStatus}</dd></div>
              <div><dt className="text-muted text-[10px]">Бюджет/день</dt><dd className="font-semibold">{rules.dailyBudget ? `$${rules.dailyBudget}` : "—"}</dd></div>
              <div><dt className="text-muted text-[10px]">Стратегия</dt><dd className="font-semibold text-[11px]">{rules.bidStrategy.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-muted text-[10px]">Оптимизация</dt><dd className="font-semibold text-[11px]">{rules.optimizationGoal.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-muted text-[10px]">Кампаний/кабинет</dt><dd className="font-semibold">{rules.campaignsPerAccount}</dd></div>
            </dl>
          </Card>

          {/* Naming preview */}
          <Card>
            <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Превью названий</div>
            <div className="space-y-1 font-mono text-[11px]">
              <div><span className="text-muted w-28 inline-block">Кампания:</span><span className="text-ink">{previewName(rules.campaignNameTpl)}</span></div>
              <div><span className="text-muted w-28 inline-block">Группа:</span><span className="text-ink">{previewName(rules.adSetNameTpl)}</span></div>
              <div><span className="text-muted w-28 inline-block">Объявление:</span><span className="text-ink">{previewName(rules.adNameTpl)}</span></div>
            </div>
          </Card>

          {/* Job name */}
          <Card>
            <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Название задачи</div>
            <Input placeholder="Например: Нутра | DE | CBO | Май 2026" value={jobName}
              onChange={(e) => setJobName(e.target.value)} className="w-full max-w-lg" />
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => goTo(3)}><ChevronLeft size={14} /> Назад</Button>
            <Button disabled={!jobName || launching} onClick={launch}
              className={`gap-2 bg-success px-6 py-2 text-[13px] font-bold text-white hover:bg-success/90${hlRunLaunch ? " ai-highlight" : ""}`}>
              {launching ? (
                <><Loader2 size={15} className="animate-spin" /> Заливаем {selectedAccountIds.length} кабинетов...</>
              ) : (
                <><Rocket size={15} /> Запустить залив — {totals.ads} объявлений</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
