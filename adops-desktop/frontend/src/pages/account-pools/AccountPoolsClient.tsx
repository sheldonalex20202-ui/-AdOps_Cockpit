import { Layers3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Empty, Input, PageHeader } from "@/components/ui";
import * as api from "@/lib/api";

type Pool = { id: string; name: string; description?: string; color: string; items?: { id: string }[] };

export function AccountPoolsClient() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [form, setForm] = useState({ name: "", description: "", color: "#3b82f6" });

  async function load() {
    const res = await api.getPools();
    setPools(res.pools ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function createPool() {
    if (!form.name) return;
    await api.createPool({ name: form.name, description: form.description || undefined, color: form.color });
    setForm({ name: "", description: "", color: "#3b82f6" });
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Пулы кабинетов"
        subtitle="Группируйте кабинеты под тесты, scale, гео или риск-профиль"
        icon={Layers3}
        stats={[{ label: "пулов", value: pools.length }]}
      />

      {/* Create form */}
      <Card padding="sm">
        <p className="mb-2 text-[11px] font-semibold text-muted uppercase tracking-wide">Новый пул</p>
        <div className="grid grid-cols-[1fr_1.4fr_36px_auto] gap-2 items-center">
          <Input
            placeholder="Название пула"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Описание (опционально)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className="h-8 w-9 cursor-pointer rounded border border-stroke bg-card p-0.5"
            title="Цвет пула"
          />
          <Button onClick={createPool} disabled={!form.name}>
            <Plus size={13} /> Создать
          </Button>
        </div>
      </Card>

      {/* Pool grid */}
      {pools.length === 0 ? (
        <Empty icon={Layers3} text="Пулов пока нет. Создайте первый пул выше." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pools.map((pool) => (
            <Card key={pool.id} padding="md" className="group relative">
              {/* Accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg"
                style={{ backgroundColor: pool.color }}
              />

              <div className="pl-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pool.color }}
                    />
                    <span className="font-semibold text-[14px] text-ink truncate">{pool.name}</span>
                  </div>
                  <p className="text-[12px] text-muted line-clamp-2">
                    {pool.description || "Без описания"}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-semibold"
                      style={{ backgroundColor: `${pool.color}18`, color: pool.color }}
                    >
                      {pool.items?.length ?? 0} кабинетов
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => api.deletePool(pool.id).then(load)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                  title="Удалить пул"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
