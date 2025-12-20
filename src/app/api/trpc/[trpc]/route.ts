import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@app/lib/trpc/routers/app";
import { createTRPCContext } from "@app/lib/trpc/init";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
