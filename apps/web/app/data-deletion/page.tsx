"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  Unplug,
} from "lucide-react";
import { BrandLogo } from "~/components/brand-logo";
import { Button } from "~/components/ui/button";

const contactEmail = "souravkumarverma56@gmail.com";

const navItems = [
  { label: "Workflow", href: "/#workflow" },
  { label: "Search", href: "/#search" },
  { label: "Agent", href: "/#agent" },
  { label: "FAQ", href: "/#faq" },
];

const sections = [
  { id: "delete-account", title: "Delete Account" },
  { id: "disconnect-google", title: "Disconnect Google" },
  { id: "email-request", title: "Request by Email" },
  { id: "timeframe", title: "Deletion Timeframe" },
  { id: "scope", title: "What We Delete" },
  { id: "contact", title: "Contact" },
];

const deletionCards = [
  {
    icon: Trash2,
    title: "Delete account",
    copy: "Request permanent deletion of your Ultrahuman account, profile details, connected account records, cached Gmail metadata, cached Calendar data, and app-generated workspace data.",
  },
  {
    icon: Unplug,
    title: "Disconnect Google",
    copy: "Revoke Ultrahuman from your Google Account permissions page at any time to stop new Gmail or Calendar access immediately.",
  },
  {
    icon: Clock3,
    title: "Expected timeframe",
    copy: "Deletion requests are acknowledged within 3 business days and completed within 30 calendar days, with limited backup or security logs expiring within 90 days.",
  },
];

export default function DataDeletionPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("landing-theme");
    if (saved) {
      setIsDark(saved === "dark");
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
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
            <BrandLogo className="h-8 w-8" />
            <span className="text-base font-semibold text-foreground">Ultrahuman</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link className="landing-nav-link" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              className="button-secondary flex h-10 w-10 items-center justify-center border-border"
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

      <main className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="mb-12 overflow-hidden rounded-[24px] border border-border bg-card px-6 py-14 text-center shadow-sm md:px-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            User data control
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            Data Deletion Instructions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            This page explains how Ultrahuman users can delete their account, disconnect Google,
            request deletion by email, and understand the expected deletion timeframe.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Route: ultrahuman.co.in/data-deletion
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
          <aside className="sticky top-24 self-start rounded-xl border border-border bg-card/60 p-6 backdrop-blur-md lg:col-span-3">
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Contents
            </h2>
            <nav className="flex flex-col gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block border-l border-transparent py-1 pl-3 -ml-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-10 lg:col-span-9">
            <div className="grid gap-4 md:grid-cols-3">
              {deletionCards.map((card) => (
                <article
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  key={card.title}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold text-foreground">{card.title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.copy}</p>
                </article>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card p-8 space-y-10 md:p-12">
              <section id="delete-account" className="scroll-mt-24 space-y-4">
                <h2 className="border-b border-border/60 pb-2 text-xl font-semibold text-foreground">
                  1. Delete Your Ultrahuman Account
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  To delete your Ultrahuman account, send a deletion request from the email address
                  associated with your Ultrahuman account. We will verify ownership before deleting
                  account records and associated workspace data.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  If you cannot access the registered email address, include the account email,
                  your full name, and any helpful context so we can verify ownership securely.
                </p>
              </section>

              <section id="disconnect-google" className="scroll-mt-24 space-y-4">
                <h2 className="border-b border-border/60 pb-2 text-xl font-semibold text-foreground">
                  2. Disconnect Google
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You can stop Ultrahuman from accessing new Google data immediately by revoking
                  app access in your Google Account:
                </p>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>Open your Google Account and go to Security.</li>
                  <li>Open Third-party apps and services.</li>
                  <li>Select Ultrahuman.</li>
                  <li>Choose Delete all connections or Remove access.</li>
                </ol>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  After revocation, Ultrahuman can no longer fetch new Gmail or Calendar data. To
                  remove cached Google data already stored by Ultrahuman, submit a deletion request
                  using the email instructions below.
                </p>
              </section>

              <section id="email-request" className="scroll-mt-24 space-y-4">
                <h2 className="border-b border-border/60 pb-2 text-xl font-semibold text-foreground">
                  3. Request Deletion by Email
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Email our privacy operations contact with the subject line &quot;Ultrahuman Data
                  Deletion Request&quot;. Include the account email address and whether you want to
                  delete the full account, disconnect Google data, or both.
                </p>
                <div className="max-w-xl rounded-xl border border-border/60 bg-muted p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground">
                    Privacy Operations
                  </p>
                  <a
                    href={`mailto:${contactEmail}?subject=Ultrahuman%20Data%20Deletion%20Request`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {contactEmail}
                  </a>
                </div>
              </section>

              <section id="timeframe" className="scroll-mt-24 space-y-4">
                <h2 className="border-b border-border/60 pb-2 text-xl font-semibold text-foreground">
                  4. Expected Deletion Timeframe
                </h2>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>We acknowledge deletion requests within 3 business days.</li>
                  <li>Verified account and application data deletion is completed within 30 calendar days.</li>
                  <li>
                    Limited security logs, audit records, and encrypted backups may be retained for
                    up to 90 days before automatic expiry, unless a longer period is required by law.
                  </li>
                </ul>
              </section>

              <section id="scope" className="scroll-mt-24 space-y-4">
                <h2 className="border-b border-border/60 pb-2 text-xl font-semibold text-foreground">
                  5. What We Delete
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A verified deletion request removes account profile data, authentication records
                  controlled by Ultrahuman, OAuth connection records, cached Gmail and Calendar data,
                  agent-generated drafts, app preferences, and workspace metadata associated with
                  the account.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Revoking Google access does not delete your data from Google. You can manage or
                  delete source Gmail and Calendar data directly inside your Google services.
                </p>
              </section>

              <section id="contact" className="scroll-mt-24 space-y-4">
                <h2 className="border-b border-border/60 pb-2 text-xl font-semibold text-foreground">
                  6. Contact
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  For privacy questions, access issues, or deletion status updates, contact us at
                  the email address above. We may ask for limited verification details before
                  processing account deletion.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Google data access stops when access is revoked or the account deletion is
                  completed, whichever occurs first.
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative overflow-hidden border-t border-border/60 bg-muted/40 px-6 pt-16 pb-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-12 pb-16 lg:flex-row">
            <div className="flex flex-col gap-4">
              <Link href="/" className="group flex items-center gap-3">
                <BrandLogo className="h-8 w-8" />
                <span className="text-base font-semibold text-foreground">Ultrahuman</span>
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">
                © copyright Ultrahuman 2026. All rights reserved.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:gap-16 lg:gap-20">
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground opacity-80">
                  Pages
                </h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li><Link href="/#workflow" className="transition-colors hover:text-foreground">Workflow</Link></li>
                  <li><Link href="/#search" className="transition-colors hover:text-foreground">Search</Link></li>
                  <li><Link href="/#agent" className="transition-colors hover:text-foreground">Agent</Link></li>
                  <li><Link href="/inbox" className="transition-colors hover:text-foreground">Open App</Link></li>
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground opacity-80">
                  Legal
                </h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li><Link href="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="transition-colors hover:text-foreground">Terms of Service</Link></li>
                  <li><Link href="/cookies" className="transition-colors hover:text-foreground">Cookie Policy</Link></li>
                  <li><Link href="/data-deletion" className="transition-colors hover:text-foreground">Data Deletion</Link></li>
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground opacity-80">
                  Register
                </h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li><Link href="/signup" className="transition-colors hover:text-foreground">Sign Up</Link></li>
                  <li><Link href="/login" className="transition-colors hover:text-foreground">Login</Link></li>
                  <li><Link href="/settings" className="transition-colors hover:text-foreground">Settings</Link></li>
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground opacity-80">
                  Support
                </h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li>
                    <a href={`mailto:${contactEmail}`} className="transition-colors hover:text-foreground">
                      Email support
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://myaccount.google.com/connections"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-foreground"
                    >
                      Google access
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 -mb-8 w-full overflow-hidden text-center select-none">
            <div className="text-[14vw] font-bold leading-none tracking-tight text-foreground opacity-[0.03] dark:opacity-[0.015]">
              Ultrahuman
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
