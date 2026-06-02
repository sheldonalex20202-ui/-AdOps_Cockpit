const rows = [
  {
    pain:     "6 часов на ручной залив одного кабинета",
    gain:     "15 минут — залив на 50+ кабинетов одновременно",
  },
  {
    pain:     "Кабинеты падают, а ты узнаёшь из слитого бюджета",
    gain:     "Health Check 0–100 перед каждым запуском автоматически",
  },
  {
    pain:     "Аккаунты и статусы — в Excel, Notion и голове",
    gain:     "Всё в одном десктопе: пулы, статусы, залив, история",
  },
  {
    pain:     "С ростом кабинетов скорость падает до нуля",
    gain:     "Масштаб без боли — структуры CBO/ABO/Z_GROUP одним кликом",
  },
  {
    pain:     "Ошибки в неймингах кампаний, ручная настройка каждого",
    gain:     "Авто-нейминг с переменными — {geo}, {vertical}, {date}, {angle}",
  },
];

export function ProblemSolution() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Проблема → Решение
        </div>
        <h2 className="text-3xl font-black text-zinc-100 sm:text-4xl">
          Что меняется с AdOps Cockpit
        </h2>
      </div>

      {/* Column headers */}
      <div className="mb-4 grid grid-cols-[1fr_40px_1fr] items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Без инструмента</span>
        </div>
        <div />
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">С AdOps Cockpit</span>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_40px_1fr] items-center gap-3"
          >
            {/* Pain */}
            <div className="flex items-start gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-red-500/20 hover:bg-red-500/5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-[11px] text-red-400">
                ✕
              </span>
              <p className="text-sm text-zinc-400 leading-snug">{row.pain}</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </div>

            {/* Gain */}
            <div className="flex items-start gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-400">
                ✓
              </span>
              <p className="text-sm text-zinc-200 leading-snug font-medium">{row.gain}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
