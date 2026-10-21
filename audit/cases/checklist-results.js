// Checklist Results (part 358): what was done at a site on any day, a range and every site, the report
// that prints, and the four ways in, against the API as built at ocsa-api abfb2e6, which
// audit/checklist-stub.js answers once setChecklist358 arms it. Every case fails on main as it stood at
// 49b2d77, which has no such page.
//
// The seeded day is yesterday at Harbor Point Center (audit/checklist-stub.js): two shifts, five zones,
// two people, a step checked twice by both, an as needed step, weekly, monthly and quarterly work, and
// work tied to no shift. Every number a case expects is read from the stub's own model, the way the API
// would answer it, and counted here by the checklist's rules: per visit, daily and every other day work
// due that day, done of due; the rest never in a ring.
//
//   rings          each shift's steps due and done, checks, first and last check, who worked, and the
//                  repeating work on its own
//   timeline       the 15 minute bars across each shift's window, and the last-30-minutes line
//   zones          a zone picked by its button and by its bar shows its tasks alone; checks per person
//   range          each shift's totals over a range, a row a day, and a day opened from the table and
//                  from the chart
//   all sites      a card per site with its ring and trend, counted the summary's way since part 368, a
//                  reference site not tracked, and a card opening its site
//   live           today is read again within 32 seconds and shows a check made since; a past day is
//                  not read again
//   list           Not done only, search, and the CSV holding exactly the rows on screen
//   print          the report holds the summary, Not done, the full list and Page X of Y on every page
//   supervisor     a supervisor opens the page and its print, and no dollar figure is anywhere
//   refusal        a range over 31 days shows the API's own refusal
//   ways in        the side panel, Live Ops' See the checklist, a site's Checklist history and the
//                  Reports card each open the right site and day
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "checklist-results";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const S1 = seed.SITES[0].id;
const S2 = seed.SITES[1].id;
const S3 = seed.SITES[2].id;
const COUNTED = ["per_visit", "daily", "every_other_day"];

// The company's clock, read the way a person reads it.
const clock = new Intl.DateTimeFormat("en-US", { timeZone: seed.TIMEZONE, hour: "numeric", minute: "2-digit" });
const timeOf = (iso) => clock.format(new Date(iso));
const parts = new Intl.DateTimeFormat("en-US", { timeZone: seed.TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const minutesOf = (iso) => { const p = {}; parts.formatToParts(new Date(iso)).forEach((x) => { p[x.type] = x.value; }); return Number(p.hour) * 60 + Number(p.minute); };

// What the API answers for a site and days, grouped the way the page groups it: each shift's own items
// and, at a site with two shifts or more, the items tied to none under "*".
function expected(M, siteId, from, to) {
  const rec = M.record(siteId, from, to, null, "en");
  const rows = M.ITEMS[siteId] || [];
  const multi = (M.SHIFTS[siteId] || []).length >= 2;
  const shiftOf = (id) => { const r = rows.find((x) => x[0] === id); return multi && r && r[5] ? r[5] : "*"; };
  const groups = {};
  rec.days.forEach((d) => d.items.forEach((i) => {
    const k = shiftOf(i.taskId);
    if (!groups[k]) groups[k] = { due: 0, done: 0, checks: [], items: [] };
    const g = groups[k];
    g.items.push(Object.assign({ date: d.date }, i));
    if (COUNTED.indexOf(i.frequency) >= 0 && i.due) { g.due += 1; if (i.done) g.done += 1; }
    i.checks.forEach((c) => g.checks.push(c));
  }));
  Object.keys(groups).forEach((k) => groups[k].checks.sort((a, b) => a.completedAt.localeCompare(b.completedAt)));
  return { rec, groups };
}
// What the page draws for each group: its numbers off its own data attributes.
async function groupsOn(d) {
  return d.page.evaluate(() => {
    const out = {};
    document.querySelectorAll("[data-cr-group]").forEach((el) => {
      out[el.getAttribute("data-cr-group")] = { due: Number(el.getAttribute("data-cr-due")), done: Number(el.getAttribute("data-cr-done")),
        checks: Number(el.getAttribute("data-cr-checks")), first: el.getAttribute("data-cr-first"), last: el.getAttribute("data-cr-last"),
        text: el.innerText, buckets: (el.querySelector("[data-cr-buckets]") || { getAttribute: () => null }).getAttribute("data-cr-buckets"),
        last30: (el.querySelector("[data-cr-last30]") || { getAttribute: () => null }).getAttribute("data-cr-last30"),
        people: Array.from(el.querySelectorAll("[data-cr-person]")).map((p) => p.getAttribute("data-cr-person") + "=" + p.getAttribute("data-cr-person-checks")).sort() };
    });
    return out;
  });
}
const tasksOn = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-task]")).map((r) => ({ id: r.getAttribute("data-cr-task"), done: r.getAttribute("data-cr-task-done") === "1", text: r.innerText })));
async function open(d, hash, view) {
  await d.page.evaluate((h) => { window.location.hash = h; }, hash);
  await d.page.locator('[data-checklist-results][data-cr-view="' + view + '"]').first().waitFor({ timeout: 10000 }).catch(() => {});
  await d.settle(500);
}
const hashNow = (d) => d.page.evaluate(() => window.location.hash);
const viewNow = (d) => d.page.evaluate(() => { const el = document.querySelector("[data-checklist-results]"); return el ? el.getAttribute("data-cr-view") : null; });
const recordReads = (d, mark) => d.callsSince(mark).filter((c) => c.method === "GET" && /\/checklist-record$/.test(c.path));
// A CSV the page saved, as rows of cells.
function csvRows(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function withDriver(ctx, persona, id, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setChecklist358(true);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  try {
    await d.signIn(persona);
    await fn(d, stubs, stubs.checklist358());
  } catch (e) {
    results.fail(KIND, "checklist-results/" + id + "/suite", threw(e));
  } finally { await d.close(); }
}

// ---- one site, one day -----------------------------------------------------------------------------
async function dayCases(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "admin", "day", async (d, stubs, M) => {
    const day = M.SEEDED;
    const want = expected(M, S1, day, day);
    await open(d, "checklist/" + S1 + "/" + day, "day");
    const got = await groupsOn(d);
    const keys = Object.keys(want.groups).sort();
    const off = keys.filter((k) => !got[k] || got[k].due !== want.groups[k].due || got[k].done !== want.groups[k].done || got[k].checks !== want.groups[k].checks.length);
    results.check(KIND, "checklist-results/day/rings-count-the-checklist-way", off.length === 0 && Object.keys(got).sort().join() === keys.join(),
      Object.keys(got).length === 0 ? "the page drew no shift for " + day
        : off.map((k) => k + " draws " + (got[k] ? got[k].done + " of " + got[k].due + ", " + got[k].checks + " checks" : "nothing") + " where the record holds "
          + want.groups[k].done + " of " + want.groups[k].due + ", " + want.groups[k].checks.length + " checks").join("; ") || "the groups drawn are " + Object.keys(got).join(", "));
    const dayG = want.groups.Day;
    const dayText = got.Day ? got.Day.text : "";
    const span = "First check " + timeOf(dayG.checks[0].completedAt) + ", last check " + timeOf(dayG.checks[dayG.checks.length - 1].completedAt);
    results.check(KIND, "checklist-results/day/first-last-and-who", dayText.indexOf(span) >= 0 && dayText.indexOf(M.ONE) >= 0 && dayText.indexOf(M.TWO) >= 0
      && dayText.indexOf(dayG.done + " of " + dayG.due + " steps done") >= 0,
      "the Day shift reads " + JSON.stringify(dayText.slice(0, 260)) + " where it says " + JSON.stringify(span) + " and names both people");
    // Repeating work, on its own: the weekly done that day, the monthly due and not done, the quarterly not due.
    const rep = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-repeating]")).map((el) => ({ id: el.getAttribute("data-cr-repeating"), row: el.closest("tr").innerText })));
    const row = (id) => (rep.find((r) => r.id === id) || {}).row || "";
    const p1 = want.groups.Day.items.find((i) => i.taskId === "cr-p1");
    results.check(KIND, "checklist-results/day/repeating-work-on-its-own", rep.length === 3 && row("cr-p1").indexOf("Done at " + timeOf(p1.checks[0].completedAt) + " by " + M.TWO) >= 0
      && row("cr-p2").indexOf("Due, not done") >= 0 && row("cr-p3").indexOf("Not due on this day") >= 0,
      "Repeating work lists " + JSON.stringify(rep.map((r) => r.row.replace(/\s+/g, " "))));

    // The timeline: 15 minute bars across each shift's window, and the last-30-minutes line.
    const bars = (g, fromHm, toHm) => {
      const out = [];
      for (let m = fromHm; m < toHm; m += 15) out.push(g.checks.filter((c) => minutesOf(c.completedAt) >= m && minutesOf(c.completedAt) < m + 15).length);
      return out.join(",");
    };
    const dayBars = bars(want.groups.Day, 8 * 60, 16 * 60), nightBars = bars(want.groups.Night, 18 * 60, 22 * 60);
    results.check(KIND, "checklist-results/timeline/bars-every-15-minutes", !!got.Day && got.Day.buckets === dayBars && !!got.Night && got.Night.buckets === nightBars,
      "the Day shift draws " + (got.Day && got.Day.buckets) + " where its checks are " + dayBars + "; the Night shift " + (got.Night && got.Night.buckets) + " where " + nightBars);
    const lastIn = (g, end) => g.checks.filter((c) => minutesOf(c.completedAt) >= end - 30 && minutesOf(c.completedAt) < end).length;
    const dLast = lastIn(want.groups.Day, 16 * 60), nLast = lastIn(want.groups.Night, 22 * 60);
    const nLine = nLast + " of " + want.groups.Night.checks.length + " checks (" + Math.round(nLast / want.groups.Night.checks.length * 100) + "%) were made in the shift's last 30 minutes, from 9:30 PM to 10:00 PM.";
    results.check(KIND, "checklist-results/timeline/last-30-minutes-line", !!got.Day && got.Day.last30 === dLast + "/" + want.groups.Day.checks.length
      && !!got.Night && got.Night.last30 === nLast + "/" + want.groups.Night.checks.length && got.Night.text.indexOf(nLine) >= 0,
      "the lines read " + JSON.stringify([got.Day && got.Day.last30, got.Night && got.Night.last30]) + " where they are " + dLast + "/" + want.groups.Day.checks.length + " and "
        + nLast + "/" + want.groups.Night.checks.length + ", and the Night line says " + JSON.stringify(nLine));

    // Zones: a zone's button and a zone's bar each show its tasks alone. Checks per person on each shift.
    const zoneIds = (z) => [].concat(...Object.keys(want.groups).map((k) => want.groups[k].items)).filter((i) => i.zone === z).map((i) => i.taskId).sort().join();
    await d.page.locator('[data-cr-zone="Restrooms"]').first().click().catch(() => {});
    await d.settle(300);
    const restrooms = (await tasksOn(d)).map((r) => r.id).sort().join();
    const zoneNums = await d.page.locator('[data-cr-zone="Restrooms"]').first().evaluate((b) => b.getAttribute("data-cr-zone-done") + "/" + b.getAttribute("data-cr-zone-due"), null, { timeout: 3000 }).catch(() => "");
    const rr = [].concat(...Object.keys(want.groups).map((k) => want.groups[k].items)).filter((i) => i.zone === "Restrooms" && COUNTED.indexOf(i.frequency) >= 0 && i.due);
    await d.page.locator('[data-cr-zone=""]').first().click().catch(() => {});
    await d.settle(200);
    const zones = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-zone]")).map((b) => b.getAttribute("data-cr-zone")).filter(Boolean));
    const at = zones.indexOf("Offices");
    let offices = "";
    if (at >= 0) {
      await d.page.locator("[data-cr-zone-chart] .apexcharts-bar-area").nth(at).click({ force: true }).catch(() => {});
      await d.settle(300);
      offices = (await tasksOn(d)).map((r) => r.id).sort().join();
      await d.page.locator('[data-cr-zone=""]').first().click().catch(() => {});
      await d.settle(200);
    }
    results.check(KIND, "checklist-results/zones/a-zone-filters-the-list", restrooms === zoneIds("Restrooms") && zoneNums === rr.filter((i) => i.done).length + "/" + rr.length && offices === zoneIds("Offices"),
      restrooms !== zoneIds("Restrooms") ? "Restrooms' button lists " + restrooms + " where its tasks are " + zoneIds("Restrooms")
        : zoneNums !== rr.filter((i) => i.done).length + "/" + rr.length ? "Restrooms reads " + zoneNums
          : "the Offices bar lists " + JSON.stringify(offices) + " where its tasks are " + zoneIds("Offices"));
    const people = (g) => { const n = {}; g.checks.forEach((c) => { n[c.completedBy.name] = (n[c.completedBy.name] || 0) + 1; }); return Object.keys(n).map((k) => k + "=" + n[k]).sort(); };
    results.check(KIND, "checklist-results/zones/checks-per-person-on-each-shift", !!got.Day && got.Day.people.join() === people(want.groups.Day).join() && !!got.Night && got.Night.people.join() === people(want.groups.Night).join(),
      "the Day shift reads " + JSON.stringify(got.Day && got.Day.people) + " where it is " + JSON.stringify(people(want.groups.Day)) + "; the Night shift "
        + JSON.stringify(got.Night && got.Night.people) + " where " + JSON.stringify(people(want.groups.Night)));

    // The list: Not done only, search, and the CSV holding what is on screen.
    const notDone = [].concat(...Object.keys(want.groups).map((k) => want.groups[k].items)).filter((i) => !i.done).map((i) => i.taskId).sort().join();
    await d.page.locator("[data-cr-not-done-only]").check().catch(() => {});
    await d.settle(200);
    const nd = await tasksOn(d);
    await d.page.locator("[data-cr-search]").fill("towels").catch(() => {});
    await d.settle(200);
    const searched = (await tasksOn(d)).map((r) => r.id).join();
    await d.page.locator("[data-cr-search]").fill("").catch(() => {});
    await d.settle(200);
    results.check(KIND, "checklist-results/list/not-done-only-and-search", nd.map((r) => r.id).sort().join() === notDone && nd.every((r) => !r.done) && searched === "cr-d5",
      "Not done only lists " + nd.map((r) => r.id).sort().join() + " where the day left " + notDone + " not done; a search for towels lists " + JSON.stringify(searched));
    const shown = await tasksOn(d);
    await d.clearCaptures();
    await d.page.locator("[data-cr-csv]").first().click().catch(() => {});
    await d.settle(400);
    const files = await d.downloads();
    const rows = files.length ? csvRows(files[files.length - 1].body) : [];
    const head = rows[0] ? rows[0].join("|") : "";
    const body = rows.slice(1);
    const labelOf = (id) => ((M.ITEMS[S1] || []).find((x) => x[0] === id) || [])[2];
    const same = body.length === shown.length && shown.every((r, i) => body[i] && body[i][0] === day && body[i][3] === labelOf(r.id) && body[i][4] === (r.done ? "Yes" : "No"));
    results.check(KIND, "checklist-results/list/csv-matches-the-screen", head === "Day|Shift|Zone|Task|Done|Who|When" && same,
      !files.length ? "Download CSV saved nothing" : head !== "Day|Shift|Zone|Task|Done|Who|When" ? "the CSV's header reads " + head
        : "the CSV holds " + body.length + " rows where the screen shows " + shown.length + ": " + JSON.stringify(body.slice(0, 2)));
    await d.page.locator("[data-cr-not-done-only]").uncheck().catch(() => {});
    await d.settle(200);

    // The print: the summary, Not done, the full list, and Page X of Y on every page.
    await d.clearCaptures();
    await d.page.locator("[data-cr-print]").first().click().catch(() => {});
    await d.settle(800);
    const printed = (await d.prints()).pop() || { html: "", printed: false };
    const html = printed.html;
    const sheets = (html.match(/class="sheet"/g) || []).length;
    const pages = Array.from(html.matchAll(/data-page-of="">Page (\d+) of (\d+)</g)).map((m) => m[1] + "/" + m[2]);
    const pagesOk = sheets > 1 && pages.length === sheets && pages.every((p, i) => p === (i + 1) + "/" + sheets);
    const ndIds = Array.from(html.matchAll(/data-not-done="([^"]+)"/g)).map((m) => m[1]).sort().join();
    const dueNotDone = [].concat(...Object.keys(want.groups).map((k) => want.groups[k].items)).filter((i) => i.due && !i.done && i.frequency !== "as_needed").map((i) => i.taskId).sort().join();
    const listed = Array.from(html.matchAll(/data-task="([^"]+)" data-done="([01])"/g)).map((m) => m[1] + ":" + m[2]).sort().join();
    const wantListed = [].concat(...Object.keys(want.groups).map((k) => want.groups[k].items)).map((i) => i.taskId + ":" + (i.done ? 1 : 0)).sort().join();
    const head1 = html.indexOf("Checklist Results") >= 0 && html.indexOf(seed.SITES[0].name) >= 0 && html.indexOf(dayG.done + " of " + dayG.due + " steps done") >= 0 && /<svg/.test(html);
    results.check(KIND, "checklist-results/print/summary-not-done-list-and-pages", printed.printed && head1 && ndIds === dueNotDone && listed === wantListed && pagesOk,
      !html ? "Print report opened no page" : !head1 ? "the first page lacks the title, the site, the Day shift's summary or its charts"
        : ndIds !== dueNotDone ? "Not done lists " + ndIds + " where " + dueNotDone + " were due and not done"
          : listed !== wantListed ? "the full list holds " + listed + " where the day holds " + wantListed
            : !pagesOk ? sheets + " pages carry " + JSON.stringify(pages) : "the page was never printed");
  });
}

// ---- a range, all sites, and the refusal ----------------------------------------------------------
async function rangeCases(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "admin", "range", async (d, stubs, M) => {
    const from = seed.shift(-16), to = M.SEEDED;
    const want = expected(M, S1, from, to);
    await open(d, "checklist/" + S1 + "/" + from + ".." + to, "range");
    const got = await groupsOn(d);
    const keys = Object.keys(want.groups).sort();
    const off = keys.filter((k) => !got[k] || got[k].due !== want.groups[k].due || got[k].done !== want.groups[k].done || got[k].checks !== want.groups[k].checks.length);
    const dayRows = await d.page.locator("[data-cr-day]").count();
    const series = await d.page.locator("[data-cr-range-chart] .apexcharts-series").count();
    results.check(KIND, "checklist-results/range/totals-a-row-a-day-and-a-chart", off.length === 0 && dayRows === 16 && series === keys.length,
      off.length ? off.map((k) => k + " totals " + (got[k] ? got[k].done + " of " + got[k].due : "nothing") + " where the record holds " + want.groups[k].done + " of " + want.groups[k].due).join("; ")
        : dayRows !== 16 ? "the table has " + dayRows + " days where the range holds 16" : "the chart draws " + series + " lines where there are " + keys.length + " shifts");
    const pick = seed.shift(-8);
    await d.page.locator('[data-cr-day="' + pick + '"]').first().click().catch(() => {});
    await d.page.locator('[data-checklist-results][data-cr-view="day"]').first().waitFor({ timeout: 8000 }).catch(() => {});
    await d.settle(400);
    const one = expected(M, S1, pick, pick);
    const g1 = await groupsOn(d);
    const h1 = await hashNow(d);
    results.check(KIND, "checklist-results/range/a-day-opens-from-the-table", h1 === "#checklist/" + S1 + "/" + pick && !!g1.Day && g1.Day.due === one.groups.Day.due && g1.Day.done === one.groups.Day.done,
      "the row for " + pick + " opened " + h1 + ", Day " + (g1.Day ? g1.Day.done + " of " + g1.Day.due : "missing") + " where it is " + one.groups.Day.done + " of " + one.groups.Day.due);
    await open(d, "checklist/" + S1 + "/" + from + ".." + to, "range");
    await d.page.locator("[data-cr-range-chart] .apexcharts-marker").nth(4).click({ force: true }).catch(() => {});
    await d.settle(800);
    const h2 = await hashNow(d);
    results.check(KIND, "checklist-results/range/a-day-opens-from-the-chart", h2 === "#checklist/" + S1 + "/" + seed.shift(-12) && (await viewNow(d)) === "day",
      "the fifth point opened " + h2 + " where it is " + seed.shift(-12));

    // All sites: one card each, with its ring for the day and the week's trend; a reference site not tracked.
    await open(d, "checklist/all/yesterday", "all");
    const cards = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-cr-site-card]")).map((el) => ({ id: el.getAttribute("data-cr-site-card"),
      due: el.getAttribute("data-cr-due"), done: el.getAttribute("data-cr-done"), text: el.innerText, charts: el.querySelectorAll(".apexcharts-canvas").length })));
    const card = (id) => cards.find((c) => c.id === id) || null;
    // Since part 368 a card is the summary's count (GET /api/reports/checklist-summary, countDay): every
    // item the record lists as due, weekly to seasonal work included, done of due.
    const total = (siteId) => M.summaryDay(siteId, M.SEEDED);
    const t1 = total(S1), t2 = total(S2);
    const ok = cards.length === 3 && card(S1) && card(S1).due === String(t1.due) && card(S1).done === String(t1.done) && card(S1).charts === 2
      && card(S2) && card(S2).due === String(t2.due) && card(S2).done === String(t2.done) && card(S3) && card(S3).due === null && card(S3).text.indexOf("Not tracked") >= 0;
    results.check(KIND, "checklist-results/all-sites/a-card-each-with-ring-and-trend", !!ok,
      "the cards read " + JSON.stringify(cards.map((c) => [c.id, c.done + "/" + c.due, c.charts])) + " where the first two are " + t1.done + "/" + t1.due + " and " + t2.done + "/" + t2.due + " with two charts each, and the third Not tracked");
    await d.page.locator('[data-cr-site-card="' + S1 + '"]').first().click().catch(() => {});
    await d.page.locator('[data-checklist-results][data-cr-view="day"]').first().waitFor({ timeout: 8000 }).catch(() => {});
    await d.settle(400);
    const h3 = await hashNow(d);
    results.check(KIND, "checklist-results/all-sites/a-card-opens-its-site", h3 === "#checklist/" + S1 + "/yesterday" && (await viewNow(d)) === "day",
      "the first site's card opened " + h3 + " with " + (await viewNow(d)));

    // A range over 31 days: the API refuses it, and the page shows the API's own words.
    const mark = d.mark();
    await open(d, "checklist/" + S1 + "/" + seed.shift(-40) + ".." + M.SEEDED, "refused");
    const said = await d.page.locator("[data-cr-refusal]").first().innerText().catch(() => "");
    const asked = recordReads(d, mark);
    const words = "Check the dates: each is a day, the first is not after the last, and a record covers at most 31 days";
    results.check(KIND, "checklist-results/refusal/over-31-days-shows-the-api", asked.length > 0 && said.trim() === words,
      !asked.length ? "the page asked the API nothing" : "the page says " + JSON.stringify(said) + " where the API said " + JSON.stringify(words));
  });
}

// ---- today is live, a past day is read once --------------------------------------------------------
async function liveCases(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "admin", "live", async (d, stubs, M) => {
    let mark = d.mark();
    await open(d, "checklist/" + S1 + "/" + M.SEEDED, "day");
    const first = recordReads(d, mark).length;
    mark = d.mark();
    await wait(32000);
    const past = recordReads(d, mark).length;
    results.check(KIND, "checklist-results/live/a-past-day-is-read-once", first > 0 && past === 0,
      first === 0 ? "opening a past day read no record" : "a past day was read " + past + " more times in 32 seconds");
    await open(d, "checklist/" + S1 + "/today", "day");
    const before = await groupsOn(d);
    mark = d.mark();
    stubs.addCheck358(S1, "cr-n2", M.TODAY, "21:20", "two");
    await wait(32000);
    const again = recordReads(d, mark).length;
    const after = await groupsOn(d);
    results.check(KIND, "checklist-results/live/today-is-read-every-30-seconds", again >= 1 && !!before.Night && !!after.Night && after.Night.done === before.Night.done + 1,
      again < 1 ? "today was not read again in 32 seconds" : "the Night shift reads " + (after.Night && after.Night.done) + " done after a check was made, where it read " + (before.Night && before.Night.done));
  });
}

// ---- a supervisor, and no dollar figure ------------------------------------------------------------
async function supervisorCases(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "supervisor", "supervisor", async (d, stubs, M) => {
    const item = await d.page.locator('[data-nav-item="checklist"]').count();
    await open(d, "checklist/" + S1 + "/" + M.SEEDED, "day");
    const text = await d.bodyText();
    const want = expected(M, S1, M.SEEDED, M.SEEDED).groups.Day;
    await d.clearCaptures();
    await d.page.locator("[data-cr-print]").first().click().catch(() => {});
    await d.settle(800);
    const html = ((await d.prints()).pop() || {}).html || "";
    const money = /\$\s?\d|\bUSD\b/;
    results.check(KIND, "checklist-results/supervisor/opens-the-page-and-its-print", item > 0 && text.indexOf(want.done + " of " + want.due + " steps done") >= 0 && html.indexOf("Page 1 of") >= 0,
      !item ? "a supervisor has no Checklist Results in the side panel" : !html ? "the print opened nothing" : "the page does not read the Day shift's summary");
    const drawn = text.indexOf(want.done + " of " + want.due + " steps done") >= 0 && html.indexOf("Page 1 of") >= 0;
    results.check(KIND, "checklist-results/supervisor/no-dollar-figure", drawn && !money.test(text) && !money.test(html.replace(/<style[\s\S]*?<\/style>/g, "")),
      !drawn ? "the page or its print was not drawn to be read" : "a dollar figure is on the " + (money.test(text) ? "page" : "print"));
  });
}

// ---- the ways in ------------------------------------------------------------------------------------
async function waysIn(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "admin", "ways-in", async (d, stubs, M) => {
    await d.goto("overview");
    await d.page.locator('[data-nav-item="checklist"]').first().click().catch(() => {});
    await d.page.locator("[data-checklist-results]").first().waitFor({ timeout: 8000 }).catch(() => {});
    await d.settle(800);
    const h0 = await hashNow(d);
    results.check(KIND, "checklist-results/ways-in/side-panel", /^#checklist(\/all\/today)?$/.test(h0) && (await viewNow(d)) === "all",
      "the side panel item opened " + h0 + " with " + (await viewNow(d)));

    await d.goto("operations");
    await d.page.locator("input[type=date]").first().fill(M.SEEDED).catch(() => {});
    await d.settle(700);
    await d.page.locator('[data-ops-checklist="' + S1 + '"]').first().click().catch(() => {});
    await d.page.locator('[data-checklist-results][data-cr-view="day"]').first().waitFor({ timeout: 8000 }).catch(() => {});
    await d.settle(500);
    const h1 = await hashNow(d);
    const status = await d.page.locator("[data-cr-status]").first().innerText().catch(() => "");
    results.check(KIND, "checklist-results/ways-in/live-ops-see-the-checklist", h1 === "#checklist/" + S1 + "/" + M.SEEDED && status.indexOf(seed.SITES[0].name) >= 0,
      "See the checklist on " + M.SEEDED + " opened " + h1 + " reading " + JSON.stringify(status));

    await d.goto("sites", [S1]);
    await d.page.locator('[data-site-checklist-history="' + S1 + '"]').first().click().catch(() => {});
    await d.page.locator('[data-checklist-results][data-cr-view="day"]').first().waitFor({ timeout: 8000 }).catch(() => {});
    await d.settle(500);
    const h2 = await hashNow(d);
    const g2 = await groupsOn(d);
    const y = expected(M, S1, M.SEEDED, M.SEEDED).groups.Day;
    results.check(KIND, "checklist-results/ways-in/site-checklist-history", h2 === "#checklist/" + S1 + "/yesterday" && !!g2.Day && g2.Day.due === y.due && g2.Day.done === y.done,
      "Checklist history opened " + h2 + (g2.Day ? " with Day " + g2.Day.done + " of " + g2.Day.due : " with no Day shift"));

    await d.goto("reports");
    await d.page.locator('[data-report-card="checklist-results"]').first().waitFor({ timeout: 8000 }).catch(() => {});
    await d.page.locator('[data-report-card="checklist-results"]').first().click().catch(() => {});
    await d.page.locator("[data-checklist-results]").first().waitFor({ timeout: 8000 }).catch(() => {});
    await d.settle(500);
    const h3 = await hashNow(d);
    results.check(KIND, "checklist-results/ways-in/reports-card", /^#checklist(\/all\/today)?$/.test(h3) && (await viewNow(d)) === "all",
      "the Reports card opened " + h3);
  });
}

async function run(ctx) {
  await dayCases(ctx);
  await rangeCases(ctx);
  await liveCases(ctx);
  await supervisorCases(ctx);
  await waysIn(ctx);
}

module.exports = { run };
