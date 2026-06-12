import { Bot, CheckCircle, ChevronDown, ChevronUp, Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import * as api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolExecution {
  toolName: string;
  label: string;
  risk: "read" | "prepare" | "write" | "dangerous";
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

interface PendingAction {
  id: string;
  summary: string;
  risk: "read" | "prepare" | "write" | "dangerous";
  label: string;
}

type MsgKind = "user" | "assistant" | "tools" | "pending" | "error" | "thinking";

interface ChatMessage {
  id: string;
  kind: MsgKind;
  text?: string;
  tools?: ToolExecution[];
  pending?: PendingAction;
  error?: string;
  convID: string;
}

const EXAMPLES = [
  "Сколько у меня кабинетов?",
  "Покажи готовые к заливу",
  "Запусти health check",
  "Что происходило в последнее время?",
];

function mkid() { return Math.random().toString(36).slice(2); }

function riskBadge(risk: string) {
  return ({
    read:      "bg-success/10 text-success border-success/20",
    prepare:   "bg-brand/10 text-brand border-brand/20",
    write:     "bg-warn/10 text-warn border-warn/20",
    dangerous: "bg-danger/10 text-danger border-danger/20",
  } as Record<string, string>)[risk] ?? "bg-raised text-muted border-stroke";
}

// ─── Tool result card ─────────────────────────────────────────────────────────

function ToolResultView({ exec }: { exec: ToolExecution }) {
  const [open, setOpen] = useState(false);
  const r = exec.result as Record<string, unknown> | null;

  let summary = "";
  if (exec.error) {
    summary = `Ошибка: ${exec.error}`;
  } else if (r) {
    switch (exec.toolName) {
      case "accounts_search":
        summary = `Найдено: ${r.count ?? 0} кабинетов`;
        break;
      case "accounts_explain_readiness":
        summary = `${r.name ?? ""} — ${r.readinessStatus ?? ""} (${r.readinessScore ?? 0})`;
        break;
      case "pools_create":
        summary = `Создан пул «${r.name ?? ""}»`;
        break;
      case "pools_add_accounts":
        summary = `Добавлено ${r.added ?? 0} из ${r.total ?? 0} кабинетов в «${r.poolName ?? ""}»`;
        break;
      case "health_run_bulk":
        summary = `Health: ${r.ok ?? 0} ОК · ${r.issues ?? 0} с проблемами из ${r.total ?? 0}`;
        break;
      case "audit_recent":
        summary = `Последние ${r.count ?? 0} действий`;
        break;
      case "navigation_open_page":
        summary = `Переход: ${(r.label as string) ?? r.page ?? ""}`;
        break;
      case "workspace_status": {
        const t = r.totalAccounts ?? 0, rd = r.ready ?? 0, na = r.needsAttention ?? 0, bl = r.blocked ?? 0;
        summary = `${t} кабинетов · ${rd} READY · ${na} внимание · ${bl} блок · ${r.poolCount ?? 0} пулов`;
        break;
      }
      default:
        summary = JSON.stringify(r).slice(0, 80);
    }
  }

  return (
    <div className={`rounded-lg border px-3 py-2 text-[12px] ${exec.error ? "border-danger/30 bg-danger/5" : "border-stroke bg-raised"}`}>
      <div className="flex items-center gap-2">
        <CheckCircle size={12} className={exec.error ? "text-danger" : "text-success"} />
        <span className="font-medium text-ink">{exec.label}</span>
        <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${riskBadge(exec.risk)}`}>
          {exec.risk}
        </span>
        {r && (
          <button onClick={() => setOpen(v => !v)} className="text-muted hover:text-ink">
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      <p className="mt-1 text-muted">{summary}</p>
      {open && r && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-surface p-2 text-[11px] text-muted whitespace-pre-wrap">
          {JSON.stringify(r, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Pending action card ─────────────────────────────────────────────────────

function PendingCard({ msg, onConfirm, onCancel }: {
  msg: ChatMessage;
  onConfirm: (id: string, convID: string) => void;
  onCancel: (id: string) => void;
}) {
  const pa = msg.pending!;
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={13} className="text-warn" />
        <span className="text-[12px] font-semibold text-warn">Подтверди действие</span>
        <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${riskBadge(pa.risk)}`}>
          {pa.risk}
        </span>
      </div>
      <p className="text-[12px] text-ink">{pa.summary}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onConfirm(pa.id, msg.convID)}>
          <CheckCircle size={12} /> Выполнить
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onCancel(pa.id)}>
          <X size={12} /> Отмена
        </Button>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, onConfirm, onCancel }: {
  msg: ChatMessage;
  onConfirm: (id: string, convID: string) => void;
  onCancel: (id: string) => void;
}) {
  if (msg.kind === "thinking") {
    return (
      <div className="flex items-end gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Bot size={13} className="text-brand" />
        </div>
        <div className="rounded-2xl rounded-bl-sm border border-stroke bg-card px-4 py-2.5">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (msg.kind === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-[13px] text-brand-fg">
          {msg.text}
        </div>
      </div>
    );
  }
  if (msg.kind === "assistant") {
    return (
      <div className="flex items-end gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Bot size={13} className="text-brand" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-stroke bg-card px-4 py-2.5 text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
          {msg.text}
        </div>
      </div>
    );
  }
  if (msg.kind === "tools" && msg.tools?.length) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Bot size={13} className="text-brand" />
        </div>
        <div className="flex-1 space-y-1.5">
          {msg.tools.map((e, i) => <ToolResultView key={i} exec={e} />)}
        </div>
      </div>
    );
  }
  if (msg.kind === "pending" && msg.pending) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warn/10">
          <Bot size={13} className="text-warn" />
        </div>
        <div className="flex-1">
          <PendingCard msg={msg} onConfirm={onConfirm} onCancel={onCancel} />
        </div>
      </div>
    );
  }
  if (msg.kind === "error") {
    return (
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger/10">
          <Bot size={13} className="text-danger" />
        </div>
        <div className="rounded-2xl rounded-bl-sm border border-danger/30 bg-danger/5 px-4 py-2.5 text-[13px] text-danger">
          {msg.error}
        </div>
      </div>
    );
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AiOperatorClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [thinking, setThinking] = useState(false);
  const [convID]                = useState(() => mkid());
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function addMsg(msg: ChatMessage) { setMessages(p => [...p, msg]); }

  function navigate(page: string) {
    window.dispatchEvent(new CustomEvent("navigate", { detail: page }));
  }

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    setInput("");
    addMsg({ id: mkid(), kind: "user", text: text.trim(), convID });
    setThinking(true);
    try {
      const res = await api.sendAIMessage(text.trim(), convID);
      if (res.toolsExecuted?.length) addMsg({ id: mkid(), kind: "tools", tools: res.toolsExecuted, convID });
      if (res.reply)                 addMsg({ id: mkid(), kind: "assistant", text: res.reply, convID });
      if (res.pendingAction)         addMsg({ id: mkid(), kind: "pending", pending: res.pendingAction, convID });
      if (res.error)                 addMsg({ id: mkid(), kind: "error", error: res.error, convID });
      if (res.navigateTo)            navigate(res.navigateTo);
    } catch (e) {
      addMsg({ id: mkid(), kind: "error", error: String(e), convID });
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  async function handleConfirm(actionID: string, cID: string) {
    setMessages(p => p.map(m =>
      m.kind === "pending" && m.pending?.id === actionID ? { ...m, kind: "thinking" as MsgKind } : m
    ));
    setThinking(true);
    try {
      const res = await api.confirmAIAction(actionID, cID);
      setMessages(p => p.filter(m => m.kind !== "thinking"));
      if (res.toolsExecuted?.length) addMsg({ id: mkid(), kind: "tools", tools: res.toolsExecuted, convID: cID });
      if (res.reply)                 addMsg({ id: mkid(), kind: "assistant", text: res.reply, convID: cID });
      if (res.error)                 addMsg({ id: mkid(), kind: "error", error: res.error, convID: cID });
      if (res.navigateTo)            navigate(res.navigateTo);
    } catch (e) {
      setMessages(p => p.filter(m => m.kind !== "thinking"));
      addMsg({ id: mkid(), kind: "error", error: String(e), convID: cID });
    } finally {
      setThinking(false);
    }
  }

  async function handleCancel(actionID: string) {
    await api.cancelAIAction(actionID);
    setMessages(p => p.filter(m => !(m.kind === "pending" && m.pending?.id === actionID)));
    addMsg({ id: mkid(), kind: "assistant", text: "Операция отменена.", convID });
  }

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col space-y-3">
      <PageHeader
        title="AI Operator"
        subtitle="Пиши на русском — AI сам разберётся что сделать"
        icon={Bot}
        actions={
          messages.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={async () => {
              await api.clearAIConversation(convID);
              setMessages([]);
            }}>
              <Trash2 size={13} /> Очистить
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto rounded-xl border border-stroke bg-card">
        {messages.length === 0 && !thinking ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <Bot size={28} className="text-brand" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-ink">Как могу помочь?</p>
              <p className="mt-1 text-[12px] text-muted">Пиши свободно — AI вызовет нужные инструменты сам</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => void send(ex)}
                  className="rounded-full border border-stroke bg-raised px-3 py-1.5 text-[12px] text-muted hover:border-brand/40 hover:bg-brand/5 hover:text-brand transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} onConfirm={handleConfirm} onCancel={handleCancel} />
            ))}
            {thinking && (
              <MessageBubble msg={{ id: "t", kind: "thinking", convID }} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 border-stroke bg-card ${thinking ? "opacity-60" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          placeholder="Напиши вопрос или задачу..."
          disabled={thinking}
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => void send(input)}
          disabled={thinking || !input.trim()}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        >
          {thinking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
