// Every file under src/ is plain ASCII. A language is written as \\u escapes in source and as itself
// only in translation/dashboard_words.csv, so an accent cannot be lost to an editor, a terminal or a
// patch on the way to the screen. This reads the bytes and needs no browser.
"use strict";
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "..", "..", "src");

function walk(dir, out) {
  fs.readdirSync(dir).forEach((name) => {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p, out); return; }
    out.push(p);
  });
  return out;
}

// Every byte outside ASCII, named by file, line and character.
function findNonAscii() {
  if (!fs.existsSync(SRC)) return { files: 0, hits: [] };
  const files = walk(SRC, []);
  const hits = [];
  files.forEach((p) => {
    const text = fs.readFileSync(p, "utf8");
    text.split("\n").forEach((line, i) => {
      for (let c = 0; c < line.length; c += 1) {
        const code = line.charCodeAt(c);
        if (code > 126 || (code < 9 && code !== 0) || code === 11 || code === 12) {
          hits.push({
            file: path.relative(path.resolve(__dirname, "..", ".."), p),
            line: i + 1,
            column: c + 1,
            char: line[c],
            escape: "\\u" + code.toString(16).padStart(4, "0"),
          });
        }
      }
    });
  });
  return { files: files.length, hits: hits };
}

module.exports = { findNonAscii, SRC };
