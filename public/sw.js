// Minimal service worker so Android browsers offer "Install app" or "Add to Home screen".
// It stores nothing: no page, no asset, no API response. Every request goes straight to the
// network, so a deploy is never hidden behind an old copy and no personal data is kept on a phone.
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function () {
  // No respondWith: the browser handles the request as if no service worker were present.
});
