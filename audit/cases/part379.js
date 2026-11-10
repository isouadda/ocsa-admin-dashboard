// What the API's Rounds 9 and 10 gave the dashboard (part 379), against the stub as the API is built at ocsa-api
// main 43cc70c (audit/part379-stub.js), armed as the API is built (setApiAsBuilt) with Round 2's file log
// (setStep353) and part 364's answers (setStep364). Each case runs in English and in Spanish, and each fails on
// main as it stood at 103d76d unless its name says it is a guard.
//
//   health    the Health page: the side panel item and the page for the super admin and for nobody else, and
//             the grant only the super admin makes; the light, its last check and Refresh; the 20 numbers with
//             yesterday, the 7 days, the 30-day line and their lines, each opening its list; the run-throughs,
//             one run's journeys and a failed step's error and screenshot, Run now and its refusals in words;
//             the incidents and what fixed one; the recipients and the lines with their defaults; Make report,
//             the archive and a PDF; and the words a server with nothing measured yet reads
//   shifts    a site's shifts read and saved whole; the shifts a task belongs to on Add and Edit Task; and
//             Checklist Results by shift, each run with its own ring, who was on it and the grey line for a
//             daily item an earlier shift did; a site with no shifts as before (a guard)
//   signatures a paper signature and a refusal witnessed in person recorded on a warning's request, with what
//             happens next, refused in the API's words; signature_signed in Who gets told and on the bell
//   round6    the test site marked TEST where sites are listed and picked; prints that read their records
//             again first; an inspection's CSV with photo counts and no links; New maintenance request with a
//             clientId and the API's own list of who it goes to
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "part379";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];
const say = (x) => JSON.stringify(x);

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
async function navIds(d) {
  let last = [];
  for (let i = 0, same = 0; i < 20 && same < 3; i += 1) {
    await wait(300);
    const ids = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]")).map((b) => b.getAttribute("data-nav-item")));
    same = ids.length === last.length ? same + 1 : 0;
    last = ids;
  }
  return last;
}

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

// ---- Section 1: the Health page ---------------------------------------------------------------------------
const HEALTH_ROW = "The Health page: platform health, run-throughs and reports";
async function openHealth(d, tab) {
  await goHash(d, "health" + (tab ? "/" + tab : ""));
  await until(d, "[data-health-page]", 8000);
  await d.settle(500);
}
async function healthCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/health/" + x;

  // 1. The super admin finds Health in the side panel and the page opens on its light; an ordinary admin and a
  //    supervisor see no item, and the address reads a plain refusal with nothing read.
  await withDriver(ctx, { name: "side-panel", lang, persona: "superAdmin" }, async (d) => {
    const ids = await navIds(d);
    const mark = d.mark();
    const item = d.page.locator("[data-nav-item='health']").first();
    if ((await item.count()) > 0) await item.click(); else await goHash(d, "health");
    await until(d, "[data-health-status]", 8000);
    await d.settle(500);
    const hash = await d.page.evaluate(() => window.location.hash);
    const state = await attr(d, "[data-health-status]", "data-health-status");
    const word = await textOf(d, "[data-health-state-word]");
    const checked = await textOf(d, "[data-health-checked]");
    const summary = reads(d, mark, /^\/api\/health\/summary$/).pop();
    results.check(KIND, id("the-super-admin-opens-it-from-the-side-panel"), ids.indexOf("health") >= 0 && hash === "#health" && !!summary && state === "red" && word === d.say("Red, something needs attention") && checked.indexOf(d.say("Last checked {0}").replace("{0}", "").trim()) === 0,
      ids.indexOf("health") < 0 ? "the super admin's side panel has no Health item: " + say(ids) : hash !== "#health" ? "the item opened " + hash : !summary ? "the page read no summary" : "the light reads " + say([state, word, checked]));
  });
  for (const persona of ["admin", "supervisor"]) {
    await withDriver(ctx, { name: "refused-" + persona, lang, persona }, async (d) => {
      const ids = await navIds(d);
      const mark = d.mark();
      await goHash(d, "health");
      await d.settle(600);
      const refused = await has(d, "[data-health-refused]");
      const read = d.callsSince(mark).filter((c) => /^\/api\/health\//.test(c.path)).length;
      results.check(KIND, id("no-item-and-a-refusal-for-the-" + persona), ids.indexOf("health") < 0 && refused && read === 0 && !(await has(d, "[data-health-page]")),
        ids.indexOf("health") >= 0 ? "the " + persona + "'s side panel offers Health" : !refused ? "#health shows the " + persona + " no refusal" : "the " + persona + "'s page read " + read + " health route(s)");
    });
  }

  // 2. The grant: the super admin is offered the Health page on an admin's account and saves it; an ordinary
  //    admin is offered no such row.
  await withDriver(ctx, { name: "grant", lang, persona: "admin" }, async (d) => {
    await d.goto("settings");
    await d.settle(400);
    await d.clickText(d.say("Roles and Permissions"), { exact: true });
    await d.settle(300);
    const picked = await d.pickPerson(seed.STAFF[4].name);
    await d.settle(500);
    // The row by its words on this screen, or by the English the API sends with it, which main draws.
    const row = picked ? ((await d.capabilityRow(d.say(HEALTH_ROW))) || (await d.capabilityRow(HEALTH_ROW))) : "unpicked";
    results.check(KIND, id("an-ordinary-admin-is-offered-no-grant"), row === null, row === "unpicked" ? "the person picker did not offer the custodial lead" : "an ordinary admin is shown the Health page's row, which only the super admin may change");
  });
  await withDriver(ctx, { name: "grant-super", lang, persona: "superAdmin" }, async (d) => {
    await d.goto("settings");
    await d.settle(400);
    await d.clickText(d.say("Roles and Permissions"), { exact: true });
    await d.settle(300);
    const picked = await d.pickPerson(seed.PEOPLE.admin.firstName + " " + seed.PEOPLE.admin.lastName);
    await d.settle(500);
    const row = picked ? await d.capabilityRow(d.say(HEALTH_ROW)) : null;
    const set = row ? await d.setCapability(d.say(HEALTH_ROW), d.say("Allow")) : false;
    const mark = d.mark();
    if (set) { await d.clickText(d.say("Save changes"), { exact: true }); await d.settle(700); }
    const put = writes(d, mark, "PUT", new RegExp("^/api/users/" + seed.PEOPLE.admin.id + "/permissions$")).pop();
    const body = put && put.body && put.body.permissions ? put.body.permissions : null;
    await d.signOutHard();
    await d.signIn("admin");
    const ids = await navIds(d);
    results.check(KIND, id("the-super-admin-grants-it-on-an-admin-s-account"), !!row && set && !!put && put.status === 200 && !!body && body.view_health === true && ids.indexOf("health") >= 0,
      !picked ? "the person picker did not offer the admin" : !row ? "the super admin is shown no Health page row on an admin's account" : !set ? "the row offers no Allow"
        : !put ? "Save changes sent no PUT" : put.status !== 200 ? "the PUT was answered " + put.status + " " + say(put.json) : !body || body.view_health !== true ? "the PUT sent " + say(put.body) : "the admin granted it has no Health item: " + say(ids));
  });

  // 3. The numbers: all 20, today colored by its state, yesterday, the 7 days and 30 days as a line, the lines
  //    in words, a number not measured saying so, and a number opening the list behind it.
  await withDriver(ctx, { name: "numbers", lang, persona: "superAdmin" }, async (d) => {
    await openHealth(d, "");
    await until(d, "[data-health-number]", 8000);
    const cards = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-health-number]")).map((el) => ({ key: el.getAttribute("data-health-number"), state: el.getAttribute("data-health-number-state"), value: el.getAttribute("data-health-number-value"),
      today: (el.querySelector("[data-health-today]") || {}).innerText, yesterday: (el.querySelector("[data-health-yesterday]") || {}).innerText, week: (el.querySelector("[data-health-week]") || {}).innerText,
      trend: (el.querySelector("[data-health-trend]") || { getAttribute: () => "" }).getAttribute("data-health-trend"), lines: (el.querySelector("[data-health-lines]") || {}).innerText })));
    const se = cards.find((c) => c.key === "server_errors") || {};
    const md = cards.find((c) => c.key === "monitors_down") || {};
    const points = String(se.trend || "").split(",").length;
    const ok1 = cards.length === 20 && se.state === "red" && se.value === "31" && /31/.test(se.today || "") && String(se.yesterday || "").replace(/\s+/g, " ") === d.say("Yesterday") + ": 3" && points === 30
      && String(se.lines || "") === d.say("Yellow at {0}, red at {1}").replace("{0}", "5").replace("{1}", "25") && md.state === "unknown" && md.today === d.say("Not measured yet");
    results.check(KIND, id("twenty-numbers-each-with-its-day-yesterday-week-and-line"), ok1,
      cards.length !== 20 ? cards.length + " numbers drawn" : "server errors read " + say(se) + "; monitors down read " + say(md));
    const mark = d.mark();
    await d.page.locator("[data-health-number='server_errors']").first().click().catch(() => {});
    await until(d, "[data-health-list='server_errors'] table tbody tr", 5000);
    const rows = await d.page.locator("[data-health-list='server_errors'] table tbody tr").count();
    const listRead = reads(d, mark, /^\/api\/health\/numbers\/server_errors\/list$/).pop();
    const firstRow = await textOf(d, "[data-health-list='server_errors'] table tbody tr");
    results.check(KIND, id("a-number-opens-who-or-what-is-behind-it"), !!listRead && rows === 2 && firstRow.indexOf("/api/sites/:id/tasks") >= 0 && firstRow.indexOf("22") >= 0,
      !listRead ? "clicking the number read no list" : "the list drew " + rows + " rows, the first " + say(firstRow));
  });

  // 4. Refresh works today's numbers out again and the light says when.
  await withDriver(ctx, { name: "refresh", lang, persona: "superAdmin" }, async (d) => {
    await openHealth(d, "");
    const before = await textOf(d, "[data-health-checked]");
    const mark = d.mark();
    await d.page.locator("[data-health-refresh]").first().click().catch(() => {});
    await d.settle(900);
    const post = writes(d, mark, "POST", /^\/api\/health\/numbers\/refresh$/);
    const after = await textOf(d, "[data-health-checked]");
    const summaries = reads(d, mark, /^\/api\/health\/summary$/).length;
    results.check(KIND, id("refresh-works-today-out-again"), post.length === 1 && summaries >= 1 && !!after && after !== before,
      post.length !== 1 ? "Refresh posted " + post.length + " time(s)" : "the light read " + say(before) + " and then " + say(after));
  });

  // 5. The run-throughs: each run's trigger, start, length, outcome and commits; one run's journeys and steps,
  //    a failed step's error and its screenshot; Run now asked, then refused in the API's words.
  await withDriver(ctx, { name: "runs", lang, persona: "superAdmin" }, async (d) => {
    await openHealth(d, "runs");
    await until(d, "[data-health-run-row]", 6000);
    const rows = await d.page.locator("[data-health-run-row]").count();
    const failedRow = d.page.locator("table tbody tr").filter({ has: d.page.locator("[data-health-run-row='00000000-0000-4000-8000-000000000902']") }).first();
    const rowText = (await failedRow.count()) ? (await failedRow.innerText()) : "";
    await failedRow.click().catch(() => {});
    await until(d, "[data-health-run] [data-health-step-error]", 6000);
    const err = await textOf(d, "[data-health-run] [data-health-step-error]");
    const shot = await attr(d, "[data-health-run] [data-health-shot]", "src");
    const commits = await textOf(d, "[data-health-run-commits]");
    const journeys = await d.page.locator("[data-health-run] [data-health-journey]").count();
    results.check(KIND, id("a-run-with-its-journeys-steps-error-and-screenshot"), rows === 3 && rowText.indexOf(d.say("After a merge")) >= 0 && /6 min/.test(rowText) && journeys === 4 && err === "The final copy's email did not arrive within 10 seconds." && /health-shots\/run-902\/step-3\.png/.test(shot || "") && commits.indexOf("481723b") >= 0,
      rows !== 3 ? rows + " runs listed" : "the merge run's row read " + say(rowText) + "; its window drew " + journeys + " journeys, the error " + say(err) + ", the screenshot " + say(shot) + " and " + say(commits));
    await d.page.keyboard.press("Escape").catch(() => {});
    await d.page.locator("[data-health-run] button[aria-label='" + d.say("Close") + "']").first().click().catch(() => {});
    await d.settle(300);
    const mark = d.mark();
    await d.page.locator("[data-health-run-now]").first().click().catch(() => {});
    await d.settle(700);
    const first = await attr(d, "[data-health-run-now-said]", "data-health-run-now-said");
    await d.page.locator("[data-health-run-now]").first().click().catch(() => {});
    await d.settle(700);
    const second = await attr(d, "[data-health-run-now-said]", "data-health-run-now-said");
    const secondText = await textOf(d, "[data-health-run-now-said]");
    const posts = writes(d, mark, "POST", /^\/api\/health\/run-now$/).map((c) => c.status);
    results.check(KIND, id("run-now-asked-then-refused-in-words"), say(posts) === "[202,409]" && first === "started" && second === "health.runNowBusy" && secondText === d.say("A run-through was just asked for. Wait two minutes before asking again."),
      "Run now answered " + say(posts) + " and the page said " + say([first, second, secondText]));
  });
  await withDriver(ctx, { name: "run-now-off", lang, persona: "superAdmin", arm: (s) => s.setScene379({ runNowOff: true }) }, async (d) => {
    await openHealth(d, "runs");
    await d.page.locator("[data-health-run-now]").first().click().catch(() => {});
    await d.settle(700);
    const said = await attr(d, "[data-health-run-now-said]", "data-health-run-now-said");
    const text = await textOf(d, "[data-health-run-now-said]");
    results.check(KIND, id("run-now-not-set-up-says-so"), said === "health.runNowOff" && text === d.say("Run now is not set up on this server yet."), "the page said " + say([said, text]));
  });

  // 6. Incidents, open and closed, with what fixed each, and resolving one with a note.
  await withDriver(ctx, { name: "incidents", lang, persona: "superAdmin" }, async (d, stubs) => {
    await openHealth(d, "incidents");
    await until(d, "[data-health-incident]", 6000);
    const open = await d.page.locator("[data-health-incident]").count();
    await d.page.locator("[data-health-incidents-show='all']").first().click().catch(() => {});
    await until(d, "[data-health-incident-closed='1']", 4000);
    const all = await d.page.locator("[data-health-incident]").count();
    const fixed = await textOf(d, "[data-health-incident-closed='1'] [data-health-resolution]");
    await d.page.locator("[data-health-resolve='00000000-0000-4000-8000-000000000701']").first().click().catch(() => {});
    await d.page.locator("[data-health-resolution-text]").first().fill("Restarted the  API after the deploy.").catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-health-resolution-save]").first().click().catch(() => {});
    await d.settle(800);
    const patch = writes(d, mark, "PATCH", /^\/api\/health\/incidents\/00000000-0000-4000-8000-000000000701$/).pop();
    const now = await textOf(d, "[data-health-incident='00000000-0000-4000-8000-000000000701'] [data-health-resolution]");
    results.check(KIND, id("incidents-open-and-closed-and-what-fixed-one"), open === 1 && all === 2 && fixed.indexOf("The mail service was slow for an hour.") >= 0 && !!patch && patch.status === 200 && patch.body && patch.body.resolution === "Restarted the API after the deploy." && now.indexOf("Restarted the API after the deploy.") >= 0,
      "open " + open + ", all " + all + ", the closed one reads " + say(fixed) + "; the save sent " + say(patch && patch.body) + " and the card reads " + say(now));
  });

  // 7. Who is told: the default said, a person and an address added and saved as a set; the lines with their
  //    defaults, one changed and saved, a share typed as a percent, and a line the API refuses marked.
  await withDriver(ctx, { name: "settings", lang, persona: "superAdmin" }, async (d) => {
    await openHealth(d, "settings");
    await until(d, "[data-health-recipients]", 6000);
    const byDefault = await has(d, "[data-health-recipients-default]");
    await d.pickPerson(seed.STAFF[1].name).catch(() => false);
    await d.page.locator("[data-health-recipient-add='person']").first().click().catch(() => {});
    await d.page.locator("[data-health-recipient-email]").first().fill("night.desk@example.invalid").catch(() => {});
    await d.page.locator("[data-health-recipient-add='email']").first().click().catch(() => {});
    let mark = d.mark();
    await d.page.locator("[data-health-recipients-save]").first().click().catch(() => {});
    await d.settle(800);
    const put = writes(d, mark, "PUT", /^\/api\/health\/recipients$/).pop();
    const saved = await attr(d, "[data-health-recipients-said]", "data-health-recipients-said");
    results.check(KIND, id("the-recipients-replaced-as-a-set"), byDefault && !!put && put.status === 200 && say(put.body) === say({ userIds: [seed.STAFF[1].id], emails: ["night.desk@example.invalid"] }) && saved === "saved" && (await attr(d, "[data-health-recipients]", "data-health-recipients")) === "set",
      !byDefault ? "the default was not said" : "the save sent " + say(put && put.body) + " answered " + (put && put.status) + " and said " + say(saved));
    await until(d, "[data-health-threshold]", 6000);
    const share = await d.page.locator("[data-health-line='check_offs.yellow']").first().inputValue().catch(() => "");
    const dflt = await textOf(d, "[data-health-threshold='server_errors'] [data-health-default]");
    await d.page.locator("[data-health-line='server_errors.red']").first().fill("30").catch(() => {});
    mark = d.mark();
    await d.page.locator("[data-health-thresholds-save]").first().click().catch(() => {});
    await d.settle(800);
    const ok1 = writes(d, mark, "PUT", /^\/api\/health\/thresholds$/).pop();
    await d.page.locator("[data-health-line='app_open_ms.red']").first().fill("1000").catch(() => {});
    mark = d.mark();
    await d.page.locator("[data-health-thresholds-save]").first().click().catch(() => {});
    await d.settle(800);
    const refused = writes(d, mark, "PUT", /^\/api\/health\/thresholds$/).pop();
    const marked = await d.page.evaluate(() => { const el = document.querySelector("[data-health-line='app_open_ms.red']"); return el ? getComputedStyle(el).borderTopColor : ""; });
    const words = await textOf(d, "[data-health-thresholds-said]");
    results.check(KIND, id("the-lines-with-defaults-changed-and-refused"), share === "70" && dflt === d.say("Default: {0}").replace("{0}", d.say("Yellow at {0}, red at {1}").replace("{0}", "5").replace("{1}", "25"))
      && !!ok1 && ok1.status === 200 && say(ok1.body) === say({ thresholds: { server_errors: { yellow: 5, red: 30 } } }) && !!refused && refused.status === 400 && words === (lang === "es" ? "Faltan algunos datos o no son v\u00e1lidos. Revise los campos indicados y env\u00edelo de nuevo." : "Some details are missing or not valid. Check the fields named and send it again.") && /231, 76, 60|rgb\(2\d\d, \d+, \d+\)/.test(marked),
      "the share reads " + say(share) + ", the default " + say(dflt) + "; the first save sent " + say(ok1 && ok1.body) + " (" + (ok1 && ok1.status) + "), the second " + say(refused && refused.body) + " (" + (refused && refused.status) + ") and said " + say(words) + " with the box " + marked);
  });

  // 8. Reports: Make report for a range makes both, the archive lists them, and one opens as a PDF.
  await withDriver(ctx, { name: "reports", lang, persona: "superAdmin" }, async (d) => {
    await openHealth(d, "reports");
    await until(d, "[data-health-report]", 6000);
    const before = await d.page.locator("[data-health-report]").count();
    await d.page.locator("[data-health-report-from]").first().fill("2026-03-01").catch(() => {});
    await d.page.locator("[data-health-report-to]").first().fill("2026-03-15").catch(() => {});
    let mark = d.mark();
    await d.page.locator("[data-health-report-make]").first().click().catch(() => {});
    await d.settle(900);
    const post = writes(d, mark, "POST", /^\/api\/health\/reports$/).pop();
    const after = await d.page.locator("[data-health-report]").count();
    const made = await attr(d, "[data-health-report-said]", "data-health-report-said");
    mark = d.mark();
    await d.page.locator("[data-health-report-open]").first().click().catch(() => {});
    await d.settle(1200);
    const pdf = reads(d, mark, /^\/api\/health\/reports\/[^/]+\/pdf$/).pop();
    const windowOpen = await has(d, "[data-health-pdf]");
    results.check(KIND, id("make-report-the-archive-and-a-pdf"), before === 2 && !!post && post.status === 201 && say(post.body) === say({ from: "2026-03-01", to: "2026-03-15" }) && made === "made" && after === 4 && !!pdf && windowOpen,
      "the archive listed " + before + " then " + after + "; Make report sent " + say(post && post.body) + " (" + (post && post.status) + ") and said " + say(made) + "; Open PDF read " + (pdf ? pdf.path : "nothing") + (windowOpen ? "" : " and drew no window"));
    // A range the wrong way round is refused on the screen before anything is sent.
    await d.page.locator("[data-health-pdf] button[aria-label='" + d.say("Close") + "']").first().click().catch(() => {});
    await d.page.keyboard.press("Escape").catch(() => {});
    await d.page.locator("[data-health-report-from]").first().fill("2026-03-15").catch(() => {});
    await d.page.locator("[data-health-report-to]").first().fill("2026-03-01").catch(() => {});
    mark = d.mark();
    await d.page.locator("[data-health-report-make]").first().click().catch(() => {});
    await d.settle(500);
    const none = writes(d, mark, "POST", /^\/api\/health\/reports$/).length;
    const said = await textOf(d, "[data-health-report-said]");
    results.check(KIND, id("a-range-the-wrong-way-round-is-refused-first"), none === 0 && said === d.say("The last day is before the first."), "the screen sent " + none + " and said " + say(said));
  });

  // 9. Nothing measured yet, in plain words.
  await withDriver(ctx, { name: "empty", lang, persona: "superAdmin", arm: (s) => s.setScene379({ healthEmpty: true }) }, async (d) => {
    await openHealth(d, "");
    await until(d, "[data-health-number]", 6000);
    const light = await textOf(d, "[data-health-last-run]");
    const app = await textOf(d, "[data-health-number='app_open_ms'] [data-health-today]");
    await openHealth(d, "runs");
    await until(d, "[data-health-no-runs]", 5000);
    const none = await textOf(d, "[data-health-no-runs]");
    results.check(KIND, id("nothing-measured-yet-in-plain-words"), light === d.say("The robot has not reported a run yet.") && app === d.say("Not measured yet") && none === d.say("The robot has not reported a run yet."),
      "the light reads " + say(light) + ", App open time " + say(app) + ", the runs " + say(none));
  });
}

// ---- Section 2: shifts per site ----------------------------------------------------------------------------
const S2 = seed.SITES[1].id;
const SHIFTS_ON = (s) => s.setScene379({ shifts: true });
async function shiftsCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/shifts/" + x;
  const ES = lang === "es";

  // 1. A site's shifts read in the screen's language, changed and added, and saved whole as the API takes them.
  await withDriver(ctx, { name: "site-shifts", lang, arm: SHIFTS_ON }, async (d) => {
    await goHash(d, "sites/" + S2 + "/shifts");
    await until(d, "[data-site-shift]", 8000);
    const names = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-site-shift]")).map((r) => r.querySelector("td").innerText.split("\n")[0].trim()));
    await d.page.locator("[data-site-shifts-edit]").first().click().catch(() => {});
    await until(d, "[data-site-shifts-draft]", 4000);
    await d.page.locator("[data-site-shift-field='1.endTime']").first().fill("23:00").catch(() => {});
    await d.page.locator("[data-site-shift-field='1.fr']").first().fill("Deuxieme quart").catch(() => {});
    await d.page.locator("[data-site-shift-add]").first().click().catch(() => {});
    await d.page.locator("[data-site-shift-field='2.label']").first().fill("Night").catch(() => {});
    await d.page.locator("[data-site-shift-field='2.startTime']").first().fill("23:00").catch(() => {});
    await d.page.locator("[data-site-shift-field='2.endTime']").first().fill("06:00").catch(() => {});
    await d.page.locator("[data-site-shift-field='2.es']").first().fill("Noche").catch(() => {});
    for (const x of ["mon", "tue", "wed", "thu", "fri"]) await d.page.locator("[data-site-shift-row='2'] [data-site-shift-day='" + x + "']").first().click().catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-site-shifts-save]").first().click().catch(() => {});
    await d.settle(900);
    const put = writes(d, mark, "PUT", new RegExp("^/api/sites/" + S2 + "/shifts$")).pop();
    const want = { shifts: [
      { id: "00000000-0000-4000-8000-000000000301", label: "First", startTime: "06:00", endTime: "14:00", daysOfWeek: null, sortOrder: 0, active: true, translations: { es: "Primer turno", fr: "Premier quart" } },
      { id: "00000000-0000-4000-8000-000000000302", label: "Second", startTime: "14:00", endTime: "23:00", daysOfWeek: null, sortOrder: 1, active: true, translations: { es: "Segundo turno", fr: "Deuxieme quart" } },
      { label: "Night", startTime: "23:00", endTime: "06:00", daysOfWeek: "mon,tue,wed,thu,fri", sortOrder: 2, active: true, translations: { es: "Noche", fr: null } } ] };
    const after = await d.page.locator("[data-site-shift]").count();
    const night = await textOf(d, "[data-site-shift='Night']");
    results.check(KIND, id("a-site-s-shifts-read-and-saved-whole"), say(names) === say(ES ? ["Primer turno", "Segundo turno"] : ["First", "Second"]) && !!put && put.status === 200 && say(put.body) === say(want) && after === 3 && night.indexOf(d.say("the next day")) >= 0,
      "the shifts read " + say(names) + "; the save sent " + say(put && put.body) + " (" + (put && put.status) + ") and the list then held " + after + ", Night reading " + say(night));
  });

  // 2. A name used twice is refused in the API's words, under the field, and nothing is written.
  await withDriver(ctx, { name: "site-shifts-refused", lang, arm: SHIFTS_ON }, async (d) => {
    await goHash(d, "sites/" + S2 + "/shifts");
    await until(d, "[data-site-shift]", 8000);
    await d.page.locator("[data-site-shifts-edit]").first().click().catch(() => {});
    await d.page.locator("[data-site-shift-add]").first().click().catch(() => {});
    await d.page.locator("[data-site-shift-field='2.label']").first().fill("first").catch(() => {});
    await d.page.locator("[data-site-shift-field='2.startTime']").first().fill("22:00").catch(() => {});
    await d.page.locator("[data-site-shift-field='2.endTime']").first().fill("06:00").catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-site-shifts-save]").first().click().catch(() => {});
    await d.settle(800);
    const put = writes(d, mark, "PUT", new RegExp("^/api/sites/" + S2 + "/shifts$")).pop();
    const said = await textOf(d, "[data-site-shifts-said]");
    const border = await d.page.evaluate(() => { const el = document.querySelector("[data-site-shift-field='2.label']"); return el ? getComputedStyle(el).borderTopColor : ""; });
    const words = ES ? "Faltan algunos datos del turno o no son v\u00e1lidos. Cada turno necesita un nombre que no se repita, una hora de inicio y una de fin distintas, y d\u00edas de sun a sat." : "Some shift details are missing or not valid. Each shift needs a name used once, a start and an end time that differ, and days as sun to sat.";
    results.check(KIND, id("a-name-used-twice-is-refused-under-its-field"), !!put && put.status === 400 && say(put.json && put.json.keys) === say(["shifts.2.label"]) && said === words && /rgb\(2\d\d, \d+, \d+\)/.test(border) && (await has(d, "[data-site-shifts-draft]")),
      "the save was answered " + (put && put.status) + " " + say(put && put.json) + " and the panel said " + say(said) + " with the box " + border);
  });

  // 3. A site with no shifts says so, and works as before.
  await withDriver(ctx, { name: "site-shifts-none", lang }, async (d) => {
    await goHash(d, "sites/" + seed.SITES[0].id + "/shifts");
    await until(d, "[data-site-shifts-none]", 8000);
    const said = await textOf(d, "[data-site-shifts-none]");
    results.check(KIND, id("a-site-with-no-shifts-says-so"), said === d.say("This site has no named shifts. Its checklist is one list a day, as before."), "the panel said " + say(said));
  });

  // 4. Add Task offers the site's shifts, every one by default, and sends the ones picked.
  await withDriver(ctx, { name: "add-task", lang, arm: SHIFTS_ON }, async (d) => {
    await goHash(d, "sites/" + S2 + "/tasks");
    await until(d, "[data-site-task]", 8000);
    await d.clickText(d.say("Add Task"), { exact: true });
    await until(d, "[data-task-shifts]", 5000);
    const first = await attr(d, "[data-task-shifts]", "data-task-shifts");
    await d.modal().locator("input[placeholder='" + d.say("e.g. Vacuum carpets") + "']").first().fill("Wipe the reception desk").catch(() => {});
    await d.modal().locator("input[placeholder='" + d.say("e.g. Restrooms") + "']").first().fill("Lobby").catch(() => {});
    await d.page.locator("[data-task-shift='First']").first().click().catch(() => {});
    const picked = await attr(d, "[data-task-shifts]", "data-task-shifts");
    const mark = d.mark();
    await d.modal().getByRole("button", { name: d.say("Create"), exact: true }).first().click().catch(() => {});
    await d.settle(900);
    const post = writes(d, mark, "POST", new RegExp("^/api/sites/" + S2 + "/tasks$")).pop();
    results.check(KIND, id("add-task-offers-the-shifts-every-one-by-default"), first === "all" && picked === "Second" && !!post && say(post.body && post.body.shiftLabels) === say(["Second"]),
      "the picker read " + say(first) + " then " + say(picked) + "; Create sent " + say(post && post.body));
  });

  // 5. Edit Task opens on the task's own shifts and sends the change.
  await withDriver(ctx, { name: "edit-task", lang, arm: SHIFTS_ON }, async (d) => {
    await goHash(d, "sites/" + S2 + "/tasks");
    await until(d, "[data-site-task='t379-2']", 8000);
    const line = await attr(d, "[data-site-task-shifts]", "data-site-task-shifts");
    await d.page.locator("[data-site-task='t379-2']").first().click().catch(() => {});
    await until(d, "[data-task-shifts]", 5000);
    const opened = await attr(d, "[data-task-shifts]", "data-task-shifts");
    await d.page.locator("[data-task-shift='First']").first().click().catch(() => {});
    const now = await attr(d, "[data-task-shifts]", "data-task-shifts");
    const mark = d.mark();
    await d.modal().getByRole("button", { name: d.say("Save Changes"), exact: true }).first().click().catch(() => {});
    await d.settle(900);
    const patch = writes(d, mark, "PATCH", new RegExp("^/api/sites/" + S2 + "/tasks/t379-2$")).pop();
    results.check(KIND, id("edit-task-opens-on-its-shifts-and-sends-the-change"), line === "Second" && opened === "Second" && now === "all" && !!patch && patch.body && patch.body.shiftLabels === null,
      "the row read " + say(line) + ", the window opened on " + say(opened) + " and read " + say(now) + "; the save sent " + say(patch && patch.body && patch.body.shiftLabels));
  });

  // 6. Checklist Results by shift: each run with its own ring, who was on it and what they did, and the grey
  //    line for a daily item an earlier shift did.
  await withDriver(ctx, { name: "checklist-by-run", lang, arm: SHIFTS_ON }, async (d) => {
    await goHash(d, "checklist/" + S2 + "/today");
    await until(d, "[data-cr-run]", 10000);
    await d.settle(500);
    const groups = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-group]")).map((g) => ({ key: g.getAttribute("data-cr-group"), run: g.getAttribute("data-cr-run"), due: g.getAttribute("data-cr-due"), done: g.getAttribute("data-cr-done"),
      who: (g.querySelector("[data-cr-who]") || {}).innerText || "", head: (g.querySelector("div") || {}).innerText || "" })));
    const second = await d.page.evaluate(() => { const box = document.querySelector("[data-cr-list-group='Second']"); if (!box) return null; const card = box.parentElement; return Array.from(card.querySelectorAll("[data-cr-task]")).map((r) => [r.getAttribute("data-cr-task"), r.getAttribute("data-cr-task-done")]); });
    const grey = await textOf(d, "[data-cr-list-group='Second'] ~ div [data-cr-earlier='t379-1']");
    const g1 = groups.find((g) => g.key === "First") || {}, g2 = groups.find((g) => g.key === "Second") || {};
    // Repeating work stays the site's: no ring of its own, and listed under Whole site.
    const rest = !groups.some((g) => g.key === "*") && (await d.page.evaluate(() => { const box = document.querySelector("[data-cr-list-group='*']"); return !!box && !!box.parentElement.querySelector("[data-cr-task='t379-5']"); }));
    const clock = await d.page.evaluate((tag) => new Date("2026-03-17T13:10:00.000Z").toLocaleTimeString(tag, { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }), ES ? "es-US" : "en-US");
    const greyWant = d.say("Done by {0} on the {1} shift at {2}. It is due again on this shift.").replace("{0}", "Elena Barbosa").replace("{1}", ES ? "Primer turno" : "First").replace("{2}", clock);
    results.check(KIND, id("each-run-with-its-own-ring-who-and-the-grey-line"), g1.run === "1" && g1.due === "3" && g1.done === "3" && g2.run === "1" && g2.due === "3" && g2.done === "2" && g1.who.indexOf("Elena Barbosa") >= 0 && g2.who.indexOf("Tomasz Wisniewski") >= 0 && g2.who.indexOf("Elena") < 0
      && !!rest && say(second) === say([["t379-1", "0"], ["t379-2", "1"], ["t379-4", "1"]].sort()) && grey.replace(/\s+/g, " ") === greyWant.replace(/\s+/g, " "),
      "the groups read " + say(groups) + "; the Second shift's tasks " + say(second) + " and its grey line " + say(grey) + " where it is " + say(greyWant));
  });

  // 7. A guard: a site whose checklist is set out by its blocks' shifts, with no named shifts, reads as before.
  await withDriver(ctx, { name: "checklist-blocks", lang, arm: (s) => s.setChecklist358(true) }, async (d) => {
    await goHash(d, "checklist/" + seed.SITES[0].id + "/yesterday");
    await until(d, "[data-cr-group]", 10000);
    await d.settle(500);
    const keys = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-group]")).map((g) => g.getAttribute("data-cr-group") + (g.getAttribute("data-cr-run") ? ":run" : "")));
    results.check(KIND, id("a-site-with-no-named-shifts-reads-as-before-guard"), keys.indexOf("Day") >= 0 && keys.indexOf("Night") >= 0 && keys.every((k) => k.indexOf(":run") < 0), "the groups read " + say(keys));
  });
}

// ---- Section 3: signatures ---------------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const PHOTO = path.join(__dirname, "..", "fixtures", "photo.jpg");
const WARNED = "Rashid Haddad";
async function openRequest(d, id) {
  await goHash(d, "hr/signatures/" + id);
  await until(d, "[data-signature-request-window='" + id + "']", 8000);
  await d.settle(400);
}
async function signaturesCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/signatures/" + x;
  const ES = lang === "es";

  // 1. A paper signature, with the signed page's photo: what happens next is said first, the request closes as
  //    signed on paper, and the final copy's email is said.
  await withDriver(ctx, { name: "paper", lang }, async (d, stubs) => {
    await openRequest(d, "sr-3");
    await d.page.locator("[data-paper-record-open]").first().click().catch(() => {});
    await until(d, "[data-paper-next]", 4000);
    const next = await textOf(d, "[data-paper-next]");
    await d.page.locator("[data-paper-file]").first().setInputFiles(PHOTO).catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-paper-save]").first().click().catch(() => {});
    await until(d, "[data-paper-recorded]", 5000);
    await d.settle(600);
    const post = writes(d, mark, "POST", /^\/api\/signatures\/sr-3\/record$/).pop();
    const sent = (stubs.sent379().filter((x) => x.what === "record").pop() || {}).body || {};
    const said = await textOf(d, "[data-paper-recorded]");
    const state = await attr(d, "[data-signature-request-window='sr-3'] [data-signature-state]", "data-signature-state");
    const where = await textOf(d, "[data-signature-request-window='sr-3']");
    results.check(KIND, id("a-paper-signature-recorded-with-the-signed-page"), next === d.say("Once saved, the request closes and the warning records it. Its final copy is emailed to {0}, with the issuer copied.").replace("{0}", WARNED)
      && !!post && post.status === 200 && sent.multipart === true && sent.body && sent.body.outcome === "paper" && !sent.body.witnessName && !!sent.file && sent.file.name === "photo.jpg"
      && said === d.say("Recorded. The final copy was emailed to {0}, with the issuer copied.").replace("{0}", WARNED) && state === "signed" && where.indexOf(d.say("on paper")) >= 0,
      "the window said " + say(next) + "; the record sent " + say(sent) + " (" + (post && post.status) + "), then said " + say(said) + " with the request " + say(state));
  });

  // 2. A refusal witnessed in person, with no email on file: the witness is sent, and the window says the copy
  //    was not mailed.
  await withDriver(ctx, { name: "declined", lang, arm: (s) => s.setScene379({ finalMail: "no_email" }) }, async (d, stubs) => {
    await openRequest(d, "sr-3");
    await d.page.locator("[data-paper-record-open]").first().click().catch(() => {});
    await d.page.locator("[data-paper-outcome='declined']").first().check().catch(() => {});
    await d.page.locator("[data-paper-witness]").first().fill("  Marcus   Ferreira ").catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-paper-save]").first().click().catch(() => {});
    await until(d, "[data-paper-recorded]", 5000);
    await d.settle(600);
    const post = writes(d, mark, "POST", /^\/api\/signatures\/sr-3\/record$/).pop();
    const said = await textOf(d, "[data-paper-recorded]");
    const win = await textOf(d, "[data-signature-request-window='sr-3']");
    results.check(KIND, id("a-refusal-witnessed-in-person-with-no-email-on-file"), !!post && post.status === 200 && say(post.body) === say({ outcome: "declined", witnessName: "Marcus Ferreira" })
      && said === d.say("Recorded. No email on file, so the signed copy was not mailed. Deliver it another way.") && win.indexOf(d.say("Refused in person, witnessed by {0}").replace("{0}", "Marcus Ferreira")) >= 0,
      "the record sent " + say(post && post.body) + " (" + (post && post.status) + ") and the window said " + say(said));
  });

  // 3. A request closed meanwhile is refused in the API's words and nothing is drawn as recorded.
  await withDriver(ctx, { name: "not-open", lang, arm: (s) => s.setScene379({ closedMeanwhile: true }) }, async (d) => {
    await openRequest(d, "sr-3");
    await d.page.locator("[data-paper-record-open]").first().click().catch(() => {});
    await d.page.locator("[data-paper-save]").first().click().catch(() => {});
    await until(d, "[data-paper-refused]", 5000);
    const code = await attr(d, "[data-paper-refused]", "data-paper-refused");
    const text = await textOf(d, "[data-paper-refused]");
    const words = ES ? "Esta solicitud ya no espera una firma" : "This request is no longer waiting for a signature";
    results.check(KIND, id("a-request-closed-meanwhile-is-refused-in-words"), code === "signatures.notOpen" && text === words && !(await has(d, "[data-paper-recorded]")), "the window said " + say([code, text]));
  });

  // 4. A guard: a supervisor who did not send the warning is offered nothing to record.
  await withDriver(ctx, { name: "supervisor", lang, persona: "supervisor" }, async (d) => {
    await openRequest(d, "sr-3");
    const offered = await has(d, "[data-paper-record]");
    results.check(KIND, id("a-supervisor-who-did-not-send-it-is-offered-nothing-guard"), !offered && (await has(d, "[data-signature-request-window='sr-3']")), offered ? "the supervisor is offered Record a paper signature" : "the request did not open");
  });

  // 5. signature_signed in the notification settings, by its name, with who it goes to in place of the
  //    controls that add people.
  await withDriver(ctx, { name: "notice-settings", lang }, async (d) => {
    await d.goto("settings");
    await d.settle(400);
    await d.clickText(d.say("Who gets told"), { exact: true });
    await until(d, "[data-notice-type='signature_signed']", 6000);
    const card = d.page.locator("div").filter({ has: d.page.locator("[data-notice-type='signature_signed']") }).last();
    const name = await textOf(d, "[data-notice-type='signature_signed']");
    const note = await textOf(d, "[data-notice-named='signature_signed']");
    const adds = await card.locator("[data-person-pick-field], input[type='email']").count();
    results.check(KIND, id("signature-signed-in-the-notification-settings"), name === d.say("Someone signed a warning on their phone") && note === d.say("Goes to the person who sent the warning to sign. When they are no longer an admin or a supervisor, every admin is told. Nobody is added here.") && adds === 0,
      "the card reads " + say([name, note]) + " with " + adds + " control(s) to add people");
  });

  // 6. A signed warning's notice opens its request, from the bell and from the phone's alert on this computer.
  await withDriver(ctx, { name: "notice-opens", lang }, async (d, stubs) => {
    stubs.addNotices([{ id: "n-379-signed", title: "Rashid Haddad signed a warning", body: "The signed copy is on the record.", subjectType: "signature_signed", subjectId: "sr-3", link: null, isRead: false, createdAt: "2026-03-18T01:20:00.000Z" }]);
    await goHash(d, "overview");
    await d.page.evaluate((title) => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.getAttribute("title") === title && x.offsetParent !== null); if (b) b.click(); }, d.say("Notifications"));
    await d.settle(500);
    await d.page.evaluate(() => { const row = Array.from(document.querySelectorAll("button")).find((b) => (b.innerText || "").indexOf("Rashid Haddad signed a warning") >= 0); if (row) row.click(); });
    await until(d, "[data-signature-request-window='sr-3']", 5000);
    const hash = await d.page.evaluate(() => window.location.hash);
    const sw = await d.page.evaluate(async () => (await fetch("/sw.js")).text());
    const box = { self: { addEventListener() {}, location: { origin: "" } } };
    vm.createContext(box);
    try { vm.runInContext(sw, box); } catch (e) { /* placeOf is read below */ }
    const place = typeof box.placeOf === "function" ? [box.placeOf("signature_signed", "sr-3"), box.placeOf("health_alert", null)] : [];
    results.check(KIND, id("a-signed-warning-s-notice-opens-its-request"), hash === "#hr/signatures/sr-3" && (await has(d, "[data-signature-request-window='sr-3']")) && say(place) === say(["hr/signatures/sr-3", "health"]),
      "the bell's notice opened " + say(hash) + " and the alert's places are " + say(place));
  });
}

// ---- Section 4: the test site and what Round 6 left -------------------------------------------------------
const S3 = seed.SITES[2];
const lastPrint = async (d, before) => { const all = await d.prints(); return all.slice(before).pop() || null; };
async function round6Cases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/round6/" + x;

  // 1. The test site is marked TEST where sites are listed and picked.
  await withDriver(ctx, { name: "test-site", lang, arm: (s) => s.setScene379({ testSite: true }) }, async (d) => {
    await d.goto("sites");
    await until(d, "[data-site-test]", 6000);
    const listed = await d.page.locator("[data-site-test='" + S3.id + "']").count();
    const others = await d.page.locator("[data-site-test]").count();
    await goHash(d, "checklist/all/today");
    await until(d, "[data-cr-site-pick]", 6000);
    const options = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-site-pick] option")).map((o) => o.textContent.trim()));
    await goHash(d, "sites/" + S3.id);
    await until(d, "[data-site-test='" + S3.id + "']", 6000);
    const header = await d.page.locator("[data-site-test='" + S3.id + "']").count();
    const mark = d.say("TEST");
    results.check(KIND, id("the-test-site-is-marked-where-sites-are-listed-and-picked"), listed === 1 && others === 1 && options.indexOf(S3.name + " (" + mark + ")") >= 0 && options.indexOf(seed.SITES[0].name) >= 0 && header === 1,
      "the Sites list marks " + others + " site(s), " + listed + " of them the test site; the picker reads " + say(options) + "; the site's page marks it " + header + " time(s)");
  });

  // 2. A person's printed report reads the profile again first, so its photo is a fresh link.
  await withDriver(ctx, { name: "print-profile", lang, arm: (s) => s.setPictures372({}) }, async (d, stubs) => {
    await goHash(d, "staff/u-staff-5");
    await until(d, "[data-print='profile-report']", 8000);
    await d.settle(400);
    stubs.pictures372Advance(61);
    const before = (await d.prints()).length;
    const mark = d.mark();
    await d.page.locator("[data-print='profile-report']").first().click().catch(() => {});
    await d.settle(1200);
    const again = reads(d, mark, /^\/api\/users\/profile\/u-staff-5$/).pop();
    const fresh = again && again.json && again.json.user ? again.json.user.profilePhotoUrl : null;
    const pr = await lastPrint(d, before);
    const html = pr ? pr.html : "";
    results.check(KIND, id("a-person-s-report-prints-a-fresh-photo"), !!fresh && html.indexOf(fresh.replace(/&/g, "&amp;")) >= 0 || (!!fresh && html.indexOf(fresh) >= 0),
      !again ? "Print Report read the profile no second time" : !pr ? "nothing was printed" : "the print holds no photo link of the read made for it: " + say((html.match(/storage\.example\.invalid[^"]*/g) || []).slice(0, 2)));
  });

  // 3. A timeline record, a site's chat and an inspection read their record again before they print.
  await withDriver(ctx, { name: "print-records", lang, arm: (s) => { s.setScene379({ freshLinks: true }); s.setStep278(true); } }, async (d) => {
    const out = {};
    // A person's timeline record.
    await goHash(d, "staff/u-staff-5");
    await d.clickText(d.say("Timeline"), { exact: true });
    await until(d, "[data-tl-entry]", 6000);
    await d.page.locator("[data-tl-entry] > div:nth-child(2)").first().click().catch(() => {});
    await until(d, "[data-print='timeline-detail']", 5000);
    let before = (await d.prints()).length;
    await d.page.locator("[data-print='timeline-detail']").first().click().catch(() => {});
    await d.settle(1000);
    let pr = await lastPrint(d, before);
    out.detail = pr ? (pr.html.match(/detail-379\.jpg\?read=(\d+)/) || [])[1] || "none" : "no print";
    // A site's chat.
    await goHash(d, "sites/" + seed.SITES[0].id + "/chat");
    await until(d, "[data-print='site-chat']", 6000);
    await d.settle(500);
    before = (await d.prints()).length;
    await d.page.locator("[data-print='site-chat']").first().click().catch(() => {});
    await d.settle(1000);
    pr = await lastPrint(d, before);
    out.chat = pr ? (pr.html.match(/face\.jpg\?read=(\d+)/) || [])[1] || "none" : "no print";
    // An inspection.
    await goHash(d, "inspections/insp-4");
    await until(d, "[data-print='inspection']", 8000);
    await d.settle(500);
    before = (await d.prints()).length;
    await d.page.locator("[data-print='inspection']").first().click().catch(() => {});
    await d.settle(1500);
    pr = await lastPrint(d, before);
    out.inspection = pr ? (pr.html.match(/insp-4-[a-e]\.svg\?read=(\d+)/) || [])[1] || "none" : "no print";
    results.check(KIND, id("records-read-again-before-they-print"), out.detail === "2" && out.chat === "2" && out.inspection === "2",
      "the prints drew the links of read " + say(out) + " where each is the second read, the one made for the print");
  });

  // 4. The kept records read the record again at Print.
  await withDriver(ctx, { name: "print-kept", lang }, async (d) => {
    await d.goto("reports");
    await until(d, "[data-report-group]", 8000);
    const card = d.page.locator("[data-report-group] > div:nth-child(2) > div").filter({ has: d.page.getByText(d.say("Inspections"), { exact: true }) });
    await card.getByRole("button").first().click().catch(() => {});
    await until(d, "[data-kept-record]", 5000);
    await d.page.locator("[data-kept-record] select").first().selectOption(seed.SITES[0].id).catch(() => {});
    await d.page.locator('[data-kept-record] [role="status"]').filter({ hasText: /\d/ }).first().waitFor({ timeout: 6000 }).catch(() => {});
    const mark = d.mark();
    await d.page.locator("[data-kept-print]").first().click().catch(() => {});
    await d.settle(1500);
    const list = reads(d, mark, /^\/api\/inspections\/scheduled$/).length;
    results.check(KIND, id("a-kept-record-is-read-again-at-print"), list >= 1, "Print read the list " + list + " time(s)");
  });

  // 5. An inspection's CSV writes how many photos each row has, and no photo link.
  await withDriver(ctx, { name: "inspection-csv", lang, arm: (s) => s.setStep278(true) }, async (d) => {
    await goHash(d, "inspections/insp-4");
    await until(d, "[data-print='inspection']", 8000);
    await d.clearCaptures();
    await d.page.locator("[data-inspection-csv]").first().click().catch(() => {});
    await d.settle(800);
    const file = (await d.downloads()).pop() || null;
    const body = file ? String(file.body || "").replace(/^\ufeff/, "") : "";
    const lines = body.split(/\r?\n/).filter(Boolean);
    const head = lines[0] || "";
    const counts = lines.slice(1).map((l) => l.split(",").pop().replace(/"/g, "")).filter((x) => x !== "");
    results.check(KIND, id("an-inspection-s-csv-counts-photos-and-holds-no-link"), !!file && /Photos"?$/.test(head) && body.indexOf("http") < 0 && counts.length >= 3 && counts.every((x) => /^\d+$/.test(x)),
      !file ? "Export CSV saved no file" : "the file reads " + say(lines.slice(0, 3)));
  });

  // 6. New maintenance request asks who it goes to for the building typed, and sends a clientId that a
  //    second send after a lost answer repeats, so the request is filed once.
  await withDriver(ctx, { name: "maintenance", lang, arm: (s) => s.setScene379({ lostAnswer: true }) }, async (d, stubs) => {
    await d.goto("maintenance");
    await d.clickText(d.say("New maintenance request"), { exact: true });
    await until(d, "[data-maint-new]", 5000);
    await d.page.locator("[data-maint-field='siteId']").first().selectOption(seed.SITES[0].id).catch(() => {});
    await d.page.locator("[data-maint-field='building']").first().fill("South Wing").catch(() => {});
    await d.settle(900);
    const asked = stubs.sent379().filter((x) => x.what === "contacts").map((x) => x.body.building);
    const cc = await attr(d, "[data-maint-cc]", "data-maint-cc");
    await d.page.locator("[data-maint-field='category']").first().selectOption({ index: 1 }).catch(() => {});
    await d.page.locator("[data-maint-field='urgency']").first().selectOption({ index: 1 }).catch(() => {});
    await d.page.locator("[data-maint-field='description']").first().fill("The south corridor door does not close.").catch(() => {});
    const send = d.page.locator("[data-maint-send]");
    const mark = d.mark();
    await send.last().click().catch(() => {});
    await d.settle(900);
    await send.last().click().catch(() => {});
    await d.settle(1200);
    const posts = writes(d, mark, "POST", /^\/api\/maintenance-requests$/);
    const ids = stubs.sent379().filter((x) => x.what === "maintenance").map((x) => x.body.clientId);
    const closed = !(await has(d, "[data-maint-new]"));
    results.check(KIND, id("a-request-asks-who-it-goes-to-and-is-filed-once"), asked.indexOf("South Wing") >= 0 && cc === "office.copy@example.invalid" && posts.length === 2 && ids.length === 2 && !!ids[0] && ids[0] === ids[1] && /^[A-Za-z0-9_-]{8,64}$/.test(ids[0]) && posts[1].status === 200 && closed,
      "the window asked for " + say(asked) + " with the copy " + say(cc) + "; it sent " + posts.length + " filing(s) answered " + say(posts.map((c) => c.status)) + " with the clientIds " + say(ids) + (closed ? "" : " and stayed open"));
  });
}

// ctx.only, when a runner names sections, keeps the run to them.
async function run(ctx) {
  const want = (x) => !ctx.only || ctx.only.indexOf(x) >= 0;
  for (const lang of LANGS) {
    if (want("health")) await healthCases(ctx, lang);
    if (want("shifts")) await shiftsCases(ctx, lang);
    if (want("signatures")) await signaturesCases(ctx, lang);
    if (want("round6")) await round6Cases(ctx, lang);
  }
}

module.exports = { run };
