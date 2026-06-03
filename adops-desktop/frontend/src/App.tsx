import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import * as api from "./lib/api";
import type { UpdateInfo } from "./lib/api";
import { AlertCircle, Download, ExternalLink, Loader2 } from "lucide-react";
import logoImg from "./assets/images/logo.png";
// @ts-ignore
import { EventsOn } from "../wailsjs/runtime/runtime";

import { LaunchClient }        from "./pages/launch/LaunchClient";
import { AccountsClient }      from "./pages/accounts/AccountsClient";
import { AccountPoolsClient }  from "./pages/account-pools/AccountPoolsClient";
import { HealthClient }        from "./pages/health-checks/HealthClient";
import { CreativesClient }     from "./pages/creatives/CreativesClient";
import { AuditClient }         from "./pages/audit-logs/AuditClient";
import { IntegrationsClient }  from "./pages/integrations/IntegrationsClient";
import { LaunchHistoryClient } from "./pages/launch-history/LaunchHistoryClient";
import { AutocontrolClient }   from "./pages/autocontrol/AutocontrolClient";

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
    case "launch":          return <LaunchClient />;
    case "autocontrol":     return <AutocontrolClient />;
    case "accounts":        return <AccountsClient />;
    case "account-pools":   return <AccountPoolsClient />;
    case "health-checks":   return <HealthClient />;
    case "creatives":       return <CreativesClient />;
    case "audit-logs":      return <AuditClient />;
    case "integrations":    return <IntegrationsClient />;
    case "launch-history":  return <LaunchHistoryClient />;
    default:                return <LaunchClient />;
  }
}

// ─── Update banner ────────────────────────────────────────────────────────────

const fmtMb = (b: number) => (b / 1024 / 1024).toFixed(1);

function UpdateBanner({
  info,
  phase,
  done,
  total,
  onManual,
}: {
  info: UpdateInfo;
  phase: "downloading" | "installing" | "error";
  done: number;
  total: number;
  onManual: () => void;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const known = total > 0;

  return (
    <div className="relative flex items-center gap-3 overflow-hidden bg-[#1d4ed8] px-4 py-3 text-white select-none">
      {/* Shimmer sweep — only while downloading */}
      {phase === "downloading" && (
        <div
          className="pointer-events-none absolute inset-y-0 w-[35%] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
          style={{ animation: "shimmer 2.2s linear infinite" }}
          aria-hidden
        />
      )}

      {/* Icon circle */}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/20">
        {phase === "error"      && <AlertCircle size={15} />}
        {phase === "installing" && <Loader2 size={15} className="animate-spin" />}
        {phase === "downloading" && !known && <Loader2 size={15} className="animate-spin" />}
        {phase === "downloading" && known  && <Download size={15} />}
      </div>

      {/* Text + bar */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-[5px]">
        {/* Row 1: title + right label */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold leading-none">
            {phase === "downloading" && `Загружаю обновление ${info.version}`}
            {phase === "installing"  && `Устанавливаю ${info.version}…`}
            {phase === "error"       && "Не удалось обновить автоматически"}
          </span>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-blue-200">
            {phase === "downloading" && known && `${fmtMb(done)} / ${fmtMb(total)} МБ · ${pct}%`}
            {phase === "installing"  && "приложение перезапустится"}
            {phase === "error"       && (
              <button onClick={onManual} className="text-white underline underline-offset-2 hover:no-underline">
                Скачать вручную
              </button>
            )}
          </span>
        </div>

        {/* Row 2: progress bar */}
        {phase !== "error" && (
          <div className="h-[4px] overflow-hidden rounded-full bg-blue-900/50">
            {phase === "installing" ? (
              /* Pulse full bar while installing */
              <div className="h-full w-full animate-pulse rounded-full bg-white/75" />
            ) : known ? (
              /* Deterministic fill */
              <div
                className="h-full rounded-full bg-white transition-[width] duration-300 ease-out"
                style={{
                  width: `${pct}%`,
                  boxShadow: "0 0 6px rgba(255,255,255,0.6)",
                }}
              />
            ) : (
              /* Indeterminate slide */
              <div
                className="h-full w-[35%] rounded-full bg-white/80"
                style={{ animation: "indeterminate 1.4s ease-in-out infinite" }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
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

  // Custom navigation events from child components
  useEffect(() => {
    const h = (e: Event) => setPage((e as CustomEvent<string>).detail);
    window.addEventListener("navigate", h);
    return () => window.removeEventListener("navigate", h);
  }, []);

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
        <UpdateBanner
          info={update}
          phase={updatePhase}
          done={dlDone}
          total={dlTotal}
          onManual={() => api.openReleasePage()}
        />
      )}
      <AppShell currentPage={page} onNavigate={setPage} user={user!} onLogout={handleLogout} version={version}>
        <PageContent page={page} />
      </AppShell>
    </div>
  );
}
