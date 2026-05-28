import clsx from "clsx";

export function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={clsx("rounded-lg border border-stroke bg-card p-4 shadow-card", className)} style={style}>
      {children}
    </div>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      className={clsx(
        "inline-flex h-8 items-center justify-center gap-2 rounded px-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand text-brand-fg hover:bg-brand-dim",
        variant === "ghost"   && "border border-stroke bg-card text-ink hover:bg-raised",
        variant === "danger"  && "bg-danger text-white hover:opacity-90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-8 rounded border border-stroke bg-card px-3 text-[13px] text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="rounded border border-stroke bg-card px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand"
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="h-8 rounded border border-stroke bg-card px-3 text-[13px] text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "good"    && "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
        tone === "warn"    && "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20",
        tone === "bad"     && "bg-red-500/10 text-red-500 ring-1 ring-red-500/20",
        tone === "neutral" && "bg-raised text-muted ring-1 ring-stroke"
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status?: string | null): "good" | "warn" | "bad" | "neutral" {
  if (!status) return "neutral";
  if (["ACTIVE", "COMPLETED", "SUCCESS", "LOW", "READY"].includes(status)) return "good";
  if (["PAUSED", "LIMITED", "RUNNING", "NEEDS_ATTENTION", "MEDIUM"].includes(status)) return "warn";
  if (["DISABLED", "BILLING_ISSUE", "FAILED", "PARTIAL", "HIGH", "ERROR", "EXPIRED", "BLOCKED"].includes(status))
    return "bad";
  return "neutral";
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stroke bg-card">
      {children}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stroke bg-card p-10 text-center text-[13px] text-muted">
      {text}
    </div>
  );
}

export function NavLink({
  href,
  children,
  active,
  onClick,
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
        active
          ? "bg-selected text-brand"
          : "text-muted hover:bg-raised hover:text-ink"
      )}
    >
      {children}
    </a>
  );
}
