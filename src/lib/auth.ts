import { APIError, betterAuth, type Account } from "better-auth";
import { env } from "../env";
import { dbPool } from "@app/lib/db-pool";
import { db } from "@app/db";
import { GmailClient } from "./gmail/client";

const REQUIRED_GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_SCOPE_ERROR_MESSAGE =
  "We need Gmail read-only access to analyze your inbox. Please retry and allow the Gmail permission.";

const normalizeScopes = (scope: Account["scope"]) => {
  if (!scope) {
    return [] as string[];
  }

  if (Array.isArray(scope)) {
    return scope.filter((entry): entry is string => Boolean(entry));
  }

  return scope
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter((entry): entry is string => Boolean(entry));
};

const assertHasGmailScope = (account: Account) => {
  if (account.providerId !== "google") {
    return;
  }

  const scopes = normalizeScopes(account.scope);

  if (!scopes.includes(REQUIRED_GMAIL_SCOPE)) {
    throw new APIError("BAD_REQUEST", { message: GMAIL_SCOPE_ERROR_MESSAGE });
  }
};

export const auth = betterAuth({
  database: dbPool,
  baseUrl: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      accessType: "offline",
      prompt: "select_account consent",
      scope: ["email", "profile", REQUIRED_GMAIL_SCOPE],
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
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

          // Validate Gmail scope
          assertHasGmailScope(account);

          return true;
        },
        after: async (account) => {
          // We know it's a Google account with token (validated in before hook)
          const accessToken = account.accessToken!;
          const refreshToken = account.refreshToken;

          if (!refreshToken) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Google account must have a refresh token",
            });
          }

          const gmailClient = new GmailClient(refreshToken, accessToken);

          try {
            // Setup Gmail watch
            const { historyId, expiration } = await gmailClient.watch(
              env.GMAIL_PUBSUB_TOPIC,
            );

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
              .insertInto("gmailWatchRegistration")
              .values({
                id: crypto.randomUUID(),
                accountId: account.id,
                userId: account.userId,
                emailAddress: user.email,
                historyId,
                expiration,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .execute();
          } catch (error) {
            // Watch setup failed - delete the account to maintain consistency
            console.error(
              "Failed to setup Gmail watch, rolling back account:",
              error,
            );
            await db.deleteFrom("account").where("id", "=", account.id).execute();

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
            if (account.accessToken && account.refreshToken) {
              const gmailClient = new GmailClient(
                account.refreshToken,
                account.accessToken,
              );
              await gmailClient.stop();
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
