import type { Metadata } from "next";
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
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "~/components/ui/button";

export const metadata: Metadata = {
  title: "Ultrahuman | AI Email and Calendar Workspace",
  description:
    "Ultrahuman is a Corsair-powered command center for Gmail, Google Calendar, and agent workflows across email, search, invites, and scheduling.",
  openGraph: {
    title: "Ultrahuman | AI Email and Calendar Workspace",
    description:
      "A Corsair-powered command center for Gmail, Google Calendar, and agent workflows Google never made obvious.",
    type: "website",
  },
};

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
  tone: "blue" | "green" | "amber";
}> = [
  {
    icon: Search,
    title: "Gmail search without ritual",
    description:
      "Promote advanced query syntax, filters, and thread context into one command-forward search surface.",
    tone: "blue",
  },
  {
    icon: CalendarClock,
    title: "Calendar invites in one pass",
    description:
      "Create events, add Meet links, include attendees, and pair the invite with a companion email.",
    tone: "green",
  },
  {
    icon: Bot,
    title: "Agent chat over real tools",
    description:
      "Ask for email and calendar work in natural language while Corsair-backed actions stay visible.",
    tone: "blue",
  },
  {
    icon: BellRing,
    title: "Realtime event hooks",
    description:
      "Corsair webhooks keep incoming mail and schedule changes available without slow polling loops.",
    tone: "amber",
  },
  {
    icon: Keyboard,
    title: "Keyboard-first control",
    description:
      "Move, compose, archive, and jump between mail, calendar, and chat with low-friction commands.",
    tone: "green",
  },
  {
    icon: Database,
    title: "Built for local memory",
    description:
      "Postgres becomes the base for cached messages, workflow state, and future vector search.",
    tone: "amber",
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

function ToneIcon({
  icon: Icon,
  tone,
}: {
  icon: LucideIcon;
  tone: "blue" | "green" | "amber";
}) {
  return (
    <span className={`landing-icon landing-icon-${tone}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function ProductMockup() {
  const threads = [
    {
      from: "Maya from Corsair",
      subject: "Calendar access is connected",
      tag: "Tools ready",
      tone: "green",
    },
    {
      from: "friend@corsair.dev",
      subject: "Thursday meeting time?",
      tag: "Invite",
      tone: "blue",
    },
    {
      from: "Operations",
      subject: "Quarterly planning notes",
      tag: "Priority",
      tone: "amber",
    },
  ];

  return (
    <div
      className="landing-product-stage"
      role="img"
      aria-label="Ultrahuman product mockup with inbox, calendar, command palette, and agent tool calls"
    >
      <div className="landing-screen gradient-border">
        <div className="landing-screen-top">
          <div className="flex items-center gap-2">
            <span className="landing-dot bg-[#ff6b5d]" />
            <span className="landing-dot bg-[#f5b84b]" />
            <span className="landing-dot bg-[#61d394]" />
          </div>
          <div className="landing-command-mini">
            <Command className="h-3.5 w-3.5" aria-hidden="true" />
            Schedule invite and send follow-up
          </div>
        </div>

        <div className="landing-screen-grid">
          <div className="landing-pane">
            <div className="landing-pane-head">
              <span>Priority inbox</span>
              <span className="landing-live">Live</span>
            </div>
            <div className="space-y-2">
              {threads.map((thread) => (
                <div className="landing-thread" key={thread.subject}>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {thread.from}
                    </div>
                    <div className="mt-1 text-xs text-[#858d98]">
                      {thread.subject}
                    </div>
                  </div>
                  <span className={`landing-chip landing-chip-${thread.tone}`}>
                    {thread.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-pane landing-calendar-pane">
            <div className="landing-pane-head">
              <span>Thursday</span>
              <span>09:00</span>
            </div>
            <div className="landing-calendar-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Product sync
                </span>
                <CalendarDays className="h-4 w-4 text-[#4aa8ff]" />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#a1a8b3]">
                friend@corsair.dev
                <br />
                Google Meet attached
              </p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-[#4aa8ff]" />
              </div>
            </div>
          </div>
        </div>

        <div className="landing-agent-bar">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-[#4aa8ff]" aria-hidden="true" />
              Agent plan
            </div>
            <p className="mt-1 text-xs text-[#858d98]">
              send_calendar_invite -&gt; send_email
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="landing-cta-light h-8 rounded-full px-4 text-xs"
          >
            <Link href="/chat">
              Try it
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="landing-floating-card landing-floating-search gradient-border">
        <div className="flex items-center gap-2 text-xs text-[#a9b2bf]">
          <Search className="h-3.5 w-3.5 text-[#4aa8ff]" aria-hidden="true" />
          from:friend after:next_thursday
        </div>
      </div>

      <div className="landing-floating-card landing-floating-tools gradient-border">
        <div className="text-xs font-semibold text-white">Corsair tools</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="landing-chip landing-chip-blue">gmail.search</span>
          <span className="landing-chip landing-chip-green">
            calendar.invite
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="landing-page min-h-screen overflow-hidden text-[#f6f8fb]">
      {/* Design direction: Fey-close dark glass, compact Geist typography, graphite UI layers, electric blue action line, amber/green workflow status accents. */}
      <header className="landing-header">
        <nav
          className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8"
          aria-label="Main navigation"
        >
          <Link href="/" className="group flex items-center gap-3">
            <span className="landing-logo-mark" aria-hidden="true">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold text-white">
              Ultrahuman
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm text-[#8e97a3] md:flex">
            {navItems.map((item) => (
              <a className="landing-nav-link" href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <Button asChild className="landing-pill-button h-10 px-5">
            <Link href="/inbox">
              Open app
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:pb-24">
        <div className="relative z-10 max-w-3xl">
          <div className="landing-reveal inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-[#b7c0cc] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4aa8ff] shadow-[0_0_18px_rgba(74,168,255,0.8)]" />
            Corsair-powered Gmail and Calendar workflows
          </div>

          <h1 className="landing-hero-title landing-reveal landing-delay-1 mt-8 font-semibold text-white">
            Ultrahuman
          </h1>

          <p className="landing-reveal landing-delay-2 mt-7 max-w-2xl text-lg leading-8 text-[#a5aeb9] md:text-xl md:leading-9">
            A Corsair-powered command center for Gmail, Calendar, and the
            agent workflows Google never made obvious.
          </p>

          <div className="landing-reveal landing-delay-3 mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="landing-primary-button h-12 px-7">
              <Link href="/inbox">
                Open app
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="landing-secondary-button h-12 px-7"
            >
              <Link href="/chat">
                Try agent flow
                <Bot className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="landing-reveal landing-delay-4 mt-11 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div className="landing-metric" key={metric.label}>
                <div className="text-3xl font-semibold text-white">
                  {metric.value}
                </div>
                <div className="mt-2 text-sm leading-5 text-[#808895]">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-reveal landing-delay-2 relative">
          <ProductMockup />
        </div>
      </section>

      <section id="workflow" className="landing-section">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="landing-kicker">Workflow</p>
            <h2 className="landing-section-title">
              The clicks are not the workflow.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#99a2ae]">
              Gmail and Calendar are powerful, but their defaults are built for
              everyone. Ultrahuman makes your repeated path the first-class UI.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Inbox,
                title: "Find",
                copy: "Search mail with exact intent, labels, people, and date context.",
                tone: "blue" as const,
              },
              {
                icon: Send,
                title: "Act",
                copy: "Draft, reply, archive, and send from the same focused surface.",
                tone: "green" as const,
              },
              {
                icon: CalendarDays,
                title: "Schedule",
                copy: "Turn a thread into an invite and companion note without switching modes.",
                tone: "amber" as const,
              },
            ].map((item) => (
              <article className="landing-card" key={item.title}>
                <ToneIcon icon={item.icon} tone={item.tone} />
                <h3 className="mt-5 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#8f98a5]">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="search" className="landing-section">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-2">
          <div className="landing-tool-surface gradient-border">
            <div className="landing-search-bar">
              <Search className="h-4 w-4 text-[#4aa8ff]" aria-hidden="true" />
              <span>from:maya has:attachment after:2026/06/01</span>
              <kbd className="ml-auto rounded bg-white/10 px-2 py-1 text-[11px] text-[#b7c0cc]">
                Enter
              </kbd>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["Maya from Corsair", "OAuth callback docs", "High"],
                ["Platform team", "Webhook retry policy", "Medium"],
                ["Finance", "Invoice clarification", "Low"],
              ].map(([from, subject, priority]) => (
                <div className="landing-search-result" key={subject}>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {from}
                    </div>
                    <div className="mt-1 text-xs text-[#818a96]">
                      {subject}
                    </div>
                  </div>
                  <span className="text-xs text-[#4aa8ff]">{priority}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="landing-kicker">Search and mail</p>
            <h2 className="landing-section-title">
              Gmail advanced search, shaped like a cockpit.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#99a2ae]">
              Keep the power of Gmail queries, but surround them with the
              controls people actually need: priority, thread context, draft
              actions, and fast keyboard paths.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["Search threads", "Draft replies", "Send mail", "Classify priority"].map(
                (item) => (
                  <span className="landing-soft-chip" key={item}>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="landing-kicker">Calendar</p>
            <h2 className="landing-section-title">
              Invites, updates, and emails belong together.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#99a2ae]">
              Build the schedule UI around what the user is trying to finish:
              choose time, add attendees, attach Meet, and send a human note.
            </p>
          </div>

          <div className="landing-calendar-surface gradient-border">
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#737d89]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, index) => (
                <div
                  className={`landing-day-cell ${
                    index === 3 ? "landing-day-cell-active" : ""
                  }`}
                  key={index}
                >
                  <span>{15 + index}</span>
                  {index === 3 ? <strong>09:00</strong> : null}
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="landing-meeting-block">
                <CalendarClock
                  className="h-4 w-4 text-[#61d394]"
                  aria-hidden="true"
                />
                <span>Product sync with friend@corsair.dev</span>
              </div>
              <div className="landing-meeting-block">
                <Mail className="h-4 w-4 text-[#f5b84b]" aria-hidden="true" />
                <span>Companion email queued</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="agent" className="landing-section">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-2">
          <div className="landing-agent-surface gradient-border">
            <div className="landing-agent-message landing-agent-message-user">
              Send a calendar invite to friend@corsair.dev at 9 AM next
              Thursday. Send him an email too saying I look forward to our
              meeting.
            </div>
            <div className="landing-agent-message landing-agent-message-bot">
              I found the date, created the Google Calendar invite, attached a
              Meet link, and sent the follow-up email.
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["calendar.create_invite", "gmail.send_email", "gmail.search"].map(
                (tool) => (
                  <span className="landing-tool-chip" key={tool}>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {tool}
                  </span>
                ),
              )}
            </div>
          </div>

          <div>
            <p className="landing-kicker">Agent</p>
            <h2 className="landing-section-title">
              Chat becomes useful when it can touch the tools.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#99a2ae]">
              Corsair MCP-style access turns the assistant into an operator for
              the integrations users already depend on, without forcing every
              workflow into Google&apos;s default screens.
            </p>
            <Button asChild className="landing-pill-button mt-7 h-11 px-6">
              <Link href="/chat">
                Open agent
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="landing-kicker">Capabilities</p>
            <h2 className="landing-section-title">
              Building blocks for the way you actually work.
            </h2>
          </div>
          <div className="mt-9 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article className="landing-card" key={feature.title}>
                <ToneIcon icon={feature.icon} tone={feature.tone} />
                <h3 className="mt-5 text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#8f98a5]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="landing-kicker">Workflow proof notes</p>
            <h2 className="landing-section-title">
              Clear examples, no invented testimonials.
            </h2>
          </div>
          <div className="grid gap-3">
            {proofNotes.map((note) => (
              <article className="landing-proof" key={note.title}>
                <div className="text-sm text-[#4aa8ff]">{note.eyebrow}</div>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  {note.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#8f98a5]">
                  {note.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="landing-section">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="landing-kicker">FAQ</p>
            <h2 className="landing-section-title">
              Practical answers before you open the app.
            </h2>
          </div>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details className="landing-faq" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="landing-final-cta gradient-border mx-auto max-w-7xl">
          <div>
            <p className="landing-kicker">Ready</p>
            <h2 className="landing-section-title max-w-3xl">
              Open a workspace where mail, calendar, and agent actions finally
              share one surface.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="landing-primary-button h-12 px-7">
              <Link href="/inbox">
                Open app
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="landing-secondary-button h-12 px-7"
            >
              <Link href="/settings">
                Connect Google
                <Link2 className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="landing-logo-mark" aria-hidden="true">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-semibold text-white">Ultrahuman</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#858e9a]">
              Corsair-powered email, calendar, and agent workflows for people
              who want the interface to match the work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#858e9a]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#61d394]" aria-hidden="true" />
              Google OAuth
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#4aa8ff]" aria-hidden="true" />
              Realtime hooks
            </span>
            <span className="inline-flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#f5b84b]" aria-hidden="true" />
              Fast actions
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
