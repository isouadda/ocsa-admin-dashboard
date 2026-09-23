// The house rule, checked against the source rather than a list.
//
// CLAUDE.md: the certification framework acronym must never appear in any screen, label or export
// that staff or a client sees. audit/discover.js scans src/App.js for it in JSX text, in a heading
// and in an export column header, so a new one is caught the run after it is written. The acronym
// itself is never printed here; each place is named by file and line.
"use strict";
const { findNonAscii } = require("../lib/ascii");
const { compare } = require("../lib/words");

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

  // The word table and the CSV a translator edits are two copies of one thing. A key in one and not
  // the other, or the same key saying two different words, is a screen nobody proofread.
  const words = compare();
  const say = (list) => list.slice(0, 3).map((p) => JSON.stringify(p[0]) + " to " + JSON.stringify(p[1])).join("; ");
  results.check("house-style", inventory.WORD_TABLE.id, words.ok,
    words.why ? words.why
      : words.missing.length + " in the table and not the CSV (" + say(words.missing) + "), "
        + words.extra.length + " in the CSV and not the table (" + say(words.extra) + ")");
  if (words.ok) {
    results.note("the word table holds " + words.entries + " entries and the CSV " + words.rows + " rows, which agree");
  }
}

module.exports = { run };
