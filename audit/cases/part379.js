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
    const row = picked ? await d.capabilityRow(d.say(HEALTH_ROW)) : "unpicked";
    results.check(KIND, id("an-ordinary-admin-is-offered-no-grant-guard"), row === null, row === "unpicked" ? "the person picker did not offer the custodial lead" : "an ordinary admin is shown the Health page's row");
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

// ctx.only, when a runner names sections, keeps the run to them.
async function run(ctx) {
  const want = (x) => !ctx.only || ctx.only.indexOf(x) >= 0;
  for (const lang of LANGS) {
    if (want("health")) await healthCases(ctx, lang);
  }
}

module.exports = { run };
