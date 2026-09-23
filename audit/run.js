// npm run audit. One process, one table, non-zero exit on any failure.
//
// It builds the production bundle, serves it, and drives it in a headless browser at 1280 by 900,
// then repeats the pages, views and tables at 1024 to catch a table that will not fit.
"use strict";
const path = require("path");
const { build, BUILD_DIR } = require("./lib/build");
const { serve } = require("./lib/serve");
const { launch } = require("./lib/browser");
const { createStubs } = require("./stubs");
const { createDriver } = require("./lib/driver");
const { createResults } = require("./lib/results");
const { printTable, printDetail, printKnown, printNotes } = require("./lib/table");
const { discover } = require("./discover");
const inventory = require("./inventory");
const seed = require("./seed");

const SUITES = [
  // Pages run in both themes at Standard, and again at the largest text size in dark, at both widths.
  { name: "pages", mod: "./cases/pages", widths: ["wide", "narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "light", size: "standard" }, { theme: "dark", size: "largest" },
      // Spanish at 1024 only, where a third more letters is what breaks a page, and for the two
      // people who live in these screens. The English passes cover the other width and the rest.
      { theme: "dark", size: "standard", lang: "es", only: "narrow" }] },
  { name: "views", mod: "./cases/views", widths: ["wide"] },
  // The filed report window is read in every theme, at every text size, at both widths, because a
  // table inside a window is the first thing to run off the side.
  { name: "filed-forms", mod: "./cases/filed-forms", widths: ["wide", "narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "light", size: "standard" },
      { theme: "dark", size: "largest" }, { theme: "light", size: "largest" }] },
  { name: "windows", mod: "./cases/windows", widths: ["wide"] },
  { name: "tables", mod: "./cases/tables", widths: ["wide", "narrow"] },
  { name: "refusals", mod: "./cases/refusals", widths: ["wide"] },
  { name: "reports", mod: "./cases/reports", widths: ["wide"] },
  { name: "exports", mod: "./cases/exports", widths: ["wide"] },
  { name: "decisions", mod: "./cases/decisions", widths: ["wide"] },
  { name: "permissions", mod: "./cases/permissions", widths: ["wide"] },
  { name: "notices", mod: "./cases/notices", widths: ["wide"] },
  { name: "report-actions", mod: "./cases/report-actions", widths: ["wide"] },
  // What the API answers in the language a call asks for, and which screens draw it. Read in Spanish,
  // where a display and the English it was saved in are different words.
  { name: "language", mod: "./cases/language", widths: ["wide"], variants: [{ theme: "dark", size: "standard", lang: "es" }] },
  // Help fits the window at both widths, two heights, every text size, both themes and both
  // languages. The suite makes its own passes, since each one resizes the window as it goes.
  { name: "help-fit", mod: "./cases/help-fit", widths: [] },
  { name: "house-style", mod: "./cases/house-style", widths: [] },
];

// Every suite in SUITES has to load. A missing one used to be a note, which meant a run could print
// a clean table while a whole suite sat out. It fails the run now.
function loadSuite(mod) {
  try { return require(mod); } catch (e) {
    if (e && e.code === "MODULE_NOT_FOUND" && String(e.message).indexOf(mod) >= 0) return null;
    throw e;
  }
}

async function main() {
  const started = Date.now();
  const only = (process.env.AUDIT_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  const app = discover();
  const results = createResults();

  process.stdout.write("audit      " + app.pages.length + " pages, " + app.modals.length + " windows found in src/App.js ("
    + app.lineCount + " lines)\n");
  process.stdout.write("clock      " + seed.NOW_ISO + " in " + seed.TIMEZONE + " (9:30 PM, which is the next day in UTC)\n");

  build({ force: process.env.AUDIT_FORCE_BUILD === "1" });
  const srv = await serve(BUILD_DIR);
  const browser = await launch();
  const stubs = createStubs();

  const ctx = { origin: srv.origin, stubs, results, inventory, app, seed, createDriver, browser };

  try {
    // Coverage first: a page or window the app has and the suite does not claim is NO CASE.
    require("./cases/coverage").run(ctx);

    for (const s of SUITES) {
      if (only.length && only.indexOf(s.name) < 0) continue;
      const suite = loadSuite(s.mod);
      if (!suite) { results.fail("suite", s.name, "the suite module " + s.mod + " could not be loaded"); continue; }
      if (s.widths.length === 0) {
        try { await suite.run(ctx); }
        catch (e) { results.fail("suite", s.name, "the suite threw: " + String(e && e.message ? e.message : e).split("\n")[0]); }
        continue;
      }
      for (const width of s.widths) {
        for (const v of (s.variants || [{ theme: "dark", size: "standard" }])) {
          if (v.only && v.only !== width) continue;
          const theme = v.theme || "dark";
          const textSize = v.size || "standard";
          const lang = v.lang || "en";
          process.stdout.write("run        " + s.name + " at " + (width === "wide" ? "1280x900" : "1024x900")
            + " in " + theme + (textSize === "standard" ? "" : ", text " + textSize)
            + (lang === "en" ? "" : ", in " + lang) + "\n");
          const d = await createDriver({ browser, origin: srv.origin, stubs, viewport: width, theme, textSize, lang });
          // A suite that throws fails the run. It does not erase the table, because the other suites
          // still have something to say.
          try { await suite.run(Object.assign({}, ctx, { d, width, theme, textSize, lang })); }
          catch (e) { results.fail("suite", s.name + (width === "narrow" ? " @1024" : "") + (theme === "light" ? " light" : "") + (textSize === "standard" ? "" : " " + textSize) + (lang === "en" ? "" : " " + lang), "the suite threw: " + String(e && e.message ? e.message : e).split("\n")[0]); }
          finally { await d.close(); }
        }
      }
    }
    // What only the finished run can prove: every page driven in light as well as dark, and the
    // layout record, which is written or compared once the pages have all been walked.
    if (!only.length || only.indexOf("pages") >= 0) {
      require("./cases/coverage").runLate(ctx);
      require("./lib/layout").finish(results);
    }
    // Every call any suite made, in either language, said the language its screen is drawn in.
    require("./cases/language").runLate(ctx);
  } finally {
    await browser.close();
    await srv.close();
  }

  const unstubbed = Array.from(new Set(stubs.calls.filter((c) => c.unstubbed).map((c) => c.method + " " + c.path)));
  if (unstubbed.length) results.note("calls with no stub rule, answered with an empty shape: " + unstubbed.join(", "));

  const partialRun = only.length > 0;
  if (partialRun) results.note("partial run, AUDIT_ONLY=" + only.join(","));
  printDetail(results);
  printKnown(results, partialRun);
  printNotes(results);
  const failures = printTable(results, Math.round((Date.now() - started) / 1000), partialRun);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  process.stdout.write("\naudit failed to run: " + (e && e.stack ? e.stack : e) + "\n");
  process.exit(2);
});
