// Every label the suite drives, printed as one list.
//
//   node audit/labels.js
//
// This build changes no screen, so this list is what the app guide is written from: the page names,
// the view names, the window titles, the table columns, the buttons the suite presses, the toasts it
// reads back and the refusals it shows word for word.
"use strict";
const fs = require("fs");
const path = require("path");
const inv = require("./inventory");

const CASES = path.resolve(__dirname, "cases");

// Pulls the quoted strings out of the calls that drive the app, so the list is what the cases really
// press rather than a list kept by hand beside them.
function drivenStrings() {
  const out = new Set();
  fs.readdirSync(CASES).filter((f) => f.endsWith(".js")).forEach((f) => {
    const src = fs.readFileSync(path.join(CASES, f), "utf8");
    const patterns = [
      /clickText\(\s*"([^"]{2,60})"/g,
      /clickTitle\(\s*"([^"]{2,60})"/g,
      /clickNav\(\s*"([^"]{2,60})"/g,
      /fillByLabel\(\s*"([^"]{2,60})"/g,
      /toggleSwitch\(\s*"([^"]{2,60})"/g,
      /pickOption\(\s*"([^"]{2,60})"/g,
      /press:\s*"([^"]{2,60})"/g,
      /tile\(d,\s*"([^"]{2,60})"/g,
    ];
    patterns.forEach((re) => { let m; while ((m = re.exec(src))) out.add(m[1]); });
  });
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function section(title, rows) {
  process.stdout.write("\n## " + title + " (" + rows.length + ")\n\n");
  rows.forEach((r) => process.stdout.write("- " + r + "\n"));
}

function main() {
  process.stdout.write("# Every label the audit drives\n");
  process.stdout.write("\nThis build changes no screen. Everything below already exists in src/App.js.\n");

  section("Pages", inv.PAGES.map((p) => p.label + "  (#" + p.id + (p.gated ? ", admin only" : "") + ")"));
  section("Views", inv.VIEWS.map((v) => v.id + (v.click ? "  opened by " + JSON.stringify(v.click) : "  the page's own first screen")));
  section("Windows", inv.WINDOWS.map((w) => w.title + "  (" + w.id + ", " + w.lines.map((l) => "src/App.js:" + l).join(" and ") + ")"));
  section("Table columns", inv.TABLES.map((t) => t.id + ": " + (t.columns || []).join(", ")));
  section("Reports", inv.REPORTS.map((r) => r.name));
  section("Exports", inv.EXPORTS.map((e) => e.id.replace("exports/", "") + "  (" + e.kind + ", " + e.name + ")"));
  section("Decisions", inv.DECISIONS.map((d) => d.name));
  section("Refusals, word for word", inv.REFUSALS.map((r) => JSON.stringify(r.error) + (r.status ? "  (" + r.status + ")" : "")));
  section("Controls the suite presses, fills or reads", drivenStrings());
}

main();
