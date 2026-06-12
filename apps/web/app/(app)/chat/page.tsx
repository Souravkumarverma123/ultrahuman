"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, User, Send, Sparkles, RefreshCw, Command, 
  HelpCircle, Calendar, Mail, FileText, CheckCircle2
} from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

export default function ChatPage() {
  const { tenantId } = useTenant();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your AI Orchestrator. I have full access to your connected Gmail and Google Calendar via Corsair.\n\nYou can ask me to search or draft emails, look up your weekly schedule, or coordinate invites (e.g. 'Schedule a sync with sourav@example.com for tomorrow at 10 AM and send him an email too'). How can I help you today?",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // tRPC Mutation for AI Agent Chat
  const agentChatMutation = trpc.agent.chat.useMutation();

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

    // Format message history for tRPC schema
    const messageHistory = messages
      .concat(userMessage)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const response = await agentChatMutation.mutateAsync({
        tenantId,
        messages: messageHistory,
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
    } catch (err: any) {
      toast.error("Error communicating with AI Agent");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I encountered an error while trying to process that request: ${err.message}. Please verify your API keys and connection status.`,
        },
      ]);
    }
  };

  const suggestions = [
    {
      title: "Summarize Inbox",
      text: "Look up my inbox and list my top 3 recent emails",
      icon: Mail,
    },
    {
      title: "Schedule Invite + Email",
      text: "Schedule a sync with team@example.com for tomorrow at 2 PM. Send him an email invite too.",
      icon: Calendar,
    },
    {
      title: "Search & Draft",
      text: "Search my emails for 'invoice' and draft a reply to the latest one asking for clarification",
      icon: FileText,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/5">
      {/* Top Header */}
      <div className="h-16 px-8 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary animate-pulse" />
          <h1 className="font-extrabold text-lg tracking-tight">AI Orchestrator</h1>
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider ml-1">
            OpenAI GPT-4o
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const firstMsg = messages[0];
            if (firstMsg) {
              setMessages([firstMsg]);
            }
            toast.success("Chat history cleared.");
          }}
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
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                  isBot ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted border-border text-foreground"
                }`}>
                  {isBot ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                </div>

                {/* Message Body */}
                <div className="space-y-2 max-w-[80%]">
                  <div className={`p-4 rounded-2xl shadow-sm border text-sm leading-relaxed whitespace-pre-wrap ${
                    isBot 
                      ? "bg-card border-border/80 text-foreground" 
                      : "bg-primary text-primary-foreground border-primary"
                  }`}>
                    {message.content}
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
                          corsair_mcp:{tool}
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
                <span className="text-sm text-muted-foreground">Thinking and calling Corsair tools...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Suggestion & Input Box */}
      <div className="p-6 border-t border-border bg-card shrink-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Quick Suggestions (Only if chat history is fresh) */}
          {messages.length === 1 && !agentChatMutation.isPending && (
            <div className="grid md:grid-cols-3 gap-3">
              {suggestions.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <Card
                    key={idx}
                    onClick={() => handleSend(s.text)}
                    className="p-3.5 border border-border/80 bg-muted/10 hover:bg-muted/30 cursor-pointer transition-all flex flex-col gap-1.5 rounded-xl shadow-none hover:shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/80">
                      <Icon className="h-4 w-4 text-primary" />
                      {s.title}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {s.text}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              type="text"
              placeholder="Message AI Assistant..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={agentChatMutation.isPending}
              className="flex-1 bg-muted/20 border-border/80 text-sm focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button type="submit" disabled={agentChatMutation.isPending || !input.trim()} className="shadow-sm">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
