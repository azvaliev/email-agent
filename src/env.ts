import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GMAIL_PUBSUB_TOPIC: z.string().startsWith("projects/"),
  GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL: z.string().email(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
  GMAIL_PUBSUB_TOPIC: process.env.GMAIL_PUBSUB_TOPIC,
  GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL:
    process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL,
});
