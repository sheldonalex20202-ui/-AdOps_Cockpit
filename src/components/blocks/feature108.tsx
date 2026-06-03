"use client";
import { useState } from "react";
import { Zap, Shield, Layers, Target, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── mini visuals ─────────────────────────────────────────── */

function LaunchVisual() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Структура залива</div>
      <div className="flex flex-wrap gap-2">
        {["CBO", "ABO", "ISOLATION", "Z_GROUP"].map((s) => (
          <span key={s} className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold border",
            s === "CBO"
              ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
              : "bg-zinc-800 border-zinc-700 text-zinc-400"
          )}>{s}</span>
        ))}
      </div>
      <div className="h-px bg-zinc-800" />
      <div className="space-y-2">
        {[
          { label: "Кабинетов в пуле", value: "52" },
          { label: "Время запуска", value: "~14 мин" },
          { label: "Успешных", value: "50 / 52" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{label}</span>
            <span className="font-semibold text-zinc-100">{value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
        Запустить залив →
      </div>
    </div>
  );
}

function HealthVisual() {
  const score = 87;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const r = 40, cx = 56, cy = 56;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Readiness Score</div>
      <div className="flex items-center gap-5">
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27272a" strokeWidth={10} />
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <text x={cx} y={cy + 6} textAnchor="middle" fill="white" fontSize={22} fontWeight={700}>{score}</text>
        </svg>
        <div className="space-y-2 flex-1">
          {[
            { label: "Токен", ok: true },
            { label: "Биллинг", ok: true },
            { label: "Лимиты", ok: true },
            { label: "Статус аккаунта", ok: false },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className={cn("w-1.5 h-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-red-400")} />
              <span className={ok ? "text-zinc-300" : "text-zinc-500"}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PoolsVisual() {
  const pools = [
    { name: "NUTRA · RU", count: 18, active: true },
    { name: "GAMBLING · EU", count: 24 },
    { name: "CRYPTO · LATAM", count: 11 },
  ];
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Пулы кабинетов</div>
      {pools.map(({ name, count, active }) => (
        <div key={name} className={cn(
          "flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors",
          active
            ? "bg-blue-500/10 border-blue-500/30 text-zinc-100"
            : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
        )}>
          <span className="font-medium">{name}</span>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", active ? "bg-blue-500/20 text-blue-300" : "bg-zinc-700 text-zinc-400")}>
            {count} кабинетов
          </span>
        </div>
      ))}
    </div>
  );
}

function PresetsVisual() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Шаблон нейминга</div>
      <div className="rounded-xl bg-zinc-800 px-4 py-3 font-mono text-[13px] leading-relaxed">
        <span className="text-zinc-400">{"["}</span>
        <span className="text-blue-400">{"{vertical}"}</span>
        <span className="text-zinc-400">{"] "}</span>
        <span className="text-emerald-400">{"{geo}"}</span>
        <span className="text-zinc-400">{" — "}</span>
        <span className="text-violet-400">{"{angle}"}</span>
        <span className="text-zinc-400">{" "}</span>
        <span className="text-amber-400">{"{date}"}</span>
      </div>
      <div className="h-px bg-zinc-800" />
      <div className="flex flex-wrap gap-2">
        {["NUTRA", "GAMBLING", "CRYPTO", "DATING", "ECOM"].map((v) => (
          <span key={v} className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-400">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function HistoryVisual() {
  const rows = [
    { id: "#041", pool: "NUTRA · RU", ok: 48, total: 50, time: "14 мин" },
    { id: "#040", pool: "GAMBLING · EU", ok: 22, total: 24, time: "9 мин" },
    { id: "#039", pool: "CRYPTO · US", ok: 30, total: 30, time: "11 мин" },
  ];
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">История запусков</div>
      {rows.map(({ id, pool, ok, total, time }) => (
        <div key={id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/40 text-xs">
          <span className="text-zinc-600 font-mono w-10">{id}</span>
          <span className="flex-1 text-zinc-300 font-medium">{pool}</span>
          <span className={cn("font-semibold", ok === total ? "text-emerald-400" : "text-amber-400")}>
            {ok}/{total}
          </span>
          <span className="text-zinc-600">{time}</span>
        </div>
      ))}
    </div>
  );
}

/* ── tab data ─────────────────────────────────────────────── */

const TABS = [
  {
    id: "launch",
    icon: Zap,
    label: "Автозалив",
    badge: "Core",
    title: "50 кабинетов за 15 минут",
    description:
      "Настраиваешь один раз — запускаешь на весь пул. CBO, ABO, Isolation, Z-Group выбираются одним кликом. Naming template автоматически подставляет {geo}, {vertical}, {date} и {angle} в каждое объявление.",
    points: [
      "Любая структура: CBO · ABO · ISOLATION · Z_GROUP",
      "Массовый залив на 50+ кабинетов одновременно",
      "Авто-нейминг с переменными шаблонами",
    ],
    Visual: LaunchVisual,
  },
  {
    id: "health",
    icon: Shield,
    label: "Health Check",
    badge: "Auto",
    title: "Никаких сюрпризов перед запуском",
    description:
      "Перед каждым заливом система автоматически проверяет токен, биллинг, лимиты и статус каждого кабинета. Readiness Score 0–100 показывает кто готов, а кого нужно исключить.",
    points: [
      "Readiness Score 0–100 по каждому кабинету",
      "Проверка токена, биллинга и лимитов",
      "Автоматическое исключение проблемных аккаунтов",
    ],
    Visual: HealthVisual,
  },
  {
    id: "pools",
    icon: Layers,
    label: "Пулы кабинетов",
    badge: "Organize",
    title: "Всё разложено по полочкам",
    description:
      "Группируй кабинеты по вертикалям, гео, командам или проектам. Залив по пулу запускается в один клик — не нужно выбирать каждый аккаунт вручную.",
    points: [
      "Группировка по вертикали, гео, команде",
      "Залив по пулу одним кликом",
      "Статус каждого кабинета в реальном времени",
    ],
    Visual: PoolsVisual,
  },
  {
    id: "presets",
    icon: Target,
    label: "Пресеты",
    badge: "Vertical",
    title: "Настройка вертикали — за 10 секунд",
    description:
      "NUTRA, GAMBLING, CRYPTO, DATING, ECOM — каждая вертикаль уже содержит objective, bid strategy, optimization goal и дневной бюджет. Выбрал вертикаль — всё остальное настроено.",
    points: [
      "5 вертикалей с готовыми bid strategy",
      "Шаблоны нейминга с переменными",
      "10 углов (angle) для креативов",
    ],
    Visual: PresetsVisual,
  },
  {
    id: "history",
    icon: BarChart3,
    label: "История",
    badge: "Analytics",
    title: "Полная история каждого запуска",
    description:
      "Все залив-сессии с детализацией по кабинетам: статус, время, количество успешных. Процент успеха по пулу, быстрый re-launch одной кнопкой без повторной настройки.",
    points: [
      "Детализация по каждому кабинету в сессии",
      "Процент успеха и время запуска",
      "Re-launch одной кнопкой",
    ],
    Visual: HistoryVisual,
  },
];

/* ── component ────────────────────────────────────────────── */

export function Feature108() {
  const [active, setActive] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === active)!;
  const { Visual } = tab;

  return (
    <section className="border-t border-zinc-800/40 py-24 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400/80">Возможности</div>
          <h2 className="text-3xl font-black text-zinc-100 sm:text-4xl">
            Всё, что нужно баеру —{" "}
            <span className="gradient-text">в одном инструменте</span>
          </h2>
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200",
                active === id
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-br from-zinc-900/60 to-zinc-950/60 p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Text */}
            <div className="space-y-5">
              <span className="inline-block px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {tab.badge}
              </span>
              <h3 className="text-2xl font-black text-zinc-100 leading-tight sm:text-3xl">
                {tab.title}
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                {tab.description}
              </p>
              <ul className="space-y-2.5 mt-2">
                {tab.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-zinc-300">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px]">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual */}
            <div>
              <Visual />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
