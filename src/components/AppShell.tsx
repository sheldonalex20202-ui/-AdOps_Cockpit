import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NavClient } from "./NavClient";

const nav = [
  { href: "/launch", label: "Автозалив", icon: "launch" },
  { href: "/creatives", label: "Креативы", icon: "creatives" },
  { href: "/accounts", label: "Мои кабинеты", icon: "accounts" },
  { href: "/account-pools", label: "Пулы", icon: "pools" },
  { href: "/health-checks", label: "Health checks", icon: "health" },
  { href: "/audit-logs", label: "Аудит", icon: "audit" },
  { href: "/integrations", label: "Интеграции", icon: "integrations" }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-white p-4 lg:block">
        <div className="mb-6 px-2">
          <div className="text-lg font-black text-slate-950">AdOps Cockpit</div>
          <div className="text-xs text-slate-500">личная база Meta кабинетов</div>
        </div>
        <NavClient nav={nav} />
      </aside>
      <div className="min-w-0 flex-1 lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:px-8">
          <div>
            <div className="text-sm font-black">Личный кабинет</div>
            <div className="text-xs text-slate-500">управление большим количеством рекламных кабинетов</div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-sm font-bold">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Выйти</button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
