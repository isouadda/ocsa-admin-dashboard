// Round 13 (part 405): a status chosen before the issue's read lands, the other windows that read their record again,
// and whose messages are whose on Messages, against the stub as the API is built at ocsa-api main d84a449, with the
// part405 layer (audit/part405-stub.js) holding a read back or saying what someone else did meanwhile. Each case runs in
// English and in Spanish, and each fails on main as it stood at 881eab7 unless its name says it is a guard.
//
//   status     an issue opened while its read is held back: Resolved chosen before the read lands is what Set status
//              sends; a read that shows the issue moved on the server keeps the choice and says what it is now. A
//              guard: an untouched picker follows the read
//   request    a client request's route chosen before a later read (after a note) is kept and saved; one saved by
//              someone else meanwhile keeps the choice and is said
"use strict";
const { createStubs } = require("../stubs");

const KIND = "part405";
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
const valueOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? l.inputValue() : null; };
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
const thrown = (d, from) => d.pageErrors.slice(from || 0).filter((e) => !/^console: Failed to load resource/.test(e));
const soon = async (fn, ms) => { const end = Date.now() + (ms || 4000); while (Date.now() < end) { if (await fn()) return true; await wait(100); } return !!(await fn()); };

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
  } finally { await stubs.release405(); await d.close(); }
}

// ---- Section 1: keep the status the person chose --------------------------------------------------------------------
const PICKER = "[data-issue-status] select";
// The issue's window opened from its row while its read is held back, the picker drawn from the row.
async function openHeld(d, stubs, id) {
  await goHash(d, "issues");
  await until(d, "[data-issue-row='" + id + "']", 8000);
  await d.page.locator("[data-issue-row='" + id + "']").first().click();
  await until(d, PICKER, 6000);
  return soon(() => stubs.held405().indexOf(id) >= 0, 4000);
}
// The read let go, and the window given the time to draw what it answered.
async function land(d, stubs, mark, id) {
  stubs.release405();
  await soon(() => reads(d, mark, new RegExp("^/api/issues/" + id + "/photos$")).length > 0, 4000);
  await d.settle(500);
}
async function setStatus(d) {
  await d.page.locator("[data-issue-status] button").first().click({ timeout: 3000 }).catch(() => {});
  await d.settle(800);
}
async function statusCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/status/" + x;

  // 1. Resolved chosen before the issue's read lands is what Set status sends.
  await withDriver(ctx, { name: "chosen-before", lang, arm: (s) => s.setScene405({ holdIssue: { id: "i-1" } }) }, async (d, stubs) => {
    const mark = d.mark();
    const held = await openHeld(d, stubs, "i-1");
    await d.page.locator(PICKER).selectOption("resolved").catch(() => {});
    await land(d, stubs, mark, "i-1");
    const kept = await valueOf(d, PICKER);
    const before = d.mark();
    await setStatus(d);
    const sent = writes(d, before, "PATCH", /^\/api\/issues\/i-1$/).map((c) => c.body && c.body.status);
    results.check(KIND, id("a-status-chosen-before-the-read-lands-is-sent"), held && kept === "resolved" && sent.length === 1 && sent[0] === "resolved" && thrown(d).length === 0,
      (held ? "" : "the read was not held; ") + "the picker reads " + say(kept) + " once the read landed, and Set status sent " + say(sent));
  });

  // 2. A read that shows the issue moved on the server keeps the choice and says what the issue is now.
  await withDriver(ctx, { name: "moved", lang, arm: (s) => s.setScene405({ holdIssue: { id: "i-1", status: "in_progress" } }) }, async (d, stubs) => {
    const mark = d.mark();
    const held = await openHeld(d, stubs, "i-1");
    await d.page.locator(PICKER).selectOption("resolved").catch(() => {});
    await land(d, stubs, mark, "i-1");
    const kept = await valueOf(d, PICKER);
    const now = await attr(d, "[data-issue-status-moved]", "data-issue-status-moved");
    const line = await textOf(d, "[data-issue-status-moved]");
    const want = fill(d.say("Someone changed this issue to {0} while it was open. Your choice is kept."), d.say("in progress"));
    const before = d.mark();
    await setStatus(d);
    const sent = writes(d, before, "PATCH", /^\/api\/issues\/i-1$/).map((c) => c.body && c.body.status);
    results.check(KIND, id("a-status-moved-on-the-server-keeps-the-choice-and-says-so"), held && kept === "resolved" && now === "in_progress" && line === want && sent.length === 1 && sent[0] === "resolved",
      "the picker reads " + say(kept) + ", the line " + say(line) + " for " + say(now) + " (want " + say(want) + "), Set status sent " + say(sent));
  });

  // 3. A guard: a picker nobody touched follows the read, with no line.
  await withDriver(ctx, { name: "untouched", lang, arm: (s) => s.setScene405({ holdIssue: { id: "i-1", status: "in_progress" } }) }, async (d, stubs) => {
    const mark = d.mark();
    const held = await openHeld(d, stubs, "i-1");
    await land(d, stubs, mark, "i-1");
    const shown = await valueOf(d, PICKER);
    const line = await has(d, "[data-issue-status-moved]");
    results.check(KIND, id("guard-an-untouched-picker-follows-the-read"), held && shown === "in_progress" && !line, "the picker reads " + say(shown) + (line ? ", with a moved line" : ""));
  });
}

// ---- Section 1.3: the client request's route ------------------------------------------------------------------------
const ROUTE = "[data-request-route] select";
// A request's window, its route chosen, and a note added, which reads the request again.
async function routeThenNote(d, mark) {
  await goHash(d, "issues/requests/rq-3");
  await until(d, ROUTE, 8000);
  await d.settle(300);
  await d.page.locator(ROUTE).selectOption("chargeable").catch(() => {});
  await d.page.locator("[data-request-note-button]").first().click().catch(() => {});
  await until(d, "[data-request-note-form] textarea", 4000);
  await d.page.locator("[data-request-note-form] textarea").first().fill("Checked the bin by the door.");
  await d.page.locator("[data-request-note-save]").first().click().catch(() => {});
  await soon(() => reads(d, mark, /^\/api\/issues\/requests\/rq-3$/).length >= 2, 4000);
  await d.settle(500);
}
async function requestCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/request/" + x;

  // 4. A route chosen and not saved stays through the read a note makes, and Save sends it.
  await withDriver(ctx, { name: "route-kept", lang }, async (d) => {
    const mark = d.mark();
    await routeThenNote(d, mark);
    const read = reads(d, mark, /^\/api\/issues\/requests\/rq-3$/).length;
    const kept = await valueOf(d, ROUTE);
    const before = d.mark();
    await d.page.locator("[data-request-route] button").last().click().catch(() => {});
    await d.settle(700);
    const sent = writes(d, before, "PATCH", /^\/api\/issues\/rq-3\/request$/).map((c) => c.body && c.body.route);
    results.check(KIND, id("a-route-chosen-before-a-later-read-is-kept"), read >= 2 && kept === "chargeable" && sent.length === 1 && sent[0] === "chargeable",
      read + " read(s) of the request; the route reads " + say(kept) + " after the note, and Save sent " + say(sent));
  });

  // 5. A route someone else saved meanwhile keeps the choice and is said.
  await withDriver(ctx, { name: "route-moved", lang, arm: (s) => s.setScene405({ requestMoved: { id: "rq-3", route: "within_scope" } }) }, async (d) => {
    const mark = d.mark();
    await routeThenNote(d, mark);
    const kept = await valueOf(d, ROUTE);
    const line = await textOf(d, "[data-request-route-moved]");
    const want = fill(d.say("Someone saved {0} while this was open. Your choice is kept."), d.say("Within scope"));
    results.check(KIND, id("a-route-saved-by-someone-else-meanwhile-keeps-the-choice-and-is-said"), kept === "chargeable" && line === want,
      "the route reads " + say(kept) + ", the line " + say(line) + " (want " + say(want) + ")");
  });
}

// ctx.only, when a runner names sections, keeps the run to them.
async function run(ctx) {
  const want = (x) => !ctx.only || ctx.only.indexOf(x) >= 0;
  for (const lang of LANGS) {
    if (want("status")) await statusCases(ctx, lang);
    if (want("request")) await requestCases(ctx, lang);
  }
}

module.exports = { run };
