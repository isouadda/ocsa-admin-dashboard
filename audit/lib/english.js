// English left on a Spanish screen.
//
// On a Spanish pass every piece of text a person reads has to be one of six things: a Spanish value
// from the word table, a value the API served, a number or a date or a time, the company's own name,
// which nobody translates, a language's own name, or a controlled document's code (OCSA-QMS-018),
// which is printed the same on every edition. Anything else is a string somebody forgot, and it is
// named here by the page, the person and the words themselves.
//
// A line is checked by taking the allowed pieces out of it, longest first, along with the numbers
// and the punctuation. What is left is what nobody accounted for.
"use strict";
const fs = require("fs");
const path = require("path");
const { spanishValues } = require("./words");

const CLIENT = path.resolve(__dirname, "..", "..", "src", "clientConfig.js");
const WORDS_JS = path.resolve(__dirname, "..", "..", "src", "words.js");

// The company's own words: its name, its short name, its tag and where it is.
function clientNames() {
  const out = new Set();
  if (!fs.existsSync(CLIENT)) return out;
  const text = fs.readFileSync(CLIENT, "utf8");
  const re = /'([^']{2,60})'|"([^"]{2,60})"/g;
  let m;
  while ((m = re.exec(text))) {
    const v = (m[1] || m[2]).trim();
    if (/[A-Za-z]/.test(v) && !/^#/.test(v)) out.add(v);
  }
  return out;
}

// The build's own stamp, which Settings draws on its last line (Round 1): the commit the dashboard was
// built from, or local and the time, written by scripts/stamp.js into the build's version.json. It names
// the code and nobody translates it.
function buildStamp() {
  const file = path.resolve(__dirname, "..", "..", "build", "version.json");
  try { const v = JSON.parse(fs.readFileSync(file, "utf8")).stamp; return v ? [String(v)] : []; } catch (e) { return []; }
}

// Each language's name as the language writes it, from the list the language control and Staff
// Management's language choice draw. A person looks for their own language, so each is named in its
// own tongue whatever the screen is drawn in, and nobody translates one.
function languageNames() {
  const out = new Set();
  if (!fs.existsSync(WORDS_JS)) return out;
  const text = fs.readFileSync(WORDS_JS, "utf8");
  const at = text.indexOf("export const LANGUAGES");
  if (at < 0) return out;
  const block = text.slice(at, text.indexOf("];", at));
  const re = /label:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(block))) out.add(JSON.parse('"' + m[1] + '"'));
  // The languages a kept record may be written in add their own names to that list in src/App.js
  // (RECORD_LANGUAGES, French as Francais in its own spelling), and are allowed the same way (the
  // October audit, part 343: Help insights' language filter read that name as English).
  const APP = path.resolve(__dirname, "..", "..", "src", "App.js");
  if (fs.existsSync(APP)) {
    const app = fs.readFileSync(APP, "utf8");
    const at2 = app.indexOf("const RECORD_LANGUAGES");
    if (at2 >= 0) {
      const line = app.slice(at2, app.indexOf("\n", at2));
      let m2;
      while ((m2 = re.exec(line))) out.add(JSON.parse('"' + m2[1] + '"'));
    }
  }
  return out;
}

// Every string the stub answered with, at any depth.
function servedValues(calls) {
  const out = new Set();
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === "string") { if (v.trim()) out.add(v.trim()); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === "object") { Object.keys(v).forEach((k) => walk(v[k])); return; }
  };
  (calls || []).forEach((c) => walk(c.json));
  return out;
}

// A date drawn by the formatter carries the month and weekday names the language itself uses, and
// those are in no word table. Only the Spanish ones are allowed, so an English month left on a
// Spanish screen is still caught.
function localeDateWords(tag) {
  const out = new Set();
  ["long", "short", "narrow"].forEach((width) => {
    for (let m = 0; m < 12; m += 1) {
      out.add(new Date(2026, m, 15).toLocaleDateString(tag, { month: width }));
    }
    for (let d = 4; d < 11; d += 1) {
      out.add(new Date(2026, 0, d).toLocaleDateString(tag, { weekday: width }));
    }
  });
  // The words the formatter joins a date with, "de" in "17 de mar de 2026". The language writes them
  // and no word table holds them either.
  [{ weekday: "short", month: "short", day: "numeric", year: "numeric" }, { month: "long", day: "numeric", year: "numeric" },
    { weekday: "long", month: "long", day: "numeric" }, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }]
    .forEach((o) => {
      new Intl.DateTimeFormat(tag, o).formatToParts(new Date(2026, 2, 17, 21, 30)).forEach((part) => {
        if (part.type !== "literal") return;
        part.value.split(/[\s.,:;/-]+/).forEach((w) => { if (/[A-Za-z]/.test(w)) out.add(w); });
      });
    });
  const morning = new Date(2026, 0, 5, 9, 30).toLocaleTimeString(tag, { hour: "numeric", minute: "2-digit" });
  const evening = new Date(2026, 0, 5, 21, 30).toLocaleTimeString(tag, { hour: "numeric", minute: "2-digit" });
  [morning, evening].forEach((t) => {
    const mark = String(t).replace(/[\d:\s.,]/g, "");
    if (mark) out.add(mark);
  });
  return out;
}

const NUMBERS = /(\d+[\d.,:/%$-]*)/g;
// A controlled document's code: letters in two or three parts and a number, OCSA-QMS-018 or
// OCSA-FRM-033. Taken out whole, so its middle part is not read as an English word (the October
// audit, part 343: Reports' Management review card read "QMS" as English).
const DOC_CODES = /(?<![A-Za-z0-9])[A-Z]{2,6}(?:-[A-Z]{2,6}){1,2}-\d{2,4}(?![A-Za-z0-9])/g;
const PUNCT = /[\s.,:;!?()[\]{}<>|/\\_+*&#%$@"'`~^=-]+/g;

// A value with {0} in it is a sentence built from pieces, so it is matched as a shape rather than
// as a string: the words have to be there, in that order, with anything in the gaps.
const escapeRe = (s0) => String(s0).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function patternRe(value) {
  const parts = String(value).split(/\{\d+\}/).map(escapeRe);
  return new RegExp("^" + parts.join("([\\s\\S]*?)") + "$");
}

// A piece shorter than three letters is taken out only where it stands as a word of its own. Out of
// the middle of a word it takes part of an English word with it and hides the rest: the language
// codes the seed serves, "es" and "en", left "Sites" as "Sit" and "Yes" as one letter, and the "am"
// of a Spanish time left "Name" as two.
const SHORT = 3;
const wordRes = new Map();
function wordRe(word) {
  if (!wordRes.has(word)) wordRes.set(word, new RegExp("(?<!\\p{L})" + escapeRe(word) + "(?!\\p{L})", "gu"));
  return wordRes.get(word);
}

// What is left of a line once everything allowed is taken out of it.
function residue(line, allowedSorted) {
  let left = (" " + String(line) + " ").replace(DOC_CODES, " ");
  for (let i = 0; i < allowedSorted.length; i += 1) {
    const word = allowedSorted[i];
    if (!word || word.length < 2) continue;
    if (left.indexOf(word) < 0) continue;
    left = word.length < SHORT ? left.replace(wordRe(word), " ") : left.split(word).join(" ");
    if (!/[A-Za-z]/.test(left)) return "";
  }
  left = left.replace(NUMBERS, " ").replace(PUNCT, " ").trim();
  return left;
}

// The check itself. `texts` is every line a person reads; `calls` is what the stub answered.
function englishLeftOn(texts, calls) {
  const allowed = new Set(spanishValues());
  // A sentence with a piece set apart in its slot, a name in bold for instance, is drawn as three
  // runs of text, and each run is read on its own. Each side of a slot is Spanish when it is the
  // whole run. It is never taken out of the middle of other text, where a side as short as "en" or
  // "de" would take the middle out of an English word and hide it.
  const runs = new Set();
  Array.from(allowed).forEach((v) => {
    if (!/\{\d+\}/.test(v)) return;
    String(v).split(/\{\d+\}/).map((s0) => s0.replace(/\s+/g, " ").trim()).forEach((side) => {
      if (/[A-Za-z]{2}/.test(side)) runs.add(side);
    });
  });
  clientNames().forEach((v) => allowed.add(v));
  languageNames().forEach((v) => allowed.add(v));
  buildStamp().forEach((v) => allowed.add(v));
  localeDateWords("es-US").forEach((v) => allowed.add(v));
  const served = servedValues(calls);
  served.forEach((v) => allowed.add(v));
  // An avatar draws a person's initials, which are that person's name written short. Any run of
  // capitals that a served name begins its words with is the same data, not a word to translate.
  served.forEach((v) => {
    const initials = String(v).split(/\s+/).map((w) => w[0]).filter(Boolean).join("");
    if (initials.length >= 2 && /^[A-Z]+$/.test(initials)) allowed.add(initials);
  });
  // A vendor's avatar draws the first two letters of its name in capitals, the same data again.
  served.forEach((v) => {
    const name = String(v).trim();
    if (name.length > 2 && /^[A-Z][a-z]/.test(name)) allowed.add(name.slice(0, 2).toUpperCase());
  });
  // A single letter or a bare number is not a word anybody translates.
  const all = Array.from(allowed).filter((v) => v.length >= 2);
  const shapes = all.filter((v) => /\{\d+\}/.test(v)).map(patternRe);
  const sorted = all.filter((v) => !/\{\d+\}/.test(v)).sort((a, b) => b.length - a.length);
  const bad = [];
  const seen = new Set();
  (texts || []).forEach((raw) => {
    const line = String(raw).replace(/\s+/g, " ").trim();
    if (!line || !/[A-Za-z]/.test(line)) return;
    // A web address, or the start of one a field shows as its example, is the same in every language.
    if (/^https?:\/\/\S*$/.test(line)) return;
    if (seen.has(line)) return;
    seen.add(line);
    if (runs.has(line)) return;
    // A shape matches only when what landed in its gaps is accounted for as well. "{0}h", the
    // bell's short age, would otherwise swallow any word ending in h. A run can open with the mark
    // a screen puts between two things, as a folder's " . " before the hire date does, so the shape
    // is tried on the run with that mark taken off too.
    const fitsShape = (whole) => {
      const bare = whole.replace(/^[\s.,;:|/-]+/, "");
      return shapes.some((re) => [whole, bare].some((text) => {
        const m = re.exec(text);
        if (!m) return false;
        return m.slice(1).every((gap) => !/[A-Za-z]{2}/.test(residue(gap, sorted)));
      }));
    };
    if (fitsShape(line)) return;
    // A sentence set in brackets after a figure, as Help insights' By site draws "4 (2 sin respuesta)",
    // is read as a run of its own (the October audit, part 343).
    const unwrapped = line.replace(/\(([^()]*)\)/g, (m, inner) => (fitsShape(inner.trim()) ? " " : m));
    const left = residue(unwrapped, sorted);
    if (left && /[A-Za-z]{2}/.test(left)) bad.push({ line: line.slice(0, 80), left: left.slice(0, 60) });
  });
  return bad;
}

module.exports = { englishLeftOn, servedValues, clientNames, languageNames, residue, localeDateWords };
