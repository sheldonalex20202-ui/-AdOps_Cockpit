"use client";
import { useRef, useEffect, forwardRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  useAnimationFrame,
  useMotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

function wrap(min: number, max: number, v: number): number {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

interface TextMarqueProps {
  children: string;
  baseVelocity: number;
  className?: string;
  delay?: number;
}

const TextMarque = forwardRef<HTMLDivElement, TextMarqueProps>(
  ({ children, baseVelocity = -5, className, delay = 0 }, ref) => {
    const baseX = useMotionValue(0);
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
    const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });

    const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);
    const directionFactor = useRef<number>(1);
    const hasStarted = useRef(false);

    useEffect(() => {
      const t = setTimeout(() => { hasStarted.current = true; }, delay);
      return () => clearTimeout(t);
    }, [delay]);

    useAnimationFrame((_t, delta) => {
      if (!hasStarted.current) return;
      let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
      moveBy += directionFactor.current * moveBy * velocityFactor.get();
      baseX.set(baseX.get() + moveBy);
    });

    return (
      <div ref={ref} className="overflow-hidden whitespace-nowrap flex flex-nowrap">
        <motion.div className={cn("flex whitespace-nowrap gap-16 flex-nowrap", className)} style={{ x }}>
          <span className="block">{children}</span>
          <span className="block">{children}</span>
          <span className="block">{children}</span>
          <span className="block">{children}</span>
        </motion.div>
      </div>
    );
  }
);

TextMarque.displayName = "TextMarque";
export default TextMarque;
