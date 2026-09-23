// English left on a Spanish screen.
//
// On a Spanish pass every piece of text a person reads has to be one of four things: a Spanish value
// from the word table, a value the API served, a number or a date or a time, or the company's own
// name, which nobody translates. Anything else is a string somebody forgot, and it is named here by
// the page, the person and the words themselves.
//
// A line is checked by taking the allowed pieces out of it, longest first, along with the numbers
// and the punctuation. What is left is what nobody accounted for.
"use strict";
const fs = require("fs");
const path = require("path");
const { spanishValues } = require("./words");

const CLIENT = path.resolve(__dirname, "..", "..", "src", "clientConfig.js");

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

const NUMBERS = /(\d+[\d.,:/%$-]*)/g;
const PUNCT = /[\s.,:;!?()[\]{}<>|/\\_+*&#%$@"'`~^=-]+/g;

// A value with {0} in it is a sentence built from pieces, so it is matched as a shape rather than
// as a string: the words have to be there, in that order, with anything in the gaps.
const escapeRe = (s0) => String(s0).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function patternRe(value) {
  const parts = String(value).split(/\{\d+\}/).map(escapeRe);
  return new RegExp("^" + parts.join("[\\s\\S]*?") + "$");
}

// What is left of a line once everything allowed is taken out of it.
function residue(line, allowedSorted) {
  let left = " " + String(line) + " ";
  for (let i = 0; i < allowedSorted.length; i += 1) {
    const word = allowedSorted[i];
    if (!word || word.length < 2) continue;
    if (left.indexOf(word) < 0) continue;
    left = left.split(word).join(" ");
    if (!/[A-Za-z]/.test(left)) return "";
  }
  left = left.replace(NUMBERS, " ").replace(PUNCT, " ").trim();
  return left;
}

// The check itself. `texts` is every line a person reads; `calls` is what the stub answered.
function englishLeftOn(texts, calls) {
  const allowed = new Set(spanishValues());
  clientNames().forEach((v) => allowed.add(v));
  const served = servedValues(calls);
  served.forEach((v) => allowed.add(v));
  // An avatar draws a person's initials, which are that person's name written short. Any run of
  // capitals that a served name begins its words with is the same data, not a word to translate.
  served.forEach((v) => {
    const initials = String(v).split(/\s+/).map((w) => w[0]).filter(Boolean).join("");
    if (initials.length >= 2 && /^[A-Z]+$/.test(initials)) allowed.add(initials);
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
    if (seen.has(line)) return;
    seen.add(line);
    if (shapes.some((re) => re.test(line))) return;
    const left = residue(line, sorted);
    if (left && /[A-Za-z]{2}/.test(left)) bad.push({ line: line.slice(0, 80), left: left.slice(0, 60) });
  });
  return bad;
}

module.exports = { englishLeftOn, servedValues, clientNames, residue };
