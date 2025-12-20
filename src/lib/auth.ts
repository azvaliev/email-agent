import { betterAuth } from "better-auth";
import { env } from "../env";
import { dbPool } from "@app/lib/db-pool";

export const auth = betterAuth({
  database: dbPool,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      accessType: "offline",
      prompt: "select_account consent",
      scope: [
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
});
