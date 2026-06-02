"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const rotate   = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale    = useTransform(scrollYProgress, [0, 1], isMobile ? [0.7, 0.9] : [1.05, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <div
      className="h-[60rem] md:h-[75rem] flex items-center justify-center relative p-2 md:p-20"
      ref={containerRef}
    >
      <div className="py-10 md:py-32 w-full relative" style={{ perspective: "1000px" }}>
        <motion.div
          style={{ translateY: translate }}
          className="max-w-4xl mx-auto text-center mb-12"
        >
          {titleComponent}
        </motion.div>
        <motion.div
          style={{
            rotateX: rotate,
            scale,
            boxShadow:
              "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
          }}
          className="max-w-5xl -mt-4 mx-auto h-[28rem] md:h-[38rem] w-full border-2 border-zinc-700 p-1.5 md:p-3 bg-zinc-900 rounded-[24px] shadow-2xl"
        >
          <div className="h-full w-full overflow-hidden rounded-[16px] bg-zinc-950">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
