// @ts-check
/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
// @ts-expect-error self is not defined in this scope
const sw = self;

// Load Dexie for IndexedDB access
importScripts("https://unpkg.com/dexie@4.0.11/dist/dexie.min.js");

// @ts-expect-error Dexie is loaded via importScripts
const db = new Dexie("mailbeaver-emails");
db.version(1).stores({
  emails: "messageId, receivedAt",
});

// Force the new service worker to activate immediately
sw.addEventListener("install", (event) => {
  event.waitUntil(sw.skipWaiting());
});

// Take control of all clients immediately
sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});

/**
 * @typedef {Object} EmailData
 * @property {string} messageId
 * @property {string} from
 * @property {string|null} fromUser
 * @property {string|null} fromEmail
 * @property {string} subject
 * @property {string} receivedAt
 */

/**
 * @typedef {Object} PushPayload
 * @property {string} title
 * @property {string} body
 * @property {string} [url]
 * @property {string} [tag]
 * @property {EmailData} email
 */

/**
 * @param {unknown} data
 * @returns {{ success: true; data: PushPayload } | { success: false; error: string }}
 */
function parsePushPayload(data) {
  if (typeof data !== "object" || data === null) {
    return { success: false, error: "Payload must be an object" };
  }

  const obj = /** @type {Record<string, unknown>} */ (data);

  if (typeof obj.title !== "string" || obj.title.length === 0) {
    return { success: false, error: "Missing or invalid 'title' field" };
  }

  if (typeof obj.body !== "string" || obj.body.length === 0) {
    return { success: false, error: "Missing or invalid 'body' field" };
  }

  if (obj.url !== undefined && typeof obj.url !== "string") {
    return { success: false, error: "Invalid 'url' field" };
  }

  if (obj.tag !== undefined && typeof obj.tag !== "string") {
    return { success: false, error: "Invalid 'tag' field" };
  }

  if (typeof obj.email !== "object" || obj.email === null) {
    return { success: false, error: "Missing or invalid 'email' field" };
  }

  const email = /** @type {Record<string, unknown>} */ (obj.email);

  if (typeof email.messageId !== "string" || email.messageId.length === 0) {
    return {
      success: false,
      error: "Missing or invalid 'email.messageId' field",
    };
  }

  if (typeof email.from !== "string" || email.from.length === 0) {
    return { success: false, error: "Missing or invalid 'email.from' field" };
  }

  if (typeof email.subject !== "string" || email.subject.length === 0) {
    return {
      success: false,
      error: "Missing or invalid 'email.subject' field",
    };
  }

  if (typeof email.receivedAt !== "string" || email.receivedAt.length === 0) {
    return {
      success: false,
      error: "Missing or invalid 'email.receivedAt' field",
    };
  }

  return {
    success: true,
    data: {
      title: obj.title,
      body: obj.body,
      url: obj.url,
      tag: obj.tag,
      email: {
        messageId: email.messageId,
        from: email.from,
        fromUser: typeof email.fromUser === "string" ? email.fromUser : null,
        fromEmail: typeof email.fromEmail === "string" ? email.fromEmail : null,
        subject: email.subject,
        receivedAt: email.receivedAt,
      },
    },
  };
}

sw.addEventListener("push", (event) => {
  const handlePush = async () => {
    if (!event.data) {
      return;
    }

    /** @type {unknown} */
    let rawPayload;
    try {
      rawPayload = event.data.json();
    } catch (err) {
      console.error("Failed to parse push notification JSON:", err);
      return;
    }

    const result = parsePushPayload(rawPayload);
    if (!result.success) {
      console.error("Invalid push notification payload:", result.error);
      return;
    }

    const payload = result.data;

    // Write email to IndexedDB before showing notification
    await db.emails.put({
      messageId: payload.email.messageId,
      from: payload.email.from,
      fromUser: payload.email.fromUser,
      fromEmail: payload.email.fromEmail,
      subject: payload.email.subject,
      receivedAt: payload.email.receivedAt,
      url: payload.url,
    });

    const options = {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url },
    };

    await sw.registration.showNotification(payload.title, options);
  };

  event.waitUntil(handlePush());
});

sw.addEventListener("notificationclick", (event) => {
  const url = event.notification.data?.url ?? "/dashboard";
  // If URL starts with '/', treat as relative; otherwise assume absolute
  const targetUrl = url.startsWith("/")
    ? new URL(url, sw.location.origin).href
    : url;

  // drop the notification
  event.notification.close();

  event.waitUntil(
    sw.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      return sw.clients.openWindow(targetUrl);
    }),
  );
});
