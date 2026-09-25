// The house rule, checked against the source rather than a list.
//
// CLAUDE.md: the certification framework acronym must never appear in any screen, label or export
// that staff or a client sees. audit/discover.js scans src/App.js for it in JSX text, in a heading
// and in an export column header, so a new one is caught the run after it is written. The acronym
// itself is never printed here; each place is named by file and line.
"use strict";
const fs = require("fs");
const { findNonAscii } = require("../lib/ascii");
const { compare, slotCheck } = require("../lib/words");
const { APP } = require("../lib/strings");
const { count } = require("../count");
const TODO = require("path").resolve(__dirname, "..", "spanish-todo.json");

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

  // Every sentence that carries a value keeps that value in every language.
  const slots = slotCheck();
  const shown = slots.slice(0, 3).map((w) => JSON.stringify(w.key) + ": English has {" + (w.want || "none")
    + "} and Spanish has {" + (w.got || "none") + "}").join("; ");
  results.check("house-style", inventory.WORD_SLOTS.id, slots.length === 0,
    slots.length + " entries whose Spanish does not carry the same values as its English: " + shown);
  slots.slice(0, 20).forEach((w) => {
    results.note("the Spanish for " + JSON.stringify(w.key) + " carries {" + (w.got || "none")
      + "} where its English carries {" + (w.want || "none") + "}");
  });

  // The finder reads a printed page's words, so every page the app opens in a window is counted with
  // the component that builds it. What it finds is held to a plain count of the pages the source
  // opens: a finder that stops reading them finds fewer than there are.
  const { pages, prints } = count();
  const opened = (fs.readFileSync(APP, "utf8").match(/<!DOCTYPE html/gi) || []).length;
  results.check("house-style", inventory.FINDER_PRINTS.id, prints.length === opened && opened > 0,
    "the finder names " + prints.length + " printed pages where src/App.js opens " + opened);
  results.note("the finder reads " + prints.length + " printed pages: " + prints.map((r) => r.id + " (" + (r.pages.join(", ") || "no page") + ", " + r.places + " left)").join("; "));

  // A page taken as done has no English left anywhere the finder looks, a printed page included.
  const left = pages.filter((p) => p.part === "done" && p.places > 0);
  results.check("house-style", inventory.DONE_PAGES_READ_NO_ENGLISH.id, left.length === 0,
    left.map((p) => p.id + " has " + p.places + " places the finder reads as English, in " + p.owners.join(", ")).join("; "));

  // A page still in English names each printed page the finder counts English on, so the part that
  // takes the page takes its prints with it, and a print that turns Spanish comes off the list.
  const todo = JSON.parse(fs.readFileSync(TODO, "utf8")).pages;
  const off = Object.keys(todo).map((id) => {
    const named = (todo[id].prints || []).slice().sort();
    const counted = prints.filter((r) => r.pages.indexOf(id) >= 0 && r.places > 0).map((r) => r.id).sort();
    return named.join("|") === counted.join("|") ? null
      : id + " names " + (named.join(", ") || "no print") + " where the finder counts English on " + (counted.join(", ") || "no print");
  }).filter(Boolean);
  results.check("house-style", inventory.TODO_NAMES_PRINTS.id, off.length === 0, off.join("; "));
}

module.exports = { run };
