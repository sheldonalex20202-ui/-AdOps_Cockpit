const accounts = [
  { name: "Media_UA_01",   score: 94, status: "READY",   spend: "$2 400", geo: "UA" },
  { name: "Media_PL_07",   score: 87, status: "READY",   spend: "$1 800", geo: "PL" },
  { name: "Adv_DE_12",     score: 72, status: "LIMITED",  spend: "$3 200", geo: "DE" },
  { name: "Media_FR_03",   score: 91, status: "READY",   spend: "$980",   geo: "FR" },
  { name: "Adv_UK_05",     score: 65, status: "LIMITED",  spend: "$2 100", geo: "UK" },
  { name: "Media_CZ_09",   score: 88, status: "READY",   spend: "$1 450", geo: "CZ" },
  { name: "Promo_IT_02",   score: 55, status: "NEEDS_ATTENTION", spend: "$760", geo: "IT" },
];

function ScoreDot({ score }: { score: number }) {
  const c = score >= 80 ? "#22c55e" : score >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <span className="inline-flex items-center gap-1">
      <span style={{ background: c }} className="inline-block h-1.5 w-1.5 rounded-full" />
      <span style={{ color: c }} className="tabular-nums text-[11px] font-semibold">{score}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    READY:            "text-emerald-400 bg-emerald-400/10",
    LIMITED:          "text-amber-400 bg-amber-400/10",
    NEEDS_ATTENTION:  "text-red-400 bg-red-400/10",
  };
  const labels: Record<string, string> = {
    READY: "Ready", LIMITED: "Limited", NEEDS_ATTENTION: "Attention",
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status] ?? "text-zinc-400 bg-zinc-400/10"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function AppMockup() {
  return (
    <div className="flex h-full w-full text-zinc-100 overflow-hidden select-none" style={{ fontFamily: "system-ui, sans-serif", fontSize: 12 }}>

      {/* Sidebar */}
      <aside className="flex w-[160px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 px-2 py-3">
        <div className="mb-4 flex items-center gap-2 px-1">
          <div className="h-5 w-5 rounded-md bg-blue-600 flex items-center justify-center text-[9px] font-black text-white">A</div>
          <span className="text-[11px] font-semibold text-zinc-100">AdOps Cockpit</span>
        </div>
        {[
          { label: "Аккаунты",    active: true },
          { label: "Пулы",        active: false },
          { label: "Креативы",    active: false },
          { label: "Шаблоны",     active: false },
          { label: "Автозалив",   active: false },
          { label: "История",     active: false },
          { label: "Аудит",       active: false },
        ].map(({ label, active }) => (
          <div
            key={label}
            className={`mb-0.5 rounded px-2 py-1.5 text-[11px] font-medium ${
              active ? "bg-blue-600/15 text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </div>
        ))}
        <div className="mt-auto px-1">
          <div className="rounded-lg bg-zinc-800/60 p-2">
            <div className="text-[10px] text-zinc-500 mb-1">Pro план</div>
            <div className="text-[11px] text-zinc-300 font-semibold">7 / 50 кабинетов</div>
            <div className="mt-1.5 h-1 w-full rounded-full bg-zinc-700">
              <div className="h-1 rounded-full bg-blue-500" style={{ width: "14%" }} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden bg-zinc-950">

        {/* Top bar */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-zinc-100">Аккаунты</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">7 активных</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-500 flex items-center">Поиск...</div>
            <div className="h-6 rounded bg-blue-600 px-2.5 text-[11px] font-semibold text-white flex items-center gap-1">
              + Добавить
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex shrink-0 gap-3 border-b border-zinc-800 px-4 py-2">
          {[
            { label: "Health Check", value: "6 / 7",   color: "text-emerald-400" },
            { label: "READY",        value: "4",        color: "text-emerald-400" },
            { label: "Limited",      value: "2",        color: "text-amber-400" },
            { label: "Проблемных",   value: "1",        color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`text-[13px] font-black ${color}`}>{value}</span>
              <span className="text-[10px] text-zinc-600">{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-5 rounded border border-blue-500/40 bg-blue-500/10 px-2 text-[10px] text-blue-400 flex items-center">
              ⚡ Health Check всех
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="grid shrink-0 gap-0 border-b border-zinc-800 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
          style={{ gridTemplateColumns: "16px 1fr 70px 70px 80px 60px" }}>
          <span />
          <span>Кабинет</span>
          <span>Score</span>
          <span>Статус</span>
          <span>Spend</span>
          <span>Гео</span>
        </div>

        {/* Table rows */}
        <div className="flex-1 overflow-y-auto">
          {accounts.map((acc, i) => (
            <div
              key={acc.name}
              className={`grid items-center gap-0 border-b border-zinc-800/50 px-4 py-2 hover:bg-zinc-900/50 ${i === 0 ? "bg-zinc-900/30" : ""}`}
              style={{ gridTemplateColumns: "16px 1fr 70px 70px 80px 60px" }}
            >
              <input type="checkbox" readOnly checked={i < 4} className="h-3 w-3 rounded accent-blue-600 cursor-default" />
              <span className="truncate text-[12px] font-medium text-zinc-200">{acc.name}</span>
              <ScoreDot score={acc.score} />
              <StatusBadge status={acc.status} />
              <span className="text-[11px] text-zinc-400">{acc.spend}</span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 w-fit">{acc.geo}</span>
            </div>
          ))}
        </div>

        {/* Bottom launch bar */}
        <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-900/60 px-4 py-2">
          <span className="text-[11px] text-zinc-500">Выбрано: <span className="text-zinc-300 font-semibold">4 кабинета</span></span>
          <div className="flex items-center gap-2">
            <div className="h-6 rounded border border-zinc-700 px-2.5 text-[11px] text-zinc-400 flex items-center">Health Check</div>
            <div className="h-6 rounded bg-blue-600 px-3 text-[11px] font-semibold text-white flex items-center gap-1">
              🚀 Запустить залив
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
