import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express";

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<{ req: Request; res: Response }> {
  return { req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
