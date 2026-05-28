import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import * as api from "./lib/api";
import type { UpdateInfo } from "./lib/api";
import { ArrowUpCircle, ExternalLink, Loader2 } from "lucide-react";
import logoImg from "./assets/images/logo.png";
// @ts-ignore
import { EventsOn } from "../../wailsjs/runtime/runtime";

import { LaunchClient }       from "./pages/launch/LaunchClient";
import { AccountsClient }     from "./pages/accounts/AccountsClient";
import { AccountPoolsClient } from "./pages/account-pools/AccountPoolsClient";
import { HealthClient }       from "./pages/health-checks/HealthClient";
import { CreativesClient }    from "./pages/creatives/CreativesClient";
import { AuditClient }        from "./pages/audit-logs/AuditClient";
import { IntegrationsClient } from "./pages/integrations/IntegrationsClient";

type User = { id: string; name: string; email: string };
type AppState = "loading" | "login" | "app";

// ─── Auth card wrapper ─────────────────────────────────────────────────────────

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm rounded-xl border border-stroke bg-card p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card">
            <img src={logoImg} alt="AdOps Cockpit" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-ink">{title}</div>
            <div className="text-[12px] text-muted">{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const submitCls = "mt-1 h-9 w-full rounded bg-brand text-[13px] font-semibold text-brand-fg transition-colors hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-50";

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onDone }: { onDone: (user: User) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(async () => {
      const res = await api.getCurrentUser();
      if (res.user) {
        window.clearInterval(timer);
        onDone(res.user);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [waiting, onDone]);

  async function startLogin() {
    setLoading(true);
    setError("");
    const res = await api.startLoginFlow();
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setWaiting(true);
    setLoading(false);
  }

  return (
    <AuthLayout title="AdOps Cockpit" subtitle="Авторизация через веб-аккаунт">
      <div className="space-y-4">
        <div className="rounded border border-stroke bg-surface px-3 py-2.5 text-[12px] text-muted">
          Вход и регистрация открываются в браузере. После успешной авторизации приложение сохранит локальную сессию.
        </div>
        {error && <div className="text-[12px] text-danger">{error}</div>}
        <button type="button" disabled={loading || waiting} onClick={startLogin} className={submitCls}>
          {loading ? (
            <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Открываем...</span>
          ) : waiting ? (
            <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Ждём браузер...</span>
          ) : (
            <span className="inline-flex items-center gap-2"><ExternalLink size={14} /> Войти через браузер</span>
          )}
        </button>
      </div>
    </AuthLayout>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

function PageContent({ page }: { page: string }) {
  switch (page) {
    case "launch":        return <LaunchClient />;
    case "accounts":      return <AccountsClient />;
    case "account-pools": return <AccountPoolsClient />;
    case "health-checks": return <HealthClient />;
    case "creatives":     return <CreativesClient />;
    case "audit-logs":    return <AuditClient />;
    case "integrations":  return <IntegrationsClient />;
    default:              return <LaunchClient />;
  }
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<AppState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState("launch");
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [version, setVersion] = useState("");
  const [dlDone, setDlDone] = useState(0);
  const [dlTotal, setDlTotal] = useState(0);
  const [updatePhase, setUpdatePhase] = useState<"downloading" | "installing" | "error">("downloading");

  useEffect(() => { void boot(); }, []);

  // Wails event listeners for update progress
  useEffect(() => {
    const offProgress = EventsOn("update:progress", (data: { done: number; total: number }) => {
      setDlDone(data.done);
      setDlTotal(data.total);
      setUpdatePhase("downloading");
    });
    const offInstalling = EventsOn("update:installing", () => setUpdatePhase("installing"));
    const offError = EventsOn("update:error", () => setUpdatePhase("error"));
    return () => { offProgress(); offInstalling(); offError(); };
  }, []);

  // Auto-start update immediately when one is detected
  useEffect(() => {
    if (update) {
      setUpdatePhase("downloading");
      api.startUpdate(update.url).catch(() => setUpdatePhase("error"));
    }
  }, [update]);

  async function boot() {
    const [res, ver] = await Promise.all([api.getCurrentUser(), api.getVersion().catch(() => "")]);
    setVersion(ver);
    if (res.user) { setUser(res.user); setState("app"); }
    else setState("login");
    // Check for update in background — don't block UI
    api.checkForUpdate().then((info) => { if (info.available) setUpdate(info); }).catch(() => {});
  }

  function handleAuth(u: User) { setUser(u); setState("app"); }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setState("login");
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-[13px] text-muted">Загрузка...</div>
      </div>
    );
  }
  if (state === "login")  return <LoginScreen onDone={handleAuth} />;

  return (
    <div className="flex min-h-screen flex-col">
      {update && (
        <div className="flex items-center gap-3 bg-blue-600 px-4 py-2 text-[12px] text-white">
          <ArrowUpCircle size={14} className="shrink-0" />
          {updatePhase === "downloading" && (
            <>
              <span className="shrink-0">Обновление {update.version} — загрузка...</span>
              {dlTotal > 0 && (
                <>
                  <div className="h-1 w-32 shrink-0 overflow-hidden rounded bg-blue-400">
                    <div
                      className="h-full bg-white transition-all duration-200"
                      style={{ width: `${Math.round((dlDone / dlTotal) * 100)}%` }}
                    />
                  </div>
                  <span className="text-blue-200">{Math.round((dlDone / dlTotal) * 100)}%</span>
                </>
              )}
              {dlTotal <= 0 && <Loader2 size={12} className="animate-spin" />}
            </>
          )}
          {updatePhase === "installing" && (
            <span>Устанавливается... приложение перезапустится автоматически</span>
          )}
          {updatePhase === "error" && (
            <>
              <span>Ошибка автообновления.</span>
              <button onClick={() => api.openReleasePage()} className="underline hover:no-underline">
                Скачать вручную
              </button>
            </>
          )}
        </div>
      )}
      <AppShell currentPage={page} onNavigate={setPage} user={user!} onLogout={handleLogout} version={version}>
        <PageContent page={page} />
      </AppShell>
    </div>
  );
}
