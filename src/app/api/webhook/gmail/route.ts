import { NextRequest, NextResponse } from "next/server";
import { verifyPubSubJwt } from "@app/lib/gmail/webhook-verification";
import { GmailClient } from "@app/lib/gmail/client";
import { dbClient } from "@app/lib/db/client";
import { env } from "@app/env";
import { getLogger } from "@app/lib/logger";

const logger = getLogger({ category: "gmail-webhook" });

interface PubSubMessage {
  message: {
    data: string; // base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface GmailNotification {
  emailAddress: string;
  historyId: string;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  // Verify JWT
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const webhookUrl = `${env.BETTER_AUTH_URL}/api/webhook/gmail`;

  const isValid = await verifyPubSubJwt(token, webhookUrl);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Parse payload
  const body: PubSubMessage = await request.json();
  const decoded = Buffer.from(body.message.data, "base64").toString("utf-8");
  const notification: GmailNotification = JSON.parse(decoded);

  // Find registration
  const registration = await dbClient.getWatchRegistrationByEmail(
    notification.emailAddress,
  );

  if (!registration) {
    logger.warn(
      { emailAddress: notification.emailAddress },
      "No registration found for email address",
    );
    return NextResponse.json({ ok: true }); // Acknowledge anyway
  }

  // Get account and validate
  const account = await dbClient.getAccountById(registration.accountId);

  if (!account) {
    logger.error(
      { accountId: registration.accountId, emailAddress: notification.emailAddress },
      "Account not found for registration",
    );
    throw new Error(`Account not found: ${registration.accountId}`);
  }

  if (!account.refreshToken) {
    logger.error(
      { accountId: account.id, emailAddress: notification.emailAddress },
      "Account missing refresh token",
    );
    throw new Error(`Account missing refresh token: ${account.id}`);
  }

  let currentAccessToken = account.accessToken ?? undefined;

  // Check if watch expiring soon (<=3 days) and renew
  const threeDaysFromNow = new Date(Date.now() + THREE_DAYS_MS);

  if (registration.expiration <= threeDaysFromNow) {
    try {
      const gmailClient = new GmailClient(
        account.refreshToken,
        currentAccessToken,
      );

      // Refresh the access token
      const { accessToken, expiresAt } =
        await gmailClient.refreshAccessToken();

      currentAccessToken = accessToken;

      // Update account with new token
      await dbClient.updateAccountTokens(account.id, {
        accessToken,
        accessTokenExpiresAt: expiresAt,
      });

      // Re-setup watch
      const { historyId, expiration } = await gmailClient.watch(
        env.GMAIL_PUBSUB_TOPIC,
      );

      // Update registration
      await dbClient.updateWatchRegistration(registration.id, {
        historyId,
        expiration,
      });

      logger.info(
        { emailAddress: notification.emailAddress },
        "Watch renewed",
      );
    } catch (error) {
      logger.error(
        { err: error, emailAddress: notification.emailAddress },
        "Failed to refresh watch",
      );
    }
  }

  // Process the notification - fetch new emails
  logger.info(
    {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      previousHistoryId: registration.historyId,
    },
    "Gmail notification received",
  );

  try {
    const gmailClient = new GmailClient(
      account.refreshToken,
      currentAccessToken,
    );

    const { messageIds } = await gmailClient.listHistory(
      registration.historyId,
    );

    logger.info(
      { emailAddress: notification.emailAddress, count: messageIds.length },
      "Found new messages",
    );

    for (const messageId of messageIds) {
      const message = await gmailClient.getMessage(messageId);
      logger.info(
        {
          emailAddress: notification.emailAddress,
          messageId: message.id,
          subject: message.subject,
          from: message.from,
        },
        "New email",
      );
    }
  } catch (error) {
    logger.error(
      { err: error, emailAddress: notification.emailAddress },
      "Failed to fetch new emails",
    );
  }

  // Update historyId
  await dbClient.updateWatchRegistration(registration.id, {
    historyId: notification.historyId,
  });

  // Acknowledge
  return NextResponse.json({ ok: true });
}
