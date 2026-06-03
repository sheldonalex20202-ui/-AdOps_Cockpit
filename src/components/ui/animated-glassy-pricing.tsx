"use client";
import React, { useRef, useEffect, useState } from "react";
import { RippleButton } from "@/components/ui/multi-type-ripple-buttons";

/* ── internal ─────────────────────────────────────────────── */

const CheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ShaderCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glProgramRef = useRef<WebGLProgram | null>(null);
  const glBgColorLocationRef = useRef<WebGLUniformLocation | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  // site is always dark — start with black
  const [backgroundColor, setBackgroundColor] = useState([0, 0, 0]);

  useEffect(() => {
    const root = document.documentElement;
    const updateColor = () => {
      const isDark = root.classList.contains("dark");
      setBackgroundColor(isDark ? [0, 0, 0] : [1.0, 1.0, 1.0]);
    };
    updateColor();
    const observer = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "attributes" && m.attributeName === "class") updateColor();
      }
    });
    observer.observe(root, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const gl = glRef.current;
    const program = glProgramRef.current;
    const loc = glBgColorLocationRef.current;
    if (gl && program && loc) {
      gl.useProgram(program);
      gl.uniform3fv(loc, new Float32Array(backgroundColor));
    }
  }, [backgroundColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;
    glRef.current = gl;

    const vs = `attribute vec2 aPosition; void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
    const fs = `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform vec3 uBackgroundColor;
      mat2 rotate2d(float angle){ float c=cos(angle),s=sin(angle); return mat2(c,-s,s,c); }
      float variation(vec2 v1,vec2 v2,float strength,float speed){ return sin(dot(normalize(v1),normalize(v2))*strength+iTime*speed)/100.0; }
      vec3 paintCircle(vec2 uv,vec2 center,float rad,float width){
        vec2 diff = center-uv;
        float len = length(diff);
        len += variation(diff,vec2(0.,1.),5.,2.);
        len -= variation(diff,vec2(1.,0.),5.,2.);
        float circle = smoothstep(rad-width,rad,len)-smoothstep(rad,rad+width,len);
        return vec3(circle);
      }
      void main(){
        vec2 uv = gl_FragCoord.xy/iResolution.xy;
        uv.x *= 1.5; uv.x -= 0.25;
        float mask = 0.0;
        float radius = .35;
        vec2 center = vec2(.5);
        mask += paintCircle(uv,center,radius,.035).r;
        mask += paintCircle(uv,center,radius-.018,.01).r;
        mask += paintCircle(uv,center,radius+.018,.005).r;
        vec2 v=rotate2d(iTime)*uv;
        vec3 foregroundColor=vec3(v.x,v.y,.7-v.y*v.x);
        vec3 color=mix(uBackgroundColor,foregroundColor,mask);
        color=mix(color,vec3(1.),paintCircle(uv,center,radius,.003).r);
        gl_FragColor=vec4(color,1.);
      }`;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error("shader create failed");
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(sh) ?? "compile error");
      return sh;
    };
    const program = gl.createProgram();
    if (!program) throw new Error("program create failed");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program); gl.useProgram(program);
    glProgramRef.current = program;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(ap);
    gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

    const iTimeLoc = gl.getUniformLocation(program, "iTime");
    const iResLoc  = gl.getUniformLocation(program, "iResolution");
    glBgColorLocationRef.current = gl.getUniformLocation(program, "uBackgroundColor");
    gl.uniform3fv(glBgColorLocationRef.current, new Float32Array(backgroundColor));

    let rafId: number;
    const render = (t: number) => {
      gl.uniform1f(iTimeLoc, t * 0.001);
      gl.uniform2f(iResLoc, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(render);
    };
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    };
    resize();
    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(render);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(rafId); };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full block z-0" />;
};

/* ── exported types ───────────────────────────────────────── */

export interface PricingCardProps {
  planName: string;
  description: string;
  price: string;
  period?: string;
  features: string[];
  /** Optional rendered action node — overrides buttonText/buttonVariant */
  action?: React.ReactNode;
  buttonText?: string;
  isPopular?: boolean;
  buttonVariant?: "primary" | "secondary";
}

/* ── PricingCard — exact original glassmorphism classes ───── */

export const PricingCard = ({
  planName, description, price, features,
  action, buttonText, isPopular = false, buttonVariant = "primary",
}: PricingCardProps) => {
  const cardCls = [
    "backdrop-blur-[14px] bg-gradient-to-br rounded-2xl shadow-xl flex-1 max-w-xs px-7 py-8 flex flex-col transition-all duration-300",
    "from-black/5 to-black/0 border border-black/10",
    "dark:from-white/10 dark:to-white/5 dark:border-white/10 dark:backdrop-brightness-[0.91]",
    isPopular
      ? "scale-105 relative ring-2 ring-blue-400/20 dark:from-white/20 dark:to-white/10 dark:border-blue-400/30 shadow-2xl"
      : "",
  ].join(" ").trim();

  const btnCls = [
    "mt-auto w-full py-2.5 rounded-xl font-semibold text-[14px] transition font-sans",
    buttonVariant === "primary"
      ? "bg-blue-500 hover:bg-blue-400 text-white"
      : "bg-black/10 hover:bg-black/20 text-zinc-100 border border-black/20 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20",
  ].join(" ").trim();

  return (
    <div className={cardCls}>
      {isPopular && (
        <div className="absolute -top-4 right-4 px-3 py-1 text-[12px] font-semibold rounded-full bg-blue-500 text-white">
          Популярный
        </div>
      )}

      <div className="mb-3">
        {/* font-display removed — uses Geist (site font) */}
        <h2 className="text-[48px] font-extralight tracking-[-0.03em] text-zinc-100">{planName}</h2>
        <p className="text-[16px] text-zinc-100/70 mt-1">{description}</p>
      </div>

      <div className="my-6 flex items-baseline gap-2">
        <span className="text-[48px] font-extralight text-zinc-100">${price}</span>
        <span className="text-[14px] text-zinc-100/70">/mo</span>
      </div>

      {/* original gradient divider */}
      <div className="w-full mb-5 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.1)_50%,transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.09)_20%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.09)_80%,transparent)]" />

      <ul className="flex flex-col gap-2 text-[14px] text-zinc-100/90 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2">
            <CheckIcon className="text-blue-400 w-4 h-4 shrink-0" />{f}
          </li>
        ))}
      </ul>

      {action
        ? <div className="mt-auto">{action}</div>
        : buttonText
          ? <RippleButton className={btnCls}>{buttonText}</RippleButton>
          : null}
    </div>
  );
};

/* ── full page component ──────────────────────────────────── */

interface ModernPricingPageProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  plans?: PricingCardProps[];
  cards?: React.ReactNode;
  userBlock?: React.ReactNode;
  footer?: React.ReactNode;
  showAnimatedBackground?: boolean;
}

export const ModernPricingPage = ({
  title, subtitle, plans, cards,
  userBlock, footer, showAnimatedBackground = true,
}: ModernPricingPageProps) => (
  <div className="bg-zinc-950 text-zinc-100 min-h-screen w-full overflow-x-hidden">
    {showAnimatedBackground && <ShaderCanvas />}
    <main className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl mx-auto text-center mb-14">
        <h1 className="text-[48px] md:text-[64px] font-extralight leading-tight tracking-[-0.03em] bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-300 to-blue-500">
          {title}
        </h1>
        <p className="mt-3 text-[16px] md:text-[20px] text-zinc-100/80 max-w-2xl mx-auto">
          {subtitle}
        </p>
        {userBlock && <div className="mt-6 flex justify-center">{userBlock}</div>}
      </div>

      <div className="flex flex-col md:flex-row gap-8 md:gap-6 justify-center items-center w-full max-w-4xl">
        {cards ?? plans?.map((p) => <PricingCard key={p.planName} {...p} />)}
      </div>

      {footer && <div className="mt-8 text-center">{footer}</div>}
    </main>
  </div>
);
