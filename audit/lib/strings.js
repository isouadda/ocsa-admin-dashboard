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
const READ_ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "empty", "header", "l", "sub", "text"]);
// Object keys that carry a word a person reads: a nav item's l, a column's header, a tab's label.
const READ_KEYS = new Set(["l", "label", "header", "title", "sub", "empty", "text", "placeholder", "name"]);
// An object of page ids to their labels, or anything else named for what it draws.
const LABEL_HOLDER = /labels?$/i;
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

const inTr = (parents) => parents.some((p) => p.type === "CallExpression" && p.callee && p.callee.name === "tr" && p.arguments[0]);
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
  const found = [];
  const add = (text, line, parents, how) => {
    if (NOT_A_WORD(text)) return;
    found.push({ text: String(text), line: line, owner: owner(line), how: how, translated: inTr(parents) });
  };

  walk(ast.program, (node, parents) => {
    if (node.type === "JSXText") {
      const v = node.value.replace(/\s+/g, " ").trim();
      if (v) add(v, node.loc.start.line, parents, "text");
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
      add(pattern, node.loc.start.line, parents, "built");
      return;
    }
    if (node.type === "StringLiteral") {
      if (inStyle(parents)) return;
      const p = parents[parents.length - 1];
      const gp = parents[parents.length - 2];
      // A word held in an object, which is how the nav, the tabs, the columns and the options carry
      // theirs. READ_KEYS names the keys a person reads; a holder named for its labels carries words
      // under whatever keys it likes.
      if (p && (p.type === "ObjectProperty" || p.type === "Property") && p.value === node && p.key) {
        const key = p.key.name || p.key.value;
        const holder = parents.filter((x) => x.type === "VariableDeclarator" && x.id && x.id.name).pop();
        const named = holder && LABEL_HOLDER.test(holder.id.name);
        if (READ_KEYS.has(String(key)) || named) {
          add(node.value, node.loc.start.line, parents, named ? "label table" : "key " + key);
        }
        return;
      }
      // A string handed to an attribute a person reads.
      if (p && p.type === "JSXAttribute" && p.name && READ_ATTRS.has(String(p.name.name))) {
        add(node.value, node.loc.start.line, parents, "attribute " + p.name.name);
        return;
      }
      // A string inside a JSX expression, which is a word on the screen.
      const inJsxExpr = parents.some((x) => x.type === "JSXExpressionContainer");
      if (inJsxExpr && !inStyle(parents)) {
        // Skip the ones that are plainly not words.
        add(node.value, node.loc.start.line, parents, "expression");
        return;
      }
      // The line a toast or a box says.
      if (p && p.type === "CallExpression" && p.callee && SAY_CALLS.has(p.callee.name) && p.arguments[0] === node) {
        add(node.value, node.loc.start.line, parents, "said");
        return;
      }
      if (gp && gp.type === "CallExpression" && gp.callee && SAY_CALLS.has(gp.callee.name)) {
        add(node.value, node.loc.start.line, parents, "said");
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
