"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Video,
  Mail,
  CalendarDays,
  Pencil,
  MoreHorizontal,
  Bell,
  X,
} from "lucide-react";
import { trpc } from "~/trpc/client";
import { useTenant } from "~/hooks/use-tenant";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { toast } from "sonner";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameMonth,
  startOfYear,
  endOfYear,
  addYears,
  subYears,
  getYear,
  eachDayOfInterval,
} from "date-fns";

type ViewMode = "day" | "week" | "month" | "year";

const VIEW_MODES: ViewMode[] = ["day", "week", "month", "year"];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MINI_WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function EventCard({
  event,
  onSelect,
  onDelete,
}: {
  event: any;
  onSelect: (e: any) => void;
  onDelete: (id: string) => void;
}) {
  const start = parseISO(event.startDateTime);
  const end = parseISO(event.endDateTime);
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      className="p-3 bg-card border border-border/80 rounded-xl shadow-sm hover:shadow-md transition-all space-y-2 group cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <h4 className="text-xs font-bold text-foreground line-clamp-1 leading-snug">
          {event.summary}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(event.id);
          }}
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
}

export default function CalendarPage() {
  const { tenantId } = useTenant();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

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

  const viewRange = useMemo(() => {
    switch (viewMode) {
      case "day":
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case "week":
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case "month":
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
      case "year":
        return { start: startOfYear(currentDate), end: endOfYear(currentDate) };
    }
  }, [currentDate, viewMode]);

  const maxResults = viewMode === "year" ? 500 : viewMode === "month" ? 250 : 100;

  // List events query
  const eventsQuery = trpc.calendar.listEvents.useQuery(
    {
      tenantId,
      timeMin: viewRange.start.toISOString(),
      timeMax: viewRange.end.toISOString(),
      maxResults,
    },
    { enabled: isConnected, refetchInterval: 20000 },
  );

  // Mutations
  const createEventMutation = trpc.calendar.createEvent.useMutation();
  const createInviteMutation = trpc.calendar.createInvite.useMutation();
  const deleteEventMutation = trpc.calendar.deleteEvent.useMutation();
  const updateRSVPMutation = trpc.calendar.updateRSVP.useMutation();

  const handleUpdateRSVP = (eventId: string, responseStatus: "accepted" | "declined" | "tentative") => {
    updateRSVPMutation.mutate(
      {
        tenantId,
        eventId,
        responseStatus,
      },
      {
        onSuccess: () => {
          toast.success(`RSVP status updated to ${responseStatus === "tentative" ? "maybe" : responseStatus}`);
          eventsQuery.refetch().then((res) => {
            const updatedEvent = res.data?.events?.find((e: any) => e.id === eventId);
            if (updatedEvent) {
              setSelectedEvent(updatedEvent);
            }
          });
        },
        onError: (err) => {
          toast.error(`Failed to update RSVP status: ${err.message}`);
        },
      }
    );
  };

  const events = eventsQuery.data?.events ?? [];

  // Generate 7 days of the week (for week view)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(viewRange.start, i));
  }, [viewRange]);

  // Generate the month grid days (for month view)
  const monthDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) return;

    const startDateTime = new Date(`${startDateStr}T${startTimeStr}:00`).toISOString();
    const endDateTime = new Date(`${endDateStr}T${endTimeStr}:00`).toISOString();
    const attendeeEmails = attendeesInput
      ? attendeesInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
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
          },
        },
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
          },
        },
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
        },
      },
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

  const handlePrev = () => {
    switch (viewMode) {
      case "day":
        setCurrentDate(subDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "year":
        setCurrentDate(subYears(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "year":
        setCurrentDate(addYears(currentDate, 1));
        break;
    }
  };

  const handleToday = () => setCurrentDate(new Date());

  const viewTitle = useMemo(() => {
    switch (viewMode) {
      case "day":
        return "Daily Schedule";
      case "week":
        return "Weekly Schedule";
      case "month":
        return "Monthly Schedule";
      case "year":
        return "Yearly Schedule";
    }
  }, [viewMode]);

  const subtitleText = useMemo(() => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week":
        return `Week of ${format(viewRange.start, "MMMM d, yyyy")} – ${format(
          viewRange.end,
          "MMMM d, yyyy",
        )}`;
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "year":
        return format(currentDate, "yyyy");
    }
  }, [currentDate, viewMode, viewRange]);

  const openCreateOnDay = (day: Date, hour?: number) => {
    setStartDateStr(format(day, "yyyy-MM-dd"));
    setEndDateStr(format(day, "yyyy-MM-dd"));
    if (hour !== undefined) {
      const h = String(hour).padStart(2, "0");
      const endH = String((hour + 1) % 24).padStart(2, "0");
      setStartTimeStr(`${h}:00`);
      setEndTimeStr(`${endH}:00`);
    } else {
      setStartTimeStr("09:00");
      setEndTimeStr("10:00");
    }
    setCreateOpen(true);
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
            Connect your Google Calendar integration in settings to start managing your schedule and
            sending invites.
          </p>
          <Button
            onClick={() => (window.location.href = "/settings")}
            size="default"
            className="mt-2"
          >
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
            <CalendarDays className="h-8 w-8 text-primary" /> {viewTitle}
          </h1>
          <p className="text-muted-foreground mt-1">{subtitleText}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View mode tabs */}
          <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`h-9 px-3 text-xs font-semibold capitalize rounded-none border-r border-border last:border-r-0 transition-colors ${
                  viewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-9 w-9 rounded-none border-r border-border"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleToday}
              className="h-9 text-xs font-semibold px-3 rounded-none border-r border-border"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-9 w-9 rounded-none"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </Button>
          </div>

          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 shadow-sm">
            <Plus className="h-4.5 w-4.5" /> Schedule Event
          </Button>
        </div>
      </div>

      {/* ─── Day View ─── */}
      {viewMode === "day" && (
        <div className="bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-[80px_1fr]">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourDate = new Date(currentDate);
              hourDate.setHours(hour, 0, 0, 0);
              const isCurrentHour =
                isSameDay(currentDate, new Date()) && new Date().getHours() === hour;
              const hourEvents = events.filter(
                (e) => parseISO(e.startDateTime).getHours() === hour,
              );
              return (
                <React.Fragment key={hour}>
                  <div
                    className={`p-2 text-xs text-muted-foreground text-right border-r border-b border-border/40 ${
                      isCurrentHour ? "bg-primary/5 font-semibold text-primary" : ""
                    }`}
                  >
                    {format(new Date(2000, 0, 1, hour), "h a")}
                  </div>
                  <div
                    className={`p-2 border-b border-border/40 min-h-[56px] space-y-2 hover:bg-muted/10 transition-colors ${
                      isCurrentHour ? "bg-primary/5" : ""
                    }`}
                    onClick={() => openCreateOnDay(currentDate, hour)}
                  >
                    {hourEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onSelect={setSelectedEvent}
                        onDelete={handleDeleteEvent}
                      />
                    ))}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Week View ─── */}
      {viewMode === "week" && (
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
                  <span
                    className={`text-lg font-bold h-8 w-8 rounded-full flex items-center justify-center ${
                      isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                    }`}
                  >
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
                  onClick={() => openCreateOnDay(day)}
                >
                  {dayEvents.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none opacity-20">
                      <span className="text-xs font-medium italic text-muted-foreground">
                        Empty spot
                      </span>
                    </div>
                  ) : (
                    dayEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onSelect={setSelectedEvent}
                        onDelete={handleDeleteEvent}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Month View ─── */}
      {viewMode === "month" && (
        <div className="bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden">
          {/* Day name header */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/20">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/60 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {monthDays.map((day, idx) => {
              const inMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const dayEvents = events.filter((e) => isSameDay(parseISO(e.startDateTime), day));
              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 border-r border-b border-border/40 [&:nth-child(7n)]:border-r-0 ${
                    !inMonth ? "bg-muted/10" : ""
                  } ${isToday ? "bg-primary/5" : ""} hover:bg-muted/10 transition-colors cursor-pointer`}
                  onClick={() => openCreateOnDay(day)}
                >
                  <div className="flex justify-end mb-1">
                    <span
                      className={`text-xs font-semibold h-6 w-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : inMonth
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                      >
                        {format(parseISO(event.startDateTime), "h:mm a")} {event.summary}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1.5">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Year View ─── */}
      {viewMode === "year" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, m) => {
            const monthDate = new Date(getYear(currentDate), m, 1);
            const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
            const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
            const monthEvents = events.filter((e) =>
              isSameMonth(parseISO(e.startDateTime), monthDate),
            );
            return (
              <div
                key={m}
                className="bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => {
                    setCurrentDate(monthDate);
                    setViewMode("month");
                  }}
                  className="w-full p-3 border-b border-border bg-muted/20 text-center hover:bg-muted/40 transition-colors"
                >
                  <span className="text-sm font-bold text-foreground">
                    {format(monthDate, "MMMM")}
                  </span>
                  {monthEvents.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {monthEvents.length} {monthEvents.length === 1 ? "event" : "events"}
                    </span>
                  )}
                </button>
                <div className="p-2">
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {MINI_WEEKDAY_LABELS.map((d, i) => (
                      <div
                        key={i}
                        className="text-center text-[9px] font-semibold text-muted-foreground"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {days.map((day, i) => {
                      const inMonth = isSameMonth(day, monthDate);
                      const isToday = isSameDay(day, new Date());
                      const hasEvents = events.some((e) =>
                        isSameDay(parseISO(e.startDateTime), day),
                      );
                      return (
                        <div
                          key={i}
                          className={`aspect-square flex items-center justify-center text-[10px] rounded relative cursor-pointer ${
                            isToday
                              ? "bg-primary text-primary-foreground font-bold"
                              : inMonth
                                ? "text-foreground hover:bg-muted"
                                : "text-muted-foreground/30"
                          }`}
                          onClick={() => {
                            setCurrentDate(day);
                            setViewMode("day");
                          }}
                          title={hasEvents ? "Has events" : ""}
                        >
                          {format(day, "d")}
                          {hasEvents && !isToday && (
                            <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Event Title
              </label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  required
                  className="text-sm bg-muted/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Start Time
                </label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  required
                  className="text-sm bg-muted/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  End Time
                </label>
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
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Attendees
              </label>
              <Input
                type="text"
                placeholder="colleague@company.com, client@partner.com"
                value={attendeesInput}
                onChange={(e) => setAttendeesInput(e.target.value)}
                className="text-sm bg-muted/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Location / Virtual Meeting
              </label>
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
                    <Mail className="h-3.5 w-3.5 text-primary" /> Send Companion Email Invite
                    Alongside Calendar Event
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
                {createEventMutation.isPending || createInviteMutation.isPending
                  ? "Scheduling..."
                  : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Event Details Popup */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md p-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        >
          {selectedEvent && (() => {
            const start = parseISO(selectedEvent.startDateTime);
            const end = parseISO(selectedEvent.endDateTime);
            const dateFormatted = format(start, "EEEE, d MMMM");
            const startTimeFormatted = format(start, "h:mm");
            const endTimeFormatted = format(end, "h:mm a").toLowerCase().replace(" ", "");
            const timeDisplay = `${dateFormatted}  •  ${startTimeFormatted} – ${endTimeFormatted}`;

            const attendees = selectedEvent.attendees || [];
            const awaitingCount = attendees.filter(
              (a: any) => !a.responseStatus || a.responseStatus === "needsAction"
            ).length;

            const currentUserAttendee = attendees.find((a: any) => a.self) ||
              (selectedEvent.organizerEmail && attendees.find((a: any) => a.email?.toLowerCase() === selectedEvent.organizerEmail.toLowerCase())) ||
              (tenantId && attendees.find((a: any) => a.email?.toLowerCase() === tenantId.toLowerCase()));
            const currentRsvp = currentUserAttendee?.responseStatus || "needsAction";

            const isYes = currentRsvp === "accepted";
            const isNo = currentRsvp === "declined";
            const isMaybe = currentRsvp === "tentative";

            const yesClass = isYes 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 font-semibold"
              : "text-muted-foreground border-border hover:bg-muted hover:text-foreground";

            const noClass = isNo
              ? "bg-destructive/10 text-destructive border-destructive/25 font-semibold"
              : "text-muted-foreground border-border hover:bg-muted hover:text-foreground";

            const maybeClass = isMaybe
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 font-semibold"
              : "text-muted-foreground border-border hover:bg-muted hover:text-foreground";

            return (
              <div className="flex flex-col">
                {/* Header Action Bar */}
                <div className="flex justify-end items-center gap-1.5 px-4 pt-3 text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-muted hover:text-foreground"
                    title="Edit Event"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      handleDeleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="h-8 w-8 rounded-full hover:bg-muted hover:text-destructive"
                    title="Delete Event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-muted hover:text-foreground"
                    title="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEvent(null)}
                    className="h-8 w-8 rounded-full hover:bg-muted hover:text-foreground"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Main Body */}
                <div className="px-6 pb-6 space-y-6">
                  {/* Title & Time */}
                  <div className="flex gap-4 items-start">
                    {/* Brand primary orange dot */}
                    <div className="h-4.5 w-4.5 bg-primary rounded-md shrink-0 mt-1.5" />
                    <div>
                      <h3 className="text-xl font-medium tracking-tight text-foreground leading-7">
                        {selectedEvent.summary}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {timeDisplay}
                      </p>
                    </div>
                  </div>

                  {/* Location (optional) */}
                  {selectedEvent.location && (
                    <div className="flex gap-4 items-start text-sm">
                      <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-foreground">{selectedEvent.location}</span>
                    </div>
                  )}

                  {/* Meet Link (optional) */}
                  {selectedEvent.meetLink && (
                    <div className="flex gap-4 items-start text-sm">
                      <Video className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <a
                          href={selectedEvent.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          Join with Google Meet
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Description (optional) */}
                  {selectedEvent.description && (
                    <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 text-sm whitespace-pre-wrap text-muted-foreground">
                      {selectedEvent.description}
                    </div>
                  )}

                  {/* Guests */}
                  {attendees.length > 0 && (
                    <div className="flex gap-4 items-start text-sm">
                      <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="space-y-3 flex-1">
                        {/* Guest Summary Info */}
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-medium">
                            {attendees.length} guests
                            {awaitingCount > 0 && (
                              <span className="text-muted-foreground text-xs ml-1.5 font-normal">
                                {awaitingCount} awaiting
                              </span>
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Guest List with Avatars */}
                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                          {attendees.map((attendee: any, idx: number) => {
                            const nameOrEmail = attendee.displayName || attendee.email;
                            const initial = nameOrEmail.charAt(0).toUpperCase();
                            const isAccepted = attendee.responseStatus === "accepted";
                            const isDeclined = attendee.responseStatus === "declined";

                            return (
                              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                                <div className="flex items-center gap-3">
                                  {/* Avatar circle */}
                                  <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold uppercase text-[11px] shrink-0">
                                    {initial}
                                  </div>
                                  <span className="text-foreground font-medium truncate max-w-[180px]" title={attendee.email}>
                                    {nameOrEmail}
                                  </span>
                                </div>

                                {attendee.responseStatus && (
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      isAccepted
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : isDeclined
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    }`}
                                  >
                                    {attendee.responseStatus}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notification Section */}
                  <div className="flex gap-4 items-start text-sm">
                    <Bell className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground">30 minutes before</span>
                  </div>

                  {/* Calendar Owner Section */}
                  <div className="flex gap-4 items-start text-sm">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground truncate" title={selectedEvent.organizerEmail || tenantId}>
                      {selectedEvent.organizerEmail || tenantId}
                    </span>
                  </div>
                </div>

                {/* Going Footer Action Bar */}
                <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/20 text-sm">
                  <span className="text-foreground font-medium">Going?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateRSVP(selectedEvent.id, "accepted")}
                      disabled={updateRSVPMutation.isPending}
                      className={`px-4 py-1.5 rounded-full border transition-all font-medium text-xs disabled:opacity-50 ${yesClass}`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleUpdateRSVP(selectedEvent.id, "declined")}
                      disabled={updateRSVPMutation.isPending}
                      className={`px-4 py-1.5 rounded-full border transition-all font-medium text-xs disabled:opacity-50 ${noClass}`}
                    >
                      No
                    </button>
                    <button
                      onClick={() => handleUpdateRSVP(selectedEvent.id, "tentative")}
                      disabled={updateRSVPMutation.isPending}
                      className={`px-4 py-1.5 rounded-full border transition-all font-medium text-xs disabled:opacity-50 ${maybeClass}`}
                    >
                      Maybe
                    </button>
                    <button className="p-1.5 rounded-full border border-border hover:bg-muted hover:text-foreground transition-all text-muted-foreground">
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
