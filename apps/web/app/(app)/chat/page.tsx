"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  User,
  RefreshCw,
  CheckCircle2,
  ArrowUp,
  Mail,
  Send as SendIcon,
  FileText,
  X,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  SquarePen,
  Share,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Copy,
  Check,
  Search,
  ChevronDown,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  isStreaming?: boolean;
}

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  content?: string;
}

interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

/** Format file size in readable units */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Check if message content contains a completed email action marker */
function parseEmailAction(content: string): { action: "sent" | "drafted"; to: string; subject: string } | null {
  const sentMatch = content.match(/%%EMAIL_SENT%%({.*?})%%END_SENT%%/s);
  const draftedMatch = content.match(/%%EMAIL_DRAFTED%%({.*?})%%END_DRAFTED%%/s);
  const match = sentMatch || draftedMatch;
  if (!match?.[1]) return null;
  try {
    const data = JSON.parse(match[1]) as { to: string; subject: string };
    return { action: sentMatch ? "sent" : "drafted", ...data };
  } catch {
    return null;
  }
}

/** Strip action/draft markers for normal display */
function stripEmailTags(content: string): string {
  return content
    .replace(/%%EMAIL_DRAFT%%[\s\S]*?%%END_DRAFT%%/g, "")
    .replace(/%%EMAIL_SENT%%[\s\S]*?%%END_SENT%%/g, "")
    .replace(/%%EMAIL_DRAFTED%%[\s\S]*?%%END_DRAFTED%%/g, "")
    .trim();
}

/** Extract draft data from %%EMAIL_DRAFT%% block if present */
function parseDraftBlock(content: string): { textBefore: string; draft: EmailDraft | null } {
  const match = content.match(/%%EMAIL_DRAFT%%([\s\S]*?)%%END_DRAFT%%/);
  if (!match || !match[1]) return { textBefore: content, draft: null };

  const textBefore = content.slice(0, match.index).trim();
  try {
    const draft = JSON.parse(match[1]) as EmailDraft;
    return { textBefore, draft };
  } catch {
    return { textBefore: content, draft: null };
  }
}

/** Render URLs inside message text as clickable links */
function parseContentWithLinks(content: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target={part.startsWith("/") ? "_self" : "_blank"}
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80 font-medium"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

/** Email action completed notification card */
function EmailActionBanner({ action, to, subject }: { action: "sent" | "drafted"; to: string; subject: string }) {
  return (
    <div className="mt-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-foreground">
      <div className="flex items-center gap-2.5 min-w-0">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <div className="truncate">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {action === "sent" ? "Email sent successfully" : "Email saved as draft"}
          </span>
          <span className="text-muted-foreground ml-1.5 font-normal truncate">
            — {subject} ({to})
          </span>
        </div>
      </div>
      <Link
        href="/inbox"
        className="shrink-0 font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
      >
        View Inbox →
      </Link>
    </div>
  );
}

/** Inline draft card allowing review, editing, sending, or saving */
function EmailDraftCard({
  draft: initialDraft,
  messageId,
  onDismiss,
  onActioned,
}: {
  draft: EmailDraft;
  messageId: string;
  onDismiss: () => void;
  onActioned: (messageId: string, action: "sent" | "drafted", details: EmailDraft) => void;
}) {
  const { tenantId } = useTenant();
  const [to, setTo] = useState(initialDraft.to);
  const [subject, setSubject] = useState(initialDraft.subject);
  const [body, setBody] = useState(initialDraft.body);
  const [isEditing, setIsEditing] = useState(false);

  const sendEmailMutation = trpc.gmail.sendEmail.useMutation();
  const createDraftMutation = trpc.gmail.createDraft.useMutation();

  const handleSend = async () => {
    try {
      const recipientList = to.split(",").map((s) => s.trim()).filter(Boolean);
      await sendEmailMutation.mutateAsync({ tenantId, to: recipientList, subject, body });
      toast.success(`Email sent to ${to}`);
      onActioned(messageId, "sent", { to, subject, body });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send email";
      toast.error(msg);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const recipientList = to.split(",").map((s) => s.trim()).filter(Boolean);
      await createDraftMutation.mutateAsync({ tenantId, to: recipientList, subject, body });
      toast.success("Saved as draft in Gmail");
      onActioned(messageId, "drafted", { to, subject, body });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft";
      toast.error(msg);
    }
  };

  const isPending = sendEmailMutation.isPending || createDraftMutation.isPending;

  return (
    <div className="mt-3 border border-border/80 rounded-2xl bg-card overflow-hidden shadow-xs text-xs">
      {/* Draft Header */}
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">Email Draft</span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
            Gmail
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-muted-foreground hover:text-foreground text-[11px] px-2 py-0.5 rounded hover:bg-muted"
          >
            {isEditing ? "Done editing" : "Edit draft"}
          </button>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted"
            title="Dismiss draft preview"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Draft Content Fields */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-12 text-muted-foreground font-medium text-[11px]">To:</span>
          {isEditing ? (
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 bg-muted/40 border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <span className="font-medium text-foreground">{to || "(No recipient)"}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-12 text-muted-foreground font-medium text-[11px]">Subject:</span>
          {isEditing ? (
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-muted/40 border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <span className="font-semibold text-foreground">{subject || "(No subject)"}</span>
          )}
        </div>

        <div className="pt-1">
          {isEditing ? (
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          ) : (
            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {body}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-4 py-2.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="h-7 text-xs gap-1.5 rounded-lg"
        >
          {createDraftMutation.isPending ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
          Save as Draft
        </Button>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={isPending || !to}
          className="h-7 text-xs gap-1.5 rounded-lg bg-foreground text-background hover:opacity-90"
        >
          {sendEmailMutation.isPending ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <SendIcon className="h-3 w-3" />
          )}
          Send Email Now
        </Button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { tenantId } = useTenant();
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const [activeThreadId, setActiveThreadId] = useState<string>("default");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [dismissedDrafts, setDismissedDrafts] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, "up" | "down" | null>>({});

  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content: `Hey ${userName.split(" ")[0]}! 👋\n\nGood to see you. I'm **Edeth**, your executive assistant. What's on your mind today?`,
  };

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [streamingText, setStreamingText] = useState<string>("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      const newAttachment: AttachedFile = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
      };

      if (!isImage && file.size < 500 * 1024) {
        // Read text/code files under 500KB
        const reader = new FileReader();
        reader.onload = (evt) => {
          newAttachment.content = evt.target?.result as string;
          setAttachments((prev) => [...prev]);
        };
        reader.readAsText(file);
      }

      setAttachments((prev) => [...prev, newAttachment]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return filtered;
    });
  };

  // Fetch list of conversation threads
  const getThreadsQuery = trpc.agent.getThreads.useQuery(
    { tenantId },
    { refetchOnWindowFocus: false },
  );

  // Fetch messages for current active thread
  const getHistoryQuery = trpc.agent.getHistory.useQuery(
    { tenantId, threadId: activeThreadId },
    { refetchOnWindowFocus: false },
  );

  const agentChatMutation = trpc.agent.chat.useMutation();

  const deleteThreadMutation = trpc.agent.deleteThread.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Chat deleted.");
      getThreadsQuery.refetch();
      if (activeThreadId === variables.threadId) {
        handleNewChat();
      }
    },
    onError: () => toast.error("Failed to delete chat."),
  });

  const updateMessageMutation = trpc.agent.updateMessage.useMutation();

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    setActiveThreadId(newId);
    setStreamingMessageId(null);
    setStreamingText("");
    setAttachments([]);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `What can I help with today?`,
      },
    ]);
  };

  /** Called when user sends or saves-as-draft */
  const handleEmailActioned = (messageId: string, action: "sent" | "drafted", details: { to: string; subject: string; body: string }) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const marker = action === "sent"
          ? `%%EMAIL_SENT%%${JSON.stringify({ to: details.to, subject: details.subject })}%%END_SENT%%`
          : `%%EMAIL_DRAFTED%%${JSON.stringify({ to: details.to, subject: details.subject })}%%END_DRAFTED%%`;
        const newContent = m.content.replace(/%%EMAIL_DRAFT%%[\s\S]*?%%END_DRAFT%%/, marker);
        return { ...m, content: newContent };
      }),
    );
    updateMessageMutation.mutate({
      tenantId,
      messageId,
      action,
      to: details.to,
      subject: details.subject,
    });
  };

  useEffect(() => {
    if (getHistoryQuery.data?.messages) {
      if (getHistoryQuery.data.messages.length > 0) {
        setMessages(getHistoryQuery.data.messages);
      } else {
        setMessages([welcomeMessage]);
      }
    }
  }, [getHistoryQuery.data, activeThreadId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, agentChatMutation.isPending]);

  /** Stream response word by word cleanly */
  const startStreaming = (botMsgId: string, fullReply: string) => {
    setStreamingMessageId(botMsgId);
    setStreamingText("");

    const words = fullReply.split(" ");
    let index = 0;

    const interval = setInterval(() => {
      if (index < words.length) {
        const nextChunk = words.slice(0, index + 1).join(" ");
        setStreamingText(nextChunk);
        index++;
      } else {
        clearInterval(interval);
        setStreamingMessageId(null);
        setStreamingText("");
        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, content: fullReply } : m)),
        );
      }
    }, 22);
  };

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend || input;
    if (!rawText.trim() && attachments.length === 0) return;
    if (!textToSend) setInput("");

    // Prepare full text including file attachment details if present
    let messageText = rawText;
    if (attachments.length > 0) {
      const fileSummaries = attachments
        .map((att) => {
          if (att.content) {
            return `[Attached File: ${att.name}]\n\`\`\`\n${att.content}\n\`\`\``;
          }
          return `[Attached File: ${att.name} (${formatFileSize(att.size)})]`;
        })
        .join("\n\n");
      messageText = rawText ? `${rawText}\n\n${fileSummaries}` : fileSummaries;
    }

    const currentAttachments = [...attachments];
    setAttachments([]);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: rawText || `[Attached ${currentAttachments.length} file(s)]`,
    };

    const assistantPlaceholderId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantPlaceholderId,
        role: "assistant",
        content: "",
      },
    ]);

    try {
      const response = await agentChatMutation.mutateAsync({
        tenantId,
        threadId: activeThreadId,
        message: messageText,
      });

      startStreaming(assistantPlaceholderId, response.reply);
      getThreadsQuery.refetch();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Error communicating with Edeth");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantPlaceholderId
            ? {
                ...m,
                content: `I encountered an error while processing your request: ${errMsg}. Please try again.`,
              }
            : m,
        ),
      );
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(stripEmailTags(text));
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleLike = (id: string, type: "up" | "down") => {
    setLikedMap((prev) => ({
      ...prev,
      [id]: prev[id] === type ? null : type,
    }));
  };

  const threads = getThreadsQuery.data?.threads || [];
  const filteredThreads = searchQuery.trim()
    ? threads.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : threads;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-background text-foreground font-sans antialiased">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      {/* ─── Left Sidebar: ChatGPT Navigation Drawer ────────────────────── */}
      <div
        className={`${
          sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden border-none"
        } shrink-0 bg-[#f9f9f9] dark:bg-[#171717] border-r border-border/50 flex flex-col transition-all duration-200 z-20`}
      >
        {/* Top bar: Toggle & New Chat icons */}
        <div className="p-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
            title="New chat"
          >
            <SquarePen className="h-4 w-4" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/60 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-transparent focus:border-border focus:bg-background focus:outline-none placeholder:text-muted-foreground/70 transition-colors"
            />
          </div>
        </div>

        {/* Edeth Main Button */}
        <div className="px-2 space-y-0.5 text-xs text-foreground font-medium">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/60 text-left transition-colors"
          >
            <Sparkles className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="truncate font-medium">Edeth (ChatGPT)</span>
          </button>
        </div>

        {/* Recents Section */}
        <div className="flex-1 overflow-y-auto px-2 pt-4 pb-2 space-y-1">
          <div className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground/80 tracking-tight">
            Recents
          </div>

          {filteredThreads.length === 0 ? (
            <div className="px-2.5 py-3 text-xs text-muted-foreground/70">
              No conversations found.
            </div>
          ) : (
            filteredThreads.map((t) => {
              const isActive = activeThreadId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[#ececec] dark:bg-[#212121] text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="truncate pr-4 text-xs">{t.title}</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThreadMutation.mutate({ tenantId, threadId: t.id });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted transition-opacity"
                    title="Delete chat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Pill */}
        <div className="p-3 border-t border-border/40 flex items-center gap-2.5 hover:bg-muted/50 rounded-xl cursor-pointer m-2 transition-colors">
          <div className="h-7 w-7 rounded-full bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-bold flex items-center justify-center shrink-0">
            {userInitials}
          </div>
          <span className="text-xs font-medium text-foreground truncate">{userName}</span>
        </div>
      </div>

      {/* ─── Main Chat Screen ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative">
        {/* Top Header Bar */}
        <div className="h-14 px-4 flex items-center justify-between shrink-0 z-10 border-b border-border/20 bg-background/80 backdrop-blur-xs">
          <div className="flex items-center gap-1.5">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                title="Open sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}

            <button className="flex items-center gap-1 text-sm font-semibold text-foreground hover:bg-muted/60 px-2.5 py-1.5 rounded-lg transition-colors">
              <span>Edeth</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
              title="Share chat"
            >
              <Share className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
              title="New chat"
            >
              <SquarePen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0">
          <div className="max-w-3xl mx-auto py-8 space-y-8">
            {messages.map((message) => {
              const isBot = message.role === "assistant";
              const isCurrentlyStreaming = streamingMessageId === message.id;
              const contentToDisplay = isCurrentlyStreaming
                ? streamingText
                : message.content;

              const { draft } = isBot
                ? parseDraftBlock(contentToDisplay)
                : { draft: null };
              const isDismissed = dismissedDrafts.has(message.id);
              const emailAction = isBot ? parseEmailAction(contentToDisplay) : null;
              const displayText = isBot ? stripEmailTags(contentToDisplay) : contentToDisplay;

              if (!isBot) {
                // User Message: Right-aligned pill bubble
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="bg-[#f4f4f4] dark:bg-[#212121] text-foreground rounded-[22px] px-4 py-2.5 max-w-[85%] text-sm font-normal leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                );
              }

              // Assistant Message (Edeth): Borderless clean typography
              return (
                <div key={message.id} className="space-y-3">
                  {/* Text stream */}
                  <div className="text-sm md:text-base text-foreground leading-[1.65] font-normal whitespace-pre-wrap font-sans">
                    {parseContentWithLinks(displayText)}
                    {isCurrentlyStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-foreground animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Completed email action banner */}
                  {emailAction && (
                    <EmailActionBanner
                      action={emailAction.action}
                      to={emailAction.to}
                      subject={emailAction.subject}
                    />
                  )}

                  {/* Draft card */}
                  {draft && !isDismissed && !emailAction && (
                    <EmailDraftCard
                      draft={draft}
                      messageId={message.id}
                      onDismiss={() =>
                        setDismissedDrafts((prev) => new Set([...prev, message.id]))
                      }
                      onActioned={handleEmailActioned}
                    />
                  )}

                  {/* Micro Action Bar */}
                  {!isCurrentlyStreaming && displayText && (
                    <div className="flex items-center gap-1 text-muted-foreground pt-1">
                      <button
                        onClick={() => handleCopy(message.id, displayText)}
                        className="p-1.5 hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
                        title="Copy text"
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        className="p-1.5 hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
                        title="Read aloud"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleLike(message.id, "up")}
                        className={`p-1.5 hover:bg-muted/60 rounded-md transition-colors ${
                          likedMap[message.id] === "up"
                            ? "text-primary font-bold"
                            : "hover:text-foreground"
                        }`}
                        title="Good response"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleLike(message.id, "down")}
                        className={`p-1.5 hover:bg-muted/60 rounded-md transition-colors ${
                          likedMap[message.id] === "down"
                            ? "text-destructive font-bold"
                            : "hover:text-foreground"
                        }`}
                        title="Bad response"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pending Loading State */}
            {agentChatMutation.isPending && !streamingMessageId && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Sparkles className="h-4 w-4 animate-spin text-orange-500" />
                <span>Edeth is thinking...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ─── Bottom Input Capsule (ChatGPT Floating Capsule) ─────────── */}
        <div className="p-4 bg-background z-10">
          <div className="max-w-3xl mx-auto relative bg-[#f4f4f4] dark:bg-[#212121] border border-border/40 dark:border-white/10 rounded-[28px] md:rounded-[32px] p-3 shadow-xs space-y-2">
            {/* Attachment Preview Chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pt-1 pb-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group flex items-center gap-2 bg-background border border-border rounded-xl p-1.5 text-xs text-foreground shadow-2xs"
                  >
                    {att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="h-10 w-10 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground shrink-0">
                        <Paperclip className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0 max-w-[120px] pr-5">
                      <p className="truncate font-medium text-[11px]">{att.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                    </div>

                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute top-1 right-1 p-0.5 text-muted-foreground hover:text-foreground bg-muted/80 rounded-full transition-colors"
                      title="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              className="w-full bg-transparent border-none text-sm placeholder:text-muted-foreground/70 focus:outline-none resize-none min-h-[40px] max-h-36 px-2 py-1 leading-relaxed text-foreground"
            />

            {/* Bottom tools toolbar inside capsule */}
            <div className="flex items-center justify-between pt-1 px-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full"
                  title="Attach file or image"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 px-2 py-1 rounded-full transition-colors font-medium">
                  <span>Auto</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachments.length === 0) || agentChatMutation.isPending}
                  className="h-8 w-8 rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-30 transition-all shrink-0"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-muted-foreground/50 mt-2">
            Edeth can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}
