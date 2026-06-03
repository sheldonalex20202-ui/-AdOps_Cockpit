import TextMarque from "@/components/ui/text-marque";

const PAINS =
  "6 часов на залив одного кабинета  ·  кабинеты падают — узнаёшь из слитого бюджета  ·  статусы в Excel и Notion и голове  ·  скорость падает при росте кабинетов  ·  ошибки в неймингах каждой кампании";

const GAINS =
  "15 мин на 50+ кабинетов  →  Health Check 0–100 перед каждым запуском  →  всё в одном десктопе  →  масштаб без боли  →  авто-нейминг  {geo} · {vertical} · {date} · {angle}";

export function ProblemSolution() {
  return (
    <section className="py-24 overflow-hidden border-t border-zinc-800/40">
      <div className="mb-14 text-center px-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          До и после
        </div>
        <h2 className="text-3xl font-black text-zinc-100 sm:text-4xl">
          Что меняется с{" "}
          <span className="gradient-text">AdOps Cockpit</span>
        </h2>
      </div>

      {/* Pains — scroll left */}
      <div className="mb-5 relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
        <TextMarque
          baseVelocity={-2.5}
          className="text-[15px] font-medium text-zinc-600 line-through decoration-red-500/50 decoration-[1.5px]"
        >
          {PAINS}
        </TextMarque>
      </div>

      {/* Gains — scroll right */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
        <TextMarque
          baseVelocity={2.5}
          delay={150}
          className="text-[15px] font-semibold text-zinc-200"
        >
          {GAINS}
        </TextMarque>
      </div>
    </section>
  );
}
