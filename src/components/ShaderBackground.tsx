"use client";
import { useRef, useEffect, useState } from "react";

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glProgramRef = useRef<WebGLProgram | null>(null);
  const glBgLocRef = useRef<WebGLUniformLocation | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const [bgColor, setBgColor] = useState([0, 0, 0]);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setBgColor(root.classList.contains("dark") ? [0, 0, 0] : [1, 1, 1]);
    update();
    const obs = new MutationObserver(() => update());
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const gl = glRef.current, prog = glProgramRef.current, loc = glBgLocRef.current;
    if (gl && prog && loc) { gl.useProgram(prog); gl.uniform3fv(loc, new Float32Array(bgColor)); }
  }, [bgColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;
    glRef.current = gl;

    const vs = `attribute vec2 aPosition; void main(){ gl_Position=vec4(aPosition,0.,1.); }`;
    const fs = `
      precision highp float;
      uniform float iTime; uniform vec2 iResolution; uniform vec3 uBackgroundColor;
      mat2 rotate2d(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
      float variation(vec2 v1,vec2 v2,float str,float spd){ return sin(dot(normalize(v1),normalize(v2))*str+iTime*spd)/100.; }
      vec3 paintCircle(vec2 uv,vec2 ctr,float rad,float w){
        vec2 d=ctr-uv; float len=length(d);
        len+=variation(d,vec2(0.,1.),5.,2.);
        len-=variation(d,vec2(1.,0.),5.,2.);
        return vec3(smoothstep(rad-w,rad,len)-smoothstep(rad,rad+w,len));
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/iResolution.xy;
        uv.x*=1.5; uv.x-=.25;
        float mask=0.; float radius=.35; vec2 center=vec2(.5);
        mask+=paintCircle(uv,center,radius,.035).r;
        mask+=paintCircle(uv,center,radius-.018,.01).r;
        mask+=paintCircle(uv,center,radius+.018,.005).r;
        vec2 v=rotate2d(iTime)*uv;
        vec3 fg=vec3(v.x,v.y,.7-v.y*v.x);
        vec3 col=mix(uBackgroundColor,fg,mask);
        col=mix(col,vec3(1.),paintCircle(uv,center,radius,.003).r);
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
    glProgramRef.current = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(prog, "aPosition");
    gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

    const tLoc = gl.getUniformLocation(prog, "iTime");
    const rLoc = gl.getUniformLocation(prog, "iResolution");
    glBgLocRef.current = gl.getUniformLocation(prog, "uBackgroundColor");
    gl.uniform3fv(glBgLocRef.current, new Float32Array(bgColor));

    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight); };
    const render = (t: number) => { gl.uniform1f(tLoc, t*.001); gl.uniform2f(rLoc, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLES,0,6); raf=requestAnimationFrame(render); };
    resize(); window.addEventListener("resize", resize); raf = requestAnimationFrame(render);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}
