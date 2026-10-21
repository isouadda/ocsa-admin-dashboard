// Maintenance requests, leave balances, and what the API's Rounds 5 and 6 built (part 368), against the
// stub as the API is built (setApiAsBuilt) with Round 2's file log (setStep353), part 364's answers
// (setStep364) and the API's Rounds 5 and 6 (audit/part368-stub.js). Each case runs in English and in
// Spanish, and each fails on main as it stood at 4b4fb22 unless its name says it is a guard.
//
//   maintenance  the side panel item and the page's counts by status; the filters, sent with the list and
//                the counts, and kept on the next page; Show more; New maintenance request with the
//                contacts shown before sending, from JSON or with photos; a site with no contact; the
//                email that did not go and Send the email again; Record a response; Send a follow-up,
//                asked once; the status words; Send to building maintenance from an issue, and the
//                reference the issue shows; a site's contacts, added, edited and turned off; a site's
//                own requests; the business days in Settings; a notice from the bell and a phone alert;
//                a person without the capability
//   leave        the side panel item under HR Records; the balances by kind for a year, each filter sent
//                and kept on the next page, Download CSV; a person's ledger; Adjust, its reason, asked once,
//                sent once with a clientId; read without manage_leave_balances; the policies, the handbook's
//                read only, an edit that sends what changed, a new policy with a kind of its own; a site's
//                policy on the Sites tab and its page, a person's on the HR folder; hours files, a line that
//                cannot be read or matched, and the posting; missing hire dates; Enter starting balances;
//                the time off window's balance, warnings and Take back approval
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "part368";
const ROOT = path.resolve(__dirname, "..", "..");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const fill = (s, ...v) => v.reduce((x, y, i) => x.split("{" + i + "}").join(String(y)), s);
const say = (x) => JSON.stringify(x);

async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(700);
}
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
const has = async (d, sel) => (await d.page.locator(sel).count()) > 0;
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: ms || 6000 }).catch(() => {}); return has(d, sel); };
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const navIds = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]")).map((b) => b.getAttribute("data-nav-item")));
const hashNow = (d) => d.page.evaluate(() => window.location.hash);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const q = (c) => new URLSearchParams(String(c.query || "").replace(/^\?/, ""));

// One driver on a stub of its own, armed with the API as built, Round 2's file log and part 364.
async function withDriver(ctx, o, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  stubs.setStep353(true);
  stubs.setStep364(true);
  if (o.arm) o.arm(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: o.viewport || "wide", lang: o.lang || "en" });
  d.page.setDefaultTimeout(8000);
  try {
    if (o.persona !== null) await d.signIn(o.persona || "admin");
    await fn(d, stubs);
  } catch (e) {
    results.fail(KIND, KIND + "/" + (o.lang || "en") + "/" + o.name + "/suite", threw(e));
  } finally { await d.close(); }
}

// The bell, in the language the screen is drawn in (the driver's own reads the English words).
async function openBellIn(d) {
  const label = d.say("Notifications");
  await d.page.evaluate((l) => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.getAttribute("title") === l && x.offsetParent !== null); if (b) b.click(); }, label);
  return until(d, 'div[role=dialog][aria-label="' + label + '"]', 4000);
}

function swPlaceOf() {
  const code = fs.readFileSync(path.join(ROOT, "public", "sw.js"), "utf8");
  const sandbox = { self: { addEventListener() {}, location: { origin: "" } } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.placeOf;
}

// ---- Section 1: maintenance requests ------------------------------------------------------------------
const STATUS_WORDS = { sent: "Sent|maintenance", acknowledged: "Acknowledged|maintenance", scheduled: "Scheduled|maintenance", fixed: "Fixed|maintenance", closed: "Closed|maintenance", cancelled: "Cancelled|maintenance" };
const listRows = (d) => d.page.locator("[data-maint-list] table tbody tr");
const rowRefs = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-maint-list] table tbody tr")).map((tr) => ((tr.querySelector("td") || {}).innerText || "").split("\n")[0].trim()).filter((x) => /^MR-/.test(x)));
async function openRequest(d, ref) {
  const row = listRows(d).filter({ hasText: ref }).first();
  await row.click();
  return until(d, "[data-maint-window] [data-maint-reference]", 6000);
}
async function pickSelect(d, sel, value) { await d.page.locator(sel).first().selectOption(value); await d.settle(400); }

async function maintenanceCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/maintenance/" + x;

  // The side panel item under Issue Tracker, for an admin and a supervisor, and the counts on the page.
  for (const persona of ["admin", "supervisor"]) {
    await withDriver(ctx, { name: "nav-" + persona, lang, persona }, async (d) => {
      const items = await navIds(d);
      const at = items.indexOf("maintenance");
      results.check(KIND, id("side-panel-item-under-issues/" + persona), at >= 0 && items[at - 1] === "issues",
        at < 0 ? "the side panel has no Maintenance requests item: " + items.join(", ") : "Maintenance requests follows " + items[at - 1] + " where Issue Tracker is meant");
      if (persona !== "admin") return;
      await goHash(d, "maintenance");
      await until(d, "[data-maint-list] table tbody tr");
      const counts = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-maint-counts] button")).map((b) => (b.innerText || "").replace(/\s+/g, " ").trim()));
      const want = [[d.say("All|maintenance"), 7], [d.say(STATUS_WORDS.sent), 2], [d.say(STATUS_WORDS.acknowledged), 1], [d.say(STATUS_WORDS.scheduled), 1], [d.say(STATUS_WORDS.fixed), 1], [d.say(STATUS_WORDS.closed), 1], [d.say(STATUS_WORDS.cancelled), 1]];
      const miss = want.filter(([w, n]) => !counts.some((c) => c === w + " " + n));
      results.check(KIND, id("counts-by-status-on-the-page"), counts.length === 7 && miss.length === 0,
        counts.length === 0 ? "the page draws no counts by status" : "the counts read " + say(counts) + ", missing " + say(miss.map((x) => x.join(" "))));
      const refs = await rowRefs(d);
      results.check(KIND, id("newest-first"), refs.join(",") === "MR-2026-0007,MR-2026-0003,MR-2026-0001,MR-2026-0002,MR-2026-0006,MR-2026-0004,MR-2026-0005",
        "the list reads " + refs.join(", "));
      // Every status in its word and color.
      const badges = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-maint-row-status]")).map((x) => [x.getAttribute("data-maint-row-status"), (x.innerText || "").trim(), getComputedStyle(x.firstChild).color]));
      const wrongWord = badges.filter(([code, word]) => word.toLowerCase() !== d.say(STATUS_WORDS[code]).toLowerCase());
      const colors = {}; badges.forEach(([code, , c]) => { colors[code] = c; });
      const distinct = new Set(Object.values(colors)).size;
      results.check(KIND, id("status-words-and-colors"), badges.length === 7 && wrongWord.length === 0 && distinct >= 5,
        badges.length !== 7 ? "the list draws " + badges.length + " status badges" : wrongWord.length ? "a status reads " + say(wrongWord) : "the six statuses share " + distinct + " colors");
    });
  }

  // The filters go to the list and the counts, the status tab to the list alone, and the age as days.
  await withDriver(ctx, { name: "filters", lang }, async (d) => {
    await goHash(d, "maintenance");
    await until(d, "[data-maint-list] table tbody tr");
    let mark = d.mark();
    await pickSelect(d, '[data-maint-filter="urgency"]', "urgent_safety");
    const list1 = reads(d, mark, /^\/api\/maintenance-requests$/).pop();
    const sum1 = reads(d, mark, /^\/api\/maintenance-requests\/summary$/).pop();
    const refs1 = await rowRefs(d);
    results.check(KIND, id("urgency-filter-reads-the-list-and-the-counts"), !!list1 && q(list1).get("urgency") === "urgent_safety" && q(list1).has("cursor") && !!sum1 && q(sum1).get("urgency") === "urgent_safety" && refs1.join(",") === "MR-2026-0001",
      !list1 ? "choosing an urgency read no list" : "the list was read with " + say(list1.query) + " and the counts with " + say(sum1 ? sum1.query : null) + ", showing " + refs1.join(", "));
    await pickSelect(d, '[data-maint-filter="urgency"]', "");
    mark = d.mark();
    await pickSelect(d, '[data-maint-filter="age"]', "older");
    const list2 = reads(d, mark, /^\/api\/maintenance-requests$/).pop();
    const refs2 = await rowRefs(d);
    results.check(KIND, id("age-filter-sends-days"), !!list2 && q(list2).get("minAgeDays") === "31" && !q(list2).has("maxAgeDays") && refs2.join(",") === "MR-2026-0004,MR-2026-0005",
      !list2 ? "choosing an age read no list" : "the list was read with " + say(list2.query) + ", showing " + refs2.join(", "));
    await pickSelect(d, '[data-maint-filter="age"]', "");
    mark = d.mark();
    await d.page.locator("[data-maint-counts] button", { hasText: d.say(STATUS_WORDS.sent) }).first().click();
    await d.settle(400);
    const list3 = reads(d, mark, /^\/api\/maintenance-requests$/).pop();
    const sum3 = reads(d, mark, /^\/api\/maintenance-requests\/summary$/).pop();
    const refs3 = await rowRefs(d);
    results.check(KIND, id("a-status-count-filters-the-list"), !!list3 && q(list3).get("status") === "sent" && (!sum3 || !q(sum3).has("status")) && refs3.join(",") === "MR-2026-0007,MR-2026-0001",
      !list3 ? "pressing Sent read no list" : "the list was read with " + say(list3.query) + ", showing " + refs3.join(", "));
    mark = d.mark();
    await pickSelect(d, '[data-maint-filter="site"]', seed.SITES[1].id);
    const list4 = reads(d, mark, /^\/api\/maintenance-requests$/).pop();
    const refs4 = await rowRefs(d);
    results.check(KIND, id("site-filter-keeps-the-status"), !!list4 && q(list4).get("siteId") === seed.SITES[1].id && q(list4).get("status") === "sent" && refs4.length === 0,
      !list4 ? "choosing a site read no list" : "the list was read with " + say(list4.query) + ", showing " + refs4.join(", "));
  });

  // Show more until nextCursor is empty, with the filters kept.
  await withDriver(ctx, { name: "paging", lang, arm: (s) => s.setScene368({ many: true }) }, async (d) => {
    await goHash(d, "maintenance");
    await until(d, "[data-maint-list] table tbody tr");
    await pickSelect(d, '[data-maint-filter="site"]', seed.SITES[0].id);
    const first = (await rowRefs(d)).length;
    const mark = d.mark();
    const more = await has(d, "[data-maint-more]");
    if (more) { await d.page.locator("[data-maint-more]").click(); await d.settle(500); }
    const next = reads(d, mark, /^\/api\/maintenance-requests$/).pop();
    const all = await rowRefs(d);
    const still = await has(d, "[data-maint-more]");
    results.check(KIND, id("show-more-reads-the-next-page-with-the-filters"), first === 50 && more && !!next && q(next).get("cursor") && q(next).get("siteId") === seed.SITES[0].id && all.length === 65 && new Set(all).size === 65 && !still,
      !more ? "the first page of " + first + " offers no Show more" : !next ? "Show more read nothing" : "the next page was read with " + say(next.query) + "; the list holds " + all.length + " (" + new Set(all).size + " different)" + (still ? " and still offers Show more" : ""));
  });

  // New maintenance request: the contacts before sending, then the filing.
  await withDriver(ctx, { name: "new", lang }, async (d, stubs) => {
    await goHash(d, "maintenance");
    await d.page.getByRole("button", { name: d.say("New maintenance request") }).first().click();
    await until(d, "[data-maint-new]");
    await pickSelect(d, '[data-maint-field="siteId"]', seed.SITES[0].id);
    await until(d, "[data-maint-recipient]", 4000);
    const all = await d.page.locator("[data-maint-recipient]").count();
    await d.page.locator('[data-maint-field="building"]').fill("South Wing");
    await d.settle(200);
    const south = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-maint-recipient]")).map((x) => x.getAttribute("data-maint-recipient")));
    await d.page.locator('[data-maint-field="building"]').fill("North Wing");
    await d.settle(200);
    const north = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-maint-recipient]")).map((x) => x.getAttribute("data-maint-recipient")));
    results.check(KIND, id("new-shows-who-it-goes-to"), all === 2 && south.join(",") === "mc-1,mc-2" && north.join(",") === "mc-1,mc-2",
      "the window lists " + all + " recipients for the site, " + say(south) + " for the South Wing (its contact is turned off) and " + say(north) + " for the North Wing");
    await d.page.locator('[data-maint-field="floor"]').fill("4");
    await d.page.locator('[data-maint-field="area"]').fill("Copy room");
    await pickSelect(d, '[data-maint-field="category"]', "plumbing");
    await pickSelect(d, '[data-maint-field="urgency"]', "soon");
    await d.page.locator('[data-maint-field="description"]').fill("The copy room sink drips.");
    const mark = d.mark();
    await d.page.locator("[data-maint-send]").click();
    await d.settle(600);
    const posts = writes(d, mark, "POST", /^\/api\/maintenance-requests$/);
    const b = posts[0] && posts[0].body && typeof posts[0].body === "object" ? posts[0].body : {};
    const toast = (await d.toast()) || "";
    const opened = await until(d, '[data-maint-window="mr-8"]', 4000);
    results.check(KIND, id("new-sends-once-and-opens-the-request"), posts.length === 1 && b.siteId === seed.SITES[0].id && b.building === "North Wing" && b.floor === "4" && b.area === "Copy room" && b.category === "plumbing" && b.urgency === "soon" && b.description === "The copy room sink drips." && opened && toast.indexOf("MR-2026-0008") >= 0 && (await hashNow(d)) === "#maintenance/mr-8",
      posts.length !== 1 ? posts.length + " filings were sent" : "it sent " + say(b) + ", said " + say(toast) + (opened ? "" : ", and opened no window on MR-2026-0008"));
  });

  // Photos go as multipart, under photos.
  await withDriver(ctx, { name: "new-photos", lang }, async (d, stubs) => {
    await goHash(d, "maintenance");
    await d.page.getByRole("button", { name: d.say("New maintenance request") }).first().click();
    await until(d, "[data-maint-new]");
    await pickSelect(d, '[data-maint-field="siteId"]', seed.SITES[1].id);
    await pickSelect(d, '[data-maint-field="category"]', "leak_water");
    await pickSelect(d, '[data-maint-field="urgency"]', "urgent_safety");
    await d.page.locator('[data-maint-field="description"]').fill("Water on the clinic floor.");
    await d.page.locator('[data-maint-photos="new"] input[type="file"]').setInputFiles([{ name: "one.png", mimeType: "image/png", buffer: PNG }, { name: "two.png", mimeType: "image/png", buffer: PNG }]);
    await d.settle(200);
    const picked = await d.page.locator("[data-maint-photo-picked]").count();
    await d.page.locator("[data-maint-send]").click();
    await d.settle(700);
    const filed = stubs.sent368().filter((x) => x.filed);
    const f = filed[0] || {};
    results.check(KIND, id("photos-go-with-the-request"), picked === 2 && filed.length === 1 && f.multipart === true && f.files === 2 && f.body && f.body.category === "leak_water",
      picked !== 2 ? "the window holds " + picked + " photos" : filed.length !== 1 ? filed.length + " filings reached the API" : "the filing went " + (f.multipart ? "as multipart" : "as JSON") + " with " + f.files + " photos");
  });

  // A site with no active contact says so, offers Add a contact, and does not send.
  await withDriver(ctx, { name: "no-contact", lang }, async (d) => {
    await goHash(d, "maintenance");
    await d.page.getByRole("button", { name: d.say("New maintenance request") }).first().click();
    await until(d, "[data-maint-new]");
    await pickSelect(d, '[data-maint-field="siteId"]', seed.SITES[2].id);
    const said = await until(d, "[data-maint-no-contact]", 4000);
    const words = await textOf(d, "[data-maint-no-contact]");
    const disabled = await d.page.locator("[data-maint-send]").isDisabled();
    const link = await has(d, "[data-maint-add-contact-link]");
    if (link) await d.page.locator("[data-maint-add-contact-link]").click();
    await d.settle(700);
    const at = await hashNow(d);
    results.check(KIND, id("no-contact-says-so-and-links-to-adding-one"), said && words.indexOf(d.say("This site has no active maintenance contact. Add one on the site's page before sending.")) >= 0 && disabled && link && at === "#sites/" + seed.SITES[2].id + "/maintenance" && (await has(d, '[data-site-maintenance="' + seed.SITES[2].id + '"]')),
      !said ? "a site with no contact says nothing" : !disabled ? "Send is offered with nobody to send to" : !link ? "there is no way to add a contact" : "Add a contact went to " + at);
  });

  // The email that did not go: said on sending, on the request, and Send the email again sends it.
  await withDriver(ctx, { name: "email-failed", lang, arm: (s) => s.setScene368({ emailFails: true }) }, async (d, stubs) => {
    await goHash(d, "maintenance");
    await d.page.getByRole("button", { name: d.say("New maintenance request") }).first().click();
    await until(d, "[data-maint-new]");
    await pickSelect(d, '[data-maint-field="siteId"]', seed.SITES[1].id);
    await pickSelect(d, '[data-maint-field="category"]', "elevator");
    await pickSelect(d, '[data-maint-field="urgency"]', "routine");
    await d.page.locator('[data-maint-field="description"]').fill("The elevator door closes too fast.");
    await d.page.locator("[data-maint-send]").click();
    await d.settle(600);
    const toast = (await d.toast()) || "";
    await until(d, '[data-maint-window="mr-8"]', 4000);
    const state = await d.page.locator("[data-maint-email]").first().getAttribute("data-maint-email").catch(() => "");
    const line = await textOf(d, "[data-maint-email]");
    const warned = toast.indexOf(stubs.model368 ? (lang === "es" ? "La solicitud se guard\u00f3 y su correo no se envi\u00f3." : "The request is saved, and its email did not go.") : "") >= 0;
    results.check(KIND, id("email-that-did-not-go-is-said"), warned && state === "failed" && line === d.say("The email did not go.") && (await has(d, "[data-maint-resend]")),
      !warned ? "sending said " + say(toast) : "the request says " + say(line) + (await has(d, "[data-maint-resend]") ? "" : " and offers no Send the email again"));
    stubs.setScene368({ emailFails: false });
    const mark = d.mark();
    await d.page.locator("[data-maint-resend]").click();
    await d.settle(600);
    const resent = writes(d, mark, "POST", /^\/api\/maintenance-requests\/mr-8\/resend$/);
    const after = await d.page.locator("[data-maint-email]").first().getAttribute("data-maint-email").catch(() => "");
    results.check(KIND, id("send-the-email-again"), resent.length === 1 && after === "sent" && !(await has(d, "[data-maint-resend]")),
      resent.length !== 1 ? resent.length + " resends were sent" : "after the resend the email reads " + after);
  });

  // Record a response: the response, then the status, then the photo; the log newest first.
  await withDriver(ctx, { name: "record", lang }, async (d, stubs) => {
    await goHash(d, "maintenance");
    await until(d, "[data-maint-list] table tbody tr");
    await openRequest(d, "MR-2026-0001");
    await d.page.locator("[data-maint-record]").click();
    await until(d, "[data-maint-response-form]");
    await pickSelect(d, '[data-maint-response="channel"]', "phone");
    await pickSelect(d, '[data-maint-response="status"]', "scheduled");
    await d.page.locator('[data-maint-response="scheduledFor"]').fill("2026-03-20");
    await d.page.locator('[data-maint-response="note"]').fill("The plumber comes Friday.");
    await d.page.locator('[data-maint-photos="response"] input[type="file"]').setInputFiles([{ name: "drip.png", mimeType: "image/png", buffer: PNG }]);
    const mark = d.mark();
    await d.page.locator("[data-maint-response-save]").click();
    await d.settle(800);
    const posts = writes(d, mark, "POST", /^\/api\/maintenance-requests\/mr-1\/log$/);
    const kinds = stubs.sent368().filter((x) => x.log === "MR-2026-0001").map((x) => (x.body && x.body.kind) + (x.files ? ":" + x.files : ""));
    const b0 = stubs.sent368().filter((x) => x.log === "MR-2026-0001")[0] || {};
    const status = await d.page.locator("[data-maint-status]").first().getAttribute("data-maint-status").catch(() => "");
    const log = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-maint-entry]")).map((x) => x.getAttribute("data-maint-entry")));
    results.check(KIND, id("record-a-response-writes-each-part-once"), posts.length === 3 && kinds.join(",") === "response,status,photo:1" && b0.body && b0.body.channel === "phone" && b0.body.body === "The plumber comes Friday." && status === "scheduled",
      "it sent " + posts.length + " entries, " + say(kinds) + ", and the request reads " + status);
    results.check(KIND, id("the-log-is-newest-first"), log.join(",") === "photo,status,response,email",
      "the record reads " + say(log));
  });

  // Send a follow-up: asked once, sent once, and again the same day refused in the API's words.
  await withDriver(ctx, { name: "follow-up", lang }, async (d, stubs) => {
    await goHash(d, "maintenance");
    await until(d, "[data-maint-list] table tbody tr");
    await openRequest(d, "MR-2026-0002");
    await d.setConfirmAnswer(false);
    let mark = d.mark();
    await d.page.locator("[data-maint-follow-up]").click();
    await d.settle(300);
    const declined = writes(d, mark, "POST", /\/follow-up$/).length;
    await d.setConfirmAnswer(true);
    mark = d.mark();
    await d.page.locator("[data-maint-follow-up]").click();
    await d.settle(600);
    const sent = writes(d, mark, "POST", /^\/api\/maintenance-requests\/mr-2\/follow-up$/).length;
    const asked = (await d.confirms()).filter((c) => String(c).indexOf("MR-2026-0002") >= 0).length;
    const line = await textOf(d, "[data-maint-follow-ups]");
    results.check(KIND, id("follow-up-asks-once-then-sends"), declined === 0 && sent === 1 && asked === 2 && line.indexOf("1") >= 0,
      declined ? "a follow-up went when the question was answered no" : "it asked " + asked + " times for two presses, sent " + sent + ", and the request reads " + say(line));
    await d.waitToastGone(4000);
    await d.page.locator("[data-maint-follow-up]").click();
    await d.settle(600);
    const toast = (await d.toast()) || "";
    const words = lang === "es" ? "Ya se envi\u00f3 hoy un seguimiento de esta solicitud." : "A follow-up on this request already went today.";
    results.check(KIND, id("a-second-follow-up-that-day-is-refused-in-words"), toast.indexOf(words) >= 0, "the second follow-up said " + say(toast));
  });

  // From an issue: the form prefilled from the issue, the issue's photo picked, and the reference after.
  await withDriver(ctx, { name: "from-issue", lang, arm: (s) => s.setScene368({ issuePhotos: { "i-5": [{ id: "5a5a5a5a-0000-4000-8000-000000000005", url: "data:image/png;base64," + PNG.toString("base64") }] } }) }, async (d, stubs) => {
    await goHash(d, "issues/i-5");
    const offered = await until(d, "[data-issue-send-maintenance]", 6000);
    if (offered) await d.page.locator("[data-issue-send-maintenance]").click();
    const open = await until(d, "[data-maint-new]", 5000);
    const site = await textOf(d, '[data-maint-field="siteId"]');
    const area = open ? await d.page.locator('[data-maint-field="area"]').inputValue() : "";
    const words = open ? await d.page.locator('[data-maint-field="description"]').inputValue() : "";
    const to = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-maint-recipient]")).map((x) => x.getAttribute("data-maint-recipient")));
    const photoOn = open ? await d.page.locator('[data-maint-issue-photo="5a5a5a5a-0000-4000-8000-000000000005"]').isChecked().catch(() => false) : false;
    results.check(KIND, id("from-issue-opens-the-form-prefilled"), offered && open && site === seed.SITES[1].name && area === "Stairwell" && words.indexOf("Stair handrail sticky") === 0 && to.join(",") === "mc-4" && photoOn,
      !offered ? "the issue offers no Send to building maintenance" : !open ? "the button opened no form" : "the form reads site " + say(site) + ", area " + say(area) + ", " + say(words) + ", to " + say(to) + (photoOn ? "" : ", with the issue's photo not picked"));
    if (!open) return;
    await pickSelect(d, '[data-maint-field="category"]', "safety");
    await pickSelect(d, '[data-maint-field="urgency"]', "soon");
    const mark = d.mark();
    await d.page.locator("[data-maint-send]").click();
    await d.settle(700);
    const post = writes(d, mark, "POST", /^\/api\/maintenance-requests$/)[0];
    const b = post && post.body && typeof post.body === "object" ? post.body : {};
    const shown = await textOf(d, '[data-issue-maintenance-request="mr-8"]');
    results.check(KIND, id("from-issue-sends-the-issue-and-shows-the-reference"), b.issueId === "i-5" && Array.isArray(b.issuePhotoIds) && b.issuePhotoIds[0] === "5a5a5a5a-0000-4000-8000-000000000005" && shown.indexOf("MR-2026-0008") >= 0 && !(await has(d, "[data-issue-send-maintenance]")),
      "it sent " + say(b) + ", and the issue reads " + say(shown));
    // Opened again later, the issue reads the reference from GET /api/issues/:id.
    await goHash(d, "issues");
    await goHash(d, "issues/i-5");
    const again = await until(d, '[data-issue-maintenance-request="mr-8"]', 5000);
    results.check(KIND, id("the-issue-keeps-the-reference"), again && !(await has(d, "[data-issue-send-maintenance]")), "opened again, the issue does not name MR-2026-0008");
  });

  // A site's contacts: listed with the turned off one, added, edited (only what changed), turned off.
  await withDriver(ctx, { name: "contacts", lang }, async (d, stubs) => {
    await goHash(d, "sites/" + seed.SITES[0].id + "/maintenance");
    const tab = await until(d, '[data-site-maintenance="' + seed.SITES[0].id + '"] table tbody tr', 6000);
    const rows = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-maint-contact]")).map((x) => x.getAttribute("data-maint-contact")));
    const primary = await textOf(d, '[data-maint-contact="mc-1"]');
    const off = await textOf(d, '[data-site-maintenance] table tbody tr:nth-child(3)');
    results.check(KIND, id("site-lists-its-contacts"), tab && rows.join(",") === "mc-1,mc-2,mc-3" && primary.toLowerCase().indexOf(d.say("Primary").toLowerCase()) >= 0 && off.toLowerCase().indexOf(d.say("Turned off").toLowerCase()) >= 0,
      !tab ? "#sites/s-1/maintenance shows no contacts" : "the contacts read " + say(rows) + ", the first " + say(primary) + ", the third " + say(off));
    let mark = d.mark();
    await d.page.getByRole("button", { name: d.say("Add a contact") }).first().click();
    await until(d, '[data-maint-contact-window="new"]');
    await d.page.locator('[data-maint-contact-field="name"]').fill("Night engineer");
    await d.page.locator('[data-maint-contact-field="email"]').fill("night.engineer@example.invalid");
    await d.page.locator('[data-maint-contact-field="building"]').fill("South Wing");
    await d.page.locator("[data-maint-contact-save]").click();
    await d.settle(600);
    const added = writes(d, mark, "POST", /^\/api\/sites\/s-1\/maintenance-contacts$/);
    const ab = added[0] ? added[0].body : {};
    results.check(KIND, id("add-a-contact"), added.length === 1 && ab.name === "Night engineer" && ab.email === "night.engineer@example.invalid" && ab.building === "South Wing" && ab.isPrimary === false && (await has(d, '[data-maint-contact="mc-5"]')),
      added.length !== 1 ? added.length + " adds were sent" : "it sent " + say(ab));
    mark = d.mark();
    await d.page.locator('[data-maint-contact-edit="mc-2"]').click();
    await until(d, '[data-maint-contact-window="mc-2"]');
    await d.page.locator('[data-maint-contact-field="phone"]').fill("2155550199");
    await d.page.locator("[data-maint-contact-save]").click();
    await d.settle(600);
    const edited = writes(d, mark, "PATCH", /^\/api\/sites\/s-1\/maintenance-contacts\/mc-2$/);
    results.check(KIND, id("edit-sends-only-what-changed"), edited.length === 1 && say(edited[0].body) === say({ phone: "2155550199" }),
      edited.length !== 1 ? edited.length + " edits were sent" : "it sent " + say(edited[0].body));
    await d.setConfirmAnswer(true);
    mark = d.mark();
    await d.page.locator('[data-maint-contact-turn="mc-2"]').click();
    await d.settle(600);
    const turned = writes(d, mark, "PATCH", /^\/api\/sites\/s-1\/maintenance-contacts\/mc-2$/);
    const asked = (await d.confirms()).length;
    results.check(KIND, id("turn-off-asks-and-keeps-the-contact"), turned.length === 1 && say(turned[0].body) === say({ isActive: false }) && asked >= 1 && (await has(d, '[data-maint-contact="mc-2"]')),
      turned.length !== 1 ? turned.length + " turn offs were sent" : "it sent " + say(turned[0].body) + " after " + asked + " questions");
  });

  // A site's own requests on its tab.
  await withDriver(ctx, { name: "site-requests", lang }, async (d) => {
    const mark = d.mark();
    await goHash(d, "sites/" + seed.SITES[1].id + "/maintenance");
    await until(d, '[data-maint-list="' + seed.SITES[1].id + '"] table tbody tr', 6000);
    const list = reads(d, mark, /^\/api\/maintenance-requests$/).pop();
    const refs = await rowRefs(d);
    results.check(KIND, id("a-site-lists-its-own-requests"), !!list && q(list).get("siteId") === seed.SITES[1].id && refs.join(",") === "MR-2026-0003,MR-2026-0005",
      !list ? "the site's tab read no requests" : "it read " + say(list.query) + " and shows " + refs.join(", "));
  });

  // Settings: the business days before a reminder.
  await withDriver(ctx, { name: "settings", lang }, async (d, stubs) => {
    await goHash(d, "settings");
    const shown = await until(d, '[data-settings-field="maintenance_response_days"]', 6000);
    const value = shown ? await d.page.locator('[data-settings-field="maintenance_response_days"]').inputValue() : "";
    if (shown) await d.page.locator('[data-settings-field="maintenance_response_days"]').fill("0");
    let mark = d.mark();
    if (shown) await d.page.getByRole("button", { name: d.say("Save Company Settings") }).click();
    await d.settle(400);
    const refused = await textOf(d, '[data-settings-refusal="maintenance_response_days"]');
    const sent0 = writes(d, mark, "PATCH", /^\/api\/settings$/).length;
    if (shown) await d.page.locator('[data-settings-field="maintenance_response_days"]').fill("3");
    mark = d.mark();
    if (shown) await d.page.getByRole("button", { name: d.say("Save Company Settings") }).click();
    await d.settle(600);
    const sent = writes(d, mark, "PATCH", /^\/api\/settings$/)[0];
    results.check(KIND, id("settings-days-before-a-reminder"), shown && value === "2" && sent0 === 0 && refused === d.say("Type a whole number of business days from 1 to 30.") && !!sent && sent.body.maintenance_response_days === 3,
      !shown ? "Settings has no business days before a reminder" : "it read " + say(value) + ", 0 said " + say(refused) + (sent0 ? " and was sent" : "") + ", and 3 sent " + say(sent ? sent.body.maintenance_response_days : null));
  });

  // A notice opens the request's window, from the bell and from a phone alert.
  await withDriver(ctx, { name: "notices", lang, arm: (s) => s.addNotices([{ id: "n-368-1", title: "Maintenance request acknowledged", body: "MR-2026-0002 is acknowledged.", subjectType: "maintenance_status", subjectId: "mr-2", link: ctx.origin + "/#maintenance/mr-2" }]) }, async (d) => {
    await goHash(d, "overview");
    const bell = await openBellIn(d);
    const clicked = bell && await d.page.evaluate((label) => { const p = document.querySelector("div[role=dialog][aria-label=\"" + label + "\"]"); const b = p && Array.from(p.querySelectorAll("button")).find((x) => (x.innerText || "").indexOf("Maintenance request acknowledged") >= 0); if (b) b.click(); return !!b; }, d.say("Notifications"));
    const opened = clicked && await until(d, '[data-maint-window="mr-2"]', 5000);
    results.check(KIND, id("a-notice-opens-the-request-from-the-bell"), opened && (await hashNow(d)) === "#maintenance/mr-2",
      !clicked ? "the bell holds no maintenance notice" : "the notice left the page at " + (await hashNow(d)));
    await goHash(d, "overview");
    await d.page.evaluate((m) => { navigator.serviceWorker.dispatchEvent(new MessageEvent("message", { data: m })); }, { type: "ocsa-open", subjectType: "maintenance_no_response", subjectId: "mr-1", place: "maintenance/mr-1" });
    const alerted = await until(d, '[data-maint-window="mr-1"]', 5000);
    const sw = swPlaceOf()("maintenance_no_response", "mr-1");
    results.check(KIND, id("a-phone-alert-opens-the-request"), alerted && sw === "maintenance/mr-1",
      !alerted ? "a tapped alert left the page at " + (await hashNow(d)) : "the service worker opens #" + sw);
  });

  // Without file_maintenance_requests nothing is offered and the address says why.
  await withDriver(ctx, { name: "no-access", lang, persona: "supervisor", arm: (s) => s.setScene368({ off: { [seed.PEOPLE.supervisor.id]: ["file_maintenance_requests"] } }) }, async (d) => {
    const items = await navIds(d);
    await goHash(d, "maintenance");
    const words = await d.page.evaluate(() => document.body.innerText);
    results.check(KIND, id("without-the-capability-nothing-is-offered"), items.indexOf("maintenance") < 0 && words.indexOf(d.say("Maintenance requests open for the people who file them. Ask an admin for access.")) >= 0 && !(await has(d, "[data-maint-page]")),
      items.indexOf("maintenance") >= 0 ? "the side panel offers Maintenance requests" : "#maintenance does not say who it is for");
  });
}


// ---- Section 2: leave balances ------------------------------------------------------------------------
const leaveRows = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-leave-row]")).map((x) => x.getAttribute("data-leave-row")));
const leaveCall = (d, mark) => reads(d, mark, /^\/api\/leave\/balances$/).pop();
async function leaveCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/leave/" + x;

  // The side panel item under HR Records for an admin; a supervisor reads no balances and has none.
  await withDriver(ctx, { name: "leave-nav", lang }, async (d) => {
    const items = await navIds(d);
    const at = items.indexOf("leave");
    results.check(KIND, id("side-panel-item-under-hr-records"), at >= 0 && items[at - 1] === "hr",
      at < 0 ? "the side panel has no Leave balances item: " + items.join(", ") : "Leave balances follows " + items[at - 1] + " where HR Records is meant");
  });
  await withDriver(ctx, { name: "leave-nav-supervisor", lang, persona: "supervisor" }, async (d) => {
    const items = await navIds(d);
    results.check(KIND, id("guard-a-supervisor-has-no-leave-balances"), items.indexOf("leave") < 0, "the side panel offers a supervisor Leave balances: " + items.join(", "));
  });

  // The list: everyone's balances by kind for a year, and each filter sent with the list.
  await withDriver(ctx, { name: "leave-list", lang }, async (d) => {
    let mark = d.mark();
    await goHash(d, "leave");
    await until(d, "[data-leave-row]");
    const first = leaveCall(d, mark);
    const rows = await leaveRows(d);
    const chip = await textOf(d, '[data-leave-row="u-staff-7"]');
    const chips = await d.page.locator('tr:has([data-leave-row="u-staff-7"]) [data-leave-chip]').count();
    results.check(KIND, id("balances-by-kind-for-the-year"), !!first && q(first).get("year") === "2026" && q(first).has("cursor") && rows.length === 10 && chips === 2,
      !first ? "the page read no balances" : "it read " + say(first.query) + " and lists " + rows.length + " people, " + chips + " kinds for the clinic's day porter");
    const tries = [["site", seed.SITES[1].id, "siteId", ["u-staff-7", "u-staff-9"]], ["policy", "lp-2", "policyId", ["u-staff-7", "u-staff-9"]], ["role", "day_porter", "role", ["u-staff-7", "u-staff-10"]], ["status", "all", "status", null], ["year", "2025", "year", null]];
    const missed = [];
    for (const [f, v, key, want] of tries) {
      mark = d.mark();
      await pickSelect(d, '[data-leave-filter="' + f + '"]', v);
      await until(d, "[data-leave-row]", 3000);
      const c = leaveCall(d, mark);
      const got = await leaveRows(d);
      if (!c || q(c).get(key) !== v || !q(c).has("cursor") || (want && got.join(",") !== want.join(","))) missed.push(f + " sent " + (c ? c.query : "nothing") + " and shows " + got.join(","));
      await pickSelect(d, '[data-leave-filter="' + f + '"]', f === "status" ? "active" : f === "year" ? "2026" : "");
    }
    mark = d.mark();
    await d.page.locator('[data-leave-filter="q"]').fill("Okon");
    await d.page.locator('[data-leave-filter="q"]').press("Enter");
    await d.settle(400);
    const qc = leaveCall(d, mark);
    const found = await leaveRows(d);
    if (!qc || q(qc).get("q") !== "Okon" || found.join(",") !== "u-staff-6") missed.push("search sent " + (qc ? qc.query : "nothing") + " and shows " + found.join(","));
    results.check(KIND, id("each-filter-is-sent-with-the-list"), missed.length === 0, missed.join("; "));
  });

  // Show more until nextCursor is empty, the filters kept.
  await withDriver(ctx, { name: "leave-paging", lang, arm: (s) => s.setScene368({ leaveMany: true }) }, async (d) => {
    await goHash(d, "leave");
    await until(d, "[data-leave-row]");
    await pickSelect(d, '[data-leave-filter="site"]', seed.SITES[0].id);
    await until(d, "[data-leave-row]");
    const first = (await leaveRows(d)).length;
    const more = await has(d, "[data-leave-more]");
    const mark = d.mark();
    if (more) { await d.page.locator("[data-leave-more]").click(); await d.settle(500); }
    const next = leaveCall(d, mark);
    const all = await leaveRows(d);
    results.check(KIND, id("show-more-with-the-filters"), first === 50 && more && !!next && !!q(next).get("cursor") && q(next).get("siteId") === seed.SITES[0].id && all.length === 58 && new Set(all).size === 58 && !(await has(d, "[data-leave-more]")),
      !more ? "a first page of " + first + " offers no Show more" : !next ? "Show more read nothing" : "the next page was read with " + say(next.query) + ", and the list holds " + all.length);
  });

  // Download CSV sends the filters and format=csv, and saves the file the API names.
  await withDriver(ctx, { name: "leave-csv", lang }, async (d) => {
    await goHash(d, "leave");
    await until(d, "[data-leave-row]");
    await pickSelect(d, '[data-leave-filter="policy"]', "lp-2");
    const mark = d.mark();
    await d.page.locator("[data-leave-download]").click();
    await d.settle(600);
    const c = leaveCall(d, mark);
    const files = await d.downloads();
    const f = files.find((x) => /^leave-balances-2026\.csv$/.test(x.name));
    results.check(KIND, id("download-csv-with-the-filters"), !!c && q(c).get("format") === "csv" && q(c).get("policyId") === "lp-2" && !!f && /user_id,name,employee_id/.test(f.body || ""),
      !c ? "Download CSV read nothing" : "it read " + say(c.query) + " and saved " + say(files.map((x) => x.name)));
  });

  // A person's ledger: their policy and since when, the balances, and every row with who made it.
  await withDriver(ctx, { name: "leave-ledger", lang }, async (d) => {
    await goHash(d, "leave/balances/u-staff-7");
    const open = await until(d, '[data-leave-person="u-staff-7"] [data-leave-ledger] tbody tr', 6000);
    const policy = await textOf(d, "[data-leave-person-policy]");
    const pto = await textOf(d, '[data-leave-balance="pto"]');
    const kinds = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-leave-entry]")).map((x) => x.getAttribute("data-leave-entry")));
    const fileLine = await textOf(d, '[data-leave-entry="accrual"]');
    results.check(KIND, id("a-person-opens-their-ledger"), open && policy.indexOf("Clinic service agreement") >= 0 && policy.indexOf(d.say("Their site's policy")) >= 0 && pto.indexOf("5") === 0 && kinds.join(",") === "accrual,grant" && fileLine.indexOf("hours-february.csv") >= 0,
      !open ? "#leave/balances/u-staff-7 opened no ledger" : "the policy reads " + say(policy) + ", PTO " + say(pto) + ", the rows " + say(kinds));
  });

  // Adjust: the reason is asked for, it asks once, and it sends a clientId.
  await withDriver(ctx, { name: "leave-adjust", lang }, async (d, stubs) => {
    await goHash(d, "leave/balances/u-staff-6");
    await until(d, "[data-leave-adjust-open]", 6000);
    await d.page.locator("[data-leave-adjust-open]").click();
    await until(d, "[data-leave-adjust-form]");
    await d.page.locator('[data-leave-adjust="hours"]').fill("-2");
    let mark = d.mark();
    await d.page.locator("[data-leave-adjust-save]").click();
    await d.settle(300);
    const noReason = writes(d, mark, "POST", /\/adjustments$/).length;
    const said = await textOf(d, "[data-leave-adjust-refusal]");
    await d.page.locator('[data-leave-adjust="reason"]').fill("Two hours used before the app kept leave");
    await d.setConfirmAnswer(true);
    mark = d.mark();
    await d.page.locator("[data-leave-adjust-save]").dblclick();
    await d.settle(700);
    const posts = writes(d, mark, "POST", /^\/api\/leave\/people\/u-staff-6\/adjustments$/);
    const b = posts[0] ? posts[0].body : {};
    const asked = (await d.confirms()).length;
    const bal = await textOf(d, '[data-leave-balance="paid_sick"]');
    results.check(KIND, id("adjust-needs-a-reason"), noReason === 0 && said === d.say("Say why the balance changes."), noReason ? "an adjustment with no reason was sent" : "with no reason it said " + say(said));
    results.check(KIND, id("adjust-asks-once-and-sends-once"), posts.length === 1 && asked === 1 && b.kind === "paid_sick" && b.hours === -2 && b.reason === "Two hours used before the app kept leave" && /^[A-Za-z0-9_-]{8,64}$/.test(String(b.clientId || "")) && bal.indexOf("6") === 0,
      "it asked " + asked + " times and sent " + posts.length + ": " + say(b) + "; the balance reads " + say(bal));
  });

  // Without manage_leave_balances the balances still read, and nothing is offered to change them.
  await withDriver(ctx, { name: "leave-read-only", lang, arm: (s) => s.setScene368({ off: { [seed.PEOPLE.admin.id]: ["manage_leave_balances"] } }) }, async (d) => {
    await goHash(d, "leave");
    await until(d, "[data-leave-row]");
    const tabs = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-leave-page] button")).map((b) => (b.innerText || "").trim()));
    await goHash(d, "leave/balances/u-staff-6");
    await until(d, "[data-leave-person]", 6000);
    const adjust = await has(d, "[data-leave-adjust-open]");
    await goHash(d, "leave/policies");
    await until(d, "[data-leave-policy-card]");
    const add = await has(d, "[data-leave-policy-new]");
    results.check(KIND, id("without-manage-nothing-changes-a-balance"), (await has(d, "[data-leave-page]")) && !adjust && !add && tabs.indexOf(d.say("Enter starting balances")) < 0,
      adjust ? "Adjust is offered" : add ? "New leave policy is offered" : "the tabs read " + say(tabs));
  });

  // Policies: the handbook's is read only; a policy names its sites and people; an edit sends what changed.
  await withDriver(ctx, { name: "leave-policies", lang }, async (d, stubs) => {
    await goHash(d, "leave/policies");
    await until(d, "[data-leave-policy-card]");
    const cards = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-leave-policy-card]")).map((x) => x.getAttribute("data-leave-policy-card")));
    await d.page.locator('[data-leave-policy-card="lp-1"]').click();
    await until(d, '[data-leave-policy="lp-1"] [data-leave-policy-summary]');
    const ro = (await has(d, "[data-leave-policy-read-only]")) && !(await has(d, "[data-leave-policy-edit]"));
    await d.page.keyboard.press("Escape");
    await d.page.locator('[data-leave-policy="lp-1"]').locator("xpath=ancestor::div[contains(@style,'z-index: 500')]").first().click({ position: { x: 4, y: 4 } }).catch(() => {});
    await d.settle(300);
    await d.page.locator('[data-leave-policy-card="lp-2"]').click();
    await until(d, '[data-leave-policy="lp-2"] [data-leave-policy-people] button');
    const sites = await textOf(d, "[data-leave-policy-sites]");
    const people = await textOf(d, "[data-leave-policy-people]");
    results.check(KIND, id("policies-list-and-read-only-handbook"), cards.join(",") === "lp-1,lp-2" && ro && sites.indexOf(seed.SITES[1].name) >= 0 && people.indexOf("Elena Barbosa") >= 0 && people.indexOf("Yuki Tanabe") >= 0,
      "the cards read " + say(cards) + (ro ? "" : ", the handbook's policy offers Edit") + ", its sites " + say(sites) + ", its people " + say(people));
    await d.page.locator("[data-leave-policy-edit]").click();
    await until(d, '[data-leave-policy-editor="lp-2"]');
    await d.page.locator('[data-leave-editor-rule="0"] [data-leave-rule="maxBalance"]').fill("48");
    const mark = d.mark();
    await d.page.locator("[data-leave-editor-save]").click();
    await d.settle(600);
    const patch = writes(d, mark, "PATCH", /^\/api\/leave\/policies\/lp-2$/)[0];
    const keys = patch ? Object.keys(patch.body) : [];
    const r0 = patch && patch.body.rules ? patch.body.rules[0] : {};
    results.check(KIND, id("a-policy-edit-sends-what-changed"), keys.join(",") === "rules" && r0.maxBalance === 48 && r0.method === "per_hours_worked" && r0.perHoursWorked === 30 && patch.body.rules.length === 2,
      !patch ? "Save sent no change" : "it sent " + say(patch.body).slice(0, 300));
  });

  // New leave policy, with a kind of the policy's own.
  await withDriver(ctx, { name: "leave-new-policy", lang }, async (d) => {
    await goHash(d, "leave/policies");
    await until(d, "[data-leave-policy-new]");
    await d.page.locator("[data-leave-policy-new]").click();
    await until(d, '[data-leave-policy-editor="new"]');
    await d.page.locator('[data-leave-editor="name"]').fill("Union sick leave");
    await pickSelect(d, '[data-leave-editor-rule="0"] [data-leave-rule="kind"]', "__new");
    await d.page.locator('[data-leave-editor-rule="0"] [data-leave-rule="newKind"]').fill("union_sick");
    await d.page.locator('[data-leave-editor-rule="0"] [data-leave-rule="kindName"]').fill("Union sick");
    await pickSelect(d, '[data-leave-editor-rule="0"] [data-leave-rule="method"]', "monthly");
    await d.page.locator('[data-leave-editor-rule="0"] [data-leave-rule="amount"]').fill("4");
    const mark = d.mark();
    await d.page.locator("[data-leave-editor-save]").click();
    await d.settle(700);
    const post = writes(d, mark, "POST", /^\/api\/leave\/policies$/)[0];
    const r0 = post && post.body.rules ? post.body.rules[0] : {};
    const listed = await has(d, '[data-leave-policy-card="lp-3"]');
    results.check(KIND, id("new-policy-with-its-own-kind"), !!post && post.body.name === "Union sick leave" && r0.kind === "union_sick" && r0.kindName === "Union sick" && r0.method === "monthly" && r0.amount === 4 && listed,
      !post ? "Save sent nothing" : "it sent " + say(post.body).slice(0, 300) + (listed ? "" : ", and the list does not hold it"));
  });

  // Who follows which: a site's default on the Sites tab and on its page, a person's own on the HR folder.
  await withDriver(ctx, { name: "leave-who-follows", lang }, async (d) => {
    await goHash(d, "leave/sites");
    await until(d, "[data-leave-site-row]");
    await d.page.locator('[data-leave-site-set="' + seed.SITES[2].id + '"]').click();
    await until(d, '[data-leave-policy-set="site"]');
    await pickSelect(d, '[data-leave-policy-set="site"] [data-leave-policy-field="policyId"]', "lp-2");
    await d.page.locator('[data-leave-policy-set="site"] [data-leave-policy-field="effectiveFrom"]').fill("2026-04-01");
    let mark = d.mark();
    await d.page.locator('[data-leave-policy-set="site"] [data-leave-policy-save]').click();
    await d.settle(600);
    const sp = writes(d, mark, "POST", new RegExp("^/api/leave/sites/" + seed.SITES[2].id + "/policy$"))[0];
    results.check(KIND, id("set-a-site-s-policy"), !!sp && sp.body.policyId === "lp-2" && sp.body.effectiveFrom === "2026-04-01",
      !sp ? "Save sent nothing" : "it sent " + say(sp.body));
    await goHash(d, "sites/" + seed.SITES[1].id);
    const card = await until(d, '[data-site-leave-policy="' + seed.SITES[1].id + '"]', 6000);
    const line = await textOf(d, '[data-site-leave-policy="' + seed.SITES[1].id + '"]');
    results.check(KIND, id("a-site-page-shows-its-policy"), card && line.indexOf("Clinic service agreement") >= 0, card ? "the site's card reads " + say(line) : "the site's General Info shows no leave policy");
    await goHash(d, "hr/u-staff-5");
    const folder = await until(d, "[data-folder-leave]", 8000);
    const fl = await textOf(d, "[data-folder-leave-policy]");
    if (folder) { await d.page.locator("[data-folder-leave-open]").click(); await until(d, '[data-leave-person="u-staff-5"] [data-leave-person-policy-open]', 5000); }
    if (await has(d, "[data-leave-person-policy-open]")) {
      await d.page.locator("[data-leave-person-policy-open]").click();
      await until(d, '[data-leave-policy-set="person"]');
      await pickSelect(d, '[data-leave-policy-set="person"] [data-leave-policy-field="policyId"]', "lp-2");
      await d.page.locator('[data-leave-policy-set="person"] [data-leave-policy-field="effectiveFrom"]').fill("2026-03-17");
    }
    mark = d.mark();
    if (await has(d, '[data-leave-policy-set="person"] [data-leave-policy-save]')) await d.page.locator('[data-leave-policy-set="person"] [data-leave-policy-save]').click();
    await d.settle(700);
    const pp = writes(d, mark, "POST", /^\/api\/leave\/people\/u-staff-5\/policy$/)[0];
    const after = await textOf(d, "[data-leave-person-policy]");
    results.check(KIND, id("the-hr-folder-shows-and-sets-a-person-s-policy"), folder && fl.indexOf(d.say("The company default")) >= 0 && !!pp && pp.body.policyId === "lp-2" && pp.body.effectiveFrom === "2026-03-17" && after.indexOf("Clinic service agreement") >= 0,
      !folder ? "the HR folder shows no leave" : "the folder reads " + say(fl) + "; it sent " + say(pp ? pp.body : null) + "; after, " + say(after));
  });

  // Hours files: the list, a file that cannot be read, a person the API cannot match, then the posting.
  await withDriver(ctx, { name: "leave-hours", lang }, async (d) => {
    await goHash(d, "leave/hours");
    const listed = await until(d, '[data-leave-file-row="hf-1"]');
    await d.page.locator("[data-leave-file-upload]").click();
    await until(d, "[data-leave-hours-window]");
    const choose = async (name, text) => { await d.page.locator('[data-leave-hours-window] input[type="file"]').setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text, "utf8") }); await d.settle(300); };
    await choose("bad.csv", "person,period_start,period_end,hours\n4118,2026-03-14,2026-03-01,90\n");
    const localBad = await has(d, '[data-leave-file-problem="2"]');
    const blocked = await d.page.locator("[data-leave-file-post]").isDisabled();
    await choose("unknown.csv", "person,period_start,period_end,hours\n4118,2026-03-01,2026-03-14,90\n7777,2026-03-01,2026-03-14,40\n");
    let mark = d.mark();
    await d.page.locator("[data-leave-file-post]").click();
    await d.settle(600);
    const refused = writes(d, mark, "POST", /^\/api\/leave\/hours-files$/).length;
    const words = await textOf(d, '[data-leave-file-problem="3"]');
    const want = lang === "es" ? "Nadie tiene el n\u00famero de credencial o el ID de empleado 7777." : "No one has the badge number or employee ID 7777.";
    results.check(KIND, id("a-file-that-cannot-be-read-or-matched-posts-nothing"), listed && localBad && blocked && refused === 1 && words === want,
      !localBad ? "a reversed period is not said" : !blocked ? "Post is offered for a file with a line that cannot be read" : "the API's refusal reads " + say(words));
    await choose("march.csv", "person,period_start,period_end,hours\n4118,2026-03-01,2026-03-14,90\n");
    mark = d.mark();
    await d.page.locator("[data-leave-file-post]").click();
    await d.settle(600);
    const post = writes(d, mark, "POST", /^\/api\/leave\/hours-files$/)[0];
    const outcome = await d.page.locator("[data-leave-file-outcome]").first().getAttribute("data-leave-file-outcome").catch(() => "");
    results.check(KIND, id("an-hours-file-posts-and-says-what-posted"), !!post && post.body.fileName === "march.csv" && /4118/.test(post.body.csv) && outcome === "posted",
      !post ? "Post sent nothing" : "the outcome reads " + say(outcome));
  });

  // Missing hire dates, each with a way to the profile.
  await withDriver(ctx, { name: "leave-missing", lang }, async (d) => {
    await goHash(d, "leave/missing");
    const row = await until(d, '[data-leave-missing="u-staff-10"]');
    const text = await textOf(d, '[data-leave-tab="missing"] table tbody tr');
    if (row) await d.page.locator('[data-leave-missing-open="u-staff-10"]').click();
    await d.settle(500);
    const at = await hashNow(d);
    results.check(KIND, id("missing-hire-dates-link-to-the-profile"), row && text.indexOf(d.say("Paid sick leave")) >= 0 && at.indexOf("#staff/u-staff-10") === 0,
      !row ? "the tab lists nobody" : "it reads " + say(text) + " and opened " + at);
  });

  // Enter starting balances: one adjustment per filled box, the difference, Starting balance and a
  // clientId; a box already at its balance posts nothing; a retry after a failure posts once.
  await withDriver(ctx, { name: "leave-starting", lang, arm: (s) => s.setRefusal([{ method: "POST", path: "/api/leave/people/u-staff-9/adjustments", status: 503, code: "common.serverError", error: "Service unavailable", once: true }]) }, async (d) => {
    await goHash(d, "leave/starting");
    await until(d, '[data-leave-start-box="u-staff-6"]', 6000);
    await d.page.locator('[data-leave-start-box="u-staff-6"]').fill("10");
    await d.page.locator('[data-leave-start-box="u-staff-5"]').fill("32");
    await d.page.locator('[data-leave-start-box="u-staff-9"]').fill("12");
    let mark = d.mark();
    await d.page.locator("[data-leave-start-save]").click();
    await d.settle(900);
    const first = writes(d, mark, "POST", /\/adjustments$/);
    const states = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-leave-start-result]")).map((x) => x.closest("tr").querySelector("[data-leave-start-box]").getAttribute("data-leave-start-box") + ":" + x.getAttribute("data-leave-start-result")));
    const six = first.find((c) => /u-staff-6/.test(c.path));
    results.check(KIND, id("starting-balances-post-the-difference"), first.length === 2 && !!six && six.body.hours === 2 && six.body.kind === "paid_sick" && six.body.reason === "Starting balance" && /^[A-Za-z0-9_-]{8,64}$/.test(String(six.body.clientId || "")) && states.indexOf("u-staff-5:same") >= 0 && states.indexOf("u-staff-6:posted") >= 0 && states.indexOf("u-staff-9:refused") >= 0,
      "it sent " + first.length + " (" + first.map((c) => c.path.split("/")[4] + " " + say(c.body)).join("; ") + ") and reads " + say(states));
    const firstId = (first.find((c) => /u-staff-9/.test(c.path)) || { body: {} }).body.clientId;
    mark = d.mark();
    await d.page.locator("[data-leave-start-save]").click();
    await d.settle(900);
    const again = writes(d, mark, "POST", /\/adjustments$/);
    const nine = again.find((c) => /u-staff-9/.test(c.path));
    results.check(KIND, id("a-retry-sends-the-same-client-id"), again.length === 1 && !!nine && nine.body.clientId === firstId,
      "the second Save sent " + again.length + " (" + again.map((c) => c.path.split("/")[4]).join(", ") + ")" + (nine ? ", with clientId " + nine.body.clientId + " after " + firstId : ""));
  });

  // The time off window: the balance before and after, the API's warnings above Approve, the hours taken
  // on approval, and Take back approval, asked once and never on one's own request.
  await withDriver(ctx, { name: "leave-time-off", lang }, async (d) => {
    await goHash(d, "schedule/timeoff/to-368");
    await until(d, '[data-time-off-window="to-368"] [data-time-off-balance]', 6000);
    const line = await textOf(d, "[data-time-off-balance]");
    const warn = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-time-off-warning]")).map((x) => x.getAttribute("data-time-off-warning")));
    const above = await d.page.evaluate(() => { const w = document.querySelector("[data-time-off-warning]"); const a = document.querySelector("[data-time-off-approve]"); return !!(w && a && (w.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)); });
    results.check(KIND, id("balance-before-and-after-and-the-warning"), line.indexOf("8") >= 0 && line.indexOf("-8") >= 0 && line.indexOf("16") >= 0 && warn.join(",") === "leave.warning.belowZero" && above,
      "the balance reads " + say(line) + ", the warnings " + say(warn) + (above ? "" : ", and none sits above Approve"));
    await goHash(d, "schedule/timeoff/to-370");
    await until(d, '[data-time-off-window="to-370"] [data-time-off-approve="read"]', 6000);
    const wait = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-time-off-warning]")).map((x) => x.getAttribute("data-time-off-warning")));
    await d.page.locator('[data-time-off-approve="read"]').click();
    await d.settle(700);
    const taken = await textOf(d, "[data-time-off-balance]");
    results.check(KIND, id("waiting-period-warning-and-the-hours-taken"), wait.join(",") === "leave.warning.inWaitingPeriod" && taken.indexOf("32") >= 0,
      "the warnings read " + say(wait) + "; after Approve the balance reads " + say(taken));
    await goHash(d, "schedule/timeoff/to-369");
    const offered = await until(d, "[data-time-off-rescind]", 6000);
    await d.setConfirmAnswer(true);
    const mark = d.mark();
    if (offered) await d.page.locator("[data-time-off-rescind]").click();
    await d.settle(700);
    const sent = writes(d, mark, "POST", /^\/api\/time-off\/to-369\/rescind$/).length;
    const asked = (await d.confirms()).filter((c) => String(c).indexOf("8") >= 0).length;
    const toast = (await d.toast()) || "";
    const back = await has(d, "[data-time-off-taken-back]");
    results.check(KIND, id("take-back-approval-asks-once-and-says-the-hours"), offered && sent === 1 && asked === 1 && toast.indexOf("8") >= 0 && back && !(await has(d, "[data-time-off-rescind]")),
      !offered ? "an approved request offers no Take back approval" : "it asked " + asked + " times, sent " + sent + ", said " + say(toast) + (back ? "" : ", and the window does not say it was taken back"));
  });
  await withDriver(ctx, { name: "leave-own-request", lang }, async (d) => {
    await goHash(d, "schedule/timeoff/to-371");
    await until(d, '[data-time-off-window="to-371"]', 6000);
    await d.settle(400);
    results.check(KIND, id("guard-never-on-one-s-own-request"), !(await has(d, "[data-time-off-rescind]")), "the admin's own approved request offers Take back approval");
  });
}

// ---- Checklist Results on Round 5's reads, and the session renewed (section 3) ---------------------------
const S1 = seed.SITES[0].id;
const COUNTED = ["per_visit", "daily", "every_other_day"];
// What the page should draw for a site's day, grouped by each item's own shift: Day, Night, and Any shift.
function crExpected(M, siteId, day) {
  const rec = M.record(siteId, day, day, null, "en");
  const out = {};
  rec.days[0].items.forEach((i) => {
    const k = i.shift || "*";
    if (!out[k]) out[k] = { due: 0, done: 0, checks: 0 };
    if (COUNTED.indexOf(i.frequency) >= 0 && i.due) { out[k].due += 1; if (i.done) out[k].done += 1; }
    out[k].checks += i.checks.length;
  });
  return out;
}
const crGroups = (d) => d.page.evaluate(() => { const o = {}; document.querySelectorAll("[data-cr-group]").forEach((el) => { o[el.getAttribute("data-cr-group")] = { due: Number(el.getAttribute("data-cr-due")), done: Number(el.getAttribute("data-cr-done")), checks: Number(el.getAttribute("data-cr-checks")), last30: (el.querySelector("[data-cr-last30]") || { getAttribute: () => null }).getAttribute("data-cr-last30") }; }); return o; });
const crView = (d, view) => until(d, '[data-checklist-results][data-cr-view="' + view + '"]', 10000);
const recordReads = (d, mark) => reads(d, mark, /\/checklist-record$/);
const summaryReads = (d, mark) => reads(d, mark, /^\/api\/reports\/checklist-summary$/);

async function checklistCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/checklist/" + x;
  const arm = (stubs) => stubs.setChecklist358(true);

  await withDriver(ctx, { name: "checklist-reads", lang, arm }, async (d, stubs) => {
    const M = stubs.checklist358();
    // One site, one day: one read of the record, with no shift, and the same rings as before.
    let mark = d.mark();
    await goHash(d, "checklist/" + S1 + "/" + M.SEEDED);
    await crView(d, "day");
    await d.settle(500);
    const dayReads = recordReads(d, mark);
    const got = await crGroups(d), want = crExpected(M, S1, M.SEEDED);
    const off = Object.keys(want).filter((k) => !got[k] || got[k].due !== want[k].due || got[k].done !== want[k].done || got[k].checks !== want[k].checks);
    results.check(KIND, id("one-record-read-for-a-day"), dayReads.length === 1 && !q(dayReads[0]).has("shift") && off.length === 0 && Object.keys(got).sort().join() === Object.keys(want).sort().join(),
      dayReads.length !== 1 ? "the day read the record " + dayReads.length + " times: " + say(dayReads.map((c) => c.query)) : off.length ? "the rings read " + say(got) + " where they are " + say(want) : "the groups drawn are " + Object.keys(got).join(", "));
    // A range: one read too.
    mark = d.mark();
    await goHash(d, "checklist/" + S1 + "/" + seed.shift(-7) + ".." + M.SEEDED);
    await crView(d, "range");
    await d.settle(500);
    const rangeReads = recordReads(d, mark);
    results.check(KIND, id("one-record-read-for-a-range"), rangeReads.length === 1 && !q(rangeReads[0]).has("shift"),
      "the range read the record " + rangeReads.length + " times: " + say(rangeReads.map((c) => c.query)));

    // All sites: one call to the summary in place of each site's record, and the cards counted its way.
    // Counted from a page that reads nothing on its own, so every call is All sites' own.
    await d.page.evaluate(() => { window.location.hash = "checklist/" + "none"; });
    await d.settle(1500);
    mark = d.mark();
    await d.page.evaluate(() => { window.location.hash = "checklist/all/yesterday"; });
    await crView(d, "all");
    await d.settle(800);
    const calls = d.callsSince(mark).filter((c) => /^\/api\//.test(c.path) && !/^\/api\/(notifications|chat)/.test(c.path));
    const sums = summaryReads(d, mark), recs = recordReads(d, mark);
    const cards = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-site-card]")).map((el) => [el.getAttribute("data-cr-site-card"), el.getAttribute("data-cr-done") + "/" + el.getAttribute("data-cr-due")]));
    const want1 = M.summaryDay(S1, M.SEEDED), want2 = M.summaryDay(seed.SITES[1].id, M.SEEDED);
    const cardOk = cards.length === 3 && cards[0][1] === want1.done + "/" + want1.due && cards[1][1] === want2.done + "/" + want2.due;
    results.check(KIND, id("all-sites-in-one-call"), sums.length === 1 && recs.length === 0 && q(sums[0]).get("from") === seed.shift(-7) && q(sums[0]).get("to") === M.SEEDED && cardOk,
      "All sites made " + calls.length + " calls (" + calls.map((c) => c.method + " " + c.path + (c.query ? "?" + String(c.query).replace(/^\?/, "") : "")).join("; ") + ") and draws " + say(cards) + " where the summary counts " + want1.done + "/" + want1.due + " and " + want2.done + "/" + want2.due);
    // Today on All sites is read again within 32 seconds, from the summary.
    await goHash(d, "checklist/all/today");
    await crView(d, "all");
    mark = d.mark();
    await wait(32000);
    const again = summaryReads(d, mark), againRecs = recordReads(d, mark);
    results.check(KIND, id("all-sites-today-read-again-from-the-summary"), again.length >= 1 && againRecs.length === 0,
      "in 32 seconds All sites read the summary " + again.length + " times and the record " + againRecs.length + " times");

    // Repeating work as of the day shown, with no "as of today".
    const back = seed.shift(-7);
    mark = d.mark();
    await goHash(d, "checklist/" + S1 + "/" + back);
    await crView(d, "day");
    await d.settle(500);
    const pw = reads(d, mark, /^\/api\/periodic-work$/);
    const asked = stubs.handle({ method: "GET", url: "http://stub.invalid/api/periodic-work?siteId=" + S1 + "&on=" + back + "&locale=" + lang, headers: { authorization: "Bearer x", "accept-language": lang }, lang }).json.items.find((i) => i.taskId === "cr-p1");
    const row = await d.page.evaluate(() => { const el = document.querySelector('[data-cr-repeating="cr-p1"]'); return el ? { last: el.getAttribute("data-cr-last-done"), dueBy: el.getAttribute("data-cr-due-by") } : null; });
    const page = await d.page.evaluate(() => document.body.innerText);
    const oldNote = lang === "es" ? "son a hoy" : "are as of today";
    results.check(KIND, id("repeating-work-as-of-the-day-shown"), pw.length === 1 && q(pw[0]).get("on") === back && !!row && row.last === asked.lastDoneAt && row.dueBy === asked.dueBy
      && page.indexOf(d.say("Weekly, monthly, quarterly and seasonal tasks.")) >= 0 && page.indexOf(oldNote) < 0,
      !pw.length ? "the day read no periodic work" : "periodic work was read with " + say(pw[0].query) + "; the weekly task reads last done " + (row && row.last) + " and due by " + (row && row.dueBy)
        + " where on " + back + " they are " + asked.lastDoneAt + " and " + asked.dueBy + "; the note " + (page.indexOf(oldNote) >= 0 ? "still says as of today" : "names no day"));
  });

  // A shift's window is the schedule's: a last block with no end of its own ends at its start.
  await withDriver(ctx, { name: "checklist-window", lang, arm: (stubs) => { arm(stubs); stubs.setChecklistScene358({ lateBlock: true }); } }, async (d, stubs) => {
    const M = stubs.checklist358();
    await goHash(d, "checklist/" + S1 + "/" + M.SEEDED);
    await crView(d, "day");
    await d.settle(600);
    const got = await crGroups(d);
    results.check(KIND, id("shift-window-from-the-schedule"), !!got.Night && got.Night.last30 === "4/4" && !!got.Day && got.Day.last30 === "0/10",
      "the last-30-minutes lines read Day " + (got.Day && got.Day.last30) + " and Night " + (got.Night && got.Night.last30) + " where the schedule ends Night at 10:00 PM (4/4) and Day at 4:00 PM (0/10)");
  });

  // Today starts at the company's checklist day start: at 9:30 PM with the day starting at 10:00 PM,
  // today is still yesterday's checklist day.
  await withDriver(ctx, { name: "checklist-day-start", lang, arm: (stubs) => { arm(stubs); stubs.setDayStarts358("22:00"); } }, async (d, stubs) => {
    const M = stubs.checklist358();
    const mark = d.mark();
    await goHash(d, "checklist/" + S1 + "/today");
    await crView(d, "day");
    await d.settle(500);
    const rr = recordReads(d, mark), st = reads(d, mark, /^\/api\/settings$/);
    results.check(KIND, id("today-starts-at-the-company-s-time"), rr.length >= 1 && q(rr[0]).get("from") === M.SEEDED && q(rr[0]).get("to") === M.SEEDED && st.length === 1,
      !rr.length ? "today read no record" : "today read the record from " + q(rr[0]).get("from") + " to " + q(rr[0]).get("to") + " where the checklist day starting at 10:00 PM makes it " + M.SEEDED + "; settings read " + st.length + " times");
  });
}

async function sessionCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/session/" + x;
  const stored = (d) => d.page.evaluate(() => { try { const x = JSON.parse(localStorage.getItem("ocsa_auth") || sessionStorage.getItem("ocsa_auth") || "null"); return x && x.token; } catch (e) { return null; } });
  const bearer = (c) => String((c.headers && (c.headers.authorization || c.headers.Authorization)) || "").replace(/^Bearer /, "");

  // A token two hours old is renewed at the first key typed, and the screen keeps what was typed.
  await withDriver(ctx, { name: "renew", lang, arm: (stubs) => { stubs.setChecklist358(true); stubs.setScene368({ oldToken: true }); } }, async (d, stubs) => {
    const M = stubs.checklist358();
    const first = await stored(d);
    await goHash(d, "checklist/" + S1 + "/" + M.SEEDED);
    await crView(d, "day");
    const mark = d.mark();
    const word = lang === "es" ? "toallas" : "towels";
    await d.page.locator("[data-cr-search]").first().pressSequentially(word, { delay: 30 }).catch(() => {});
    await d.settle(1200);
    const renews = writes(d, mark, "POST", /^\/api\/auth\/renew$/);
    const now = await stored(d);
    const typed = await d.page.locator("[data-cr-search]").first().inputValue().catch(() => "");
    const rows = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-task]")).map((r) => r.getAttribute("data-cr-task")));
    const m2 = d.mark();
    await goHash(d, "checklist/all/yesterday");
    await crView(d, "all");
    const after = d.callsSince(m2).filter((c) => /^\/api\//.test(c.path));
    const renewed = stubs.model368().renewed;
    results.check(KIND, id("a-token-an-hour-old-is-renewed-while-in-use"), renews.length === 1 && bearer(renews[0]) === first && renewed.length === 1 && now === renewed[0]
      && typed === word && rows.join() === "cr-d5" && after.length > 0 && after.every((c) => bearer(c) === renewed[0]),
      "typing sent " + renews.length + " renewal(s)" + (renews.length ? (bearer(renews[0]) === first ? " with the first token" : " with another token") : "")
        + "; the session keeps " + (now && now === renewed[0] ? "the renewed token" : now === first ? "the first token" : "another token") + "; the search reads " + say(typed) + " listing " + say(rows)
        + "; " + after.filter((c) => bearer(c) === renewed[0]).length + " of " + after.length + " later calls went with the renewed token");
  });

  // A renewal the API refuses ends the session in its words.
  await withDriver(ctx, { name: "renew-refused", lang, arm: (stubs) => stubs.setScene368({ oldToken: true, renewRefuse: true }) }, async (d) => {
    await d.page.mouse.click(600, 300).catch(() => {});
    await d.settle(1500);
    const card = await d.page.evaluate(() => document.body.innerText);
    const words = lang === "es" ? "Su sesi\u00f3n venci\u00f3" : "Token expired";
    results.check(KIND, id("a-refused-renewal-signs-out-in-the-api-s-words"), card.indexOf(words) >= 0 && (await d.page.locator("input[type=password]").count()) > 0,
      "after a refused renewal the screen reads " + say(card.slice(0, 160)));
  });

  // A token the API made just now is not renewed.
  await withDriver(ctx, { name: "renew-young", lang }, async (d) => {
    const mark = d.mark();
    await d.page.mouse.click(600, 300).catch(() => {});
    await d.page.keyboard.press("Shift").catch(() => {});
    await d.settle(1000);
    const n = writes(d, mark, "POST", /^\/api\/auth\/renew$/).length;
    results.check(KIND, id("guard-a-token-not-yet-an-hour-old-is-kept"), n === 0, "a click and a key sent " + n + " renewal(s) of a token not yet an hour old");
  });
}

// ---- What Round 6 built (section 4) ----------------------------------------------------------------------
// The cursor the stub hands out after a page: base64url of [list, offset].
const cursorAt = (list, offset) => Buffer.from(JSON.stringify([list, offset])).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// One list read a page at a time: its first read sends cursor empty and no limit, Show more sends the
// next cursor with the same filters, and Show more goes once the last page is read.
async function pagedCheck(d, results, id, o) {
  const mark = d.mark();
  await o.open();
  await d.settle(900);
  // The first page as last read, once the filters are picked.
  const first = reads(d, mark, o.path).filter((c) => q(c).has("cursor") && q(c).get("cursor") === "").slice(-1);
  const plain = reads(d, mark, o.path).filter((c) => !q(c).has("cursor") && !q(c).has("limit") && !(o.otherRead && o.otherRead.test(String(c.query || ""))));
  const btn = '[data-show-more="' + o.at + '"]';
  const offered = await has(d, btn);
  const m2 = d.mark();
  if (offered) { await d.page.locator(btn).first().click().catch(() => {}); await d.settle(900); }
  const second = reads(d, m2, o.path);
  const gone = !(await has(d, btn));
  const f0 = first[0] ? q(first[0]) : null, f1 = second[0] ? q(second[0]) : null;
  const sameFilters = !!f0 && !!f1 && Object.keys(o.filters || {}).every((k) => f0.get(k) === o.filters[k] && f1.get(k) === o.filters[k]);
  const ok = !!f0 && f0.get("cursor") === "" && !f0.has("limit") && plain.length === 0 && offered && !!f1 && f1.get("cursor") === cursorAt(o.list, 50) && sameFilters && gone;
  results.check(KIND, id, ok,
    !f0 ? "the list was read with no cursor: " + say(reads(d, mark, o.path).map((c) => c.query)) : f0.has("limit") ? "the first page sent limit" : !offered ? "no Show more under a list of 70" : !f1 ? "Show more read nothing"
      : "the pages were read with " + say([first[0].query, second[0].query]) + (sameFilters ? "" : " where the filters " + say(o.filters) + " are meant on both") + (gone ? "" : "; Show more stayed after the last page"));
}

async function round6Cases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/round6/" + x;

  // Paging: each list longer than one page.
  await withDriver(ctx, { name: "paging", lang, arm: (stubs) => stubs.setScene368({ listsMany: true }) }, async (d) => {
    await pagedCheck(d, results, id("paging/cases"), { path: /^\/api\/hr-cases$/, list: "hr_cases", at: "cases", filters: { status: "open" },
      open: async () => { await goHash(d, "cases"); await d.settle(400); await d.page.getByText(d.say("Open|case"), { exact: true }).first().click().catch(() => {}); } });
    await pagedCheck(d, results, id("paging/discipline"), { path: /^\/api\/discipline$/, list: "discipline", at: "discipline", filters: { status: "open" },
      open: async () => { await goHash(d, "discipline"); await d.settle(400); await d.page.locator('[data-discipline-page] select[aria-label="' + d.say("Status") + '"]').first().selectOption("open").catch(() => {}); } });
    await pagedCheck(d, results, id("paging/hr-documents"), { path: /^\/api\/hr\/documents$/, list: "documents", at: "hr-documents",
      open: async () => { await goHash(d, "hr"); await d.page.locator("[data-hr-tab='documents']").first().click().catch(() => {}); } });
    await pagedCheck(d, results, id("paging/hr-training"), { path: /^\/api\/hr\/training$/, list: "training", at: "hr-training",
      open: async () => { await goHash(d, "hr"); await d.page.locator("[data-hr-tab='training']").first().click().catch(() => {}); await d.settle(300); if (await has(d, "[data-training-view='records']")) await d.page.locator("[data-training-view='records']").first().click().catch(() => {}); } });
    await pagedCheck(d, results, id("paging/signatures"), { path: /^\/api\/signatures$/, list: "signatures", at: "signatures", filters: { state: "open" },
      open: async () => { await goHash(d, "hr/signatures"); } });
    await pagedCheck(d, results, id("paging/issues"), { path: /^\/api\/issues$/, list: "issues", at: "issues", filters: { status: "open" },
      open: async () => { await goHash(d, "issues"); await d.settle(400); await d.page.getByText(d.say("open|issues"), { exact: true }).first().click().catch(() => {}); } });
    await pagedCheck(d, results, id("paging/scheduled-inspections"), { path: /^\/api\/inspections\/scheduled$/, list: "inspections", at: "inspections-scheduled", otherRead: /awaiting=review/,
      open: async () => { await goHash(d, "inspections"); await d.settle(300); await d.page.getByText(d.say("Scheduled|inspections"), { exact: true }).first().click().catch(() => {}); } });
    await pagedCheck(d, results, id("paging/supply-requests"), { path: /^\/api\/supplies\/requests$/, list: "supply_requests", at: "supply-requests",
      open: async () => { await goHash(d, "supplies"); await d.page.locator('[data-supplies-tab="requests"]').first().click().catch(() => {}); } });
  });

  // Part 364's line that said a list stops at its limit is gone, with 200 cases and 500 warnings on record.
  await withDriver(ctx, { name: "no-limit-line", lang, arm: (stubs) => stubs.setFindings364(true) }, async (d) => {
    await goHash(d, "cases");
    await d.page.getByText(d.say("All|cases"), { exact: true }).first().click().catch(() => {});
    await d.settle(700);
    const casesLine = await has(d, "[data-cases-capped]");
    const casesMore = await has(d, '[data-show-more="cases"]');
    await goHash(d, "discipline");
    await d.settle(700);
    const warnLine = await has(d, "[data-discipline-capped]");
    const warnMore = await has(d, '[data-show-more="discipline"]');
    results.check(KIND, id("paging/no-line-that-the-list-stops"), !casesLine && !warnLine && casesMore && warnMore,
      (casesLine ? "Cases says the list stops at 200; " : "") + (warnLine ? "Discipline says the list stops at its limit; " : "") + "Show more " + (casesMore && warnMore ? "is" : "is not") + " offered on both");
  });

  // API-93: a second press while the first still sends is 409 <area>.sending, read as still going out.
  await withDriver(ctx, { name: "sending", lang, arm: (s) => s.setStep308Holder(true) }, async (d, stubs) => {
    await goHash(d, "supplies");
    await d.page.locator('[data-supplies-tab="requests"]').click();
    await until(d, '[data-request-open="sr-9"]');
    await d.page.locator('[data-request-open="sr-9"]').click();
    await until(d, "[data-request-approve-all]");
    await d.page.locator("[data-request-approve-all]").click();
    await until(d, "[data-order-vendor]");
    await d.page.locator("[data-order-vendor]").selectOption("v-1");
    await d.drawSignature();
    await d.page.locator("[data-order-sign] [data-signature-box] button").first().click();
    await until(d, "[data-order-send]");
    const words = lang === "es" ? "Esta orden se est\u00e1 enviando ahora. Espere a que termine antes de enviarla de nuevo." : "This order is being sent now. Wait for it to finish before sending it again.";
    stubs.setRefusal({ method: "POST", path: "/api/supplies/requests/sr-9/send", status: 409, code: "supplies.sending", error: words, body: {}, once: true });
    await d.page.locator("[data-order-send]").click().catch(() => {});
    await d.settle(800);
    const said = await textOf(d, "[data-order-send-refusal]");
    const off = await d.page.locator("[data-order-send], [data-order-send-again]").first().isDisabled().catch(() => false);
    results.check(KIND, id("api-93-sending-read-as-still-going-out"), said === words && off, "after 409 supplies.sending the window reads " + say(said) + (off ? "" : " and Send is offered again"));
  });

  // API-108: each announcement carries a clientId made once; a press again after the browser gave up is
  // answered with the first announcement.
  await withDriver(ctx, { name: "announcement", lang }, async (d, stubs) => {
    await d.goto("announcements");
    await until(d, "[data-announcement-send]");
    await d.page.getByLabel(d.say("Title"), { exact: true }).fill("Parking lot closed Friday").catch(() => {});
    await d.page.getByLabel(d.say("Message"), { exact: true }).fill("The north lot is closed Friday for repaving.").catch(() => {});
    stubs.setDelay("/api/announcements", 31500);
    const mark = d.mark();
    await d.page.locator("[data-announcement-send]").click().catch(() => {});
    await wait(31500);
    await d.settle(300);
    stubs.clearDelays();
    const on = !(await d.page.locator("[data-announcement-send]").isDisabled().catch(() => true));
    await d.page.locator("[data-announcement-send]").click().catch(() => {});
    await d.settle(800);
    const posts = writes(d, mark, "POST", /^\/api\/announcements$/);
    const ids = posts.map((c) => c.body && c.body.clientId);
    const repeats = stubs.model368().repeats.length;
    results.check(KIND, id("api-108-one-client-id-per-announcement"), posts.length === 2 && /^[0-9a-f-]{36}$/i.test(String(ids[0] || "")) && ids[0] === ids[1] && on && repeats === 1,
      "two presses sent " + posts.length + " posts with clientIds " + say(ids) + (on ? "" : "; Send was held off after the browser gave up") + "; the API answered " + repeats + " repeat(s)");
  });

  // API-101: Company settings, a change made since to another field, saved again without asking.
  const settingsOpen = async (d) => { await goHash(d, "settings"); await d.page.locator('[data-settings-tab="company"]').first().click().catch(() => {}); await d.settle(500); };
  const nameBox = (d) => d.page.locator("label", { hasText: d.say("Display name") }).first().locator("xpath=following-sibling::input[1]");
  await withDriver(ctx, { name: "since-quiet", lang }, async (d, stubs) => {
    await settingsOpen(d);
    const now = await d.page.evaluate(() => null);
    const read = stubs.handle({ method: "GET", url: "http://stub.invalid/api/settings?locale=" + lang, headers: { authorization: "Bearer x", "accept-language": lang }, lang }).json;
    stubs.setScene368({ since: { "/api/settings": Object.assign({}, read, { phone: "2155550177", updated_at: "2026-03-17T13:00:00.000Z" }) } });
    await nameBox(d).fill("Orchard Cove Services").catch(() => {});
    const mark = d.mark();
    await d.page.getByRole("button", { name: d.say("Save") }).last().click().catch(() => {});
    await d.settle(1200);
    const sent = writes(d, mark, "PATCH", /^\/api\/settings$/);
    const asked = await has(d, "[data-changed-since]");
    results.check(KIND, id("api-101-a-change-elsewhere-saves-again-without-asking"), sent.length === 2 && sent[0].body.updatedAt === "2026-03-17T12:00:00.000Z" && sent[1].body.updatedAt === "2026-03-17T13:00:00.000Z" && !asked && now === null,
      "the save sent " + sent.length + " PATCHes with updatedAt " + say(sent.map((c) => c.body && c.body.updatedAt)) + (asked ? " and asked" : ""));
  });
  // The same, with the field this person edited changed since: asked, and saved what was typed.
  await withDriver(ctx, { name: "since-ask", lang }, async (d, stubs) => {
    await settingsOpen(d);
    const read = stubs.handle({ method: "GET", url: "http://stub.invalid/api/settings?locale=" + lang, headers: { authorization: "Bearer x", "accept-language": lang }, lang }).json;
    stubs.setScene368({ since: { "/api/settings": Object.assign({}, read, { display_name: "Orchard Cove Group", updated_at: "2026-03-17T13:00:00.000Z" }) } });
    await nameBox(d).fill("Orchard Cove Services").catch(() => {});
    const mark = d.mark();
    await d.page.getByRole("button", { name: d.say("Save") }).last().click().catch(() => {});
    await until(d, "[data-changed-since]", 4000);
    const row = await d.page.evaluate(() => { const r = document.querySelector('[data-changed-field="display_name"]'); return r ? r.innerText.replace(/\s+/g, " ").trim() : null; });
    await d.page.locator("[data-changed-save]").click().catch(() => {});
    await d.settle(1000);
    const sent = writes(d, mark, "PATCH", /^\/api\/settings$/);
    const wantRow = d.say("Display name") + " Orchard Cove Group Orchard Cove Services";
    results.check(KIND, id("api-101-a-change-to-the-same-field-asks-first"), row === wantRow && sent.length === 2 && sent[1].body.updatedAt === "2026-03-17T13:00:00.000Z" && sent[1].body.display_name === "Orchard Cove Services",
      row === null ? "no window asked before saving over the change" : "the window read " + say(row) + " where " + say(wantRow) + " is meant; " + sent.length + " PATCHes");
  });
  // A case's status changed since: asked, and keeping what it says now saves nothing.
  await withDriver(ctx, { name: "since-case", lang }, async (d, stubs) => {
    await goHash(d, "cases/hc-1");
    await until(d, '[data-case-window="hc-1"]', 6000);
    const read = stubs.handle({ method: "GET", url: "http://stub.invalid/api/hr-cases/hc-1?locale=" + lang, headers: { authorization: "Bearer x", "accept-language": lang }, lang }).json;
    stubs.setScene368({ since: { "/api/hr-cases/hc-1": Object.assign({}, read, { status: "in_review", updatedAt: "2026-03-17T13:00:00.000Z" }) } });
    await d.page.locator('[data-case-window="hc-1"] [data-case-status]').first().selectOption("escalated").catch(() => {});
    const mark = d.mark();
    await d.page.locator('[data-case-window="hc-1"]').getByRole("button", { name: d.say("Save changes") }).first().click().catch(() => {});
    await until(d, "[data-changed-since]", 4000);
    const row = await d.page.evaluate(() => { const r = document.querySelector('[data-changed-field="status"]'); return r ? Array.from(r.children).map((x) => x.innerText.trim()) : null; });
    await d.page.locator("[data-changed-keep]").click().catch(() => {});
    await d.settle(800);
    const sent = writes(d, mark, "PATCH", /^\/api\/hr-cases\/hc-1$/);
    results.check(KIND, id("api-101-a-case-changed-since-is-kept-when-asked"), !!row && row[0] === d.say("Status") && row[1] === d.say("In review|case") && row[2] === d.say("Escalated|case") && sent.length === 1 && sent[0].body.updatedAt === read.updatedAt,
      !row ? "no window asked before saving over the change" : "the window read " + say(row) + "; " + sent.length + " PATCH(es) went with " + say(sent.map((c) => c.body && c.body.updatedAt)));
  });
  // A person's record moved at a sign-in since the edit opened: saved again without asking.
  await withDriver(ctx, { name: "since-person", lang }, async (d, stubs) => {
    const who = "u-staff-5";
    await goHash(d, "staff/" + who);
    await until(d, "[data-profile-edit]", 6000);
    await d.page.locator("[data-profile-edit]").first().click().catch(() => {});
    await d.settle(600);
    const read = stubs.handle({ method: "GET", url: "http://stub.invalid/api/users/" + who + "?locale=" + lang, headers: { authorization: "Bearer x", "accept-language": lang }, lang }).json.user;
    stubs.setScene368({ since: { ["/api/users/" + who]: Object.assign({}, read, { lastLoginAt: "2026-03-17T13:00:00.000Z", updatedAt: "2026-03-17T13:00:00.000Z" }) } });
    const phone = d.page.locator("div").filter({ has: d.page.locator("label", { hasText: new RegExp("^" + d.say("Phone") + "$") }) }).locator("input").last();
    await phone.fill("2155550188").catch(() => {});
    const mark = d.mark();
    await d.page.getByRole("button", { name: d.say("Save") }).last().click().catch(() => {});
    await d.settle(1200);
    const sent = writes(d, mark, "PATCH", new RegExp("^/api/users/" + who + "$"));
    const asked = await has(d, "[data-changed-since]");
    results.check(KIND, id("api-101-a-sign-in-since-saves-again-without-asking"), !!who && sent.length === 2 && sent[0].body.updatedAt === read.updatedAt && sent[1].body.updatedAt === "2026-03-17T13:00:00.000Z" && !asked && !!phone,
      !who ? "no staff row to open" : "the save sent " + sent.length + " PATCHes with updatedAt " + say(sent.map((c) => c.body && c.body.updatedAt)) + (asked ? " and asked" : ""));
  });

  // API-103: the HR document box takes an iPhone's HEIC photo.
  await withDriver(ctx, { name: "heic", lang }, async (d) => {
    await goHash(d, "hr");
    await d.page.locator("[data-hr-tab='documents']").first().click().catch(() => {});
    await d.settle(400);
    await d.clickText(d.say("+ Add Document"), { exact: false });
    await until(d, "[data-hr-doc-file]");
    const accept = (await has(d, "[data-hr-doc-file]")) ? await d.page.locator("[data-hr-doc-file]").getAttribute("accept") : "";
    await d.page.locator("[data-hr-doc-file]").setInputFiles({ name: "IMG_0412.HEIC", mimeType: "image/heic", buffer: Buffer.from("heic bytes") }).catch(() => {});
    await d.settle(200);
    const why = await textOf(d, "[data-hr-doc-file-refusal]");
    const page = await d.page.evaluate(() => document.body.innerText);
    results.check(KIND, id("api-103-the-hr-document-box-takes-heic"), /\.heic/.test(accept || "") && /\.heif/.test(accept || "") && !why && page.indexOf(d.say("A PDF, a JPEG, PNG or HEIC photo, or a Word file, up to 25 MB.")) >= 0,
      "the box accepts " + say(accept) + (why ? " and refuses an iPhone photo: " + say(why) : ""));
    await d.closeModal().catch(() => {});
  });

  // API-99: the category read from serviceCategory first, so the page reads the same once the old key
  // is gone, and a save sends serviceCategory.
  await withDriver(ctx, { name: "category", lang }, async (d, stubs) => {
    await goHash(d, "services");
    await d.settle(600);
    if (d.waitToastGone) await d.waitToastGone().catch(() => {});
    const before = await d.page.evaluate(() => (document.querySelector("main") || document.body).innerText);
    stubs.setScene368({ categoryNewOnly: true });
    await goHash(d, "services");
    await d.settle(600);
    const after = await d.page.evaluate(() => (document.querySelector("main") || document.body).innerText);
    const diff = (() => { const a = before.split("\n"), b = after.split("\n"); const i = a.findIndex((x, k) => x !== b[k]); return i < 0 ? "" : say([a[i], b[i]]); })();
    results.check(KIND, id("api-99-the-category-reads-the-same-under-serviceCategory"), before === after && before.length > 0, "the Service Catalog reads differently once the answers carry serviceCategory alone: " + diff);
    await d.clickText("Daily janitorial", { exact: false }).catch(() => {});
    await d.settle(500);
    await d.clickText(d.say("Edit"), { exact: true }).catch(() => {});
    await d.settle(300);
    const mark = d.mark();
    await d.page.locator("select").filter({ has: d.page.locator('option[value="HSE"]') }).last().selectOption("HSE").catch(() => {});
    await d.page.getByRole("button", { name: d.say("Save") }).last().click().catch(() => {});
    await d.settle(800);
    const sent = writes(d, mark, "PATCH", /^\/api\/services\/[^/]+$/);
    const b = sent[0] ? sent[0].body || {} : {};
    results.check(KIND, id("api-99-a-save-sends-serviceCategory"), sent.length === 1 && b.serviceCategory === "HSE" && b.cimsCategory === undefined && b.cims_category === undefined,
      !sent.length ? "the service was not saved" : "the save sent " + say(Object.keys(b).filter((k) => /categor/i.test(k)).map((k) => k + "=" + b[k])));
  });

  // API-105, already so on main: emptied notes on an HR document are cleared with null.
  await withDriver(ctx, { name: "notes", lang }, async (d) => {
    await goHash(d, "hr");
    await d.page.locator("[data-hr-tab='documents']").first().click().catch(() => {});
    await d.settle(500);
    await d.page.getByRole("button", { name: d.say("Edit") }).first().click().catch(() => {});
    await d.settle(400);
    const box = d.page.locator("div").filter({ has: d.page.locator("label", { hasText: d.say("Notes") }) }).locator("textarea, input[type=text]").last();
    await box.fill("   ").catch(() => {});
    const mark = d.mark();
    await d.page.getByRole("button", { name: d.say("Save") }).last().click().catch(() => {});
    await d.settle(800);
    const sent = writes(d, mark, "PATCH", /^\/api\/jotform\/employee-documents\/[^/]+$/);
    results.check(KIND, id("guard-api-105-emptied-notes-are-cleared-with-null"), sent.length === 1 && sent[0].body && sent[0].body.notes === null,
      !sent.length ? "the document was not saved" : "the save sent notes " + say(sent[0].body && sent[0].body.notes));
  });
}

async function run(ctx) {
  for (const lang of LANGS) {
    await maintenanceCases(ctx, lang);
    await leaveCases(ctx, lang);
    await checklistCases(ctx, lang);
    await sessionCases(ctx, lang);
    await round6Cases(ctx, lang);
  }
}

module.exports = { run, maintenanceCases, leaveCases, checklistCases, sessionCases, round6Cases };
