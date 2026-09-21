// The gate that makes coverage proven rather than claimed.
//
// Every page id in the app's own PAGE_IDS and every <Mdl site in src/App.js must be claimed by
// audit/inventory.js. One that is not prints NO CASE and fails the run.
"use strict";

function run({ app, inventory, results }) {
  const claimedPages = new Set(inventory.PAGES.map((p) => p.id));
  app.pages.forEach((id) => {
    if (!claimedPages.has(id)) results.noCase("coverage", "page " + id, "PAGE_IDS in src/App.js:46");
  });
  inventory.PAGES.forEach((p) => {
    if (app.pages.indexOf(p.id) < 0) {
      results.fail("coverage", "page " + p.id, "declared in audit/inventory.js but gone from PAGE_IDS");
    }
  });

  const claimedLines = new Map();
  inventory.WINDOWS.forEach((w) => w.lines.forEach((l) => claimedLines.set(l, w.id)));
  app.modals.forEach((m) => {
    if (!claimedLines.has(m.line)) results.noCase("coverage", "window in " + m.owner, m.at);
  });
  Array.from(claimedLines.keys()).forEach((l) => {
    if (!app.modals.some((m) => m.line === l)) {
      results.fail("coverage", "window claim src/App.js:" + l, "claimed by " + claimedLines.get(l) + " but no <Mdl is there. Re-read the line numbers.");
    }
  });

  const viewPages = new Set(inventory.VIEWS.map((v) => v.page));
  app.pages.forEach((id) => {
    if (!viewPages.has(id)) results.noCase("coverage", "views for page " + id, "no view case claims this page");
  });

  results.pass("coverage", "pages and windows in src/App.js are all claimed",
    app.pages.length + " pages, " + app.modals.length + " windows");
}

// A page nobody drove in light mode. This runs after the suites, since only the finished run can
// say which pages were driven in which theme.
function runLate({ app, results }) {
  const inLight = new Set();
  results.rows.forEach((r) => {
    if (r.id.indexOf(" light") < 0) return;
    const m = /^page\/([a-z-]+)\//.exec(r.id);
    if (m) inLight.add(m[1]);
  });
  app.pages.forEach((id) => {
    if (!inLight.has(id)) results.noCase("coverage", "page " + id + " in light", "no light-mode case drove this page");
  });
  results.pass("coverage", "every page is driven in light as well as dark", app.pages.length + " pages");
}

module.exports = { run, runLate };
