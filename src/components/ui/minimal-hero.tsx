"use client";
import { motion } from "framer-motion";
import React from "react";

interface Stat { value: string; label: string; }
interface Btn  { label: string; href: string; }

interface MinimalHeroProps {
  badge?: string;
  title: React.ReactNode;
  description: string;
  primaryButton?: Btn;
  secondaryButton?: Btn;
  stats?: Stat[];
  accentColor?: string;
  visual?: React.ReactNode;
}

export default function MinimalHero({
  badge,
  title,
  description,
  primaryButton,
  secondaryButton,
  stats = [],
  accentColor = "#3b82f6",
  visual,
}: MinimalHeroProps) {
  return (
    <div className="relative z-10 min-h-screen flex items-center px-6 pt-20 pb-10">
      <div
        className={`max-w-7xl mx-auto w-full grid gap-12 items-center ${
          visual ? "lg:grid-cols-[1fr_1fr]" : "grid-cols-1"
        }`}
      >
        {/* ── Left: text content ── */}
        <div>
          {badge && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40` }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: accentColor }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-300">
                {badge}
              </span>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.04] tracking-tight text-zinc-100 mb-6"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg text-zinc-400 leading-relaxed max-w-xl mb-10"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-start gap-3 mb-14"
          >
            {primaryButton && (
              <motion.a
                href={primaryButton.href}
                whileHover={{ scale: 1.04, boxShadow: `0 16px 40px ${accentColor}40` }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white"
                style={{ background: accentColor }}
              >
                {primaryButton.label}
              </motion.a>
            )}
            {secondaryButton && (
              <motion.a
                href={secondaryButton.href}
                whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.07)" }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-zinc-300 border border-zinc-700"
              >
                {secondaryButton.label}
              </motion.a>
            )}
          </motion.div>

          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6"
            >
              {stats.map((stat, i) => (
                <motion.div key={i} whileHover={{ y: -4 }} className="relative">
                  <div
                    className="absolute top-0 left-0 w-8 h-[2px] rounded-full"
                    style={{ background: accentColor }}
                  />
                  <div className="pt-4">
                    <div
                      className="text-3xl font-black mb-1 tabular-nums"
                      style={{ color: accentColor }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      {stat.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Right: visual ── */}
        {visual && <div>{visual}</div>}
      </div>
    </div>
  );
}
