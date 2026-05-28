import { useEffect, useState } from "react";
import { Badge, Button, Card, statusTone } from "@/components/ui";
import { ru } from "@/lib/i18n";
import * as api from "@/lib/api";

type Connection = { id: string; name: string; status: string };

export function IntegrationsClient() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("Meta mock");
  const [status, setStatus] = useState("MOCK");
  const [importCount, setImportCount] = useState(0);

  async function loadConnections() {
    // Connections list: not yet exposed as separate endpoint — show placeholder
    setConnections([{ id: "mock", name: "Meta Ads (mock)", status: "MOCK" }]);
  }

  useEffect(() => { void loadConnections(); }, []);

  async function mockImport() {
    const count = await api.mockImportAccounts(30);
    setImportCount(count);
    setMessage(`Импортировано ${count} тестовых кабинетов в базу.`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Интеграции</h1>
        <p className="text-sm text-slate-500">В MVP: Meta mock/placeholder для загрузки кабинетов. Реальный API — следующий этап.</p>
      </div>

      <Card className="space-y-4">
        <div className="text-sm font-bold text-slate-700">Meta подключения</div>
        <div className="space-y-2">
          {connections.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded border border-stroke bg-raised p-3">
              <span className="font-bold">{c.name}</span>
              <Badge tone={statusTone(c.status)}>{ru(c.status)}</Badge>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={mockImport}>
            Загрузить 30 mock кабинетов
          </Button>
        </div>

        {message && (
          <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>
        )}
      </Card>

      <Card>
        <div className="mb-2 text-sm font-bold text-slate-700">Аккаунт и подписка</div>
        <SubscriptionBlock />
      </Card>
    </div>
  );
}

function SubscriptionBlock() {
  const [user, setUser] = useState<{ name: string; email: string; plan: string; expiresAt?: string } | null>(null);

  useEffect(() => {
    void api.getCurrentUser().then((res) => setUser(res.user ?? null));
  }, []);

  return (
    <div className="space-y-3">
      {user && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-stroke bg-raised p-3">
          <div>
            <div className="text-sm font-bold">{user.name}</div>
            <div className="text-xs text-muted">{user.email}</div>
            {user.expiresAt && (
              <div className="mt-1 text-xs text-muted">
                Токен входа действует до {new Date(user.expiresAt).toLocaleDateString("ru-RU")}
              </div>
            )}
          </div>
          <Badge tone={user.plan === "free" ? "neutral" : "good"}>{user.plan}</Badge>
        </div>
      )}
      <Button onClick={() => void api.openBillingPage()} variant="ghost">
        Оплатить или продлить подписку
      </Button>
    </div>
  );
}
