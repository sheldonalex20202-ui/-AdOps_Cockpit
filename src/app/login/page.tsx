"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { MonitorSmartphone } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = searchParams.get("callback") ?? "";
  const state = searchParams.get("state") ?? "";
  const isDesktop = Boolean(callback);
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(oauthError === "oauth_failed" ? "Ошибка OAuth авторизации. Попробуйте снова." : "");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Неверный email или пароль");
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

    const callbackUrl = new URL("/api/auth/callback", window.location.origin);
    if (callback) callbackUrl.searchParams.set("desktop_callback", callback);
    if (state) callbackUrl.searchParams.set("desktop_state", state);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  const anyLoading = loading || oauthLoading !== null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-sm font-bold text-white">AO</span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">AdOps Cockpit</h1>
          {isDesktop && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
              <MonitorSmartphone size={12} />
              Авторизация для десктопного приложения
            </div>
          )}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-5 text-sm font-semibold text-zinc-300">Войдите в аккаунт</h2>

          {/* Social buttons */}
          <div className="mb-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => signInWithOAuth("google")}
              disabled={anyLoading}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GoogleIcon />
              {oauthLoading === "google" ? "Перенаправляем…" : "Войти через Google"}
            </button>
            <button
              type="button"
              onClick={() => signInWithOAuth("apple")}
              disabled={anyLoading}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AppleIcon />
              {oauthLoading === "apple" ? "Перенаправляем…" : "Войти через Apple"}
            </button>
          </div>

          {/* Divider */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">или</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={anyLoading}
              className="h-9 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Входим…" : "Войти"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Нет аккаунта?{" "}
            <Link
              href={`/register${callback ? `?callback=${encodeURIComponent(callback)}${state ? `&state=${encodeURIComponent(state)}` : ""}` : ""}`}
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
