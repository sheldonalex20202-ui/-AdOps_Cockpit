import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { ShaderBackground } from "@/components/ShaderBackground";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-screen">
      <ShaderBackground />

      {/* Navbar */}
      <nav className="relative z-20 border-b border-white/8 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="AdOps Cockpit" className="h-7 w-7 object-contain rounded-lg" />
            <span className="text-sm font-semibold text-zinc-100">AdOps Cockpit</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{user.email}</span>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100">
                Выйти
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
