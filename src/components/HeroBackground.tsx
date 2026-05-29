"use client";
import { useEffect } from "react";

export function HeroBackground() {
  useEffect(() => {
    const win = window as any;

    // already running — don't re-init
    if (win.UnicornStudio?.isInitialized) return;
    // script already injected (StrictMode second mount)
    if (document.getElementById("us-script")) return;

    if (!win.UnicornStudio) win.UnicornStudio = { isInitialized: false };

    const s = document.createElement("script");
    s.id = "us-script";
    s.src =
      "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
    s.onload = () => {
      if (!win.UnicornStudio.isInitialized) {
        win.UnicornStudio.init();
        win.UnicornStudio.isInitialized = true;
      }
    };
    document.head.appendChild(s);
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Unicorn Studio canvas — hue shifted to our blue/violet palette */}
      <div
        data-us-project="cqcLtDwfoHqqRPttBbQE"
        data-us-scale="0.7"
        className="absolute inset-0 w-full h-full"
        style={{
          filter: "hue-rotate(210deg) saturate(1.5) brightness(0.7)",
        }}
      />

      {/* brand-colour radial glow that blends with the animation */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 40%, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.10) 45%, transparent 70%)",
        }}
      />

      {/* top + bottom fade to zinc-950 so content stays readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, #09090b 0%, transparent 18%, transparent 72%, #09090b 100%)",
        }}
      />
    </div>
  );
}
