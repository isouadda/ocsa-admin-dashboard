// The word table and the translator's CSV, read from source and compared.
//
// src/words.js is what the screen reads and is written in \u escapes so the file stays ASCII.
// translation/dashboard_words.csv is what a translator reads and carries the accented text itself.
// They are two copies of one thing, so the run fails if they ever disagree: a key in one and not the
// other, or the same key saying two different words.
"use strict";
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const ROOT = path.resolve(__dirname, "..", "..");
const WORDS_JS = path.join(ROOT, "src", "words.js");
const CSV = path.join(ROOT, "translation", "dashboard_words.csv");

// The table as a plain object, read out of the parsed file rather than by running it, since the
// suite is CommonJS and the app is a module.
function readTable() {
  if (!fs.existsSync(WORDS_JS)) return null;
  const ast = parser.parse(fs.readFileSync(WORDS_JS, "utf8"), { sourceType: "module" });
  let node = null;
  const visit = (decl) => {
    (decl.declarations || []).forEach((d) => {
      if (d.id && d.id.name === "WORDS" && d.init && d.init.type === "ObjectExpression") node = d.init;
    });
  };
  ast.program.body.forEach((n) => {
    if (n.type === "VariableDeclaration") visit(n);
    if (n.type === "ExportNamedDeclaration" && n.declaration && n.declaration.type === "VariableDeclaration") visit(n.declaration);
  });
  if (!node) return null;
  const out = {};
  node.properties.forEach((p) => {
    if (p.type !== "ObjectProperty") return;
    const key = p.key.value !== undefined ? p.key.value : p.key.name;
    const entry = {};
    if (p.value.type === "ObjectExpression") {
      p.value.properties.forEach((q) => {
        if (q.type !== "ObjectProperty") return;
        const lang = q.key.value !== undefined ? q.key.value : q.key.name;
        if (q.value.type === "StringLiteral") entry[lang] = q.value.value;
        else if (q.value.type === "ObjectExpression") {
          const forms = {};
          q.value.properties.forEach((f) => {
            if (f.type === "ObjectProperty" && f.value.type === "StringLiteral") {
              forms[f.key.value !== undefined ? f.key.value : f.key.name] = f.value.value;
            }
          });
          entry[lang] = forms;
        }
      });
    }
    out[key] = entry;
  });
  return out;
}

// One CSV row at a time, with quoted cells and doubled quotes inside them.
function readCsv() {
  if (!fs.existsSync(CSV)) return null;
  const text = fs.readFileSync(CSV, "utf8");
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(cell); cell = ""; continue; }
    if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (c === "\r") continue;
    cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift() || [];
  return { head: head, rows: rows.filter((r) => r.length >= 2 && (r[0] !== "" || r[1] !== "")) };
}

const baseOf = (key) => { const i = String(key).lastIndexOf("|"); return i > 0 ? String(key).slice(0, i) : String(key); };

// What the CSV has to say, derived from the table: one row per key, and one row per form for a key
// that carries a count.
function expectedPairs(table) {
  const pairs = [];
  Object.keys(table).forEach((key) => {
    const es = table[key].es;
    if (typeof es === "string") { pairs.push([baseOf(key), es]); return; }
    if (es && typeof es === "object") {
      const en = table[key].en || {};
      Object.keys(es).forEach((form) => {
        pairs.push([en[form] !== undefined ? en[form] : baseOf(key), es[form]]);
      });
    }
  });
  return pairs;
}

function compare() {
  const table = readTable();
  const csv = readCsv();
  if (!table) return { ok: false, why: "src/words.js has no WORDS table" };
  if (!csv) return { ok: false, why: "translation/dashboard_words.csv is not there" };
  const want = expectedPairs(table);
  const key = (p) => p[0] + "\u0000" + p[1];
  const have = csv.rows.map((r) => [r[0], r[1]]);
  const haveSet = new Set(have.map(key));
  const wantSet = new Set(want.map(key));
  const missing = want.filter((p) => !haveSet.has(key(p)));
  const extra = have.filter((p) => !wantSet.has(key(p)));
  return {
    ok: missing.length === 0 && extra.length === 0,
    entries: Object.keys(table).length,
    rows: csv.rows.length,
    missing: missing,
    extra: extra,
    head: csv.head.join(","),
  };
}

module.exports = { readTable, readCsv, expectedPairs, compare, WORDS_JS, CSV };
