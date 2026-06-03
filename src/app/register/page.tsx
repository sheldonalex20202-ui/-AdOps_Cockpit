"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Eye, EyeOff, MonitorSmartphone } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ShaderBackground } from "@/components/ShaderBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = searchParams.get("callback") ?? "";
  const state = searchParams.get("state") ?? "";
  const isDesktop = Boolean(callback);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  const anyLoading = loading || oauthLoading !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Минимум 8 символов"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Ошибка при создании аккаунта");
      setLoading(false);
      return;
    }
    if (callback) {
      router.push(`/desktop-callback?callback=${encodeURIComponent(callback)}${state ? `&state=${encodeURIComponent(state)}` : ""}`);
    } else {
      router.push("/me");
    }
  }

  async function signInWithOAuth(provider: "google" | "apple") {
    setOauthLoading(provider);
    setError("");
    const cbUrl = new URL("/api/auth/callback", window.location.origin);
    if (callback) cbUrl.searchParams.set("desktop_callback", callback);
    if (state) cbUrl.searchParams.set("desktop_state", state);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: cbUrl.toString(), queryParams: { prompt: "select_account" } },
    });
    if (error) { setError(error.message); setOauthLoading(null); }
  }

  const loginHref = `/login${callback ? `?callback=${encodeURIComponent(callback)}${state ? `&state=${encodeURIComponent(state)}` : ""}` : ""}`;

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <ShaderBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {isDesktop && (
            <div className="absolute -top-3 right-8 flex items-center gap-1.5 px-4 py-1 text-xs font-semibold rounded-full bg-blue-500 text-white">
              <MonitorSmartphone size={12} />
              Десктоп версия
            </div>
          )}

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              <span className="text-white text-2xl font-bold">AO</span>
            </div>
            <h1 className="text-2xl font-bold text-white">AdOps Cockpit</h1>
          </div>

          {/* OAuth */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => signInWithOAuth("google")}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors border border-white/10 disabled:opacity-50"
            >
              <GoogleIcon />
              <span className="font-medium text-sm">
                {oauthLoading === "google" ? "Перенаправляем…" : "Продолжить через Google"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => signInWithOAuth("apple")}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors border border-white/10 disabled:opacity-50"
            >
              <AppleIcon />
              <span className="font-medium text-sm">
                {oauthLoading === "apple" ? "Перенаправляем…" : "Продолжить через Apple"}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/60 text-sm">или</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-2 block">Имя</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl px-4"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="mb-2 block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl px-4"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="мин. 8 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl px-4 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {showPassword
                    ? <EyeOff className="w-5 h-5 text-white/60" />
                    : <Eye className="w-5 h-5 text-white/60" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={anyLoading}
              className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm"
            >
              {loading ? "Создаём…" : "Создать аккаунт"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <span className="text-white/60 text-sm">
              Уже есть аккаунт?{" "}
              <Link href={loginHref} className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
                Войти
              </Link>
            </span>
          </div>

          <p className="mt-4 text-center text-xs text-white/30">
            Создавая аккаунт, вы соглашаетесь с{" "}
            <Link href="/terms" className="hover:text-white/50 transition-colors">условиями</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
