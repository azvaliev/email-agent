import { router, publicProcedure } from "../init";
import { pushRouter } from "./push";

export const appRouter = router({
  userInfo: publicProcedure.query(({ ctx }) => {
    return ctx.session?.user ?? null;
  }),
  push: pushRouter,
});

export type AppRouter = typeof appRouter;
