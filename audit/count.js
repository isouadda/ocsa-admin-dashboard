// How much of the dashboard is still English, counted by the finder and grouped by page.
//
//   node audit/count.js
//
// A page is the component the render switch draws for it, and every top-level component, table and
// helper that component reaches through JSX or a plain call. A name a component declares for itself,
// such as a local sourceLabel, is its own and is not followed to the top-level one of that name. A
// place is one string the finder found that does not go through tr or trn, and a string is one
// distinct text among them. A component two pages reach is counted on both, so the last line counts
// the whole file once.
//
// The part is the one audit/spanish-todo.json gives the page. A page the file no longer lists is
// done, and anything counted on it is English on a page taken as finished.
//
// A printed page is counted with the component that builds it, and named on its own in the table
// that follows the parts: the function that builds it, the line it starts on, the page that prints
// it and the English left in it.
"use strict";
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const { findStrings, findPrints, APP } = require("./lib/strings");
const { discover } = require("./discover");
const TODO = require("./spanish-todo.json");

const walk = (node, fn) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, fn)); return; }
  if (!node.type) return;
  fn(node);
  Object.keys(node).forEach((k) => { if (k !== "loc" && k !== "leadingComments" && k !== "trailingComments") walk(node[k], fn); });
};

function count() {
  const code = fs.readFileSync(APP, "utf8");
  const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx", "optionalChaining", "nullishCoalescingOperator", "classProperties", "objectRestSpread"] });

  // Every top-level name, and what each one reaches.
  const tops = new Map();
  ast.program.body.forEach((n) => {
    if (n.type === "FunctionDeclaration" && n.id) tops.set(n.id.name, n);
    else if (n.type === "ExportDefaultDeclaration" && n.declaration && n.declaration.id) tops.set(n.declaration.id.name, n.declaration);
    else if (n.type === "VariableDeclaration") n.declarations.forEach((d) => { if (d.id && d.id.name) tops.set(d.id.name, d); });
  });
  const uses = new Map();
  tops.forEach((node, name) => {
    const own = new Set();
    walk(node, (m) => {
      if (m === node) return;
      if (m.type === "VariableDeclarator" && m.id && m.id.type === "Identifier") own.add(m.id.name);
      if (m.type === "FunctionDeclaration" && m.id) own.add(m.id.name);
    });
    const set = new Set();
    walk(node, (m) => {
      const ref = m.type === "JSXOpeningElement" && m.name && m.name.type === "JSXIdentifier" ? m.name.name
        : m.type === "Identifier" ? m.name : null;
      if (ref && ref !== name && tops.has(ref) && !own.has(ref)) set.add(ref);
    });
    uses.set(name, set);
  });
  const reach = (root) => {
    const seen = new Set([root]);
    const queue = [root];
    while (queue.length) (uses.get(queue.shift()) || []).forEach((u) => { if (!seen.has(u)) { seen.add(u); queue.push(u); } });
    return seen;
  };

  // The component the render switch draws for each page: {page === "id" && <Component ... />}.
  const drawn = {};
  walk(ast.program, (n) => {
    if (n.type !== "LogicalExpression" || n.operator !== "&&") return;
    const l = n.left;
    if (!l || l.type !== "BinaryExpression" || l.operator !== "===" || !l.left || l.left.name !== "page" || !l.right || typeof l.right.value !== "string") return;
    let comp = null;
    walk(n.right, (m) => { if (!comp && m.type === "JSXOpeningElement" && m.name && tops.has(m.name.name)) comp = m.name.name; });
    if (comp && !drawn[l.right.value]) drawn[l.right.value] = comp;
  });

  const left = findStrings().filter((s) => !s.translated);
  const byOwner = new Map();
  left.forEach((s) => { if (!byOwner.has(s.owner)) byOwner.set(s.owner, []); byOwner.get(s.owner).push(s); });
  // What a set of components holds, each component counted once.
  const tally = (components) => {
    const strings = [];
    const owners = [];
    components.forEach((c) => { const l = byOwner.get(c) || []; if (l.length) { owners.push(c + " " + l.length); strings.push(...l); } });
    return { places: strings.length, strings: new Set(strings.map((s) => s.text)).size, owners };
  };
  const pages = discover().pages.map((id) => {
    const listed = TODO.pages[id];
    return Object.assign({ id, component: drawn[id] || null, part: listed ? listed.part : "done" }, tally(drawn[id] ? reach(drawn[id]) : []));
  });
  // Each part, and the pages taken as done, with every component their pages reach counted once.
  const parts = Array.from(new Set(pages.map((p) => p.part))).map((part) => {
    const components = new Set();
    pages.filter((p) => p.part === part && p.component).forEach((p) => reach(p.component).forEach((c) => components.add(c)));
    return Object.assign({ id: part, component: null, part: "", pages: pages.filter((p) => p.part === part).map((p) => p.id) }, tally(components));
  });
  const whole = { id: "whole file", component: null, part: "", places: left.length, strings: new Set(left.map((s) => s.text)).size, owners: [] };
  // Every printed page, with the pages whose components reach the one that builds it.
  const prints = findPrints().map((pr) => {
    const on = pages.filter((p) => p.component && reach(p.component).has(pr.owner)).map((p) => p.id);
    const mine = left.filter((s) => s.print && s.print.line === pr.line);
    const listed = on.length ? TODO.pages[on[0]] : null;
    return { id: pr.owner + " " + pr.name, name: pr.name, owner: pr.owner, line: pr.line, pages: on,
      part: on.length ? (listed ? listed.part : "done") : "", places: mine.length, strings: new Set(mine.map((s) => s.text)).size };
  });
  return { pages, parts, whole, prints };
}

if (require.main === module) {
  const { pages, parts, whole, prints } = count();
  const line = (r, tail) => process.stdout.write(r.id.padEnd(14) + r.part.padEnd(12) + String(r.places).padStart(7)
    + String(r.strings).padStart(9) + (tail ? "  " + tail : "") + "\n");
  process.stdout.write("page".padEnd(14) + "part".padEnd(12) + "places".padStart(7) + "strings".padStart(9) + "  where\n");
  pages.forEach((r) => line(r, r.owners.join(", ")));
  process.stdout.write("\n");
  parts.forEach((r) => line(r, r.pages.join(", ")));
  line(whole, "");
  process.stdout.write("\n" + "print".padEnd(46) + "page".padEnd(14) + "part".padEnd(12) + "places".padStart(7) + "strings".padStart(9) + "\n");
  prints.forEach((r) => process.stdout.write((r.id + " " + r.line).padEnd(46) + (r.pages.join(", ") || "(no page)").padEnd(14)
    + r.part.padEnd(12) + String(r.places).padStart(7) + String(r.strings).padStart(9) + "\n"));
}

module.exports = { count };
