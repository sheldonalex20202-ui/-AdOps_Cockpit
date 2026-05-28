import Link from "next/link";
import { Download, ArrowRight, Zap, Shield, BarChart3, Layers } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Массовый автозалив",
    desc: "Запускай кампании на десятках кабинетов одновременно. CBO, ABO, Isolation и Z-Group структуры.",
  },
  {
    icon: Shield,
    title: "Health Check кабинетов",
    desc: "Автоматическая проверка готовности: токен, биллинг, статус, лимиты. Readiness score 0–100.",
  },
  {
    icon: Layers,
    title: "Пулы кабинетов",
    desc: "Группируй кабинеты по проектам и гео. Запускай залив по выбранному пулу за секунды.",
  },
  {
    icon: BarChart3,
    title: "Управление креативами",
    desc: "Храни и фильтруй креативы по Z-группе и гео. Авто-парсинг имени файла.",
  },
];

const steps = [
  { num: "01", title: "Скачай приложение", desc: "Установи AdOps Cockpit на Windows или macOS." },
  { num: "02", title: "Войди через аккаунт", desc: "Авторизация через браузер — безопасно и быстро." },
  { num: "03", title: "Запускай кампании", desc: "Управляй сотнями кабинетов с одного экрана." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Navbar */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-xs font-bold text-white">AO</span>
            </div>
            <span className="text-sm font-semibold text-zinc-100">AdOps Cockpit</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-zinc-100 transition">
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

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-40 pb-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          Desktop-first инструмент для медиабаера
        </div>
        <h1 className="mb-5 text-5xl font-bold tracking-tight text-zinc-100 sm:text-6xl">
          Управляй Meta кабинетами{" "}
          <span className="text-blue-400">на масштабе</span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-400">
          Автозалив кампаний, health checks, управление креативами и пулами кабинетов —
          всё в одном десктопном приложении.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Download size={16} />
            Скачать бесплатно
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            Войти в аккаунт
            <ArrowRight size={16} />
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-600">Windows · macOS · Бесплатный тариф</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-zinc-100">Всё что нужно баеру</h2>
          <p className="mt-2 text-zinc-500">Один инструмент вместо десяти таблиц</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-zinc-700"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
                <Icon size={18} />
              </div>
              <h3 className="mb-1.5 font-semibold text-zinc-100">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-4 py-24">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-zinc-100">Как начать</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="mb-4 text-4xl font-black text-zinc-800">{num}</div>
                <h3 className="mb-2 font-semibold text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-24 text-center">
        <h2 className="mb-4 text-3xl font-bold text-zinc-100">
          Готов запустить первый залив?
        </h2>
        <p className="mb-8 text-zinc-500">Бесплатный тариф. Без кредитной карты.</p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Download size={16} />
          Начать бесплатно
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600">
              <span className="text-xs font-bold text-white">AO</span>
            </div>
            <span className="text-sm font-semibold text-zinc-400">AdOps Cockpit</span>
          </div>
          <div className="flex gap-6 text-xs text-zinc-600">
            <Link href="/pricing" className="hover:text-zinc-400 transition">Тарифы</Link>
            <Link href="/login" className="hover:text-zinc-400 transition">Войти</Link>
            <Link href="/register" className="hover:text-zinc-400 transition">Регистрация</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
