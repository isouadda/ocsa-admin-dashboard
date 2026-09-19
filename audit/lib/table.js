// The table every build pastes, and the gate. Any failure exits non-zero.
"use strict";

const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - String(s).length));

function covered(c) {
  if (!c) return "0 of 0";
  const done = c.pass + c.known;
  return done + " of " + c.total;
}

function printDetail(results) {
  const interesting = results.rows.filter((r) => r.state !== "PASS");
  if (interesting.length === 0) return;
  process.stdout.write("\n");
  interesting.forEach((r) => {
    process.stdout.write(pad(r.state, 9) + pad(r.kind, 11) + r.id + (r.detail ? "  " + r.detail : "") + "\n");
  });
}

function printKnown(results) {
  const live = results.liveKnown();
  const fixed = results.fixedKnown();
  const stale = results.staleKnown();
  if (live.length) {
    process.stdout.write("\nKnown failures, still true today. These do not fail the run.\n");
    live.forEach((k) => {
      process.stdout.write("  " + k.case + "\n");
      process.stdout.write("      shows  " + k.shows + "\n");
      process.stdout.write("      why    " + k.why + "\n");
      if (k.where) process.stdout.write("      where  " + k.where + "\n");
    });
  }
  if (fixed.length) {
    process.stdout.write("\nKnown failures that now PASS. Take each off audit/known.json.\n");
    fixed.forEach((k) => process.stdout.write("  " + k.case + "  " + k.why + "\n"));
  }
  if (stale.length) {
    process.stdout.write("\nKnown entries no case exercised. The case was renamed or removed.\n");
    stale.forEach((k) => process.stdout.write("  " + k.case + "\n"));
  }
}

function printTable(results, seconds) {
  const c = results.counters;
  const rows = [
    ["pages covered", covered(c.page)],
    ["views covered", covered(c.view)],
    ["windows covered", covered(c.window)],
    ["tables covered", covered(c.table)],
    ["reports checked", covered(c.report)],
    ["exports checked", covered(c.export)],
    ["decisions exercised", covered(c.decision)],
    ["refusals shown", covered(c.refusal)],
  ];
  const live = results.liveKnown().length;
  const fixed = results.fixedKnown().length;
  const stale = results.staleKnown().length;
  const failures = results.rows.filter((r) => r.state === "FAIL" || r.state === "NO CASE").length + fixed + stale;

  process.stdout.write("\n");
  rows.forEach(([k, v]) => process.stdout.write(pad(k, 20) + v + "\n"));
  process.stdout.write(pad("known failures", 20) + live + "\n");
  process.stdout.write(pad("FAILURES", 20) + failures + "\n");
  if (seconds != null) process.stdout.write("\nrun time            " + seconds + "s\n");
  return failures;
}

function printNotes(results) {
  if (!results.notes.length) return;
  process.stdout.write("\nNotes\n");
  results.notes.forEach((n) => process.stdout.write("  " + n + "\n"));
}

module.exports = { printTable, printDetail, printKnown, printNotes };
