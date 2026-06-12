"use client";

import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, Clock, MapPin, Users, Plus, Trash2, 
  ChevronLeft, ChevronRight, Video, Sparkles, RefreshCw, Mail, CalendarDays
} from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { toast } from "sonner";
import { 
  startOfWeek, endOfWeek, addDays, format, isSameDay, 
  parseISO, startOfDay, endOfDay, differenceInMinutes, addWeeks, subWeeks
} from "date-fns";

export default function CalendarPage() {
  const { tenantId } = useTenant();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Form states for creating event / invite
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDateStr, setStartDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endDateStr, setEndDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endTimeStr, setEndTimeStr] = useState("10:00");
  const [attendeesInput, setAttendeesInput] = useState("");
  const [sendCompanionEmail, setSendCompanionEmail] = useState(false);
  const [companionEmailBody, setCompanionEmailBody] = useState("");

  // Check connection status
  const connectionQuery = trpc.calendar.getConnectionStatus.useQuery({ tenantId });
  const isConnected = connectionQuery.data?.connected ?? false;

  const weekRange = useMemo(() => {
    const start = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return { start, end };
  }, [currentWeekStart]);

  // List events query
  const eventsQuery = trpc.calendar.listEvents.useQuery(
    {
      tenantId,
      timeMin: weekRange.start.toISOString(),
      timeMax: weekRange.end.toISOString(),
    },
    { enabled: isConnected, refetchInterval: 20000 }
  );

  // Mutations
  const createEventMutation = trpc.calendar.createEvent.useMutation();
  const createInviteMutation = trpc.calendar.createInvite.useMutation();
  const deleteEventMutation = trpc.calendar.deleteEvent.useMutation();

  const events = eventsQuery.data?.events ?? [];

  // Generate 7 days of the week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekRange.start, i));
  }, [weekRange]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) return;

    const startDateTime = new Date(`${startDateStr}T${startTimeStr}:00`).toISOString();
    const endDateTime = new Date(`${endDateStr}T${endTimeStr}:00`).toISOString();
    const attendeeEmails = attendeesInput
      ? attendeesInput.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (sendCompanionEmail && attendeeEmails.length > 0) {
      // Schedule invite + send companion email
      createInviteMutation.mutate(
        {
          tenantId,
          summary,
          description,
          location,
          startDateTime,
          endDateTime,
          attendeeEmails,
          emailBody: companionEmailBody,
          addGoogleMeet: true,
        },
        {
          onSuccess: () => {
            toast.success("Calendar invite scheduled and emails delivered!");
            resetForm();
            eventsQuery.refetch();
          },
          onError: (err) => {
            toast.error(`Error: ${err.message}`);
          }
        }
      );
    } else {
      // Standard calendar event
      createEventMutation.mutate(
        {
          tenantId,
          summary,
          description,
          location,
          startDateTime,
          endDateTime,
          attendeeEmails,
          addGoogleMeet: true,
        },
        {
          onSuccess: () => {
            toast.success("Event created successfully!");
            resetForm();
            eventsQuery.refetch();
          },
          onError: (err) => {
            toast.error(`Error: ${err.message}`);
          }
        }
      );
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!window.confirm("Are you sure you want to cancel this event?")) return;

    deleteEventMutation.mutate(
      { tenantId, eventId },
      {
        onSuccess: () => {
          toast.success("Event cancelled successfully!");
          eventsQuery.refetch();
        },
        onError: (err) => {
          toast.error(`Failed to cancel event: ${err.message}`);
        }
      }
    );
  };

  const resetForm = () => {
    setSummary("");
    setDescription("");
    setLocation("");
    setAttendeesInput("");
    setSendCompanionEmail(false);
    setCompanionEmailBody("");
    setCreateOpen(false);
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-card">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-muted rounded-full flex justify-center items-center mx-auto text-muted-foreground">
            <CalendarIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Google Calendar Connection Required</h2>
          <p className="text-muted-foreground">
            Connect your Google Calendar integration in settings to start managing your schedule and sending invites.
          </p>
          <Button onClick={() => window.location.href = "/settings"} size="default" className="mt-2">
            Configure Integrations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-muted/5">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" /> Weekly Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            Displaying week of {format(weekRange.start, "MMMM d, yyyy")} – {format(weekRange.end, "MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="h-9 w-9 rounded-none border-r border-border">
              <ChevronLeft className="h-4.5 w-4.5" />
            </Button>
            <Button variant="ghost" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="h-9 text-xs font-semibold px-3 rounded-none border-r border-border">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="h-9 w-9 rounded-none">
              <ChevronRight className="h-4.5 w-4.5" />
            </Button>
          </div>

          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 shadow-sm">
            <Plus className="h-4.5 w-4.5" /> Schedule Event
          </Button>
        </div>
      </div>

      {/* Week View Grid */}
      <div className="bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/20">
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div 
                key={idx} 
                className={`p-3 text-center border-r border-border/60 last:border-r-0 flex flex-col items-center gap-1 ${
                  isToday ? "bg-primary/5 dark:bg-primary/2.5" : ""
                }`}
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {format(day, "eee")}
                </span>
                <span className={`text-lg font-bold h-8 w-8 rounded-full flex items-center justify-center ${
                  isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                }`}>
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Days Cells / Cards */}
        <div className="grid grid-cols-7 min-h-[480px] divide-x divide-border/60 bg-card/40">
          {weekDays.map((day, colIdx) => {
            const dayEvents = events.filter((e) => isSameDay(parseISO(e.startDateTime), day));

            return (
              <div 
                key={colIdx} 
                className="p-3.5 space-y-3.5 min-h-full hover:bg-muted/10 transition-colors relative"
                onClick={() => {
                  setStartDateStr(format(day, "yyyy-MM-dd"));
                  setEndDateStr(format(day, "yyyy-MM-dd"));
                  setCreateOpen(true);
                }}
              >
                {dayEvents.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none opacity-20">
                    <span className="text-xs font-medium italic text-muted-foreground">Empty spot</span>
                  </div>
                ) : (
                  dayEvents.map((event) => {
                    const start = parseISO(event.startDateTime);
                    const end = parseISO(event.endDateTime);
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering column click
                        }}
                        className="p-3 bg-card border border-border/80 rounded-xl shadow-sm hover:shadow-md transition-all space-y-2 group"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-foreground line-clamp-1 leading-snug">
                            {event.summary}
                          </h4>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0 md:opacity-0 group-hover:opacity-100"
                            title="Cancel Event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1 text-[10px] text-muted-foreground leading-normal">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(start, "h:mm a")} - {format(end, "h:mm a")}
                            </span>
                          </div>

                          {event.location && (
                            <div className="flex items-center gap-1 truncate" title={event.location}>
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}

                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 shrink-0" />
                              <span>{event.attendees.length} attending</span>
                            </div>
                          )}

                          {event.meetLink && (
                            <a
                              href={event.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 mt-1 text-blue-500 hover:text-blue-600 font-semibold"
                            >
                              <Video className="h-3.5 w-3.5" /> Meet Link
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" /> Schedule Event / Invite
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Event Title</label>
              <Input
                type="text"
                placeholder="Product Demo, Sync with Client, etc."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                className="text-sm bg-muted/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Start Date</label>
                <Input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  required
                  className="text-sm bg-muted/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Start Time</label>
                <Input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  required
                  className="text-sm bg-muted/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">End Date</label>
                <Input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  required
                  className="text-sm bg-muted/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">End Time</label>
                <Input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  required
                  className="text-sm bg-muted/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Attendees</label>
              <Input
                type="text"
                placeholder="colleague@company.com, client@partner.com"
                value={attendeesInput}
                onChange={(e) => setAttendeesInput(e.target.value)}
                className="text-sm bg-muted/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Location / Virtual Meeting</label>
              <Input
                type="text"
                placeholder="Meeting Room A / Google Meet auto-generated"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="text-sm bg-muted/20"
              />
            </div>

            {/* Companion Email invite option */}
            {attendeesInput && (
              <div className="bg-muted/30 p-3 rounded-lg border border-border/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendCompanionEmail}
                    onChange={(e) => setSendCompanionEmail(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs font-bold text-foreground/80 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-primary" /> Send Companion Email Invite Alongside Calendar Event
                  </span>
                </label>

                {sendCompanionEmail && (
                  <Textarea
                    placeholder="Enter additional message details to send in the email..."
                    value={companionEmailBody}
                    onChange={(e) => setCompanionEmailBody(e.target.value)}
                    className="min-h-[80px] text-xs resize-none bg-card"
                  />
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createEventMutation.isPending || createInviteMutation.isPending}
                className="shadow-sm"
              >
                {createEventMutation.isPending || createInviteMutation.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
