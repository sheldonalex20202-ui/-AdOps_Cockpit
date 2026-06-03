"use client";
import React, { ReactNode, useState, useMemo, MouseEvent, CSSProperties } from "react";

interface RippleState {
  key: number; x: number; y: number; size: number; color: string;
}

interface RippleButtonProps {
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "default" | "hover" | "ghost" | "hoverborder";
  rippleColor?: string;
  rippleDuration?: number;
  hoverBaseColor?: string;
  hoverRippleColor?: string;
  hoverBorderEffectColor?: string;
  hoverBorderEffectThickness?: string;
}

const hexToRgba = (hex: string, alpha: number): string => {
  let h = hex.startsWith("#") ? hex.slice(1) : hex;
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const COLS = 36, ROWS = 12, TOTAL = COLS * ROWS;
const RIPPLE_SIZE = "18.973665961em";

const JS_KEYFRAMES = `
@keyframes js-ripple-animation {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}
.animate-js-ripple-effect {
  animation: js-ripple-animation var(--ripple-duration) ease-out forwards;
}`;

export function RippleButton({
  children, onClick, className = "", disabled = false, type = "button",
  variant = "default",
  rippleColor: userRippleColor, rippleDuration = 600,
  hoverBaseColor = "#6996e2", hoverRippleColor: customHoverRippleColor,
  hoverBorderEffectColor = "#6996e277", hoverBorderEffectThickness = "0.3em",
}: RippleButtonProps) {
  const [jsRipples, setJsRipples] = useState<RippleState[]>([]);

  const jsRippleColor = useMemo(
    () => userRippleColor ?? "var(--button-ripple-color, rgba(0,0,0,0.1))",
    [userRippleColor]
  );

  const gridStyles = useMemo(() => {
    const dur = "0.9s";
    let nth = "";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c + 1;
        const top = 0.125 + r * 0.25;
        const left = 0.1875 + c * 0.25;
        if (variant === "hover") {
          nth += `.hover-grid-cell:nth-child(${i}):hover ~ .hover-ripple{top:${top}em;left:${left}em;transition:width ${dur} ease,height ${dur} ease,top 0s linear,left 0s linear;}`;
        } else if (variant === "hoverborder") {
          nth += `.hb-grid-cell:nth-child(${i}):hover ~ .hb-ripple{top:${top}em;left:${left}em;transition:width ${dur} ease-out,height ${dur} ease-out,top 0s linear,left 0s linear;}`;
        }
      }
    }
    if (variant === "hover") {
      const col = customHoverRippleColor ?? hexToRgba(hoverBaseColor, 0.466);
      return `.hover-ripple{background-color:${col};transition:width ${dur} ease,height ${dur} ease,top 99999s linear,left 99999s linear;}.hover-grid-cell:hover~.hover-ripple{width:${RIPPLE_SIZE};height:${RIPPLE_SIZE};}${nth}`;
    }
    if (variant === "hoverborder") {
      return `.hb-container{padding:${hoverBorderEffectThickness};mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;}.hb-ripple{background-color:${hoverBorderEffectColor};transition:width ${dur} ease-out,height ${dur} ease-out,top 99999s linear,left 9999s linear;}.hb-grid-cell:hover~.hb-ripple{width:${RIPPLE_SIZE};height:${RIPPLE_SIZE};}${nth}`;
    }
    return "";
  }, [variant, hoverBaseColor, customHoverRippleColor, hoverBorderEffectColor, hoverBorderEffectThickness]);

  function addRipple(e: MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const r: RippleState = {
      key: Date.now(),
      x: e.clientX - rect.left - size / 2,
      y: e.clientY - rect.top - size / 2,
      size, color: jsRippleColor,
    };
    setJsRipples((prev) => [...prev, r]);
    setTimeout(() => setJsRipples((cur) => cur.filter((x) => x.key !== r.key)), rippleDuration);
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!disabled) { addRipple(e); onClick?.(e); }
  }

  const rippleEls = (
    <div className="absolute inset-0 pointer-events-none z-[5]">
      {jsRipples.map((r) => (
        <span
          key={r.key}
          className="absolute rounded-full animate-js-ripple-effect"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size,
            backgroundColor: r.color, ["--ripple-duration" as string]: `${rippleDuration}ms` } as CSSProperties}
        />
      ))}
    </div>
  );

  const cells = Array.from({ length: TOTAL }, (_, i) => i);

  if (variant === "hover") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: JS_KEYFRAMES + gridStyles }} />
        <button type={type} disabled={disabled} onClick={handleClick}
          className={`relative rounded-lg text-lg px-4 py-2 border-none bg-transparent isolate overflow-hidden cursor-pointer${disabled ? " opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}>
          <span className="relative z-[10] pointer-events-none">{children}</span>
          {rippleEls}
          <div className="absolute inset-0 grid overflow-hidden pointer-events-none z-[0]"
            style={{ gridTemplateColumns: `repeat(${COLS}, 0.25em)` }}>
            {cells.map((i) => <span key={i} className="hover-grid-cell relative flex justify-center items-center pointer-events-auto" />)}
            <div className="hover-ripple pointer-events-none absolute w-0 h-0 rounded-full -translate-x-1/2 -translate-y-1/2 top-0 left-0 z-[-1]" />
          </div>
        </button>
      </>
    );
  }

  if (variant === "hoverborder") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: JS_KEYFRAMES + gridStyles }} />
        <button type={type} disabled={disabled} onClick={handleClick}
          className={`relative rounded-lg overflow-hidden text-lg px-4 py-2 border-none bg-transparent isolate cursor-pointer${disabled ? " opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}>
          <span className="relative z-[10] pointer-events-none">{children}</span>
          {rippleEls}
          <div className="hb-container absolute inset-0 grid rounded-[0.8em] overflow-hidden pointer-events-none z-[0]"
            style={{ gridTemplateColumns: `repeat(${COLS}, 0.25em)` }}>
            {cells.map((i) => <span key={i} className="hb-grid-cell relative flex justify-center items-center pointer-events-auto" />)}
            <div className="hb-ripple pointer-events-none absolute w-0 h-0 rounded-full -translate-x-1/2 -translate-y-1/2 top-0 left-0 z-[-1]" />
          </div>
        </button>
      </>
    );
  }

  if (variant === "ghost") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: JS_KEYFRAMES }} />
        <button type={type} disabled={disabled} onClick={handleClick}
          className={`relative border-none bg-transparent isolate overflow-hidden cursor-pointer px-4 py-2 rounded-lg text-lg${disabled ? " opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}>
          <span className="relative z-10 pointer-events-none">{children}</span>
          {rippleEls}
        </button>
      </>
    );
  }

  // default
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: JS_KEYFRAMES }} />
      <button type={type} disabled={disabled} onClick={handleClick}
        className={`relative border-none overflow-hidden isolate transition-all duration-200 cursor-pointer px-4 py-2 bg-blue-600 hover:opacity-90 text-white rounded-lg${disabled ? " opacity-50 cursor-not-allowed" : ""} ${className}`}>
        <span className="relative z-[1] pointer-events-none">{children}</span>
        {rippleEls}
      </button>
    </>
  );
}
