"use client";
import { useEffect, useRef, useState } from "react";

function useCounter(to: number, started: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const raf = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(eased * to));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [started, to, duration]);
  return value;
}

function StatBlock({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-8 py-6">
      <div
        className="text-5xl font-black tabular-nums"
        style={{ background: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
      >
        {value}{suffix}
      </div>
      <div className="text-sm text-zinc-400 text-center max-w-[140px] leading-snug">{label}</div>
    </div>
  );
}

export function AnimatedStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const t = useCounter(90, visible);
  const c = useCounter(50, visible);
  const m = useCounter(15, visible);

  return (
    <div ref={ref} className="border-y border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm">
      <div className="mx-auto max-w-4xl px-4">
        <div className="grid grid-cols-3 divide-x divide-zinc-800/60">
          <StatBlock value={t} suffix="%" label="экономия времени на залив" />
          <StatBlock value={c} suffix="+" label="кабинетов одновременно" />
          <StatBlock value={m} suffix=" мин" label="на запуск кампании" />
        </div>
      </div>
    </div>
  );
}
