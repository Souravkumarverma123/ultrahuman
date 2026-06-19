"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  User,
  RefreshCw,
  CheckCircle2,
  ArrowUp,
  Mail,
  Send as SendIcon,
  FileText,
  X,
  Pencil,
} from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

/** Parse %%EMAIL_DRAFT%% ... %%END_DRAFT%% from assistant reply */
function parseDraftBlock(content: string): { draft: EmailDraft | null; textBefore: string } {
  const start = content.indexOf("%%EMAIL_DRAFT%%");
  const end = content.indexOf("%%END_DRAFT%%");
  if (start === -1 || end === -1 || end < start) return { draft: null, textBefore: content };

  const jsonStr = content.slice(start + "%%EMAIL_DRAFT%%".length, end).trim();
  const textBefore = content.slice(0, start).trim();
  try {
    const draft = JSON.parse(jsonStr) as EmailDraft;
    return { draft, textBefore };
  } catch {
    return { draft: null, textBefore: content };
  }
}

function parseContentWithLinks(content: string) {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const [, text, url] = match;
    const matchIndex = match.index;
    if (!text || !url) continue;
    if (matchIndex > lastIndex) parts.push(content.substring(lastIndex, matchIndex));

    if (url.startsWith("/")) {
      parts.push(
        <Link
          key={matchIndex}
          href={url}
          className="text-primary underline font-semibold hover:text-primary/80 transition-colors inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/20"
        >
          {text}
        </Link>,
      );
    } else {
      parts.push(
        <a
          key={matchIndex}
          href={url}
          className="text-primary underline font-semibold hover:text-primary/80 transition-colors inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/20"
          target="_blank"
          rel="noopener noreferrer"
        >
          {text}
        </a>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) parts.push(content.substring(lastIndex));
  return parts.length > 0 ? parts : content;
}

/** Inline email draft preview card with Edit / Send / Save as Draft actions */
function EmailDraftCard({
  draft,
  onDismiss,
}: {
  draft: EmailDraft;
  onDismiss: () => void;
}) {
  const { tenantId } = useTenant();
  const [sent, setSent] = useState(false);
  const [drafted, setDrafted] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable copies of the fields
  const [editTo, setEditTo] = useState(draft.to);
  const [editSubject, setEditSubject] = useState(draft.subject);
  const [editBody, setEditBody] = useState(draft.body);

  const sendEmailMutation = trpc.gmail.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully!");
      setSent(true);
      setEditing(false);
    },
    onError: (err) => toast.error(`Failed to send: ${err.message}`),
  });

  const createDraftMutation = trpc.gmail.createDraft.useMutation({
    onSuccess: () => {
      toast.success("Saved to Drafts in Gmail!");
      setDrafted(true);
      setEditing(false);
    },
    onError: (err) => toast.error(`Failed to save draft: ${err.message}`),
  });

  const isBusy = sendEmailMutation.isPending || createDraftMutation.isPending;

  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/30 overflow-hidden shadow-sm w-full min-w-[min(460px,100%)]">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          {editing ? "Edit Email" : "AI-Composed Email Draft"}
        </div>
        <div className="flex items-center gap-1">
          {/* Edit / Cancel toggle */}
          {!sent && !drafted && (
            <button
              onClick={() => setEditing((prev) => !prev)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                editing
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-primary hover:bg-primary/10 font-medium"
              }`}
              title={editing ? "Cancel editing" : "Edit this draft"}
            >
              <Pencil className="h-3 w-3" />
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {editing ? (
        /* ── Edit mode ── */
        <div className="px-4 pt-3 pb-1 space-y-3">
          {/* To */}
          <div className="flex items-center gap-2 border border-border/70 rounded-lg px-3 py-2 bg-card focus-within:ring-1 focus-within:ring-ring">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0 w-14">To</span>
            <input
              type="text"
              value={editTo}
              onChange={(e) => setEditTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          {/* Subject */}
          <div className="flex items-center gap-2 border border-border/70 rounded-lg px-3 py-2 bg-card focus-within:ring-1 focus-within:ring-ring">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0 w-14">Subject</span>
            <input
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          {/* Body */}
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-border/70 bg-card px-3 py-2 text-sm text-foreground leading-relaxed resize-y outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
            placeholder="Email body..."
          />
        </div>
      ) : (
        /* ── Read-only preview ── */
        <>
          <div className="px-4 pt-3 pb-1 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <span className="font-semibold text-muted-foreground w-14 shrink-0">To</span>
              <span className="text-foreground break-all">{editTo}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-muted-foreground w-14 shrink-0">Subject</span>
              <span className="text-foreground font-medium">{editSubject}</span>
            </div>
          </div>
          <div className="mx-4 my-3 p-3 rounded-lg bg-card border border-border/60 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {editBody}
          </div>
        </>
      )}

      {/* Actions */}
      {!sent && !drafted ? (
        editing ? (
          /* Show send/draft buttons only in edit mode */
          <div className="flex items-center justify-end gap-2 px-4 pb-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              className="gap-1.5 text-xs"
              onClick={() =>
                createDraftMutation.mutate({
                  tenantId,
                  to: [editTo],
                  subject: editSubject,
                  body: editBody,
                })
              }
            >
              <FileText className="h-3.5 w-3.5" />
              {createDraftMutation.isPending ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              size="sm"
              disabled={isBusy}
              className="gap-1.5 text-xs shadow-sm"
              onClick={() =>
                sendEmailMutation.mutate({
                  tenantId,
                  to: [editTo],
                  subject: editSubject,
                  body: editBody,
                })
              }
            >
              <SendIcon className="h-3.5 w-3.5" />
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        ) : (
          /* In preview mode show a subtle hint */
          <p className="px-4 pb-3 text-[11px] text-muted-foreground/70">
            Click <strong>Edit</strong> to make changes before sending.
          </p>
        )
      ) : (
        <div className="flex items-center gap-2 px-4 pb-3 text-sm text-emerald-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {sent ? "Email sent!" : "Saved to Gmail Drafts!"}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { tenantId } = useTenant();
  const [input, setInput] = useState("");
  const [dismissedDrafts, setDismissedDrafts] = useState<Set<string>>(new Set());

  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content:
      "Hello! I am your AI Orchestrator. I have full access to your connected Gmail and Google Calendar via Corsair.\n\nYou can ask me to search or draft emails, look up your weekly schedule, or coordinate invites.\n\nWhen you ask me to **draft** an email, I'll compose a proper professional email and show it here for review — you can then **Send** or **Save as Draft** without committing immediately. How can I help you today?",
  };

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getHistoryQuery = trpc.agent.getHistory.useQuery(
    { tenantId },
    { refetchOnWindowFocus: false },
  );
  const agentChatMutation = trpc.agent.chat.useMutation();
  const clearHistoryMutation = trpc.agent.clearHistory.useMutation({
    onSuccess: () => {
      setMessages([welcomeMessage]);
      toast.success("Chat history cleared.");
    },
    onError: () => toast.error("Failed to clear chat history."),
  });

  useEffect(() => {
    if (getHistoryQuery.data?.messages) {
      if (getHistoryQuery.data.messages.length > 0) {
        setMessages(getHistoryQuery.data.messages);
      } else {
        setMessages([welcomeMessage]);
      }
    }
  }, [getHistoryQuery.data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentChatMutation.isPending]);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;
    if (!textToSend) setInput("");

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await agentChatMutation.mutateAsync({ tenantId, message: messageText });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply,
          toolsUsed: response.toolsUsed,
        },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Error communicating with AI Agent");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I encountered an error while trying to process that request: ${errMsg}. Please verify your API keys and connection status.`,
        },
      ]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/5">
      {/* Top Header */}
      <div className="h-16 px-8 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary animate-pulse" />
          <h1 className="font-extrabold text-lg tracking-tight">AI Orchestrator</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearHistoryMutation.mutate({ tenantId })}
          disabled={clearHistoryMutation.isPending || getHistoryQuery.isFetching}
          className="text-xs"
        >
          Clear History
        </Button>
      </div>

      {/* Messages View */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => {
            const isBot = message.role === "assistant";
            const { draft, textBefore } = isBot
              ? parseDraftBlock(message.content)
              : { draft: null, textBefore: message.content };
            const isDismissed = dismissedDrafts.has(message.id);

            return (
              <div
                key={message.id}
                className={`flex gap-4 items-start ${isBot ? "" : "flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                    isBot
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-muted border-border text-foreground"
                  }`}
                >
                  {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>

                {/* Message Body — stretch to fill when a draft card is present */}
                <div className={`space-y-2 max-w-[80%] ${draft && !isDismissed ? "w-full" : ""}`}>
                  {/* Text portion (shown when there's text before the draft block, or no draft) */}
                  {(textBefore || !draft) && (
                    <div
                      className={`p-4 rounded-2xl shadow-sm border text-sm leading-relaxed whitespace-pre-wrap ${
                        isBot
                          ? "bg-card border-border/80 text-foreground"
                          : "bg-primary text-primary-foreground border-primary"
                      }`}
                    >
                      {parseContentWithLinks(draft ? textBefore : message.content)}
                    </div>
                  )}

                  {/* Draft card — shown only for bot messages with a parsed draft */}
                  {draft && !isDismissed && (
                    <EmailDraftCard
                      draft={draft}
                      onDismiss={() =>
                        setDismissedDrafts((prev) => new Set([...prev, message.id]))
                      }
                    />
                  )}

                  {/* Tool badges */}
                  {isBot && message.toolsUsed && message.toolsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {message.toolsUsed.map((tool, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[10px] font-mono px-2 py-0.5 bg-muted/50 border border-border/60 text-muted-foreground flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          corsair_tool:{tool}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pending / Thinking State */}
          {agentChatMutation.isPending && (
            <div className="flex gap-4 items-start">
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-sm max-w-[80%] flex items-center gap-2.5">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Agent is composing your email...
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Box */}
      <div className="p-6 border-t border-border bg-card shrink-0">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-end w-full rounded-[24px] border border-border bg-muted/40 focus-within:ring-1 focus-within:ring-ring focus-within:bg-muted/60 transition-all p-2 pl-4 pr-2 gap-2"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder='Try: "Draft a feedback email to john@example.com — tell him we love the product"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={agentChatMutation.isPending}
              className="flex-1 bg-transparent border-0 resize-none outline-none focus:ring-0 focus:outline-none p-0 text-sm text-foreground placeholder:text-muted-foreground/75 min-h-[24px] max-h-[200px] leading-relaxed py-1.5"
            />
            <button
              type="submit"
              disabled={agentChatMutation.isPending || !input.trim()}
              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 mb-0.5 ${
                input.trim()
                  ? "bg-primary text-primary-foreground hover:scale-105 active:scale-95 hover:bg-primary/90 shadow-sm cursor-pointer"
                  : "bg-muted/60 text-muted-foreground/30 cursor-not-allowed"
              }`}
              aria-label="Send message"
            >
              <ArrowUp className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
