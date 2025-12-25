import { describe, it, expect, vi } from "vitest";

vi.mock("@app/env", () => ({
  env: {
    GOOGLE_CLIENT_ID: "mock-client-id",
    GOOGLE_CLIENT_SECRET: "mock-client-secret",
  },
}));

import { GmailClient } from "./client";

describe("GmailClient", () => {
  describe("parseFromHeader", () => {
    it("returns nulls for null input", () => {
      expect(GmailClient.parseFromHeader(null)).toEqual({
        user: null,
        email: null,
      });
    });

    it("returns nulls for empty string", () => {
      expect(GmailClient.parseFromHeader("")).toEqual({
        user: null,
        email: null,
      });
    });

    it("parses bare email address", () => {
      expect(GmailClient.parseFromHeader("user@example.com")).toEqual({
        user: null,
        email: "user@example.com",
      });
    });

    it("parses standard format with display name", () => {
      expect(
        GmailClient.parseFromHeader("John Doe <john@example.com>"),
      ).toEqual({
        user: "John Doe",
        email: "john@example.com",
      });
    });

    it("parses quoted display name", () => {
      expect(
        GmailClient.parseFromHeader('"John Doe" <john@example.com>'),
      ).toEqual({
        user: "John Doe",
        email: "john@example.com",
      });
    });

    it("parses email with no display name", () => {
      expect(GmailClient.parseFromHeader("<john@example.com>")).toEqual({
        user: null,
        email: "john@example.com",
      });
    });

    it("handles extra whitespace", () => {
      expect(
        GmailClient.parseFromHeader("  John Doe  <  john@example.com  >"),
      ).toEqual({
        user: "John Doe",
        email: "john@example.com",
      });
    });

    it("handles malformed input with extra <", () => {
      expect(
        GmailClient.parseFromHeader("John <Doe <john@example.com>"),
      ).toEqual({
        user: "John <Doe",
        email: "john@example.com",
      });
    });

    it("handles missing closing >", () => {
      expect(GmailClient.parseFromHeader("John Doe <john@example.com")).toEqual(
        {
          user: "John Doe",
          email: null,
        },
      );
    });
  });

  describe("parseMessage", () => {
    it("parses complete message with all headers", () => {
      const message = {
        id: "msg-123",
        threadId: "thread-456",
        snippet: "This is a snippet",
        payload: {
          headers: [
            { name: "Subject", value: "Test Subject" },
            { name: "From", value: "John Doe <john@example.com>" },
            { name: "Date", value: "Mon, 1 Jan 2024 12:00:00 +0000" },
          ],
          body: {
            data: Buffer.from("Hello World").toString("base64"),
          },
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result).toEqual({
        id: "msg-123",
        threadId: "thread-456",
        subject: "Test Subject",
        from: "John Doe <john@example.com>",
        fromUser: "John Doe",
        fromEmail: "john@example.com",
        date: "Mon, 1 Jan 2024 12:00:00 +0000",
        body: "Hello World",
        snippet: "This is a snippet",
      });
    });

    it("handles missing Subject header", () => {
      const message = {
        id: "msg-123",
        threadId: "thread-456",
        snippet: "Snippet",
        payload: {
          headers: [
            { name: "From", value: "john@example.com" },
            { name: "Date", value: "Mon, 1 Jan 2024 12:00:00 +0000" },
          ],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.subject).toBeNull();
    });

    it("handles missing From header", () => {
      const message = {
        id: "msg-123",
        threadId: "thread-456",
        snippet: "Snippet",
        payload: {
          headers: [
            { name: "Subject", value: "Test" },
            { name: "Date", value: "Mon, 1 Jan 2024 12:00:00 +0000" },
          ],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.from).toBeNull();
      expect(result.fromUser).toBeNull();
      expect(result.fromEmail).toBeNull();
    });

    it("handles missing Date header", () => {
      const message = {
        id: "msg-123",
        threadId: "thread-456",
        snippet: "Snippet",
        payload: {
          headers: [
            { name: "Subject", value: "Test" },
            { name: "From", value: "john@example.com" },
          ],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.date).toBeNull();
    });

    it("handles missing threadId", () => {
      const message = {
        id: "msg-123",
        snippet: "Snippet",
        payload: {
          headers: [],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.threadId).toBeNull();
    });

    it("handles missing snippet", () => {
      const message = {
        id: "msg-123",
        threadId: "thread-456",
        payload: {
          headers: [],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.snippet).toBeNull();
    });

    it("handles empty headers array", () => {
      const message = {
        id: "msg-123",
        threadId: "thread-456",
        snippet: "Snippet",
        payload: {
          headers: [],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.subject).toBeNull();
      expect(result.from).toBeNull();
      expect(result.fromUser).toBeNull();
      expect(result.fromEmail).toBeNull();
      expect(result.date).toBeNull();
    });
  });

  describe("extractGmailMessageBody (via parseMessage)", () => {
    it("returns null for undefined payload", () => {
      const message = {
        id: "msg-123",
        payload: undefined,
      };

      const result = GmailClient.parseMessage(message);

      expect(result.body).toBeNull();
    });

    it("extracts body from simple message with payload.body.data", () => {
      const message = {
        id: "msg-123",
        payload: {
          body: {
            data: Buffer.from("Hello World").toString("base64"),
          },
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.body).toBe("Hello World");
    });

    it("extracts text/plain from multipart message", () => {
      const message = {
        id: "msg-123",
        payload: {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/plain",
              body: {
                data: Buffer.from("Plain text content").toString("base64"),
              },
            },
            {
              mimeType: "text/html",
              body: {
                data: Buffer.from("<p>HTML content</p>").toString("base64"),
              },
            },
          ],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.body).toBe("Plain text content");
    });

    it("falls back to text/html when no text/plain available", () => {
      const message = {
        id: "msg-123",
        payload: {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/html",
              body: {
                data: Buffer.from("<p>HTML content</p>").toString("base64"),
              },
            },
          ],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.body).toBe("<p>HTML content</p>");
    });

    it("prefers text/plain over text/html in multipart", () => {
      const message = {
        id: "msg-123",
        payload: {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/html",
              body: {
                data: Buffer.from("<p>HTML first</p>").toString("base64"),
              },
            },
            {
              mimeType: "text/plain",
              body: {
                data: Buffer.from("Plain text second").toString("base64"),
              },
            },
          ],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.body).toBe("Plain text second");
    });

    it("extracts from nested multipart structure", () => {
      const message = {
        id: "msg-123",
        payload: {
          mimeType: "multipart/mixed",
          parts: [
            {
              mimeType: "multipart/alternative",
              parts: [
                {
                  mimeType: "text/plain",
                  body: {
                    data: Buffer.from("Nested plain text").toString("base64"),
                  },
                },
                {
                  mimeType: "text/html",
                  body: {
                    data: Buffer.from("<p>Nested HTML</p>").toString("base64"),
                  },
                },
              ],
            },
            {
              mimeType: "application/pdf",
              filename: "attachment.pdf",
              body: {
                attachmentId: "att-123",
              },
            },
          ],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.body).toBe("Nested plain text");
    });

    it("handles invalid base64 data gracefully", () => {
      const message = {
        id: "msg-123",
        payload: {
          body: {
            data: "!!!invalid-base64!!!",
          },
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.body).not.toBeNull();
    });

    it("returns null for empty parts array", () => {
      const message = {
        id: "msg-123",
        payload: {
          mimeType: "multipart/alternative",
          parts: [],
        },
      };

      const result = GmailClient.parseMessage(message);

      expect(result.body).toBeNull();
    });
  });
});
