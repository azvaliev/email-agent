import { NextRequest, NextResponse } from "next/server";
import { verifyPubSubJwt } from "@app/lib/gmail/webhook-verification";
import { GmailClient } from "@app/lib/gmail/client";
import { dbClient } from "@app/lib/db/client";
import { env } from "@app/env";
import { getLogger } from "@app/lib/logger";
import type { DB } from "@app/db/generated/schema";
import type { Selectable } from "kysely";

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

type Account = Selectable<DB["account"]>;
type AccountWithRefreshToken = Account & { refreshToken: string };
type WatchRegistration = Selectable<DB["gmailWatchRegistration"]>;

type ValidatedPayload = {
  notification: GmailNotification;
  registration: WatchRegistration;
  account: AccountWithRefreshToken;
};

type ParseResult =
  | { success: true; data: ValidatedPayload }
  | { success: false; response: NextResponse };

export async function POST(request: NextRequest) {
  const result = await parseAndValidatePayload(request);
  if (!result.success) {
    return result.response;
  }

  const { notification, registration, account } = result.data;

  // Renew watch if expiring soon
  let validAccessToken: string | undefined = account.accessToken ?? undefined;
  try {
    validAccessToken = await renewWatchIfExpiring(
      account,
      registration,
      validAccessToken,
    );
  } catch (error) {
    logger.error(
      { err: error, emailAddress: notification.emailAddress },
      "Failed to renew watch",
    );
    return NextResponse.json({ ok: true });
  }

  // Fetch new emails
  logger.info(
    {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      previousHistoryId: registration.historyId,
    },
    "Gmail notification received",
  );

  try {
    const gmailClient = new GmailClient(account.refreshToken, validAccessToken);

    const messages = await gmailClient.getNewMessages(registration.historyId);

    logger.info(
      { emailAddress: notification.emailAddress, count: messages.length },
      "Found new messages",
    );

    for (const message of messages) {
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
    return NextResponse.json({ ok: true });
  }

  // Update historyId
  await dbClient.updateWatchRegistration(registration.id, {
    historyId: notification.historyId,
  });

  // Acknowledge
  return NextResponse.json({ ok: true });
}

/**
 * Renew watch if expiring within 3 days.
 * Returns updated access token (or original if no renewal needed).
 */
async function renewWatchIfExpiring(
  account: Account,
  registration: WatchRegistration,
  currentAccessToken: string | undefined,
): Promise<string | undefined> {
  const threeDaysFromNow = new Date(Date.now() + THREE_DAYS_MS);

  if (registration.expiration > threeDaysFromNow) {
    return currentAccessToken;
  }

  const gmailClient = new GmailClient(
    account.refreshToken!,
    currentAccessToken,
  );

  const { accessToken, expiresAt } = await gmailClient.refreshAccessToken();

  await dbClient.updateAccountTokens(account.id, {
    accessToken,
    accessTokenExpiresAt: expiresAt,
  });

  const { historyId, expiration } = await gmailClient.watch(
    env.GMAIL_PUBSUB_TOPIC,
  );

  await dbClient.updateWatchRegistration(registration.id, {
    historyId,
    expiration,
  });

  logger.info({ emailAddress: registration.emailAddress }, "Watch renewed");

  return accessToken;
}

async function parseAndValidatePayload(
  request: NextRequest,
): Promise<ParseResult> {
  // Verify JWT
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const token = authHeader.slice(7);
  const webhookUrl = `${env.BETTER_AUTH_URL}/api/webhook/gmail`;

  const isValid = await verifyPubSubJwt(token, webhookUrl);
  if (!isValid) {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }

  // Parse payload
  let body: PubSubMessage;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }

  let notification: GmailNotification;
  try {
    const decoded = Buffer.from(body.message.data, "base64").toString("utf-8");
    notification = JSON.parse(decoded);
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid notification payload" },
        { status: 400 },
      ),
    };
  }

  // Find registration
  const registration = await dbClient.getWatchRegistrationByEmail(
    notification.emailAddress,
  );

  if (!registration) {
    logger.error(
      { emailAddress: notification.emailAddress },
      "No registration found for email address",
    );
    return {
      success: false,
      response: NextResponse.json({ ok: true }),
    };
  }

  // Get account and validate
  const account = await dbClient.getAccountById(registration.accountId);

  if (!account) {
    logger.error(
      {
        accountId: registration.accountId,
        emailAddress: notification.emailAddress,
      },
      "Account not found for registration",
    );
    return {
      success: false,
      response: NextResponse.json({ ok: true }),
    };
  }

  if (!account.refreshToken) {
    logger.error(
      { accountId: account.id, emailAddress: notification.emailAddress },
      "Account missing refresh token",
    );
    return {
      success: false,
      response: NextResponse.json({ ok: true }),
    };
  }

  return {
    success: true,
    data: {
      notification,
      registration,
      account: account as AccountWithRefreshToken,
    },
  };
}
