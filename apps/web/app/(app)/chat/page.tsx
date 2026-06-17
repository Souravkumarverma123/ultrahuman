"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, User, Send, RefreshCw, CheckCircle2, Plus, Globe, CaseSensitive, Mic, ArrowUp } from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

function parseContentWithLinks(content: string) {
  // Matches markdown links: [Link Text](url)
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const [, text, url] = match;
    const matchIndex = match.index;

    if (!text || !url) continue;

    // Push text before the link
    if (matchIndex > lastIndex) {
      parts.push(content.substring(lastIndex, matchIndex));
    }

    // Push the Link element
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

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export default function ChatPage() {
  const { tenantId } = useTenant();
  const [input, setInput] = useState("");
  
  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content:
      "Hello! I am your AI Orchestrator. I have full access to your connected Gmail and Google Calendar via Corsair.\n\nYou can ask me to search or draft emails, look up your weekly schedule, or coordinate invites (e.g. 'Schedule a sync with sourav@example.com for tomorrow at 10 AM and send him an email too'). How can I help you today?",
  };

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height based on content
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

  // tRPC Queries and Mutations
  const getHistoryQuery = trpc.agent.getHistory.useQuery(
    { tenantId },
    { refetchOnWindowFocus: false }
  );

  const agentChatMutation = trpc.agent.chat.useMutation();

  const clearHistoryMutation = trpc.agent.clearHistory.useMutation({
    onSuccess: () => {
      setMessages([welcomeMessage]);
      toast.success("Chat history cleared.");
    },
    onError: () => {
      toast.error("Failed to clear chat history.");
    },
  });

  // Load history into messages state once fetched
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

    if (!textToSend) {
      setInput("");
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await agentChatMutation.mutateAsync({
        tenantId,
        message: messageText,
      });

      if (response.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.reply,
            toolsUsed: response.toolsUsed,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.reply,
          },
        ]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Error communicating with AI Agent");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I encountered an error while trying to process that request: ${message}. Please verify your API keys and connection status.`,
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
          onClick={() => {
            clearHistoryMutation.mutate({ tenantId });
          }}
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
                  {isBot ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                </div>

                {/* Message Body */}
                <div className="space-y-2 max-w-[80%]">
                  <div
                    className={`p-4 rounded-2xl shadow-sm border text-sm leading-relaxed whitespace-pre-wrap ${
                      isBot
                        ? "bg-card border-border/80 text-foreground"
                        : "bg-primary text-primary-foreground border-primary"
                    }`}
                  >
                    {parseContentWithLinks(message.content)}
                  </div>

                  {/* Tool execution display */}
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
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-sm max-w-[80%] flex items-center gap-2.5">
                <RefreshCw className="h-4.5 w-4.5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Agent is working on it...
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Box */}
      <div className="p-6 border-t border-border bg-card shrink-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-end w-full rounded-[24px] border border-border bg-muted/40 focus-within:ring-1 focus-within:ring-ring focus-within:bg-muted/60 transition-all p-2 pl-4 pr-2 gap-2"
          >
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask anything"
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
