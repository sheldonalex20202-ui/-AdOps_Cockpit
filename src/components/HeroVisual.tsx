"use client";
import { motion } from "framer-motion";
import { CheckCircle, TrendingUp, Zap } from "lucide-react";

const accounts = [
  { name: "Media_UA_01", score: 94, ok: true },
  { name: "Media_PL_07", score: 87, ok: true },
  { name: "Adv_DE_12",   score: 72, ok: false },
  { name: "Media_FR_03", score: 91, ok: true },
  { name: "Adv_UK_05",   score: 88, ok: true },
];

function FloatCard({
  children,
  className,
  delay,
  floatY = 8,
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
  floatY?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1, y: [0, -floatY, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale:   { duration: 0.5, delay },
        y:       { duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HeroVisual() {
  return (
    <div className="relative hidden lg:flex items-center justify-center h-[520px] w-full">

      {/* ── Central dashboard card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.75, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-[300px] rounded-2xl border border-zinc-700/50 bg-zinc-900/80 backdrop-blur-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-blue-600 flex items-center justify-center">
              <Zap size={11} className="text-white" />
            </div>
            <span className="text-[12px] font-semibold text-zinc-200">Автозалив</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            Live
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-zinc-500">Обработано кабинетов</span>
            <span className="text-zinc-200 font-bold">47 / 50</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-1.5 rounded-full"
              style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
              initial={{ width: "0%" }}
              animate={{ width: "94%" }}
              transition={{ duration: 1.6, delay: 0.9, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Account rows */}
        <div className="space-y-0.5">
          {accounts.map((acc, i) => (
            <motion.div
              key={acc.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 + i * 0.08 }}
              className="flex items-center justify-between py-1.5 border-t border-zinc-800/60"
            >
              <span className="text-[11px] text-zinc-400 font-mono">{acc.name}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: acc.ok ? "#22c55e" : "#f59e0b" }}
                />
                <span
                  className={`text-[11px] font-semibold tabular-nums ${acc.ok ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {acc.score}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer elapsed */}
        <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-600">
          <span>Время запуска</span>
          <span className="font-semibold text-zinc-400">12 мин 34 сек</span>
        </div>
      </motion.div>

      {/* ── Floating: success chip (top-right) ── */}
      <FloatCard
        delay={1.4}
        floatY={7}
        className="absolute top-10 right-4 z-20 flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 backdrop-blur-xl px-3 py-2 shadow-lg"
      >
        <CheckCircle size={13} className="text-emerald-400 shrink-0" />
        <div>
          <div className="text-[11px] font-semibold text-emerald-300">47 кабинетов запущено</div>
          <div className="text-[10px] text-zinc-500">за 12 минут</div>
        </div>
      </FloatCard>

      {/* ── Floating: ROI chip (bottom-left) ── */}
      <FloatCard
        delay={1.7}
        floatY={6}
        className="absolute bottom-16 left-4 z-20 flex items-center gap-2.5 rounded-xl border border-blue-500/25 bg-blue-500/10 backdrop-blur-xl px-3 py-2 shadow-lg"
      >
        <TrendingUp size={13} className="text-blue-400 shrink-0" />
        <div>
          <div className="text-[11px] font-semibold text-blue-300">+214% ROI</div>
          <div className="text-[10px] text-zinc-500">после автозалива</div>
        </div>
      </FloatCard>

      {/* ── Floating: health chip (top-left) ── */}
      <FloatCard
        delay={2.0}
        floatY={5}
        className="absolute top-28 left-2 z-20 flex items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 backdrop-blur-xl px-3 py-2 shadow-lg"
      >
        <div className="h-6 w-6 rounded-full border-2 border-violet-400 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-violet-300">94</span>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-violet-300">Health Score</div>
          <div className="text-[10px] text-zinc-500">Media_UA_01</div>
        </div>
      </FloatCard>

      {/* ambient glow behind card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.12) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
