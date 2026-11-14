// Round 11 (part 397): a week of zeros, the API's brief, findings without the inspection, and the test site and a
// supervisor, against the stub as the API is built at ocsa-api main ff35991 (audit/part397-stub.js, over
// audit/part393-stub.js), armed as the API is built (setApiAsBuilt) with Round 2's file log (setStep353) and part
// 364's answers (setStep364). Each case runs in English and in Spanish, and each fails on main as it stood at
// 17d1abf unless its name says it is a guard.
//
//   zeros      a site whose week had steps due and none done: its card on Checklist Results draws the week flat with
//              its words and no line from the chart library, and so does the site over several days; its day's
//              checks by 15 minutes are drawn flat and its zones listed with 0%; and nothing on the page throws.
//              A guard: a site with steps done still draws its line
//   brief      Copy for Claude on an incident copies the API's brief exactly as it answers, a number's and an
//              outage's; a skipped step reads its reason in the run-through's window. Guards: a brief that does
//              not load is built from the page's reads, and a number's drill-down sheet keeps its own brief
//   findings   a finding's window takes its topics from the list and its owners from the finding, with no read of
//              the inspection; Choose and Record only on a finding the API says the reader may decide; the tab's
//              numbers from counts, the same whatever the filter; each finding named by its title; the analytics
//              export names a training follow-up's topic. Guards: a supervisor at the finding's site may choose,
//              and the inspection's page and a corrective action name the topic from the follow-up
//   testsite   a supervisor whose site list leaves the test site out: a shift there keeps its site in the edit
//              window. Guards: every page the supervisor sees opens with nothing thrown, the API's refusal of a
//              change there is drawn in its own words, and an admin still reads the test site
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");
const { parseCsv } = require("./exports");

const KIND = "part397";
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
const count = async (d, sel) => d.page.locator(sel).count();
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: ms || 6000 }).catch(() => {}); return has(d, sel); };
const attr = async (d, sel, name) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? l.getAttribute(name) : null; };
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
const click = async (d, sel) => { await d.page.locator(sel).first().click().catch(() => {}); await d.settle(300); };
const reads = (d, mark, re) => d.callsSince(mark).filter((c) => c.method === "GET" && re.test(c.path));
const writes = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path));
// What the page threw, the console's lines about a refused read left aside (a supervisor's refused reads predate this
// round and are drawn on their pages).
const thrown = (d, from) => d.pageErrors.slice(from || 0).filter((e) => !/^console: Failed to load resource/.test(e));

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

// ---- Section 1: a week of zeros ------------------------------------------------------------------------------------
const S1 = seed.SITES[0].id;
const S2 = seed.SITES[1].id;
async function zeroCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/zeros/" + x;
  const armed = (s) => { s.setChecklist358(true); s.setScene397({ zeroWeek: S2 }); };
  const card = "[data-cr-site-card='" + S2 + "']";
  const LIB_LINE = ".apexcharts-area-series, .apexcharts-line-series";

  // 1. The card of a site whose week had steps due and none done draws the week flat, a dot a day, with its words, and
  //    no line from the chart library; its ring still reads 0%, and the page throws nothing.
  await withDriver(ctx, { name: "card", lang, arm: armed }, async (d) => {
    await goHash(d, "checklist/all/today");
    await until(d, card, 8000);
    await d.settle(1500);
    const flat = await attr(d, card + " [data-chart-flat]", "data-chart-flat");
    const said = await textOf(d, card + " [data-chart-flat-text]");
    const lib = await count(d, card + " " + LIB_LINE);
    const ring = await textOf(d, card);
    const errors = thrown(d);
    const want = d.say("0% done on every day with steps due");
    results.check(KIND, id("a-week-of-zeros-is-drawn-flat-on-its-card"), flat === "7" && said === want && lib === 0 && ring.indexOf("0%") >= 0 && errors.length === 0,
      "the card's flat week " + say(flat) + " (want 7 points), its words " + say(said) + " (want " + say(want) + "), " + lib + " line(s) from the chart library; page errors " + say(errors.slice(0, 3)));
  });

  // 2. The same site over several days draws Done each day flat with the same words, and the page throws nothing.
  await withDriver(ctx, { name: "range", lang, arm: armed }, async (d) => {
    await goHash(d, "checklist/" + S2 + "/last7");
    await until(d, "[data-cr-range-chart]", 8000);
    await d.settle(1500);
    const flat = await attr(d, "[data-cr-range-chart] [data-chart-flat]", "data-chart-flat");
    const said = await textOf(d, "[data-cr-range-chart] [data-chart-flat-text]");
    const lib = await count(d, "[data-cr-range-chart] .apexcharts-series");
    const errors = thrown(d);
    const want = d.say("0% done on every day with steps due");
    results.check(KIND, id("a-week-of-zeros-is-drawn-flat-over-several-days"), Number(flat) >= 2 && said === want && lib === 0 && errors.length === 0,
      "Done each day's flat line " + say(flat) + ", its words " + say(said) + " (want " + say(want) + "), " + lib + " series from the chart library; page errors " + say(errors.slice(0, 3)));
  });

  // 3. Its day: the checks by 15 minutes, all 0, drawn flat with Every value is 0., and each zone listed at 0%.
  await withDriver(ctx, { name: "day", lang, arm: armed }, async (d) => {
    await goHash(d, "checklist/" + S2 + "/today");
    await until(d, "[data-cr-buckets]", 8000);
    await d.settle(1200);
    const buckets = await attr(d, "[data-cr-buckets]", "data-cr-buckets");
    const flat = await textOf(d, "[data-cr-buckets] [data-chart-flat-text]");
    const zones = await attr(d, "[data-cr-zone-chart] [data-chart-zero]", "data-chart-zero");
    const zoneText = await textOf(d, "[data-cr-zone-chart] [data-chart-zero]");
    const lib = await count(d, "[data-cr-buckets] .apexcharts-bar-area, [data-cr-zone-chart] .apexcharts-bar-area");
    const errors = thrown(d);
    const every = d.say("Every value is 0.");
    results.check(KIND, id("a-day-of-zeros-draws-its-checks-flat-and-lists-its-zones"), !!buckets && /^0(,0)*$/.test(buckets) && flat === every && Number(zones) >= 1 && zoneText.indexOf("0%") >= 0 && zoneText.indexOf(every) >= 0 && lib === 0 && errors.length === 0,
      "the checks by 15 minutes " + say(buckets) + " read " + say(flat) + "; the zones " + say(zones) + " read " + say(zoneText) + "; " + lib + " bar(s) from the chart library; page errors " + say(errors.slice(0, 3)));
  });

  // 4. A guard: a site with steps done still draws its line on its card.
  await withDriver(ctx, { name: "still-drawn", lang, arm: armed }, async (d) => {
    await goHash(d, "checklist/all/today");
    await until(d, "[data-cr-site-card='" + S1 + "'] " + LIB_LINE, 8000);
    await d.settle(600);
    const lib = await count(d, "[data-cr-site-card='" + S1 + "'] " + LIB_LINE);
    const flat = await has(d, "[data-cr-site-card='" + S1 + "'] [data-chart-flat]");
    results.check(KIND, id("guard-a-site-with-steps-done-draws-its-line"), lib >= 1 && !flat, "the first site's card holds " + lib + " line(s)" + (flat ? " and a flat week" : ""));
  });
}

// ---- Section 2: the API's brief ------------------------------------------------------------------------------------------
const NUMBER_INCIDENT = "00000000-0000-4000-8000-000000000701";
const OPEN_OUTAGE = "00000000-0000-4000-8000-000000000711";
const COMMIT = "c0ffee5eed0123456789abcdef0123456789abcd";
const SKIP_REASON = "Send a warning to sign failed before it, so no warning was waiting for a paper signature.";
const ASCII = /^[\n\x20-\x7e]*$/;
async function letClipboard(d) { await d.page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(d.page.url()).origin }).catch(() => {}); }
const clipboard = (d) => d.page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
async function copyAt(d, at) {
  await d.waitToastGone(4000);
  await d.page.evaluate(() => navigator.clipboard.writeText("").catch(() => {}));
  await d.page.locator("[data-copy-for-claude-button='" + at + "']").first().click().catch(() => {});
  const toast = await d.waitToast(5000).then(() => d.toast()).catch(() => null);
  await d.settle(200);
  return { toast, text: await clipboard(d) };
}
const linesOf = (text) => String(text || "").split("\n");
async function openHealth(d, tab) {
  await goHash(d, "health" + (tab ? "/" + tab : ""));
  await until(d, "[data-health-page]", 8000);
  await d.settle(500);
}
async function briefCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/brief/" + x;
  const copied = (d) => d.say("Copied for Claude. Paste it into the chat.");

  // 1. A number's incident: the API's brief, read once and copied exactly as it answered, in English and ASCII on
  //    either screen, with the toast in the screen's language.
  await withDriver(ctx, { name: "incident", lang, persona: "superAdmin" }, async (d, stubs) => {
    await openHealth(d, "incidents");
    await until(d, "[data-copy-for-claude-button='" + NUMBER_INCIDENT + "']", 8000);
    await letClipboard(d);
    const mark = d.mark();
    const { toast, text } = await copyAt(d, NUMBER_INCIDENT);
    const read = reads(d, mark, /^\/api\/health\/incidents\/[^/]+\/brief$/);
    const served = stubs.briefs397().filter((b) => b.id === NUMBER_INCIDENT).pop();
    const L = linesOf(text);
    const want = ["OCSA Health brief", "Incident: " + NUMBER_INCIDENT, "Kind: number, source health", "Key: server_errors", "How it is worked out: Every answer of 500 or more the API gave that day, summed from route_timings across every route.", "API commit: " + COMMIT];
    const missing = want.filter((w) => L.indexOf(w) < 0);
    results.check(KIND, id("a-number-incident-copies-the-api-s-brief-as-it-answers"), read.length === 1 && !!served && text === served.text && missing.length === 0 && ASCII.test(text) && toast === copied(d),
      "the brief was read " + read.length + " time(s); the clipboard " + (served && text === served.text ? "matches" : "does not match") + " what the API answered, misses " + say(missing) + "; the toast " + say(toast) + "; it reads " + say(text.slice(0, 300)));
  });

  // 2. An outage's brief: its monitor with its UptimeRobot id, its reason and how long it has been down, as answered.
  await withDriver(ctx, { name: "outage", lang, persona: "superAdmin", arm: (s) => s.setScene393({ uptime: true }) }, async (d, stubs) => {
    await openHealth(d, "incidents");
    await until(d, "[data-copy-for-claude-button='" + OPEN_OUTAGE + "']", 8000);
    await letClipboard(d);
    const { text } = await copyAt(d, OPEN_OUTAGE);
    const served = stubs.briefs397().filter((b) => b.id === OPEN_OUTAGE).pop();
    const L = linesOf(text);
    const want = ["Kind: monitor, source uptimerobot", "Monitor: OCSA scheduled jobs (UptimeRobot id 804609605)", "Reason: 503 Service Unavailable", "How long: 25 minutes so far, still down"];
    const missing = want.filter((w) => L.indexOf(w) < 0);
    results.check(KIND, id("an-outage-copies-the-api-s-brief-as-it-answers"), !!served && text === served.text && missing.length === 0, (served && text === served.text ? "" : "the clipboard is not what the API answered; ") + "missing " + say(missing) + "; it reads " + say(text.slice(0, 300)));
  });

  // 3. A guard: a brief that does not load is built from the page's own reads, as part 393 built it.
  await withDriver(ctx, { name: "brief-fails", lang, persona: "superAdmin", arm: (s) => s.setScene397({ briefFails: true }) }, async (d) => {
    await openHealth(d, "incidents");
    await until(d, "[data-copy-for-claude-button='" + NUMBER_INCIDENT + "']", 8000);
    await letClipboard(d);
    const { toast, text } = await copyAt(d, NUMBER_INCIDENT);
    const L = linesOf(text);
    const want = ["OCSA Health brief", "Incident: " + NUMBER_INCIDENT, "Timeline (1):", "Number: server_errors", "API commit: " + COMMIT];
    const missing = want.filter((w) => L.indexOf(w) < 0);
    const build = L.some((x) => x.indexOf("Dashboard build: ") === 0);
    results.check(KIND, id("guard-a-brief-that-fails-is-built-from-the-page"), missing.length === 0 && build && toast === copied(d), "missing " + say(missing) + (build ? "" : ", no Dashboard build line") + "; the toast " + say(toast));
  });

  // 4. A guard: a number's drill-down sheet keeps its own brief, with no brief read (the API has none for a number yet).
  await withDriver(ctx, { name: "drill-down", lang, persona: "superAdmin" }, async (d) => {
    await openHealth(d);
    await until(d, "[data-health-number='server_errors']", 8000);
    await letClipboard(d);
    await d.page.locator("[data-health-number='server_errors']").first().click().catch(() => {});
    await until(d, "[data-copy-for-claude-button='server_errors']", 6000);
    const mark = d.mark();
    const { text } = await copyAt(d, "server_errors");
    const read = reads(d, mark, /\/brief$/);
    const L = linesOf(text);
    results.check(KIND, id("guard-a-drill-down-keeps-its-own-brief"), read.length === 0 && L[0] === "OCSA Health brief" && L.indexOf("Number: server_errors") >= 0 && L.every((x) => x.indexOf("Incident: ") !== 0),
      "brief reads " + read.length + "; it reads " + say(text.slice(0, 200)));
  });

  // 5. A skipped step reads the robot's reason in the run-through's window.
  await withDriver(ctx, { name: "skipped", lang, persona: "superAdmin" }, async (d) => {
    await openHealth(d, "runs");
    await until(d, "[data-health-run-row]", 6000);
    await d.page.locator("table tbody tr").filter({ has: d.page.locator("[data-health-run-row='00000000-0000-4000-8000-000000000902']") }).first().click().catch(() => {});
    await until(d, "[data-health-run] [data-health-journey]", 6000);
    await d.settle(400);
    const step = "[data-health-run] [data-health-step-outcome='skipped']";
    const reason = await textOf(d, step + " [data-health-step-reason]");
    const want = fill(d.say("Why it was skipped: {0}"), SKIP_REASON);
    const others = await count(d, "[data-health-run] [data-health-step-outcome='passed'] [data-health-step-reason], [data-health-run] [data-health-step-outcome='failed'] [data-health-step-reason]");
    results.check(KIND, id("a-skipped-step-reads-its-reason"), reason === want && others === 0, "the skipped step reads " + say(reason) + " (want " + say(want) + "); " + others + " other step(s) carry a reason");
  });
}

// ---- Section 3: findings without the inspection ---------------------------------------------------------------------
const TOPICS = {
  en: ["Ladder use", "Reporting a concern about a child", "Spill response", "Glass and surface cleaning", "Floor machine basics"],
  es: ["Uso de escaleras", "Reportar una preocupación sobre un menor", "Respuesta a derrames", "Limpieza de vidrios y superficies", "Conceptos básicos de la máquina de piso"],
};
async function openFindings(d) {
  await goHash(d, "inspections/findings");
  await until(d, "[data-finding-row]", 8000);
  await d.settle(300);
}
async function openFinding(d, fid) {
  await goHash(d, "inspections/findings/" + fid);
  await until(d, "[data-finding-window='" + fid + "']", 8000);
  await d.settle(300);
}
const optionsOf = (d, sel) => d.page.evaluate((s) => { const el = document.querySelector(s); return el ? Array.from(el.options).map((o) => o.textContent) : []; }, sel);
async function findingsCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/findings/" + x;

  // 1. Choose a follow-up on a finding: its topics from the list's followUpTopics, its owners from the finding's
  //    owners, and no read of the inspection.
  await withDriver(ctx, { name: "no-inspection-read", lang }, async (d) => {
    await openFindings(d);
    const mark = d.mark();
    await d.page.locator("[data-finding-row='f-1']").first().click().catch(() => {});
    await until(d, "[data-finding-window='f-1']", 6000);
    await click(d, "[data-finding-choose-open]");
    await until(d, "select[data-finding-field='topicId']", 4000);
    await d.settle(400);
    const topics = (await optionsOf(d, "select[data-finding-field='topicId']")).slice(1).map((x) => x.replace(/ \([^)]*\)$/, ""));
    const owners = (await optionsOf(d, "select[data-finding-field='ownerId']")).slice(1);
    const insp = reads(d, mark, /^\/api\/inspections\/scheduled\/[^/]+$/).length;
    const want = TOPICS[lang];
    results.check(KIND, id("the-window-chooses-with-no-read-of-the-inspection"), insp === 0 && topics.length === want.length && want.every((w) => topics.indexOf(w) >= 0) && owners.length >= 2,
      "the inspection was read " + insp + " time(s); the topics " + say(topics) + "; the owners " + say(owners));
  });

  // 2. A supervisor not assigned at a finding's site, whom the API says may not decide it (canDecide false), is offered
  //    neither Choose nor Record, and reads who chooses.
  await withDriver(ctx, { name: "cannot-decide", lang, persona: "supervisor" }, async (d) => {
    await openFinding(d, "f-5");
    const choose = await has(d, "[data-finding-choose-open]");
    const record = await has(d, "[data-finding-record-open]");
    const line = await textOf(d, "[data-finding-cannot-decide]");
    const want = d.say("A follow-up is chosen by whoever manages inspections, or a supervisor at the site.");
    results.check(KIND, id("no-choice-where-the-api-says-canDecide-is-false"), !choose && !record && line === want, (choose ? "Choose is offered; " : "") + (record ? "Record is offered; " : "") + "the window reads " + say(line));
  });

  // 3. A guard: the same supervisor, at a site they are assigned to, is offered Choose.
  await withDriver(ctx, { name: "may-decide", lang, persona: "supervisor" }, async (d) => {
    await openFinding(d, "f-1");
    const choose = await has(d, "[data-finding-choose-open]");
    results.check(KIND, id("guard-a-supervisor-at-the-site-may-choose"), choose, "Choose is not offered on f-1");
  });

  // 4. The tab's numbers are the list's counts: needing a follow-up, late and open; the same with a filter set, since
  //    counts cover every unresolved finding whatever the filters.
  await withDriver(ctx, { name: "counts", lang }, async (d) => {
    await openFindings(d);
    const valueOf = async (k) => attr(d, "[data-findings-count='" + k + "']", "data-findings-count-value");
    const first = [await valueOf("needsFollowUp"), await valueOf("overdue"), await valueOf("open")];
    const tab = await textOf(d, "[data-inspections-tab='findings']");
    await d.page.locator("select[data-findings-filter='status']").first().selectOption("done").catch(() => {});
    await d.settle(700);
    const after = [await valueOf("needsFollowUp"), await valueOf("overdue"), await valueOf("open")];
    const tabAfter = await textOf(d, "[data-inspections-tab='findings']");
    const want = ["2", "1", "1"];
    const wantTab = d.say("Findings") + " (3)";
    results.check(KIND, id("the-tab-s-numbers-are-the-counts"), say(first) === say(want) && say(after) === say(want) && tab === wantTab && tabAfter === wantTab,
      "the numbers " + say(first) + " then with Done " + say(after) + " (want " + say(want) + "); the tab " + say(tab) + " then " + say(tabAfter) + " (want " + say(wantTab) + ")");
  });

  // 5. Each finding is named by its title, on its row and in its window, with its card under it.
  await withDriver(ctx, { name: "title", lang }, async (d) => {
    await openFindings(d);
    const row = await textOf(d, "[data-finding-row='f-2'] [data-finding-title]");
    await d.page.locator("[data-finding-row='f-2']").first().click().catch(() => {});
    await until(d, "[data-finding-window='f-2']", 6000);
    const head = await textOf(d, "[data-finding-window='f-2'] [data-finding-window-title]");
    const card = await textOf(d, "[data-finding-window='f-2']");
    const wantCard = fill(d.say("Card: {0}"), "Lobby glass");
    results.check(KIND, id("each-finding-is-named-by-its-title"), row === "Lobby glass streaked" && head === "Lobby glass streaked" && card.indexOf(wantCard) >= 0,
      "the row reads " + say(row) + ", the window " + say(head) + (card.indexOf(wantCard) >= 0 ? "" : ", with no " + say(wantCard)));
  });

  // 6. The analytics export names the training follow-up's topic beside it.
  await withDriver(ctx, { name: "export-topic", lang }, async (d) => {
    await goHash(d, "inspections");
    await click(d, "[data-inspections-tab='reports']");
    await d.settle(600);
    await d.clearCaptures();
    await d.clickText(d.say("Export CSV"), { exact: true });
    await d.settle(400);
    const file = (await d.downloads()).filter((x) => /^inspection-analytics-/.test(x.name)).pop();
    const rows = file ? parseCsv(file.body) : [];
    const head = rows[0] || [];
    const at = head.indexOf("Follow-up topic");
    const f2 = rows.find((r) => r[head.indexOf("Finding ID")] === "f-2") || [];
    const f3 = rows.find((r) => r[head.indexOf("Finding ID")] === "f-3") || [];
    const want = TOPICS[lang][3];
    results.check(KIND, id("the-analytics-export-names-the-topic"), at > 0 && head[at - 1] === "Follow-up" && f2[at] === want && f3[at] === "",
      "the head " + say(head.slice(Math.max(0, head.indexOf("Finding ID")))) + "; f-2's topic " + say(f2[at]) + " (want " + say(want) + "), f-3's " + say(f3[at]));
  });

  // 7. A guard: the inspection's page and a corrective action's linked findings name the topic from the follow-up's
  //    topic.name, as they did since part 389.
  await withDriver(ctx, { name: "topic-named", lang }, async (d) => {
    await goHash(d, "inspections/insp-1");
    await until(d, "[data-follow-up='inspection-f-2']", 8000);
    const page = await textOf(d, "[data-follow-up='inspection-f-2']");
    const want = fill(d.say("Training: {0}"), TOPICS[lang][3]);
    results.check(KIND, id("guard-the-inspection-names-the-topic"), page.indexOf(want) === 0, "the inspection's f-2 reads " + say(page) + " (want " + say(want) + "...)");
  });
}

// ---- Section 4: the test site and a supervisor --------------------------------------------------------------------------
const TEST = seed.SITES[2].id;
const TEST_WORDS = {
  en: "This is the test site. Only test accounts and admins can make changes here.",
  es: "Este es el sitio de prueba. Solo las cuentas de prueba y los administradores pueden hacer cambios aquí.",
};
const testArm = (s) => { s.setScene379({ testSite: true }); s.setScene393({ testSite: TEST }); s.setScene397({ testSite: TEST }); };
async function openShift(d, sid) {
  await d.goto("schedule");
  await d.settle(800);
  await d.page.locator("[data-shift-chip='" + sid + "']").first().click().catch(() => {});
  await until(d, "[data-schedule-edit='" + sid + "']", 5000);
  await d.settle(300);
}
const selectedSite = (d, sid) => d.page.evaluate((x) => {
  const box = document.querySelector("[data-schedule-edit='" + x + "']");
  const s = box ? Array.from(box.querySelectorAll("select")).find((el) => Array.from(el.options).some((o) => o.value === "s-1")) : null;
  return s ? { value: s.value, shown: s.selectedIndex >= 0 ? s.options[s.selectedIndex].textContent : "" } : null;
}, sid);
async function testSiteCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => KIND + "/" + lang + "/testsite/" + x;

  // 1. A guard: the supervisor's site list leaves the test site out, and every page on their side panel opens with
  //    nothing thrown and no page broken.
  await withDriver(ctx, { name: "pages", lang, persona: "supervisor", arm: (s) => { s.setChecklist358(true); testArm(s); } }, async (d) => {
    const items = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]")).map((x) => x.getAttribute("data-nav-item")));
    const broken = [];
    for (const it of items) {
      const from = d.pageErrors.length;
      await d.page.evaluate((h) => { window.location.hash = h; }, it);
      await d.settle(1200);
      const errs = thrown(d, from);
      if (await d.crashed()) broken.push(it + " crashed");
      else if (errs.length) broken.push(it + ": " + errs[0].slice(0, 120));
    }
    const list = reads(d, 0, /^\/api\/sites$/).map((c) => (Array.isArray(c.json) ? c.json : (c.json && c.json.sites) || []).map((x) => x.id));
    const left = list.length > 0 && list.every((ids) => ids.indexOf(TEST) < 0);
    results.check(KIND, id("guard-every-page-opens-without-the-test-site"), items.length >= 10 && left && broken.length === 0,
      items.length + " pages; the site list " + (left ? "leaves the test site out" : "names it: " + say(list.slice(0, 2))) + "; " + say(broken.slice(0, 4)));
  });

  // 2. A shift at the test site keeps its site in the edit window, named and marked from the shift's row.
  await withDriver(ctx, { name: "shift-site", lang, persona: "supervisor", arm: testArm }, async (d) => {
    await openShift(d, "sh-3");
    const got = await selectedSite(d, "sh-3");
    const want = seed.SITES[2].name + " (" + d.say("TEST") + ")";
    results.check(KIND, id("a-test-site-shift-keeps-its-site-in-the-window"), !!got && got.value === TEST && got.shown === want, "the window's Site reads " + say(got) + " (want " + say(want) + ")");
  });

  // 3. A guard: a change to that shift is refused by the API (403 testCrew.testSite), and the refusal is drawn in its own
  //    words.
  await withDriver(ctx, { name: "refused", lang, persona: "supervisor", arm: testArm }, async (d, stubs) => {
    await openShift(d, "sh-3");
    await d.waitToastGone(6000);
    await d.modal().locator("input[placeholder='" + d.say("Notes") + "']").first().fill("Bring the wet floor signs").catch(() => {});
    const mark = d.mark();
    await d.modal().getByRole("button", { name: d.say("Save"), exact: true }).first().click().catch(() => {});
    const toast = await d.waitToast(5000).then(() => d.toast()).catch(() => null);
    const sent = writes(d, mark, "PATCH", /^\/api\/schedule\/sh-3$/);
    const want = TEST_WORDS[lang];
    results.check(KIND, id("guard-the-refusal-is-drawn-in-the-api-s-words"), sent.length === 1 && sent[0].status === 403 && toast === want && stubs.model397().testSiteRefused === 1,
      "the change answered " + say(sent.map((c) => c.status)) + "; the toast " + say(toast) + " (want " + say(want) + ")");
  });

  // 4. A guard: an admin still reads the test site in the site list, marked.
  await withDriver(ctx, { name: "admin", lang, arm: testArm }, async (d) => {
    await d.goto("sites");
    await d.settle(800);
    const list = reads(d, 0, /^\/api\/sites$/).map((c) => (Array.isArray(c.json) ? c.json : (c.json && c.json.sites) || []).map((x) => x.id));
    const page = await d.page.evaluate(() => document.body.innerText);
    const want = seed.SITES[2].name;
    results.check(KIND, id("guard-an-admin-still-reads-the-test-site"), list.length > 0 && list.every((ids) => ids.indexOf(TEST) >= 0) && page.indexOf(want) >= 0, "the site list " + say(list.slice(0, 2)) + (page.indexOf(want) >= 0 ? "" : ", and the page does not name it"));
  });
}

// ctx.only, when a runner names sections, keeps the run to them.
async function run(ctx) {
  const want = (x) => !ctx.only || ctx.only.indexOf(x) >= 0;
  for (const lang of LANGS) {
    if (want("zeros")) await zeroCases(ctx, lang);
    if (want("brief")) await briefCases(ctx, lang);
    if (want("findings")) await findingsCases(ctx, lang);
    if (want("testsite")) await testSiteCases(ctx, lang);
  }
}

module.exports = { run };
