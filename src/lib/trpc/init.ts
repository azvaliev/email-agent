import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@app/lib/auth";
import { headers } from "next/headers";

export const createTRPCContext = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return { session };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});
