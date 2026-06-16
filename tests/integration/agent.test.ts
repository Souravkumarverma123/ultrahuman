import { describe, test, expect } from "vitest";
import { ScopeValidatorService } from "../../packages/services/agent/scope-validator.service";
import { TokenBudgetService } from "../../packages/services/agent/token-budget.service";

describe("Agent Orchestration Scope & Budget Validator", () => {
  const scopeValidator = new ScopeValidatorService();
  const tokenBudget = new TokenBudgetService();

  describe("ScopeValidatorService Intention Routing", () => {
    test("allows scoped email requests", () => {
      const prompt = "Can you check my recent emails from boss?";
      const result = scopeValidator.evaluateAssistantScope(prompt);
      expect(result.allowed).toBe(true);
    });

    test("allows scoped calendar scheduling requests", () => {
      const prompt = "Schedule a meeting with Team tomorrow at 3 PM";
      const result = scopeValidator.evaluateAssistantScope(prompt);
      expect(result.allowed).toBe(true);
    });

    test("blocks code generation and programming questions", () => {
      const prompts = [
        "write a python script to parse logs",
        "how to center a div in css",
        "create an api endpoint in next.js"
      ];
      for (const prompt of prompts) {
        const result = scopeValidator.evaluateAssistantScope(prompt);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("code generation and programming help");
      }
    });

    test("blocks out-of-scope writing tasks", () => {
      const prompt = "write a poem about stars";
      const result = scopeValidator.evaluateAssistantScope(prompt);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("general writing tasks");
    });
  });

  describe("TokenBudgetService Calculations", () => {
    test("calculates token estimate from text length", () => {
      const text = "A".repeat(12);
      expect(tokenBudget.estimateTokensFromText(text)).toBe(3); // 12 / 4 = 3
    });

    test("enforces budget limits correctly", () => {
      const summary = {
        usageDate: "2026-06-16",
        requestCount: 5,
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        dailyTokenLimit: 2000, // Very low limit for testing
        dailyRequestLimit: 10,
        remainingTokens: 500,
        remainingRequests: 5,
      };

      // 400 tokens requested -> fits in remaining 500
      expect(tokenBudget.hasBudget(summary, 400).allowed).toBe(true);

      // 600 tokens requested -> exceeds remaining 500
      const res = tokenBudget.hasBudget(summary, 600);
      expect(res.allowed).toBe(false);
      expect(res.reply).toContain("token budget");
    });
  });
});
