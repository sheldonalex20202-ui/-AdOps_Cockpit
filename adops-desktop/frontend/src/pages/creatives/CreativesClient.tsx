"use client";

import { Image, LayoutGrid, List, Plus, Trash2, Upload, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, Empty, Input, Select } from "@/components/ui";
import { parseCreativeFilename } from "@/lib/launch-engine";
import * as api from "@/lib/api";
import { ANGLE_LABELS, type CreativeAngle } from "@/lib/presets";

type Creative = {
  id: string; name: string; type: string;
  zGroup?: string; geo?: string; angle?: string;
  headline?: string; primaryText?: string;
  callToAction: string; destinationUrl?: string; mediaUrl?: string;
  createdAt: any;
};

const EMPTY_FORM = {
  name: "", type: "VIDEO", headline: "", primaryText: "",
  callToAction: "LEARN_MORE", destinationUrl: "", mediaUrl: "", angle: "",
};
const CTA_OPTIONS = [
  "LEARN_MORE", "SHOP_NOW", "SIGN_UP", "GET_OFFER", "SUBSCRIBE",
  "BOOK_NOW", "CONTACT_US", "DOWNLOAD", "PLAY_GAME", "GET_STARTED", "ORDER_NOW",
];

export function CreativesClient() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [zFilter, setZFilter] = useState("");
  const [angleFilter, setAngleFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");

  // Bulk import
  const [bulkFiles, setBulkFiles] = useState<{ name: string; zGroup?: string; geo?: string; angle?: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await api.getCreatives();
    setCreatives(res.creatives ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setBulkFiles(files.map((f) => {
      const parsed = parseCreativeFilename(f.name);
      return {
        name: f.name.replace(/\.[^.]+$/, ""),
        zGroup: parsed.zNum ?? undefined,
        geo: parsed.geo ?? undefined,
      };
    }));
  }

  async function bulkImport() {
    if (!bulkFiles.length) return;
    setImporting(true);
    await Promise.all(
      bulkFiles.map((f) =>
        api.createCreative({ name: f.name, type: "VIDEO", callToAction: "LEARN_MORE", zGroup: f.zGroup, geo: f.geo })
      )
    );
    setBulkFiles([]);
    setImporting(false);
    await load();
  }

  async function save() {
    if (!form.name) return;
    setSaving(true);
    const parsed = parseCreativeFilename(form.name);
    await api.createCreative({
      ...form,
      zGroup: parsed.zNum ?? undefined,
      geo: parsed.geo ?? undefined,
      mediaUrl: form.mediaUrl || undefined,
      headline: form.headline || undefined,
      primaryText: form.primaryText || undefined,
      destinationUrl: form.destinationUrl || undefined,
      angle: form.angle || undefined,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function remove(id: string) {
    await api.deleteCreative(id);
    setCreatives((prev) => prev.filter((c) => c.id !== id));
  }

  const allZGroups = useMemo(() => [...new Set(creatives.map((c) => c.zGroup).filter(Boolean))] as string[], [creatives]);
  const allAngles = useMemo(() => [...new Set(creatives.map((c) => c.angle).filter(Boolean))] as string[], [creatives]);

  const filtered = useMemo(() => {
    return creatives.filter((c) => {
      if (zFilter && c.zGroup !== zFilter) return false;
      if (angleFilter && c.angle !== angleFilter) return false;
      if (geoFilter && (!c.geo || !c.geo.toLowerCase().includes(geoFilter.toLowerCase()))) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [creatives, zFilter, angleFilter, geoFilter, search]);

  // Stats breakdown
  const zBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of creatives) {
      const k = c.zGroup ?? "—";
      map[k] = (map[k] ?? 0) + 1;
    }
    return Object.entries(map).sort();
  }, [creatives]);

  const angleBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of creatives) {
      if (c.angle) map[c.angle] = (map[c.angle] ?? 0) + 1;
    }
    return Object.entries(map).sort();
  }, [creatives]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">Библиотека креативов</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted">{creatives.length} крео</span>
            {zBreakdown.slice(0, 5).map(([z, n]) => (
              <span key={z} onClick={() => setZFilter(zFilter === z ? "" : z)}
                className="cursor-pointer rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold text-muted hover:bg-selected">
                {z} <span className="text-ink">{n}</span>
              </span>
            ))}
            {angleBreakdown.slice(0, 4).map(([a, n]) => (
              <span key={a} onClick={() => setAngleFilter(angleFilter === a ? "" : a)}
                className="cursor-pointer rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold text-muted hover:bg-selected">
                {ANGLE_LABELS[a as CreativeAngle] ?? a} <span className="text-ink">{n}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-stroke">
            <button onClick={() => setViewMode("grid")}
              className={`p-1.5 ${viewMode === "grid" ? "bg-brand text-brand-fg" : "text-muted hover:text-ink"}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-1.5 ${viewMode === "list" ? "bg-brand text-brand-fg" : "text-muted hover:text-ink"}`}>
              <List size={14} />
            </button>
          </div>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Bulk import
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}><Plus size={13} /> Добавить</Button>
        </div>
      </div>

      <input ref={fileRef} type="file" multiple accept="video/*,image/*" className="hidden" onChange={onFilesSelected} />

      {/* Bulk import preview */}
      {bulkFiles.length > 0 && (
        <Card className="animate-scale-in">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold">Импорт {bulkFiles.length} файлов</div>
              <div className="text-[11px] text-muted">
                Гео: {new Set(bulkFiles.map((f) => f.geo).filter(Boolean)).size} · Z-ключей: {new Set(bulkFiles.map((f) => f.zGroup).filter(Boolean)).size}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setBulkFiles([])}>Отмена</Button>
              <Button onClick={bulkImport} disabled={importing}>
                {importing ? "Импортируем..." : `Добавить ${bulkFiles.length}`}
              </Button>
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="text-muted">
                <tr>
                  <th className="pb-1 text-left">Файл</th>
                  <th className="pb-1 text-left">Гео</th>
                  <th className="pb-1 text-left">Z-ключ</th>
                  <th className="pb-1 text-left">Угол</th>
                </tr>
              </thead>
              <tbody>
                {bulkFiles.map((f, i) => (
                  <tr key={i} className="border-t border-stroke">
                    <td className="py-1 font-mono text-muted">{f.name}</td>
                    <td>{f.geo ? <Badge tone="neutral">{f.geo}</Badge> : <span className="text-muted">—</span>}</td>
                    <td>{f.zGroup ? <Badge tone="good">{f.zGroup}</Badge> : <Badge tone="warn">нет</Badge>}</td>
                    <td><span className="text-muted">—</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add form */}
      {showForm && (
        <Card className="animate-fade-in-up">
          <div className="mb-2 text-[11px] font-bold text-muted uppercase tracking-wide">Новый креатив</div>
          <p className="mb-2 text-[11px] text-muted">
            Гео и Z-ключ определяются из имени: <code className="rounded bg-raised px-1">OFFER-DE-1805-2-Z1.mp4</code>
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-2">
              <Input placeholder="Название файла (напр. promo_Z1.mp4)" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                {(() => {
                  const p = parseCreativeFilename(form.name);
                  return <>
                    {p.geo && <><span className="text-muted">Гео:</span><Badge tone="neutral">{p.geo}</Badge></>}
                    <span className="text-muted">Z-ключ:</span>
                    {p.zNum ? <Badge tone="good">{p.zNum}</Badge> : <Badge tone="neutral">не определён</Badge>}
                  </>;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full">
                  <option value="VIDEO">Видео</option>
                  <option value="IMAGE">Изображение</option>
                  <option value="TEXT_ONLY">Только текст</option>
                </Select>
                <Select value={form.angle} onChange={(e) => setForm({ ...form, angle: e.target.value })} className="w-full">
                  <option value="">— Угол —</option>
                  {(Object.entries(ANGLE_LABELS) as [CreativeAngle, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Select>
              </div>
              <Select value={form.callToAction} onChange={(e) => setForm({ ...form, callToAction: e.target.value })} className="w-full">
                {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </Select>
              <Input placeholder="URL назначения" value={form.destinationUrl}
                onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} className="w-full" />
              <Input placeholder="Заголовок" value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })} className="w-full" />
            </div>
            <textarea placeholder="Основной текст объявления"
              value={form.primaryText}
              onChange={(e) => setForm({ ...form, primaryText: e.target.value })}
              rows={7}
              className="w-full rounded border border-stroke bg-card px-3 py-2 text-[12px] text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand" />
          </div>
          <div className="mt-2 flex gap-2">
            <Button onClick={save} disabled={!form.name || saving}>{saving ? "..." : "Сохранить"}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Поиск по имени..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="w-44" />
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setZFilter("")}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${!zFilter ? "bg-brand text-brand-fg" : "bg-raised text-muted hover:bg-selected"}`}>
            Все Z
          </button>
          {allZGroups.map((z) => (
            <button key={z} onClick={() => setZFilter(zFilter === z ? "" : z)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                zFilter === z ? "bg-success text-white" : "bg-raised text-muted hover:bg-selected"
              }`}>
              {z}
            </button>
          ))}
        </div>
        <Select value={angleFilter} onChange={(e) => setAngleFilter(e.target.value)} className="w-36">
          <option value="">Все углы</option>
          {(Object.entries(ANGLE_LABELS) as [CreativeAngle, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
        <Input placeholder="Гео..." value={geoFilter}
          onChange={(e) => setGeoFilter(e.target.value.toUpperCase())} className="w-20" />
        {(search || zFilter || angleFilter || geoFilter) && (
          <button onClick={() => { setSearch(""); setZFilter(""); setAngleFilter(""); setGeoFilter(""); }}
            className="text-[11px] text-muted hover:text-danger">
            Сбросить
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} / {creatives.length}</span>
      </div>

      {/* Naming hint */}
      {creatives.length > 0 && allZGroups.length === 0 && (
        <Card className="border-warn/40 bg-warn/5">
          <p className="text-[12px] text-warn">
            <strong>Совет:</strong> Назовите файлы по формату <code className="rounded bg-raised px-1">OFFER-GEO-MMDD-V-Z1.mp4</code> — гео и Z-ключ определятся автоматически.
          </p>
        </Card>
      )}

      {/* Creative list */}
      {loading ? (
        <Empty text="Загрузка..." />
      ) : filtered.length === 0 ? (
        <Empty text={creatives.length === 0 ? "Нет креативов. Добавьте или импортируйте." : "Нет крео, подходящих под фильтр."} />
      ) : viewMode === "grid" ? (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="group relative flex flex-col gap-1.5 p-2.5">
              {/* row 1: type + name + delete */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {c.type === "VIDEO"
                    ? <div className="flex-shrink-0 rounded p-0.5 bg-purple-500/10"><Video size={11} className="text-purple-500" /></div>
                    : <div className="flex-shrink-0 rounded p-0.5 bg-brand/10"><Image size={11} className="text-brand" /></div>}
                  <span className="truncate text-[12px] font-bold">{c.name}</span>
                </div>
                <button onClick={() => remove(c.id)}
                  className="flex-shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-danger">
                  <Trash2 size={12} />
                </button>
              </div>
              {/* row 2: badges */}
              <div className="flex flex-wrap items-center gap-1">
                {c.zGroup && <Badge tone="good">{c.zGroup}</Badge>}
                {c.geo && <Badge tone="neutral">{c.geo}</Badge>}
                {c.angle && <Badge tone="neutral">{ANGLE_LABELS[c.angle as CreativeAngle] ?? c.angle}</Badge>}
              </div>
              {/* row 3: headline */}
              {c.headline && <div className="text-[12px] font-semibold text-ink truncate">{c.headline}</div>}
              {/* row 4: primary text */}
              {c.primaryText && <div className="line-clamp-2 text-[11px] text-muted">{c.primaryText}</div>}
              {/* row 5: CTA + URL */}
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <Badge tone="neutral">{c.callToAction.replace(/_/g, " ")}</Badge>
                {c.destinationUrl && <span className="truncate text-[11px] text-brand max-w-[120px]">{c.destinationUrl}</span>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-stroke bg-card overflow-hidden">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr>
                <th className="p-2">Тип</th>
                <th>Название</th>
                <th>Z-группа</th>
                <th>Гео</th>
                <th>Угол</th>
                <th>CTA</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-stroke hover:bg-raised group">
                  <td className="p-2">
                    {c.type === "VIDEO"
                      ? <Video size={12} className="text-purple-500" />
                      : <Image size={12} className="text-brand" />}
                  </td>
                  <td className="font-bold max-w-[200px] truncate py-1.5">{c.name}</td>
                  <td>{c.zGroup ? <Badge tone="good">{c.zGroup}</Badge> : <span className="text-muted">—</span>}</td>
                  <td>{c.geo ? <Badge tone="neutral">{c.geo}</Badge> : <span className="text-muted">—</span>}</td>
                  <td>{c.angle ? <Badge tone="neutral">{ANGLE_LABELS[c.angle as CreativeAngle] ?? c.angle}</Badge> : <span className="text-muted">—</span>}</td>
                  <td><Badge tone="neutral">{c.callToAction.replace(/_/g, " ")}</Badge></td>
                  <td>
                    <button onClick={() => remove(c.id)}
                      className="text-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-danger">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
