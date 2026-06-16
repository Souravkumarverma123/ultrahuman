import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";
import { z } from "zod";

import type { Context } from "./context";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<Context>()
  .create({
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          customCode: (error.cause as any)?.customCode || shape.data.code,
        },
      };
    },
  });

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

/**
 * Protected procedure — requires a valid Better Auth session.
 * If no session is found, throws UNAUTHORIZED.
 */
export const protectedProcedure = tRPCContext.procedure.use(
  async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be signed in to access this resource",
      });
    }
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
      },
    });
  },
);

const tenantProxyHandler: ProxyHandler<any> = {
  get(target, prop, receiver) {
    if (prop === "input") {
      return (schema: z.ZodTypeAny) => {
        const nextBuilder = target.input(schema);
        return nextBuilder.use(async ({ ctx, next, input }: any) => {
          const session = ctx.session;
          if (!session) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "You must be signed in to access this resource",
            });
          }
          const tenantId = (input as any)?.tenantId;
          if (!tenantId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Missing or invalid tenantId",
            });
          }
          const userId = session.user.id;
          if (tenantId !== userId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied: tenant ID does not match authenticated user",
            });
          }
          return next({ ctx });
        });
      };
    }
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "function") {
      return function (this: any, ...args: any[]) {
        const result = value.apply(this === receiver ? target : this, args);
        // If it returns a builder, wrap it recursively
        if (result && typeof result === "object" && ("input" in result || "query" in result || "mutation" in result)) {
          return new Proxy(result, tenantProxyHandler);
        }
        return result;
      };
    }
    return value;
  },
};

/**
 * Tenant-scoped procedure — requires valid session AND tenantId matching user ID.
 * Use this for all procedures that accept a tenantId input.
 */
export const tenantProcedure = new Proxy(protectedProcedure, tenantProxyHandler) as typeof protectedProcedure;
