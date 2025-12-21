import { z } from "zod";
import { router, authedProcedure } from "../init";
import { dbClient } from "@app/lib/db/client";
import { getLogger } from "@app/lib/logger";

const logger = getLogger({ category: "push" });

const subscriptionSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const pushRouter = router({
  subscribe: authedProcedure
    .input(subscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userAgent = ctx.headers.get("user-agent");

      try {
        await dbClient.upsertPushSubscription({
          userId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent,
        });

        logger.info(
          { userId, endpoint: input.endpoint },
          "Push subscription saved",
        );

        return { ok: true };
      } catch (err) {
        const error = err as Error;
        const isMissingTable =
          error.message.includes(
            'relation "push_subscription" does not exist',
          ) ||
          error.message.includes(
            'relation "pushSubscription" does not exist',
          ) ||
          error.message.includes("does not exist");

        logger.error(
          {
            err: error,
            userId,
            endpoint: endpointPrefix,
            ...(isMissingTable && {
              hint: "Did you run the push_subscription migration?",
            }),
          },
          "Failed to save push subscription",
        );

        throw err;
      }
    }),

  unsubscribe: authedProcedure
    .input(z.object({ endpoint: z.url() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await dbClient.deletePushSubscriptionByEndpointAndUser(
        input.endpoint,
        userId,
      );

      logger.info(
        { userId, endpoint: input.endpoint.slice(0, 50) + "..." },
        "Push subscription removed",
      );

      return { ok: true };
    }),
});
