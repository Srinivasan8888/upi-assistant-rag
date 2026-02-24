"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  AlertCircle,
  Plus,
  History,
  Trash2,
  ChevronRight,
  Sparkles,
  CreditCard,
  ShieldAlert,
  RefreshCcw,
  HelpCircle,
  Moon,
  Sun,
  X,
  Menu,
  Clock,
  Copy,
  Check,
  Download,
  Paperclip,
  Settings,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useTheme } from "next-themes";
import { useSession, signIn, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TransactionAnalyzer } from "./TransactionAnalyzer";
import { jsPDF } from "jspdf";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp?: Date;
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/chat`;

const SUGGESTED = [
  {
    icon: HelpCircle,
    label: "Why did my UPI payment fail?",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: ShieldAlert,
    label: "How to report UPI fraud?",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: Clock,
    label: "How long does NPCI dispute take?",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: RefreshCcw,
    label: "When will I get my refund?",
    color: "from-emerald-500 to-teal-500",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function newSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start message-enter">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-5">
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/50 inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/50 inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/50 inline-block" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => newSessionId());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  // Prevent hydration mismatch – only render theme UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  // Load sessions from server
  const loadSessions = useCallback(async () => {
    if (!session?.user?.email) return;
    setSessionsLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/sessions?email=${encodeURIComponent(session.user.email)}`,
        { withCredentials: true },
      );
      setSessions(res.data.sessions || []);
    } catch {
      // Silently fail if backend not running
    } finally {
      setSessionsLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session?.user?.email) {
      loadSessions();
    } else {
      setSessions([]);
      setMessages([]);
    }
  }, [loadSessions, session?.user?.email]);

  // Load a past session
  const loadSession = async (sid: string) => {
    if (sid === sessionId && messages.length > 0) return;
    try {
      const res = await axios.get(
        `${API_BASE}/history/${sid}?email=${session?.user?.email ? encodeURIComponent(session.user.email) : ""}`,
        { withCredentials: true },
      );
      const msgs: Message[] = (res.data.messages || []).map(
        (m: {
          role: "user" | "assistant";
          content: string;
          sources_used?: string[];
          timestamp?: string;
        }) => ({
          role: m.role,
          content: m.content,
          sources: m.sources_used,
          timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
        }),
      );
      setSessionId(sid);
      setMessages(msgs);
    } catch {
      // ignore
    }
  };

  // Start new chat
  const startNewChat = () => {
    setSessionId(newSessionId());
    setMessages([]);
    setInput("");
  };

  // Send message
  const sendMessage = async (query: string) => {
    const q = query.trim();
    if (!q && !selectedFile) return;
    if (loading) return;

    const displayContent = q || `[Attached file: ${selectedFile?.name}]`;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: displayContent, timestamp: new Date() },
    ]);
    setInput("");
    setLoading(true);

    const currentFileB64 = fileBase64;
    const currentMimeType = fileMimeType;
    removeFile();

    try {
      const res = await axios.post(
        `${API_BASE}`,
        {
          session_id: sessionId,
          query: q,
          file_b64: currentFileB64,
          mime_type: currentMimeType,
          userEmail: session?.user?.email,
        },
        { withCredentials: true },
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.message.content,
          sources: res.data.sources,
          timestamp: new Date(),
        },
      ]);
      // Refresh sessions list after first message
      if (messages.length === 0) loadSessions();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(sid);
    try {
      await axios.delete(
        `${API_BASE}/sessions/${sid}?email=${session?.user?.email ? encodeURIComponent(session.user.email) : ""}`,
        { withCredentials: true },
      );
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      if (sid === sessionId) startNewChat();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      const resultString = event.target?.result as string;
      const base64String = resultString.split(",")[1];
      setFileBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isCurrentSession = (sid: string) => sid === sessionId;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col flex-shrink-0 border-r border-border transition-all duration-300 ease-in-out overflow-hidden
          ${sidebarOpen ? "w-72" : "w-0"}`}
        style={{ background: "hsl(var(--sidebar-bg))" }}
      >
        <div className="flex flex-col h-full w-72">
          {/* Sidebar header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground tracking-tight truncate">
              UPI Assistant
            </span>
          </div>

          {/* New Chat button */}
          <div className="px-3 py-3 flex-shrink-0">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium
                bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md
                hover:shadow-lg hover:from-violet-600 hover:to-purple-700
                active:scale-95 transition-all duration-150"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              New Chat
            </button>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="flex items-center gap-2 px-2 py-2 mb-1">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                History
              </span>
            </div>

            {sessionsLoading ? (
              <div className="flex flex-col gap-2 px-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 px-4">
                <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No history yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Start a conversation!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {sessions.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => loadSession(sess.id)}
                    className={`sidebar-item group w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left
                      ${
                        isCurrentSession(sess.id)
                          ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-text-active))]"
                          : "text-[hsl(var(--sidebar-text))] hover:bg-[hsl(var(--sidebar-hover))]"
                      }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate leading-tight">
                        {sess.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(sess.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteSession(sess.id, e)}
                      disabled={deletingId === sess.id}
                      className={`flex-shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all
                        hover:bg-destructive/10 hover:text-destructive
                        ${isCurrentSession(sess.id) ? "opacity-100" : ""}`}
                    >
                      {deletingId === sess.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="flex-shrink-0 border-t border-border px-3 py-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground
                hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground transition-all"
            >
              {mounted &&
                (theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                ))}
              {mounted
                ? theme === "dark"
                  ? "Light mode"
                  : "Dark mode"
                : "Toggle theme"}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-background/80 backdrop-blur-md">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground truncate">
              UPI Dispute Assistant
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                border border-border text-muted-foreground hover:text-foreground hover:bg-muted
                transition-all duration-150"
            >
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {mounted &&
                (theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                ))}
            </button>

            {/* Share Chat Button */}
            {sessionId && messages.length > 0 && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/share/${sessionId}`;
                  navigator.clipboard.writeText(url);
                  alert(
                    "Read-only chat link copied to clipboard! You can share this with your bank.",
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50
                  hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all duration-150"
                title="Share this conversation securely"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Share
              </button>
            )}

            {session ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen((o) => !o)}
                  className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-muted transition-all group"
                >
                  {/* Avatar circle with initial */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {session.user?.name?.[0]?.toUpperCase() ||
                      session.user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                      profileMenuOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {profileMenuOpen && (
                  <>
                    {/* Backdrop to close on outside click */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-20 overflow-hidden py-1">
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold truncate">
                          {session.user?.name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.user?.email}
                        </p>
                      </div>

                      {/* Menu items */}
                      <Link
                        href="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        Settings
                      </Link>

                      {(session.user as any)?.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                          Admin Console
                        </Link>
                      )}

                      <div className="border-t border-border mt-1 mb-1" />

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                          />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="text-xs font-semibold px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ── Welcome screen ── */
            <div className="flex flex-col items-center justify-center h-full px-4 py-12 max-w-2xl mx-auto">
              {/* Orb */}
              <div className="orb mb-8">
                <div
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500
                  shadow-[0_0_40px_hsl(258_90%_64%_/_0.4)] flex items-center justify-center"
                >
                  <Sparkles className="w-8 h-8 text-white drop-shadow-md" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-foreground text-center mb-2">
                Good {getGreeting()}, there!
              </h1>
              <p className="text-lg text-muted-foreground text-center mb-8">
                Ask me anything about{" "}
                <span className="gradient-text font-semibold">
                  UPI disputes & payments
                </span>
              </p>

              <div className="w-full mb-10">
                <TransactionAnalyzer
                  onResult={(res) => {
                    setInput(
                      `Regarding my transaction: The analyzer says it's a ${res.fraudProbability} risk threat. What exactly should I say to the bank?`,
                    );
                  }}
                />
              </div>

              {/* Suggestion cards */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTED.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => sendMessage(s.label)}
                    className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-card
                      hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md
                      transition-all duration-200 text-left"
                  >
                    <span
                      className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${s.color}
                      flex items-center justify-center shadow-sm`}
                    >
                      <s.icon className="w-4 h-4 text-white" />
                    </span>
                    <span className="text-sm text-foreground font-medium leading-snug">
                      {s.label}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0
                      opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
                    />
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-8 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Answers are based on NPCI, RBI &amp; bank documents
              </p>
            </div>
          ) : (
            /* ── Messages ── */
            <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 items-start message-enter ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600
                      flex items-center justify-center shadow-md mt-0.5"
                    >
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-2 max-w-[82%]`}>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed ${
                        msg.role === "user" ? "whitespace-pre-wrap" : ""
                      }
                        ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-tr-sm shadow-md"
                            : "bg-card border border-border text-foreground rounded-tl-sm prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-a:text-violet-500 hover:prose-a:text-violet-600"
                        }`}
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({
                              node,
                              inline,
                              className,
                              children,
                              ...props
                            }: any) {
                              const match = /language-(\w+)/.exec(
                                className || "",
                              );
                              const codeString = String(children).replace(
                                /\n$/,
                                "",
                              );
                              // State to manage copy status
                              const [copied, setCopied] = useState(false);

                              const handleCopy = () => {
                                navigator.clipboard.writeText(codeString);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              };

                              const handleExportPDF = () => {
                                const doc = new jsPDF();
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(11);
                                const splitText = doc.splitTextToSize(
                                  codeString,
                                  180,
                                );
                                doc.text(splitText, 15, 20);
                                doc.save("Complaint_Letter.pdf");
                              };

                              if (!inline) {
                                return (
                                  <div className="relative group my-4 rounded-lg bg-zinc-950 p-4 border border-zinc-800">
                                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                      <button
                                        onClick={handleExportPDF}
                                        className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                                        title="Download PDF"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={handleCopy}
                                        className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                                        title="Copy to clipboard"
                                      >
                                        {copied ? (
                                          <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                    <pre className="overflow-x-auto pt-6 text-sm text-zinc-300">
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  </div>
                                );
                              }
                              return (
                                <code
                                  className={`bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded-md text-violet-600 dark:text-violet-400 font-mono text-[0.875em] ${className || ""}`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        <span className="text-[10px] text-muted-foreground font-medium self-center mr-0.5">
                          Sources:
                        </span>
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30
                              text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-medium"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600
                      flex items-center justify-center shadow-md mt-0.5"
                    >
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {loading && <TypingIndicator />}
              <div ref={scrollRef} />
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        <div className="flex-shrink-0 border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            {/* File Preview */}
            {selectedFile && (
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg w-fit mb-1 border border-border pb-1">
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
                <button
                  onClick={removeFile}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {session ? (
              <div
                className="flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3
                shadow-sm focus-within:border-violet-400 dark:focus-within:border-violet-600 focus-within:shadow-md
                transition-all duration-200"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-violet-500 hover:bg-violet-500/10 rounded-lg transition-all"
                  title="Attach Transaction Screenshot/PDF"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about UPI disputes, paste an SMS, or talk..."
                  disabled={loading}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60
                    outline-none min-h-[24px] max-h-40 leading-6 py-0"
                />

                {/* Voice Input Button */}
                <button
                  onClick={() => {
                    alert(
                      "Voice Input feature coming soon! (Web Speech API integration)",
                    );
                  }}
                  className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                    input.trim() || selectedFile
                      ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                      : "text-white bg-violet-500 hover:bg-violet-600 shadow-sm"
                  }`}
                  title="Talk to AI"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || (!input.trim() && !selectedFile)}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                    bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md
                    hover:from-violet-600 hover:to-purple-700 hover:shadow-lg
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                    active:scale-95 transition-all duration-150"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-4 bg-muted/50 rounded-2xl border border-border">
                <p className="text-sm text-muted-foreground font-medium">
                  Authentication required to use the chat.
                </p>
                <button
                  onClick={() => signIn()}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-purple-700 transition shadow-md"
                >
                  Sign In to Chat
                </button>
              </div>
            )}
            <p className="text-center text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Answers are based on NPCI, RBI &amp; bank documents · Press Enter
              to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
