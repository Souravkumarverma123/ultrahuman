"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  Inbox as InboxIcon,
  Archive,
  Star,
  Trash2,
  Search,
  Send,
  Sparkles,
  CornerUpLeft,
  CornerUpRight,
  Plus,
  RefreshCw,
  X,
  Paperclip,
  RotateCcw,
} from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { useKeyboardShortcuts } from "~/hooks/use-keyboard-shortcuts";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { useSearchParams } from "next/navigation";

type Folder = "INBOX" | "STARRED" | "SENT" | "ARCHIVE" | "TRASH";

function buildEmailSrcDoc(html: string, frameId: string) {
  return `<!doctype html>
<html>
  <head>
    <base target="_blank" />
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 8px; color: #111827; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.55; overflow: hidden; }
      img { max-width: 100%; height: auto; }
      a { color: #2563eb; }
      table { max-width: 100%; }
    </style>
  </head>
  <body>${html}</body>
  <script>
    function report() {
      var h = document.body.scrollHeight;
      window.parent.postMessage({ type: 'iframe-resize', id: '${frameId}', height: h }, '*');
    }
    document.addEventListener('DOMContentLoaded', report);
    window.addEventListener('load', report);
    setTimeout(report, 200);
    setTimeout(report, 800);
  </script>
</html>`;
}

function EmailBody({ body, snippet, isHtml }: { body: string; snippet: string; isHtml?: boolean }) {
  const content = body || snippet;
  const frameId = useRef(`ef-${Math.random().toString(36).slice(2, 8)}`).current;
  const [frameHeight, setFrameHeight] = useState(200);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.data &&
        e.data.type === "iframe-resize" &&
        e.data.id === frameId &&
        typeof e.data.height === "number" &&
        e.data.height > 0
      ) {
        setFrameHeight(e.data.height + 16);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameId]);

  if (isHtml) {
    return (
      <iframe
        title="Email HTML body"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        srcDoc={buildEmailSrcDoc(content, frameId)}
        className="w-full rounded-lg border border-border bg-white block"
        style={{ height: `${frameHeight}px`, minHeight: "120px" }}
      />
    );
  }

  return (
    <div className="text-sm text-foreground/90 leading-relaxed break-words pt-1 space-y-2 whitespace-pre-line">
      {content}
    </div>
  );
}

function InboxPageContent() {
  const { tenantId } = useTenant();
  const searchParams = useSearchParams();
  const [activeFolder, setActiveFolder] = useState<Folder>("INBOX");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [showReplyPanel, setShowReplyPanel] = useState(false);
  const [showForwardPanel, setShowForwardPanel] = useState(false);
  const [forwardToInput, setForwardToInput] = useState("");
  const [forwardAttachments, setForwardAttachments] = useState<File[]>([]);
  const forwardFileRef = useRef<HTMLInputElement>(null);

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
  const markedReadThreadIds = useRef(new Set<string>());

  // AI Classification Rationale state (cached locally)
  const [aiPriorities, setAiPriorities] = useState<
    Record<string, { priority: "High" | "Medium" | "Low"; reason: string }>
  >({});
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
      q: searchQuery || undefined,
    },
    {
      enabled: isConnected,
      refetchInterval: 15000, // Sync every 15s
    },
  );

  // Fetch individual thread
  const threadDetailQuery = trpc.gmail.getThread.useQuery(
    { tenantId, threadId: selectedThreadId ?? "" },
    { enabled: isConnected && selectedThreadId !== null },
  );

  const utils = trpc.useUtils();

  // Mutations
  const sendEmailMutation = trpc.gmail.sendEmail.useMutation();

  const archiveMutation = trpc.gmail.archiveThread.useMutation({
    onMutate: async ({ threadId }) => {
      await utils.gmail.listThreads.cancel({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });

      const previousThreads = utils.gmail.listThreads.getData({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });

      utils.gmail.listThreads.setData(
        {
          tenantId,
          labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
          q: searchQuery || undefined,
        },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            threads: old.threads.filter((t) => t.id !== threadId),
          };
        }
      );

      return { previousThreads };
    },
    onError: (err, variables, context) => {
      if (context?.previousThreads) {
        utils.gmail.listThreads.setData(
          {
            tenantId,
            labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
            q: searchQuery || undefined,
          },
          context.previousThreads
        );
      }
    },
    onSettled: () => {
      utils.gmail.listThreads.invalidate({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });
    },
  });

  const markReadMutation = trpc.gmail.markAsRead.useMutation({
    onMutate: async ({ threadId }) => {
      await utils.gmail.listThreads.cancel({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });

      const previousThreads = utils.gmail.listThreads.getData({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });

      utils.gmail.listThreads.setData(
        {
          tenantId,
          labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
          q: searchQuery || undefined,
        },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            threads: old.threads.map((t) => {
              if (t.id === threadId) {
                return { ...t, isRead: true };
              }
              return t;
            }),
          };
        }
      );

      return { previousThreads };
    },
    onError: (err, variables, context) => {
      if (context?.previousThreads) {
        utils.gmail.listThreads.setData(
          {
            tenantId,
            labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
            q: searchQuery || undefined,
          },
          context.previousThreads
        );
      }
    },
    onSettled: () => {
      utils.gmail.listThreads.invalidate({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });
    },
  });

  const starMutation = trpc.gmail.starThread.useMutation({
    onMutate: async ({ threadId, starred }) => {
      await utils.gmail.listThreads.cancel({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });

      const previousThreads = utils.gmail.listThreads.getData({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });

      utils.gmail.listThreads.setData(
        {
          tenantId,
          labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
          q: searchQuery || undefined,
        },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            threads: old.threads.map((t) => {
              if (t.id === threadId) {
                return { ...t, isStarred: starred };
              }
              return t;
            }).filter((t) => {
              if (activeFolder === "STARRED" && !starred) {
                return false;
              }
              return true;
            }),
          };
        }
      );

      return { previousThreads };
    },
    onError: (err, variables, context) => {
      if (context?.previousThreads) {
        utils.gmail.listThreads.setData(
          {
            tenantId,
            labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
            q: searchQuery || undefined,
          },
          context.previousThreads
        );
      }
    },
    onSettled: () => {
      utils.gmail.listThreads.invalidate({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });
    },
  });

  const trashMutation = trpc.gmail.trashThread.useMutation({
    onMutate: async ({ threadId }) => {
      await utils.gmail.listThreads.cancel({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });

      const previousThreads = utils.gmail.listThreads.getData({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });

      utils.gmail.listThreads.setData(
        {
          tenantId,
          labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
          q: searchQuery || undefined,
        },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            threads: old.threads.filter((t) => t.id !== threadId),
          };
        }
      );

      return { previousThreads };
    },
    onError: (err, variables, context) => {
      if (context?.previousThreads) {
        utils.gmail.listThreads.setData(
          {
            tenantId,
            labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
            q: searchQuery || undefined,
          },
          context.previousThreads
        );
      }
    },
    onSettled: () => {
      utils.gmail.listThreads.invalidate({
        tenantId,
        labelIds: activeFolder === "ARCHIVE" ? undefined : labelIds,
        q: searchQuery || undefined,
      });
    },
  });

  const untrashMutation = trpc.gmail.untrashThread.useMutation({
    onSettled: () => {
      utils.gmail.listThreads.invalidate({ tenantId });
    },
  });

  const deletePermanentlyMutation = trpc.gmail.deleteThreadPermanently.useMutation({
    onMutate: async ({ threadId }) => {
      await utils.gmail.listThreads.cancel({ tenantId, labelIds: ["TRASH"] });
      const prev = utils.gmail.listThreads.getData({ tenantId, labelIds: ["TRASH"] });
      utils.gmail.listThreads.setData({ tenantId, labelIds: ["TRASH"] }, (old) => {
        if (!old) return old;
        return { ...old, threads: old.threads.filter((t) => t.id !== threadId) };
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.gmail.listThreads.setData({ tenantId, labelIds: ["TRASH"] }, context.prev);
      }
    },
    onSettled: () => {
      utils.gmail.listThreads.invalidate({ tenantId, labelIds: ["TRASH"] });
    },
  });

  const threads = useMemo(() => threadsQuery.data?.threads ?? [], [threadsQuery.data?.threads]);
  const selectedThread = threadDetailQuery.data;
  const markThreadAsRead = markReadMutation.mutate;
  const refetchThreads = threadsQuery.refetch;
  const selectedThreadAutoReadId = selectedThread?.id;
  const selectedThreadIsRead = selectedThread?.isRead;

  // Track currently selected index for keyboard navigation
  const selectedIndex = useMemo(() => {
    if (!selectedThreadId) return -1;
    return threads.findIndex((t) => t.id === selectedThreadId);
  }, [threads, selectedThreadId]);

  // Keyboard Shortcuts Setup
  const shortcuts = useMemo(
    () => ({
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
        const currentId = selectedThreadId;
        const nextT = threads[selectedIndex + 1];
        const prevT = threads[selectedIndex - 1];
        if (selectedIndex < threads.length - 1 && nextT) {
          setSelectedThreadId(nextT.id);
        } else if (threads.length > 1 && prevT) {
          setSelectedThreadId(prevT.id);
        } else {
          setSelectedThreadId(null);
        }
        archiveMutation.mutate(
          { tenantId, threadId: currentId },
          {
            onSuccess: () => {
              toast.success("Thread archived");
            },
            onError: (err) => {
              setSelectedThreadId(currentId);
              toast.error(`Failed to archive: ${err.message}`);
            },
          },
        );
      },
      s: () => {
        if (!selectedThreadId) return;
        const currentThread = threads.find((t) => t.id === selectedThreadId);
        if (!currentThread) return;
        const targetStarred = !currentThread.isStarred;
        if (activeFolder === "STARRED" && !targetStarred) {
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
        starMutation.mutate(
          { tenantId, threadId: selectedThreadId, starred: targetStarred },
          {
            onSuccess: () => {
              toast.success(targetStarred ? "Starred" : "Unstarred");
            },
            onError: (err) => {
              toast.error(`Failed to star: ${err.message}`);
            },
          },
        );
      },
      c: () => {
        setComposeOpen(true);
      },
    }),
    [
      archiveMutation,
      starMutation,
      threads,
      selectedIndex,
      selectedThreadId,
      tenantId,
      threadsQuery,
    ],
  );

  useKeyboardShortcuts(shortcuts);

  // Auto-mark as read when thread is opened
  useEffect(() => {
    if (!selectedThreadAutoReadId || selectedThreadIsRead) return;
    if (markedReadThreadIds.current.has(selectedThreadAutoReadId)) return;

    markedReadThreadIds.current.add(selectedThreadAutoReadId);
    markThreadAsRead(
      { tenantId, threadId: selectedThreadAutoReadId },
      {
        onSuccess: () => {
          refetchThreads();
        },
        onError: (err) => {
          markedReadThreadIds.current.delete(selectedThreadAutoReadId);
          toast.error(`Failed to mark thread as read: ${err.message}`);
        },
      },
    );
  }, [markThreadAsRead, refetchThreads, selectedThreadAutoReadId, selectedThreadIsRead, tenantId]);

  useEffect(() => {
    if (!selectedThreadId) {
      markedReadThreadIds.current.clear();
    }
    // Reset reply/forward panels when switching threads
    setShowReplyPanel(false);
    setReplyBodyInput("");
    setShowForwardPanel(false);
    setForwardToInput("");
    setForwardAttachments([]);
  }, [selectedThreadId]);

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
        },
      },
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
          setShowReplyPanel(false);
          // Refetch the open thread so the reply appears in the conversation
          threadDetailQuery.refetch();
          // Invalidate thread list so the Sent folder picks up the new message
          utils.gmail.listThreads.invalidate({ tenantId });
        },
        onError: (err) => {
          toast.error(`Error sending reply: ${err.message}`);
        },
      },
    );
  };

  const handleForwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardToInput.trim() || !selectedThread) {
      toast.error("Please enter a recipient email.");
      return;
    }

    const lastMessage = selectedThread.messages?.[selectedThread.messages.length - 1];
    const originalDate = lastMessage ? new Date(lastMessage.receivedAt).toUTCString() : "";
    const originalFrom = lastMessage
      ? `${lastMessage.from.name || lastMessage.from.email} &lt;${lastMessage.from.email}&gt;`
      : `${selectedThread.from.name || selectedThread.from.email} &lt;${selectedThread.from.email}&gt;`;
    const originalTo = lastMessage
      ? lastMessage.to.map((t) => `${t.name || t.email} &lt;${t.email}&gt;`).join(", ")
      : "";

    const isHtml = lastMessage?.isHtml ?? false;
    const originalBody = lastMessage?.body || selectedThread.snippet;

    let quotedBody: string;

    if (isHtml) {
      // Wrap the original HTML email inside a proper HTML forward template
      quotedBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;font-size:14px;color:#111;">
  <div style="margin-bottom:16px;color:#555;font-size:13px;border-left:3px solid #ccc;padding-left:12px;">
    <p style="margin:4px 0;"><strong>---------- Forwarded message ----------</strong></p>
    <p style="margin:4px 0;"><strong>From:</strong> ${originalFrom}</p>
    <p style="margin:4px 0;"><strong>Date:</strong> ${originalDate}</p>
    <p style="margin:4px 0;"><strong>Subject:</strong> ${selectedThread.subject}</p>
    <p style="margin:4px 0;"><strong>To:</strong> ${originalTo}</p>
  </div>
  <div>${originalBody}</div>
</body>
</html>`;
    } else {
      // Plain text forward
      const plainFrom = lastMessage
        ? `${lastMessage.from.name || lastMessage.from.email} <${lastMessage.from.email}>`
        : `${selectedThread.from.name || selectedThread.from.email} <${selectedThread.from.email}>`;
      const plainTo = lastMessage
        ? lastMessage.to.map((t) => `${t.name || t.email} <${t.email}>`).join(", ")
        : "";
      quotedBody = `\n\n---------- Forwarded message ----------\nFrom: ${plainFrom}\nDate: ${originalDate}\nSubject: ${selectedThread.subject}\nTo: ${plainTo}\n\n${originalBody}`;
    }

    sendEmailMutation.mutate(
      {
        tenantId,
        to: forwardToInput.split(",").map((s) => s.trim()),
        subject: selectedThread.subject.startsWith("Fwd:")
          ? selectedThread.subject
          : `Fwd: ${selectedThread.subject}`,
        body: quotedBody,
        isHtml,
      },
      {
        onSuccess: () => {
          toast.success("Email forwarded!");
          setShowForwardPanel(false);
          setForwardToInput("");
          setForwardAttachments([]);
          // Invalidate thread list so the Sent folder picks up the forwarded message
          utils.gmail.listThreads.invalidate({ tenantId });
        },
        onError: (err) => {
          toast.error(`Failed to forward: ${err.message}`);
        },
      },
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
            Connect your Gmail integration in settings to start managing your inbox and utilizing AI
            prioritization.
          </p>
          <Button
            onClick={() => (window.location.href = "/settings")}
            size="default"
            className="mt-2"
          >
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
          <Button
            onClick={() => setComposeOpen(true)}
            className="w-full justify-start gap-2 shadow-sm"
          >
            <Plus className="h-4.5 w-4.5" /> Compose{" "}
            <kbd className="ml-auto text-xs opacity-50">c</kbd>
          </Button>

          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveFolder("INBOX");
                setSelectedThreadId(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "INBOX"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <InboxIcon className="h-4.5 w-4.5" /> Inbox
            </button>
            <button
              onClick={() => {
                setActiveFolder("STARRED");
                setSelectedThreadId(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "STARRED"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Star className="h-4.5 w-4.5" /> Starred
            </button>
            <button
              onClick={() => {
                setActiveFolder("SENT");
                setSelectedThreadId(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "SENT"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Send className="h-4.5 w-4.5" /> Sent
            </button>
            <button
              onClick={() => {
                setActiveFolder("ARCHIVE");
                setSelectedThreadId(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "ARCHIVE"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Archive className="h-4.5 w-4.5" /> Archive
            </button>
            <button
              onClick={() => {
                setActiveFolder("TRASH");
                setSelectedThreadId(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeFolder === "TRASH"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
      <div
        className={`border-r border-border bg-card/40 flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedThreadId ? "w-96 shrink-0" : "flex-1"}`}
      >
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
          <Button
            onClick={() => threadsQuery.refetch()}
            variant="outline"
            size="icon"
            className="h-9 w-9"
          >
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
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider font-mono ${
                            ai.priority === "High"
                              ? "timeline-pill-thinking"
                              : ai.priority === "Medium"
                                ? "timeline-pill-read"
                                : "timeline-pill-grep"
                          }`}
                          title={ai.reason}
                        >
                          {ai.priority} Priority
                        </span>
                      )}
                      {!thread.isRead && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold uppercase tracking-wider font-mono">
                          New
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetStarred = !thread.isStarred;
                        if (activeFolder === "STARRED" && !targetStarred && thread.id === selectedThreadId) {
                          setSelectedThreadId(null);
                        }
                        starMutation.mutate(
                          {
                            tenantId,
                            threadId: thread.id,
                            starred: targetStarred,
                          },
                          {
                            onSuccess: () => {
                              toast.success(targetStarred ? "Starred" : "Unstarred");
                            },
                            onError: (err) => {
                              toast.error(`Failed to star: ${err.message}`);
                            },
                          },
                        );
                      }}
                      className="text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      <Star
                        className={`h-4 w-4 ${thread.isStarred ? "fill-amber-400 text-amber-500" : ""}`}
                      />
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
                  {/* ── Toolbar: context-aware based on active folder ── */}
                  {activeFolder === "TRASH" ? (
                    // Trash-specific actions
                    <>
                      <Button
                        onClick={() => {
                          const currentId = selectedThread.id;
                          setSelectedThreadId(null);
                          untrashMutation.mutate(
                            { tenantId, threadId: currentId },
                            {
                              onSuccess: () => toast.success("Restored to Inbox"),
                              onError: (err) => {
                                setSelectedThreadId(currentId);
                                toast.error(`Failed to restore: ${err.message}`);
                              },
                            },
                          );
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        disabled={untrashMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4" /> Restore to Inbox
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                            disabled={deletePermanentlyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" /> Delete Permanently
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-black border border-border/80 text-foreground shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-lg font-bold text-foreground">
                              Permanently Delete Email?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm text-muted-foreground">
                              This action is irreversible. The email thread will be permanently deleted and cannot be recovered from the Trash.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2 sm:gap-0">
                            <AlertDialogCancel className="bg-transparent border border-border/80 hover:bg-muted/10 text-foreground">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                const currentId = selectedThread.id;
                                setSelectedThreadId(null);
                                deletePermanentlyMutation.mutate(
                                  { tenantId, threadId: currentId },
                                  {
                                    onSuccess: () => toast.success("Email permanently deleted"),
                                    onError: (err) => {
                                      setSelectedThreadId(currentId);
                                      toast.error(`Failed to delete: ${err.message}`);
                                    },
                                  },
                                );
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    // Normal folder actions
                    <>
                      <Button
                        onClick={() => {
                          const currentId = selectedThread.id;
                          setSelectedThreadId(null);
                          archiveMutation.mutate(
                            { tenantId, threadId: currentId },
                            {
                              onSuccess: () => toast.success("Thread archived"),
                              onError: (err) => {
                                setSelectedThreadId(currentId);
                                toast.error(`Failed to archive: ${err.message}`);
                              },
                            },
                          );
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                      >
                        <Archive className="h-4 w-4" /> Archive{" "}
                        <kbd className="text-[10px] opacity-40">e</kbd>
                      </Button>
                      <Button
                        onClick={() => {
                          const currentId = selectedThread.id;
                          setSelectedThreadId(null);
                          trashMutation.mutate(
                            { tenantId, threadId: currentId },
                            {
                              onSuccess: () => toast.success("Moved to Trash"),
                              onError: (err) => {
                                setSelectedThreadId(currentId);
                                toast.error(`Failed to move to Trash: ${err.message}`);
                              },
                            },
                          );
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                      >
                        <Trash2 className="h-4 w-4" /> Trash
                      </Button>
                      <Button
                        onClick={() => {
                          setShowReplyPanel((prev) => !prev);
                          setShowForwardPanel(false);
                        }}
                        variant={showReplyPanel ? "default" : "outline"}
                        size="sm"
                        className="gap-1 text-xs"
                      >
                        <CornerUpLeft className="h-4 w-4" /> Reply
                      </Button>
                      <Button
                        onClick={() => {
                          setShowForwardPanel((prev) => !prev);
                          setShowReplyPanel(false);
                        }}
                        variant={showForwardPanel ? "default" : "outline"}
                        size="sm"
                        className="gap-1 text-xs"
                      >
                        <CornerUpRight className="h-4 w-4" /> Forward
                      </Button>
                    </>
                  )}
                </div>

                {aiPriorities[selectedThread.id] && (
                  <div className="flex items-center gap-2 text-xs bg-muted/40 px-3 py-1.5 rounded-lg border border-border/60">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground/80">AI Insight:</span>
                    <span className="text-muted-foreground italic">
                      {aiPriorities[selectedThread.id]?.reason}
                    </span>
                  </div>
                )}
              </div>

              {/* Scrollable messages thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/5">
                <div className="border-b border-border/60 pb-4">
                  <h1 className="text-xl font-bold tracking-tight">{selectedThread.subject}</h1>
                </div>

                {(selectedThread.messages ?? []).map((message, idx) => (
                  <div
                    key={message.id || idx}
                    className="bg-card border border-border rounded-xl p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center font-semibold text-foreground text-xs uppercase">
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

                    <EmailBody
                      body={message.body}
                      snippet={message.snippet}
                      isHtml={message.isHtml}
                    />
                  </div>
                ))}
              </div>

              {/* Quick Reply Form — shown only when Reply button is toggled on */}
              {showReplyPanel && (
                <div className="p-4 border-t border-border bg-card">
                  <form onSubmit={handleReplySubmit} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                        <CornerUpLeft className="h-3.5 w-3.5" />
                        Reply to{" "}
                        <span className="font-semibold">
                          {selectedThread.from.name || selectedThread.from.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowReplyPanel(false); setReplyBodyInput(""); }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                        title="Close reply"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Textarea
                      value={replyBodyInput}
                      onChange={(e) => setReplyBodyInput(e.target.value)}
                      placeholder="Type your reply here..."
                      className="min-h-[100px] resize-none text-sm bg-muted/20 border-border/60 focus-visible:ring-1 focus-visible:ring-ring"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => { setShowReplyPanel(false); setReplyBodyInput(""); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={sendEmailMutation.isPending}
                        size="sm"
                        className="gap-1.5 text-xs shadow-sm"
                      >
                        <Send className="h-3.5 w-3.5" />{" "}
                        {sendEmailMutation.isPending ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Forward Panel */}
              {showForwardPanel && (
                <div className="p-4 border-t border-border bg-card">
                  <form onSubmit={handleForwardSubmit} className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-1">
                        <CornerUpRight className="h-3.5 w-3.5" />
                        Forward email
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowForwardPanel(false); setForwardToInput(""); setForwardAttachments([]); }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                        title="Close forward"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* To field */}
                    <div className="flex items-center gap-2 border border-border/70 rounded-lg px-3 py-2 bg-muted/20 focus-within:ring-1 focus-within:ring-ring">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">To</span>
                      <input
                        type="text"
                        value={forwardToInput}
                        onChange={(e) => setForwardToInput(e.target.value)}
                        placeholder="recipient@example.com"
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                        autoFocus
                        required
                      />
                    </div>

                    {/* Quoted message preview */}
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground font-mono leading-relaxed max-h-36 overflow-y-auto">
                      <p className="text-muted-foreground/70 mb-1">---------- Forwarded message ----------</p>
                      <p>From: {selectedThread.from.name ? `${selectedThread.from.name} <${selectedThread.from.email}>` : selectedThread.from.email}</p>
                      <p>Subject: {selectedThread.subject}</p>
                      <p className="mt-1 whitespace-pre-line line-clamp-3">{selectedThread.snippet}</p>
                    </div>

                    {/* Attached files list */}
                    {forwardAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {forwardAttachments.map((file, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-muted border border-border/60 px-2 py-0.5 rounded-full"
                          >
                            <Paperclip className="h-3 w-3" />
                            {file.name}
                            <button
                              type="button"
                              onClick={() => setForwardAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                              className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Hidden file input */}
                    <input
                      ref={forwardFileRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setForwardAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }
                        e.target.value = "";
                      }}
                    />

                    {/* Footer actions */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => forwardFileRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Paperclip className="h-3.5 w-3.5" /> Attach files
                      </button>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => { setShowForwardPanel(false); setForwardToInput(""); setForwardAttachments([]); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={sendEmailMutation.isPending}
                          size="sm"
                          className="gap-1.5 text-xs shadow-sm"
                        >
                          <Send className="h-3.5 w-3.5" />{" "}
                          {sendEmailMutation.isPending ? "Forwarding..." : "Forward"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Subject
              </label>
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
              <Button
                type="submit"
                disabled={sendEmailMutation.isPending}
                className="gap-1.5 shadow-sm"
              >
                <Send className="h-4 w-4" />{" "}
                {sendEmailMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 items-center justify-center bg-muted/5 text-sm text-muted-foreground">
          Loading inbox...
        </div>
      }
    >
      <InboxPageContent />
    </Suspense>
  );
}
