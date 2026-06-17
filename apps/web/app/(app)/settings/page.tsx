"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Loader2,
} from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { useSession } from "~/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { toast } from "sonner";



function SettingsPageContent() {
  const searchParams = useSearchParams();
  const { tenantId } = useTenant();
  const { data: session } = useSession();
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // tRPC queries/mutations
  const gmailStatus = trpc.gmail.getConnectionStatus.useQuery(
    { tenantId },
    {
      refetchOnWindowFocus: true,
    },
  );
  const calendarStatus = trpc.calendar.getConnectionStatus.useQuery(
    { tenantId },
    {
      refetchOnWindowFocus: true,
    },
  );

  const getGmailAuthUrl = trpc.gmail.getAuthUrl.useQuery({ tenantId }, { enabled: false });
  const getCalendarAuthUrl = trpc.calendar.getAuthUrl.useQuery({ tenantId }, { enabled: false });

  // Payments queries/mutations
  const billingInfo = trpc.payment.getUserBillingInfo.useQuery(undefined, {
    enabled: !!session,
  });
  const createCheckoutOrder = trpc.payment.createCheckoutOrder.useMutation();

  // Check query parameters for redirect outcomes
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const payment = searchParams.get("payment");

    if (connected) {
      toast.success(
        `Successfully connected ${connected === "gmail" ? "Gmail" : "Google Calendar"}!`,
      );
      window.history.replaceState({}, document.title, window.location.pathname);
      gmailStatus.refetch();
      calendarStatus.refetch();
    }
    if (error) {
      toast.error("Failed to connect account. Please check your credentials and try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (payment === "success") {
      toast.success("Payment verified! Welcome to Ultrahuman Pro!");
      window.history.replaceState({}, document.title, window.location.pathname);
      billingInfo.refetch();
    }
  }, [calendarStatus, gmailStatus, searchParams, billingInfo]);

  const handleConnectGmail = async () => {
    try {
      const { url } = await getGmailAuthUrl.refetch().then((res) => res.data!);
      window.location.href = url;
    } catch {
      toast.error("Failed to retrieve authorization URL for Gmail.");
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const { url } = await getCalendarAuthUrl.refetch().then((res) => res.data!);
      window.location.href = url;
    } catch {
      toast.error("Failed to retrieve authorization URL for Google Calendar.");
    }
  };

  const handleUpgrade = async () => {
    if (!session) {
      toast.error("Please log in to upgrade your subscription.");
      return;
    }

    try {
      setLoadingCheckout(true);

      // 1. Create order on the backend (defaulting to monthly Pro for settings panel)
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
  const transactions = billingInfo.data?.transactions || [];

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Integrations & Settings</h1>
        <p className="text-muted-foreground mt-1.5">
          Connect your Google accounts via Corsair to enable unified mail, calendar scheduling, and
          AI orchestration.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gmail Card */}
        <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Mail className="h-5 w-5 text-red-500" /> Gmail Integration
              </CardTitle>
              <CardDescription>Search, draft, and send emails securely</CardDescription>
            </div>
            {gmailStatus.data?.connected ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" /> Disconnected
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {gmailStatus.data?.connected ? (
              <div className="text-sm bg-muted/40 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Linked Account</p>
                  <p className="font-medium text-foreground">{gmailStatus.data.email}</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Give Ultrahuman access to retrieve messages, compile threads, draft replies, and
                deliver messages on your behalf.
              </p>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/60 bg-muted/5 px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => gmailStatus.refetch()}
              disabled={gmailStatus.isFetching}
            >
              <RefreshCw
                className={`h-3 w-3 mr-1.5 ${gmailStatus.isFetching ? "animate-spin" : ""}`}
              />{" "}
              Sync Status
            </Button>
            <Button
              size="sm"
              onClick={handleConnectGmail}
              variant={gmailStatus.data?.connected ? "secondary" : "default"}
            >
              {gmailStatus.data?.connected ? "Reconnect Account" : "Connect Account"}{" "}
              <ArrowRight className="h-4.5 w-4.5 ml-1.5" />
            </Button>
          </CardFooter>
        </Card>

        {/* Google Calendar Card */}
        <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" /> Google Calendar
              </CardTitle>
              <CardDescription>
                Manage schedule, check availability, and send invites
              </CardDescription>
            </div>
            {calendarStatus.data?.connected ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" /> Disconnected
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {calendarStatus.data?.connected ? (
              <div className="text-sm bg-muted/40 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Linked Account</p>
                  <p className="font-medium text-foreground">{calendarStatus.data.email}</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Integrate Google Calendar to enable meeting scheduling, real-time availability
                lookups, and direct Google Meet creation.
              </p>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/60 bg-muted/5 px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => calendarStatus.refetch()}
              disabled={calendarStatus.isFetching}
            >
              <RefreshCw
                className={`h-3 w-3 mr-1.5 ${calendarStatus.isFetching ? "animate-spin" : ""}`}
              />{" "}
              Sync Status
            </Button>
            <Button
              size="sm"
              onClick={handleConnectCalendar}
              variant={calendarStatus.data?.connected ? "secondary" : "default"}
            >
              {calendarStatus.data?.connected ? "Reconnect Account" : "Connect Account"}{" "}
              <ArrowRight className="h-4.5 w-4.5 ml-1.5" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Subscription & Billing Card */}
      <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Subscription & Billing</CardTitle>
          </div>
          <CardDescription>Manage your plans, checkout upgrades, and view payment receipt transactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-muted/30 border border-border rounded-xl gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Plan</span>
              <h3 className="text-lg font-bold flex items-center gap-2">
                {currentTier === "pro" ? (
                  <>
                    <span className="text-primary">Pro Upgrader</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                      Active
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">Free Starter</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      Free Forever
                    </span>
                  </>
                )}
              </h3>
              <p className="text-xs text-muted-foreground max-w-lg">
                {currentTier === "pro"
                  ? "Enjoying unlimited linked Google accounts, advanced AI drafts and email agents, real-time push streams, and priority developer support."
                  : "Limited to 1 connected Google workspace, standard search query options, and 100 AI assistant requests per day."}
              </p>
            </div>
            
            {currentTier === "free" ? (
              <Button
                onClick={handleUpgrade}
                disabled={loadingCheckout}
                className="button-primary font-semibold shadow-sm hover:shadow shrink-0 w-full sm:w-auto"
              >
                {loadingCheckout ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Opening checkout...
                  </>
                ) : (
                  <>
                    Upgrade to Pro (₹499/mo)
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground bg-muted border border-border/60 rounded-lg p-3 shrink-0 max-w-[240px]">
                To cancel or update payment details, please contact billing support at{" "}
                <span className="text-foreground font-semibold">billing@ultrahuman.co.in</span>
              </div>
            )}
          </div>

          {/* Billing Transaction History */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Transaction History</h4>
            {billingInfo.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading billing history...
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
                No recent payment transactions logged.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden bg-background/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-semibold">Checkout Session ID</TableHead>
                      <TableHead className="text-xs font-semibold">Payment ID</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="text-xs">
                        <TableCell className="font-mono">{tx.dodoCheckoutSessionId}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {tx.dodoPaymentId || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          ₹{(tx.amount / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              tx.status === "success"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                : tx.status === "pending"
                                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                  : "bg-red-500/10 border-red-500/20 text-red-500"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 items-center justify-center bg-muted/5 text-sm text-muted-foreground">
          Loading settings...
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
