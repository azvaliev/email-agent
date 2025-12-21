import pino, { type LoggerOptions } from "pino";

function createBaseLogger() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const options: LoggerOptions = {
    level: process.env.LOG_LEVEL || "info",
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
