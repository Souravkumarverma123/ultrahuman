import { z } from "../../schema";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({
  /**
   * Get the current session (returns null if not authenticated).
   */
  getSession: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/session"), tags: TAGS } })
    .input(z.undefined().describe("undefined"))
    .output(z.any())
    .query(async ({ ctx }) => {
      return ctx.session ?? null;
    }),

  /**
   * Get the current authenticated user (throws if not authenticated).
   */
  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: TAGS } })
    .input(z.undefined().describe("undefined"))
    .output(z.any())
    .query(async ({ ctx }) => {
      return {
        user: ctx.session.user,
        session: ctx.session.session,
      };
    }),
});
