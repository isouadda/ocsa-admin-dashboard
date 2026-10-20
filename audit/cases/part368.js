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

async function run(ctx) {
  for (const lang of LANGS) {
    await maintenanceCases(ctx, lang);
  }
}

module.exports = { run };
