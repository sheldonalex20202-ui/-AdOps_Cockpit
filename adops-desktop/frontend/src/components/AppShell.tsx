import { useState } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import clsx from "clsx";
import {
  Activity, BriefcaseBusiness, FileClock, History, Image,
  Layers3, Rocket, Settings, LogOut, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import logoImg from "../assets/images/logo.png";

/* ── nav items ─────────────────────────────────────────── */
const icons: Record<string, LucideIcon> = {
  launch:       Rocket,
  history:      History,
  creatives:    Image,
  accounts:     BriefcaseBusiness,
  pools:        Layers3,
  health:       Activity,
  audit:        FileClock,
  integrations: Settings,
};

const nav = [
  { page: "launch",         label: "Автозалив",      icon: "launch" },
  { page: "launch-history", label: "История залива",  icon: "history" },
  { page: "creatives",      label: "Креативы",        icon: "creatives" },
  { page: "accounts",       label: "Мои кабинеты",   icon: "accounts" },
  { page: "account-pools",  label: "Пулы",            icon: "pools" },
  { page: "health-checks",  label: "Health checks",   icon: "health" },
  { page: "audit-logs",     label: "Аудит",           icon: "audit" },
  { page: "integrations",   label: "Интеграции",      icon: "integrations" },
];

/* ── framer variants ───────────────────────────────────── */
const sidebarVariants = {
  open:   { width: "14rem" },
  closed: { width: "3.25rem" },
};

const labelVariants = {
  open:   { opacity: 1, x: 0,   display: "block" },
  closed: { opacity: 0, x: -6,  transitionEnd: { display: "none" } },
};

const transition: Transition = { type: "tween", ease: "easeOut", duration: 0.18 };

/* ── component ─────────────────────────────────────────── */
interface Props {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  user: { name: string; email: string };
  onLogout: () => void;
  version?: string;
}

export function AppShell({ children, currentPage, onNavigate, user, onLogout, version }: Props) {
  const [open, setOpen] = useState(false);
  const state = open ? "open" : "closed";

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-ink font-sans">

      {/* ── Animated Sidebar ── */}
      <motion.aside
        initial="closed"
        animate={state}
        variants={sidebarVariants}
        transition={transition}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="relative z-30 flex shrink-0 flex-col border-r border-stroke bg-panel overflow-hidden"
      >

        {/* Brand header */}
        <div className="flex h-11 shrink-0 items-center border-b border-stroke px-3 gap-2.5 overflow-hidden">
          <img src={logoImg} alt="" className="h-5 w-5 shrink-0 object-contain" />
          <motion.div
            variants={labelVariants}
            transition={transition}
            className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap min-w-0"
          >
            <span className="text-[13px] font-semibold text-ink">AdOps Cockpit</span>
            {version && <span className="text-[10px] text-muted ml-auto">{version}</span>}
          </motion.div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 space-y-0.5">
          {nav.map((item) => {
            const Icon = icons[item.icon] ?? BriefcaseBusiness;
            const active = currentPage === item.page || currentPage.startsWith(item.page + "/");
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                title={!open ? item.label : undefined}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded px-2 py-[7px] text-left transition-colors select-none",
                  active
                    ? "bg-selected text-brand"
                    : "text-muted hover:bg-raised hover:text-ink"
                )}
              >
                <Icon
                  size={15}
                  className={clsx("shrink-0", active ? "text-brand" : "text-muted")}
                />
                <motion.span
                  variants={labelVariants}
                  transition={transition}
                  className="text-[13px] font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-stroke px-1.5 py-2">

          {/* Expanded: full row with logout */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex items-center gap-2 rounded px-2 py-1.5"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-fg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate text-[12px] font-medium text-ink">{user.name}</div>
                  <div className="truncate text-[10px] text-muted">{user.email}</div>
                </div>
                <button
                  onClick={onLogout}
                  title="Выйти"
                  className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-raised hover:text-ink"
                >
                  <LogOut size={13} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed: just avatar */}
          <AnimatePresence>
            {!open && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                onClick={onLogout}
                title={`${user.name} · Выйти`}
                className="flex w-full items-center justify-center rounded py-1.5 text-muted hover:bg-raised hover:text-ink transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-fg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Expand hint arrow */}
        <motion.div
          animate={{ opacity: open ? 0 : 0.3, rotate: open ? 180 : 0 }}
          transition={transition}
          className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2"
        >
          <ChevronRight size={12} className="text-muted" />
        </motion.div>
      </motion.aside>

      {/* ── Content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
