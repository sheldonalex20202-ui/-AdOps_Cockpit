"use client";

import Script from "next/script";

export function HeroBackground() {
  return (
    <>
      <div
        data-us-project="cqcLtDwfoHqqRPttBbQE"
        className="absolute inset-0 -z-10 w-full h-full"
      />
      <Script
        id="unicorn-studio"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(){if(!window.UnicornStudio){window.UnicornStudio={isInitialized:!1};var i=document.createElement("script");i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js",i.onload=function(){window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)},(document.head||document.body).appendChild(i)}}();`,
        }}
      />
    </>
  );
}
