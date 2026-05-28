"use client";

import { CheckCircle, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Empty, Input, Select, Table, statusTone } from "@/components/ui";
import { ru } from "@/lib/i18n";
import * as api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobItem = {
  id: string; status: string; errorMessage?: string;
  adAccount?: { id: string; name: string; externalId: string };
  resultJson?: Record<string, any>;
};

type JobSummary = {
  id: string; name: string; status: string;
  createdAt: string; completedAt?: string;
  totalAccounts: number; successCount: number; failedCount: number;
  configJson: Record<string, any>;
  items?: JobItem[];
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, tone = "default", delay = 0 }: {
  value: number | string; label: string; tone?: "default" | "good" | "bad" | "warn"; delay?: number;
}) {
  const colors = { default: "text-ink", good: "text-success", bad: "text-danger", warn: "text-warn" };
  return (
    <Card className="text-center animate-count-pop" style={{ animationDelay: `${delay}ms` }}>
      <div className={`text-2xl font-black ${colors[tone]}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LaunchHistoryClient() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [structureFilter, setStructureFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getLaunchJobsDetailed(100).then((data: any) => {
      setJobs(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  function toggleRow(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function relaunch() {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "launch" }));
  }

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter && j.status !== statusFilter) return false;
      if (structureFilter && j.configJson?.structure !== structureFilter) return false;
      if (search && !j.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [jobs, statusFilter, structureFilter, search]);

  // Aggregate stats
  const totalJobs = jobs.length;
  const avgSuccessRate = jobs.length
    ? Math.round(jobs.reduce((sum, j) => sum + (j.totalAccounts > 0 ? (j.successCount / j.totalAccounts) * 100 : 0), 0) / jobs.length)
    : 0;
  const totalAccounts = jobs.reduce((sum, j) => sum + j.totalAccounts, 0);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function structureTone(s?: string): "good" | "warn" | "neutral" | "bad" {
    if (!s) return "neutral";
    if (s === "CBO") return "good";
    if (s === "Z_GROUPED") return "warn";
    return "neutral";
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">История залива</h1>
          <p className="text-[12px] text-muted">Все прошлые запуски с детализацией по кабинетам.</p>
        </div>
        <Button onClick={relaunch}><RotateCcw size={13} /> Новый залив</Button>
      </div>

      {/* Stat cards */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={totalJobs} label="Всего запусков" delay={0} />
          <StatCard value={`${avgSuccessRate}%`} label="Средний % успеха"
            tone={avgSuccessRate >= 80 ? "good" : avgSuccessRate >= 50 ? "warn" : "bad"} delay={60} />
          <StatCard value={totalAccounts} label="Кабинетов обработано" delay={120} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Поиск по названию..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="w-48" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
          <option value="">Любой статус</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="FAILED">FAILED</option>
          <option value="PENDING">PENDING</option>
        </Select>
        <Select value={structureFilter} onChange={(e) => setStructureFilter(e.target.value)} className="w-36">
          <option value="">Любая структура</option>
          <option value="CBO">CBO</option>
          <option value="ABO">ABO</option>
          <option value="ISOLATION">ISOLATION</option>
          <option value="Z_GROUPED">Z_GROUPED</option>
        </Select>
        {(search || statusFilter || structureFilter) && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); setStructureFilter(""); }}
            className="text-[11px] text-muted hover:text-danger">Сбросить</button>
        )}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} / {jobs.length}</span>
      </div>

      {loading ? (
        <Empty text="Загрузка истории..." />
      ) : jobs.length === 0 ? (
        <Empty text="Нет запусков. Сделайте первый залив." />
      ) : filtered.length === 0 ? (
        <Empty text="Нет запусков под фильтр." />
      ) : (
        <Table>
          <table className="w-full min-w-[780px] text-left text-[12px]">
            <thead>
              <tr>
                <th className="p-2">Дата/время</th>
                <th>Название</th>
                <th>Структура</th>
                <th>Кабинеты</th>
                <th>Статус</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => {
                const rate = job.totalAccounts > 0
                  ? Math.round((job.successCount / job.totalAccounts) * 100)
                  : 0;
                const expanded = expandedIds.has(job.id);
                const structure = job.configJson?.structure as string | undefined;
                return (
                  <>
                    <tr key={job.id}
                      className="border-t border-stroke cursor-pointer hover:bg-raised"
                      onClick={() => toggleRow(job.id)}>
                      <td className="p-2 text-muted">{formatDate(job.createdAt)}</td>
                      <td className="font-bold max-w-[200px] truncate py-1.5">{job.name}</td>
                      <td>{structure ? <Badge tone={structureTone(structure)}>{structure}</Badge> : <span className="text-muted">—</span>}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${rate >= 80 ? "text-success" : rate >= 50 ? "text-warn" : "text-danger"}`}>
                            {job.successCount}
                          </span>
                          <span className="text-muted">/</span>
                          <span>{job.totalAccounts}</span>
                          <div className="ml-1 h-1.5 w-12 overflow-hidden rounded-full bg-raised">
                            <div className={`h-1.5 rounded-full transition-all ${rate >= 80 ? "bg-success" : rate >= 50 ? "bg-warn" : "bg-danger"}`}
                              style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={job.status === "COMPLETED" ? "good" : job.status === "PARTIAL" ? "warn" : "bad"}>
                          {ru(job.status)}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); relaunch(); }}
                            className="text-muted hover:text-brand transition-colors" title="Повторить залив">
                            <RotateCcw size={12} />
                          </button>
                          <span className="text-muted text-[10px]">{expanded ? "▲" : "▼"}</span>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${job.id}-detail`} className="border-t border-stroke bg-raised/40">
                        <td colSpan={6} className="px-4 py-2 animate-fade-in-up">
                          <div className="space-y-1">
                            {(job.items ?? []).map((item) => (
                              <div key={item.id} className="flex items-center gap-3 text-[11px]">
                                <div className="w-4">
                                  {item.status === "SUCCESS"
                                    ? <CheckCircle size={12} className="text-success" />
                                    : <XCircle size={12} className="text-danger" />}
                                </div>
                                <span className="font-semibold w-40 truncate">{item.adAccount?.name ?? "—"}</span>
                                <span className="text-muted font-mono w-28">{item.adAccount?.externalId ?? "—"}</span>
                                <span className="text-muted">
                                  {item.resultJson?.totalCampaigns ?? 0}c · {item.resultJson?.totalAdSets ?? 0}g · {item.resultJson?.totalAds ?? 0}ads
                                </span>
                                {item.errorMessage && (
                                  <span className="text-danger truncate max-w-[240px]">{item.errorMessage}</span>
                                )}
                              </div>
                            ))}
                            {(!job.items || job.items.length === 0) && (
                              <div className="text-[11px] text-muted">Детализация недоступна.</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </Table>
      )}
    </div>
  );
}
