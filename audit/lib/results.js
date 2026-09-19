// Where every case lands. A case is pass, fail, or a known failure.
//
// audit/known.json holds the failures the app has today that this build does not fix. A known
// failure prints on every run and does not fail the run. A known failure that starts passing DOES
// fail the run, so a fix is never merged without the entry coming off the list.
"use strict";
const fs = require("fs");
const path = require("path");

const KNOWN_PATH = path.resolve(__dirname, "..", "known.json");

function loadKnown() {
  if (!fs.existsSync(KNOWN_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(KNOWN_PATH, "utf8"));
  const rows = Array.isArray(raw) ? raw : raw.failures;
  return (rows || []).map((r) => Object.assign({}, r, { seen: false, stillBroken: false, hits: 0, passes: 0 }));
}

function createResults() {
  const known = loadKnown();
  const rows = [];
  const counters = {};
  const unclaimed = [];
  const notes = [];

  // An entry matches a case id exactly, or by `match`, a regular expression, when one finding shows
  // up under several case ids: the same gated page for two personas at two widths, for instance.
  const knownFor = (id) => known.find((k) => (k.case && k.case === id) || (k.match && new RegExp(k.match).test(id))) || null;

  function record(kind, id, ok, detail) {
    const k = knownFor(id);
    let state = ok ? "PASS" : "FAIL";
    if (k) {
      k.seen = true;
      k.hits += 1;
      if (ok) { state = "FIXED"; k.passes += 1; }
      else { state = "KNOWN"; k.stillBroken = true; }
    }
    rows.push({ kind, id, state, detail: detail == null ? "" : String(detail) });
    if (!counters[kind]) counters[kind] = { total: 0, pass: 0, fail: 0, known: 0, fixed: 0 };
    const c = counters[kind];
    c.total += 1;
    if (state === "PASS") c.pass += 1;
    else if (state === "FAIL") c.fail += 1;
    else if (state === "KNOWN") c.known += 1;
    else if (state === "FIXED") { c.fixed += 1; }
    return state;
  }

  return {
    rows, counters, known, notes, unclaimed,
    pass: (kind, id, detail) => record(kind, id, true, detail),
    fail: (kind, id, detail) => record(kind, id, false, detail),
    check: (kind, id, ok, detail) => record(kind, id, !!ok, detail),

    // A page, view or window the app has and the suite does not drive.
    noCase: (kind, id, where) => {
      rows.push({ kind, id, state: "NO CASE", detail: where || "" });
      if (!counters[kind]) counters[kind] = { total: 0, pass: 0, fail: 0, known: 0, fixed: 0 };
      counters[kind].total += 1;
      counters[kind].fail += 1;
      unclaimed.push({ kind, id, where: where || "" });
    },

    note: (line) => notes.push(line),

    // Known entries nobody exercised: the case was renamed or deleted, so the list is stale.
    staleKnown: () => known.filter((k) => !k.seen),
    // A known failure is fixed only when EVERY case it covers passes. One case still failing keeps
    // the entry live, so a partial fix does not take an entry off the list by accident.
    fixedKnown: () => known.filter((k) => k.seen && !k.stillBroken),
    liveKnown: () => known.filter((k) => k.seen && k.stillBroken),

    failures: () => rows.filter((r) => r.state === "FAIL" || r.state === "NO CASE" || r.state === "FIXED"),
  };
}

module.exports = { createResults, KNOWN_PATH };
