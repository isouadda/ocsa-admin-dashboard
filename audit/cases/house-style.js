// The house rule, checked against the source rather than a list.
//
// CLAUDE.md: the certification framework acronym must never appear in any screen, label or export
// that staff or a client sees. audit/discover.js scans src/App.js for it in JSX text, in a heading
// and in an export column header, so a new one is caught the run after it is written. The acronym
// itself is never printed here; each place is named by file and line.
"use strict";
const { findNonAscii } = require("../lib/ascii");

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

  // The second house rule: every file under src/ is plain ASCII, so a language written in escapes
  // cannot lose an accent to an editor, a terminal or a patch on the way to the screen.
  const ascii = findNonAscii();
  const named = ascii.hits.slice(0, 3)
    .map((h) => h.file + " line " + h.line + " character " + h.column + ", " + h.escape).join("; ");
  results.check("house-style", inventory.ASCII_ONLY.id, ascii.hits.length === 0,
    ascii.hits.length + " bytes outside ASCII in the " + ascii.files + " files under src: " + named);
  ascii.hits.slice(0, 20).forEach((h) => {
    results.note("a byte outside ASCII at " + h.file + " line " + h.line + " character " + h.column
      + ". Write it as " + h.escape);
  });
}

module.exports = { run };
