import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { env } from "@app/env";
import { getLogger } from "../logger";

type ValidGmailMessage = Omit<gmail_v1.Schema$Message, "id"> & { id: string };
type ParsedGmailMessage = {
  id: string;
  threadId: string | null;
  subject: string | null;
  from: string | null;
  fromEmail: string | null;
  fromUser: string | null;
  date: string | null;
  body: string | null;
  snippet: string | null;
};

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
   * Fetch all new messages since the given historyId.
   * Combines listHistory + getMessage for each new message.
   */
  async getNewMessages(startHistoryId: string) {
    const messageIds = await this.listHistory(startHistoryId);
    return Promise.all(
      messageIds.map(async (id) => {
        const rawMessage = await this.getMessage(id);
        return GmailClient.parseMessage(rawMessage);
      }),
    );
  }

  /**
   * List history records since the given historyId.
   * Returns deduplicated message IDs for newly added INBOX messages.
   */
  private async listHistory(startHistoryId: string): Promise<string[]> {
    const messageIds = new Set<string>();
    let pageToken: string | undefined;

    do {
      const response = await this.gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
        labelId: "INBOX",
        pageToken,
      });

      if (response.data.history) {
        for (const record of response.data.history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              if (added.message?.id) {
                messageIds.add(added.message.id);
              }
            }
          }
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return [...messageIds];
  }

  async getMessage(messageId: string): Promise<ValidGmailMessage> {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    if (!response.ok) {
      let error: string = "unknown error occured";
      try {
        error = await response.text();
      } catch {}

      throw new Error(
        `${response.status} Failed to fetch message ${messageId}: ${error}`,
      );
    }

    return {
      ...response.data,
      id: response.data.id ?? messageId,
    };
  }

  /**
   * Get a message by ID with full content.
   */
  static parseMessage({
    payload,
    id,
    threadId,
    snippet,
  }: ValidGmailMessage): ParsedGmailMessage {
    const logger = getLogger({ category: "message-parser" });

    const headers = payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value ?? null;

    const body = this.extractGmailMessageBody(payload);
    const from = getHeader("From");
    const [fromUser, fromEmail] = ((): [string | null, string | null] => {
      let name: string | null = null;
      let email: string | null = null;

      if (!from) {
        logger.error("Email was missing from header");
        return [name, email];
      }

      const emailStart = from.indexOf("<");
      if (emailStart === -1) {
        logger.error("Email starting character < missing from header");
        return [name, email];
      }

      name = from.slice(0, emailStart).trim() || null;
      const emailEnd = from.lastIndexOf(">");

      if (emailEnd === -1 || emailEnd < emailStart) {
        return [name, null];
      }

      email = from.slice(emailStart + 1, emailEnd).trim() || null;

      return [name, email];
    })();

    return {
      id,
      threadId: threadId ?? null,
      subject: getHeader("Subject"),
      from,
      fromUser,
      fromEmail,
      date: getHeader("Date"),
      body,
      snippet: snippet ?? null,
    };
  }

  /**
   * Extract plain text body from message payload.
   * Handles both simple and multipart messages.
   */
  private static extractGmailMessageBody(
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
          const nested = this.extractGmailMessageBody(part);
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
