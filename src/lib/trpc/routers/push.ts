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
        const pushSubscription = await dbClient.upsertPushSubscription({
          userId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent,
        });

        logger.info(
          { userId, pushSubscriptionId: pushSubscription.id },
          "Push subscription saved",
        );

        return { ok: true };
      } catch (error) {
        logger.error(
          {
            error,
            userId,
            endpoint: input.endpoint,
          },
          "Failed to save push subscription",
        );

        throw error;
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
