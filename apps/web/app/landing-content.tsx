"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Command,
  Database,
  Inbox,
  Keyboard,
  Link2,
  Mail,
  Moon,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { Button } from "~/components/ui/button";

const navItems = [
  { label: "Workflow", href: "#workflow" },
  { label: "Search", href: "#search" },
  { label: "Agent", href: "#agent" },
  { label: "FAQ", href: "#faq" },
];

const metrics = [
  { value: "2", label: "Google surfaces unified" },
  { value: "100s", label: "Corsair integrations nearby" },
  { value: "1", label: "agent prompt can send both" },
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
    title: "Gmail search without ritual",
    description:
      "Promote advanced query syntax, filters, and thread context into one command-forward search surface.",
    pillText: "Grep",
    pillClass: "timeline-pill-grep",
    tag: "GMAIL GREP",
    watermark: "速",
  },
  {
    icon: CalendarClock,
    title: "Calendar invites in one pass",
    description:
      "Create events, add Meet links, include attendees, and pair the invite with a companion email.",
    pillText: "Thinking",
    pillClass: "timeline-pill-thinking",
    tag: "CALENDAR INTENT",
    watermark: "生",
  },
  {
    icon: Bot,
    title: "Agent chat over real tools",
    description:
      "Ask for email and calendar work in natural language while Corsair-backed actions stay visible.",
    pillText: "Edit",
    pillClass: "timeline-pill-edit",
    tag: "AGENT ORCHESTRATOR",
    watermark: "型",
  },
  {
    icon: BellRing,
    title: "Realtime event hooks",
    description:
      "Corsair webhooks keep incoming mail and schedule changes available without slow polling loops.",
    pillText: "Read",
    pillClass: "timeline-pill-read",
    tag: "WEBHOOK EVENTS",
    watermark: "鎖",
  },
  {
    icon: Keyboard,
    title: "Keyboard-first control",
    description:
      "Move, compose, archive, and jump between mail, calendar, and chat with low-friction commands.",
    pillText: "Done",
    pillClass: "timeline-pill-done",
    tag: "KEYBOARD SHORTCUTS",
    watermark: "出",
  },
  {
    icon: Database,
    title: "Built for local memory",
    description:
      "Postgres becomes the base for cached messages, workflow state, and future vector search.",
    pillText: "Grep",
    pillClass: "timeline-pill-grep",
    tag: "LOCAL DATABASE",
    watermark: "析",
  },
];

const proofNotes = [
  {
    eyebrow: "Email triage",
    title: "Find the thread, understand the ask, draft the reply.",
    detail:
      "Search, classify priority, inspect the latest message, and start a reply without bouncing through Gmail views.",
  },
  {
    eyebrow: "Scheduling",
    title: "Invite someone and send the follow-up note together.",
    detail:
      "The calendar workflow keeps attendees, Meet links, timing, and companion email copy in one deliberate path.",
  },
  {
    eyebrow: "Agent flow",
    title: "One request can cross Gmail and Calendar.",
    detail:
      "The agent can search mail, schedule a meeting, and send a note while surfacing the tools it used.",
  },
];

const faqItems = [
  {
    question: "Is this replacing Gmail and Google Calendar?",
    answer:
      "No. Ultrahuman gives you a faster interface over the same Gmail and Google Calendar data through Corsair integrations.",
  },
  {
    question: "Why use Corsair here?",
    answer:
      "Corsair supplies the integration layer, cached events, OAuth flows, webhooks, and MCP-style tool access that make custom workflows practical.",
  },
  {
    question: "Can the agent actually send email and invites?",
    answer:
      "Yes. The app has agent routes wired to Gmail and Calendar tools so a prompt can coordinate search, sending, and scheduling.",
  },
  {
    question: "Does the page add new backend requirements?",
    answer:
      "No. This landing page is static and links into the existing app routes. No migrations, API changes, or new dependencies are needed.",
  },
  {
    question: "What happens after connecting Google?",
    answer:
      "Users can manage inbox threads, create calendar events, send companion emails, and ask the assistant to perform cross-app work.",
  },
];

function ProductMockup() {
  const threads = [
    {
      from: "Maya from Corsair",
      subject: "Calendar access is connected",
      tag: "Read",
      pillClass: "timeline-pill-read",
    },
    {
      from: "friend@corsair.dev",
      subject: "Thursday meeting time?",
      tag: "Thinking",
      pillClass: "timeline-pill-thinking",
    },
    {
      from: "Operations",
      subject: "Quarterly planning notes",
      tag: "Done",
      pillClass: "timeline-pill-done",
    },
  ];

  return (
    <div
      className="ide-mockup-card p-6 bg-card border border-border"
      role="img"
      aria-label="Ultrahuman product mockup with inbox, calendar, command palette, and agent tool calls"
    >
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#dfa88f]" />
          <span className="w-3 h-3 rounded-full bg-[#9fc9a2]" />
          <span className="w-3 h-3 rounded-full bg-[#9fbbe0]" />
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-muted border border-border text-xs text-muted-foreground font-mono">
          <Command className="h-3.5 w-3.5" aria-hidden="true" />
          Schedule invite and send follow-up
        </div>
      </div>

      <div className="grid gap-4 mt-4 md:grid-cols-2">
        <div className="ide-pane">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <span>Priority inbox</span>
            <span className="text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
          <div className="space-y-2.5">
            {threads.map((thread) => (
              <div className="p-3 bg-card border border-border rounded-lg flex flex-col gap-1.5" key={thread.subject}>
                <div className="flex items-start justify-between">
                  <div className="text-xs font-semibold text-foreground">
                    {thread.from}
                  </div>
                  <span className={thread.pillClass}>
                    {thread.tag}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground font-sans">
                  {thread.subject}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ide-pane">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <span>Thursday</span>
            <span>09:00</span>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Product sync
              </span>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground font-sans">
              friend@corsair.dev
              <br />
              Google Meet attached
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted border border-border">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-muted border border-border rounded-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Agent plan
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground font-mono">
            send_calendar_invite -&gt; send_email
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="button-primary h-8 px-4 text-xs"
        >
          <Link href="/chat">
            Try it
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function LandingContent() {
  const [isDark, setIsDark] = useState(false);

  // Sync with browser theme preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("landing-theme");
    if (saved) {
      setIsDark(saved === "dark");
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(systemPrefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem("landing-theme", nextDark ? "dark" : "light");
  };

  return (
    <div className={`landing-page min-h-screen text-foreground ${isDark ? "dark-landing" : ""}`}>
      <header className="landing-header sticky top-0 z-30 w-full bg-background/90 backdrop-blur-md border-b border-border">
        <nav
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6"
          aria-label="Main navigation"
        >
          <Link href="/" className="group flex items-center gap-3">
            <span className="landing-logo-mark" aria-hidden="true">
              <Sparkles className="h-4 w-4" />
            </span>
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

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
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

            <Button asChild className="button-primary h-10 px-5">
              <Link href="/inbox">
                Open app
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-24 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Corsair-powered Gmail and Calendar workflows
          </div>

          <h1 className="display-mega mt-8 font-normal text-foreground tracking-tight">
            Ultrahuman
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            A Corsair-powered command center for Gmail, Calendar, and the
            agent workflows Google never made obvious.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="button-primary h-11 px-6">
              <Link href="/inbox">
                Open app
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="button-secondary h-11 px-6"
            >
              <Link href="/chat">
                Try agent flow
                <Bot className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 border-t border-border pt-8">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div className="text-2xl font-normal text-foreground">
                  {metric.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <ProductMockup />
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="border-t border-border bg-muted py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="badge-pill-tag">Workflow</span>
            <h2 className="display-lg mt-6">
              The clicks are not the workflow.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Gmail and Calendar are powerful, but their defaults are built for
              everyone. Ultrahuman makes your repeated path the first-class UI.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Inbox,
                title: "Find",
                copy: "Search mail with exact intent, labels, people, and date context.",
                tag: "Grep",
                tagClass: "timeline-pill-grep",
              },
              {
                icon: Send,
                title: "Act",
                copy: "Draft, reply, archive, and send from the same focused surface.",
                tag: "Edit",
                tagClass: "timeline-pill-edit",
              },
              {
                icon: CalendarDays,
                title: "Schedule",
                copy: "Turn a thread into an invite and companion note without switching modes.",
                tag: "Thinking",
                tagClass: "timeline-pill-thinking",
              },
            ].map((item) => (
              <article className="editorial-card flex flex-col justify-between" key={item.title}>
                <div>
                  <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-primary mb-4">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.copy}
                  </p>
                </div>
                <div className="mt-4">
                  <span className={item.tagClass}>{item.tag}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section id="search" className="border-t border-border py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-2 items-center">
          <div className="ide-mockup-card p-6 bg-card">
            <div className="flex items-center gap-3 bg-muted border border-border rounded-lg px-4 py-2 text-xs text-muted-foreground">
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-mono">from:maya has:attachment after:2026/06/01</span>
              <kbd className="ml-auto rounded bg-border px-1.5 py-0.5 text-[10px] text-foreground">
                Enter
              </kbd>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["Maya from Corsair", "OAuth callback docs", "High", "timeline-pill-thinking"],
                ["Platform team", "Webhook retry policy", "Medium", "timeline-pill-read"],
                ["Finance", "Invoice clarification", "Low", "timeline-pill-grep"],
              ].map(([from, subject, priority, pillClass]) => (
                <div className="p-3 bg-muted border border-border rounded-lg flex items-center justify-between" key={subject}>
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {from}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {subject}
                    </div>
                  </div>
                  <span className={pillClass}>{priority}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="badge-pill-tag">Search and mail</span>
            <h2 className="display-lg mt-6">
              Gmail advanced search, shaped like a cockpit.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Keep the power of Gmail queries, but surround them with the
              controls people actually need: priority, thread context, draft
              actions, and fast keyboard paths.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Search threads", "Draft replies", "Send mail", "Classify priority"].map(
                (item) => (
                  <span className="badge-pill-tag" key={item}>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section className="border-t border-border bg-muted py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
          <div>
            <span className="badge-pill-tag">Calendar</span>
            <h2 className="display-lg mt-6">
              Invites, updates, and emails belong together.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Build the schedule UI around what the user is trying to finish:
              choose time, add attendees, attach Meet, and send a human note.
            </p>
          </div>

          <div className="ide-mockup-card p-6 bg-card">
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-muted-foreground uppercase">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, index) => (
                <div
                  className={`p-2 border rounded-lg text-center text-xs flex flex-col justify-between min-h-[60px] ${
                    index === 3
                      ? "border-primary bg-muted"
                      : "border-border bg-muted"
                  }`}
                  key={index}
                >
                  <span className="text-[10px] text-muted-foreground font-semibold">{15 + index}</span>
                  {index === 3 ? <strong className="text-primary text-[10px]">09:00</strong> : null}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="p-3 bg-muted border border-border rounded-lg flex items-center gap-2.5 text-xs text-foreground">
                <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Product sync with friend@corsair.dev</span>
              </div>
              <div className="p-3 bg-muted border border-border rounded-lg flex items-center gap-2.5 text-xs text-foreground">
                <Mail className="h-4 w-4 text-[#c08532]" aria-hidden="true" />
                <span>Companion email queued</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Section */}
      <section id="agent" className="border-t border-border py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-2 items-center">
          <div className="ide-mockup-card p-6 bg-card space-y-4">
            <div className="p-3 bg-muted border border-border rounded-lg text-xs leading-relaxed text-foreground max-w-[90%] ml-auto">
              Send a calendar invite to friend@corsair.dev at 9 AM next Thursday. Send him an email too saying I look forward to our meeting.
            </div>
            <div className="p-3 bg-muted border border-border rounded-lg text-xs leading-relaxed text-muted-foreground max-w-[90%] border-l-2 border-l-primary">
              I found the date, created the Google Calendar invite, attached a Meet link, and sent the follow-up email.
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {["calendar.create_invite", "gmail.send_email", "gmail.search"].map(
                (tool) => (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-[10px] font-semibold text-emerald-600 dark:text-emerald-400" key={tool}>
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    {tool}
                  </span>
                ),
              )}
            </div>
          </div>

          <div>
            <span className="badge-pill-tag">Agent</span>
            <h2 className="display-lg mt-6">
              Chat becomes useful when it can touch the tools.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Corsair MCP-style access turns the assistant into an operator for
              the integrations users already depend on, without forcing every
              workflow into Google&apos;s default screens.
            </p>
            <Button asChild className="button-primary mt-6 h-10 px-6">
              <Link href="/chat">
                Open agent
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="border-t border-border bg-muted py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="max-w-xl">
            <span className="badge-pill-tag">Capabilities</span>
            <h2 className="display-lg mt-6">
              Building blocks for the way you actually work.
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-border border border-border rounded-xl overflow-hidden shadow-none">
            {featureCards.map((feature) => (
              <article 
                className="relative bg-card p-8 flex flex-col justify-between min-h-[220px] transition-colors duration-150 group" 
                key={feature.title}
              >
                {/* Subtle Watermark Character in top-right exactly like user image */}
                <div className="absolute right-6 top-4 select-none pointer-events-none text-[84px] font-bold opacity-[0.03] dark:opacity-[0.02] text-foreground font-sans transition-opacity group-hover:opacity-[0.06]">
                  {feature.watermark}
                </div>

                <div className="space-y-4">
                  {/* Icon + Uppercase Tag label */}
                  <div className="flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
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

      {/* Proof Notes Section */}
      <section className="border-t border-border py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="badge-pill-tag">Workflow proof notes</span>
            <h2 className="display-lg mt-6">
              Clear examples, no invented testimonials.
            </h2>
          </div>
          <div className="grid gap-4">
            {proofNotes.map((note) => (
              <article className="editorial-card" key={note.title}>
                <div className="text-xs text-primary font-semibold">{note.eyebrow}</div>
                <h3 className="mt-2 text-base font-semibold text-foreground">
                  {note.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {note.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-t border-border bg-muted py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="badge-pill-tag">FAQ</span>
            <h2 className="display-lg mt-6">
              Practical answers before you open the app.
            </h2>
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

      {/* CTA Band */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="ide-mockup-card p-8 bg-card flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-l-4 border-l-primary">
            <div>
              <span className="badge-pill-tag">Ready</span>
              <h2 className="display-md mt-4 max-w-xl">
                Open a workspace where mail, calendar, and agent actions finally share one surface.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row shrink-0">
              <Button asChild size="lg" className="button-primary h-11 px-6">
                <Link href="/inbox">
                  Open app
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="button-secondary h-11 px-6"
              >
                <Link href="/settings">
                  Connect Google
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border bg-muted px-6 pt-12 pb-6 overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between pb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="landing-logo-mark" aria-hidden="true">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-semibold text-foreground">Ultrahuman</span>
            </div>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
              Corsair-powered email, calendar, and agent workflows for people
              who want the interface to match the work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground justify-start md:justify-end">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Google OAuth
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
              Realtime hooks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#c08532]" aria-hidden="true" />
              Fast actions
            </span>
          </div>
        </div>

        {/* Massive brand watermark centered exactly like the uploaded reference image */}
        <div className="w-full text-center select-none pointer-events-none mt-6 -mb-6 overflow-hidden">
          <div className="text-[12vw] font-black tracking-tighter uppercase italic opacity-[0.04] dark:opacity-[0.02] text-foreground leading-none">
            Ultrahuman.
          </div>
        </div>
      </footer>
    </div>
  );
}
