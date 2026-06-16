import { AsyncLocalStorage } from "async_hooks";
import winston from "winston";
import { env } from "./env";

// Continuation local storage to propagate correlation IDs across asynchronous lifecycles
export const correlationStorage = new AsyncLocalStorage<string>();

type LoggerLevel = "error" | "info" | "debug";

const level: LoggerLevel =
  env.LOGGER_LEVEL ?? (env.NODE_ENV === "development" ? "debug" : "error");

const isDevelopment = env.NODE_ENV === "development";

// Winston format that grabs the current request's correlation ID
const addCorrelationId = winston.format((info) => {
  const correlationId = correlationStorage.getStore();
  if (correlationId) {
    info.correlationId = correlationId;
  }
  return info;
});

const format = isDevelopment
  ? winston.format.combine(
      addCorrelationId(),
      winston.format.colorize(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf((info) => {
        const correlationId = info.correlationId as string | undefined;
        const reqPrefix = correlationId ? ` [Req:${correlationId.substring(0, 8)}]` : "";
        const { timestamp, level, message, correlationId: _, ...meta } = info;
        const metaString = Object.keys(meta).length
          ? `\n${JSON.stringify(meta, null, 2)}`
          : "";
        return `${timestamp} [${level}]${reqPrefix}: ${message}${metaString}`;
      }),
    )
  : winston.format.combine(
      addCorrelationId(),
      winston.format.timestamp(),
      winston.format.json(),
    );

export const logger = winston.createLogger({
  level: level,
  format: format,
  transports: [new winston.transports.Console()],
});
