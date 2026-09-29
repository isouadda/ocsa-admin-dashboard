// Scout 141's leftovers, Step 185 (4af4098), in English and in Spanish at 1280.
//
// Staff Management marks a test account's row Test account, from the isTestAccount every row of GET
// /api/users carries. Supplies reads each supply's QR image from GET /api/supplies/:id/qr.png with the
// token and keeps it as a data URL, and never asks the outside QR service for one. HR Compliance draws
// Certifications expiring soon and Expired certifications from expiringCerts and expiredCerts, and
// each certification in the lists under them. A notice whose link carries more than the page,
// #forms/reports/<id>, opens that page on that record instead of a new tab. The words are written out
// here by hand, so a wrong entry in the table is red and not merely followed.
"use strict";

const WORDS = {
  en: { test: "Test account", expiring: "Certifications expiring soon", expired: "Expired certifications", notices: "Notifications", markAll: "Mark all read" },
  es: { test: "Cuenta de prueba", expiring: "Certificaciones por vencer", expired: "Certificaciones vencidas", notices: "Avisos", markAll: "Marcar todo como le\u00eddo" },
};

// The count a compliance tile draws above its label, or null.
const tileCount = (d, label) => d.page.evaluate((l) => {
  const el = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === l);
  const prev = el && el.previousElementSibling;
  return prev ? (prev.textContent || "").trim() : null;
}, label);

async function run({ d, results, seed, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");

  // ---- Staff Management: the test account's row carries the mark, and no other row does
  await d.goto("staff");
  await d.settle(400);
  const test = seed.STAFF.find((p) => p.id === "u-staff-10");
  const marks = await d.page.evaluate((word) => Array.from(document.querySelectorAll("table tbody tr")).map((tr) => ({
    text: (tr.textContent || "").replace(/\s+/g, " "),
    marked: Array.from(tr.querySelectorAll("span")).some((sp) => (sp.textContent || "").trim() === word),
  })), w.test);
  const onTest = marks.filter((m) => m.text.indexOf(test.name) >= 0);
  const others = marks.filter((m) => m.text.indexOf(test.name) < 0 && m.marked);
  results.check("page", "page/staff/a-test-account-is-marked" + tail, onTest.length === 1 && onTest[0].marked && others.length === 0,
    onTest.length !== 1 ? "the test account's row is not on the list's first page" : !onTest[0].marked ? "the test account's row carries no " + JSON.stringify(w.test)
      : "the mark is on " + others.length + " other rows");

  // ---- Supplies: each QR image is a data URL of what the API's qr.png route sent
  const outside = [];
  const watch = (req) => { if (/qrserver/.test(req.url())) outside.push(req.url()); };
  d.page.on("request", watch);
  const mark = d.mark();
  await d.goto("supplies");
  await d.settle(900);
  const srcs = await d.page.evaluate((alt) => Array.from(document.querySelectorAll("img")).filter((i) => i.getAttribute("alt") === alt).map((i) => i.getAttribute("src") || ""), d.say("QR"));
  d.page.off("request", watch);
  const reads = d.callsSince(mark).filter((c) => c.method === "GET" && /^\/api\/supplies\/[^/]+\/qr\.png$/.test(c.path)).map((c) => c.path.split("/")[3]);
  const supplies = stubs.fixtures.SUPPLIES.map((x) => x.id);
  const want = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const unread = supplies.filter((id) => reads.indexOf(id) < 0);
  const wrong = srcs.filter((x) => x !== want);
  results.check("page", "page/supplies/qr-read-from-the-api" + tail, unread.length === 0 && srcs.length === supplies.length && wrong.length === 0 && outside.length === 0,
    outside.length ? "the page asked the outside QR service for " + outside.length + " images"
      : unread.length ? "no GET /api/supplies/:id/qr.png for " + unread.join(", ")
        : srcs.length !== supplies.length ? srcs.length + " QR images drawn for " + supplies.length + " supplies"
          : wrong.length ? "an image is drawn from " + JSON.stringify(wrong[0].slice(0, 60)) + " rather than the data the API sent" : "");

  // ---- HR Compliance: the certification tiles count, and each certification is listed
  await d.goto("hr");
  await d.clickText(d.say("Compliance"), { exact: true });
  await d.settle(500);
  const served = stubs.fixtures.HR_COMPLIANCE;
  const expiringN = await tileCount(d, w.expiring);
  const expiredN = await tileCount(d, w.expired);
  const body = await d.bodyText();
  const unlisted = served.expiringCerts.concat(served.expiredCerts).filter((c) => body.indexOf(c.cert_name) < 0 || body.indexOf(c.expiry_date) < 0).map((c) => c.cert_name);
  results.check("page", "page/hr/compliance-counts-certifications" + tail, expiringN === "2" && expiredN === "1" && unlisted.length === 0,
    expiringN !== "2" ? JSON.stringify(w.expiring) + " counts " + JSON.stringify(expiringN) + " where 2 are due within 30 days"
      : expiredN !== "1" ? JSON.stringify(w.expired) + " counts " + JSON.stringify(expiredN) + " where 1 is past its expiry"
        : unlisted.length ? "not listed with its expiry: " + unlisted.join(", ") : "2 expiring and 1 expired, each listed with its expiry");

  // ---- the bell: a notice linking #forms/reports/<id> opens Forms on that report
  stubs.reset();
  stubs.state.notifications = [{ id: "n-8", title: "A report was voided", body: "The incident report was voided.", subjectType: "report", subjectId: "ir-1",
    link: "#forms/reports/ir-1", createdAt: seed.shift(0) + "T23:00:00Z", readAt: null }];
  await d.goto("overview");
  await d.reload();
  await d.clearCaptures();
  await d.page.evaluate((title) => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.getAttribute("title") === title && x.offsetParent !== null); if (b) b.click(); }, w.notices);
  await d.settle(400);
  const bellOpen = await d.has(w.markAll);
  const before = d.mark();
  await d.page.evaluate((word) => {
    const panel = document.querySelector("div[role=dialog]");
    const row = panel && Array.from(panel.querySelectorAll("button")).find((b) => (b.innerText || "").indexOf(word) >= 0);
    if (row) row.click();
  }, "A report was voided");
  await d.settle(900);
  const hash = await d.page.evaluate(() => window.location.hash);
  const readReport = d.callsSince(before).some((c) => c.method === "GET" && c.path === "/api/forms/responses/ir-1");
  const windowOpen = await d.modalOpen();
  const newTab = (await d.prints()).length;
  results.check("page", "page/notices/a-link-opens-its-record" + tail, bellOpen && hash === "#forms/reports/ir-1" && readReport && windowOpen && newTab === 0,
    !bellOpen ? "the bell did not open" : newTab ? "the notice opened a new tab"
      : hash !== "#forms/reports/ir-1" ? "the notice left the address at " + JSON.stringify(hash)
        : !readReport ? "the report was not read" : !windowOpen ? "Forms opened without the report's window" : "");
  await d.closeModal();
  stubs.reset();

  results.note("Scout 141's leftovers in " + lang + ": the test account's mark, the supplies' QR images, the certification counts and a notice's link");
}

module.exports = { run };
