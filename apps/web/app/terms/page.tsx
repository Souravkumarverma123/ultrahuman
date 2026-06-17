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

const navItems = [
  { label: "Workflow", href: "/#workflow" },
  { label: "Search", href: "/#search" },
  { label: "Agent", href: "/#agent" },
  { label: "FAQ", href: "/#faq" },
];

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "services", title: "Description of Services" },
  { id: "account-security", title: "Account & Security" },
  { id: "acceptable-use", title: "Acceptable Use" },
  { id: "data-privacy", title: "Data and Privacy" },
  { id: "availability", title: "Service Availability" },
  { id: "billing", title: "Billing and Payment" },
  { id: "refund-policy", title: "No Refund Policy" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "limitation", title: "Limitation of Liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "termination", title: "Termination" },
  { id: "compliance", title: "Compliance" },
  { id: "modifications", title: "Modifications" },
  { id: "dispute", title: "Dispute Resolution" },
  { id: "general", title: "General Provisions" },
  { id: "contact", title: "Contact Information" },
];

export default function TermsPage() {
  const [isDark, setIsDark] = useState(false);

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
            Terms of Service
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
            {/* Acceptance */}
            <section id="acceptance" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                1. Acceptance of Terms
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                By accessing or using Ultrahuman&apos;s cloud infrastructure and AI integration workspace (&quot;Services&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms. If you do not agree with any part of these Terms, you must immediately terminate use of our Services.
              </p>
            </section>

            {/* Services */}
            <section id="services" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                2. Description of Services
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ultrahuman provides an AI-augmented unified calendar, email client, and automated scheduling assistant. Our Services integrate directly with third-party productivity environments and comprise:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Instant workspace data syncing and search caching.</li>
                <li>Keyboard-driven calendar time-blocking and meeting coordination.</li>
                <li>AI companion email drafting and automated scheduling task runners.</li>
                <li>Realtime event notification relays.</li>
              </ul>
            </section>

            {/* Account & Security */}
            <section id="account-security" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                3. Account Registration and Security
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground font-semibold text-foreground">
                3.1 Account Creation:
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                To access most features of our Services, you must register for an account. You agree to provide accurate, current, and complete details during registration and to maintain the absolute accuracy of your workspace credentials.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground font-semibold text-foreground">
                3.2 Credential Safeguards:
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You are solely responsible for maintaining the confidentiality of your credentials and linked OAuth authorization tokens. You agree to immediately notify us of any suspicious active sessions or unauthorized access.
              </p>
            </section>

            {/* Acceptable Use */}
            <section id="acceptable-use" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                4. Acceptable Use
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You agree not to use the Services to:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Send spam, bulk marketing emails, or unsolicited invitations.</li>
                <li>Bypass rate limits, perform malicious scraping, or disrupt server database infrastructure.</li>
                <li>Transmit malware, spyware, or engage in phishing campaigns.</li>
                <li>Violate Google API User Data Policies or other third-party terms of service linked to the app.</li>
              </ul>
            </section>

            {/* Data & Privacy */}
            <section id="data-privacy" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                5. Data and Privacy
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your privacy and trust are of paramount importance. Our processing of your emails, calendar events, search indexes, and linked credentials is governed in detail by our <Link href="/privacy" className="text-primary hover:underline font-semibold">Privacy Policy</Link>. By using the Services, you acknowledge the data collection practices described therein.
              </p>
            </section>

            {/* Availability */}
            <section id="availability" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                6. Service Availability
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We make commercial efforts to maintain excellent uptime for our sync services, SSE streams, and dashboard applications. However, we do not warrant that our Services will be uninterrupted, error-free, or that external integration connections (such as Google calendar servers) will always be reachable due to network outages or API modifications.
              </p>
            </section>

            {/* Billing */}
            <section id="billing" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                7. Billing and Payment
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Access to premium agent seats or enhanced database syncing may require recurring payment subscription cycles. You agree to provide a valid payment method. Standard subscription rates are billed in advance on a monthly or annual cycle, as selected during account setup.
              </p>
            </section>

            {/* Refund Policy */}
            <section id="refund-policy" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                8. No Refund Policy
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                All fees billed for workspace plans, premium seats, and team upgrades are final and non-refundable, except as explicitly required by law or specified under localized consumers protection standards.
              </p>
            </section>

            {/* Intellectual Property */}
            <section id="intellectual-property" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                9. Intellectual Property
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The Company owns all rights, titles, and interests in the Ultrahuman software code, website designs, assets, interface layouts, vector indexes, and branding marks. You may not copy, reverse-engineer, or adapt any part of our platform code without our explicit written permission.
              </p>
            </section>

            {/* Limitation */}
            <section id="limitation" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                10. Limitation of Liability
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                To the maximum extent permitted by law, Ultrahuman shall not be liable for any indirect, incidental, special, or consequential damages. This includes, without limitation, loss of business profits, email drafting errors, calendar invite mishaps, data sync lag, or LLM hallucinations causing scheduling errors.
              </p>
            </section>

            {/* Indemnification */}
            <section id="indemnification" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                11. Indemnification
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You agree to indemnify, defend, and hold harmless the Company and its directors from any claims, liabilities, or losses arising from your misuse of the Services, breach of these Terms, or violation of third-party API terms.
              </p>
            </section>

            {/* Termination */}
            <section id="termination" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                12. Termination
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We reserve the right to suspend or terminate your account at any time if we determine that you have violated acceptable use policies, breached these Terms, or failed to clear outstanding workspace seat billing balances. You can terminate your account at any time by triggering the delete profile command in your settings, which immediately revokes connected OAuth permissions and purges cached database keys.
              </p>
            </section>

            {/* Compliance */}
            <section id="compliance" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                13. Compliance
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We comply with global data regulations (including GDPR and CCPA) and Google API user data standards. You agree to use the Services in absolute alignment with your regional data protection compliance duties.
              </p>
            </section>

            {/* Modifications */}
            <section id="modifications" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                14. Modifications to Terms
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We reserve the right to modify these Terms of Service at any time. When updates are published, we will revise the effective date at the top of this page. Your continued use of the Services following updates constitutes acceptance of the new Terms.
              </p>
            </section>

            {/* Dispute */}
            <section id="dispute" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                15. Dispute Resolution
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Any legal claim or dispute arising out of these Terms shall be settled through binding arbitration in accordance with local arbitration procedures, rather than through court actions, except where localized consumer protection laws override arbitration mandates.
              </p>
            </section>

            {/* General */}
            <section id="general" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                16. General Provisions
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                These Terms constitute the entire agreement between you and the Company. If any provision of these Terms is deemed invalid, that provision shall be limited or severed, and the remaining terms will remain in full force.
              </p>
            </section>

            {/* Contact */}
            <section id="contact" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border/60 pb-2">
                17. Contact Information
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                If you have any questions or concerns regarding these Terms of Service, please reach out to us at:
              </p>
              <div className="p-4 bg-muted rounded-xl border border-border/60 max-w-sm">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">Legal Operations</p>
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
