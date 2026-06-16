import { z } from "../../schema";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

const sessionSchema = z.object({
  id: z.string(),
  expiresAt: z.date().or(z.string()),
  token: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  userId: z.string(),
});

export const authRouter = router({
  /**
   * Get the current session (returns null if not authenticated).
   */
  getSession: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/session"), tags: TAGS } })
    .input(z.undefined().describe("undefined"))
    .output(
      z.object({
        user: userSchema,
        session: sessionSchema,
      }).nullable()
    )
    .query(async ({ ctx }) => {
      return ctx.session ?? null;
    }),

  /**
   * Get the current authenticated user (throws if not authenticated).
   */
  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: TAGS } })
    .input(z.undefined().describe("undefined"))
    .output(
      z.object({
        user: userSchema,
        session: sessionSchema,
      })
    )
    .query(async ({ ctx }) => {
      return {
        user: ctx.session.user,
        session: ctx.session.session,
      };
    }),
});
