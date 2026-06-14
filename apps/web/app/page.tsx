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
  pillText: string;
  pillClass: string;
}> = [
  {
    icon: Search,
    title: "Gmail search without ritual",
    description:
      "Promote advanced query syntax, filters, and thread context into one command-forward search surface.",
    pillText: "Grep",
    pillClass: "timeline-pill-grep",
  },
  {
    icon: CalendarClock,
    title: "Calendar invites in one pass",
    description:
      "Create events, add Meet links, include attendees, and pair the invite with a companion email.",
    pillText: "Thinking",
    pillClass: "timeline-pill-thinking",
  },
  {
    icon: Bot,
    title: "Agent chat over real tools",
    description:
      "Ask for email and calendar work in natural language while Corsair-backed actions stay visible.",
    pillText: "Edit",
    pillClass: "timeline-pill-edit",
  },
  {
    icon: BellRing,
    title: "Realtime event hooks",
    description:
      "Corsair webhooks keep incoming mail and schedule changes available without slow polling loops.",
    pillText: "Read",
    pillClass: "timeline-pill-read",
  },
  {
    icon: Keyboard,
    title: "Keyboard-first control",
    description:
      "Move, compose, archive, and jump between mail, calendar, and chat with low-friction commands.",
    pillText: "Done",
    pillClass: "timeline-pill-done",
  },
  {
    icon: Database,
    title: "Built for local memory",
    description:
      "Postgres becomes the base for cached messages, workflow state, and future vector search.",
    pillText: "Grep",
    pillClass: "timeline-pill-grep",
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
      className="ide-mockup-card p-6 bg-white border border-[#e6e5e0]"
      role="img"
      aria-label="Ultrahuman product mockup with inbox, calendar, command palette, and agent tool calls"
    >
      <div className="flex items-center justify-between pb-4 border-b border-[#e6e5e0]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#dfa88f]" />
          <span className="w-3 h-3 rounded-full bg-[#9fc9a2]" />
          <span className="w-3 h-3 rounded-full bg-[#9fbbe0]" />
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-[#fafaf7] border border-[#e6e5e0] text-xs text-[#5a5852] font-mono">
          <Command className="h-3.5 w-3.5" aria-hidden="true" />
          Schedule invite and send follow-up
        </div>
      </div>

      <div className="grid gap-4 mt-4 md:grid-cols-2">
        <div className="ide-pane">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e6e5e0] text-[11px] font-semibold tracking-wider text-[#807d72] uppercase">
            <span>Priority inbox</span>
            <span className="text-[#1f8a65]">Live</span>
          </div>
          <div className="space-y-2.5">
            {threads.map((thread) => (
              <div className="p-3 bg-white border border-[#e6e5e0] rounded-lg flex flex-col gap-1.5" key={thread.subject}>
                <div className="flex items-start justify-between">
                  <div className="text-xs font-semibold text-[#26251e]">
                    {thread.from}
                  </div>
                  <span className={thread.pillClass}>
                    {thread.tag}
                  </span>
                </div>
                <div className="text-[11px] text-[#5a5852] font-sans">
                  {thread.subject}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ide-pane">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e6e5e0] text-[11px] font-semibold tracking-wider text-[#807d72] uppercase">
            <span>Thursday</span>
            <span>09:00</span>
          </div>
          <div className="p-4 bg-white border border-[#e6e5e0] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#26251e]">
                Product sync
              </span>
              <CalendarDays className="h-4 w-4 text-[#f54e00]" />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#5a5852] font-sans">
              friend@corsair.dev
              <br />
              Google Meet attached
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#fafaf7] border border-[#e6e5e0]">
              <div className="h-full w-2/3 rounded-full bg-[#f54e00]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#26251e]">
            <Sparkles className="h-3.5 w-3.5 text-[#f54e00]" aria-hidden="true" />
            Agent plan
          </div>
          <p className="mt-1 text-[11px] text-[#5a5852] font-mono">
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

export default function Home() {
  return (
    <main className="landing-page min-h-screen text-[#26251e]">
      <header className="landing-header sticky top-0 z-30 w-full bg-[#f7f7f4]/90 backdrop-blur-md border-b border-[#e6e5e0]">
        <nav
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6"
          aria-label="Main navigation"
        >
          <Link href="/" className="group flex items-center gap-3">
            <span className="landing-logo-mark" aria-hidden="true">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold text-[#26251e]">
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

          <Button asChild className="button-primary h-10 px-5">
            <Link href="/inbox">
              Open app
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-24 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e6e5e0] bg-[#fafaf7] px-3 py-1.5 text-xs text-[#5a5852] font-medium">
            <span className="h-2 w-2 rounded-full bg-[#f54e00]" />
            Corsair-powered Gmail and Calendar workflows
          </div>

          <h1 className="display-mega mt-8 font-normal text-[#26251e] tracking-tight">
            Ultrahuman
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-[#5a5852]">
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

          <div className="mt-12 grid grid-cols-3 gap-4 border-t border-[#e6e5e0] pt-8">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div className="text-2xl font-normal text-[#26251e]">
                  {metric.value}
                </div>
                <div className="mt-1 text-xs text-[#807d72] leading-relaxed">
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
      <section id="workflow" className="border-t border-[#e6e5e0] bg-[#fafaf7] py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="badge-pill-tag">Workflow</span>
            <h2 className="display-lg mt-6">
              The clicks are not the workflow.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5a5852]">
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
                  <div className="w-10 h-10 rounded-lg bg-[#fafaf7] border border-[#e6e5e0] flex items-center justify-center text-[#f54e00] mb-4">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#26251e]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5a5852]">
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
      <section id="search" className="border-t border-[#e6e5e0] py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-2 items-center">
          <div className="ide-mockup-card p-6 bg-white">
            <div className="flex items-center gap-3 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg px-4 py-2 text-xs text-[#5a5852]">
              <Search className="h-4 w-4 text-[#f54e00]" aria-hidden="true" />
              <span className="font-mono">from:maya has:attachment after:2026/06/01</span>
              <kbd className="ml-auto rounded bg-[#e6e5e0] px-1.5 py-0.5 text-[10px] text-[#26251e]">
                Enter
              </kbd>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["Maya from Corsair", "OAuth callback docs", "High", "timeline-pill-thinking"],
                ["Platform team", "Webhook retry policy", "Medium", "timeline-pill-read"],
                ["Finance", "Invoice clarification", "Low", "timeline-pill-grep"],
              ].map(([from, subject, priority, pillClass]) => (
                <div className="p-3 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg flex items-center justify-between" key={subject}>
                  <div>
                    <div className="text-xs font-semibold text-[#26251e]">
                      {from}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#5a5852]">
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
            <p className="mt-4 text-base leading-relaxed text-[#5a5852]">
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
      <section className="border-t border-[#e6e5e0] bg-[#fafaf7] py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
          <div>
            <span className="badge-pill-tag">Calendar</span>
            <h2 className="display-lg mt-6">
              Invites, updates, and emails belong together.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5a5852]">
              Build the schedule UI around what the user is trying to finish:
              choose time, add attendees, attach Meet, and send a human note.
            </p>
          </div>

          <div className="ide-mockup-card p-6 bg-white">
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-[#807d72] uppercase">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, index) => (
                <div
                  className={`p-2 border rounded-lg text-center text-xs flex flex-col justify-between min-h-[60px] ${
                    index === 3
                      ? "border-[#f54e00] bg-[#fafaf7]"
                      : "border-[#e6e5e0] bg-[#fafaf7]"
                  }`}
                  key={index}
                >
                  <span className="text-[10px] text-[#807d72] font-semibold">{15 + index}</span>
                  {index === 3 ? <strong className="text-[#f54e00] text-[10px]">09:00</strong> : null}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="p-3 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg flex items-center gap-2.5 text-xs text-[#26251e]">
                <CalendarClock className="h-4 w-4 text-[#f54e00]" aria-hidden="true" />
                <span>Product sync with friend@corsair.dev</span>
              </div>
              <div className="p-3 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg flex items-center gap-2.5 text-xs text-[#26251e]">
                <Mail className="h-4 w-4 text-[#c08532]" aria-hidden="true" />
                <span>Companion email queued</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Section */}
      <section id="agent" className="border-t border-[#e6e5e0] py-20">
        <div className="mx-auto w-full max-w-7xl px-6 grid gap-12 lg:grid-cols-2 items-center">
          <div className="ide-mockup-card p-6 bg-white space-y-4">
            <div className="p-3 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg text-xs leading-relaxed text-[#26251e] max-w-[90%] ml-auto">
              Send a calendar invite to friend@corsair.dev at 9 AM next Thursday. Send him an email too saying I look forward to our meeting.
            </div>
            <div className="p-3 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg text-xs leading-relaxed text-[#5a5852] max-w-[90%] border-l-2 border-l-[#f54e00]">
              I found the date, created the Google Calendar invite, attached a Meet link, and sent the follow-up email.
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#e6e5e0]">
              {["calendar.create_invite", "gmail.send_email", "gmail.search"].map(
                (tool) => (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fafaf7] border border-[#e6e5e0] text-[10px] font-semibold text-[#1f8a65]" key={tool}>
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
            <p className="mt-4 text-base leading-relaxed text-[#5a5852]">
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
      <section className="border-t border-[#e6e5e0] bg-[#fafaf7] py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="max-w-xl">
            <span className="badge-pill-tag">Capabilities</span>
            <h2 className="display-lg mt-6">
              Building blocks for the way you actually work.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article className="editorial-card flex flex-col justify-between" key={feature.title}>
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#fafaf7] border border-[#e6e5e0] flex items-center justify-center text-[#f54e00] mb-4">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#26251e]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5a5852]">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-4">
                  <span className={feature.pillClass}>{feature.pillText}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Proof Notes Section */}
      <section className="border-t border-[#e6e5e0] py-20">
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
                <div className="text-xs text-[#f54e00] font-semibold">{note.eyebrow}</div>
                <h3 className="mt-2 text-base font-semibold text-[#26251e]">
                  {note.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5a5852]">
                  {note.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-t border-[#e6e5e0] bg-[#fafaf7] py-20">
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
      <section className="border-t border-[#e6e5e0] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="ide-mockup-card p-8 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-l-4 border-l-[#f54e00]">
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
      <footer className="border-t border-[#e6e5e0] bg-[#fafaf7] px-6 py-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="landing-logo-mark" aria-hidden="true">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-semibold text-[#26251e]">Ultrahuman</span>
            </div>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-[#5a5852]">
              Corsair-powered email, calendar, and agent workflows for people
              who want the interface to match the work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#5a5852]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#1f8a65]" aria-hidden="true" />
              Google OAuth
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-[#f54e00]" aria-hidden="true" />
              Realtime hooks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#c08532]" aria-hidden="true" />
              Fast actions
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
