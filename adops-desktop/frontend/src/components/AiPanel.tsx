import { AnimatePresence, motion } from "framer-motion";
import {
  Bot, CheckCircle, ChevronDown, ChevronUp, Clock, FileImage,
  History, Loader2, Paperclip, Plus, Send, Sparkles, Trash2, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import * as api from "@/lib/api";
import type { ConvSummary, DisplayMsg } from "@/lib/api";

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

interface AttachedFile {
  name: string;
  dataURL: string;
  isImage: boolean;
  size: number;
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
  file?: { name: string; isImage: boolean; dataURL: string };
}

function mkid() { return Math.random().toString(36).slice(2); }

function riskBadge(risk: string) {
  return ({
    read:      "bg-success/10 text-success border-success/20",
    prepare:   "bg-brand/10 text-brand border-brand/20",
    write:     "bg-warn/10 text-warn border-warn/20",
    dangerous: "bg-danger/10 text-danger border-danger/20",
  } as Record<string, string>)[risk] ?? "bg-raised text-muted border-stroke";
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 1) return "только что";
  if (diffH < 24) return `${Math.floor(diffH)}ч`;
  if (diffH < 48) return "вчера";
  if (diffH < 168) return `${Math.floor(diffH / 24)} дн.`;
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

// ─── Tool result card ─────────────────────────────────────────────────────────

function ToolResultView({ exec }: { exec: ToolExecution }) {
  const [open, setOpen] = useState(false);
  const r = exec.result as Record<string, unknown> | null;

  let summary = "";
  if (exec.error) { summary = `Ошибка: ${exec.error}`; }
  else if (r) {
    switch (exec.toolName) {
      case "accounts_search":        summary = `Найдено: ${r.count ?? 0} кабинетов`; break;
      case "accounts_delete":        summary = `Удалено ${r.deleted ?? 0} кабинетов`; break;
      case "accounts_explain_readiness": summary = `${r.name ?? ""} — ${r.readinessStatus ?? ""}`; break;
      case "pools_list": {
        const pools = r.pools as Array<{name: string; accountCount: number}> ?? [];
        summary = pools.length ? pools.map(p => `«${p.name}» (${p.accountCount})`).join(", ") : "Пулов нет";
        break;
      }
      case "pools_create":           summary = `Создан пул «${r.name ?? ""}»`; break;
      case "pools_rename":           summary = "Пул обновлён"; break;
      case "pools_delete":           summary = "Пул удалён"; break;
      case "pools_add_accounts":     summary = `Добавлено ${r.added ?? 0} из ${r.total ?? 0} в «${r.poolName ?? ""}»`; break;
      case "pools_remove_accounts":  summary = `Убрано ${r.removed ?? 0} из пула`; break;
      case "pools_clear":            summary = `Очищено ${r.cleared ?? 0} записей`; break;
      case "creatives_list":         summary = `${r.count ?? 0} креативов`; break;
      case "creatives_delete":       summary = `Удалено ${r.deleted ?? 0} креативов`; break;
      case "templates_list":         summary = `${r.count ?? 0} шаблонов`; break;
      case "templates_delete":       summary = `Удалено ${r.deleted ?? 0} шаблонов`; break;
      case "launch_jobs_list":       summary = `${r.count ?? 0} заданий`; break;
      case "health_run_bulk":        summary = `Health: ${r.ok ?? 0} ОК · ${r.issues ?? 0} проблем из ${r.total ?? 0}`; break;
      case "audit_recent":           summary = `${r.count ?? 0} записей аудита`; break;
      case "navigation_open_page":   summary = `Переход: ${(r.label as string) ?? r.page ?? ""}`; break;
      case "workspace_status": {
        const t = r.totalAccounts ?? 0, rd = r.ready ?? 0, bl = r.blocked ?? 0;
        summary = `${t} кабинетов · ${rd} READY · ${bl} BLOCKED · ${r.poolCount ?? 0} пулов`;
        break;
      }
      case "autocontrol_get":
      case "autocontrol_set":        summary = `Автоконтроль: ${r.enabled ? "включён" : "выключен"} · ${r.intervalMinutes ?? 20} мин`; break;
      case "autocontrol_run":        summary = `${r.paused ?? 0} пауз · ${r.resumed ?? 0} возобновлено`; break;
      case "autoscale_get":
      case "autoscale_set":          summary = `Автоскейл: ${r.enabled ? "включён" : "выключен"}`; break;
      case "autoscale_run":          summary = `${r.cloned ?? 0} клонировано · ${r.skipped ?? 0} пропущено`; break;
      case "geo_rules_list":         summary = `${r.count ?? 0} гео-правил`; break;
      case "geo_rules_upsert":       summary = `Правило ${r.geo ?? ""}: ${r.enabled ? "активно" : "выключено"}`; break;
      case "connections_list":       summary = `${r.count ?? 0} Meta интеграций`; break;
      case "data_reset": {
        const del = r.deleted as Record<string, number> ?? {};
        summary = `Сброс: ${Object.entries(del).map(([k, v]) => `${k}: ${v}`).join(", ") || "0"}`;
        break;
      }
      default: summary = JSON.stringify(r).slice(0, 80);
    }
  }

  return (
    <div className={`rounded-lg border px-3 py-2 text-[12px] ${exec.error ? "border-danger/30 bg-danger/5" : "border-stroke bg-raised"}`}>
      <div className="flex items-center gap-2">
        <CheckCircle size={11} className={exec.error ? "text-danger" : "text-success"} />
        <span className="font-medium text-ink truncate">{exec.label}</span>
        <span className={`ml-auto shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${riskBadge(exec.risk)}`}>
          {exec.risk}
        </span>
        {r && (
          <button onClick={() => setOpen(v => !v)} className="text-muted hover:text-ink shrink-0">
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>
      <p className="mt-1 text-muted leading-snug">{summary}</p>
      {open && r && (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-surface p-2 text-[10px] text-muted whitespace-pre-wrap">
          {JSON.stringify(r, null, 2)}
        </pre>
      )}
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
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Bot size={12} className="text-brand" />
        </div>
        <div className="rounded-2xl rounded-bl-sm border border-stroke bg-card px-3 py-2">
          <div className="flex gap-1">{[0,1,2].map(i => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}</div>
        </div>
      </div>
    );
  }

  if (msg.kind === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        {msg.file && (
          <div className="max-w-[80%] rounded-xl overflow-hidden border border-stroke">
            {msg.file.isImage ? (
              <img src={msg.file.dataURL} alt={msg.file.name}
                className="max-h-40 w-full object-contain bg-raised" />
            ) : (
              <div className="flex items-center gap-2 bg-raised px-3 py-2">
                <FileImage size={14} className="text-muted" />
                <span className="text-[12px] text-ink">{msg.file.name}</span>
              </div>
            )}
          </div>
        )}
        {/* file from history (no dataURL) */}
        {!msg.file && (msg as any).fileName && (
          <div className="max-w-[80%] rounded-xl overflow-hidden border border-stroke">
            <div className="flex items-center gap-2 bg-raised px-3 py-2">
              <FileImage size={14} className="text-muted" />
              <span className="text-[12px] text-ink">{(msg as any).fileName}</span>
            </div>
          </div>
        )}
        {msg.text && (
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-[13px] text-brand-fg">
            {msg.text}
          </div>
        )}
      </div>
    );
  }

  if (msg.kind === "assistant") {
    return (
      <div className="flex items-end gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Bot size={12} className="text-brand" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-stroke bg-card px-3 py-2 text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.kind === "tools" && msg.tools?.length) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Bot size={12} className="text-brand" />
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {msg.tools.map((e, i) => <ToolResultView key={i} exec={e} />)}
        </div>
      </div>
    );
  }

  if (msg.kind === "pending" && msg.pending) {
    const pa = msg.pending;
    return (
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warn/10">
          <Bot size={12} className="text-warn" />
        </div>
        <div className="flex-1 rounded-xl border border-warn/40 bg-warn/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-warn" />
            <span className="text-[12px] font-semibold text-warn">Подтверди действие</span>
            <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${riskBadge(pa.risk)}`}>{pa.risk}</span>
          </div>
          <p className="text-[12px] text-ink">{pa.summary}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onConfirm(pa.id, msg.convID)}>
              <CheckCircle size={11} /> Выполнить
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onCancel(pa.id)}>
              <X size={11} /> Отмена
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (msg.kind === "error") {
    return (
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger/10">
          <Bot size={12} className="text-danger" />
        </div>
        <div className="rounded-2xl rounded-bl-sm border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger max-w-[85%]">
          {msg.error}
        </div>
      </div>
    );
  }
  return null;
}

// ─── History list ─────────────────────────────────────────────────────────────

function HistoryView({
  conversations, loading,
  onSelect, onDelete, onNewChat,
}: {
  conversations: ConvSummary[];
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-stroke">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-stroke bg-raised px-3 py-2 text-[13px] font-medium text-ink hover:bg-brand/5 hover:border-brand/40 hover:text-brand transition-colors"
        >
          <Plus size={14} /> Новый чат
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={16} className="animate-spin text-muted" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Clock size={20} className="text-muted" />
            <p className="text-[12px] text-muted">История пуста</p>
          </div>
        ) : (
          <div className="py-1">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className="group relative flex items-start gap-3 px-4 py-3 hover:bg-raised/60 cursor-pointer transition-colors"
                onClick={() => onSelect(conv.id)}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/8 mt-0.5">
                  <Bot size={12} className="text-brand" />
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <p className="truncate text-[13px] font-medium text-ink leading-tight">{conv.title}</p>
                  {conv.preview && (
                    <p className="truncate text-[11px] text-muted mt-0.5 leading-snug">{conv.preview}</p>
                  )}
                  <p className="text-[10px] text-subtle mt-1">{fmtDate(conv.updatedAt)} · {conv.msgCount} сообщ.</p>
                </div>
                {/* Delete button — shown on hover */}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 rounded p-1 text-muted hover:text-danger hover:bg-danger/10 transition-all"
                  title="Удалить"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const EXAMPLES = [
  "Сколько у меня кабинетов?",
  "Покажи состояние workspace",
  "Запусти health check для всех",
  "Включи автоконтроль",
];

interface AiPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AiPanel({ open, onClose }: AiPanelProps) {
  const [view, setView]         = useState<"chat" | "history">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [thinking, setThinking] = useState(false);
  const [convID, setConvID]     = useState(() => mkid());
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [conversations, setConversations]   = useState<ConvSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (open && view === "chat") setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, view]);

  function addMsg(msg: ChatMessage) { setMessages(p => [...p, msg]); }

  function navigate(page: string, highlight?: string) {
    window.dispatchEvent(new CustomEvent("navigate", { detail: page }));
    if (highlight) {
      // Delay so the target page fully mounts before the highlight event fires
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("ai:highlight", { detail: highlight }));
      }, 600);
    }
    onClose();
  }

  // ─── History ──────────────────────────────────────────────────────────────

  async function openHistory() {
    setView("history");
    setHistoryLoading(true);
    try {
      const convs = await api.getAIConversations();
      setConversations(convs ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function selectConversation(id: string) {
    const displayMsgs: DisplayMsg[] = await api.loadAIConversation(id) ?? [];
    const msgs: ChatMessage[] = displayMsgs
      .filter(d => d.kind !== "pending") // pending are ephemeral
      .map(d => ({
        id: d.id,
        kind: d.kind as MsgKind,
        text: d.text || undefined,
        tools: d.tools?.length ? (d.tools as ToolExecution[]) : undefined,
        error: d.error || undefined,
        convID: id,
        // fileName/isImage preserved without dataURL
        ...(d.fileName ? { file: undefined, fileName: d.fileName, isImage: d.isImage } : {}),
      }));
    setConvID(id);
    setMessages(msgs);
    setView("chat");
  }

  async function deleteConversation(id: string) {
    await api.deleteAIConversation(id);
    setConversations(p => p.filter(c => c.id !== id));
    // If currently viewing that conversation, start fresh
    if (convID === id) startNewChat();
  }

  function startNewChat() {
    setConvID(mkid());
    setMessages([]);
    setView("chat");
  }

  // ─── File handling ────────────────────────────────────────────────────────

  function onPaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(i => i.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) readFile(file);
    }
  }

  const readFile = useCallback((file: File) => {
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachedFile({
        name: file.name,
        dataURL: e.target?.result as string ?? "",
        isImage,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  async function send() {
    const text = input.trim();
    if ((!text && !attachedFile) || thinking) return;

    setInput("");
    const file = attachedFile;
    setAttachedFile(null);

    addMsg({
      id: mkid(), kind: "user", text: text || undefined,
      file: file ? { name: file.name, isImage: file.isImage, dataURL: file.dataURL } : undefined,
      convID,
    });
    setThinking(true);

    try {
      let res: Awaited<ReturnType<typeof api.sendAIMessage>>;
      if (file) {
        res = await api.sendAIMessageWithFile(text, convID, file.dataURL, file.name);
      } else {
        res = await api.sendAIMessage(text, convID);
      }

      if (res.toolsExecuted?.length) addMsg({ id: mkid(), kind: "tools", tools: res.toolsExecuted, convID });
      if (res.reply)                  addMsg({ id: mkid(), kind: "assistant", text: res.reply, convID });
      if (res.pendingAction)          addMsg({ id: mkid(), kind: "pending", pending: res.pendingAction, convID });
      if (res.error)                  addMsg({ id: mkid(), kind: "error", error: res.error, convID });
      if (res.navigateTo)             navigate(res.navigateTo, res.highlightTarget);
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
      if (res.reply)                  addMsg({ id: mkid(), kind: "assistant", text: res.reply, convID: cID });
      if (res.error)                  addMsg({ id: mkid(), kind: "error", error: res.error, convID: cID });
      if (res.navigateTo)             navigate(res.navigateTo, res.highlightTarget);
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating trigger button (visible when panel is closed) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={onClose}
            className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-fg shadow-lg hover:scale-110 transition-transform"
            title="AI Operator"
          >
            <Bot size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 z-40 flex w-[400px] flex-col border-l border-stroke bg-card shadow-2xl"
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onPaste={onPaste}
          >
            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 z-50 flex items-center justify-center rounded bg-brand/10 border-2 border-dashed border-brand pointer-events-none">
                <p className="text-[14px] font-semibold text-brand">Перетащи файл сюда</p>
              </div>
            )}

            {/* Header */}
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-stroke px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10">
                  <Bot size={13} className="text-brand" />
                </div>
                <span className="text-[13px] font-semibold text-ink">
                  {view === "history" ? "История чатов" : "AI Operator"}
                </span>
                {view === "chat" && (
                  <span className="rounded-full bg-raised px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">Beta</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* History toggle */}
                <button
                  onClick={() => view === "history" ? setView("chat") : openHistory()}
                  className={`rounded p-1.5 transition-colors ${view === "history" ? "bg-brand/10 text-brand" : "text-muted hover:bg-raised hover:text-ink"}`}
                  title={view === "history" ? "Назад к чату" : "История чатов"}
                >
                  <History size={14} />
                </button>
                {/* New chat */}
                {view === "chat" && (
                  <button
                    onClick={startNewChat}
                    className="rounded p-1.5 text-muted hover:bg-raised hover:text-ink transition-colors"
                    title="Новый чат"
                  >
                    <Plus size={14} />
                  </button>
                )}
                {/* Clear current chat (keeps history) */}
                {view === "chat" && messages.length > 0 && (
                  <button
                    onClick={startNewChat}
                    className="rounded p-1.5 text-muted hover:bg-raised hover:text-ink transition-colors"
                    title="Очистить чат"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded p-1.5 text-muted hover:bg-raised hover:text-ink transition-colors"
                  title="Закрыть"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body: chat or history */}
            {view === "history" ? (
              <HistoryView
                conversations={conversations}
                loading={historyLoading}
                onSelect={selectConversation}
                onDelete={deleteConversation}
                onNewChat={startNewChat}
              />
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto">
                  {messages.length === 0 && !thinking ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 px-5 py-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                        <Bot size={24} className="text-brand" />
                      </div>
                      <div className="text-center">
                        <p className="text-[14px] font-semibold text-ink">Как могу помочь?</p>
                        <p className="mt-1 text-[12px] text-muted">Пиши свободно или прикрепи файл</p>
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        {EXAMPLES.map(ex => (
                          <button key={ex} onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                            className="rounded-lg border border-stroke bg-raised px-3 py-2 text-left text-[12px] text-muted hover:border-brand/40 hover:bg-brand/5 hover:text-brand transition-colors">
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 px-4 py-4">
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

                {/* File preview bar */}
                {attachedFile && (
                  <div className="shrink-0 border-t border-stroke px-4 py-2">
                    <div className="flex items-center gap-2 rounded-lg border border-stroke bg-raised px-3 py-2">
                      {attachedFile.isImage ? (
                        <img src={attachedFile.dataURL} alt={attachedFile.name}
                          className="h-10 w-10 rounded object-cover shrink-0 border border-stroke" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-brand/10">
                          <FileImage size={16} className="text-brand" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-ink">{attachedFile.name}</p>
                        <p className="text-[11px] text-muted">{fmtSize(attachedFile.size)} · {attachedFile.isImage ? "Изображение" : "Файл"}</p>
                      </div>
                      <button onClick={() => setAttachedFile(null)} className="shrink-0 text-muted hover:text-ink transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className={`shrink-0 border-t border-stroke p-3 ${thinking ? "opacity-60" : ""}`}>
                  <div className="flex items-end gap-2 rounded-xl border border-stroke bg-surface px-3 py-2 focus-within:border-brand/50 transition-colors">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={thinking}
                      className="shrink-0 text-muted hover:text-brand transition-colors disabled:opacity-40 mb-0.5"
                      title="Прикрепить файл (изображение)"
                    >
                      <Paperclip size={15} />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                      onPaste={onPaste}
                      placeholder="Напиши вопрос или задачу..."
                      disabled={thinking}
                      className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none disabled:opacity-50 py-0.5"
                    />
                    <button
                      onClick={() => void send()}
                      disabled={thinking || (!input.trim() && !attachedFile)}
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-fg hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity mb-0.5"
                    >
                      {thinking ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-center text-[10px] text-muted">
                    JPG, PNG, WebP · вставить скриншот Ctrl+V · перетащить файл
                  </p>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/json,text/csv,text/plain"
                  className="hidden"
                  onChange={onFileInputChange}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
