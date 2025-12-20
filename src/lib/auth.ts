import { APIError, betterAuth, type Account } from "better-auth";
import { env } from "../env";
import { dbPool } from "@app/lib/db-pool";

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
          // TODO: this doesn't surface the error message transparently to the user
          assertHasGmailScope(account);
          return true;
        },
      },
    },
  },
});
