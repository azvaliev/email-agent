import pino, { type LoggerOptions } from "pino";
import { err as errorSerializer } from "pino-std-serializers";

function createBaseLogger() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const options: LoggerOptions = {
    level: process.env.LOG_LEVEL || "info",
    serializers: {
      e: errorSerializer,
      err: errorSerializer,
      error: errorSerializer,
    },
  };

  if (isDevelopment) {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    };
  }

  return pino(options);
}

const baseLogger = createBaseLogger();

export function getLogger({ category }: { category: string }) {
  return baseLogger.child({ category });
}
