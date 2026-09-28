// npm run audit. One process, one table, non-zero exit on any failure.
//
// It builds the production bundle, serves it, and drives it in a headless browser at 1280 by 900,
// then repeats the pages, views and tables at 1024 to catch a table that will not fit, and the pages
// once more on a phone, 390 by 844, to catch a page that will not fit a hand.
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
  { name: "pages", mod: "./cases/pages", widths: ["wide", "narrow", "phone"],
    variants: [{ theme: "dark", size: "standard", only: ["wide", "narrow"] }, { theme: "light", size: "standard", only: ["wide", "narrow"] },
      { theme: "dark", size: "largest", only: ["wide", "narrow"] },
      // Spanish at 1024 only, where a third more letters is what breaks a page, and for the two
      // people who live in these screens. The English passes cover the other width and the rest.
      { theme: "dark", size: "standard", lang: "es", only: "narrow" },
      // The phone, 390 wide, once: in light at Standard in English, as the admin and the supervisor,
      // so the run time stays bounded. Windows and the Spanish pass at 390 wait for a later step.
      { theme: "light", size: "standard", only: "phone" }] },
  { name: "views", mod: "./cases/views", widths: ["wide"] },
  // The filed report window is read in every theme, at every text size, at both widths, because a
  // table inside a window is the first thing to run off the side.
  { name: "filed-forms", mod: "./cases/filed-forms", widths: ["wide", "narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "light", size: "standard" },
      { theme: "dark", size: "largest" }, { theme: "light", size: "largest" }] },
  // Photos on a filed form and the signature box, in both languages, since the refusals under a
  // question and the words in the box are the table's.
  { name: "filed-photos", mod: "./cases/filed-photos", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Starting and filing a form from the dashboard, in both languages, since the picker's titles and
  // every word in the window come from the catalog and the table.
  { name: "start-form", mod: "./cases/start-form", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Customer links and their QR codes, and a customer's filings in Filed forms, in both languages,
  // since every word in the window and on the printed sheet comes from the table or the API.
  { name: "customer-links", mod: "./cases/customer-links", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
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
  // Help's answer as it is written, read part way through, in both languages.
  { name: "help-stream", mod: "./cases/help-stream", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // The checklist editor on Sites asks for every item, and Forms is in the menu for whoever it opens for.
  { name: "checklist", mod: "./cases/checklist", widths: ["wide"] },
  { name: "forms-menu", mod: "./cases/forms-menu", widths: ["wide"] },
  // The role, the training type and the onboarding category on HR Records, and a role on Shift Pickup,
  // are words, in both languages.
  { name: "hr-roles", mod: "./cases/hr-roles", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Staff Management draws a role, a status and an employment type as words, shows which onboarding
  // steps are done and saves exactly what it saves in English, and Cases draws what a person typed
  // exactly as typed, in both languages at 1024.
  { name: "staff-cases", mod: "./cases/staff-cases", widths: ["narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Scout 141's leftovers since Step 185: the test account's mark, the supplies' QR images from the API,
  // the certification counts and a notice's link to a record, in both languages.
  { name: "leftovers", mod: "./cases/leftovers", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Capabilities since Step 181: the shell reads its own from the me route, and a control shows for a
  // holder of what guards it, by role or by override, in both languages.
  { name: "capabilities", mod: "./cases/capabilities", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Staff, PINs and badges since Step 181: the Temporary PIN window after Add New Staff, Reset PIN's box
  // and toast, an admin's account locked to a holder of manage_admins, and the employee ID line, in
  // both languages at 1024.
  { name: "staff-pins", mod: "./cases/staff-pins", widths: ["narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Settings shows each list value's English and, in another language, its words there, and saves
  // exactly what it saves in English, in both languages at 1024.
  { name: "settings", mod: "./cases/settings", widths: ["narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // The questions Schedule and Shift Pickup ask before they change something, and a site's zone
  // chips, in both languages.
  { name: "questions", mod: "./cases/questions", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  { name: "zone-chips", mod: "./cases/zone-chips", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Every printed page on a page taken as done, opened the way a person opens it and read in both
  // languages.
  { name: "prints", mod: "./cases/prints", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Each report's screen and charts, as each person Reports opens for, and what the report editor
  // saves, in English and in Spanish at 1024.
  { name: "report-screens", mod: "./cases/report-screens", widths: ["narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Log training for a whole room at once: the window as a supervisor, what it sends and what it
  // says, in English and in Spanish, and on a phone at every text size. The suite makes its own passes,
  // since the phone's are 390 wide.
  { name: "training", mod: "./cases/training", widths: [] },
  // Every staff picker fills for a supervisor, whom the stub refuses the staff list the way the API
  // does: each picker as the supervisor and as an admin, and what each sends, in both languages at 1024.
  { name: "pickers", mod: "./cases/pickers", widths: ["narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Six small things before training: the month's started count at one and two, the Issues page with
  // nothing reported, Live Ops' refresh icon and the complaint log's title, in both languages.
  { name: "before-training", mod: "./cases/before-training", widths: ["wide"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es" }] },
  // Four small things beside the phone: Schedule's refresh icon, the Staff table against its box, the
  // training example and the names in the Dropdown Options editor, in English at both widths and in
  // Spanish at 1024.
  { name: "small-things", mod: "./cases/small-things", widths: ["wide", "narrow"],
    variants: [{ theme: "dark", size: "standard" }, { theme: "dark", size: "standard", lang: "es", only: "narrow" }] },
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
  // AUDIT_LANG=es drives only the passes drawn in that language, and the suites that have no pass at
  // all, such as house-style. With AUDIT_ONLY=pages it is the Spanish check on its own.
  const langOnly = (process.env.AUDIT_LANG || "").trim();
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
          // A variant names the widths it runs at, one or several; one that names none runs at all.
          if (v.only && [].concat(v.only).indexOf(width) < 0) continue;
          const theme = v.theme || "dark";
          const textSize = v.size || "standard";
          const lang = v.lang || "en";
          if (langOnly && lang !== langOnly) continue;
          process.stdout.write("run        " + s.name + " at " + (width === "wide" ? "1280x900" : width === "narrow" ? "1024x900" : "390x844")
            + " in " + theme + (textSize === "standard" ? "" : ", text " + textSize)
            + (lang === "en" ? "" : ", in " + lang) + "\n");
          const passStarted = Date.now();
          const d = await createDriver({ browser, origin: srv.origin, stubs, viewport: width, theme, textSize, lang });
          // A suite that throws fails the run. It does not erase the table, because the other suites
          // still have something to say.
          try { await suite.run(Object.assign({}, ctx, { d, width, theme, textSize, lang })); }
          catch (e) { results.fail("suite", s.name + (width === "narrow" ? " @1024" : width === "phone" ? " @390" : "") + (theme === "light" ? " light" : "") + (textSize === "standard" ? "" : " " + textSize) + (lang === "en" ? "" : " " + lang), "the suite threw: " + String(e && e.message ? e.message : e).split("\n")[0]); }
          finally { await d.close(); }
          // How long the pass took, so a pass that grows is seen to grow.
          process.stdout.write("           " + Math.round((Date.now() - passStarted) / 1000) + "s\n");
        }
      }
    }
    // What only the finished run can prove: every page driven in light as well as dark, and the
    // layout record, which is written or compared once the pages have all been walked.
    if ((!only.length || only.indexOf("pages") >= 0) && !langOnly) {
      require("./cases/coverage").runLate(ctx);
      require("./lib/layout").finish(results);
    }
    // Every call any suite made, in either language, said the language its screen is drawn in.
    require("./cases/language").runLate(ctx);
    // Every read of a site's checklist any suite made asked for every item of every shift.
    require("./cases/checklist").runLate(ctx);
  } finally {
    await browser.close();
    await srv.close();
  }

  const unstubbed = Array.from(new Set(stubs.calls.filter((c) => c.unstubbed).map((c) => c.method + " " + c.path)));
  if (unstubbed.length) results.note("calls with no stub rule, answered with an empty shape: " + unstubbed.join(", "));

  const partialRun = only.length > 0 || langOnly !== "";
  if (partialRun) results.note("partial run" + (only.length ? ", AUDIT_ONLY=" + only.join(",") : "") + (langOnly ? ", AUDIT_LANG=" + langOnly : ""));
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
