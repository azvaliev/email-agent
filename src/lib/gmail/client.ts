import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { env } from "@app/env";

export class GmailClient {
  private oauth2Client: OAuth2Client;
  private gmail: gmail_v1.Gmail;

  constructor(
    private refreshToken: string,
    private accessToken?: string,
  ) {
    this.oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
    );
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
  }

  async watch(
    topicName: string,
  ): Promise<{ historyId: string; expiration: Date }> {
    const response = await this.gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName,
        labelIds: ["INBOX"],
        labelFilterBehavior: "include",
      },
    });

    const { historyId, expiration } = response.data;

    if (!historyId) {
      throw new Error("Gmail watch failed: no historyId returned");
    }

    if (!expiration) {
      throw new Error("Gmail watch failed: no expiration returned");
    }

    return {
      historyId,
      expiration: new Date(parseInt(expiration)),
    };
  }

  async stop(): Promise<void> {
    await this.gmail.users.stop({ userId: "me" });
  }

  async refreshAccessToken(): Promise<{
    accessToken: string;
    expiresAt: Date;
  }> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("Failed to refresh token: no access_token returned");
    }

    // Update internal state with new token
    this.accessToken = credentials.access_token;
    this.oauth2Client.setCredentials(credentials);

    return {
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000),
    };
  }
}
