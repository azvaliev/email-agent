// @ts-check
/// <reference lib="webworker" />

/**
 * @typedef {Object} PushPayload
 * @property {string} title
 * @property {string} body
 * @property {string} [url]
 * @property {string} [tag]
 */

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  /** @type {PushPayload} */
  const payload = event.data.json();

  const options = {
    body: payload.body,
    tag: payload.tag,
    data: { url: payload.url },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
