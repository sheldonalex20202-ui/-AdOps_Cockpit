import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CreditCard, Monitor, Apple, ArrowUpRight, LogOut, Sparkles, type LucideIcon } from "lucide-react";

const planMeta: Record<string, { label: string; color: string; desc: string }> = {
  free: { label: "Free",  color: "text-zinc-400",  desc: "Бесплатный тариф" },
  pro:  { label: "Pro",   color: "text-blue-400",  desc: "Полный доступ ко всем функциям" },
  team: { label: "Team",  color: "text-violet-400", desc: "Командная лицензия" },
};

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={[
      "backdrop-blur-[14px] bg-gradient-to-br rounded-2xl",
      "from-white/8 to-white/3 border border-white/10",
      "dark:from-white/10 dark:to-white/5 dark:border-white/10 dark:backdrop-brightness-[0.91]",
      "shadow-xl transition-all duration-300",
      className,
    ].join(" ")}>
      {children}
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
      <Icon size={12} />
      {label}
    </div>
  );
}

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  const plan = planMeta[dbUser.plan] ?? planMeta.free;
  const initial = dbUser.name.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen px-4 py-14">
      <div className="mx-auto max-w-md space-y-4">

        {/* Page title */}
        <h1 className="mb-6 text-[22px] font-extralight tracking-tight text-zinc-100">
          Мой аккаунт
        </h1>

        {/* ── Profile ── */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-semibold text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
              >
                {initial}
              </div>
              <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold text-zinc-100">{dbUser.name}</div>
              <div className="truncate text-[13px] text-zinc-400">{dbUser.email}</div>
              {dbUser.createdAt && (
                <div className="mt-1 text-[11px] text-zinc-600">
                  Участник с {new Date(dbUser.createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* ── Subscription ── */}
        <GlassCard className="p-5">
          <SectionLabel icon={CreditCard} label="Подписка" />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[18px] font-extralight text-zinc-100">Тариф</span>
                <span className={`text-[18px] font-semibold ${plan.color}`}>{plan.label}</span>
              </div>
              <div className="text-[12px] text-zinc-500">{plan.desc}</div>
              {dbUser.planExpiresAt && (
                <div className="mt-1.5 text-[11px] text-zinc-600">
                  Действует до {new Date(dbUser.planExpiresAt).toLocaleDateString("ru-RU")}
                </div>
              )}
            </div>

            {dbUser.plan === "free" ? (
              <Link
                href="/pricing"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500"
              >
                <Sparkles size={13} />
                Улучшить
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/6 px-3.5 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Управление
                <ArrowUpRight size={13} />
              </Link>
            )}
          </div>

          {/* Plan tier bar */}
          <div className="mt-4 flex items-center gap-1.5">
            {["free", "pro", "team"].map((p) => (
              <div
                key={p}
                className={[
                  "h-1 flex-1 rounded-full transition-all",
                  p === dbUser.plan
                    ? "bg-gradient-to-r from-blue-500 to-violet-500"
                    : dbUser.plan === "team" && p !== "team"
                    ? "bg-gradient-to-r from-blue-500 to-violet-500"
                    : dbUser.plan === "pro" && p === "free"
                    ? "bg-blue-500"
                    : "bg-white/8",
                ].join(" ")}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
            <span>Free</span><span>Pro</span><span>Team</span>
          </div>
        </GlassCard>

        {/* ── Desktop app ── */}
        <GlassCard className="p-5">
          <SectionLabel icon={Monitor} label="Десктопное приложение" />

          <p className="mb-4 text-[13px] text-zinc-400 leading-relaxed">
            Откройте AdOps Cockpit и нажмите «Войти» — браузер откроется автоматически.
          </p>

          <div className="flex gap-2">
            <a
              href="https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-windows-installer.exe"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[12px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-zinc-100"
            >
              <Monitor size={13} /> Windows
            </a>
            <a
              href="https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-macos-arm64.dmg"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[12px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-zinc-100"
            >
              <Apple size={13} /> macOS
            </a>
          </div>

          <div className="mt-3 rounded-lg bg-black/30 border border-white/6 px-3 py-2 font-mono text-[11px] text-zinc-500">
            AdOpsCockpit-windows-installer.exe
          </div>
        </GlassCard>

        {/* ── Logout ── */}
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 py-3 text-[13px] text-zinc-500 transition backdrop-blur-[14px] hover:border-white/14 hover:bg-white/8 hover:text-zinc-300"
          >
            <LogOut size={14} />
            Выйти из аккаунта
          </button>
        </form>

      </div>
    </main>
  );
}
