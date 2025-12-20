import { NextRequest, NextResponse } from "next/server";
import { verifyPubSubJwt } from "@app/lib/gmail/webhook-verification";
import { GmailClient } from "@app/lib/gmail/client";
import { db } from "@app/db";
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
  // 1. Verify JWT
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

  // 2. Parse payload
  const body: PubSubMessage = await request.json();
  const decoded = Buffer.from(body.message.data, "base64").toString("utf-8");
  const notification: GmailNotification = JSON.parse(decoded);

  // 3. Find registration
  const registration = await db
    .selectFrom("gmailWatchRegistration")
    .where("emailAddress", "=", notification.emailAddress)
    .selectAll()
    .executeTakeFirst();

  if (!registration) {
    logger.warn(
      { emailAddress: notification.emailAddress },
      "No registration found for email address",
    );
    return NextResponse.json({ ok: true }); // Acknowledge anyway
  }

  // 4. Check if expiring soon (<=3 days)
  const threeDaysFromNow = new Date(Date.now() + THREE_DAYS_MS);

  if (registration.expiration <= threeDaysFromNow) {
    // Need to refresh
    const account = await db
      .selectFrom("account")
      .where("id", "=", registration.accountId)
      .selectAll()
      .executeTakeFirst();

    if (account?.refreshToken) {
      try {
        const gmailClient = new GmailClient(
          account.refreshToken,
          account.accessToken ?? undefined,
        );

        // Refresh the access token
        const { accessToken, expiresAt } =
          await gmailClient.refreshAccessToken();

        // Update account with new token
        await db
          .updateTable("account")
          .set({
            accessToken,
            accessTokenExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where("id", "=", account.id)
          .execute();

        // Re-setup watch
        const { historyId, expiration } = await gmailClient.watch(
          env.GMAIL_PUBSUB_TOPIC,
        );

        // Update registration
        await db
          .updateTable("gmailWatchRegistration")
          .set({
            historyId,
            expiration,
            updatedAt: new Date(),
          })
          .where("id", "=", registration.id)
          .execute();

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
  }

  // 5. Process the notification
  logger.info(
    {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      previousHistoryId: registration.historyId,
    },
    "Gmail notification received",
  );

  // TODO: Fetch new emails using history.list API
  // This is where we'd add email processing logic

  // 6. Update historyId
  await db
    .updateTable("gmailWatchRegistration")
    .set({
      historyId: notification.historyId,
      updatedAt: new Date(),
    })
    .where("id", "=", registration.id)
    .execute();

  // 7. Acknowledge
  return NextResponse.json({ ok: true });
}
