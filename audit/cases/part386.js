// What the API's Round 11 gave the dashboard (part 386), against the stub as the API is built at ocsa-api main
// 292d2a9 (audit/part386-stub.js, over audit/part379-stub.js), armed as the API is built (setApiAsBuilt) with
// Round 2's file log (setStep353) and part 364's answers (setStep364). Each case runs in English and in Spanish,
// and each fails on main as it stood at 2e539b3 unless its name says it is a guard.
//
//   robot     the robot's sign-in on the Health page: each test account's device in plain words with its days
//             left, colored by its number's lines; Renew for the super admin alone, sending this browser's own
//             device id, and its refusals in the API's words; the number in days with its below lines in
//             words, its list, and the lines editor that holds red at or under yellow
//   training  who filed each certificate on HR Records' training records, the person or the office; From an
//             outside course on a topic's form, sent as outsideCourse, and on the topic's page and the catalog
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "part386";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const say = (x) => JSON.stringify(x);
const fill = (s, ...v) => String(s).replace(/\{(\d+)\}/g, (m, n) => (v[Number(n)] !== undefined ? String(v[Number(n)]) : m));

async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(700);
}
const has = async (d, sel) => (await d.page.locator(sel).count()) > 0;
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: ms || 6000 }).catch(() => {}); return has(d, sel); };
const attr = async (d, sel, name) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? l.getAttribute(name) : null; };
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));

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

// ---- Section 1: the robot's sign-in -----------------------------------------------------------------------
const SUPERVISOR_DEVICE = "00000000-0000-4000-8000-000000004101";
async function openRuns(d) {
  await goHash(d, "health/runs");
  await until(d, "[data-health-page='runs']", 8000);
  await d.settle(500);
}
async function robotCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/robot/" + x;

  // 1. The super admin reads each test account's device in plain words, fewest days first, yellow at 4 days
  //    left on the number's own lines, with Renew beside it.
  await withDriver(ctx, { name: "listed", lang, persona: "superAdmin" }, async (d) => {
    const mark = d.mark();
    await openRuns(d);
    await until(d, "[data-health-robot-device]", 6000);
    const read = reads(d, mark, /^\/api\/health\/robot-devices$/).length;
    const ids = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-health-robot-device]")).map((x) => x.getAttribute("data-health-robot-device")));
    const words = await textOf(d, "[data-health-robot-device='" + SUPERVISOR_DEVICE + "'] [data-health-robot-words]");
    const want = fill(d.say("{0}'s sign-in on the robot ends in {1} days"), "Test Supervisor", 4);
    const state = await attr(d, "[data-health-robot-device='" + SUPERVISOR_DEVICE + "']", "data-health-robot-state");
    const renew = await has(d, "[data-health-robot-renew='" + SUPERVISOR_DEVICE + "']");
    results.check(KIND, id("each-test-account-s-sign-in-in-plain-words"), read >= 1 && ids.length === 2 && ids[0] === SUPERVISOR_DEVICE && words === want && state === "yellow" && renew,
      read < 1 ? "the page read no robot devices" : "the card lists " + say(ids) + ", reads " + say(words) + " (want " + say(want) + "), state " + say(state) + (renew ? "" : ", no Renew"));
  });

  // 2. Renew sends this browser's own device id, the one its sign-in sends, and reads the device's new day.
  await withDriver(ctx, { name: "renew", lang, persona: "superAdmin" }, async (d, stubs) => {
    await openRuns(d);
    await until(d, "[data-health-robot-renew]", 6000);
    const mine = await d.page.evaluate(() => { try { return localStorage.getItem("ocsa-device-id"); } catch (e) { return null; } });
    const mark = d.mark();
    await d.page.locator("[data-health-robot-renew='" + SUPERVISOR_DEVICE + "']").first().click().catch(() => {});
    await until(d, "[data-health-robot-said]", 6000);
    await d.settle(400);
    const posts = writes(d, mark, "POST", /^\/api\/health\/robot-devices\/[^/]+\/renew$/);
    const body = (stubs.sent386().filter((x) => x.what === "renew").pop() || {}).body || {};
    const said = await attr(d, "[data-health-robot-said]", "data-health-robot-said");
    const text = await textOf(d, "[data-health-robot-said]");
    const days = await attr(d, "[data-health-robot-device='" + SUPERVISOR_DEVICE + "']", "data-health-robot-days");
    results.check(KIND, id("renew-sends-this-device-and-reads-the-new-day"), posts.length === 1 && !!mine && body.body && body.body.deviceId === mine && said === "renewed" && text.indexOf(fill(d.say("Renewed. {0}'s sign-in on the robot now ends on {1}."), "Test Supervisor", "").split(" ").slice(0, 2).join(" ")) === 0 && days === "30",
      "renew posted " + posts.length + " time(s) with " + say(body.body) + " (this browser's id " + say(mine) + "), said " + say([said, text]) + ", days now " + say(days));
  });

  // 3. A renew the API refuses says so in the API's words: the super admin's own second step is not here.
  await withDriver(ctx, { name: "renew-refused", lang, persona: "superAdmin", arm: (s) => s.setScene386({ noOwnStep: true }) }, async (d) => {
    await openRuns(d);
    await until(d, "[data-health-robot-renew]", 6000);
    await d.page.locator("[data-health-robot-renew='" + SUPERVISOR_DEVICE + "']").first().click().catch(() => {});
    await until(d, "[data-health-robot-said]", 6000);
    const said = await attr(d, "[data-health-robot-said]", "data-health-robot-said");
    const text = await textOf(d, "[data-health-robot-said]");
    const want = d.say("Sign in with your own sign-in code on this device first, then try again.");
    const days = await attr(d, "[data-health-robot-device='" + SUPERVISOR_DEVICE + "']", "data-health-robot-days");
    results.check(KIND, id("a-refused-renew-reads-the-api-s-words"), said === "health.ownSecondStep" && text === want && days === "4",
      "the card said " + say([said, text]) + " (want " + say(want) + ") and the days read " + say(days));
  });

  // 4. Someone the super admin gave the Health page reads the devices and is offered no Renew.
  await withDriver(ctx, { name: "no-renew", lang, persona: "admin", arm: (s) => s.setScene379({ grants: { [seed.PEOPLE.admin.id]: true } }) }, async (d) => {
    await openRuns(d);
    await until(d, "[data-health-robot-device]", 6000);
    const renew = await has(d, "[data-health-robot-renew]");
    const only = await textOf(d, "[data-health-robot-only-super]");
    const words = await textOf(d, "[data-health-robot-device] [data-health-robot-words]");
    results.check(KIND, id("someone-given-the-page-reads-it-with-no-renew"), !renew && only === d.say("Only the super admin can renew it.") && words !== "",
      renew ? "the admin is offered Renew" : "the card reads " + say([words, only]));
  });

  // 5. The number reads in days, its lines in words that say fewer is worse, and its list names each device.
  await withDriver(ctx, { name: "number", lang, persona: "superAdmin" }, async (d) => {
    await goHash(d, "health");
    await until(d, "[data-health-number='robot_trust_days_left']", 8000);
    const card = "[data-health-number='robot_trust_days_left']";
    const today = await textOf(d, card + " [data-health-today]");
    const lines = await textOf(d, card + " [data-health-lines]");
    const state = await attr(d, card, "data-health-number-state");
    const wantToday = d.sayCount ? d.sayCount("{0} days|count", 4) : null;
    const wantLines = fill(d.say("Yellow at or under {0}, red at or under {1}"), lang === "es" ? "5 días" : "5 days", lang === "es" ? "1 día" : "1 day");
    await d.page.locator(card).first().click().catch(() => {});
    await until(d, "[data-health-list='robot_trust_days_left'] td", 6000);
    const list = await textOf(d, "[data-health-list='robot_trust_days_left']");
    results.check(KIND, id("the-number-reads-in-days-with-its-below-lines"), today === (wantToday || (lang === "es" ? "4 días" : "4 days")) && lines === wantLines && state === "yellow" && list.indexOf("Test Supervisor") >= 0 && list.indexOf("Chrome on Linux") >= 0,
      "the number reads " + say([today, lines, state]) + " (want " + say([wantToday, wantLines]) + "); its list " + (list.indexOf("Test Supervisor") >= 0 ? "names the device" : "reads " + say(list.slice(0, 160))));
  });

  // 6. The lines editor says the number's lines are crossed at or under, holds a red line over yellow in words
  //    before sending, and sends a good pair.
  await withDriver(ctx, { name: "lines", lang, persona: "superAdmin" }, async (d) => {
    await goHash(d, "health/settings");
    await until(d, "[data-health-threshold='robot_trust_days_left']", 8000);
    const row = "[data-health-threshold='robot_trust_days_left']";
    const below = await textOf(d, row + " [data-health-below]");
    const box = (line) => d.page.locator("[data-health-line='robot_trust_days_left." + line + "']").first();
    await box("yellow").fill("3");
    await box("red").fill("6");
    let mark = d.mark();
    await d.page.locator("[data-health-thresholds-save]").first().click().catch(() => {});
    await d.settle(500);
    const heldPuts = writes(d, mark, "PUT", /^\/api\/health\/thresholds$/).length;
    const heldText = await textOf(d, "[data-health-thresholds-said]");
    const wantHeld = fill(d.say("For {0}, fewer is worse, so the red line is at or under the yellow line."), lang === "es" ? "Días restantes del inicio de sesión del robot" : "Days left on the robot's sign-in");
    await box("yellow").fill("7");
    await box("red").fill("2");
    mark = d.mark();
    await d.page.locator("[data-health-thresholds-save]").first().click().catch(() => {});
    await until(d, "[data-health-thresholds-said='saved']", 6000);
    const put = writes(d, mark, "PUT", /^\/api\/health\/thresholds$/).pop();
    const sentLines = put && put.body && put.body.thresholds ? put.body.thresholds.robot_trust_days_left : null;
    results.check(KIND, id("the-lines-editor-holds-red-at-or-under-yellow"), below.indexOf(d.say("Fewer is worse. It turns yellow at or under the yellow line and red at or under the red line, which is at or under yellow.")) === 0 && heldPuts === 0 && heldText === wantHeld && !!sentLines && sentLines.yellow === 7 && sentLines.red === 2 && !!put && put.status === 200,
      "the row says " + say(below.slice(0, 80)) + "; red over yellow sent " + heldPuts + " PUT(s) and said " + say(heldText) + "; the good pair sent " + say(sentLines) + (put ? " answered " + put.status : ""));
  });
}

// ---- Section 2: certificates from an outside course ------------------------------------------------------
async function trainingCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/training/" + x;

  // 1. HR Records' training records say who filed each certificate: the person's own upload from an outside
  //    course, and once the API says the office filed it, the office.
  await withDriver(ctx, { name: "certificate-by", lang, arm: (s) => s.setStep262(true) }, async (d, stubs) => {
    await goHash(d, "hr/training");
    await until(d, "[data-training-record='ht-5']", 8000);
    const person = await textOf(d, "[data-training-record='ht-5'] [data-certificate-by]");
    const personKind = await attr(d, "[data-training-record='ht-5'] [data-certificate-by]", "data-certificate-by");
    const others = await d.page.locator("[data-certificate-by]").count();
    stubs.setScene386({ personCerts: {} });
    await goHash(d, "hr/training");
    await until(d, "[data-training-record='ht-5']", 8000);
    await d.settle(400);
    const office = await textOf(d, "[data-training-record='ht-5'] [data-certificate-by]");
    const officeKind = await attr(d, "[data-training-record='ht-5'] [data-certificate-by]", "data-certificate-by");
    results.check(KIND, id("training-records-say-who-filed-each-certificate"), personKind === "person" && person === d.say("Certificate uploaded by the person") && others === 1 && officeKind === "office" && office === d.say("Certificate filed by the office"),
      "ht-5 reads " + say([personKind, person]) + " with " + others + " record(s) marked, then " + say([officeKind, office]));
  });

  // 2. The topic's form takes From an outside course and sends it as outsideCourse; the topic's page then says so.
  await withDriver(ctx, { name: "outside-form", lang, arm: (s) => { s.setStep262(true); s.setStep266(true); } }, async (d, stubs) => {
    await goHash(d, "hr/training/catalog");
    await until(d, "[data-training-catalog] table tbody tr", 8000);
    await d.page.locator("[data-training-catalog] table tbody tr").filter({ hasText: lang === "es" ? "Orientaci\u00f3n en el sitio" : "Site orientation" }).first().click().catch(() => {});
    await until(d, "[data-topic-details]", 6000);
    const before = await attr(d, "[data-topic-outside]", "data-topic-outside");
    await d.page.locator("[data-topic-edit]").first().click().catch(() => {});
    await until(d, "[data-topic-field='outsideCourse'] input", 5000);
    const label = await textOf(d, "[data-topic-field='outsideCourse'] label");
    await d.page.locator("[data-topic-field='outsideCourse'] input").first().check().catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-topic-save]").first().click().catch(() => {});
    await until(d, "[data-topic-details]", 6000);
    await d.settle(300);
    const patch = writes(d, mark, "PATCH", /^\/api\/training\/topics\/tp-2$/).pop();
    const after = await attr(d, "[data-topic-outside]", "data-topic-outside");
    const words = await textOf(d, "[data-topic-outside]");
    results.check(KIND, id("a-topic-s-form-sends-from-an-outside-course"), before === "no" && label === d.say("From an outside course") && !!patch && patch.body && patch.body.outsideCourse === true && patch.status === 200 && after === "yes" && words === d.say("Yes. Staff upload their own certificate in the staff app.") && stubs.model386().outside["tp-2"] === true,
      "before " + say(before) + ", the box reads " + say(label) + ", the PATCH sent " + say(patch && patch.body ? patch.body.outsideCourse : null) + (patch ? " answered " + patch.status : "") + ", after " + say([after, words]));
  });

  // 3. A topic marked as an outside course says so on its page and in the catalog.
  await withDriver(ctx, { name: "outside-page", lang, arm: (s) => { s.setStep262(true); s.setStep266(true); } }, async (d) => {
    await goHash(d, "hr/training/catalog");
    await until(d, "[data-training-catalog] table tbody tr", 8000);
    const row = await has(d, "[data-topic-outside-row='tp-4']");
    const rows = await d.page.locator("[data-topic-outside-row]").count();
    await d.page.locator("[data-training-catalog] table tbody tr").filter({ has: d.page.locator("[data-topic-outside-row='tp-4']") }).first().click().catch(() => {});
    await until(d, "[data-topic-details]", 6000);
    const badge = await has(d, "[data-topic-outside-badge]");
    const value = await attr(d, "[data-topic-outside]", "data-topic-outside");
    results.check(KIND, id("an-outside-course-says-so-on-its-page-and-in-the-catalog"), row && rows === 1 && badge && value === "yes",
      "the catalog marks " + rows + " topic(s)" + (row ? "" : ", not tp-4") + "; the page " + (badge ? "has" : "has no") + " badge and reads " + say(value));
  });
}

// ctx.only, when a runner names sections, keeps the run to them.
async function run(ctx) {
  const want = (x) => !ctx.only || ctx.only.indexOf(x) >= 0;
  for (const lang of LANGS) {
    if (want("robot")) await robotCases(ctx, lang);
    if (want("training")) await trainingCases(ctx, lang);
  }
}

module.exports = { run };
