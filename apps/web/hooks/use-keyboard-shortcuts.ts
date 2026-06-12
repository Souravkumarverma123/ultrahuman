import { useEffect } from "react";

type ShortcutKey = string; // e.g. "j", "k", "e", "s", "c" or "meta+k"

interface ShortcutOptions {
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: Record<ShortcutKey, (e: KeyboardEvent) => void>,
  options: ShortcutOptions = {}
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keypresses if user is typing in an input, textarea, or contenteditable
      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable);

      if (isInput) {
        // Allow escape to blur input
        if (event.key === "Escape") {
          (activeElement as HTMLElement).blur();
        }
        return;
      }

      let key = event.key.toLowerCase();
      
      // Handle meta/ctrl modifiers (e.g., meta+k)
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        key = "meta+k";
      }

      const handler = shortcuts[key];
      if (handler) {
        if (options.preventDefault !== false) {
          event.preventDefault();
        }
        handler(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts, options]);
}
