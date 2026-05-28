import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="AdOps Cockpit" className="h-7 w-7 object-contain rounded-lg" />
            <span className="text-sm font-semibold text-zinc-100">AdOps Cockpit</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{user.email}</span>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100">
                Выйти
              </button>
            </form>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
