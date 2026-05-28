"use client";

import { useEffect, useState } from "react";
import { CheckCircle, CreditCard, MonitorSmartphone } from "lucide-react";

interface Props {
  redirectUrl: string | null;
  error: string | null;
  account?: {
    name: string;
    email: string;
    plan: string;
    planLabel: string;
    planExpiresAt: string | null;
    pricingHref: string;
    portalEnabled: boolean;
  };
}

export function RedirectClient({ redirectUrl, error, account }: Props) {
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    if (!redirectUrl || notified) return;
    setNotified(true);

    fetch(redirectUrl, { mode: "no-cors", cache: "no-store" }).catch(() => {
      const img = new Image();
      img.src = redirectUrl;
    });
  }, [redirectUrl, notified]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center">
        <div className="rounded-full bg-red-500/10 p-4 text-red-400">
          <MonitorSmartphone size={32} />
        </div>
        <h1 className="text-xl font-semibold text-zinc-100">Ошибка авторизации</h1>
        <p className="max-w-sm text-sm text-zinc-400">{error}</p>
        <a href="/login" className="mt-2 text-sm font-medium text-blue-400 hover:text-blue-300">
          Попробовать снова
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <CheckCircle size={34} />
        </div>
        <h1 className="text-xl font-semibold text-zinc-100">Авторизация успешна</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Проверьте аккаунт и вернитесь в приложение, когда будете готовы.
        </p>

        {account && (
          <div className="mt-5 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-left">
            <div>
              <div className="text-sm font-semibold text-zinc-100">{account.name}</div>
              <div className="text-xs text-zinc-500">{account.email}</div>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
                <CreditCard size={13} />
                Подписка
              </div>
              <div className={account.plan === "free" ? "text-sm font-semibold text-zinc-400" : "text-sm font-semibold text-blue-400"}>
                {account.planLabel}
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              {account.planExpiresAt
                ? `Действует до ${new Date(account.planExpiresAt).toLocaleDateString("ru-RU")}`
                : "Бесплатный тариф"}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-2">
          {redirectUrl && (
            <a
              href={redirectUrl}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              {notified ? "Открыть приложение" : "Вернуться в приложение"}
            </a>
          )}
          {account && (
            <a
              href={account.pricingHref}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              {account.plan === "free" ? "Оплатить подписку" : "Продлить или управлять подпиской"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
