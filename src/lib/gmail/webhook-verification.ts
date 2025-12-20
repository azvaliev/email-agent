import { OAuth2Client } from "google-auth-library";
import { env } from "@app/env";

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

    return (
      payload?.email_verified === true &&
      payload?.email === env.GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL
    );
  } catch {
    return false;
  }
}
