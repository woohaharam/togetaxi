// 같이타 서비스 워커: 푸시 알림만 다룬다 (오프라인 캐시는 하지 않음)

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "같이타", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      const url = data.url || "/";
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // 그 채팅방을 지금 보고 있으면 알리지 않는다
      const watching = windows.some((w) => w.focused && new URL(w.url).pathname === url);
      if (watching) return;

      await self.registration.showNotification(data.title || "같이타", {
        body: data.body || "",
        tag: data.tag,
        renotify: Boolean(data.tag),
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ("navigate" in w) await w.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
