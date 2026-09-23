// Every string a person reads, found in the parsed source rather than by a regular expression.
//
// A screen's words live in three shapes: text between JSX tags, a string inside a JSX expression,
// and a string handed to an attribute a person reads, such as a placeholder or an accessible name.
// A fourth is the line a toast or a confirm box says. This walks the tree for all four, names the
// component each one sits in, and says whether it already goes through tr().
"use strict";
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const APP = path.resolve(__dirname, "..", "..", "src", "App.js");

// Attributes a person reads. Everything else, including style, key, id and every handler, is skipped.
const READ_ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "empty", "header", "l", "sub", "text", "action"]);
// Object keys that carry a word a person reads: a nav item's l, a column's header, a tab's label.
const READ_KEYS = new Set(["l", "label", "header", "title", "sub", "empty", "text", "placeholder", "name"]);
// An object of page ids to their labels, or anything else named for what it draws.
const LABEL_HOLDER = /labels?$/i;
// A table column draws its cell through one of these.
const RENDER_KEYS = new Set(["render", "cell", "format"]);
// Calls whose first argument is a line a person reads.
const SAY_CALLS = new Set(["showToast", "alert", "confirm", "setError", "setActionError", "setNoteError"]);
// A word that is the same in every language, or is not a word at all.
const NOT_A_WORD = (s) => {
  const v = String(s).trim();
  if (!v) return true;
  if (!/[A-Za-z]/.test(v)) return true;               // numbers, punctuation, a dash
  if (/^[a-z0-9_.\-/#?=&:{}]+$/.test(v) && !/\s/.test(v)) return true; // a code, a path, a key
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true;      // a color
  if (/^\d+(px|%|vh|vw|em|rem|s|ms)$/.test(v)) return true;
  if (/^[MmLlHhVvCcSsQqTtAaZz0-9\s.,\-]+$/.test(v)) return true;  // the d of an icon's path
  if (/^[a-z]{2}-[A-Z]{2}$/.test(v)) return true;                 // a locale tag
  if (/^[A-Z][a-z]+\/[A-Z]/.test(v)) return true;                 // a time zone
  if (/^rgba?\($/.test(v)) return true;                           // half of a color
  if (/^T\d{2}:\d{2}(:\d{2})?$/.test(v)) return true;             // the tail of an ISO moment
  if (/^[a-z]+[A-Z][A-Za-z]*$/.test(v)) return true;              // a key written in camel case
  return false;
};

function walk(node, visit, parents) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, visit, parents)); return; }
  if (!node.type) return;
  visit(node, parents);
  const next = parents.concat([node]);
  Object.keys(node).forEach((k) => {
    if (k === "loc" || k === "leadingComments" || k === "trailingComments" || k === "extra") return;
    walk(node[k], visit, next);
  });
}

// The top-level function or const a node sits inside, which is the screen it belongs to.
function ownerMap(ast, code) {
  const spans = [];
  ast.program.body.forEach((n) => {
    let name = null;
    if (n.type === "FunctionDeclaration" && n.id) name = n.id.name;
    else if (n.type === "ExportDefaultDeclaration" && n.declaration && n.declaration.id) name = n.declaration.id.name;
    else if (n.type === "VariableDeclaration" && n.declarations[0] && n.declarations[0].id.name) name = n.declarations[0].id.name;
    if (name) spans.push({ name: name, start: n.loc.start.line, end: n.loc.end.line });
  });
  return (line) => {
    for (let i = spans.length - 1; i >= 0; i -= 1) {
      if (line >= spans[i].start && line <= spans[i].end) return spans[i].name;
    }
    return "(top level)";
  };
}

const TR_CALLS = new Set(["tr", "trn"]);
const inTr = (parents) => parents.some((p) => p.type === "CallExpression" && p.callee && TR_CALLS.has(p.callee.name) && p.arguments[0]);

// Three shapes where a word is written in one place and translated in another, all of them in the
// app today: a small helper that takes a label and draws tr(label); a table of labels read back as
// tr(LABELS[k]); and a list of names walked with .map(d => tr(d)). Without these the finder calls a
// word English when the screen shows it in Spanish.
const flowsToTr = (fn, paramIndex) => {
  const p = fn.params[paramIndex];
  if (!p || p.type !== "Identifier") return false;
  let hit = false;
  walk(fn.body, (n) => {
    if (n.type !== "CallExpression" || !n.callee || !TR_CALLS.has(n.callee.name) || !n.arguments[0]) return;
    // The parameter itself, or something read off it: tr(x) and tr(x.label) both send it to the
    // table.
    walk(n.arguments[0], (m) => { if (m.type === "Identifier" && m.name === p.name) hit = true; }, []);
  }, []);
  return hit;
};

const IS_FN = (n) => n && (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration");

function translatedShapes(ast) {
  const helpers = new Map();   // helper name -> the argument positions it translates
  const containers = new Set(); // the ObjectExpression / ArrayExpression nodes read through tr
  const named = new Map();      // name -> that node
  const readsThrough = new Set();
  walk(ast.program, (n) => {
    if (n.type === "FunctionDeclaration" && n.id) {
      n.params.forEach((_, i) => { if (flowsToTr(n, i)) { if (!helpers.has(n.id.name)) helpers.set(n.id.name, new Set()); helpers.get(n.id.name).add(i); } });
      return;
    }
    if (n.type === "VariableDeclarator" && n.id && n.id.type === "Identifier" && n.init) {
      if (IS_FN(n.init)) {
        n.init.params.forEach((_, i) => { if (flowsToTr(n.init, i)) { if (!helpers.has(n.id.name)) helpers.set(n.id.name, new Set()); helpers.get(n.id.name).add(i); } });
      }
      // A name bound more than once, such as a DOW list inside two different views, marks every
      // binding it has. Scope is not tracked here; a list read through tr under one name is taken
      // as read through tr under all of them.
      if (n.init.type === "ObjectExpression" || n.init.type === "ArrayExpression") {
        if (!named.has(n.id.name)) named.set(n.id.name, []);
        named.get(n.id.name).push(n.init);
      }
      return;
    }
    if (n.type === "CallExpression" && n.callee && TR_CALLS.has(n.callee.name) && n.arguments[0]) {
      // tr(LABELS[k]) and tr(LABELS[k] || k): whatever table it reads is read through tr.
      walk(n.arguments[0], (m) => {
        if (m.type === "MemberExpression" && m.object && m.object.type === "Identifier") readsThrough.add(m.object.name);
      }, []);
      return;
    }
    if (n.type === "CallExpression" && n.callee && n.callee.type === "MemberExpression"
      && n.callee.object && n.callee.object.type === "Identifier"
      && n.callee.property && (n.callee.property.name === "map" || n.callee.property.name === "forEach")
      && IS_FN(n.arguments[0]) && flowsToTr(n.arguments[0], 0)) readsThrough.add(n.callee.object.name);
  }, []);
  readsThrough.forEach((name) => { (named.get(name) || []).forEach((node) => containers.add(node)); });
  return { helpers: helpers, containers: containers };
}

// A string sitting at an argument position a helper translates, or inside a table read through tr.
function handedToTr(node, parents, shapes) {
  const p = parents[parents.length - 1];
  if (p && p.type === "CallExpression" && p.callee && p.callee.type === "Identifier" && shapes.helpers.has(p.callee.name)) {
    const at = p.arguments.indexOf(node);
    if (at >= 0 && shapes.helpers.get(p.callee.name).has(at)) return true;
  }
  return parents.some((x) => shapes.containers.has(x));
}
const inStyle = (parents) => parents.some((p) => p.type === "JSXAttribute" && p.name && p.name.name === "style")
  // A <style> block is a stylesheet rather than a sentence.
  || parents.some((p) => p.type === "JSXElement" && p.openingElement && p.openingElement.name
    && p.openingElement.name.name === "style");

function findStrings() {
  const code = fs.readFileSync(APP, "utf8");
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "optionalChaining", "nullishCoalescingOperator", "classProperties", "objectRestSpread"],
  });
  const owner = ownerMap(ast, code);
  const shapes = translatedShapes(ast);
  const found = [];
  const add = (text, line, parents, how, node) => {
    if (NOT_A_WORD(text)) return;
    const done = inTr(parents) || (node ? handedToTr(node, parents, shapes) : false);
    found.push({ text: String(text), line: line, owner: owner(line), how: how, translated: done });
  };

  walk(ast.program, (node, parents) => {
    if (node.type === "JSXText") {
      const v = node.value.replace(/\s+/g, " ").trim();
      if (v) add(v, node.loc.start.line, parents, "text", node);
      return;
    }
    // A sentence built from pieces. The pattern is what a translator reads: the words with {0}, {1}
    // where the values go, which is the shape tr() fills.
    if (node.type === "TemplateLiteral") {
      if (inStyle(parents)) return;
      const inJsx = parents.some((x) => x.type === "JSXExpressionContainer");
      const p = parents[parents.length - 1];
      const said = p && p.type === "CallExpression" && p.callee && SAY_CALLS.has(p.callee.name);
      const attr = p && p.type === "JSXAttribute" && p.name && READ_ATTRS.has(String(p.name.name));
      if (!inJsx && !said && !attr) return;
      let pattern = "";
      node.quasis.forEach((q, i) => {
        pattern += q.value.cooked;
        if (i < node.expressions.length) pattern += "{" + i + "}";
      });
      add(pattern, node.loc.start.line, parents, "built", node);
      return;
    }
    if (node.type === "StringLiteral") {
      if (inStyle(parents)) return;
      const p = parents[parents.length - 1];
      const gp = parents[parents.length - 2];
      // A string being compared is a value rather than a word: e.key === "Enter" is a keyboard key,
      // and status === "open" is what the API calls it.
      if (p && p.type === "BinaryExpression" && ["===", "!==", "==", "!="].indexOf(p.operator) >= 0) return;
      if (p && p.type === "CallExpression" && p.callee && p.callee.property
        && ["indexOf", "includes", "startsWith", "endsWith", "split", "join", "replace"].indexOf(String(p.callee.property.name)) >= 0) return;
      // A word held in an object, which is how the nav, the tabs, the columns and the options carry
      // theirs. READ_KEYS names the keys a person reads; a holder named for its labels carries words
      // under whatever keys it likes.
      if (p && (p.type === "ObjectProperty" || p.type === "Property") && p.value === node && p.key) {
        const key = p.key.name || p.key.value;
        const holder = parents.filter((x) => x.type === "VariableDeclarator" && x.id && x.id.name).pop();
        const named = holder && LABEL_HOLDER.test(holder.id.name);
        if (READ_KEYS.has(String(key)) || named) {
          add(node.value, node.loc.start.line, parents, named ? "label table" : "key " + key, node);
        }
        return;
      }
      // A string handed to an attribute a person reads.
      if (p && p.type === "JSXAttribute" && p.name && READ_ATTRS.has(String(p.name.name))) {
        add(node.value, node.loc.start.line, parents, "attribute " + p.name.name, node);
        return;
      }
      // A table column draws its cell from a render function, so a plain string returned there is
      // a word on the screen as surely as one written in JSX.
      if (parents.some((x) => x.type === "ObjectProperty" && x.key
        && RENDER_KEYS.has(String(x.key.name || x.key.value)))) {
        add(node.value, node.loc.start.line, parents, "render", node);
        return;
      }
      // A string inside a JSX expression, which is a word on the screen.
      const inJsxExpr = parents.some((x) => x.type === "JSXExpressionContainer");
      if (inJsxExpr && !inStyle(parents)) {
        // Skip the ones that are plainly not words.
        add(node.value, node.loc.start.line, parents, "expression", node);
        return;
      }
      // The line a toast or a box says.
      if (p && p.type === "CallExpression" && p.callee && SAY_CALLS.has(p.callee.name) && p.arguments[0] === node) {
        add(node.value, node.loc.start.line, parents, "said", node);
        return;
      }
      if (gp && gp.type === "CallExpression" && gp.callee && SAY_CALLS.has(gp.callee.name)) {
        add(node.value, node.loc.start.line, parents, "said", node);
      }
      return;
    }
  }, []);
  return found;
}

// What is left in English inside a set of components.
function untranslatedIn(owners) {
  const want = new Set(owners);
  return findStrings().filter((s) => want.has(s.owner) && !s.translated);
}

module.exports = { findStrings, untranslatedIn, APP };
