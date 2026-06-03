import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { normalizeReturnTo, planLabels } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { PricingCard, PricingLayout } from "@/components/ui/animated-glassy-pricing";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "навсегда",
    description: "Для знакомства с инструментом",
    features: [
      "До 5 рекламных кабинетов",
      "До 3 запусков в месяц",
      "Базовые health-checks",
      "Аудит-лог (7 дней)",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "49",
    period: "/мес",
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
    period: "/мес",
    description: "Для команд и агентств",
    features: [
      "Всё из Pro",
      "До 5 пользователей",
      "Общие пулы кабинетов",
      "Аудит-лог (365 дней)",
      "API доступ",
    ],
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
  const user = sessionUser
    ? await prisma.user.findUnique({ where: { id: sessionUser.id } })
    : null;

  const userBlock = user ? (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-5 py-4 text-left max-w-sm w-full">
      <div className="text-[13px] font-semibold text-zinc-100">{user.name}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{user.email}</div>
      <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
        <span className="text-[12px] text-zinc-500">Текущий тариф</span>
        <span className={`text-[12px] font-semibold ${user.plan === "free" ? "text-zinc-400" : "text-blue-400"}`}>
          {planLabels[user.plan]}
        </span>
      </div>
      {user.planExpiresAt && (
        <div className="mt-1 text-[11px] text-zinc-600">
          Действует до {new Date(user.planExpiresAt).toLocaleDateString("ru-RU")}
        </div>
      )}
    </div>
  ) : null;

  const cards = plans.map((plan) => (
    <PricingCard
      key={plan.id}
      planName={plan.name}
      description={plan.description}
      price={plan.price}
      period={plan.period}
      features={plan.features}
      isPopular={plan.highlight}
      action={
        <PlanAction
          plan={plan.id}
          currentPlan={user?.plan ?? "free"}
          isLoggedIn={Boolean(user)}
          returnTo={returnTo}
        />
      }
    />
  ));

  const footer = (
    <>
      {user?.stripeCustomerId && (
        <form action="/api/billing/portal" method="post">
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className="text-[13px] font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            Открыть управление платежами Stripe →
          </button>
        </form>
      )}
      <div className="mt-4">
        <Link href={user ? "/me" : "/"} className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors">
          ← {user ? "Аккаунт" : "На главную"}
        </Link>
      </div>
    </>
  );

  return (
    <PricingLayout
      title={<>Тарифы AdOps Cockpit</>}
      subtitle="Подписка привязана к аккаунту и применяется в desktop-приложении после входа"
      userBlock={userBlock}
      cards={cards}
      footer={footer}
    />
  );
}

/* ── server-rendered action (standard HTML forms) ─────── */
function PlanAction({
  plan, currentPlan, isLoggedIn, returnTo,
}: {
  plan: string; currentPlan: string; isLoggedIn: boolean; returnTo: string;
}) {
  const base =
    "block w-full rounded-xl py-2.5 text-center text-[14px] font-semibold transition-all";

  if (!isLoggedIn) {
    return (
      <Link
        href={`/register?plan=${plan === "free" ? "" : plan}`}
        className={`${base} bg-white/8 text-zinc-200 border border-white/12 hover:bg-white/14`}
      >
        {plan === "free" ? "Начать бесплатно" : "Зарегистрироваться"}
      </Link>
    );
  }

  if (plan === currentPlan) {
    return (
      <button disabled className={`${base} bg-white/5 text-zinc-500 border border-white/8 cursor-default`}>
        Текущий тариф
      </button>
    );
  }

  if (plan === "free") {
    return (
      <Link href="/me" className={`${base} bg-white/8 text-zinc-200 border border-white/12 hover:bg-white/14`}>
        Бесплатный тариф
      </Link>
    );
  }

  return (
    <form action="/api/billing/checkout" method="post">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className={`${base} bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30`}
      >
        {currentPlan === "free"
          ? `Оплатить ${planLabels[plan as "pro" | "team"]}`
          : `Перейти на ${planLabels[plan as "pro" | "team"]}`}
      </button>
    </form>
  );
}
