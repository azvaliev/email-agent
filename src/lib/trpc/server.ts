import "server-only";
import { createCallerFactory, createTRPCContext } from "./init";
import { appRouter } from "./routers/app";

const createCaller = createCallerFactory(appRouter);

export const trpc = async () => {
  const ctx = await createTRPCContext();
  return createCaller(ctx);
};
