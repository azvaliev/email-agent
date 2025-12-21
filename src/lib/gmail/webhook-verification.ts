import { OAuth2Client } from "google-auth-library";
import { env } from "@app/env";
import { getLogger } from "@app/lib/logger";

const logger = getLogger({ category: "pubsub-jwt" });
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

    if (payload?.email_verified !== true) {
      logger.warn({ email: payload?.email }, "JWT email not verified");
      return false;
    }

    if (payload?.email !== env.GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL) {
      logger.warn(
        {
          expected: env.GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL,
          actual: payload?.email,
        },
        "JWT email mismatch",
      );
      return false;
    }

    return true;
  } catch (error) {
    logger.warn({ err: error, audience }, "JWT verification failed");
    return false;
  }
}
