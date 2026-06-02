"use client";
import { cn } from "@/lib/utils";
import React from "react";

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  tags?: string[];
  meta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
}

export function BentoGrid({ items }: { items: BentoItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "group relative p-5 rounded-xl overflow-hidden transition-all duration-300",
            "border border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950/60",
            "hover:border-zinc-700 hover:-translate-y-0.5 will-change-transform",
            "hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            item.colSpan === 2 ? "md:col-span-2" : "col-span-1",
            item.hasPersistentHover && "border-zinc-700 -translate-y-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          )}
        >
          {/* dot pattern on hover */}
          <div className={cn(
            "absolute inset-0 transition-opacity duration-300",
            item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:18px_18px]" />
          </div>

          {/* accent glow on hover */}
          <div className={cn(
            "absolute inset-0 -z-10 rounded-xl transition-opacity duration-300",
            "bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5",
            item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )} />

          <div className="relative flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-800/70 border border-zinc-700/50 group-hover:border-blue-500/30 transition-colors duration-300">
                {item.icon}
              </div>
              {item.status && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-lg bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                  {item.status}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="font-semibold text-zinc-100 tracking-tight text-[15px]">
                {item.title}
                {item.meta && (
                  <span className="ml-2 text-xs text-zinc-500 font-normal">{item.meta}</span>
                )}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
            </div>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {item.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-zinc-800/60 border border-zinc-700/40 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
