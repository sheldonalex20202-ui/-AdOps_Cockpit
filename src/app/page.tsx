import Link from "next/link";
import { Monitor, Apple, ArrowRight, Clock, Zap, Shield, Layers, BarChart3, AlertTriangle, XCircle, Timer, TrendingUp } from "lucide-react";
import { HeroBackground } from "@/components/HeroBackground";
import { AnimatedStats } from "@/components/AnimatedStats";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { AppMockup } from "@/components/AppMockup";
import MinimalHero from "@/components/ui/minimal-hero";

const painPoints = [
  { icon: Clock,         title: "6 часов ручного залива",    desc: "Открываешь каждый кабинет по одному, настраиваешь вручную, ошибаешься, переделываешь." },
  { icon: AlertTriangle, title: "Кабинеты падают незаметно", desc: "Бан, израсходованный биллинг, просроченный токен — узнаёшь только когда бюджет уже слит." },
  { icon: XCircle,       title: "Хаос в таблицах",           desc: "Аккаунты, статусы, крео — всё разбросано по Excel, Notion и ОЗУ твоей головы." },
  { icon: Timer,         title: "Масштаб убивает скорость",  desc: "10 кабинетов — терпимо. 50 — уже невозможно. Рост стопорится из-за инструментов." },
];

const features = [
  { icon: Zap,      color: "blue",   title: "Массовый автозалив",       desc: "Запускай кампании на 50+ кабинетах за 15 минут. CBO, ABO, Isolation, Z-Group — любая структура одним кликом." },
  { icon: Shield,   color: "violet", title: "Health Check кабинетов",    desc: "Readiness score 0–100. Токен, биллинг, лимиты, статус — проверяются автоматически перед каждым заливом." },
  { icon: Layers,   color: "indigo", title: "Пулы и портфели",           desc: "Группируй кабинеты по проектам, гео, командам. Запускай залив по пулу за секунды." },
  { icon: BarChart3, color: "purple", title: "История и аналитика",      desc: "Все запуски с детализацией по кабинетам, процент успеха, быстрый re-launch одной кнопкой." },
];

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  blue:   { bg: "bg-blue-500/10",   text: "text-blue-400",   ring: "ring-blue-500/20" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", ring: "ring-violet-500/20" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", ring: "ring-indigo-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", ring: "ring-purple-500/20" },
};

const steps = [
  { num: "01", title: "Скачай приложение",   desc: "Установи AdOps Cockpit на Windows или macOS. Занимает меньше минуты." },
  { num: "02", title: "Добавь кабинеты",     desc: "Импортируй аккаунты, запусти Health Check — инструмент сам покажет кто готов к заливу." },
  { num: "03", title: "Запускай и зарабатывай", desc: "Настрой кампанию один раз → примени к 50 кабинетам → иди пить кофе." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="AdOps Cockpit" className="h-7 w-7 object-contain rounded-lg" />
            <span className="text-sm font-semibold">AdOps Cockpit</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              Тарифы
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              Войти
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden pt-14">
        <HeroBackground />
        <div className="hero-gradient-overlay absolute inset-0 pointer-events-none" />

        <MinimalHero
          badge="Инструмент №1 для медиабаера"
          title={
            <>
              Залив 50+ кабинетов{" "}
              <br />
              <span className="gradient-text">за 15 минут</span>
            </>
          }
          description="Тратишь 6 часов на ручной залив? С AdOps Cockpit это займёт 15 минут. Автоматизируй рутину — масштабируй доход. Купил подписку — увеличил доход в 2 раза."
          primaryButton={{
            label: "⬇ Скачать для Windows",
            href: "https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-windows-installer.exe",
          }}
          secondaryButton={{
            label: " Скачать для macOS",
            href: "https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-macos-arm64.dmg",
          }}
          stats={[
            { value: "90%",   label: "экономия времени" },
            { value: "50+",   label: "кабинетов сразу" },
            { value: "15 мин", label: "на запуск" },
            { value: "2×",    label: "рост дохода" },
          ]}
          accentColor="#3b82f6"
        />

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce pointer-events-none">
          <div className="h-6 w-px bg-gradient-to-b from-transparent to-zinc-600 rounded" />
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────── */}
      <AnimatedStats />

      {/* ── App preview scroll ─────────────────────────── */}
      <section className="bg-zinc-950">
        <ContainerScroll
          titleComponent={
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400/80">
                Интерфейс
              </p>
              <h2 className="text-3xl font-black text-zinc-100 sm:text-5xl leading-tight">
                Всё управление кабинетами —{" "}
                <span className="gradient-text">в одном экране</span>
              </h2>
              <p className="mt-4 text-zinc-500 text-base max-w-xl mx-auto">
                Аккаунты, health scores, статусы, пулы и запуск залива — без таблиц, без хаоса.
              </p>
            </div>
          }
        >
          <AppMockup />
        </ContainerScroll>
      </section>

      {/* ── Pain section ───────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-28">
        <div className="mb-14 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-400/80">Проблема</div>
          <h2 className="text-3xl font-bold text-zinc-100">
            Ручной залив — это{" "}
            <span style={{ background: "linear-gradient(135deg, #f87171, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              потери денег и времени
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-md mx-auto">
            Пока конкуренты масштабируются, ты теряешь часы на то, что можно автоматизировать.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {painPoints.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="card-glass rounded-xl p-6"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20 text-red-400">
                <Icon size={17} />
              </div>
              <h3 className="mb-1.5 font-semibold text-zinc-100">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 bg-gradient-to-b from-zinc-900/40 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-28">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400/80">Решение</div>
            <h2 className="text-3xl font-bold text-zinc-100">
              AdOps Cockpit — это{" "}
              <span className="gradient-text">рычаг для масштаба</span>
            </h2>
            <p className="mt-3 text-zinc-500 max-w-md mx-auto">
              Один инструмент заменяет десятки часов ручной работы в неделю.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, color, title, desc }) => {
              const c = colorMap[color];
              return (
                <div key={title} className="card-glass rounded-xl p-6">
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${c.bg} ring-1 ${c.ring} ${c.text}`}>
                    <Icon size={17} />
                  </div>
                  <h3 className="mb-1.5 font-semibold text-zinc-100">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ROI callout ────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-8 pb-28">
        <div
          className="rounded-2xl p-px"
          style={{ background: "linear-gradient(135deg, rgba(96,165,250,.3), rgba(167,139,250,.3))" }}
        >
          <div className="rounded-2xl bg-zinc-950 px-8 py-10 text-center">
            <TrendingUp className="mx-auto mb-4 text-violet-400" size={36} />
            <h3 className="mb-3 text-2xl font-bold text-zinc-100">
              Ты платишь $49/мес — зарабатываешь в{" "}
              <span className="gradient-text">2× больше</span>
            </h3>
            <p className="mx-auto max-w-xl text-zinc-400 text-sm leading-relaxed">
              Сэкономленные 30+ часов в месяц — это дополнительные запуски, больше кабинетов в обороте
              и голова, свободная для стратегии. Инструмент окупается за первый день.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <div className="text-center">
                <div className="text-3xl font-black text-zinc-100">30+</div>
                <div className="text-xs text-zinc-500 mt-0.5">часов в месяц</div>
              </div>
              <div className="h-10 w-px bg-zinc-800" />
              <div className="text-center">
                <div className="text-3xl font-black text-zinc-100">2×</div>
                <div className="text-xs text-zinc-500 mt-0.5">больше запусков</div>
              </div>
              <div className="h-10 w-px bg-zinc-800" />
              <div className="text-center">
                <div className="text-3xl font-black text-zinc-100">$49</div>
                <div className="text-xs text-zinc-500 mt-0.5">в месяц</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section className="border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-4 py-28">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Старт за 3 шага</div>
            <h2 className="text-3xl font-bold text-zinc-100">Как начать</h2>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-5 left-[calc(50%+28px)] right-0 h-px bg-gradient-to-r from-zinc-700 to-transparent" />
                )}
                <div
                  className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-black"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" }}
                >
                  {num}
                </div>
                <h3 className="mb-2 font-semibold text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-zinc-800/50">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(59,130,246,.12) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-3xl px-4 py-28 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400/80">Начни сегодня</div>
          <h2 className="mb-4 text-4xl font-black text-zinc-100 leading-tight">
            Первый залив —{" "}
            <span className="gradient-text">через 15 минут</span>
          </h2>
          <p className="mb-10 text-zinc-400 max-w-md mx-auto">
            Бесплатный тариф без кредитной карты. Обновление до Pro — когда будешь готов.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-windows-installer.exe"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-900/30"
            >
              <Monitor size={16} />
              Скачать для Windows
            </a>
            <a
              href="https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-macos-arm64.dmg"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-8 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              <Apple size={16} />
              Скачать для macOS
            </a>
          </div>
          <div className="mt-6">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Посмотреть тарифы <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/50">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="AdOps Cockpit" className="h-6 w-6 object-contain rounded-md" />
            <span className="text-sm font-semibold text-zinc-400">AdOps Cockpit</span>
          </div>
          <div className="flex gap-6 text-xs text-zinc-600">
            <Link href="/pricing"  className="hover:text-zinc-400 transition-colors">Тарифы</Link>
            <Link href="/login"    className="hover:text-zinc-400 transition-colors">Войти</Link>
            <Link href="/register" className="hover:text-zinc-400 transition-colors">Регистрация</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
