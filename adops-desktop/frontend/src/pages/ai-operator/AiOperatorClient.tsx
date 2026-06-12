import {
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Input, PageHeader } from "@/components/ui";
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
  expiresAt: string;
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

interface AIConfig {
  groqApiKey: string;
}

// ─── Slash command catalogue ──────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { cmd: "/статус",           hint: "",                          desc: "Обзор workspace" },
  { cmd: "/кабинеты",         hint: "[ready|blocked|поиск]",    desc: "Поиск кабинетов" },
  { cmd: "/кабинеты ready",   hint: "",                          desc: "Только готовые к заливу" },
  { cmd: "/кабинеты blocked", hint: "",                          desc: "Заблокированные" },
  { cmd: "/health",           hint: "",                          desc: "Health check всех кабинетов" },
  { cmd: "/пул ",             hint: "[название]",                desc: "Создать пул" },
  { cmd: "/пул добавить ",    hint: "[пул] [ready|blocked]",     desc: "Добавить кабинеты в пул" },
  { cmd: "/лог",              hint: "[N]",                       desc: "Последние N действий" },
  { cmd: "/объясни ",         hint: "[название кабинета]",       desc: "Анализ readiness" },
  { cmd: "/открой ",          hint: "[страница]",                desc: "Перейти на страницу" },
  { cmd: "/помощь",           hint: "",                          desc: "Список всех команд" },
];

const EXAMPLES = [
  "/статус",
  "/кабинеты ready",
  "/health",
  "/лог 20",
  "/объясни ",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mkid() {
  return Math.random().toString(36).slice(2);
}

function riskBadge(risk: string) {
  return ({
    read:      "bg-success/10 text-success border-success/20",
    prepare:   "bg-brand/10 text-brand border-brand/20",
    write:     "bg-warn/10 text-warn border-warn/20",
    dangerous: "bg-danger/10 text-danger border-danger/20",
  } as Record<string, string>)[risk] ?? "bg-raised text-muted border-stroke";
}

// ─── Tool result renderer ────────────────────────────────────────────────────

function ToolResultView({ exec }: { exec: ToolExecution }) {
  const [open, setOpen] = useState(false);
  const r = exec.result as Record<string, unknown> | null;

  let summary = "";
  if (exec.error) {
    summary = `Ошибка: ${exec.error}`;
  } else if (r) {
    switch (exec.toolName) {
      case "accounts_search":
        summary = `Найдено кабинетов: ${r.count ?? 0}`;
        break;
      case "accounts_explain_readiness":
        summary = `${r.name ?? ""} — ${r.readinessStatus ?? ""} (${r.readinessScore ?? 0})`;
        break;
      case "pools_create":
        summary = `Создан пул «${r.name ?? ""}»`;
        break;
      case "pools_add_accounts":
        summary = `Добавлено ${r.added ?? 0} кабинетов в пул «${r.poolName ?? ""}»`;
        break;
      case "health_run_bulk":
        summary = `Health Check: ${r.ok ?? 0} ОК, ${r.issues ?? 0} с проблемами`;
        break;
      case "audit_recent":
        summary = `Последние ${r.count ?? 0} действий`;
        break;
      case "navigation_open_page":
        summary = `Открываю: ${(r.label as string) ?? r.page ?? ""}`;
        break;
      case "workspace_status": {
        const total = r.totalAccounts ?? 0;
        const ready = r.ready ?? 0;
        const na = r.needsAttention ?? 0;
        const blk = r.blocked ?? 0;
        const pools = r.poolCount ?? 0;
        const today = r.actionsToday ?? 0;
        summary = `Кабинетов: ${total} (${ready} READY · ${na} внимание · ${blk} блок) · Пулов: ${pools} · Действий сегодня: ${today}`;
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

function PendingCard({
  msg,
  onConfirm,
  onCancel,
}: {
  msg: ChatMessage;
  onConfirm: (actionID: string, convID: string) => void;
  onCancel: (actionID: string) => void;
}) {
  const pa = msg.pending!;
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={13} className="text-warn" />
        <span className="text-[12px] font-semibold text-warn">Требуется подтверждение</span>
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

// ─── Config panel ─────────────────────────────────────────────────────────────

function ConfigPanel({
  config,
  onSave,
  onClose,
}: {
  config: AIConfig;
  onSave: (c: AIConfig) => void;
  onClose?: () => void;
}) {
  const [groqKey, setGroqKey] = useState(config.groqApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving]   = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveAIConfig(groqKey);
      onSave({ groqApiKey: groqKey });
      if (onClose) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-stroke bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Settings2 size={14} className="text-brand" />
        <span className="text-[13px] font-semibold text-ink">Настройки AI Operator</span>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-muted hover:text-ink">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-[12px] text-success">
        Команды работают без API ключа (0 токенов). Groq нужен только для нераспознанных запросов.
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Groq API Key (опционально)
        </label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            placeholder="gsk_..."
            value={groqKey}
            onChange={e => setGroqKey(e.target.value)}
            className="pr-8"
          />
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <p className="text-[11px] text-muted">
          Бесплатно на console.groq.com · Модель llama-3.3-70b · 14 400 запросов/день
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <><Loader2 size={12} className="animate-spin" /> Сохранение...</> : "Сохранить"}
      </Button>
    </div>
  );
}

// ─── Slash autocomplete ───────────────────────────────────────────────────────

function SlashAutocomplete({
  input,
  activeIdx,
  onSelect,
}: {
  input: string;
  activeIdx: number;
  onSelect: (cmd: string) => void;
}) {
  const token = input.split(" ")[0].toLowerCase();
  const matches = SLASH_COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(token));
  if (!matches.length) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-xl border border-stroke bg-card shadow-lg overflow-hidden">
      {matches.map((c, i) => (
        <button
          key={c.cmd}
          onMouseDown={e => { e.preventDefault(); onSelect(c.cmd); }}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === activeIdx ? "bg-brand/10" : "hover:bg-raised"
          }`}
        >
          <span className="font-mono text-[12px] font-semibold text-brand shrink-0">{c.cmd}</span>
          {c.hint && <span className="text-[11px] text-muted shrink-0">{c.hint}</span>}
          <span className="ml-auto text-[11px] text-muted truncate">{c.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onConfirm,
  onCancel,
}: {
  msg: ChatMessage;
  onConfirm: (actionID: string, convID: string) => void;
  onCancel: (actionID: string) => void;
}) {
  if (msg.kind === "thinking") {
    return (
      <div className="flex items-end gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Bot size={13} className="text-brand" />
        </div>
        <div className="rounded-2xl rounded-bl-sm border border-stroke bg-card px-4 py-2.5">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
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
          {msg.tools.map((exec, i) => (
            <ToolResultView key={i} exec={exec} />
          ))}
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

// ─── Main component ───────────────────────────────────────────────────────────

export function AiOperatorClient() {
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState("");
  const [thinking, setThinking]     = useState(false);
  const [config, setConfig]         = useState<AIConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [acIdx, setAcIdx]           = useState(0);
  const [convID]                    = useState(() => mkid());
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAIConfig().then((cfg: AIConfig) => setConfig(cfg));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Reset autocomplete index when input changes.
  useEffect(() => { setAcIdx(0); }, [input]);

  const showAc = input.startsWith("/") && (() => {
    const token = input.split(" ")[0].toLowerCase();
    return SLASH_COMMANDS.some(c => c.cmd.toLowerCase().startsWith(token));
  })();

  function addMsg(msg: ChatMessage) {
    setMessages(prev => [...prev, msg]);
  }

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
      if (res.toolsExecuted?.length) {
        addMsg({ id: mkid(), kind: "tools", tools: res.toolsExecuted, convID });
      }
      if (res.reply) {
        addMsg({ id: mkid(), kind: "assistant", text: res.reply, convID });
      }
      if (res.pendingAction) {
        addMsg({ id: mkid(), kind: "pending", pending: res.pendingAction, convID });
      }
      if (res.error) {
        addMsg({ id: mkid(), kind: "error", error: res.error, convID });
      }
      if (res.navigateTo) navigate(res.navigateTo);
    } catch (e: unknown) {
      addMsg({ id: mkid(), kind: "error", error: String(e), convID });
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  async function handleConfirm(actionID: string, cID: string) {
    setMessages(prev => prev.map(m =>
      m.kind === "pending" && m.pending?.id === actionID
        ? { ...m, kind: "thinking" as MsgKind }
        : m
    ));
    setThinking(true);
    try {
      const res = await api.confirmAIAction(actionID, cID);
      setMessages(prev => prev.filter(m => m.kind !== "thinking"));
      if (res.toolsExecuted?.length) addMsg({ id: mkid(), kind: "tools", tools: res.toolsExecuted, convID: cID });
      if (res.reply) addMsg({ id: mkid(), kind: "assistant", text: res.reply, convID: cID });
      if (res.error) addMsg({ id: mkid(), kind: "error", error: res.error, convID: cID });
      if (res.navigateTo) navigate(res.navigateTo);
    } catch (e: unknown) {
      setMessages(prev => prev.filter(m => m.kind !== "thinking"));
      addMsg({ id: mkid(), kind: "error", error: String(e), convID: cID });
    } finally {
      setThinking(false);
    }
  }

  async function handleCancel(actionID: string) {
    await api.cancelAIAction(actionID);
    setMessages(prev => prev.filter(m => !(m.kind === "pending" && m.pending?.id === actionID)));
    addMsg({ id: mkid(), kind: "assistant", text: "Операция отменена.", convID });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showAc) {
      const token = input.split(" ")[0].toLowerCase();
      const matches = SLASH_COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(token));
      if (e.key === "ArrowDown") { e.preventDefault(); setAcIdx(i => Math.min(i + 1, matches.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setAcIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || (e.key === "ArrowRight" && input === input.split(" ")[0])) {
        e.preventDefault();
        const sel = matches[acIdx];
        if (sel) setInput(sel.cmd);
        return;
      }
      if (e.key === "Escape") { setInput(""); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
  }

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col space-y-3">
      <PageHeader
        title="AI Operator"
        subtitle="Управляй workspace через команды — 0 токенов для стандартных операций"
        icon={Bot}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowConfig(v => !v)}>
              <Settings2 size={13} /> Настройки
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={async () => {
                await api.clearAIConversation(convID);
                setMessages([]);
              }}>
                <Trash2 size={13} /> Очистить
              </Button>
            )}
          </>
        }
      />

      {showConfig && config && (
        <ConfigPanel
          config={config}
          onSave={cfg => { setConfig(cfg); setShowConfig(false); }}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-stroke bg-card">
        {messages.length === 0 && !thinking ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <Bot size={28} className="text-brand" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-ink">AI Operator</p>
              <p className="mt-1 text-[12px] text-muted">
                Используй команды — или пиши свободно (нужен Groq ключ)
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="rounded-full border border-stroke bg-raised px-3 py-1.5 font-mono text-[12px] text-muted hover:border-brand/40 hover:bg-brand/5 hover:text-brand transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted">↑ Кликни или напиши свою команду · Tab для автодополнения</p>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} onConfirm={handleConfirm} onCancel={handleCancel} />
            ))}
            {thinking && (
              <MessageBubble
                msg={{ id: "thinking", kind: "thinking", convID }}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer with slash autocomplete */}
      <div className="relative">
        {showAc && (
          <SlashAutocomplete
            input={input}
            activeIdx={acIdx}
            onSelect={cmd => { setInput(cmd); inputRef.current?.focus(); }}
          />
        )}
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
          thinking ? "border-stroke bg-card opacity-60" : "border-stroke bg-card"
        }`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Команда (/статус) или вопрос..."
            disabled={thinking}
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => void send(input)}
            disabled={thinking || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {thinking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
