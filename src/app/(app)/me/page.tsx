import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CreditCard, MonitorSmartphone, LogOut } from "lucide-react";

const planLabels: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="mb-6 text-lg font-semibold text-zinc-100">Мой аккаунт</h1>

        {/* Profile */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {dbUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-zinc-100">{dbUser.name}</div>
              <div className="text-sm text-zinc-400">{dbUser.email}</div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <CreditCard size={13} />
            Подписка
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-zinc-100">
                Тариф{" "}
                <span className={dbUser.plan === "free" ? "text-zinc-400" : "text-blue-400"}>
                  {planLabels[dbUser.plan] ?? dbUser.plan}
                </span>
              </div>
              {dbUser.planExpiresAt && (
                <div className="mt-0.5 text-xs text-zinc-500">
                  Действует до {new Date(dbUser.planExpiresAt).toLocaleDateString("ru-RU")}
                </div>
              )}
              {dbUser.plan === "free" && (
                <div className="mt-0.5 text-xs text-zinc-500">Бесплатный тариф</div>
              )}
            </div>
            <Link
              href="/pricing"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            >
              {dbUser.plan === "free" ? "Улучшить" : "Управление"}
            </Link>
          </div>
        </div>

        {/* Desktop app */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <MonitorSmartphone size={13} />
            Десктопное приложение
          </div>
          <p className="mb-3 text-sm text-zinc-400">
            Откройте AdOps Cockpit и нажмите «Войти» — браузер откроется автоматически.
          </p>
          <div className="rounded-lg bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-400">
            adops-desktop.exe
          </div>
        </div>

        {/* Logout */}
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 py-2.5 text-sm text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
          >
            <LogOut size={14} />
            Выйти
          </button>
        </form>
      </div>
    </main>
  );
}
