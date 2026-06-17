import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { gmailRouter } from "./routes/gmail/route";
import { calendarRouter } from "./routes/calendar/route";
import { agentRouter } from "./routes/agent/route";
import { paymentRouter } from "./routes/payment/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  gmail: gmailRouter,
  calendar: calendarRouter,
  agent: agentRouter,
  payment: paymentRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
