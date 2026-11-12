// Round 10 (part 393): live uptime, Copy for Claude, and what the API's Round 13 gave the dashboard, against the stub
// as the API is built at ocsa-api main 6c112ee (audit/part393-stub.js, over audit/part389-stub.js), armed as the API
// is built (setApiAsBuilt) with Round 2's file log (setStep353) and part 364's answers (setStep364). Each case runs in
// English and in Spanish, and each fails on main as it stood at 5ae0f4d unless its name says it is a guard.
//
//   uptime    the Health page's uptime monitors: each monitor the read answers with its status and since when, its
//             uptime for 1, 7 and 30 days, its last and average response and its last 24 hours; read again each
//             minute while the page is open; a stale read said with when it was, a server with no read yet, and
//             a server with no uptime key in one line; and each outage in the incidents list with its monitor,
//             its reason and how long it lasted, open or closed, taking what fixed it as every incident does
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "part393";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const say = (x) => JSON.stringify(x);
const fill = (s, ...v) => String(s).replace(/\{(\d+)\}/g, (m, n) => (v[Number(n)] !== undefined ? String(v[Number(n)]) : m));
const before = (s) => String(s).split("{0}")[0];

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
const attrs = (d, sel, name) => d.page.evaluate(([s, n]) => Array.from(document.querySelectorAll(s)).map((x) => x.getAttribute(n)), [sel, name]);

// One driver on a stub of its own, armed with the API as built, Round 2's file log and part 364. o.clock installs
// Playwright's clock before sign-in, so a case can move time on by a minute.
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
    if (o.clock) await d.page.clock.install();
    if (o.persona !== null) await d.signIn(o.persona || "admin");
    await fn(d, stubs);
  } catch (e) {
    results.fail(KIND, KIND + "/" + (o.lang || "en") + "/" + o.name + "/suite", threw(e));
  } finally { await d.close(); }
}
async function openHealth(d, tab) {
  await goHash(d, "health" + (tab ? "/" + tab : ""));
  await until(d, "[data-health-page]", 8000);
  await d.settle(500);
}

// ---- Section 1: live uptime --------------------------------------------------------------------------------------
const MONITOR_IDS = ["804609601", "804609602", "804609603", "804609604", "804609605", "804609606"];
const JOBS = "804609605";
const OPEN_OUTAGE = "00000000-0000-4000-8000-000000000711";
const CLOSED_OUTAGE = "00000000-0000-4000-8000-000000000712";
async function uptimeCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/uptime/" + x;

  // 1. Every monitor the read answers, in its order: its status and since when (over 30 days for a status older than
  //    the logs), its uptime for 1, 7 and 30 days, its last and average response, and its last 24 hours as a line.
  await withDriver(ctx, { name: "monitors", lang, persona: "superAdmin", arm: (s) => s.setScene393({ uptime: true }) }, async (d) => {
    const mark = d.mark();
    await openHealth(d);
    await until(d, "[data-uptime-monitor]", 8000);
    const read = reads(d, mark, /^\/api\/health\/uptime$/).length;
    const ids = await attrs(d, "[data-uptime-monitor]", "data-uptime-monitor");
    const states = await attrs(d, "[data-uptime-monitor]", "data-uptime-status");
    const jobs = "[data-uptime-monitor='" + JOBS + "']";
    const since = await textOf(d, jobs + " [data-uptime-since]");
    const wantSince = before(fill(d.say("{0} since {1}"), d.say("Down|monitor"), "{0}"));
    const older = await textOf(d, "[data-uptime-monitor='804609602'] [data-uptime-since]");
    const wantOlder = fill(d.say("{0} for over 30 days"), d.say("Up|monitor"));
    const d1 = await attr(d, jobs + " [data-uptime-d1]", "data-uptime-d1");
    const d30 = await attr(d, jobs + " [data-uptime-d30]", "data-uptime-d30");
    const resp = await textOf(d, jobs + " [data-uptime-response]");
    const spark = await attr(d, jobs + " [data-uptime-spark]", "data-uptime-spark");
    const paused = await attr(d, "[data-uptime-monitor='804609606'] [data-uptime-spark]", "data-uptime-spark");
    const line = await attr(d, "[data-health-uptime]", "data-health-uptime");
    const ok = read >= 1 && say(ids) === say(MONITOR_IDS) && say(states) === say(["up", "up", "up", "up", "down", "paused"])
      && since.indexOf(wantSince) === 0 && older === wantOlder && d1 === "98.264" && d30 === "99.942"
      && resp.indexOf("210") >= 0 && resp.indexOf("260") >= 0 && spark === "48" && paused === "0" && line === "live";
    results.check(KIND, id("each-monitor-with-its-status-uptime-response-and-line"), ok,
      read < 1 ? "the page read no uptime" : "monitors " + say(ids) + " " + say(states) + "; the jobs' since " + say(since) + " (want " + say(wantSince) + "...), the dashboard's " + say(older)
        + " (want " + say(wantOlder) + "); the jobs' 1 day " + say(d1) + ", 30 days " + say(d30) + ", response " + say(resp) + ", line " + say(spark) + " points, Help's " + say(paused) + "; the panel " + say(line));
  });

  // 2. Read again each minute while the page is open: a minute on, one more read.
  await withDriver(ctx, { name: "every-minute", lang, persona: "superAdmin", clock: true, arm: (s) => s.setScene393({ uptime: true }) }, async (d, stubs) => {
    await openHealth(d);
    await until(d, "[data-uptime-monitor]", 8000);
    const first = stubs.model393().uptimeReads;
    await d.page.clock.runFor(61000);
    await d.settle(600);
    const after = stubs.model393().uptimeReads;
    await d.page.clock.runFor(61000);
    await d.settle(600);
    const again = stubs.model393().uptimeReads;
    results.check(KIND, id("read-again-each-minute"), first >= 1 && after === first + 1 && again === first + 2,
      "reads on opening " + first + ", a minute on " + after + ", two minutes on " + again);
  });

  // 3. A stale read says when the last good read was.
  await withDriver(ctx, { name: "stale", lang, persona: "superAdmin", arm: (s) => s.setScene393({ uptimeStale: true }) }, async (d) => {
    await openHealth(d);
    await until(d, "[data-uptime-monitor]", 8000);
    const state = await attr(d, "[data-health-uptime]", "data-health-uptime");
    const at = await attr(d, "[data-health-uptime]", "data-health-uptime-read-at");
    const line = await textOf(d, "[data-health-uptime-line]");
    const want = before(d.say("Not read just now. This is the last good read, from {0}."));
    results.check(KIND, id("a-stale-read-says-when-the-last-good-read-was"), state === "stale" && at === "2026-03-18T01:10:00.000Z" && line.indexOf(want) === 0 && line.length > want.length,
      "the panel " + say(state) + " read at " + say(at) + ", its line " + say(line) + " (want " + say(want) + "...)");
  });

  // 4. A server with no uptime key reads one line, and one not read yet says so.
  await withDriver(ctx, { name: "not-set-up", lang, persona: "superAdmin" }, async (d) => {
    await openHealth(d);
    await until(d, "[data-health-uptime='off']", 8000);
    const text = await textOf(d, "[data-health-uptime]");
    const cards = await d.page.locator("[data-uptime-monitor]").count();
    results.check(KIND, id("no-uptime-key-reads-one-line"), text === d.say("Uptime is not set up on this server.") && cards === 0,
      "the panel reads " + say(text) + " with " + cards + " monitors");
  });
  await withDriver(ctx, { name: "first-read", lang, persona: "superAdmin", arm: (s) => s.setScene393({ uptimeFirst: true }) }, async (d) => {
    await openHealth(d);
    await until(d, "[data-health-uptime='unread']", 8000);
    const text = await textOf(d, "[data-health-uptime-line]");
    results.check(KIND, id("a-server-not-read-yet-says-so"), text === d.say("Uptime has not been read yet."), "the line reads " + say(text));
  });

  // 5. Outages in the incidents list: the open one with its monitor, its reason and its length so far; the closed one
  //    with how long it lasted; what fixed it written on an outage as on any incident.
  await withDriver(ctx, { name: "outages", lang, persona: "superAdmin", arm: (s) => s.setScene393({ uptime: true }) }, async (d) => {
    await openHealth(d, "incidents");
    await until(d, "[data-health-outage]", 8000);
    const open = "[data-health-incident='" + OPEN_OUTAGE + "']";
    const source = await attr(d, open, "data-health-incident-source");
    const monitor = await textOf(d, open + " [data-health-outage-monitor]");
    const reason = await textOf(d, open + " [data-health-outage-reason]");
    const sofar = await textOf(d, open + " [data-health-outage-length]");
    const wantMonitor = fill(d.say("Monitor: {0}"), "OCSA scheduled jobs");
    const wantReason = fill(d.say("Reason: {0}"), "503 Service Unavailable");
    const wantSoFar = fill(d.say("Down for {0} so far"), fill(d.say("{0} min {1} s"), 25, 0));
    await d.page.locator("[data-health-incidents-show='all']").first().click().catch(() => {});
    await until(d, "[data-health-incident='" + CLOSED_OUTAGE + "']", 5000);
    const closed = "[data-health-incident='" + CLOSED_OUTAGE + "']";
    const lasted = await textOf(d, closed + " [data-health-outage-length]");
    const wantLasted = fill(d.say("Down for {0}"), fill(d.say("{0} min {1} s"), 10, 11));
    await d.page.locator("[data-health-resolve='" + CLOSED_OUTAGE + "']").first().click().catch(() => {});
    await d.page.locator("[data-health-resolution-text]").first().fill("Raised the edge's request limit for the API.").catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-health-resolution-save]").first().click().catch(() => {});
    await d.settle(800);
    const patch = writes(d, mark, "PATCH", new RegExp("^/api/health/incidents/" + CLOSED_OUTAGE + "$")).pop();
    const now = await textOf(d, closed + " [data-health-resolution]");
    const ok = source === "uptimerobot" && monitor === wantMonitor && reason === wantReason && sofar === wantSoFar && lasted === wantLasted
      && !!patch && patch.status === 200 && now.indexOf("Raised the edge's request limit for the API.") >= 0;
    results.check(KIND, id("outages-read-their-monitor-reason-and-length-and-take-what-fixed-them"), ok,
      "the open outage " + say([source, monitor, reason, sofar]) + " (want " + say([wantMonitor, wantReason, wantSoFar]) + "); the closed one " + say(lasted) + " (want " + say(wantLasted) + "); the save "
        + (patch ? "answered " + patch.status : "sent nothing") + " and the card reads " + say(now));
  });
}

// ctx.only, when a runner names sections, keeps the run to them.
async function run(ctx) {
  const want = (x) => !ctx.only || ctx.only.indexOf(x) >= 0;
  for (const lang of LANGS) {
    if (want("uptime")) await uptimeCases(ctx, lang);
  }
}

module.exports = { run };
