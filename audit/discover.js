// Reads the app's own lists out of src/App.js, so coverage is proven rather than claimed.
//
// Nothing here is a copy of the app's inventory. PAGE_IDS, pageLabels, every <Mdl usage and every
// tab array are read from the source at run time, and run.js fails the run when one of them has no
// case in audit/inventory.js. Add a page to src/App.js and the run prints NO CASE for it.
"use strict";
const fs = require("fs");
const path = require("path");

const APP = path.resolve(__dirname, "..", "src", "App.js");

function readSource() {
  return fs.readFileSync(APP, "utf8");
}

function pageIds(src) {
  const m = src.match(/const PAGE_IDS = \[([^\]]*)\]/);
  if (!m) throw new Error("PAGE_IDS not found in src/App.js. The audit cannot prove page coverage.");
  return m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

function pageLabels(src) {
  const m = src.match(/const pageLabels = \{([^}]*)\}/);
  if (!m) throw new Error("pageLabels not found in src/App.js.");
  const out = {};
  m[1].split(",").forEach((pair) => {
    const kv = pair.split(":");
    if (kv.length < 2) return;
    out[kv[0].trim()] = kv.slice(1).join(":").trim().replace(/^["']|["']$/g, "");
  });
  return out;
}

// Which page ids the render switch gates on isAdmin, read off the switch itself.
function adminOnlyPages(src) {
  const out = [];
  const re = /\{page === "([a-z]+)" && isAdmin &&/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

// Every function in the file, so a line number can be named by the component it sits in.
function functionIndex(src) {
  const lines = src.split("\n");
  const funcs = [];
  lines.forEach((l, i) => {
    const m = l.match(/^(?:function|const)\s+([A-Za-z0-9_]+)\s*(?:=\s*(?:\(|function)|\()/);
    if (m) funcs.push({ name: m[1], line: i + 1 });
  });
  return (line) => {
    let last = "(module scope)";
    for (const f of funcs) { if (f.line <= line) last = f.name; else break; }
    return last;
  };
}

// Every window the app can put on screen: one entry per <Mdl in the source.
function modalSites(src) {
  const lines = src.split("\n");
  const owner = functionIndex(src);
  const out = [];
  lines.forEach((l, i) => {
    let idx = l.indexOf("<Mdl");
    while (idx >= 0) {
      const line = i + 1;
      // The state that opens it: the setter inside onClose is the reliable name.
      const tail = l.slice(idx, idx + 400);
      const close = tail.match(/onClose=\{\(\)\s*=>\s*\{?\s*([A-Za-z0-9_]+)\(/);
      out.push({ line, owner: owner(line), closer: close ? close[1] : "onClose", at: "src/App.js:" + line });
      idx = l.indexOf("<Mdl", idx + 1);
    }
  });
  return out;
}

// Every place the acronym the house style bans reaches a screen, a label or an export.
function bannedAcronymSites(src) {
  const lines = src.split("\n");
  const owner = functionIndex(src);
  const needle = ["C", "I", "M", "S"].join("");
  const out = [];
  lines.forEach((l, i) => {
    if (l.indexOf(needle) < 0) return;
    const line = i + 1;
    // Only count text a person can read: a JSX label, a heading, or an export column.
    const visible = new RegExp('(>|"|\')\\s*' + needle + '\\b').test(l) || new RegExp('\\b' + needle + '\\s(Category|Phase)').test(l);
    if (!visible) return;
    out.push({ line, owner: owner(line), at: "src/App.js:" + line });
  });
  return out;
}

function discover() {
  const src = readSource();
  return {
    src,
    pages: pageIds(src),
    labels: pageLabels(src),
    adminOnly: adminOnlyPages(src),
    modals: modalSites(src),
    bannedAcronym: bannedAcronymSites(src),
    lineCount: src.split("\n").length,
  };
}

module.exports = { discover, APP };
