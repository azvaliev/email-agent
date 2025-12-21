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
        labelFilterBehavior: "INCLUDE",
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

  /**
   * List history records since the given historyId.
   * Returns message IDs for newly added messages.
   */
  async listHistory(startHistoryId: string): Promise<{
    messageIds: string[];
    historyId: string | null;
  }> {
    const messageIds: string[] = [];
    let pageToken: string | undefined;
    let latestHistoryId: string | null = null;

    do {
      const response = await this.gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
        pageToken,
      });

      latestHistoryId = response.data.historyId ?? null;

      if (response.data.history) {
        for (const record of response.data.history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              if (added.message?.id) {
                messageIds.push(added.message.id);
              }
            }
          }
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return { messageIds, historyId: latestHistoryId };
  }

  /**
   * Get a message by ID with full content.
   */
  async getMessage(messageId: string): Promise<{
    id: string;
    threadId: string | null;
    subject: string | null;
    from: string | null;
    date: string | null;
    body: string | null;
    snippet: string | null;
  }> {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const headers = response.data.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value ?? null;

    const body = this.extractBody(response.data.payload);

    return {
      id: response.data.id ?? messageId,
      threadId: response.data.threadId ?? null,
      subject: getHeader("Subject"),
      from: getHeader("From"),
      date: getHeader("Date"),
      body,
      snippet: response.data.snippet ?? null,
    };
  }

  /**
   * Extract plain text body from message payload.
   * Handles both simple and multipart messages.
   */
  private extractBody(
    payload: gmail_v1.Schema$MessagePart | undefined,
  ): string | null {
    if (!payload) {
      return null;
    }

    // Simple message with body directly on payload
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    // Multipart message - look for text/plain part
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }
        // Nested multipart (e.g., multipart/alternative inside multipart/mixed)
        if (part.parts) {
          const nested = this.extractBody(part);
          if (nested) {
            return nested;
          }
        }
      }
      // Fallback to text/html if no plain text
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }
    }

    return null;
  }
}
