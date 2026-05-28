"use client";

import { useState } from "react";
import { Badge, Button, Card, Input, Select, statusTone } from "@/components/ui";
import { ru } from "@/lib/i18n";

export function IntegrationsClient({ meta }: { meta: { id: string; name: string; status: string }[] }) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("Meta mock");
  const [status, setStatus] = useState("MOCK");

  async function call(path: string, options?: RequestInit) {
    const res = await fetch(path, options ?? { method: "POST" });
    setMessage(JSON.stringify(await res.json(), null, 2));
  }

  async function createConnection() {
    await call("/api/integrations/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, status })
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Интеграции</h1>
        <p className="text-sm text-slate-500">В MVP оставляем только Meta mock/placeholder для загрузки кабинетов.</p>
      </div>
      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Название подключения" />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="MOCK">Mock</option>
            <option value="ACTIVE">Real placeholder</option>
          </Select>
          <Button onClick={createConnection}>Добавить</Button>
        </div>
        <div className="space-y-2">
          {meta.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between rounded-md border border-line p-3">
              <span className="font-bold">{connection.name}</span>
              <Badge tone={statusTone(connection.status)}>{ru(connection.status)}</Badge>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => call("/api/integrations/meta/test")}>Проверить</Button>
          <Button variant="ghost" onClick={() => call("/api/integrations/meta/sync")}>Загрузить mock кабинеты</Button>
        </div>
        {message ? <pre className="max-h-60 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-white">{message}</pre> : null}
      </Card>
    </div>
  );
}
