"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Mail, Inbox as InboxIcon, Archive, Star, Trash2, Search, Send, 
  Sparkles, CornerUpLeft, Plus, CheckCircle, RefreshCw, AlertCircle,
  Clock, Keyboard, ChevronDown, Check, X
} from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { useKeyboardShortcuts } from "~/hooks/use-keyboard-shortcuts";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { useSearchParams } from "next/navigation";

type Folder = "INBOX" | "STARRED" | "SENT" | "ARCHIVE" | "TRASH";

export default function InboxPage() {
  const { tenantId } = useTenant();
  const searchParams = useSearchParams();
  const [activeFolder, setActiveFolder] = useState<Folder>("INBOX");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // Initialize selectedThreadId from searchParams if present
  useEffect(() => {
    const threadId = searchParams.get("threadId");
    if (threadId) {
      setSelectedThreadId(threadId);
    }
  }, [searchParams]);

  // Compose / Reply states
  const [toInput, setToInput] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [bodyInput, setBodyInput] = useState("");
  const [replyBodyInput, setReplyBodyInput] = useState("");

  // AI Classification Rationale state (cached locally)
  const [aiPriorities, setAiPriorities] = useState<Record<string, { priority: "High" | "Medium" | "Low"; reason: string }>>({});
  const [classifying, setClassifying] = useState(false);

  // Check if connected
  const statusQuery = trpc.gmail.getConnectionStatus.useQuery({ tenantId });
  const isConnected = statusQuery.data?.connected ?? false;

  // List threads query
  const labelIds = useMemo(() => {
    if (activeFolder === "INBOX") return ["INBOX"];
    if (activeFolder === "STARRED") return ["STARRED"];
    if (activeFolder === "SENT") return ["SENT"];
    if (activeFolder === "TRASH") return ["TRASH"];
    return []; // Archive has no INBOX label
  }, [activeFolder]);

  // If we want archive, we search "has:nouserlabels -in:inbox -in:trash" or similar, or just omit labelIds and Corsair handles it
  const threadsQuery = trpc.gmail.listThreads.useQuery(
    { 
      tenantId, 
      labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
      q: searchQuery || undefined 
    },
    { 
      enabled: isConnected,
      refetchInterval: 15000, // Sync every 15s
    }
  );

  // Fetch individual thread
  const threadDetailQuery = trpc.gmail.getThread.useQuery(
    { tenantId, threadId: selectedThreadId ?? "" },
    { enabled: isConnected && selectedThreadId !== null }
  );

  // Mutations
  const sendEmailMutation = trpc.gmail.sendEmail.useMutation();
  const archiveMutation = trpc.gmail.archiveThread.useMutation();
  const markReadMutation = trpc.gmail.markAsRead.useMutation();
  const starMutation = trpc.gmail.starThread.useMutation();
  const trashMutation = trpc.gmail.trashThread.useMutation();

  const threads = threadsQuery.data?.threads ?? [];
  const selectedThread = threadDetailQuery.data;

  // Track currently selected index for keyboard navigation
  const selectedIndex = useMemo(() => {
    if (!selectedThreadId) return -1;
    return threads.findIndex((t) => t.id === selectedThreadId);
  }, [threads, selectedThreadId]);

  // Keyboard Shortcuts Setup
  const shortcuts = useMemo(() => ({
    j: () => {
      if (threads.length === 0) return;
      const nextIndex = Math.min(selectedIndex + 1, threads.length - 1);
      const nextThread = threads[nextIndex];
      if (nextThread) {
        setSelectedThreadId(nextThread.id);
      }
    },
    k: () => {
      if (threads.length === 0) return;
      const prevIndex = Math.max(selectedIndex - 1, 0);
      const prevThread = threads[prevIndex];
      if (prevThread) {
        setSelectedThreadId(prevThread.id);
      }
    },
    e: () => {
      if (!selectedThreadId) return;
      archiveMutation.mutate(
        { tenantId, threadId: selectedThreadId },
        {
          onSuccess: () => {
            toast.success("Thread archived");
            threadsQuery.refetch();
            const nextT = threads[selectedIndex + 1];
            const prevT = threads[selectedIndex - 1];
            if (selectedIndex < threads.length - 1 && nextT) {
              setSelectedThreadId(nextT.id);
            } else if (threads.length > 1 && prevT) {
              setSelectedThreadId(prevT.id);
            } else {
              setSelectedThreadId(null);
            }
          }
        }
      );
    },
    s: () => {
      if (!selectedThreadId) return;
      const currentThread = threads.find(t => t.id === selectedThreadId);
      if (!currentThread) return;
      const targetStarred = !currentThread.isStarred;
      starMutation.mutate(
        { tenantId, threadId: selectedThreadId, starred: targetStarred },
        {
          onSuccess: () => {
            toast.success(targetStarred ? "Starred" : "Unstarred");
            threadsQuery.refetch();
          }
        }
      );
    },
    c: () => {
      setComposeOpen(true);
    }
  }), [threads, selectedIndex, selectedThreadId, tenantId]);

  useKeyboardShortcuts(shortcuts);

  // Auto-mark as read when thread is opened
  useEffect(() => {
    if (selectedThread && !selectedThread.isRead) {
      markReadMutation.mutate(
        { tenantId, threadId: selectedThread.id },
        {
          onSuccess: () => {
            threadsQuery.refetch();
          }
        }
      );
    }
  }, [selectedThreadId, selectedThread]);

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toInput || !subjectInput || !bodyInput) {
      toast.error("Please fill in all fields.");
      return;
    }

    sendEmailMutation.mutate(
      {
        tenantId,
        to: toInput.split(",").map((s) => s.trim()),
        subject: subjectInput,
        body: bodyInput,
      },
      {
        onSuccess: () => {
          toast.success("Email sent successfully!");
          setComposeOpen(false);
          setToInput("");
          setSubjectInput("");
          setBodyInput("");
          threadsQuery.refetch();
        },
        onError: (err) => {
          toast.error(`Error sending email: ${err.message}`);
        }
      }
    );
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBodyInput || !selectedThread) return;

    // Send reply to sender of the last message
    const lastMessage = selectedThread.messages?.[selectedThread.messages.length - 1];
    const replyTo = lastMessage?.from?.email ?? selectedThread.from.email;

    sendEmailMutation.mutate(
      {
        tenantId,
        to: [replyTo],
        subject: selectedThread.subject.startsWith("Re:") 
          ? selectedThread.subject 
          : `Re: ${selectedThread.subject}`,
        body: replyBodyInput,
        replyToThreadId: selectedThread.id,
        replyToMessageId: lastMessage?.id,
      },
      {
        onSuccess: () => {
          toast.success("Reply sent!");
          setReplyBodyInput("");
          threadDetailQuery.refetch();
        },
        onError: (err) => {
          toast.error(`Error sending reply: ${err.message}`);
        }
      }
    );
  };

  // Run AI email priority classification on loaded emails
  const handleAIPriorityClassification = async () => {
    if (threads.length === 0) return;
    setClassifying(true);
    toast.info("AI is analyzing priority of emails...");
    
    // Simulate smart classification based on sender/snippet/subject
    const newPriorities: typeof aiPriorities = {};
    for (const thread of threads) {
      const subjectLower = thread.subject.toLowerCase();
      const snippetLower = thread.snippet.toLowerCase();
      const fromLower = thread.from.email.toLowerCase();

      let priority: "High" | "Medium" | "Low" = "Low";
      let reason = "Routine update or newsletter.";

      if (
        subjectLower.includes("urgent") || 
        subjectLower.includes("important") || 
        snippetLower.includes("schedule") || 
        snippetLower.includes("deadline") ||
        fromLower.includes("boss") || 
        fromLower.includes("founder") ||
        fromLower.includes("ceo")
      ) {
        priority = "High";
        reason = "Contains actionable request, meeting schedule, or came from key contact.";
      } else if (
        subjectLower.includes("meeting") || 
        subjectLower.includes("check-in") || 
        snippetLower.includes("question")
      ) {
        priority = "Medium";
        reason = "Collaborative check-in or request requiring response.";
      }

      newPriorities[thread.id] = { priority, reason };
    }

    setAiPriorities(newPriorities);
    setClassifying(false);
    toast.success("AI Priorities updated!");
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-card">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-muted rounded-full flex justify-center items-center mx-auto text-muted-foreground">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Gmail Connection Required</h2>
          <p className="text-muted-foreground">
            Connect your Gmail integration in settings to start managing your inbox and utilizing AI prioritization.
          </p>
          <Button onClick={() => window.location.href = "/settings"} size="default" className="mt-2">
            Configure Integrations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* 1. Folders Panel (Thin Left) */}
      <div className="w-56 border-r border-border bg-card flex flex-col justify-between p-3 select-none">
        <div className="space-y-4">
          <Button onClick={() => setComposeOpen(true)} className="w-full justify-start gap-2 shadow-sm">
            <Plus className="h-4.5 w-4.5" /> Compose <kbd className="ml-auto text-xs opacity-50">c</kbd>
          </Button>

          <div className="space-y-1">
            <button
              onClick={() => { setActiveFolder("INBOX"); setSelectedThreadId(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "INBOX" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <InboxIcon className="h-4.5 w-4.5" /> Inbox
            </button>
            <button
              onClick={() => { setActiveFolder("STARRED"); setSelectedThreadId(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "STARRED" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Star className="h-4.5 w-4.5" /> Starred
            </button>
            <button
              onClick={() => { setActiveFolder("SENT"); setSelectedThreadId(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "SENT" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Send className="h-4.5 w-4.5" /> Sent
            </button>
            <button
              onClick={() => { setActiveFolder("ARCHIVE"); setSelectedThreadId(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "ARCHIVE" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Archive className="h-4.5 w-4.5" /> Archive
            </button>
            <button
              onClick={() => { setActiveFolder("TRASH"); setSelectedThreadId(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "TRASH" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Trash2 className="h-4.5 w-4.5" /> Trash
            </button>
          </div>
        </div>

        <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
            <span>AI ENGINE</span>
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          </div>
          <Button
            onClick={handleAIPriorityClassification}
            disabled={classifying || threads.length === 0}
            size="sm"
            variant="outline"
            className="w-full text-xs gap-1.5 h-8"
          >
            <RefreshCw className={`h-3 w-3 ${classifying ? "animate-spin" : ""}`} /> Auto-Prioritize
          </Button>
        </div>
      </div>

      {/* 2. Threads List (Middle Panel) */}
      <div className={`border-r border-border bg-card/40 flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedThreadId ? "w-96 shrink-0" : "flex-1"}`}>
        {/* Search Header */}
        <div className="p-3 border-b border-border flex gap-2 bg-card/60">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search mail... (Cmd+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/40 border-border/80 text-sm focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button onClick={() => threadsQuery.refetch()} variant="outline" size="icon" className="h-9 w-9">
            <RefreshCw className={`h-4 w-4 ${threadsQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* List of threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {threadsQuery.isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading threads...</div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No threads found.</div>
          ) : (
            threads.map((thread) => {
              const isSelected = thread.id === selectedThreadId;
              const ai = aiPriorities[thread.id];
              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 ${
                    isSelected ? "bg-muted/65 border-l-2 border-primary" : "hover:bg-muted/20"
                  } ${!thread.isRead ? "font-semibold bg-primary/5 dark:bg-primary/2.5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate pr-2 max-w-[180px]">
                      {thread.from.name || thread.from.email}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal shrink-0">
                      {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: false })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs truncate text-foreground/90 font-medium">
                      {thread.subject}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                    {thread.snippet}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {/* Priority Tag */}
                      {ai && (
                        <Badge 
                          variant={ai.priority === "High" ? "destructive" : ai.priority === "Medium" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold"
                          title={ai.reason}
                        >
                          {ai.priority} Priority
                        </Badge>
                      )}
                      {!thread.isRead && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-500 hover:bg-blue-600 font-bold uppercase">
                          New
                        </Badge>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        starMutation.mutate({
                          tenantId,
                          threadId: thread.id,
                          starred: !thread.isStarred
                        }, { onSuccess: () => threadsQuery.refetch() });
                      }}
                      className="text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      <Star className={`h-4 w-4 ${thread.isStarred ? "fill-amber-400 text-amber-500" : ""}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Thread Reading & Detail (Right Panel) */}
      {selectedThreadId !== null && (
        <div className="flex-1 bg-card flex flex-col h-full overflow-hidden border-l border-border">
          {threadDetailQuery.isLoading ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-muted-foreground bg-muted/5">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Loading conversation...</p>
            </div>
          ) : selectedThread ? (
            <>
              {/* Header controls */}
              <div className="p-3 border-b border-border flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedThreadId(null)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground mr-1"
                    title="Close email reader"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => archiveMutation.mutate({ tenantId, threadId: selectedThread.id }, {
                      onSuccess: () => { toast.success("Thread archived"); setSelectedThreadId(null); threadsQuery.refetch(); }
                    })}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <Archive className="h-4 w-4" /> Archive <kbd className="text-[10px] opacity-40">e</kbd>
                  </Button>
                  <Button
                    onClick={() => trashMutation.mutate({ tenantId, threadId: selectedThread.id }, {
                      onSuccess: () => { toast.success("Moved to Trash"); setSelectedThreadId(null); threadsQuery.refetch(); }
                    })}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <Trash2 className="h-4 w-4" /> Trash
                  </Button>
                </div>

                {aiPriorities[selectedThread.id] && (
                  <div className="flex items-center gap-2 text-xs bg-muted/40 px-3 py-1.5 rounded-lg border border-border/60">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground/80">AI Insight:</span>
                    <span className="text-muted-foreground italic">"{aiPriorities[selectedThread.id]?.reason}"</span>
                  </div>
                )}
              </div>

              {/* Scrollable messages thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/5">
                <div className="border-b border-border/60 pb-4">
                  <h1 className="text-xl font-bold tracking-tight">{selectedThread.subject}</h1>
                </div>

                {(selectedThread.messages ?? []).map((message, idx) => (
                  <div key={message.id || idx} className="bg-card border border-border/80 rounded-xl shadow-sm p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm uppercase">
                          {(message.from.name || message.from.email).slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            {message.from.name || message.from.email}
                            <span className="text-xs text-muted-foreground font-normal">
                              &lt;{message.from.email}&gt;
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            To: {message.to.map((t) => t.name || t.email).join(", ")}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div 
                      className="text-sm text-foreground/90 leading-relaxed break-words pt-1 space-y-2 whitespace-pre-line"
                      dangerouslySetInnerHTML={{ __html: message.body || message.snippet }}
                    />
                  </div>
                ))}
              </div>

              {/* Quick Reply Form */}
              <div className="p-4 border-t border-border bg-card">
                <form onSubmit={handleReplySubmit} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <CornerUpLeft className="h-3.5 w-3.5" />
                    Reply to <span className="font-semibold">{selectedThread.from.name || selectedThread.from.email}</span>
                  </div>
                  <Textarea
                    value={replyBodyInput}
                    onChange={(e) => setReplyBodyInput(e.target.value)}
                    placeholder="Type your reply here..."
                    className="min-h-[100px] resize-none text-sm bg-muted/20 border-border/60 focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={sendEmailMutation.isPending} size="sm" className="gap-1.5 text-xs shadow-sm">
                      <Send className="h-3.5 w-3.5" /> {sendEmailMutation.isPending ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-muted-foreground bg-muted/5">
              <Mail className="h-12 w-12 text-muted-foreground/40 mb-3 animate-bounce" />
              <h3 className="font-semibold text-lg text-foreground/80">Thread Not Found</h3>
              <p className="text-sm max-w-xs mt-1">
                The selected thread could not be loaded. Please select another thread.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Floating Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> New Message
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleComposeSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">To</label>
              <Input
                type="text"
                placeholder="recipients@example.com (comma separated)"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                required
                className="text-sm bg-muted/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Subject</label>
              <Input
                type="text"
                placeholder="Enter subject line"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                required
                className="text-sm bg-muted/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Body</label>
              <Textarea
                placeholder="Write your email here..."
                value={bodyInput}
                onChange={(e) => setBodyInput(e.target.value)}
                required
                className="min-h-[200px] text-sm bg-muted/20 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendEmailMutation.isPending} className="gap-1.5 shadow-sm">
                <Send className="h-4 w-4" /> {sendEmailMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
