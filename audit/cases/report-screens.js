// Every report screen and its charts, read in the language the screen is drawn in, and what the report
// editor saves, which is the same in either language.
//
// A report's screen is its tiles, filters, date pills and sentences, which the page reader reads, and
// its charts, which ApexCharts draws as SVG: the labels along each axis, an axis title where a chart
// has one, the legend, the donut's own words, and the tooltip a person sees on pointing at the chart.
// The page reader leaves SVG out, so the charts are read here. In Spanish, what the English check
// finds once the Spanish, the served values, the numbers and the dates are taken out has to be
// nothing. In English, every chart has to draw with its words.
//
// The report editor edits a report, so what it saves is the code or the English it saved before the
// screen spoke Spanish. A new report, an edited one and a copy are saved in each language, and each
// body sent has to be the one written out by hand below, word for word.
"use strict";
const { englishLeftOn } = require("../lib/english");

// The three saved reports the stub serves, one for each source that runs, and the charts each draws
// from the seed. hand: the issue report is saved with the SLA panel on, so it draws the trend, the SLA
// trend, the two by-site bars and the severity donut: 5. The supply report draws the cost trend, cost
// by site, the green share and the top supplies: 4. The inspection report draws the score trend, the
// by-site bars and the lowest items: 3.
const REPORTS = [
  { id: "issue-timing", name: "Issue response and resolution", charts: 5 },
  { id: "supply-usage", name: "Supply usage and cost", charts: 4 },
  { id: "inspection-quality", name: "Inspection scores and quality", charts: 3 },
];

// What the editor sends, written out by hand. The targets are the defaults in hours and back: 1 and
// 4 hours for high, 4 and 24 for medium, 24 and 72 for low.
const TARGETS = {
  high: { first_response_minutes: 60, resolution_minutes: 240 },
  medium: { first_response_minutes: 240, resolution_minutes: 1440 },
  low: { first_response_minutes: 1440, resolution_minutes: 4320 },
};
const issueConfig = (bucket, severity, sla) => ({
  date_range: { preset: "last30" },
  bucket,
  filters: { site_id: "", severity },
  sla_targets: TARGETS,
  output: { trend: true, by_site: true, severity: true, sla },
  branding: { use_company_settings: true },
});
const SAVES = [
  // A new report, named, narrowed to high severity by month, with the category left at its example.
  { id: "a-new-report-saves-the-same-body", what: "a new report",
    method: "POST", path: /^\/api\/report-engine\/definitions$/,
    body: { name: "Audit weekly watch", description: "", category: "Service Delivery", source: "issues_timing",
      config: issueConfig("month", "high", false), is_template: true },
    act: async (d) => {
      await d.goto("reports");
      if (!(await d.clickText(d.say("New report"), { exact: true }))) return false;
      await d.settle(300);
      const name = d.page.getByPlaceholder(d.say("e.g. High severity weekly"), { exact: true });
      if ((await name.count()) === 0) return false;
      await name.first().fill("Audit weekly watch");
      await d.page.locator("select:has(option[value='high'])").first().selectOption("high");
      await d.page.locator("select:has(option[value='month'])").first().selectOption("month");
      return d.clickText(d.say("Create report"), { exact: true });
    } },
  // The custom report, opened in the editor and saved as it is. Its category is the code it was
  // saved under, and it stays that code.
  { id: "an-edit-saves-the-same-body", what: "an edited report",
    method: "PUT", path: /^\/api\/report-engine\/definitions\/rd-4$/,
    body: { name: "Night shift issue watch", description: "A saved copy narrowed to high severity.", category: "service_delivery",
      source: "issues_timing", config: issueConfig("week", "high", false), is_template: true },
    act: async (d) => {
      await d.goto("reports");
      if (!(await d.clickReportAction("Night shift issue watch", "Edit"))) return false;
      return d.clickText(d.say("Save changes"), { exact: true });
    } },
  // A copy of a template, whose name gains the English it has always gained.
  { id: "a-copy-saves-the-same-body", what: "a copy of a report",
    method: "POST", path: /^\/api\/report-engine\/definitions$/,
    body: { name: "Issue response and resolution (copy)", description: "Median response and resolution, with service level compliance.",
      category: "service_delivery", source: "issues_timing", config: issueConfig("week", "", true), is_template: true },
    act: async (d) => {
      await d.goto("reports");
      if (!(await d.clickReportAction("Issue response and resolution", "Duplicate"))) return false;
      return d.clickText(d.say("Create report"), { exact: true });
    } },
];

// A body with its keys in one order, so two bodies compare by what they say.
const canon = (v) => (Array.isArray(v) ? v.map(canon)
  : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
// The first place two bodies part, named by its path.
function firstDifference(want, got, at) {
  const here = at || "body";
  if (want && typeof want === "object" && got && typeof got === "object") {
    const keys = Array.from(new Set(Object.keys(want).concat(Object.keys(got)))).sort();
    for (const k of keys) {
      const diff = firstDifference(want[k], got[k], here + "." + k);
      if (diff) return diff;
    }
    return null;
  }
  return JSON.stringify(want) === JSON.stringify(got) ? null
    : here + " is " + JSON.stringify(got) + " where " + JSON.stringify(want) + " was expected";
}

// The tooltip a chart shows when a person points at it: at its first bar, or along the middle of its
// plot until a point answers. A donut's tooltip says a slice's name and figure, and the names are the
// legend's, which is read already.
async function pointAt(d, c, kind) {
  const target = kind === "bar" ? c.locator(".apexcharts-bar-area").first() : c.locator(".apexcharts-grid").first();
  const box = await target.boundingBox().catch(() => null);
  if (!box) return [];
  for (const fx of (kind === "bar" ? [0.5] : [0.5, 0.2, 0.8, 0.35, 0.65])) {
    await d.page.mouse.move(box.x + box.width * fx, box.y + box.height / 2, { steps: 4 });
    await d.settle(300);
    const tip = await c.evaluate((el) => Array.from(el.querySelectorAll(
      ".apexcharts-tooltip-title, .apexcharts-tooltip-text-y-label, .apexcharts-tooltip-text-y-value"))
      .map((x) => String(x.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean));
    if (tip.length) return tip;
  }
  return [];
}

// Every chart on the screen: the words drawn inside it, and the tooltip it shows on being pointed at.
async function readCharts(d) {
  const charts = d.contentBox().locator(".apexcharts-canvas");
  const n = await charts.count();
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const c = charts.nth(i);
    await c.scrollIntoViewIfNeeded().catch(() => {});
    await d.settle(500);
    // A label ApexCharts shortens to fit keeps its whole words in its title, which is also what a
    // person reads on pointing at it, so a label with a title is read by the title.
    const drawn = await c.evaluate((el) => Array.from(el.querySelectorAll("svg text, .apexcharts-legend-text"))
      .map((x) => { const title = x.querySelector("title"); return String((title ? title.textContent : x.textContent) || ""); })
      .map((v) => v.replace(/\s+/g, " ").trim()).filter(Boolean));
    const kind = (await c.locator(".apexcharts-bar-area").count()) > 0 ? "bar"
      : (await c.locator(".apexcharts-area-series, .apexcharts-line-series").count()) > 0 ? "trend" : "donut";
    const tip = kind === "donut" ? [] : await pointAt(d, c, kind);
    out.push({ kind, drawn, tip });
  }
  await d.page.mouse.move(0, 0).catch(() => {});
  return out;
}

async function run({ d, results, lang, stubs }) {
  const spanish = lang === "es";

  // ---- each report's screen and its charts, as each person Reports opens for ---------------------
  for (const who of ["admin", "supervisor"]) {
    await d.signOutHard();
    await d.signIn(who);
    for (const r of REPORTS) {
      const id = "page/report-screens/" + r.id + "/" + who + "/" + lang;
      await d.goto("reports");
      const opened = await d.clickRunFor(r.name);
      await d.settle(900);
      const back = opened && (await d.has(d.say("Back to reports")));
      if (!back) {
        results.check("page", id, false, "the saved report " + JSON.stringify(r.name) + " would not run from the library");
        results.check("page", "page/report-screens/" + r.id + "/charts/" + who + "/" + lang, false, "the report did not open");
        continue;
      }
      const screen = await d.readable();
      const charts = await readCharts(d);
      const drawnAll = charts.reduce((a, c) => a.concat(c.drawn, c.tip), []);
      const silent = charts.filter((c) => c.drawn.length === 0 || (c.kind !== "donut" && c.tip.length === 0)).length;
      if (spanish) {
        const left = englishLeftOn(screen, stubs.calls);
        results.check("page", id, left.length === 0,
          left.length + " lines of the report are not Spanish: " + left.slice(0, 4).map((x) => JSON.stringify(x.left)).join(", "));
        const cleft = englishLeftOn(drawnAll, stubs.calls);
        results.check("page", "page/report-screens/" + r.id + "/charts/" + who + "/" + lang,
          charts.length === r.charts && silent === 0 && cleft.length === 0,
          charts.length !== r.charts ? charts.length + " charts drew, the seed draws " + r.charts
            : silent ? silent + " charts drew no words or showed no tooltip"
            : cleft.length + " words in the charts are not Spanish: " + cleft.slice(0, 4).map((x) => JSON.stringify(x.left)).join(", "));
      } else {
        results.check("page", id, screen.length > 0 && (await d.has(d.say("Export PDF"))), "the report drew no words or no Export PDF");
        results.check("page", "page/report-screens/" + r.id + "/charts/" + who + "/" + lang,
          charts.length === r.charts && silent === 0,
          charts.length !== r.charts ? charts.length + " charts drew, the seed draws " + r.charts
            : silent + " charts drew no words or showed no tooltip");
      }
      if (who === "admin") {
        results.note("report screens in " + lang + ", " + r.id + ": " + charts.length + " charts, "
          + drawnAll.length + " chart words and tooltip lines read");
      }
    }
  }

  // ---- what the editor saves -----------------------------------------------------------------
  await d.signOutHard();
  await d.signIn("admin");
  for (const s of SAVES) {
    const id = "reports/editor/" + s.id + "/" + lang;
    const mark = d.mark();
    const pressed = await s.act(d).catch(() => false);
    await d.settle(500);
    const sent = d.callsSince(mark).filter((c) => c.method === s.method && s.path.test(c.path)).pop();
    const body = sent ? (typeof sent.body === "string" ? JSON.parse(sent.body) : sent.body) : null;
    results.check("report", id, !!pressed && !!body && same(s.body, body),
      !pressed ? "the editor could not be driven to save " + s.what
        : !body ? "saving " + s.what + " sent no " + s.method
        : "saving " + s.what + " in " + lang + " sent a different body: " + firstDifference(s.body, body));
  }
}

module.exports = { run, REPORTS, SAVES };
