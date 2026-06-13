import { Settings, Zap, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader, statusTone } from "@/components/ui";
import { ru } from "@/lib/i18n";
import * as api from "@/lib/api";
import { useAiHighlight } from "@/lib/useAiHighlight";

export function IntegrationsClient() {
  const hlAddIntegration = useAiHighlight("add-integration");
  const [message, setMessage] = useState("");

  async function mockImport() {
    const count = await api.mockImportAccounts(30);
    setMessage(`Импортировано ${count} тестовых кабинетов.`);
    setTimeout(() => setMessage(""), 4000);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Интеграции"
        subtitle="Подключение Meta API, импорт данных и управление подпиской"
        icon={Settings}
      />

      {/* Meta connection */}
      <Card padding="md">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Zap size={15} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink">Meta Ads API</div>
            <div className="text-[11px] text-muted">Mock-режим · Реальный API — следующий этап</div>
          </div>
          <span className="ml-auto"><Badge tone="neutral">Mock</Badge></span>
        </div>
        <div className="rounded-lg border border-stroke bg-raised/40 p-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">Meta Ads (mock)</span>
            <Badge tone="warn" dot>Mock</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={mockImport} className={hlAddIntegration ? "ai-highlight" : ""}>
            <Zap size={12} /> Загрузить 30 mock кабинетов
          </Button>
          {message && (
            <span className="text-[12px] text-success animate-fade-in-up">{message}</span>
          )}
        </div>
      </Card>

      {/* Subscription */}
      <Card padding="md">
        <div className="mb-3 text-[13px] font-semibold text-ink">Аккаунт и подписка</div>
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

  if (!user) return <div className="text-[12px] text-muted">Загрузка...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-stroke bg-raised/40 px-3 py-2.5">
        <div>
          <div className="text-[13px] font-medium text-ink">{user.name}</div>
          <div className="text-[11px] text-muted">{user.email}</div>
          {user.expiresAt && (
            <div className="mt-1 text-[11px] text-muted">
              Сессия до {new Date(user.expiresAt).toLocaleDateString("ru-RU")}
            </div>
          )}
        </div>
        <Badge tone={user.plan === "free" ? "neutral" : "good"}>
          {user.plan}
        </Badge>
      </div>
      <Button variant="ghost" size="sm" onClick={() => void api.openBillingPage()}>
        <ExternalLink size={12} /> Управление подпиской
      </Button>
    </div>
  );
}
