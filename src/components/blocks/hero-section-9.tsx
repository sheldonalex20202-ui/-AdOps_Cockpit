"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Monitor, Apple } from "lucide-react";
import { AppMockup } from "@/components/AppMockup";

export function HeroSection9() {
  return (
    <main className="relative">
      {/* ── Decorative left-side light shafts ── */}
      <div
        aria-hidden
        className="z-[2] absolute inset-0 pointer-events-none isolate opacity-40 contain-strict hidden lg:block"
      >
        <div
          className="w-[35rem] h-[80rem] absolute left-0 top-0 -rotate-45 rounded-full"
          style={{
            transform: "translateY(-350px) rotate(-45deg)",
            background:
              "radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(220,80%,70%,.10) 0, hsla(220,60%,50%,.03) 50%, transparent 80%)",
          }}
        />
        <div
          className="h-[80rem] absolute left-0 top-0 w-56 rounded-full"
          style={{
            transform: "translate(5%, -50%) rotate(-45deg)",
            background:
              "radial-gradient(50% 50% at 50% 50%, hsla(220,70%,70%,.07) 0, hsla(220,50%,50%,.02) 80%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Hero text ── */}
      <section className="overflow-hidden">
        <div className="relative mx-auto max-w-5xl px-6 py-28 lg:py-24">
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              Инструмент №1 для медиабаера
            </div>

            <h1 className="text-balance text-4xl font-black tracking-tight text-zinc-100 md:text-5xl lg:text-6xl leading-[1.07]">
              Автозалив Meta кабинетов —{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                быстро и без хаоса
              </span>
            </h1>

            <p className="mx-auto my-8 max-w-xl text-lg text-zinc-400 leading-relaxed">
              Тратишь 6 часов на ручной залив? С AdOps Cockpit это займёт{" "}
              <span className="font-semibold text-zinc-200">15 минут</span>. Купил подписку —
              увеличил доход в{" "}
              <span className="font-semibold text-zinc-200">2 раза</span>.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <a href="https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-windows-installer.exe">
                  <Monitor size={16} className="mr-2" />
                  Скачать для Windows
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="https://github.com/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest/download/AdOpsCockpit-macos-arm64.dmg">
                  <Apple size={16} className="mr-2" />
                  Скачать для macOS
                </a>
              </Button>
            </div>

            <p className="mt-4 text-xs text-zinc-600">
              Бесплатный тариф · Windows · macOS ·{" "}
              <Link href="/pricing" className="underline underline-offset-2 hover:text-zinc-400 transition-colors">
                посмотреть тарифы
              </Link>
            </p>
          </div>
        </div>

        {/* ── 3D App Interface ── */}
        <div className="mx-auto -mt-12 max-w-7xl [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]">
          <div className="[perspective:1200px] -mr-16 pl-16 lg:-mr-56 lg:pl-56">
            <div style={{ transform: "rotateX(18deg)" }}>
              <div
                className="lg:h-[42rem] relative overflow-hidden rounded-xl border border-zinc-700/60 shadow-2xl"
                style={{ transform: "skewX(0.36rad)" }}
              >
                <AppMockup />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
