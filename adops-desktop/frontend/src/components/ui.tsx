import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

/* ─────────────────────── primitives ───────────────────────── */

export function Card({
  children, className, style, padding = "md",
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-stroke bg-card",
        padding === "none" && "",
        padding === "sm"   && "p-3",
        padding === "md"   && "p-4",
        padding === "lg"   && "p-6",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function Button({
  children, className, variant = "primary", size = "md", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40 select-none",
        size === "sm" && "h-7 px-2.5 text-[12px]",
        size === "md" && "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-brand text-brand-fg hover:bg-brand-dim",
        variant === "ghost"   && "border border-stroke bg-transparent text-ink hover:bg-raised",
        variant === "danger"  && "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
        variant === "success" && "bg-success/10 text-success border border-success/20 hover:bg-success/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  const { className, ...rest } = props;
  return (
    <input
      className={clsx(
        "h-8 w-full rounded border border-stroke bg-card px-2.5 text-[13px] text-ink",
        "outline-none placeholder:text-subtle",
        "focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors",
        className
      )}
      {...rest}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full rounded border border-stroke bg-card px-2.5 py-2 text-[13px] text-ink outline-none placeholder:text-subtle focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors resize-none"
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="h-8 rounded border border-stroke bg-card px-2.5 text-[13px] text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
      {...props}
    />
  );
}

/* ─────────────────────── badge / status ───────────────────── */

type Tone = "good" | "warn" | "bad" | "neutral" | "info";

export function Badge({
  children, tone = "neutral", dot = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
        tone === "good"    && "bg-success/10 text-success ring-1 ring-success/20",
        tone === "warn"    && "bg-warn/10    text-warn    ring-1 ring-warn/20",
        tone === "bad"     && "bg-danger/10  text-danger  ring-1 ring-danger/20",
        tone === "neutral" && "bg-raised     text-muted   ring-1 ring-stroke",
        tone === "info"    && "bg-info/10    text-info    ring-1 ring-info/20",
      )}
    >
      {dot && (
        <span
          className={clsx(
            "h-1.5 w-1.5 rounded-full shrink-0",
            tone === "good"    && "bg-success",
            tone === "warn"    && "bg-warn",
            tone === "bad"     && "bg-danger",
            tone === "neutral" && "bg-muted",
            tone === "info"    && "bg-info",
          )}
        />
      )}
      {children}
    </span>
  );
}

export function statusTone(status?: string | null): Tone {
  if (!status) return "neutral";
  if (["ACTIVE", "COMPLETED", "SUCCESS", "LOW", "READY", "OK"].includes(status)) return "good";
  if (["PAUSED", "LIMITED", "RUNNING", "NEEDS_ATTENTION", "MEDIUM", "PENDING"].includes(status)) return "warn";
  if (["DISABLED", "BILLING_ISSUE", "FAILED", "PARTIAL", "HIGH", "ERROR", "EXPIRED", "BLOCKED", "ISSUE"].includes(status)) return "bad";
  return "neutral";
}

/* ─────────────────────── score bar ────────────────────────── */

export function ScoreBar({ score }: { score: number }) {
  const clr =
    score >= 80 ? "bg-success"
    : score >= 50 ? "bg-warn"
    : "bg-danger";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-raised overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all", clr)}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span
        className={clsx(
          "text-[12px] font-semibold tabular-nums w-7 text-right",
          score >= 80 ? "text-success" : score >= 50 ? "text-warn" : "text-danger"
        )}
      >
        {score}
      </span>
    </div>
  );
}

/* ─────────────────────── table ─────────────────────────────── */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stroke bg-card">
      <table className="w-full text-left">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={clsx(
      "border-b border-stroke bg-raised/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted whitespace-nowrap",
      className
    )}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={clsx("px-3 py-2 text-[13px]", className)}>
      {children}
    </td>
  );
}

export function Tr({
  children, onClick, selected, className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        "border-b border-stroke/60 transition-colors",
        onClick && "cursor-pointer",
        selected ? "bg-selected" : "hover:bg-raised/50",
        className
      )}
    >
      {children}
    </tr>
  );
}

/* ─────────────────────── page header ──────────────────────── */

export function PageHeader({
  title, subtitle, icon: Icon, actions, stats,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  stats?: { label: string; value: string | number; tone?: Tone }[];
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon size={16} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[18px] font-bold text-ink tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
          {stats && stats.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {stats.map((s) => (
                <span key={s.label} className="flex items-center gap-1 text-[12px]">
                  <span
                    className={clsx(
                      "font-semibold",
                      s.tone === "good"    && "text-success",
                      s.tone === "bad"     && "text-danger",
                      s.tone === "warn"    && "text-warn",
                      !s.tone              && "text-ink"
                    )}
                  >
                    {s.value}
                  </span>
                  <span className="text-muted">{s.label}</span>
                  <span className="text-stroke last:hidden">·</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─────────────────────── filter row ───────────────────────── */

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      {children}
    </div>
  );
}

/* ─────────────────────── empty / loading ──────────────────── */

export function Empty({
  text, icon: Icon,
}: {
  text: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stroke bg-card py-16 text-center">
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-raised text-muted">
          <Icon size={18} />
        </div>
      )}
      <p className="text-[13px] text-muted max-w-sm">{text}</p>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "h-4 w-4 rounded-full border-2 border-stroke border-t-brand animate-spin",
        className
      )}
    />
  );
}

export function Loading({ text = "Загрузка..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-muted text-[13px]">
      <Spinner />
      {text}
    </div>
  );
}

/* ─────────────────────── misc ──────────────────────────────── */

export function Divider({ className }: { className?: string }) {
  return <div className={clsx("h-px bg-stroke", className)} />;
}

export function NavLink({
  href, children, active, onClick,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors select-none cursor-pointer",
        active ? "bg-selected text-brand" : "text-muted hover:bg-raised hover:text-ink"
      )}
    >
      {children}
    </a>
  );
}
