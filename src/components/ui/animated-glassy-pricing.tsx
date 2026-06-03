"use client";
import React, { useRef, useEffect } from "react";
import { RippleButton } from "@/components/ui/multi-type-ripple-buttons";

/* ── WebGL animated background ──────────────────────────── */
function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
    const fs = `
      precision highp float;
      uniform float t;uniform vec2 r;
      mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
      float vary(vec2 v1,vec2 v2,float str,float spd){
        return sin(dot(normalize(v1),normalize(v2))*str+t*spd)/100.;
      }
      vec3 circle(vec2 uv,vec2 ctr,float rad,float w){
        vec2 d=ctr-uv;float len=length(d);
        len+=vary(d,vec2(0.,1.),5.,2.);
        len-=vary(d,vec2(1.,0.),5.,2.);
        float c=smoothstep(rad-w,rad,len)-smoothstep(rad,rad+w,len);
        return vec3(c);
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/r;
        uv.x*=1.5;uv.x-=.25;
        float m=0.;float rad=.35;vec2 ctr=vec2(.5);
        m+=circle(uv,ctr,rad,.035).r;
        m+=circle(uv,ctr,rad-.018,.01).r;
        m+=circle(uv,ctr,rad+.018,.005).r;
        vec2 v=rot(t)*uv;
        vec3 fg=vec3(v.x*.4+.3,v.y*.3+.2,.9-v.y*v.x);
        vec3 bg=vec3(0.055,0.055,0.07);
        vec3 col=mix(bg,fg,m);
        col=mix(col,vec3(1.),circle(uv,ctr,rad,.003).r);
        gl_FragColor=vec4(col,1.);
      }`;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src); gl.compileShader(sh); return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const tLoc = gl.getUniformLocation(prog, "t");
    const rLoc = gl.getUniformLocation(prog, "r");

    let raf: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = (time: number) => {
      gl.uniform1f(tLoc, time * 0.001);
      gl.uniform2f(rLoc, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}

/* ── check icon ─────────────────────────────────────────── */
function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0 text-blue-400">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* ── pricing card ───────────────────────────────────────── */
export interface PricingCardProps {
  planName: string;
  description: string;
  price: string;
  period?: string;
  features: string[];
  action: React.ReactNode;
  isPopular?: boolean;
}

export function PricingCard({ planName, description, price, period = "/mo", features, action, isPopular }: PricingCardProps) {
  return (
    <div
      className={[
        "relative flex flex-col flex-1 max-w-sm rounded-2xl px-7 py-8",
        "backdrop-blur-[14px] border transition-all duration-300",
        "bg-gradient-to-br from-white/8 to-white/3 border-white/10",
        isPopular
          ? "scale-[1.04] shadow-2xl ring-1 ring-blue-500/30 border-blue-500/30 from-white/14 to-white/6"
          : "shadow-xl hover:border-white/20",
      ].join(" ")}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-lg shadow-blue-900/30">
            Популярный
          </span>
        </div>
      )}

      <div className="mb-3">
        <h2 className="text-[42px] font-extralight tracking-tight text-zinc-100 leading-none">{planName}</h2>
        <p className="mt-2 text-[14px] text-zinc-400">{description}</p>
      </div>

      <div className="my-5 flex items-baseline gap-1.5">
        <span className="text-[44px] font-extralight text-zinc-100">${price}</span>
        <span className="text-[13px] text-zinc-500">{period}</span>
      </div>

      <div className="mb-5 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      <ul className="mb-7 flex flex-col gap-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-300">
            <Check />{f}
          </li>
        ))}
      </ul>

      <div className="mt-auto">{action}</div>
    </div>
  );
}

/* ── page layout with shader bg ─────────────────────────── */
interface PricingLayoutProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  userBlock?: React.ReactNode;
  cards: React.ReactNode;
  footer?: React.ReactNode;
  showBackground?: boolean;
}

export function PricingLayout({ title, subtitle, userBlock, cards, footer, showBackground = true }: PricingLayoutProps) {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {showBackground && <ShaderCanvas />}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-5xl mx-auto text-center mb-12">
          <h1
            className="text-[48px] md:text-[60px] font-extralight leading-tight tracking-tight"
            style={{
              background: "linear-gradient(135deg, #e0e7ff 0%, #60a5fa 40%, #818cf8 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-3 text-[16px] text-zinc-400 max-w-xl mx-auto">{subtitle}</p>}
          {userBlock && <div className="mt-6 flex justify-center">{userBlock}</div>}
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch w-full max-w-4xl">
          {cards}
        </div>

        {footer && <div className="mt-8 text-center">{footer}</div>}
      </main>
    </div>
  );
}

/* ── action button helper (client-side for ripple) ──────── */
interface ActionBtnProps {
  href?: string;
  type?: "submit" | "button";
  variant?: "primary" | "secondary" | "disabled";
  children: React.ReactNode;
}

export function PricingActionBtn({ href, type = "button", variant = "secondary", children }: ActionBtnProps) {
  const base = "block w-full rounded-xl py-2.5 text-center text-[14px] font-semibold transition-all";
  const styles = {
    primary:   `${base} bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30`,
    secondary: `${base} bg-white/8 text-zinc-200 border border-white/12 hover:bg-white/14 hover:border-white/20`,
    disabled:  `${base} bg-white/5 text-zinc-500 border border-white/8 cursor-default`,
  };
  if (variant === "disabled") return <button disabled className={styles.disabled}>{children}</button>;
  if (href) return <a href={href} className={styles[variant]}>{children}</a>;
  return <RippleButton type={type} className={styles[variant]}>{children}</RippleButton>;
}
