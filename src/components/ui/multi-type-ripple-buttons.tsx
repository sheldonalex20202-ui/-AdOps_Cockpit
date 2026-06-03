"use client";
import { useRef } from "react";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function RippleButton({ children, className, onClick, ...props }: RippleButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = ref.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ripple = document.createElement("span");
      ripple.style.cssText = `
        position:absolute;border-radius:50%;pointer-events:none;
        width:${size}px;height:${size}px;
        left:${e.clientX - rect.left - size / 2}px;
        top:${e.clientY - rect.top - size / 2}px;
        background:rgba(255,255,255,0.22);
        transform:scale(0);animation:_ripple 0.55s linear;
      `;
      if (!document.getElementById("_ripple-style")) {
        const style = document.createElement("style");
        style.id = "_ripple-style";
        style.textContent = "@keyframes _ripple{to{transform:scale(1);opacity:0}}";
        document.head.appendChild(style);
      }
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }
    onClick?.(e);
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={`relative overflow-hidden ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
