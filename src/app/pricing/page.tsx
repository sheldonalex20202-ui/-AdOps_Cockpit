import Link from "next/link";
import { Check } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { normalizeReturnTo, planLabels } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "навсегда",
    description: "Для знакомства с инструментом",
    features: ["До 5 рекламных кабинетов", "До 3 запусков в месяц", "Базовые health-checks", "Аудит-лог (7 дней)"],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "49",
    period: "в месяц",
    description: "Для активных медиабаеров",
    features: [
      "Неограниченно кабинетов",
      "Неограниченно запусков",
      "Расширенные health-checks",
      "Аудит-лог (90 дней)",
      "Пулы кабинетов",
      "Keitaro интеграция",
      "Приоритетная поддержка",
    ],
    highlight: true,
  },
  {
    id: "team",
    name: "Team",
    price: "149",
    period: "в месяц",
    description: "Для команд и агентств",
    features: ["Всё из Pro", "До 5 пользователей", "Общие пулы кабинетов", "Аудит-лог (365 дней)", "API доступ"],
    highlight: false,
  },
];

interface Props {
  searchParams?: Promise<{ returnTo?: string }>;
}

export default async function PricingPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const returnTo = normalizeReturnTo(params.returnTo ?? null);
  const sessionUser = await getCurrentUser();
  const user = sessionUser ? await prisma.user.findUnique({ where: { id: sessionUser.id } }) : null;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <Link href={user ? "/me" : "/"} className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-400">
            ← {user ? "Аккаунт" : "Главная"}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-zinc-100">Подписка AdOps Cockpit</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Подписка привязана к аккаунту и автоматически применяется в desktop-приложении после входа.
          </p>
          {user && (
            <div className="mx-auto mt-5 max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left">
              <div className="text-sm font-semibold text-zinc-100">{user.name}</div>
              <div className="text-xs text-zinc-500">{user.email}</div>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 text-sm">
                <span className="text-zinc-500">Текущий тариф</span>
                <span className={user.plan === "free" ? "font-semibold text-zinc-400" : "font-semibold text-blue-400"}>
                  {planLabels[user.plan]}
                </span>
              </div>
              {user.planExpiresAt && (
                <div className="mt-1 text-xs text-zinc-500">
                  Действует до {new Date(user.planExpiresAt).toLocaleDateString("ru-RU")}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.highlight ? "border-blue-500 bg-zinc-900 shadow-[0_0_30px_rgba(59,130,246,0.15)]" : "border-zinc-800 bg-zinc-900"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white">Популярный</span>
                </div>
              )}

              <div className="mb-4">
                <div className="text-sm font-semibold text-zinc-400">{plan.name}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-100">${plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">{plan.description}</p>
              </div>

              <ul className="mb-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>

              <PlanAction plan={plan.id} currentPlan={user?.plan ?? "free"} isLoggedIn={Boolean(user)} returnTo={returnTo} />
            </div>
          ))}
        </div>

        {user?.stripeCustomerId && (
          <form action="/api/billing/portal" method="post" className="mt-6 text-center">
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="text-sm font-semibold text-blue-400 hover:text-blue-300">
              Открыть управление платежами Stripe
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function PlanAction({
  plan,
  currentPlan,
  isLoggedIn,
  returnTo,
}: {
  plan: string;
  currentPlan: string;
  isLoggedIn: boolean;
  returnTo: string;
}) {
  const baseClass = "block w-full rounded-lg py-2 text-center text-sm font-semibold transition";

  if (!isLoggedIn) {
    return (
      <Link href={`/register?plan=${plan === "free" ? "" : plan}`} className={`${baseClass} border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100`}>
        {plan === "free" ? "Начать бесплатно" : "Зарегистрироваться"}
      </Link>
    );
  }

  if (plan === currentPlan) {
    return (
      <button disabled className={`${baseClass} cursor-default border border-zinc-800 text-zinc-500`}>
        Текущий тариф
      </button>
    );
  }

  if (plan === "free") {
    return (
      <Link href="/me" className={`${baseClass} border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100`}>
        Бесплатный тариф
      </Link>
    );
  }

  return (
    <form action="/api/billing/checkout" method="post">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className={`${baseClass} bg-blue-600 text-white hover:bg-blue-500`}>
        {currentPlan === "free" ? `Оплатить ${planLabels[plan as "pro" | "team"]}` : `Перейти на ${planLabels[plan as "pro" | "team"]}`}
      </button>
    </form>
  );
}
