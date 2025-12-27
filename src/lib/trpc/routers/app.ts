import { router, publicProcedure } from "../init";
import { pushRouter } from "./push";
import { accountRouter } from "./account";

export const appRouter = router({
  userInfo: publicProcedure.query(({ ctx }) => {
    return ctx.session?.user ?? null;
  }),
  push: pushRouter,
  account: accountRouter,
});

export type AppRouter = typeof appRouter;
