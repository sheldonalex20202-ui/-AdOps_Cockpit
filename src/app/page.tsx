import Link from "next/link";
import { Monitor, Apple, ArrowRight, TrendingUp } from "lucide-react";
import { HeroBackground } from "@/components/HeroBackground";
import { HeroSection9 } from "@/components/blocks/hero-section-9";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { AppMockupInteractive } from "@/components/AppMockupInteractive";
import { ProblemSolution } from "@/components/blocks/problem-solution";
import { Feature108 } from "@/components/blocks/feature108";

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
      <section className="relative overflow-hidden pt-14">
        <HeroBackground />
        <div className="hero-gradient-overlay absolute inset-0 pointer-events-none" />
        <HeroSection9 />
      </section>

      {/* ── Problem → Solution comparison ──────────────── */}
      <ProblemSolution />

      {/* ── Tabbed features ────────────────────────────── */}
      <Feature108 />

      {/* ── Interactive app preview ────────────────────── */}
      <section className="bg-zinc-950">
        <ContainerScroll
          titleComponent={
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400/80">
                Живой интерфейс
              </p>
              <h2 className="text-3xl font-black text-zinc-100 sm:text-5xl leading-tight">
                Попробуй прямо здесь —{" "}
                <span className="gradient-text">нажми на вкладку</span>
              </h2>
              <p className="mt-4 text-zinc-500 text-base max-w-xl mx-auto">
                Аккаунты, залив, креативы и история — полный рабочий цикл в одном инструменте.
              </p>
            </div>
          }
        >
          <AppMockupInteractive />
        </ContainerScroll>
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
