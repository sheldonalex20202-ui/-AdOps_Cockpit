"use client";

import { Image, Plus, Trash2, Upload, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Empty, Input, Select } from "@/components/ui";
import { parseCreativeFilename } from "@/lib/launch-engine";
import * as api from "@/lib/api";

type Creative = {
  id: string; name: string; type: string; zGroup?: string; geo?: string;
  headline?: string; primaryText?: string;
  callToAction: string; destinationUrl?: string; mediaUrl?: string;
  createdAt: any;
};

const EMPTY_FORM = { name: "", type: "VIDEO", headline: "", primaryText: "", callToAction: "LEARN_MORE", destinationUrl: "", mediaUrl: "" };
const CTA_OPTIONS = ["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "GET_OFFER", "SUBSCRIBE", "BOOK_NOW", "CONTACT_US", "DOWNLOAD"];

// Group creatives by Z-group for display
function groupByZ(creatives: Creative[]) {
  const groups = new Map<string, Creative[]>();
  const noGroup: Creative[] = [];
  for (const c of creatives) {
    if (c.zGroup) {
      if (!groups.has(c.zGroup)) groups.set(c.zGroup, []);
      groups.get(c.zGroup)!.push(c);
    } else {
      noGroup.push(c);
    }
  }
  const sorted = new Map([...groups.entries()].sort());
  if (noGroup.length) sorted.set("—", noGroup);
  return sorted;
}

export function CreativesClient() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<{ name: string; zGroup?: string; geo?: string; url: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await api.getCreatives();
    setCreatives(res.creatives ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  // Parse files selected in bulk picker
  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setBulkFiles(files.map((f) => {
      const parsed = parseCreativeFilename(f.name);
      return {
        name: f.name.replace(/\.[^.]+$/, ""),
        zGroup: parsed.zNum ?? undefined,
        geo: parsed.geo ?? undefined,
        url: "",
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

  const grouped = groupByZ(creatives);
  const zGroupCount = [...grouped.keys()].filter((k) => k !== "—").length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Библиотека креативов</h1>
          <p className="text-sm text-slate-500">
            {creatives.length} креативов
            {zGroupCount > 0 && <> · <strong>{zGroupCount} ключей заголовков</strong> (авто-определение из имени файла)</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Bulk import
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}><Plus size={15} /> Добавить</Button>
        </div>
      </div>

      {/* Hidden file picker */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="video/*,image/*"
        className="hidden"
        onChange={onFilesSelected}
      />

      {/* Bulk import preview */}
      {bulkFiles.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">Импорт {bulkFiles.length} файлов</div>
              <div className="text-xs text-slate-500">
                Гео: {new Set(bulkFiles.map((f) => f.geo).filter(Boolean)).size} уникальных
                {" · "}Заголовков: {new Set(bulkFiles.map((f) => f.zGroup).filter(Boolean)).size} ключей
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setBulkFiles([])}>Отмена</Button>
              <Button onClick={bulkImport} disabled={importing}>
                {importing ? "Импортируем..." : `Добавить ${bulkFiles.length} крео`}
              </Button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-1 text-left">Файл</th>
                  <th className="pb-1 text-left">Гео</th>
                  <th className="pb-1 text-left">Заголовок</th>
                </tr>
              </thead>
              <tbody>
                {bulkFiles.map((f, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1.5 font-mono text-xs text-slate-700">{f.name}</td>
                    <td>
                      {f.geo ? (
                        <Badge tone="neutral">{f.geo}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      {f.zGroup ? (
                        <Badge tone="good">{f.zGroup}</Badge>
                      ) : (
                        <Badge tone="warn">не определён</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Single add form */}
      {showForm && (
        <Card>
          <div className="mb-3 text-sm font-bold text-slate-700">Новый креатив</div>
          <p className="mb-3 text-xs text-slate-500">
            Гео и ключ заголовка определяются из названия: <code className="rounded bg-raised px-1">SKANDAL-ES-1805-2-Z1.mp4</code> → гео <Badge tone="neutral">ES</Badge> заголовок <Badge tone="good">Z1</Badge>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Input placeholder="Название файла (напр. promo_Z1.mp4)" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const p = parseCreativeFilename(form.name);
                  return <>
                    {p.geo && <><span className="text-xs text-slate-500">Гео:</span><Badge tone="neutral">{p.geo}</Badge></>}
                    <span className="text-xs text-slate-500">Заголовок:</span>
                    {p.zNum ? <Badge tone="good">{p.zNum}</Badge> : <Badge tone="neutral">не определён</Badge>}
                  </>;
                })()}
              </div>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full">
                <option value="VIDEO">Видео</option>
                <option value="IMAGE">Изображение</option>
                <option value="TEXT_ONLY">Только текст</option>
              </Select>
              <Select value={form.callToAction} onChange={(e) => setForm({ ...form, callToAction: e.target.value })} className="w-full">
                {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </Select>
              <Input placeholder="URL назначения" value={form.destinationUrl}
                onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} className="w-full" />
            </div>
            <div className="space-y-2">
              <Input placeholder="Заголовок (можно оставить — возьмёт из Keitaro)" value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })} className="w-full" />
              <textarea placeholder="Основной текст объявления"
                value={form.primaryText}
                onChange={(e) => setForm({ ...form, primaryText: e.target.value })}
                rows={5}
                className="w-full rounded border border-stroke bg-card px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={save} disabled={!form.name || saving}>{saving ? "..." : "Сохранить"}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
          </div>
        </Card>
      )}

      {/* Z-group hint */}
      {creatives.length > 0 && zGroupCount === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            <strong>Совет:</strong> Назовите файлы по формату <code className="rounded bg-amber-100 px-1">OFFER-GEO-MMDD-V-Z1.mp4</code>, например <code className="rounded bg-amber-100 px-1">SKANDAL-ES-1805-2-Z1.mp4</code> — тогда гео и ключ заголовка определятся автоматически.
          </p>
        </Card>
      )}

      {/* Grouped creative list */}
      {loading ? (
        <Empty text="Загрузка..." />
      ) : creatives.length === 0 ? (
        <Empty text="Нет креативов. Добавьте вручную или используйте Bulk import." />
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([zGroup, items]) => (
            <div key={zGroup}>
              <div className="mb-2 flex items-center gap-2">
                {zGroup !== "—" ? (
                  <Badge tone="good">{zGroup}</Badge>
                ) : (
                  <Badge tone="neutral">Без Z-группы</Badge>
                )}
                <span className="text-xs text-slate-500">{items.length} крео</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <Card key={c.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.type === "VIDEO"
                          ? <Video size={14} className="flex-shrink-0 text-purple-500" />
                          : <Image size={14} className="flex-shrink-0 text-blue-500" />}
                        <span className="truncate font-bold text-sm text-slate-900">{c.name}</span>
                      </div>
                      <button onClick={() => remove(c.id)} className="flex-shrink-0 text-slate-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {c.geo && <Badge tone="neutral">{c.geo}</Badge>}
                      {c.zGroup && <Badge tone="good">{c.zGroup}</Badge>}
                    </div>
                    {c.headline && <div className="text-xs font-semibold text-slate-700">{c.headline}</div>}
                    {c.primaryText && <div className="line-clamp-2 text-xs text-slate-500">{c.primaryText}</div>}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{c.callToAction.replace(/_/g, " ")}</Badge>
                      {c.destinationUrl && <span className="max-w-[150px] truncate text-xs text-blue-600">{c.destinationUrl}</span>}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
