// The house rule, checked against the source rather than a list.
//
// CLAUDE.md: the certification framework acronym must never appear in any screen, label or export
// that staff or a client sees. audit/discover.js scans src/App.js for it in JSX text, in a heading
// and in an export column header, so a new one is caught the run after it is written. The acronym
// itself is never printed here; each place is named by file and line.
"use strict";

function run({ app, results, inventory }) {
  const sites = app.bannedAcronym;
  const id = inventory.HOUSE_STYLE.id;

  results.check("house-style", id, sites.length === 0,
    sites.length === 0 ? "the acronym reaches no screen, label or export"
      : sites.length + " places a person reads: " + sites.map((s) => s.at + " in " + s.owner).join(", "));

  // Each place is named on its own line, so a partial sweep shows which ones are left.
  sites.forEach((s) => {
    results.note("the banned acronym reaches a person at " + s.at + ", in " + s.owner);
  });
}

module.exports = { run };
