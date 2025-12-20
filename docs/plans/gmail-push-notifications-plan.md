# Gmail Push Notifications Implementation Plan

## Overview

Implement Gmail push notifications to receive real-time updates when users receive new emails. This uses Google Cloud Pub/Sub as an intermediary between Gmail and our webhook.

```
Gmail → Cloud Pub/Sub Topic → Push Subscription → /api/webhook/gmail → Process
```

---

## Architecture

### Flow: Account Linking / Sign-in

```
1. User signs in / links Google account
2. better-auth stores account with accessToken, refreshToken
3. databaseHooks.account.create.after fires
4. We call gmail.users.watch() with the user's access token
5. Store watch registration (historyId, expiration) in new table
6. Gmail starts pushing notifications to Pub/Sub → our webhook
```

### Flow: Incoming Webhook

```
1. Google Pub/Sub POSTs to /api/webhook/gmail
2. Verify JWT signature (from Authorization header)
3. Decode payload: { emailAddress, historyId }
4. Look up registration by email address
5. If expiring soon (≤3 days), refresh token + re-call watch()
6. Process the notification (log for now, later: fetch emails)
```

### Flow: Account Deletion

```
1. User deletes account or unlinks Google
2. databaseHooks.account.delete.before fires
3. We call gmail.users.stop() to stop notifications
4. Delete the watch registration record
```

---

## Database Changes

### New Table: `gmail_watch_registration`

| Column          | Type          | Nullable | Description                                    |
| --------------- | ------------- | -------- | ---------------------------------------------- |
| `id`            | `text`        | NOT NULL | Primary key (UUID)                             |
| `account_id`    | `text`        | NOT NULL | FK → account.id (1:1, unique)                  |
| `user_id`       | `text`        | NOT NULL | FK → user.id (denormalized for easier queries) |
| `email_address` | `text`        | NOT NULL | Gmail address being watched                    |
| `history_id`    | `text`        | NOT NULL | Last known historyId from Gmail                |
| `expiration`    | `timestamptz` | NOT NULL | When the watch expires (from Google)           |
| `created_at`    | `timestamptz` | NOT NULL | When watch was created (default: now())        |
| `updated_at`    | `timestamptz` | NOT NULL | Last update time                               |

**Constraints:**

- `id` is PRIMARY KEY
- `account_id` is UNIQUE (one watch per account)
- `account_id` FK → account.id ON DELETE CASCADE
- `user_id` FK → user.id ON DELETE CASCADE
- `email_address` is indexed (for webhook lookups)

**Convention:** Database uses snake_case columns. Kysely uses `CamelCasePlugin` to auto-convert, so TypeScript code uses camelCase (e.g., `emailAddress` → `email_address`).

---

## New Dependencies

```bash
yarn add googleapis google-auth-library
```

- `googleapis` - Official Google API client (gmail.users.watch, gmail.users.stop)
- `google-auth-library` - JWT verification for webhook requests

---

## Environment Variables

Add to `.env.example`:

```bash
# Google Cloud Pub/Sub (for Gmail push notifications)
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GMAIL_PUBSUB_TOPIC=projects/your-project/topics/gmail-notifications
GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL=something@something.iam.gserviceaccount.com
```

**Note:** The webhook URL is derived from `BETTER_AUTH_URL` + `/api/webhook/gmail`

---

## File Structure

```
src/
├── lib/
│   ├── auth.ts                    # Add databaseHooks
│   ├── gmail/
│   │   ├── client.ts              # GmailClient class (watch, stop, refreshAccessToken)
│   │   └── webhook-verification.ts # JWT verification
│   └── db/
│       └── client.ts              # DBClient class
├── app/
│   └── api/
│       └── webhook/
│           └── gmail/
│               └── route.ts       # POST handler
└── env.ts                         # Add new env vars
```

---

## Implementation Details

### 1. Gmail Client Wrapper (`src/lib/gmail/client.ts`)

```typescript
import { google } from "googleapis";

export function createGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}
```

### 2. Watch/Stop Functions (`src/lib/gmail/watch.ts`)

```typescript
export async function setupGmailWatch(params: {
  accessToken: string;
  topicName: string;
}): Promise<{ historyId: string; expiration: Date }> {
  const gmail = createGmailClient(params.accessToken);

  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: params.topicName,
      labelIds: ["INBOX"],
      labelFilterBehavior: "INCLUDE",
    },
  });

  return {
    historyId: response.data.historyId!,
    expiration: new Date(parseInt(response.data.expiration!)),
  };
}

export async function stopGmailWatch(accessToken: string): Promise<void> {
  const gmail = createGmailClient(accessToken);
  await gmail.users.stop({ userId: "me" });
}
```

### 3. Token Refresh (`src/lib/gmail/token-refresh.ts`)

```typescript
export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
    }),
  });

  const data = await response.json();

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}
```

### 4. Webhook Verification (`src/lib/gmail/webhook-verification.ts`)

Google Pub/Sub sends a JWT in the `Authorization: Bearer <token>` header. We verify:

1. Signature validity (against Google's public certs)
2. `email` claim matches the Pub/Sub service account
3. `aud` claim matches our webhook URL
4. Token is not expired

```typescript
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

export async function verifyPubSubJwt(
  token: string,
  audience: string,
): Promise<boolean> {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience,
    });
    const payload = ticket.getPayload();

    // Verify it's from Google Pub/Sub
    return (
      payload?.email_verified === true &&
      payload?.email?.endsWith(".iam.gserviceaccount.com")
    );
  } catch {
    return false;
  }
}
```

### 5. DBClient (`src/lib/db/client.ts`)

Methods take only the parameters they need. The webhook handler looks up by email address, not user ID.

**Note:** We use `CamelCasePlugin` in Kysely, so table/column names in code are camelCase while the database uses snake_case.

```typescript
import { Kysely } from "kysely";
import type { DB } from "@app/db/generated/schema";

export class DBClient {
  constructor(private db: Kysely<DB>) {}

  // Gmail watch registrations

  getWatchRegistrationByEmail(emailAddress: string) {
    return this.db
      .selectFrom("gmailWatchRegistration")
      .where("emailAddress", "=", emailAddress)
      .selectAll()
      .executeTakeFirst();
  }

  getWatchRegistrationsByUserId(userId: string) {
    return this.db
      .selectFrom("gmailWatchRegistration")
      .where("userId", "=", userId)
      .selectAll()
      .execute();
  }

  createWatchRegistration(data: {
    userId: string;
    accountId: string;
    emailAddress: string;
    historyId: string;
    expiration: Date;
  }) {
    return this.db
      .insertInto("gmailWatchRegistration")
      .values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  updateWatchRegistration(
    id: string,
    data: { historyId: string; expiration?: Date },
  ) {
    return this.db
      .updateTable("gmailWatchRegistration")
      .set({
        historyId: data.historyId,
        ...(data.expiration && { expiration: data.expiration }),
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .execute();
  }

  // Accounts

  updateAccountTokens(
    accountId: string,
    data: { accessToken: string; accessTokenExpiresAt: Date },
  ) {
    return this.db
      .updateTable("account")
      .set({ ...data, updatedAt: new Date() })
      .where("id", "=", accountId)
      .execute();
  }
}
```

### 6. Database Hooks (`src/lib/auth.ts`)

**Important:** We use `before` hook to validate (and block if invalid), then `after` hook to set up the watch. This ensures we never have a Google account without a valid token.

```typescript
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { setupGmailWatch, stopGmailWatch } from "./gmail/watch";
import { db } from "@app/db";
import { env } from "../env";

export const auth = betterAuth({
  // ... existing config ...

  databaseHooks: {
    account: {
      create: {
        before: async (account) => {
          // Only Google accounts are allowed
          if (account.providerId !== "google") {
            throw new APIError("BAD_REQUEST", {
              message: "Only Google accounts are supported",
            });
          }

          // Block insertion if missing required token
          if (!account.accessToken) {
            throw new APIError("BAD_REQUEST", {
              message: "Google account must have an access token",
            });
          }

          // Validation passed, allow insertion to proceed
        },
        after: async (account) => {
          // We know it's a Google account with token (validated in before hook)
          const accessToken = account.accessToken!;

          try {
            // Setup Gmail watch
            const { historyId, expiration } = await setupGmailWatch({
              accessToken,
              topicName: env.GMAIL_PUBSUB_TOPIC,
            });

            // Get email from the user table
            const user = await db
              .selectFrom("user")
              .where("id", "=", account.userId)
              .select("email")
              .executeTakeFirst();

            if (!user?.email) {
              throw new Error("User must have an email address");
            }

            await db
              .insertInto("gmail_watch_registration")
              .values({
                id: crypto.randomUUID(),
                account_id: account.id,
                user_id: account.userId,
                email_address: user.email,
                history_id: historyId,
                expiration,
                created_at: new Date(),
                updated_at: new Date(),
              })
              .execute();
          } catch (error) {
            // Watch setup failed - delete the account to maintain consistency
            console.error(
              "Failed to setup Gmail watch, rolling back account:",
              error,
            );
            await db
              .deleteFrom("account")
              .where("id", "=", account.id)
              .execute();

            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to setup Gmail notifications. Please try again.",
            });
          }
        },
      },
      delete: {
        before: async (account) => {
          if (account.providerId !== "google") {
            return;
          }

          try {
            if (account.accessToken) {
              await stopGmailWatch(account.accessToken);
            }

            // Registration will be deleted via CASCADE
          } catch (error) {
            console.error("Failed to stop Gmail watch:", error);
            // Don't throw - account deletion should still proceed
          }
        },
      },
    },
  },
});
```

### 7. Webhook Handler (`src/app/api/webhook/gmail/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyPubSubJwt } from "@app/lib/gmail/webhook-verification";
import { refreshGoogleAccessToken } from "@app/lib/gmail/token-refresh";
import { setupGmailWatch } from "@app/lib/gmail/watch";
import { db } from "@app/db";
import { env } from "@app/env";

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
    .selectFrom("gmail_watch_registration")
    .where("email_address", "=", notification.emailAddress)
    .selectAll()
    .executeTakeFirst();

  if (!registration) {
    console.warn("No registration found for:", notification.emailAddress);
    return NextResponse.json({ ok: true }); // Acknowledge anyway
  }

  // 4. Check if expiring soon (≤3 days)
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  if (registration.expiration <= threeDaysFromNow) {
    // Need to refresh
    const account = await db
      .selectFrom("account")
      .where("id", "=", registration.account_id)
      .selectAll()
      .executeTakeFirst();

    if (account?.refresh_token) {
      try {
        // Refresh the access token
        const { accessToken, expiresAt } = await refreshGoogleAccessToken(
          account.refresh_token,
        );

        // Update account with new token
        await db
          .updateTable("account")
          .set({
            access_token: accessToken,
            access_token_expires_at: expiresAt,
            updated_at: new Date(),
          })
          .where("id", "=", account.id)
          .execute();

        // Re-setup watch
        const { historyId, expiration } = await setupGmailWatch({
          accessToken,
          topicName: env.GMAIL_PUBSUB_TOPIC,
        });

        // Update registration
        await db
          .updateTable("gmail_watch_registration")
          .set({
            history_id: historyId,
            expiration,
            updated_at: new Date(),
          })
          .where("id", "=", registration.id)
          .execute();
      } catch (error) {
        console.error("Failed to refresh watch:", error);
      }
    }
  }

  // 5. Process the notification
  console.log("Gmail notification:", {
    email: notification.emailAddress,
    historyId: notification.historyId,
    previousHistoryId: registration.history_id,
  });

  // TODO: Fetch new emails using history.list API
  // This is where we'd add email processing logic

  // 6. Update historyId
  await db
    .updateTable("gmail_watch_registration")
    .set({
      history_id: notification.historyId,
      updated_at: new Date(),
    })
    .where("id", "=", registration.id)
    .execute();

  // 7. Acknowledge
  return NextResponse.json({ ok: true });
}
```

---

## GCP Setup

See `docs/gcp-setup.md` for Google Cloud configuration commands.

---

## Implementation Order

### Phase 1: Foundation

1. [x] Add new environment variables to `env.ts` and `.env.example`
2. [x] Install dependencies (`googleapis`, `google-auth-library`)
3. [x] Create database migration for `gmail_watch_registration`
4. [x] Run migration and regenerate types

### Phase 2: Core Gmail Integration

5. [x] Implement `src/lib/gmail/client.ts`
6. [x] Implement `src/lib/gmail/watch.ts`
7. [x] Implement `src/lib/gmail/token-refresh.ts`
8. [x] Implement `src/lib/gmail/webhook-verification.ts`

### Phase 3: Database Layer

9. [x] Implement `src/lib/db/client.ts`

### Phase 4: Integration

10. [ ] Add `databaseHooks` to `src/lib/auth.ts`
11. [ ] Create webhook handler at `src/app/api/webhook/gmail/route.ts`

### Phase 5: GCP & Deployment

12. [x] Create GCP Pub/Sub topic and subscription
13. [x] Document GCP setup in `docs/gcp-setup.md`
14. [ ] Deploy to Vercel
15. [ ] Test end-to-end

---

## Open Questions / Future Work

1. **Email Processing**: Currently just logs. Next step is to call `history.list` to fetch actual email changes.

2. **Multiple Gmail Accounts**: A user can link multiple Gmail accounts. Each gets its own watch registration. The webhook lookup is by `email_address`, which should handle this correctly.

3. **Watch Renewal Cron**: Google recommends calling `watch()` daily even without webhook traffic. Consider a cron job to proactively renew watches approaching expiration.

4. **Pub/Sub Dead Letter**: If our webhook is down, Pub/Sub will retry. Consider configuring a dead-letter topic for persistent failures.

---

## Design Decisions

1. **Strict Account Validation**:
   - `before` hook validates Google accounts have an access token (blocks insertion if missing)
   - `after` hook sets up Gmail watch; if it fails, we manually delete the account to rollback
   - This ensures we never have a Google account without a working watch registration

2. **All Fields NOT NULL**: The `gmail_watch_registration` table has no nullable fields. Every watch must have complete data from creation.

3. **Graceful Deletion**: Account deletion still proceeds even if `gmail.users.stop()` fails (e.g., token expired). The watch will expire on its own, and the registration is cleaned up via CASCADE.

4. **Google-Only**: Non-Google account providers are rejected with an error. This can be relaxed in the future if needed.
