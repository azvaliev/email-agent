// @ts-check
/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
// @ts-expect-error self is not defined in this scope
const sw = self;

// Force the new service worker to activate immediately
sw.addEventListener("install", (event) => {
  event.waitUntil(sw.skipWaiting());
});

// Take control of all clients immediately
sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});

/**
 * @typedef {Object} PushPayload
 * @property {string} title
 * @property {string} body
 * @property {string} [url]
 * @property {string} [tag]
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

  return {
    success: true,
    data: {
      title: obj.title,
      body: obj.body,
      url: obj.url,
      tag: obj.tag,
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
  event.notification.close();

  console.error("notificationclick", event);
  console.error("data", event.notification.data);

  const url = decodeURI(event.notification.data?.url ?? "/dashboard");
  // If URL starts with '/', treat as relative; otherwise assume absolute
  const targetUrl = url.startsWith("/")
    ? new URL(url, sw.location.origin).href
    : url;

  // Note: clients is an async API, length check removed

  event.waitUntil(
    sw.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        console.error("client", client);
        if (client.url === targetUrl && "focus" in client) {
          console.error("focusing client", client);
          return client.focus();
        }
      }

      console.error("opening window", targetUrl);
      return sw.clients.openWindow(targetUrl);
    }),
  );
});
