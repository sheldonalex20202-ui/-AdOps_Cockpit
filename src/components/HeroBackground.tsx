"use client";
import { useEffect } from "react";

export function HeroBackground() {
  useEffect(() => {
    const win = window as any;
    // guard against StrictMode double-mount and multiple navigations
    if (document.getElementById("us-script")) {
      // script already in DOM — if UnicornStudio loaded but wasn't init'd, init now
      if (win.UnicornStudio && !win.UnicornStudio.isInitialized) {
        requestAnimationFrame(() => {
          win.UnicornStudio.init();
          win.UnicornStudio.isInitialized = true;
        });
      }
      return;
    }

    if (!win.UnicornStudio) win.UnicornStudio = { isInitialized: false };

    const s = document.createElement("script");
    s.id = "us-script";
    s.src =
      "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
    s.onload = () => {
      // rAF ensures layout is settled — canvas needs computed dimensions at init
      requestAnimationFrame(() => {
        if (win.UnicornStudio && !win.UnicornStudio.isInitialized) {
          win.UnicornStudio.init();
          win.UnicornStudio.isInitialized = true;
        }
      });
    };
    document.head.appendChild(s);
  }, []);

  return (
    <div className="absolute inset-0 -z-10">
      {/*
        IMPORTANT: no CSS filter here — filter on a WebGL canvas parent
        breaks hardware-accelerated rendering in Chrome/Safari.
        Color tinting is done via the overlay div below instead.
      */}
      <div
        data-us-project="cqcLtDwfoHqqRPttBbQE"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* blue-violet tint — safe replacement for CSS filter on WebGL */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.30) 0%, rgba(109,40,217,0.22) 55%, rgba(37,99,235,0.18) 100%)",
        }}
      />
    </div>
  );
}
