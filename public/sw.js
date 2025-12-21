// @ts-check
/// <reference lib="webworker" />

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

self.addEventListener("push", (event) => {
  const handlePush = async () => {
    if (!event.data) {
      return;
    }

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

    await self.registration.showNotification(payload.title, options);
  };

  event.waitUntil(handlePush());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/dashboard";
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
