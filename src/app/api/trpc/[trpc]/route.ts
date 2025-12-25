import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@app/lib/trpc/routers/app";
import { createTRPCContext } from "@app/lib/trpc/init";
import { getLogger } from "@app/lib/logger";

const logger = getLogger({ category: "trpc" });

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, type, error, ctx }) => {
      logger.error(
        {
          err: error,
          path,
          type,
          userId: ctx?.session?.user?.id,
        },
        "tRPC error",
      );
    },
  });

export { handler as GET, handler as POST };
