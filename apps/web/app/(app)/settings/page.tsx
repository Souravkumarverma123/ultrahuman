"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Calendar as CalendarIcon, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const { tenantId } = useTenant();

  // tRPC queries/mutations
  const gmailStatus = trpc.gmail.getConnectionStatus.useQuery({ tenantId }, {
    refetchOnWindowFocus: true,
  });
  const calendarStatus = trpc.calendar.getConnectionStatus.useQuery({ tenantId }, {
    refetchOnWindowFocus: true,
  });

  const getGmailAuthUrl = trpc.gmail.getAuthUrl.useQuery(
    { tenantId },
    { enabled: false }
  );
  const getCalendarAuthUrl = trpc.calendar.getAuthUrl.useQuery(
    { tenantId },
    { enabled: false }
  );

  // Check query parameters for redirect outcomes
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      toast.success(`Successfully connected ${connected === "gmail" ? "Gmail" : "Google Calendar"}!`);
      // Clean up URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      gmailStatus.refetch();
      calendarStatus.refetch();
    }
    if (error) {
      toast.error("Failed to connect account. Please check your credentials and try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  const handleConnectGmail = async () => {
    try {
      const { url } = await getGmailAuthUrl.refetch().then(res => res.data!);
      window.location.href = url;
    } catch {
      toast.error("Failed to retrieve authorization URL for Gmail.");
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const { url } = await getCalendarAuthUrl.refetch().then(res => res.data!);
      window.location.href = url;
    } catch {
      toast.error("Failed to retrieve authorization URL for Google Calendar.");
    }
  };

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Integrations & Settings</h1>
        <p className="text-muted-foreground mt-1.5">
          Connect your Google accounts via Corsair to enable unified mail, calendar scheduling, and AI orchestration.
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
                Give Ultrahuman access to retrieve messages, compile threads, draft replies, and deliver messages on your behalf.
              </p>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/60 bg-muted/5 px-6 py-4 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => gmailStatus.refetch()} disabled={gmailStatus.isFetching}>
              <RefreshCw className={`h-3 w-3 mr-1.5 ${gmailStatus.isFetching ? "animate-spin" : ""}`} /> Sync Status
            </Button>
            <Button
              size="sm"
              onClick={handleConnectGmail}
              variant={gmailStatus.data?.connected ? "secondary" : "default"}
            >
              {gmailStatus.data?.connected ? "Reconnect Account" : "Connect Account"} <ArrowRight className="h-4.5 w-4.5 ml-1.5" />
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
              <CardDescription>Manage schedule, check availability, and send invites</CardDescription>
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
                Integrate Google Calendar to enable meeting scheduling, real-time availability lookups, and direct Google Meet creation.
              </p>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/60 bg-muted/5 px-6 py-4 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => calendarStatus.refetch()} disabled={calendarStatus.isFetching}>
              <RefreshCw className={`h-3 w-3 mr-1.5 ${calendarStatus.isFetching ? "animate-spin" : ""}`} /> Sync Status
            </Button>
            <Button
              size="sm"
              onClick={handleConnectCalendar}
              variant={calendarStatus.data?.connected ? "secondary" : "default"}
            >
              {calendarStatus.data?.connected ? "Reconnect Account" : "Connect Account"} <ArrowRight className="h-4.5 w-4.5 ml-1.5" />
            </Button>
          </CardFooter>
        </Card>
      </div>
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
