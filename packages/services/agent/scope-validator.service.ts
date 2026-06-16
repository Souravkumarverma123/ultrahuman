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

  public evaluateAssistantScope(message: string): { allowed: boolean; reason?: string } {
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
