"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Empty, Input } from "@/components/ui";
import * as api from "@/lib/api";

type Pool = { id: string; name: string; description?: string; color: string; items?: { id: string }[] };

export function AccountPoolsClient() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [form, setForm] = useState({ name: "", description: "", color: "#2563eb" });

  async function load() {
    const res = await api.getPools();
    setPools(res.pools ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPool() {
    if (!form.name) return;
    await api.createPool({ name: form.name, description: form.description || undefined, color: form.color });
    setForm({ name: "", description: "", color: "#2563eb" });
    await load();
  }

  async function removePool(id: string) {
    await api.deletePool(id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Пулы кабинетов</h1>
        <p className="text-sm text-slate-500">Группируйте кабинеты под тесты, scale, гео или риск-профиль.</p>
      </div>
      <Card>
        <div className="grid gap-2 md:grid-cols-[1fr_1.5fr_120px_auto]">
          <Input placeholder="Название пула" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="Описание" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <Input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
          <Button onClick={createPool}><Plus size={16} /> Создать</Button>
        </div>
      </Card>
      {pools.length === 0 ? <Empty text="Пулов пока нет." /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pools.map((pool) => (
            <Card key={pool.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: pool.color }} />
                    <h2 className="font-black">{pool.name}</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{pool.description || "Без описания"}</p>
                  <p className="mt-3 text-sm font-bold text-slate-700">Кабинетов: {pool.items?.length ?? 0}</p>
                </div>
                <button className="text-xs font-bold text-slate-500 hover:text-red-700" onClick={() => removePool(pool.id)}>Удалить</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
