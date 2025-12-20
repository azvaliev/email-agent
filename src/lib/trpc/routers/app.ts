import { router, publicProcedure } from "../init";

export const appRouter = router({
  userInfo: publicProcedure.query(({ ctx }) => {
    return ctx.session?.user ?? null;
  }),
});

export type AppRouter = typeof appRouter;
