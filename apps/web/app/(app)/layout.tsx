"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Inbox, 
  Calendar as CalendarIcon, 
  Bot, 
  Settings as SettingsIcon, 
  Keyboard, 
  Sparkles,
  Command as CommandIcon,
  Moon,
  Sun,
  X
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "~/components/ui/button";
import { useTenant } from "~/hooks/use-tenant";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts } from "~/hooks/use-keyboard-shortcuts";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "~/components/ui/command";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenantId, changeTenant } = useTenant();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [gPressed, setGPressed] = useState(false);

  useKeyboardShortcuts({
    "?": () => setShowShortcuts(true),
    "meta+k": () => setShowCommandPalette(prev => !prev),
    "escape": () => {
      setShowShortcuts(false);
      setShowCommandPalette(false);
    },
    g: () => {
      setGPressed(true);
      setTimeout(() => setGPressed(false), 1000);
    },
    i: () => {
      if (gPressed) {
        router.push("/inbox");
        setGPressed(false);
      }
    },
    a: () => {
      if (gPressed) {
        router.push("/calendar");
        setGPressed(false);
      }
    },
    c: () => {
      if (gPressed) {
        router.push("/chat");
        setGPressed(false);
      }
    },
    s: () => {
      if (gPressed) {
        router.push("/settings");
        setGPressed(false);
      }
    }
  });

  const navigation = [
    { name: "Inbox", href: "/inbox", icon: Inbox },
    { name: "Calendar", href: "/calendar", icon: CalendarIcon },
    { name: "AI Assistant", href: "/chat", icon: Bot },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between h-full z-20">
        <div>
          {/* Logo / Header */}
          <div className="h-16 px-6 flex items-center gap-2 border-b border-border bg-muted/20">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-muted-foreground bg-clip-text text-transparent">
              Ultrahuman
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border bg-muted/10 space-y-4">
          {/* Tenant Switcher */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Current Tenant
            </label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => changeTenant(e.target.value)}
              placeholder="Enter tenant ID..."
              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Keyboard Shortcuts Trigger */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowShortcuts(true)}
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="h-4 w-4 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-muted/20">
        {children}
      </main>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CommandIcon className="h-5 w-5 text-primary" /> Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Vim-inspired shortcuts to navigate your inbox and calendar seamlessly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="font-semibold border-b border-border pb-1">Inbox Shortcuts</div>
              <div className="font-semibold border-b border-border pb-1">Keys</div>

              <div>Move Selection Down</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">j</kbd></div>

              <div>Move Selection Up</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">k</kbd></div>

              <div>Archive Thread</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">e</kbd></div>

              <div>Star Thread</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">s</kbd></div>

              <div>Compose New Email</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">c</kbd></div>

              <div>Open Command Palette</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">⌘ K</kbd> or <kbd className="px-1.5 py-0.5 border rounded bg-muted">Ctrl K</kbd></div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm pt-2">
              <div className="font-semibold border-b border-border pb-1">General</div>
              <div className="font-semibold border-b border-border pb-1">Keys</div>

              <div>Show Help Dialog</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">?</kbd></div>

              <div>Go to Inbox</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">g</kbd> then <kbd className="px-1.5 py-0.5 border rounded bg-muted">i</kbd></div>

              <div>Go to Calendar</div>
              <div><kbd className="px-1.5 py-0.5 border rounded bg-muted">g</kbd> then <kbd className="px-1.5 py-0.5 border rounded bg-muted">a</kbd></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Command Palette Dialog */}
      <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => {
                router.push("/inbox");
                setShowCommandPalette(false);
              }}
              className="flex items-center gap-2"
            >
              <Inbox className="h-4 w-4" />
              <span>Go to Inbox</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/calendar");
                setShowCommandPalette(false);
              }}
              className="flex items-center gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Go to Calendar</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/chat");
                setShowCommandPalette(false);
              }}
              className="flex items-center gap-2"
            >
              <Bot className="h-4 w-4" />
              <span>Go to AI Assistant</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/settings");
                setShowCommandPalette(false);
              }}
              className="flex items-center gap-2"
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Go to Settings</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Theme">
            <CommandItem
              onSelect={() => {
                setTheme("light");
                setShowCommandPalette(false);
              }}
              className="flex items-center gap-2"
            >
              <Sun className="h-4 w-4" />
              <span>Switch to Light Mode</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setTheme("dark");
                setShowCommandPalette(false);
              }}
              className="flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              <span>Switch to Dark Mode</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
