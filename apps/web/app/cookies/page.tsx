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
  { id: "how-we-use", title: "How We Use Cookies" },
  { id: "types", title: "Types of Cookies We Use" },
  { id: "third-party", title: "Third-Party Cookies" },
  { id: "managing", title: "Managing Cookies" },
  { id: "updates", title: "Updates to Policy" },
  { id: "contact", title: "Contact Information" },
];

export default function CookiesPage() {
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
            Cookie Policy
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
            <p className="text-sm text-muted-foreground">
              Contact: <a href="mailto:souravkumarverma56@gmail.com" className="text-primary hover:underline font-medium">souravkumarverma56@gmail.com</a>
            </p>

            {/* Overview */}
            <section id="overview" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                1. Overview
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This Cookie Policy explains how Ultrahuman (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar technologies (such as local storage, session storage, and tracking pixels) to recognize you when you visit our landing pages and use our workspace web applications.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We use these technologies to provide and secure our Services, memorize your preferences, optimize search indexing, and deliver a smooth keyboard-driven user interface.
              </p>
            </section>

            {/* How We Use */}
            <section id="how-we-use" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                2. How We Use Cookies
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We use cookies and browser local storage for several vital operational reasons:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>To keep you logged in to your account securely.</li>
                <li>To prevent cross-site request forgery (CSRF) attacks.</li>
                <li>To remember your customization settings, like selected themes (Light/Dark mode) and sidebar state.</li>
                <li>To cache search queries locally for faster client-side page load times.</li>
              </ul>
            </section>

            {/* Types */}
            <section id="types" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                3. Types of Cookies We Use
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground font-semibold text-foreground">
                3.1 Essential & Security Cookies:
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                These cookies are strictly necessary to provide you with services available through our website. They authenticate active user sessions and help protect against platform security risks.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground font-semibold text-foreground">
                3.2 Preference & Customisation of Cookies:
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                These are used to enhance the performance and functionality of our web app but are non-essential to their use. We store your theme selection (`landing-theme`) and calendar layout settings in local storage.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground font-semibold text-foreground">
                3.3 Realtime Channel & Performance Markers:
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                These identify active Server-Sent Events (SSE) channels and background sync routines, helping us ensure websocket-like push updates don&apos;t experience timeout drops.
              </p>
            </section>

            {/* Third-Party */}
            <section id="third-party" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                4. Third-Party Cookies
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                When you link your Google Workspace (Gmail or Google Calendar) via Google OAuth, Google may issue cookies and tokens to authenticate your browser requests directly against their API endpoints. These are managed solely under Google&apos;s privacy policies.
              </p>
            </section>

            {/* Managing */}
            <section id="managing" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                5. Managing Cookies
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Most web browsers are configured to accept cookies by default. You have the right to set your browser to remove or reject browser cookies. Please note that if you choose to refuse or delete cookies, this could affect the availability and functionality of our workspace dashboard features.
              </p>
            </section>

            {/* Updates */}
            <section id="updates" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                6. Updates to Policy
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We may update this Cookie Policy from time to time in order to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
              </p>
            </section>

            {/* Contact */}
            <section id="contact" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                7. Contact Information
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                If you have any questions about our use of cookies or other technologies, please email us at:
              </p>
              <div className="p-4 bg-muted rounded-xl border border-border/60 max-w-sm">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">Compliance Operations</p>
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
