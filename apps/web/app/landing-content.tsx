"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Database,
  Inbox,
  Keyboard,
  Link2,
  Mail,
  Moon,
  Search,
  Send,
  Sparkles,
  Sun,
  Github,
  Slack,
  Menu,
  X,
  ShieldCheck,
  Zap,
  Clock,
  Lock,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { BrandLogo } from "~/components/brand-logo";
import { InfiniteMovingCards } from "~/components/ui/infinite-moving-cards";
import { TextGenerateEffect } from "~/components/ui/text-generate-effect";

const navItems = [
  { label: "Workflow", href: "/#workflow" },
  { label: "Features", href: "/#features" },
  { label: "Agent", href: "/#agent" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
];

const metrics = [
  { value: "2-in-1", label: "Gmail & Calendar unified in 1 view" },
  { value: "<100ms", label: "Instant keyboard-first search & triage" },
  { value: "1 Prompt", label: "Agent drafts email & schedules Meet" },
];

const featureCards: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  pillText: string;
  pillClass: string;
  tag: string;
  watermark: string;
}> = [
  {
    icon: Search,
    title: "Gmail Grep & Cockpit Search",
    description:
      "Advanced query syntax, filters, and thread context compiled into one zero-latency command bar.",
    pillText: "Grep",
    pillClass: "timeline-pill-grep",
    tag: "GMAIL GREP",
    watermark: "速",
  },
  {
    icon: CalendarClock,
    title: "1-Click Meeting Invites",
    description:
      "Create calendar events, attach Google Meet links, invite attendees, and dispatch companion emails simultaneously.",
    pillText: "Thinking",
    pillClass: "timeline-pill-thinking",
    tag: "CALENDAR INTENT",
    watermark: "生",
  },
  {
    icon: Bot,
    title: "Autonomous Agent Orchestrator",
    description:
      "Execute multi-step workflows across Gmail & Calendar using natural language with visible tool execution logs.",
    pillText: "Edit",
    pillClass: "timeline-pill-edit",
    tag: "AGENT ORCHESTRATOR",
    watermark: "型",
  },
  {
    icon: BellRing,
    title: "Realtime Sync & Webhooks",
    description:
      "Corsair event webhooks stream incoming mail and schedule updates instantly without polling batteries.",
    pillText: "Read",
    pillClass: "timeline-pill-read",
    tag: "WEBHOOK EVENTS",
    watermark: "鎖",
  },
  {
    icon: Keyboard,
    title: "Keyboard-First Shortcuts",
    description:
      "Navigate, draft, archive, and jump between mail, calendar, and AI chat using vim-inspired shortcuts.",
    pillText: "Done",
    pillClass: "timeline-pill-done",
    tag: "KEYBOARD SHORTCUTS",
    watermark: "出",
  },
  {
    icon: Database,
    title: "Local Database & Privacy",
    description:
      "Postgres provides local caching for message state, calendar events, and privacy-first local search storage.",
    pillText: "Grep",
    pillClass: "timeline-pill-grep",
    tag: "LOCAL DATABASE",
    watermark: "析",
  },
];

const proofNotes = [
  {
    eyebrow: "Email triage",
    title: "Search, summarize context, and reply in seconds.",
    detail:
      "Filter by priority, inspect thread context, and trigger AI drafts without navigating away from your command surface.",
  },
  {
    eyebrow: "Scheduling & Invites",
    title: "Create the event and send the follow-up note together.",
    detail:
      "Automatically sync attendees, insert Google Meet links, and dispatch companion emails in one deliberate action.",
  },
  {
    eyebrow: "Multi-Tool Agent",
    title: "One prompt coordinates Gmail and Calendar.",
    detail:
      "Ask Ultrahuman to find an email, check your calendar availability, schedule a meeting, and confirm via email automatically.",
  },
];

const faqItems = [
  {
    question: "Is Ultrahuman replacing Gmail and Google Calendar?",
    answer:
      "No. Ultrahuman connects securely via Google OAuth to provide a lightning-fast, AI-powered unified command surface over your existing Gmail and Google Calendar data.",
  },
  {
    question: "How does Corsair work with my Google account?",
    answer:
      "Corsair supplies the enterprise integration engine—handling OAuth authentication, webhook triggers, token caching, and MCP tool routes to keep your data synced in real-time.",
  },
  {
    question: "Can the AI Agent actually send emails and schedule invites?",
    answer:
      "Yes! The AI agent uses structured tool calls (such as calendar.create_invite and gmail.send_email). Every step is transparently logged so you retain complete control over your actions.",
  },
  {
    question: "Is my email data safe and private?",
    answer:
      "Absolutely. Ultrahuman uses strict OAuth scopes and local database caching. We never store or train models on your private communications.",
  },
  {
    question: "Can I use keyboard shortcuts for everything?",
    answer:
      "Yes! Ultrahuman is engineered for high-velocity output with Command-K (⌘K) search, fast vim navigation, and quick keybindings for reply, archive, and scheduling.",
  },
];

function ProductMockup() {
  const [activeTab, setActiveTab] = useState<"agent" | "inbox" | "schedule">("agent");
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    if (userInteracted) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev === "agent" ? "inbox" : prev === "inbox" ? "schedule" : "agent"));
    }, 6000);
    return () => clearInterval(interval);
  }, [userInteracted]);

  const handleTabClick = (tab: "agent" | "inbox" | "schedule") => {
    setUserInteracted(true);
    setActiveTab(tab);
  };

  const threads = [
    {
      from: "Maya from Corsair",
      subject: "Calendar access & Webhooks active",
      tag: "Verified",
      pillClass: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40",
      dotClass: "bg-blue-500",
    },
    {
      from: "friend@corsair.dev",
      subject: "Thursday product sync timing?",
      tag: "High Priority",
      pillClass: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40 animate-pulse",
      dotClass: "bg-amber-500",
    },
    {
      from: "Operations Team",
      subject: "Q3 roadmap review notes",
      tag: "Processed",
      pillClass: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40",
      dotClass: "bg-emerald-500",
    },
  ];

  return (
    <div
      className="relative w-full max-w-full overflow-hidden bg-card/85 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8"
      role="img"
      aria-label="Ultrahuman product mockup with interactive tab simulator"
    >
      {/* Soft mesh background glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: macOS window controls + Interactive Simulator Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-border/60 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]/80 border border-[#e0443e]/40 shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]/80 border border-[#df9d1e]/40 shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]/80 border border-[#1aab29]/40 shadow-sm" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:inline">
            Interactive Preview
          </span>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-muted/90 rounded-xl border border-border/80 text-xs self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => handleTabClick("agent")}
            className={`simulator-tab shrink-0 whitespace-nowrap ${activeTab === "agent" ? "active" : ""}`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>AI Agent</span>
            </span>
          </button>
          <button
            onClick={() => handleTabClick("inbox")}
            className={`simulator-tab shrink-0 whitespace-nowrap ${activeTab === "inbox" ? "active" : ""}`}
          >
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#f54e00]" />
              <span>Grep Inbox</span>
            </span>
          </button>
          <button
            onClick={() => handleTabClick("schedule")}
            className={`simulator-tab shrink-0 whitespace-nowrap ${activeTab === "schedule" ? "active" : ""}`}
          >
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
              <span>1-Click Schedule</span>
            </span>
          </button>
        </div>
      </div>

      {/* Simulated Search / Prompt Bar */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-muted/80 border border-border/90 text-xs text-foreground font-sans w-full shadow-inner mb-5">
        <Search className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        <div className="truncate text-foreground font-medium flex-1 min-w-0 font-mono text-[11px] sm:text-xs">
          {activeTab === "agent" && (
            <span>
              Schedule product sync with Maya next Thursday at 10 AM, attach Google Meet, and send confirmation email
              <span className="inline-block w-[1.5px] h-3 bg-primary animate-pulse ml-1" />
            </span>
          )}
          {activeTab === "inbox" && (
            <span>
              is:unread category:primary from:corsair.dev
              <span className="inline-block w-[1.5px] h-3 bg-primary animate-pulse ml-1" />
            </span>
          )}
          {activeTab === "schedule" && (
            <span>
              calendar.find_slot duration:30m attendees:friend@corsair.dev
              <span className="inline-block w-[1.5px] h-3 bg-primary animate-pulse ml-1" />
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground bg-background border border-border px-2 py-0.5 rounded shadow-sm font-sans tracking-wide shrink-0">
          ⌘K
        </span>
      </div>

      {/* Tab Dynamic Content */}
      {activeTab === "agent" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left: Execution Steps */}
            <div className="p-4 bg-background/60 border border-border/70 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-muted-foreground uppercase border-b border-border/40 pb-2">
                <span>Agent Execution Graph</span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active Plan
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-muted/60 border border-border/60 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-mono text-[11px] font-medium">1. search_calendar_slots</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">12ms</span>
                </div>
                <div className="p-2.5 bg-muted/60 border border-border/60 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-mono text-[11px] font-medium">2. calendar.create_invite</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">45ms</span>
                </div>
                <div className="p-2.5 bg-muted/60 border border-border/60 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-mono text-[11px] font-medium">3. gmail.send_confirmation</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">28ms</span>
                </div>
              </div>
            </div>

            {/* Right: Plan Outcome */}
            <div className="p-4 bg-background/60 border border-border/70 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-muted-foreground uppercase border-b border-border/40 pb-2 mb-3">
                  <span>Generated Actions</span>
                  <span className="text-primary text-[10px] font-semibold">1-Prompt Executed</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <span>Thu, Jul 30 at 10:00 AM - 10:30 AM</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground pl-6 space-y-1">
                    <p>• Google Meet attached & verified</p>
                    <p>• Attendees: Maya & You</p>
                    <p>• Companion email draft dispatched</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 text-[10px]">
                  Completed in 85ms
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "inbox" && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-muted-foreground uppercase border-b border-border/40 pb-2">
            <span>Priority Grep Triage</span>
            <span className="text-muted-foreground text-[10px] font-mono">Press [R] to Reply • [E] to Archive</span>
          </div>
          <div className="space-y-2.5">
            {threads.map((thread) => (
              <div
                className="p-3.5 bg-background/60 border border-border/70 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-primary/50 transition-colors"
                key={thread.subject}
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{thread.from}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${thread.pillClass}`}>
                      <span className={`h-1 w-1 rounded-full ${thread.dotClass}`} />
                      {thread.tag}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium truncate">
                    {thread.subject}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <kbd className="hidden sm:inline-block px-2 py-1 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
                    Reply [R]
                  </kbd>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-muted-foreground uppercase border-b border-border/40 pb-2">
            <span>Google Calendar + Companion Email Engine</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Meet Link Generated</span>
          </div>
          <div className="grid gap-4 md:grid-cols-7">
            {/* Week slots */}
            <div className="md:col-span-4 grid grid-cols-5 gap-1.5">
              {["Mon 27", "Tue 28", "Wed 29", "Thu 30", "Fri 31"].map((day, idx) => (
                <div
                  key={day}
                  className={`p-2.5 border rounded-xl text-center text-xs flex flex-col justify-between min-h-[75px] ${
                    idx === 3 ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm" : "border-border/60 bg-background/50 text-muted-foreground"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">{day}</span>
                  {idx === 3 ? (
                    <span className="text-[10px] bg-primary text-white py-0.5 rounded font-mono mt-1">10:00 AM</span>
                  ) : (
                    <span className="text-[9px] opacity-60">Free</span>
                  )}
                </div>
              ))}
            </div>

            {/* Companion email preview */}
            <div className="md:col-span-3 p-3.5 bg-background/60 border border-border/70 rounded-xl space-y-2 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Auto Companion Email
                </div>
                <div className="text-xs font-semibold text-foreground">Subject: Product Sync Invitation</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  &quot;Hi Maya, I scheduled our meeting for Thursday at 10 AM. Google Meet link is attached...&quot;
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-2 border-t border-border/40">
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> Sent to Outbox
                </span>
                <span className="font-mono text-muted-foreground">0ms delay</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Footer Bar */}
      <div className="mt-5 p-3 bg-muted/60 border border-border/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <div className="p-1 rounded bg-primary/10 border border-primary/20 text-primary">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <span>Ultrahuman Assistant is ready. Connect Google to activate.</span>
        </div>
        <Button
          asChild
          size="sm"
          className="button-primary h-8 px-3.5 text-xs font-semibold shadow-sm shrink-0"
        >
          <Link href="/inbox">
            Try in Workspace
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function LandingContent() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className={`landing-page min-h-screen overflow-x-hidden text-foreground ${isDark ? "dark-landing" : ""}`}>
      {/* Header */}
      <header className="landing-header sticky top-0 z-30 w-full bg-background/90 backdrop-blur-md border-b border-border">
        <nav
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6"
          aria-label="Main navigation"
        >
          <Link href="/" className="group flex items-center gap-3">
            <BrandLogo className="h-8 w-8" />
            <span className="text-base font-semibold text-foreground">
              Ultrahuman
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a className="landing-nav-link" href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              className="button-secondary h-10 w-10 flex items-center justify-center border-border"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="h-[18px] w-[18px] text-primary" />
              ) : (
                <Moon className="h-[18px] w-[18px] text-foreground" />
              )}
            </Button>

            <Button asChild className="button-primary h-10 px-5 hidden sm:inline-flex">
              <Link href="/inbox">
                Open app
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              variant="outline"
              size="icon"
              className="button-secondary h-10 w-10 flex items-center justify-center border-border md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-[18px] w-[18px] text-foreground" />
              ) : (
                <Menu className="h-[18px] w-[18px] text-foreground" />
              )}
            </Button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-background/95 backdrop-blur-lg md:hidden animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-4 px-6 py-6 font-sans">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-muted-foreground hover:text-primary transition-colors py-1.5"
                >
                  {item.label}
                </a>
              ))}
              <div className="border-t border-border pt-4 mt-2 flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-muted-foreground">Quick Action</span>
                <Button asChild className="button-primary h-10 px-5" onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/inbox">
                    Open app
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Subtle Mesh Glow Background */}
      <div className="absolute top-0 right-0 left-0 h-[650px] bg-gradient-to-b from-[#f54e00]/8 via-transparent to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Integration Logos Ticker */}
      <div className="mx-auto max-w-7xl px-6 pt-10 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-4">
          Integrated directly with your core stack
        </span>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-50 grayscale hover:opacity-90 hover:grayscale-0 transition-all duration-300">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#f54e00]" />
            <span className="text-xs font-semibold font-mono tracking-wider">GMAIL</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-semibold font-mono tracking-wider">GOOGLE CALENDAR</span>
          </div>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-foreground" />
            <span className="text-xs font-semibold font-mono tracking-wider">GITHUB</span>
          </div>
          <div className="flex items-center gap-2">
            <Slack className="h-5 w-5 text-indigo-500" />
            <span className="text-xs font-semibold font-mono tracking-wider">SLACK</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            <span className="text-xs font-semibold font-mono tracking-wider">NOTION</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="bg-card/70 backdrop-blur-xl border border-border/80 rounded-[24px] md:rounded-[32px] p-6 sm:p-10 md:p-12 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="grid gap-10 lg:gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="max-w-2xl">
              {/* Product positioning pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3.5 py-1.5 text-xs text-foreground font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span className="font-semibold">The AI Command Center</span>
                <span className="text-border">|</span>
                <span className="text-muted-foreground">Gmail + Google Calendar</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.12]">
                Your Inbox &amp; Calendar,{" "}
                <span className="bg-gradient-to-r from-primary via-[#ff7330] to-[#ff4e00] bg-clip-text text-transparent font-bold">
                  Supercharged by AI
                </span>
              </h1>

              <TextGenerateEffect
                words="Connect your accounts and let AI draft emails, schedule meetings, create Google Meet links, manage invitations, and organize your day from one lightning-fast workspace."
                className="mt-6"
                textClassName="text-base sm:text-lg leading-relaxed text-muted-foreground font-normal"
                duration={0.4}
              />

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                <Button asChild size="lg" className="button-primary h-11 px-7 text-sm font-semibold shadow-md">
                  <Link href="/inbox">
                    Open Workspace
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="button-secondary h-11 px-6 text-sm font-semibold"
                >
                  <Link href="/chat">
                    Try Agent Flow
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Google OAuth Verified
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-primary" />
                  Local Postgres Caching
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Zero Polling Webhooks
                </span>
              </div>

              {/* Metric Counters */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 border-t border-border/80 pt-8 font-sans">
                {metrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="text-2xl font-bold text-foreground tracking-tight">
                      {metric.value}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground leading-relaxed font-medium">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Interactive Product Simulator */}
            <div className="relative min-w-0 w-full">
              <ProductMockup />
            </div>
          </div>
        </div>
      </section>

      {/* 3-Pillar Interactive Feature Showcase */}
      <section id="features" className="py-20 bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="badge-pill-tag">Core Architecture</span>
            <h2 className="display-lg mt-4 font-normal">
              Three core pillars. One fluid surface.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Ultrahuman replaces fragmented tabs with a single command console built for speed, intent, and clarity.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Pillar 1 */}
            <article className="editorial-card flex flex-col justify-between relative group hover:border-primary/40 transition-all duration-200">
              <div>
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6">
                  <Inbox className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono">Pillar 01</span>
                <h3 className="text-xl font-semibold text-foreground mt-1">
                  Cockpit Grep &amp; Email Triage
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Search Gmail with exact query syntax (<code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">from:</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">has:attachment</code>), classify priorities instantly, and draft replies using keyboard shortcuts.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground font-mono">Gmail Search</span>
                <span className="timeline-pill-grep text-[9px]">Zero Latency</span>
              </div>
            </article>

            {/* Pillar 2 */}
            <article className="editorial-card flex flex-col justify-between relative group hover:border-emerald-500/40 transition-all duration-200">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">Pillar 02</span>
                <h3 className="text-xl font-semibold text-foreground mt-1">
                  Connected Calendar Engine
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Transform email conversations directly into Google Calendar events. Automatically attach Google Meet links, add attendees, and dispatch companion follow-up emails in a single click.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground font-mono">Google Calendar</span>
                <span className="timeline-pill-thinking text-[9px]">1-Click Sync</span>
              </div>
            </article>

            {/* Pillar 3 */}
            <article className="editorial-card flex flex-col justify-between relative group hover:border-indigo-500/40 transition-all duration-200">
              <div>
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mb-6">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 font-mono">Pillar 03</span>
                <h3 className="text-xl font-semibold text-foreground mt-1">
                  Autonomous AI Orchestrator
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Give natural language instructions to coordinate Gmail and Calendar tasks. Ultrahuman executes structured tool calls with full transparency, tool call logs, and audit controls.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground font-mono">Corsair MCP</span>
                <span className="timeline-pill-edit text-[9px]">Visible Tools</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="workflow" className="py-20 bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="max-w-2xl mb-12">
            <span className="badge-pill-tag">Capabilities</span>
            <h2 className="display-lg mt-4 font-normal">
              Engineered for low-friction productivity.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Every detail is designed to remove friction between reading an email and taking action on your schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-border border border-border rounded-2xl overflow-hidden shadow-sm">
            {featureCards.map((feature) => (
              <article 
                className="relative bg-card p-8 flex flex-col justify-between min-h-[220px] transition-colors duration-150 group hover:bg-card/90" 
                key={feature.title}
              >
                {/* Watermark character */}
                <div className="absolute right-6 top-4 select-none pointer-events-none text-[84px] font-bold opacity-[0.03] dark:opacity-[0.02] text-foreground font-sans transition-opacity group-hover:opacity-[0.06]">
                  {feature.watermark}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase font-mono">
                      {feature.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <span className={feature.pillClass}>{feature.pillText}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-20 bg-transparent">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <span className="badge-pill-tag">Interactive Demo</span>
          <h2 className="display-lg mt-4 font-normal">
            See how Ultrahuman operates in real-time
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
            Watch how our unified console manages Gmail search, calendar schedules, and AI agent execution without bouncing between browser tabs.
          </p>

          <div className="mt-10 relative rounded-2xl md:rounded-3xl overflow-hidden border border-border bg-card shadow-2xl max-w-4xl mx-auto aspect-video">
            <video
              src="/presentation.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/5 to-white/10 mix-blend-overlay" />
          </div>
        </div>
      </section>

      {/* Testimonials Wall */}
      <section className="py-20 bg-transparent overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-6 mb-12 text-center">
          <span className="badge-pill-tag">Early Access Wall</span>
          <h2 className="display-lg mt-4 font-normal">
            Loved by early beta testers
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl mx-auto">
            Discover how founders, developers, and product managers save hours every week using Ultrahuman.
          </p>
        </div>
        
        <div className="flex flex-col antialiased items-center justify-center relative overflow-hidden">
          <InfiniteMovingCards
            items={testimonials}
            direction="left"
            speed="slow"
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="badge-pill-tag">FAQ</span>
            <h2 className="display-lg mt-4 font-normal">
              Frequently asked questions.
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground max-w-sm">
              Everything you need to know about OAuth permissions, security, and AI tool capabilities.
            </p>
          </div>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details className="faq-detail" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 bg-transparent">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 md:p-12 shadow-xl">
            {/* Ambient background glow inside CTA banner */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="max-w-2xl space-y-4">
                <span className="badge-pill-tag">Get Started</span>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-snug">
                  Ready to automate your inbox &amp; calendar with AI?
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Join hundreds of productivity leaders using Ultrahuman to draft emails, schedule Google Meet calls, and save hours every single week.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium pt-2">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500" /> Google OAuth Verified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500" /> No Credit Card Required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500" /> Local Database &amp; Privacy
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5 shrink-0">
                <Button asChild size="lg" className="button-primary h-12 px-7 text-sm font-semibold shadow-md">
                  <Link href="/inbox">
                    Open Workspace Free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="button-secondary h-12 px-6 text-sm font-semibold"
                >
                  <Link href="/settings">
                    Connect Google Account
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/60 bg-muted/40 px-6 pt-16 pb-12 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-12 pb-16">
            <div className="flex flex-col gap-4">
              <Link href="/" className="group flex items-center gap-3">
                <BrandLogo className="h-8 w-8" />
                <span className="text-base font-semibold text-foreground">
                  Ultrahuman
                </span>
              </Link>
              <p className="text-xs text-muted-foreground mt-2">
                © copyright Ultrahuman 2026. All rights reserved.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-16 lg:gap-20">
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold text-foreground tracking-wider uppercase opacity-80">Pages</h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li>
                    <Link href="/#workflow" className="hover:text-foreground transition-colors duration-150">
                      Workflow
                    </Link>
                  </li>
                  <li>
                    <Link href="/#features" className="hover:text-foreground transition-colors duration-150">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/#agent" className="hover:text-foreground transition-colors duration-150">
                      Agent
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="hover:text-foreground transition-colors duration-150">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href="/#faq" className="hover:text-foreground transition-colors duration-150">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/inbox" className="hover:text-foreground transition-colors duration-150">
                      Open App
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold text-foreground tracking-wider uppercase opacity-80">Socials</h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li>
                    <a href="https://x.com/SouravKuma74938" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors duration-150">
                      Twitter
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/Souravkumarverma123" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors duration-150">
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com/sourav7534kumar/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors duration-150">
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/in/sourav-kumar-0a3103307/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors duration-150">
                      LinkedIn
                    </a>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold text-foreground tracking-wider uppercase opacity-80">Legal</h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li>
                    <Link href="/privacy" className="hover:text-foreground transition-colors duration-150">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-foreground transition-colors duration-150">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/cookies" className="hover:text-foreground transition-colors duration-150">
                      Cookie Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/data-deletion" className="hover:text-foreground transition-colors duration-150">
                      Data Deletion
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold text-foreground tracking-wider uppercase opacity-80">Register</h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li>
                    <Link href="/signup" className="hover:text-foreground transition-colors duration-150">
                      Sign Up
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="hover:text-foreground transition-colors duration-150">
                      Login
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="w-full text-center select-none pointer-events-none mt-12 -mb-8 overflow-hidden">
            <div className="text-[14vw] font-bold tracking-tight text-foreground opacity-[0.03] dark:opacity-[0.015] leading-none select-none">
              Ultrahuman
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const testimonials = [
  {
    quote: "Ultrahuman has completely transformed how I handle scheduling and emails. Having AI create calendar invites with Meet links directly from an email request saves me hours every week.",
    name: "Surya",
    title: "Lead Developer & Early Access Tester",
  },
  {
    quote: "The Command-K search speed and keyboard shortcuts are incredible. It makes triaging priority emails and scheduling follow-ups feel completely frictionless.",
    name: "Pranjal",
    title: "Product Manager & Beta Tester",
  },
  {
    quote: "The autonomous agent feature is a game-changer. I can type a single prompt and watch it search Gmail, schedule a meeting, and send out confirmation notes automatically.",
    name: "Aadarsh",
    title: "Tech Lead & Beta Tester",
  },
  {
    quote: "The UI design is slick, responsive, and modern. It brings Gmail and Google Calendar into one cohesive cockpit with zero lag.",
    name: "Rachit",
    title: "Product Designer & Early User",
  },
];
