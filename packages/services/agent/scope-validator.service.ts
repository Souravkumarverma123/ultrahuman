import { TokenUsageSummary } from "./token-budget.service";

export class ScopeValidatorService {
  private blockedIntentPatterns = [
    {
      pattern:
        /\b(generate|create|make|draw|design|render)\s+(an?\s+)?(image|picture|photo|logo|icon|illustration|graphic|poster|banner)\b/i,
      reason: "image generation and design tasks are outside this assistant",
    },
    {
      pattern: /\b(image|photo|logo|icon|illustration|graphic)\s+(generation|generator|prompt|editing)\b/i,
      reason: "image generation and editing tasks are outside this assistant",
    },
    {
      pattern:
        /\b(generate|create|debug|fix|review|refactor|explain|build)\s+(code|a\s+script|program|function|component|api|sql|python|javascript|typescript|react|html|css)\b/i,
      reason: "code generation and programming help are outside this assistant",
    },
    {
      pattern:
        /\b(code|programming|algorithm|leetcode|stack trace|typescript|javascript|python|react|next\.js|node\.js|html|css)\b/i,
      reason: "code generation and programming help are outside this assistant",
    },
    {
      pattern: /\b(blog post|essay|poem|story|caption|landing page|homework|assignment)\b/i,
      reason: "general writing tasks are outside this assistant unless they are email/calendar work",
    },
  ];

  private allowedIntentPatterns = [
    /\b(emails?|gmails?|inbox(es)?|mails?|messages?|threads?|drafts?|replies|reply|sends?|forwards?|archives?|labels?|stars?|trash|unreads?|reads?|searches|search|filters?)\b/i,
    /\b(calendars?|events?|meetings?|invites?|schedules?|reschedules?|availabilities|availability|free time|busy|google meet|meet link|attendees?|appointments?)\b/i,
    /\b(what can you do|help|capabilities|token usage|usage|limit|quota)\b/i,
  ];

  /**
   * Detects if a message looks like a short follow-up reply to a previous
   * agent question (e.g. "3pm", "gourav@gmail.com", "30 minutes", "yes").
   */
  private isFollowUpReply(message: string): boolean {
    const trimmed = message.trim();
    // Very short messages (under 120 chars) that look like answers
    if (trimmed.length > 120) return false;

    // Time patterns: "3pm", "3:30 PM", "15:00", "at 3", "tomorrow at 5"
    if (/^\d{1,2}(:\d{2})?\s*(am|pm)?$/i.test(trimmed)) return true;
    if (/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(trimmed) && trimmed.length < 50) return true;

    // Email addresses
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(trimmed)) return true;
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/i.test(trimmed) && trimmed.length < 80) return true;

    // Duration patterns: "30 minutes", "1 hour", "45 min"
    if (/^\d+\s*(minutes?|mins?|hours?|hrs?)$/i.test(trimmed)) return true;

    // Yes/No/Confirm/Cancel patterns
    if (/^(yes|no|yeah|nah|ok|okay|sure|confirm|cancel|correct|right|nope|yep|go ahead|do it|proceed|sounds good|perfect|that's? (right|correct|fine|good))$/i.test(trimmed)) return true;

    // Name-only replies: "Suraj", "Gourav Kumar"
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+){0,2}$/.test(trimmed) && trimmed.length < 40) return true;

    // Date patterns: "tomorrow", "next monday", "June 26", "26th"
    if (/^(today|tomorrow|day after tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\d{1,2}(st|nd|rd|th)?(\s+\w+)?|\w+\s+\d{1,2})$/i.test(trimmed)) return true;

    return false;
  }

  public evaluateAssistantScope(message: string, hasConversationContext = false): { allowed: boolean; reason?: string } {
    const normalized = message.trim();

    for (const blocked of this.blockedIntentPatterns) {
      if (blocked.pattern.test(normalized)) {
        return {
          allowed: false,
          reason: blocked.reason,
        };
      }
    }

    if (this.allowedIntentPatterns.some((pattern) => pattern.test(normalized))) {
      return { allowed: true };
    }

    // If the user is in an active conversation and sends a short follow-up
    // reply (time, email, duration, confirmation), allow it through so the
    // agent can continue the task instead of blocking mid-flow.
    if (hasConversationContext && this.isFollowUpReply(normalized)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason:
        "this assistant is only available for Gmail, inbox, email drafting/sending, Google Calendar, scheduling, and meeting workflows",
    };
  }

  public isHelpRequest(message: string): boolean {
    return /\b(what can you do|help|capabilities|what are you for)\b/i.test(message);
  }

  public isUsageRequest(message: string): boolean {
    return /\b(token usage|usage|quota|limit|tokens left|remaining tokens)\b/i.test(message);
  }

  public buildScopeReply(reason: string): string {
    return `I can only help with Ultrahuman email and calendar work: searching Gmail, summarizing threads, drafting or sending replies, checking calendar availability, creating invites, and managing meeting details. I can't help with ${reason}.`;
  }

  public buildHelpReply(summary: TokenUsageSummary): string {
    return `I can help with Gmail and Google Calendar tasks inside Ultrahuman: search inbox threads, summarize email context, draft or send replies, check availability, create calendar events, add Google Meet links, and coordinate scheduling workflows.\n\nToday's AI usage: ${summary.totalTokens}/${summary.dailyTokenLimit} tokens used, ${summary.remainingTokens} remaining.`;
  }
}
export const scopeValidatorService = new ScopeValidatorService();
