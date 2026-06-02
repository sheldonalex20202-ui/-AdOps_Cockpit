"use client";
import { useState } from "react";

/* ─── shared primitives ─────────────────────────────────── */
const S = {
  text:  { fontFamily: "system-ui,sans-serif", fontSize: 12 },
  score: (n: number) => n >= 80 ? "#22c55e" : n >= 55 ? "#f59e0b" : "#ef4444",
};

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    green:  "text-emerald-400 bg-emerald-400/10",
    amber:  "text-amber-400  bg-amber-400/10",
    red:    "text-red-400    bg-red-400/10",
    blue:   "text-blue-400   bg-blue-400/10",
    violet: "text-violet-400 bg-violet-400/10",
    neutral:"text-zinc-400   bg-zinc-700/50",
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[color]}`}>
      {label}
    </span>
  );
}

/* ─── screens ───────────────────────────────────────────── */

function ScreenAccounts() {
  const rows = [
    { name:"Media_UA_01", score:94, status:"READY",   geo:"UA", spend:"$2 400" },
    { name:"Media_PL_07", score:87, status:"READY",   geo:"PL", spend:"$1 800" },
    { name:"Adv_DE_12",   score:72, status:"LIMITED",  geo:"DE", spend:"$3 200" },
    { name:"Media_FR_03", score:91, status:"READY",   geo:"FR", spend:"$980"   },
    { name:"Adv_UK_05",   score:65, status:"LIMITED",  geo:"UK", spend:"$2 100" },
    { name:"Media_CZ_09", score:88, status:"READY",   geo:"CZ", spend:"$1 450" },
    { name:"Promo_IT_02", score:55, status:"ATTENTION",geo:"IT", spend:"$760"  },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 h-10">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-zinc-100">Аккаунты</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">7 активных</span>
        </div>
        <div className="flex gap-2">
          <div className="h-6 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-500 flex items-center">Поиск...</div>
          <div className="h-6 rounded bg-blue-600 px-2.5 text-[11px] font-semibold text-white flex items-center">+ Добавить</div>
        </div>
      </div>
      <div className="flex shrink-0 gap-4 border-b border-zinc-800 px-4 py-2">
        {[["6/7","Health OK","text-emerald-400"],["4","Ready","text-emerald-400"],["2","Limited","text-amber-400"],["1","Проблема","text-red-400"]].map(([v,l,c])=>(
          <div key={l} className="flex items-center gap-1.5">
            <span className={`text-[13px] font-black ${c}`}>{v}</span>
            <span className="text-[10px] text-zinc-600">{l}</span>
          </div>
        ))}
        <div className="ml-auto">
          <div className="h-5 rounded border border-blue-500/30 bg-blue-500/10 px-2 text-[10px] text-blue-400 flex items-center">⚡ Health Check всех</div>
        </div>
      </div>
      <div className="grid shrink-0 border-b border-zinc-800 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
        style={{ gridTemplateColumns:"16px 1fr 60px 80px 70px 50px" }}>
        <span/><span>Кабинет</span><span>Score</span><span>Статус</span><span>Spend</span><span>Гео</span>
      </div>
      <div className="flex-1 overflow-auto">
        {rows.map((r, i) => (
          <div key={r.name} className={`grid items-center border-b border-zinc-800/40 px-4 py-2 hover:bg-zinc-900/50 ${i===0?"bg-zinc-900/30":""}`}
            style={{ gridTemplateColumns:"16px 1fr 60px 80px 70px 50px" }}>
            <input type="checkbox" readOnly checked={i<4} className="h-3 w-3 rounded accent-blue-600"/>
            <span className="truncate text-[12px] font-medium text-zinc-200">{r.name}</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{background:S.score(r.score)}}/>
              <span className="text-[11px] font-semibold tabular-nums" style={{color:S.score(r.score)}}>{r.score}</span>
            </span>
            <Badge label={r.status==="READY"?"Ready":r.status==="LIMITED"?"Limited":"Attention"} color={r.status==="READY"?"green":r.status==="LIMITED"?"amber":"red"}/>
            <span className="text-[11px] text-zinc-400">{r.spend}</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 w-fit">{r.geo}</span>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-900/60 px-4 py-2">
        <span className="text-[11px] text-zinc-500">Выбрано: <span className="text-zinc-300 font-semibold">4 кабинета</span></span>
        <div className="flex gap-2">
          <div className="h-6 rounded border border-zinc-700 px-2.5 text-[11px] text-zinc-400 flex items-center">Health Check</div>
          <div className="h-6 rounded bg-blue-600 px-3 text-[11px] font-semibold text-white flex items-center">🚀 Запустить залив</div>
        </div>
      </div>
    </div>
  );
}

function ScreenLaunch() {
  const [step, setStep] = useState(1);
  const steps = ["Кабинеты","Настройка","Креативы","Запуск"];
  const verticals = [
    { key:"NUTRA",    label:"💊 Нутра",    active:true  },
    { key:"GAMBLING", label:"🎰 Гемблинг", active:false },
    { key:"CRYPTO",   label:"₿ Крипто",   active:false },
    { key:"DATING",   label:"💘 Дейтинг",  active:false },
    { key:"ECOM",     label:"🛍 E-com",    active:false },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 items-center border-b border-zinc-800 px-4 h-10 gap-3">
        <span className="text-[13px] font-semibold text-zinc-100">Автозалив</span>
        <div className="flex items-center gap-1.5 ml-4">
          {steps.map((s,i)=>(
            <div key={s} className="flex items-center gap-1.5">
              <button onClick={()=>setStep(i+1)}
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition-all ${step===i+1?"bg-blue-600 text-white ring-2 ring-blue-600/30":step>i+1?"bg-emerald-500/20 text-emerald-400":"bg-zinc-800 text-zinc-500"}`}>
                {step>i+1?"✓":i+1}
              </button>
              <span className={`text-[10px] ${step===i+1?"text-zinc-200":"text-zinc-600"}`}>{s}</span>
              {i<3 && <span className="text-zinc-700 text-[10px] mx-0.5">›</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {step===1 && (
          <div className="space-y-2">
            <div className="text-[11px] text-zinc-500 mb-3">Выбери кабинеты для залива</div>
            {[["Media_UA_01",94,"UA",true],["Media_PL_07",87,"PL",true],["Media_FR_03",91,"FR",true],["Adv_DE_12",72,"DE",false]].map(([n,s,g,c])=>(
              <div key={n as string} className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-all ${c?"border-blue-500/40 bg-blue-500/5":"border-zinc-800 hover:border-zinc-700"}`}>
                <input type="checkbox" readOnly checked={c as boolean} className="h-3 w-3 accent-blue-600"/>
                <span className="flex-1 text-[12px] text-zinc-200">{n as string}</span>
                <span className="text-[10px] rounded bg-zinc-800 px-1.5 text-zinc-400">{g as string}</span>
                <span className="text-[11px] font-semibold" style={{color:S.score(s as number)}}>{s as number}</span>
              </div>
            ))}
            <button onClick={()=>setStep(2)} className="mt-3 w-full h-7 rounded bg-blue-600 text-[11px] font-semibold text-white hover:bg-blue-500 transition-colors">
              Далее — Настройка →
            </button>
          </div>
        )}
        {step===2 && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-zinc-500 mb-2">Вертикаль</div>
              <div className="flex flex-wrap gap-1.5">
                {verticals.map(v=>(
                  <button key={v.key} className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${v.active?"bg-blue-600 text-white":"bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Структура","CBO"],["Objective","OUTCOME_TRAFFIC"],["Bid Strategy","LOWEST_COST"],["Daily Budget","$50"]].map(([l,v])=>(
                <div key={l as string}>
                  <div className="text-[10px] text-zinc-600 mb-1">{l as string}</div>
                  <div className="h-7 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-300 flex items-center">{v as string}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 mb-1">Название кампании</div>
              <div className="h-7 rounded border border-blue-500/40 bg-zinc-900 px-2 text-[11px] text-blue-300 flex items-center font-mono">NUTRA_&#123;geo&#125;_&#123;date&#125;_FB_001</div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={()=>setStep(1)} className="h-7 rounded border border-zinc-700 px-3 text-[11px] text-zinc-400 hover:bg-zinc-800">← Назад</button>
              <button onClick={()=>setStep(3)} className="flex-1 h-7 rounded bg-blue-600 text-[11px] font-semibold text-white hover:bg-blue-500">Далее — Креативы →</button>
            </div>
          </div>
        )}
        {step===3 && (
          <div className="space-y-2">
            <div className="text-[11px] text-zinc-500 mb-2">Выбери креативы</div>
            <div className="grid grid-cols-2 gap-2">
              {[["before_after_v1","BeforeAfter","Z1","UA",true],["doctor_trust_v2","Доктор","Z1","PL",true],["ugc_real_v3","UGC","Z2","UA",false],["shock_hook_v1","Шок-хук","Z2","DE",true]].map(([name,angle,z,geo,sel])=>(
                <div key={name as string} className={`rounded-lg border p-2 cursor-pointer transition-all ${sel?"border-blue-500/40 bg-blue-500/5":"border-zinc-800 hover:border-zinc-700"}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <input type="checkbox" readOnly checked={sel as boolean} className="h-3 w-3 accent-blue-600"/>
                    <span className="text-[11px] text-zinc-300 truncate">{name as string}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[9px] rounded bg-violet-500/15 text-violet-400 px-1">{angle as string}</span>
                    <span className="text-[9px] rounded bg-zinc-700 text-zinc-400 px-1">{z as string}</span>
                    <span className="text-[9px] rounded bg-zinc-700 text-zinc-400 px-1">{geo as string}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={()=>setStep(2)} className="h-7 rounded border border-zinc-700 px-3 text-[11px] text-zinc-400 hover:bg-zinc-800">← Назад</button>
              <button onClick={()=>setStep(4)} className="flex-1 h-7 rounded bg-blue-600 text-[11px] font-semibold text-white hover:bg-blue-500">Далее — Запуск →</button>
            </div>
          </div>
        )}
        {step===4 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[["3","Кабинета","text-blue-400"],["3","Кр-ва","text-violet-400"],["9","Объявл.","text-emerald-400"]].map(([v,l,c])=>(
                <div key={l as string} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-center">
                  <div className={`text-2xl font-black ${c}`}>{v}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{l as string}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-zinc-800 p-3 space-y-1">
              <div className="text-[10px] text-zinc-500 mb-2">Превью нейминга</div>
              {["NUTRA_UA_2026-06-02_FB_001","NUTRA_PL_2026-06-02_FB_001","NUTRA_FR_2026-06-02_FB_001"].map(n=>(
                <div key={n} className="text-[10px] font-mono text-zinc-400 bg-zinc-900 rounded px-2 py-1">{n}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setStep(3)} className="h-7 rounded border border-zinc-700 px-3 text-[11px] text-zinc-400 hover:bg-zinc-800">← Назад</button>
              <button className="flex-1 h-8 rounded bg-emerald-600 text-[12px] font-bold text-white hover:bg-emerald-500 transition-colors">
                🚀 Запустить залив на 3 кабинета
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenCreatives() {
  const items = [
    { name:"before_after_ua_v1", angle:"До/После",   z:"Z1", geo:"UA", type:"video" },
    { name:"doctor_trust_v2",    angle:"Доктор",     z:"Z1", geo:"PL", type:"video" },
    { name:"ugc_real_story_v3",  angle:"UGC",        z:"Z2", geo:"UA", type:"image" },
    { name:"shock_hook_hook_v1", angle:"Шок-хук",    z:"Z2", geo:"DE", type:"video" },
    { name:"news_style_v4",      angle:"Новостной",  z:"Z3", geo:"FR", type:"image" },
    { name:"testimonial_v2",     angle:"Отзыв",      z:"Z1", geo:"CZ", type:"video" },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 h-10">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-zinc-100">Креативы</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">6 файлов</span>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {["Z1","Z2","Z3"].map(z=>(
              <span key={z} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 cursor-pointer hover:bg-zinc-700">{z}</span>
            ))}
          </div>
          <div className="h-6 rounded bg-blue-600 px-2.5 text-[11px] font-semibold text-white flex items-center">+ Добавить</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-3 gap-2">
          {items.map(c=>(
            <div key={c.name} className="group relative rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 hover:border-zinc-600 transition-all cursor-pointer">
              <div className={`mb-2 h-16 rounded flex items-center justify-center ${c.type==="video"?"bg-violet-500/10":"bg-blue-500/10"}`}>
                <span className="text-2xl">{c.type==="video"?"🎬":"🖼"}</span>
              </div>
              <div className="text-[10px] font-medium text-zinc-300 truncate mb-1.5">{c.name}</div>
              <div className="flex flex-wrap gap-1">
                <span className="text-[9px] rounded bg-violet-500/15 text-violet-400 px-1">{c.angle}</span>
                <span className="text-[9px] rounded bg-zinc-700 text-zinc-400 px-1">{c.z}</span>
                <span className="text-[9px] rounded bg-zinc-700 text-zinc-400 px-1">{c.geo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenHistory() {
  const jobs = [
    { name:"NUTRA_UA_2026-06-01",  ok:47, total:50, struct:"CBO",       status:"PARTIAL"   },
    { name:"GAMBLING_PL_2026-05-30", ok:20, total:20, struct:"Z_GROUPED", status:"COMPLETED" },
    { name:"NUTRA_DE_2026-05-29",  ok:15, total:15, struct:"ABO",       status:"COMPLETED" },
    { name:"CRYPTO_FR_2026-05-28", ok:8,  total:10, struct:"ISOLATION", status:"PARTIAL"   },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 h-10">
        <span className="text-[13px] font-semibold text-zinc-100">История залива</span>
        <div className="flex gap-2 text-[10px] text-zinc-500">
          <span>Всего: <strong className="text-zinc-300">4</strong></span>
          <span>Ср. успех: <strong className="text-emerald-400">94%</strong></span>
          <span>Кабинетов: <strong className="text-zinc-300">95</strong></span>
        </div>
      </div>
      <div className="flex shrink-0 border-b border-zinc-800 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
        style={{gridTemplateColumns:"1fr 80px 70px 70px", display:"grid"}}>
        <span>Запуск</span><span>Структура</span><span>Кабинеты</span><span>Статус</span>
      </div>
      <div className="flex-1 overflow-auto">
        {jobs.map(j=>(
          <div key={j.name} className="grid items-center border-b border-zinc-800/40 px-4 py-2.5 hover:bg-zinc-900/40 cursor-pointer"
            style={{gridTemplateColumns:"1fr 80px 70px 70px"}}>
            <span className="text-[11px] font-medium text-zinc-200 font-mono truncate">{j.name}</span>
            <Badge label={j.struct} color={j.struct==="CBO"?"blue":j.struct==="ABO"?"violet":j.struct==="ISOLATION"?"neutral":"amber"}/>
            <span className={`text-[11px] font-semibold ${j.ok===j.total?"text-emerald-400":"text-amber-400"}`}>{j.ok}/{j.total}</span>
            <Badge label={j.status==="COMPLETED"?"Успех":"Частично"} color={j.status==="COMPLETED"?"green":"amber"}/>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-900/60 px-4 py-2">
        <span className="text-[11px] text-zinc-500">Последний залив: 1 июня 2026</span>
        <div className="h-6 rounded bg-blue-600 px-2.5 text-[11px] font-semibold text-white flex items-center">🔄 Повторить</div>
      </div>
    </div>
  );
}

/* ─── main component ────────────────────────────────────── */
const NAV = [
  { id:"accounts",  label:"Аккаунты"  },
  { id:"launch",    label:"Автозалив" },
  { id:"creatives", label:"Креативы"  },
  { id:"history",   label:"История"   },
];

export function AppMockupInteractive() {
  const [active, setActive] = useState("accounts");

  const screen = {
    accounts:  <ScreenAccounts />,
    launch:    <ScreenLaunch />,
    creatives: <ScreenCreatives />,
    history:   <ScreenHistory />,
  }[active];

  return (
    <div className="flex h-full w-full text-zinc-100 overflow-hidden" style={S.text}>
      {/* Sidebar */}
      <aside className="flex w-[148px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 px-2 py-3">
        <div className="mb-4 flex items-center gap-2 px-1">
          <div className="h-5 w-5 rounded-md bg-blue-600 flex items-center justify-center text-[9px] font-black text-white">A</div>
          <span className="text-[11px] font-semibold text-zinc-100">AdOps Cockpit</span>
        </div>

        {[
          { id:"accounts",  label:"Аккаунты"  },
          { id:"pools",     label:"Пулы"       },
          { id:"creatives", label:"Креативы"  },
          { id:"templates", label:"Шаблоны"   },
          { id:"launch",    label:"Автозалив" },
          { id:"history",   label:"История"   },
          { id:"audit",     label:"Аудит"     },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => NAV.find(n => n.id === id) && setActive(id)}
            className={`mb-0.5 w-full text-left rounded px-2 py-1.5 text-[11px] font-medium transition-colors ${
              active === id
                ? "bg-blue-600/15 text-blue-400"
                : NAV.find(n => n.id === id)
                ? "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                : "text-zinc-600 cursor-default"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="mt-auto px-1">
          <div className="rounded-lg bg-zinc-800/60 p-2">
            <div className="text-[10px] text-zinc-500 mb-1">Pro план</div>
            <div className="text-[11px] text-zinc-300 font-semibold">7 / 50 кабинетов</div>
            <div className="mt-1.5 h-1 w-full rounded-full bg-zinc-700">
              <div className="h-1 rounded-full bg-blue-500" style={{ width: "14%" }} />
            </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
        {/* Tab bar hint */}
        <div className="flex shrink-0 gap-1 border-b border-zinc-800/60 bg-zinc-900/30 px-4 py-1.5">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-all ${
                active === n.id
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {n.label}
            </button>
          ))}
          <span className="ml-auto text-[9px] text-zinc-700 self-center">← нажми для просмотра</span>
        </div>
        {screen}
      </main>
    </div>
  );
}
