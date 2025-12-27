import { buildPushHTTPRequest } from "@pushforge/builder";
import { env } from "@app/env";
import { dbClient } from "@app/lib/db/client";
import { getLogger } from "@app/lib/logger";

const logger = getLogger({ category: "push-notification" });

export type EmailData = {
  messageId: string;
  from: string;
  fromUser: string | null;
  fromEmail: string | null;
  subject: string;
  receivedAt: string;
};

export type NotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  email: EmailData;
};

type PushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function sendToSubscription(params: {
  userId: string;
  subscription: PushSubscription;
  payload: NotificationPayload;
}): Promise<boolean> {
  const { userId, subscription, payload } = params;
  try {
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK: env.VAPID_PRIVATE_JWK,
      message: {
        payload,
        options: { ttl: 86400, urgency: "high" },
        adminContact: env.VAPID_SUBJECT,
      },
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    });

    if (response.status === 201) {
      logger.info(
        { endpoint: subscription.endpoint.slice(0, 50) + "..." },
        "Push notification sent",
      );
      return true;
    }

    if (response.status === 404 || response.status === 410) {
      logger.info(
        {
          status: response.status,
          endpoint: subscription.endpoint.slice(0, 50) + "...",
        },
        "Subscription no longer valid, removing",
      );
      await dbClient.deletePushSubscriptionByEndpointAndUser(
        subscription.endpoint,
        userId,
      );
      return false;
    }

    logger.error(
      {
        status: response.status,
        statusText: response.statusText,
        endpoint: subscription.endpoint.slice(0, 50) + "...",
      },
      "Push notification failed",
    );
    return false;
  } catch (error) {
    logger.error(
      { err: error, endpoint: subscription.endpoint.slice(0, 50) + "..." },
      "Failed to send push notification",
    );
    return false;
  }
}

/**
 * Send a push notification to all of a user's subscriptions.
 * Returns the number of successful sends.
 */
export async function sendToUser(
  userId: string,
  payload: NotificationPayload,
): Promise<number> {
  const subscriptions = await dbClient.getPushSubscriptionsByUserId(userId);

  if (subscriptions.length === 0) {
    logger.debug({ userId }, "No push subscriptions for user");
    return 0;
  }

  const results = await Promise.all(
    subscriptions.map((sub) =>
      sendToSubscription({ userId, subscription: sub, payload }),
    ),
  );

  const successCount = results.filter(Boolean).length;

  logger.info(
    { userId, total: subscriptions.length, successful: successCount },
    "Push notifications sent to user",
  );

  return successCount;
}

/**
 * Build a web URL that redirects to an Apple Mail deep link.
 * Returns undefined if messageId is null/undefined.
 */
export function buildAppleMailUrl(
  rfc822MessageId: string | null,
): string | undefined {
  if (!rfc822MessageId) {
    return undefined;
  }
  return `/message/${encodeURIComponent(rfc822MessageId)}`;
}
