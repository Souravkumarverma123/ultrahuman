"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  Star,
  Loader2,
  Menu,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { BrandLogo } from "~/components/brand-logo";
import { useSession } from "~/lib/auth-client";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";



export default function PricingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // tRPC mutations and queries
  const createCheckoutOrder = trpc.payment.createCheckoutOrder.useMutation();
  
  // Get recent billing info if logged in (for refetching state)
  const billingInfo = trpc.payment.getUserBillingInfo.useQuery(undefined, {
    enabled: !!session,
  });

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", !isDark);
    }
  };

  const handleUpgrade = async () => {
    if (!session) {
      toast.info("Please log in or create an account to upgrade.");
      router.push("/login?redirect=/pricing");
      return;
    }

    try {
      setLoadingCheckout(true);

      // 1. Create order on the backend
      const order = await createCheckoutOrder.mutateAsync({
        billingPeriod: "monthly",
      });

      // 2. Redirect to Dodo hosted checkout page
      window.location.href = order.checkoutUrl;
    } catch (error) {
      const err = error as Error;
      console.error("Failed to initiate checkout:", err);
      toast.error(err.message || "Failed to initiate payment. Please try again.");
      setLoadingCheckout(false);
    }
  };

  const currentTier = billingInfo.data?.subscriptionTier || "free";

  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors duration-150 ${isDark ? "dark" : ""}`}>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-3">
            <BrandLogo className="h-8 w-8" />
            <span className="text-base font-semibold text-foreground">Ultrahuman</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex text-sm font-medium">
            <Link href="/#workflow" className="text-muted-foreground hover:text-foreground transition-colors">Workflow</Link>
            <Link href="/#search" className="text-muted-foreground hover:text-foreground transition-colors">Search</Link>
            <Link href="/#agent" className="text-muted-foreground hover:text-foreground transition-colors">Agent</Link>
            <Link href="/pricing" className="text-foreground transition-colors">Pricing</Link>
            <Link href="/#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              className="h-10 w-10 border-border"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="h-4.5 w-4.5 text-primary" /> : <Moon className="h-4.5 w-4.5 text-foreground" />}
            </Button>

            {session ? (
              <Button asChild className="button-primary h-10 px-5 hidden sm:inline-flex">
                <Link href="/inbox">
                  Dashboard
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button asChild variant="ghost" className="h-10 px-4">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="button-primary h-10 px-5">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              variant="outline"
              size="icon"
              className="h-10 w-10 border-border md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-background/95 backdrop-blur-lg md:hidden animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-4 px-6 py-6 font-sans">
              <Link href="/#workflow" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors py-1.5">Workflow</Link>
              <Link href="/#search" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors py-1.5">Search</Link>
              <Link href="/#agent" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors py-1.5">Agent</Link>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-foreground py-1.5">Pricing</Link>
              <Link href="/#faq" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors py-1.5">FAQ</Link>
              
              <div className="border-t border-border pt-4 mt-2 flex items-center justify-between gap-4">
                {session ? (
                  <>
                    <span className="text-sm font-medium text-muted-foreground">Quick Action</span>
                    <Button asChild className="button-primary h-10 px-5" onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/inbox">
                        Dashboard
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <Button asChild variant="ghost" className="h-10 px-4 flex-1 text-center" onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="button-primary h-10 px-5 flex-1 text-center" onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Pricing Sections */}
      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24 space-y-24">
        {/* Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3.5 py-1.5 text-xs text-primary font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ultrahuman Plans</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            Plans built for speed. Reclaim your focus.
          </h1>
          <p className="text-lg text-muted-foreground">
            Get unified control over your email inbox and schedule. Run advanced AI agent workflows that automate repetitive calendar and email coordination.
          </p>


        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="border border-border bg-card shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-muted-foreground/30 transition-all">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-bold text-foreground">Free Starter</CardTitle>
              <CardDescription className="text-sm">For individuals getting started with unified Gmail & Calendar workflows.</CardDescription>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight">₹0</span>
                <span className="text-muted-foreground text-sm ml-2">/ forever</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="border-t border-border pt-4" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Includes:</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>1 Connected Google Account (Gmail & Calendar)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Basic unified inbox search & templates</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Up to 100 AI Assistant queries per day</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Standard web interface</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-6">
              <Button asChild variant="outline" className="w-full h-11 font-semibold">
                <Link href={session ? "/inbox" : "/signup"}>
                  {currentTier === "free" ? "Current Plan" : "Get Started"}
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-primary bg-card/60 shadow-lg shadow-primary/5 flex flex-col justify-between relative overflow-hidden group transition-all">
            {/* Featured Badge */}
            <div className="absolute right-0 top-0 h-16 w-16">
              <div className="absolute transform rotate-45 bg-primary text-primary-foreground text-[10px] font-bold py-1 px-5 right-[-35px] top-[15px] w-[140px] text-center uppercase tracking-wider">
                Popular
              </div>
            </div>
            
            <CardHeader className="space-y-2 pb-6">
              <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span>Power User</span>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Pro Upgrader</CardTitle>
              <CardDescription className="text-sm">For power users who need multi-account sync and full AI orchestrator support.</CardDescription>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight">₹999</span>
                <span className="text-muted-foreground text-sm ml-2">/ month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="border-t border-border pt-4" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Everything in Free, plus:</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-foreground">Unlimited connected Google accounts</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>AI Email Agent</strong> (Auto-summarizer, drafts, smart replies)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Unlimited Assistant queries</strong> (No daily limits)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Real-time instant push notifications (SSE push)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Corsair workflow tool executor</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Priority developer & chat support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-6">
              <Button
                onClick={handleUpgrade}
                disabled={loadingCheckout || currentTier === "pro"}
                className="w-full h-11 font-semibold button-primary shadow-md hover:shadow-lg"
              >
                {loadingCheckout ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin mr-2" />
                    Opening Checkout...
                  </>
                ) : currentTier === "pro" ? (
                  "Pro Plan Active"
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="space-y-6 pt-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Compare all features</h2>
            <p className="text-sm text-muted-foreground mt-1">Detailed breakdown of start and upgraded capabilities.</p>
          </div>

          <div className="border border-border rounded-xl bg-card overflow-x-auto">
            <Table className="min-w-[600px] md:min-w-full">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[40%] font-semibold">Capability</TableHead>
                  <TableHead className="font-semibold text-center">Free Starter</TableHead>
                  <TableHead className="font-semibold text-center text-primary">Pro Upgrader</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Google Account Syncs</TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">1 Account</TableCell>
                  <TableCell className="text-center text-primary font-semibold text-sm">Unlimited Accounts</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Unified Search Console</TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 mx-auto text-primary" /></TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 mx-auto text-emerald-500" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">AI Daily Assistant Limits</TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">100 queries/day</TableCell>
                  <TableCell className="text-center text-emerald-500 font-semibold text-sm">Unlimited queries</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">AI Email Summarizer</TableCell>
                  <TableCell className="text-center"><X className="h-4 w-4 mx-auto text-muted-foreground/30" /></TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 mx-auto text-emerald-500" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">AI Smart Draft Responses</TableCell>
                  <TableCell className="text-center"><X className="h-4 w-4 mx-auto text-muted-foreground/30" /></TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 mx-auto text-emerald-500" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Real-time Push notifications (SSE)</TableCell>
                  <TableCell className="text-center text-muted-foreground text-xs">Standard (1 min lag)</TableCell>
                  <TableCell className="text-center text-emerald-500 font-semibold text-sm">Instant webhook push</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Corsair MCP Workflow Executor</TableCell>
                  <TableCell className="text-center"><X className="h-4 w-4 mx-auto text-muted-foreground/30" /></TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 mx-auto text-emerald-500" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Developer Support</TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">Standard (Email)</TableCell>
                  <TableCell className="text-center text-emerald-500 font-semibold text-sm">Priority Dev Discord</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto space-y-6 pt-12 pb-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Pricing FAQs</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-8">Clear answers to your pricing and account concerns.</p>
          </div>

          <div className="space-y-3">
            <details className="faq-detail">
              <summary>How does the payment process work?</summary>
              <p>
                We use <strong>Dodo Payments</strong> to process payments. When you click Upgrade, you will be redirected to a secure hosted checkout page. You can pay via Cards, UPI, or other supported local payment methods. Payments are processed securely.
              </p>
            </details>
            
            <details className="faq-detail">
              <summary>Is there a trial available for the Pro plan?</summary>
              <p>
                We offer the Free Starter plan with 1 connected Google account so you can test all the interface core elements. You can upgrade to Pro when you need to sync multiple accounts or remove limits on the AI assistant.
              </p>
            </details>

            <details className="faq-detail">
              <summary>Can I cancel my subscription anytime?</summary>
              <p>
                Yes, you can cancel your subscription at any time directly in your <strong>Settings &gt; Billing</strong> page. Once cancelled, you will retain access to Pro features until the end of your current billing cycle.
              </p>
            </details>

            <details className="faq-detail">
              <summary>Are my linked Google accounts safe?</summary>
              <p>
                Absolutely. We authenticate accounts using Google OAuth via Corsair, meaning we never see or store your Google passwords. You can revoke access at any time through your Google Account permissions.
              </p>
            </details>
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
