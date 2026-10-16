// The dashboard's service worker. It exists so Android browsers offer "Install app" or "Add to Home
// screen", and since Step 333 to show alerts on this computer. It stores nothing: no page, no asset, no
// API response. Every request goes straight to the network, so a deploy is never hidden behind an old
// copy and no personal data is kept on a computer or a phone.
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function () {
  // No respondWith: the browser handles the request as if no service worker were present.
});

// Alerts on this computer (Step 333, TRAINING_DAY_CONTRACT.md part 333, item 3), the staff app's
// pattern. The API pushes a small JSON payload, in the person's language: title, body, tag,
// subjectType, subjectId, locale. The worker shows it as the dashboard's own notification, one per
// tag, buzzing again when the same tag arrives, and keeps the subject in the notification's data for
// the click. A payload with no title shows nothing. An open dashboard window is told a notice came,
// so its bell's count and its toast do not wait for the next minute.
var ICON = "/icons/icon-192.png";
self.addEventListener("push", function (event) {
  var data = null;
  try { data = event.data ? event.data.json() : null; } catch (e) { data = null; }
  if (!data || typeof data !== "object" || typeof data.title !== "string" || !data.title) return;
  var tag = typeof data.tag === "string" && data.tag ? data.tag : null;
  var options = {
    body: typeof data.body === "string" ? data.body : "",
    icon: ICON,
    lang: data.locale === "es" ? "es" : "en",
    data: { subjectType: data.subjectType || null, subjectId: data.subjectId || null },
  };
  // renotify is refused without a tag, so both go together.
  if (tag) { options.tag = tag; options.renotify = true; }
  event.waitUntil(self.registration.showNotification(data.title, options).then(function () {
    return self.clients.matchAll({ type: "window", includeUncontrolled: true });
  }).then(function (list) {
    list.forEach(function (w) { try { w.postMessage({ type: "ocsa-notice" }); } catch (e) {} });
  }).catch(function () {}));
});

// Where a notice opens, the hash after the page's address, the way the dashboard's noticePlace reads
// it: every subject the dashboard has a page for. A subject with none opens the dashboard's front page.
function placeOf(subjectType, subjectId) {
  var st = subjectType ? String(subjectType) : "";
  var id = subjectId ? encodeURIComponent(String(subjectId)) : "";
  if ((st === "form" || st === "customer_concern") && id) return "forms/reports/" + id;
  if ((st === "chat" || st === "chat_mention") && id) return "chat/" + id;
  if (st === "announcement" && id) return "announcements/" + id;
  if ((st === "equipment_tagged_out" || st === "equipment_service_due") && id) return "equipment/" + id;
  if (st === "periodic_overdue") return id ? "sites/" + id + "/tasks" : "sites";
  if (st === "client_request" && id) return "issues/requests/" + id;
  if (st === "inspection_finding" && id) return "issues/" + id;
  if ((st === "training_signoff" || st === "training_reteach") && id) return "training/attempts/" + id;
  if (st === "training_expiring") return "training/gaps";
  if ((st === "signature_disputed" || st === "signature_declined" || st === "signature_overdue") && id) return "hr/signatures/" + id;
  if (/^issue(_|$)/.test(st) && id) return "issues/" + id;
  if (/^inspection(_|$)/.test(st) && id) return "inspections/" + id;
  if (st === "time_off") return id ? "schedule/timeoff/" + id : "schedule/timeoff";
  if (/^hr_case(_|$)/.test(st)) return id ? "cases/" + id : "cases";
  // The six types API #146 added for staff, a support ticket, and a dropped or claimed shift, where the
  // bell opens them (DASH-25).
  if (st === "task_assigned") return "assigned";
  if (st === "training_assigned" || st === "training_session") return "training";
  if (st === "site_assigned") return id ? "sites/" + id : "sites";
  if (st === "workspace_member") return id ? "workspace/" + id : "workspace";
  if (st === "document_to_sign") return "hr/signatures";
  if (st === "support_ticket" || st === "support_ticket_new") return "tickets";
  if (st === "shift_drop" || st === "shift_claim") return "marketplace";
  if (/^shift(_|$)/.test(st)) return "schedule";
  return "";
}

// A click on an alert focuses an open dashboard window and tells it where to go, or opens one with
// the place in the address. The dashboard opens the same place the bell would.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var d = event.notification.data || {};
  var subjectType = d.subjectType ? String(d.subjectType) : null;
  var subjectId = d.subjectId ? String(d.subjectId) : null;
  var place = placeOf(subjectType, subjectId);
  var message = { type: "ocsa-open", subjectType: subjectType, subjectId: subjectId, place: place };
  var address = "/" + (place ? "#" + place : "");
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    var win = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].url && list[i].url.indexOf(self.location.origin) === 0) { win = list[i]; break; }
    }
    if (win) {
      try { win.postMessage(message); } catch (e) {}
      return win.focus ? win.focus().catch(function () {}) : undefined;
    }
    return self.clients.openWindow(address);
  }));
});
