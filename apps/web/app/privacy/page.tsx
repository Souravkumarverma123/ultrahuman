"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { BrandLogo } from "~/components/brand-logo";
import { useTheme } from "next-themes";

const navItems = [
  { label: "Workflow", href: "/#workflow" },
  { label: "Search", href: "/#search" },
  { label: "Agent", href: "/#agent" },
  { label: "FAQ", href: "/#faq" },
];

const sections = [
  { id: "overview", title: "Overview" },
  { id: "info-collection", title: "Information Collection" },
  { id: "user-data", title: "User Data" },
  { id: "connected-services", title: "Connected Services" },
  { id: "technical-info", title: "Technical Information" },
  { id: "use-of-info", title: "Use of Information" },
  { id: "data-processing", title: "Data Processing" },
  { id: "data-security", title: "Data Security" },
  { id: "disclosure", title: "Information Disclosure" },
  { id: "data-retention", title: "Data Retention" },
  { id: "user-rights", title: "User Rights" },
  { id: "transfers", title: "International Transfers" },
  { id: "updates", title: "Policy Updates" },
  { id: "compliance", title: "Legal Compliance" },
  { id: "contact", title: "Contact Information" },
];

export default function PrivacyPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className={`landing-page min-h-screen text-foreground ${isDark ? "dark-landing" : ""}`}>
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
              <Link className="landing-nav-link" href={item.href} key={item.href}>
                {item.label}
              </Link>
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

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        {/* Page Title Header */}
        <div className="text-center py-16 mb-12 border border-border bg-card rounded-[24px] shadow-sm relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Effective Date: June 15, 2026
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Sidebar Table of Contents */}
          <aside className="lg:col-span-3 sticky top-24 self-start bg-card/60 backdrop-blur-md border border-border rounded-xl p-6">
            <h2 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-4">
              Contents
            </h2>
            <nav className="flex flex-col gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1 block border-l border-transparent hover:border-primary/40 pl-3 -ml-3"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Right Content Column */}
          <div className="lg:col-span-9 bg-card border border-border rounded-2xl p-8 md:p-12 space-y-12">
            {/* Overview */}
            <section id="overview" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                1. Overview
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This Privacy Policy describes how Ultrahuman (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects information in connection with our AI email and calendar workspace services (&quot;Services&quot;). This policy applies to all users of our Services.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ultrahuman brings productivity and sanity back to daily planning by providing unified search, scheduling, and AI agent automation. To perform these workflows efficiently, we synchronize and secure certain metadata with local cache storage.
              </p>
            </section>

            {/* Information Collection */}
            <section id="info-collection" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                2. Information Collection & Account Information
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We collect account details necessary to authenticate you, connect integrations, and operate your unified cockpit:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li><strong>Identification Data:</strong> Full name, email address, and organization name.</li>
                <li><strong>Authentication Credentials:</strong> Passwords, session cookies, and secure OAuth tokens from integrated services.</li>
                <li><strong>Preferences:</strong> Personal settings, workspace views, theme choices, and keyboard customization properties.</li>
              </ul>
            </section>

            {/* User Data */}
            <section id="user-data" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                3. User Data
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We cache and index user data from integrated workflows locally to deliver instant grep-style search speeds, time-blocking, and intelligent agent routing:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li><strong>Emails & Metadata:</strong> Message subjects, participant lists, date/time timestamps, labels, and thread histories.</li>
                <li><strong>Schedules & Calendars:</strong> Events, descriptions, locations, calendar configurations, and attendee emails.</li>
                <li><strong>AI Companion Drafts:</strong> Temporary companion email bodies, scheduling requests, and user-generated text inputs.</li>
              </ul>
            </section>

            {/* Connected Services */}
            <section id="connected-services" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                4. Connected Services Data
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                With your explicit consent, our Services link directly to external third-party provider accounts (e.g., Google OAuth integration for Gmail and Google Calendar).
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <strong>Google API Disclosure:</strong> Ultrahuman&apos;s use and transfer of information received from Google APIs to any other app will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">Google API Services User Data Policy</a>, including the Limited Use requirements.
              </p>
            </section>

            {/* Technical Information */}
            <section id="technical-info" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                5. Technical Information & Realtime Hooks
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                To guarantee zero polling lag and responsive page state updates, we track certain technical parameters:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li><strong>Webhooks & Events:</strong> Realtime Server-Sent Events (SSE) metadata to push new inbox messages instantly.</li>
                <li><strong>Local Cache Storage:</strong> Browser-side Local Storage variables to persist user theme and dashboard properties.</li>
                <li><strong>Client Metadata:</strong> IP addresses, browser types, client operating systems, and diagnostic application performance logs.</li>
              </ul>
            </section>

            {/* Use of Information */}
            <section id="use-of-info" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                6. Use of Information
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We use collected information solely for operating and optimizing your AI Workspace experience:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Synchronizing integrated mail and calendar databases.</li>
                <li>Processing search strings, grep commands, and scheduling requests.</li>
                <li>Running agent workflows (e.g., calling tools to draft replies, check calendar openings, or send reminders).</li>
                <li>Ensuring security, debugging server errors, and preventing platform abuse.</li>
              </ul>
            </section>

            {/* Data Processing */}
            <section id="data-processing" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                7. Data Processing & Subprocessors
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Data processing occurs on secure servers and local cloud database caches. When you use the conversational agent features, specific query contexts are transmitted to authorized artificial intelligence LLM model subprocessors (e.g. OpenAI API) to interpret prompts and map them into workspace commands. We do not permit subprocessors to train models on your private data.
              </p>
            </section>

            {/* Data Security */}
            <section id="data-security" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                8. Data Security
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We employ advanced organizational and technical safeguards:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Encryption of all data in transit using Transport Layer Security (TLS 1.3).</li>
                <li>Encryption of high-risk stored fields (e.g. access tokens and user credentials) at rest.</li>
                <li>Restricted database query access limits for employees, adhering to the principle of least privilege.</li>
              </ul>
            </section>

            {/* Disclosure */}
            <section id="disclosure" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                9. Information Disclosure
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We never sell, rent, or trade your email content or calendar schedules. We only disclose information to third parties under the following strict conditions:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>To comply with binding legal demands, court subpoenas, or regulatory requests.</li>
                <li>To defend the legal safety and rights of the Company or its users.</li>
                <li>With your explicit user authorization (e.g., triggering a third-party app integration).</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section id="data-retention" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                10. Data Retention
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Cached database elements are retained for as long as your workspace account is active. Upon user deletion requests, we immediately purge all locally stored emails, synced calendar metadata, access logs, and associated OAuth credentials from our active database partitions.
              </p>
            </section>

            {/* User Rights */}
            <section id="user-rights" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                11. User Rights
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Depending on your residency, you possess rights regarding your data:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>The right to request a portable copy of synced metadata.</li>
                <li>The right to restrict specific scopes or revoke linked Google access keys.</li>
                <li>The right to request full account erasure at any time.</li>
              </ul>
            </section>

            {/* Transfers */}
            <section id="transfers" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                12. International Transfers
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Our database infrastructure is based in secure datacenters in the United States and EU. By using our Services, you consent to the storage and secure cross-border routing of user metadata in accordance with standard data transfer safety models.
              </p>
            </section>

            {/* Updates */}
            <section id="updates" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                13. Policy Updates
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We may modify this policy periodically to reflect API scope updates or security requirements. In the event of material updates, we will notify you through application banners or system notifications.
              </p>
            </section>

            {/* Compliance */}
            <section id="compliance" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                14. Legal Compliance
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We actively review practices to maintain alignment with GDPR, CCPA, and standard enterprise security best practices to safeguard user workspaces.
              </p>
            </section>

            {/* Contact */}
            <section id="contact" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                15. Contact Information
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                If you have any questions about this Privacy Policy, your cached metadata, or to submit a deletion request, please reach out to us at:
              </p>
              <div className="p-4 bg-muted rounded-xl border border-border/60 max-w-sm">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">Privacy Operations</p>
                <a href="mailto:souravkumarverma56@gmail.com" className="text-sm text-primary hover:underline font-medium">
                  souravkumarverma56@gmail.com
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border/60 bg-muted/40 px-6 pt-16 pb-12 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-12 pb-16">
            {/* Left Side: Brand and Copyright */}
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

            {/* Right Side: 4 columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-16 lg:gap-20">
              {/* Pages Column */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold text-foreground tracking-wider uppercase opacity-80">Pages</h4>
                <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li>
                    <Link href="/#workflow" className="hover:text-foreground transition-colors duration-150">
                      Workflow
                    </Link>
                  </li>
                  <li>
                    <Link href="/#search" className="hover:text-foreground transition-colors duration-150">
                      Search
                    </Link>
                  </li>
                  <li>
                    <Link href="/#agent" className="hover:text-foreground transition-colors duration-150">
                      Agent
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

              {/* Socials Column */}
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

              {/* Legal Column */}
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

              {/* Register Column */}
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

          {/* Watermark Brand Typography */}
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
