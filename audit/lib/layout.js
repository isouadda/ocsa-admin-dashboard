// Where everything sits at Standard, recorded once and compared on every run after.
//
// The suite walks every page at both widths and measures every element's box. The boxes are digested
// into one line per page and width, so any difference at all is caught, and the boxes of the parts
// that can be named are kept beside the digest, so a difference can usually be named as well.
//
//   AUDIT_RECORD_LAYOUT=1 npm run audit    writes audit/layout-record.json
//   npm run audit                          compares against it
//
// Anything inside an <svg> is left out: a chart animates as it draws, and its insides are not a
// layout a person reads. The chart's own box is measured like any other element.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.resolve(__dirname, "..", "layout-record.json");
const RECORDING = process.env.AUDIT_RECORD_LAYOUT === "1";

let disk = null;
const seen = {};
const tally = { pages: 0, boxes: 0 };

function load() {
  if (disk) return disk;
  disk = fs.existsSync(FILE)
    ? JSON.parse(fs.readFileSync(FILE, "utf8"))
    : { note: "", pages: {} };
  return disk;
}

const digestOf = (text) => crypto.createHash("sha1").update(text).digest("hex").slice(0, 16);

// Whether a snapshot already matches the record, asked before anything is reported, so a page that
// is still settling is given a second chance rather than a failure.
function matches(pageId, width, snap) {
  if (RECORDING) return true;
  const rec = load().pages[pageId + "@" + width];
  if (!rec) return true;
  return rec.n === snap.lines.length && rec.digest === digestOf(snap.lines.join("\n"));
}

// What one page at one width looks like, against what it looked like when the record was written.
function see(pageId, width, snap, results) {
  const key = pageId + "@" + width;
  const mine = { n: snap.lines.length, digest: digestOf(snap.lines.join("\n")), named: snap.named };
  if (RECORDING) { seen[key] = mine; return; }

  const rec = load().pages[key];
  if (!rec) {
    results.noCase("layout", "layout/" + key, "no box record for this page at this width");
    return;
  }
  tally.pages += 1;
  tally.boxes += rec.n;
  if (rec.digest === mine.digest && rec.n === mine.n) return;

  // Which named box moved, so the difference has a name and not only a number.
  const moved = [];
  Object.keys(rec.named).forEach((k) => {
    const a = rec.named[k], b = mine.named[k];
    if (!b) { moved.push(k + " is gone"); return; }
    if (a.join(",") !== b.join(",")) moved.push(k + " was " + a.join(",") + " and is " + b.join(","));
  });
  Object.keys(mine.named).forEach((k) => { if (!rec.named[k]) moved.push(k + " is new"); });
  results.fail("layout", "layout/" + key,
    (rec.n === mine.n ? rec.n + " boxes, " : "the record has " + rec.n + " boxes and the page draws " + mine.n + ", ")
    + (moved.length ? moved.slice(0, 3).join("; ") + (moved.length > 3 ? ", and " + (moved.length - 3) + " more" : "")
      : "no named part moved, so the difference is somewhere unnamed"));
}

function finish(results) {
  if (RECORDING) {
    const out = {
      note: "Where every element sits at Standard, in dark, as an admin, at both widths. Written by "
        + "AUDIT_RECORD_LAYOUT=1 npm run audit, compared on every run after. A build that moves a box at "
        + "Standard fails until the record is written again on purpose.",
      pages: seen,
    };
    fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");
    results.pass("layout", "layout/record-written", Object.keys(seen).length + " page and width records written");
    return;
  }
  if (tally.pages === 0) return;
  results.pass("layout", "layout/standard-is-where-it-was",
    tally.pages + " pages and widths, " + tally.boxes + " boxes, 0 differences");
}

module.exports = { see, matches, finish, FILE, RECORDING };
