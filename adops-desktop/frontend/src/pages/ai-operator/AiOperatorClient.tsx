import { Bot, CheckCircle, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
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
  provider: string;
  apiKey: string;
  model: string;
}

// ─── Example prompts ─────────────────────────────────────────────────────────

const EXAMPLES = [
  "Покажи проблемные кабинеты, которые не готовы к запуску",
  "Создай пул для GEO DE из активных кабинетов",
  "Запусти health check для всех кабинетов",
  "Покажи последние действия в workspace",
  "Открой страницу Автоскейл",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mkid() {
  return Math.random().toString(36).slice(2);
}

function riskColor(risk: string) {
  switch (risk) {
    case "dangerous": return "text-danger";
    case "write":     return "text-warn";
    case "read":      return "text-success";
    default:          return "text-muted";
  }
}

function riskBadge(risk: string) {
  const cls = {
    read:      "bg-success/10 text-success border-success/20",
    prepare:   "bg-brand/10 text-brand border-brand/20",
    write:     "bg-warn/10 text-warn border-warn/20",
    dangerous: "bg-danger/10 text-danger border-danger/20",
  }[risk] ?? "bg-raised text-muted border-stroke";
  return cls;
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
        summary = `Открываю: ${r.label ?? r.page ?? ""}`;
        break;
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
  const [form, setForm] = useState<AIConfig>({
    provider: config.provider || "anthropic",
    apiKey:   config.apiKey || "",
    model:    config.model || "claude-haiku-4-5-20251001",
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveAIConfig(form.provider, form.apiKey, form.model);
      onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-stroke bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-brand" />
        <span className="text-[13px] font-semibold text-ink">Настройки AI Operator</span>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-muted hover:text-ink"><X size={14} /></button>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Provider</label>
        <select
          className="w-full rounded border border-stroke bg-surface px-2 py-1.5 text-[12px] text-ink focus:outline-none focus:ring-1 focus:ring-brand"
          value={form.provider}
          onChange={e => setForm({ ...form, provider: e.target.value })}
        >
          <option value="anthropic">Anthropic (Claude)</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted">API Key</label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            placeholder="sk-ant-..."
            value={form.apiKey}
            onChange={e => setForm({ ...form, apiKey: e.target.value })}
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
          Получите ключ на{" "}
          <span className="text-brand">console.anthropic.com</span>
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Модель</label>
        <select
          className="w-full rounded border border-stroke bg-surface px-2 py-1.5 text-[12px] text-ink focus:outline-none focus:ring-1 focus:ring-brand"
          value={form.model}
          onChange={e => setForm({ ...form, model: e.target.value })}
        >
          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (быстрый)</option>
          <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (умный)</option>
        </select>
      </div>

      <Button onClick={handleSave} disabled={saving || !form.apiKey}>
        {saving ? <><Loader2 size={12} className="animate-spin" /> Сохранение...</> : "Сохранить"}
      </Button>
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [thinking, setThinking] = useState(false);
  const [config, setConfig]     = useState<AIConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [convID]                = useState(() => mkid());
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Load config on mount
  useEffect(() => {
    api.getAIConfig().then((cfg: AIConfig) => {
      setConfig(cfg);
      if (!cfg.apiKey) setShowConfig(true);
    });
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

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
      if (res.navigateTo) {
        navigate(res.navigateTo);
      }
    } catch (e: unknown) {
      addMsg({ id: mkid(), kind: "error", error: String(e), convID });
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  async function handleConfirm(actionID: string, cID: string) {
    // Remove the pending card
    setMessages(prev => prev.map(m =>
      m.kind === "pending" && m.pending?.id === actionID
        ? { ...m, kind: "thinking" as MsgKind }
        : m
    ));
    setThinking(true);
    try {
      const res = await api.confirmAIAction(actionID, cID);
      // Remove the placeholder thinking
      setMessages(prev => prev.filter(m => !(m.kind === "thinking")));
      if (res.toolsExecuted?.length) {
        addMsg({ id: mkid(), kind: "tools", tools: res.toolsExecuted, convID: cID });
      }
      if (res.reply) {
        addMsg({ id: mkid(), kind: "assistant", text: res.reply, convID: cID });
      }
      if (res.error) {
        addMsg({ id: mkid(), kind: "error", error: res.error, convID: cID });
      }
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

  async function clearConversation() {
    await api.clearAIConversation(convID);
    setMessages([]);
  }

  const hasApiKey = config?.apiKey;

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col space-y-3">
      <PageHeader
        title="AI Operator"
        subtitle="Управляй workspace через текстовый промпт"
        icon={Bot}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowConfig(v => !v)}>
              <Sparkles size={13} /> Настройки
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearConversation}>
                <Trash2 size={13} /> Очистить
              </Button>
            )}
          </>
        }
      />

      {/* Config panel */}
      {showConfig && config && (
        <ConfigPanel
          config={config}
          onSave={cfg => { setConfig(cfg); setShowConfig(false); }}
          onClose={hasApiKey ? () => setShowConfig(false) : undefined}
        />
      )}

      {/* No API key warning */}
      {!hasApiKey && !showConfig && (
        <div className="rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-[13px] text-warn">
          Укажите API ключ в{" "}
          <button onClick={() => setShowConfig(true)} className="underline hover:no-underline">
            Настройках AI Operator
          </button>{" "}
          чтобы начать работу.
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-stroke bg-card">
        {messages.length === 0 && !thinking ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <Bot size={28} className="text-brand" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-ink">Как могу помочь?</p>
              <p className="mt-1 text-[12px] text-muted">
                Напиши задачу на русском и AI выполнит её через инструменты
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="rounded-full border border-stroke bg-raised px-3 py-1.5 text-[12px] text-muted hover:border-brand/40 hover:bg-brand/5 hover:text-brand transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="space-y-4 px-5 py-5">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
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

      {/* Input composer */}
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${thinking ? "border-stroke bg-card opacity-60" : "border-stroke bg-card"}`}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          placeholder={hasApiKey ? "Напиши задачу или вопрос..." : "Сначала настройте API ключ..."}
          disabled={thinking || !hasApiKey}
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => void send(input)}
          disabled={thinking || !input.trim() || !hasApiKey}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {thinking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
