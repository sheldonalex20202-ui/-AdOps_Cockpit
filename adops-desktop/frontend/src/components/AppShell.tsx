"use client";

import { LogOut } from "lucide-react";
import { NavClient } from "./NavClient";
import logoImg from "../assets/images/logo.png";

const nav = [
  { page: "launch",        label: "Автозалив",    icon: "launch" },
  { page: "creatives",     label: "Креативы",      icon: "creatives" },
  { page: "accounts",      label: "Мои кабинеты", icon: "accounts" },
  { page: "account-pools", label: "Пулы",          icon: "pools" },
  { page: "health-checks", label: "Health checks", icon: "health" },
  { page: "audit-logs",    label: "Аудит",         icon: "audit" },
  { page: "integrations",  label: "Интеграции",    icon: "integrations" },
];

interface Props {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  user: { name: string; email: string };
  onLogout: () => void;
}

export function AppShell({ children, currentPage, onNavigate, user, onLogout }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface text-ink font-sans">
      {/* ── Sidebar ── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-stroke bg-panel">
        {/* Brand */}
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-stroke px-4">
          <img src={logoImg} alt="AdOps Cockpit" className="h-5 w-5 object-contain shrink-0" />
          <span className="text-[13px] font-semibold text-ink">AdOps Cockpit</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <NavClient nav={nav} currentPage={currentPage} onNavigate={onNavigate} />
        </nav>

        {/* User footer */}
        <div className="flex shrink-0 items-center gap-2 border-t border-stroke px-3 py-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-fg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-ink">{user.name}</div>
            <div className="truncate text-[11px] text-muted">{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            title="Выйти"
            className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <LogOut size={13} />
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
