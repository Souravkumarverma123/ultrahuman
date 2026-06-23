import ts from "typescript";

export class ToolValidatorService {
  private allowedToolNames = new Set(["list_operations", "get_schema", "run_script"]);

  public validateToolCall(toolName: string, args: Record<string, unknown>): string | undefined {
    if (!this.allowedToolNames.has(toolName)) {
      return `Tool '${toolName}' is not allowed for this assistant.`;
    }

    const argsText = JSON.stringify(args).toLowerCase();

    if (toolName === "run_script") {
      const scriptValue = Object.entries(args).find(([key]) => {
        const k = key.toLowerCase();
        return k.includes("script") || k.includes("code");
      })?.[1];
      const script = typeof scriptValue === "string" ? scriptValue : "";
      const loweredScript = script.toLowerCase();

      if (!/\bcorsair\.(gmail|googlecalendar)\b/.test(loweredScript)) {
        return "run_script may only be used for Gmail or Google Calendar operations.";
      }

      if (/\bcorsair\.(?!gmail\b|googlecalendar\b)[a-z0-9_]+/i.test(script)) {
        return "Only corsair.gmail and corsair.googlecalendar operations are allowed.";
      }

      // AST-based security analysis
      try {
        const sourceFile = ts.createSourceFile("inline.js", script, ts.ScriptTarget.Latest, true);
        let safe = true;
        let reason: string | undefined;

        const disallowedIdentifiers = new Set([
          "process",
          "globalthis",
          "global",
          "require",
          "eval",
          "function",
          "constructor",
          "module",
          "exports",
          "window",
          "document",
          "fetch",
          "xmlhttprequest",
          "openai",
          "fs",
          "path",
          "child_process",
          "os",
          "http",
          "https",
          "import",
        ]);

        function visit(node: ts.Node) {
          if (!safe) return;

          // Block named function declarations and classes (closures can
          // capture sandbox objects and escape via prototype chains).
          // Arrow functions and function expressions are ALLOWED because
          // they're essential for .map()/.filter() and the VM sandbox
          // already isolates scope.
          if (
            ts.isFunctionDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isClassExpression(node)
          ) {
            safe = false;
            reason = "Declaring named functions or classes is not allowed.";
            return;
          }

          // Block 'this' keyword
          if (node.kind === ts.SyntaxKind.ThisKeyword) {
            safe = false;
            reason = "Accessing 'this' keyword is not allowed.";
            return;
          }

          // Block disallowed security-sensitive identifiers
          if (ts.isIdentifier(node)) {
            const name = node.text.toLowerCase();
            if (disallowedIdentifiers.has(name)) {
              safe = false;
              reason = `Use of identifier '${node.text}' is blocked for security.`;
              return;
            }
          }

          // Block sensitive properties accessed via dot notation (e.g. obj.constructor)
          if (ts.isPropertyAccessExpression(node)) {
            const propName = node.name.text.toLowerCase();
            if (propName === "constructor" || propName === "prototype" || propName === "__proto__") {
              safe = false;
              reason = `Accessing sensitive property '${node.name.text}' is blocked.`;
              return;
            }
          }

          // Block bracket access to sensitive properties (e.g. obj["constructor"])
          if (ts.isElementAccessExpression(node)) {
            const argText = ts.isStringLiteral(node.argumentExpression)
              ? node.argumentExpression.text.toLowerCase()
              : "";
            if (argText === "constructor" || argText === "prototype" || argText === "__proto__") {
              safe = false;
              reason = `Accessing sensitive property '${argText}' is blocked.`;
              return;
            }
          }

          ts.forEachChild(node, visit);
        }

        visit(sourceFile);
        if (!safe) {
          return reason;
        }
      } catch (err: any) {
        return `Failed to parse script: ${err.message}`;
      }
    }

    if ((toolName === "get_schema" || toolName === "list_operations") && argsText.length > 2) {
      if (!/(gmail|googlecalendar|calendar)/.test(argsText)) {
        return "Only Gmail and Google Calendar tool schemas or operations are allowed.";
      }
    }

    return undefined;
  }
}
export const toolValidatorService = new ToolValidatorService();
