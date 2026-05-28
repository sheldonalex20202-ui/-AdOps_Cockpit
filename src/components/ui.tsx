import clsx from "clsx";
import Link from "next/link";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("rounded-lg border border-line bg-white p-4 shadow-cockpit", className)}>{children}</div>;
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
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "ghost" && "border border-line bg-white text-ink hover:bg-blue-50",
        variant === "danger" && "bg-brick text-white hover:bg-red-800",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" {...props} />;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-normal",
        tone === "good" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        tone === "warn" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        tone === "bad" && "bg-red-50 text-red-700 ring-1 ring-red-200",
        tone === "neutral" && "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status?: string | null): "good" | "warn" | "bad" | "neutral" {
  if (!status) return "neutral";
  if (["ACTIVE", "COMPLETED", "SUCCESS", "LOW"].includes(status)) return "good";
  if (["PAUSED", "LIMITED", "RUNNING", "QUEUED", "MEDIUM"].includes(status)) return "warn";
  if (["DISABLED", "BILLING_ISSUE", "REJECTED", "FAILED", "PARTIAL_FAILED", "HIGH", "ERROR", "EXPIRED"].includes(status)) return "bad";
  return "neutral";
}

export function Table({ children }: { children: React.ReactNode }) {
  return <div className="table-scroll overflow-x-auto rounded-lg border border-line bg-white">{children}</div>;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">{text}</div>;
}

export function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link className={clsx("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold", active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950")} href={href}>
      {children}
    </Link>
  );
}
