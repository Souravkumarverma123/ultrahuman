import { z } from "../schema";
import { corsair, generateOAuthUrl } from "@repo/services/corsair";
import { tenantProcedure } from "../trpc";

export abstract class BaseCorsairRouter<TPlugin> {
  protected abstract pluginName: "gmail" | "googlecalendar";
  protected abstract getPath: (path: string) => `/${string}`;
  protected abstract tags: string[];

  protected getClient(tenantId: string): TPlugin {
    const client = corsair.withTenant(tenantId);
    return (client as any)[this.pluginName] as TPlugin;
  }

  public createAuthUrlProcedure() {
    return tenantProcedure
      .meta({ openapi: { method: "GET", path: this.getPath("/auth-url"), tags: this.tags } })
      .input(z.object({ tenantId: z.string() }))
      .output(z.object({ url: z.string() }))
      .query(async ({ ctx }) => {
        const tenantId = ctx.session.user.id;
        const baseUrl = process.env.BASE_URL || "http://localhost:8000";
        const redirectUri = `${baseUrl}/corsair/callback`;
        const { url } = await generateOAuthUrl(corsair, this.pluginName, {
          tenantId,
          redirectUri,
        });
        return { url };
      });
  }

  public createConnectionStatusProcedure() {
    return tenantProcedure
      .meta({ openapi: { method: "GET", path: this.getPath("/connection-status"), tags: this.tags } })
      .input(z.object({ tenantId: z.string() }))
      .output(z.object({ connected: z.boolean(), email: z.string().optional() }))
      .query(async ({ ctx }) => {
        try {
          const status = await corsair.manage.connectionStatus.get({ tenantId: ctx.session.user.id });
          const connected = status[this.pluginName] === "connected";
          return { connected };
        } catch {
          return { connected: false };
        }
      });
  }

  protected getClientFromCtx(ctx: any) {
    return corsair.withTenant(ctx.session.user.id);
  }
}
