// Words, codes and addresses, Step 181 (064c334), in English and in Spanish at 1280.
//
// Raw codes are drawn through words. The Jotform sync log draws each sync's type and status, and the
// unresolved failures each failure's stage, as the table's words for the codes the API writes; the stub
// serves one sync of each type the API writes, in each status it writes, partial included, and a failure
// at two of its stages. A change to a weekly pattern answers the dates it kept and skipped, each with
// its reason in English and its code, and the window draws each reason as the table's word. The Started
// Shift window draws the person's role as the staff_roles list's shown label, the way the week's roster
// does. A file read the API refuses with a JSON error toasts the error the API wrote, never the raw body.
// The words are written out here by hand, so a wrong entry in the table is red and not merely followed.
"use strict";

const WORDS = {
  en: {
    type: { forms: "Forms", submissions: "Submissions", failure_retry: "Failed retry", force_fetch: "Forced fetch" },
    status: { success: "success", failed: "failed", running: "running", partial: "partial" },
    stage: { fetch: "fetch", parse: "parse" },
    reason: { "patterns.keptCancelled": "Cancelled", "patterns.keptChangedByHand": "changed by hand", "patterns.keptPostedOpen": "posted as an open shift",
      "patterns.keptReferenced": "started", "patterns.skippedClash": "already scheduled at that time" },
    counts: "2 added, 3 removed, 4 kept",
    role: { custodial_lead: "Custodial Lead", custodial_laborer: "Custodial Laborer", day_porter: "Day Porter" },
    fileRefused: "File fetch failed (404): Document not found",
  },
  es: {
    type: { forms: "Formularios", submissions: "Env\u00edos", failure_retry: "Reintento de fallos", force_fetch: "Descarga forzada" },
    status: { success: "correcto", failed: "fallido", running: "en curso", partial: "parcial" },
    stage: { fetch: "descarga", parse: "lectura" },
    reason: { "patterns.keptCancelled": "Cancelado", "patterns.keptChangedByHand": "cambiado a mano", "patterns.keptPostedOpen": "publicado como turno abierto",
      "patterns.keptReferenced": "iniciado", "patterns.skippedClash": "ya programado a esa hora" },
    counts: "2 agregados, 3 quitados, 4 conservados",
    role: { custodial_lead: "L\u00edder de limpieza", custodial_laborer: "Auxiliar de limpieza", day_porter: "Conserje de d\u00eda" },
    fileRefused: "No se pudo obtener el archivo (404): No se encontr\u00f3 el documento",
  },
};
// What the API writes for a document that is not there, in each language (helpers/words.js).
const NOT_FOUND = { code: "jotform.documentNotFound", en: "Document not found", es: "No se encontr\u00f3 el documento" };

// The cells of every body row of the table whose head names these columns, as the browser drew them.
const tableRows = (d, firstHead) => d.page.evaluate((head) => {
  const table = Array.from(document.querySelectorAll("table")).find((t) => {
    const th = t.querySelector("thead th");
    return th && (th.textContent || "").trim().toLowerCase() === head.toLowerCase();
  });
  return table ? Array.from(table.querySelectorAll("tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim())) : null;
}, firstHead);

async function run({ d, results, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");

  // ---- the Jotform sync log and the unresolved failures
  await d.goto("forms");
  await d.clickText(d.say("Jotform"), { exact: true });
  await d.clickText(d.say("Maintenance"), { exact: true });
  await d.settle(600);
  const syncs = (await tableRows(d, d.say("Started"))) || [];
  const served = stubs.calls.filter((c) => c.path.indexOf("/api/jotform/sync-log") === 0 && Array.isArray(c.json)).pop();
  const logRows = served ? served.json : [];
  const syncWrong = logRows.map((l, i) => {
    const cells = syncs[i] || [];
    const want = [w.type[l.sync_type], w.status[l.status]];
    return cells[1] === want[0] && cells[3] === want[1] ? null : l.sync_type + " " + l.status + " reads " + JSON.stringify([cells[1], cells[3]]) + " where it should read " + JSON.stringify(want);
  }).filter(Boolean);
  results.check("page", "page/forms/sync-log-in-words" + tail, logRows.length === 4 && syncs.length === 4 && syncWrong.length === 0,
    syncs.length !== 4 ? "the sync log draws " + syncs.length + " rows for the 4 the API sent" : syncWrong.join("; "));
  const failuresServed = stubs.calls.filter((c) => c.path.indexOf("/api/jotform/submission-failures") === 0 && c.method === "GET" && c.json && Array.isArray(c.json.failures)).pop();
  const failures = failuresServed ? failuresServed.json.failures : [];
  const body = await d.bodyTextContent();
  const stageWrong = failures.filter((f) => body.indexOf(w.stage[f.failure_stage]) < 0).map((f) => f.failure_stage);
  const stageRaw = lang === "en" ? [] : failures.filter((f) => new RegExp("\\b" + f.failure_stage + "\\b").test(body)).map((f) => f.failure_stage);
  results.check("page", "page/forms/failure-stages-in-words" + tail, failures.length === 2 && (await d.bodyHas(failures[0].failure_reason)) && stageWrong.length === 0 && stageRaw.length === 0,
    failures.length !== 2 ? "the stub served " + failures.length + " failures" : !(await d.bodyHas(failures[0].failure_reason)) ? "the unresolved failures are not drawn"
      : stageWrong.length ? "no word for the stages " + stageWrong.join(", ") : "the stages are drawn as their codes: " + stageRaw.join(", "));

  // ---- a weekly pattern's change: the dates kept and skipped, each with the table's word for its reason
  await d.goto("schedule");
  await d.clickText(d.say("Patterns"), { exact: true });
  await d.settle(400);
  await d.clickRow(0);
  await d.settle(400);
  await d.fillByLabel(d.say("Notes"), "Covering the week of the audit");
  const mark = d.mark();
  await d.clickText(d.say("Save changes"), { inModal: true, exact: true });
  await d.settle(600);
  const patched = d.callsSince(mark).filter((c) => c.method === "PATCH" && /^\/api\/schedule\/patterns\/[^/]+$/.test(c.path)).pop();
  const text = await d.modalText();
  const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
  const answered = patched && patched.json ? patched.json.kept.concat(patched.json.skipped) : [];
  const reasonWrong = answered.filter((k) => !lines.some((l) => l.split(": ").slice(1).join(": ") === w.reason[k.code])).map((k) => k.code);
  results.check("window", "window/schedule/pattern-result-in-words" + tail, !!patched && lines.indexOf(w.counts) >= 0 && answered.length === 5 && reasonWrong.length === 0,
    !patched ? "the pattern's change sent nothing" : lines.indexOf(w.counts) < 0 ? "the result does not say " + JSON.stringify(w.counts)
      : reasonWrong.length ? "no line draws the table's word for " + reasonWrong.join(", ") : "");
  await d.closeModal();

  // ---- the Started Shift window: the role as the list's shown label
  await d.goto("schedule");
  await d.settle(400);
  const opened = await d.clickGridCell(new RegExp("^" + d.say("Started") + " \\d"));
  await d.settle(300);
  const started = stubs.calls.filter((c) => c.path.indexOf("/api/shift-sessions/by-site") === 0 && c.json && c.json.sites).pop();
  const people = started ? [].concat(...started.json.sites.map((x) => x.people)) : [];
  const shown = opened ? (await d.modalText()).split("\n").map((x) => x.trim()).filter(Boolean) : [];
  const who = people.find((p) => shown.indexOf(p.name) >= 0);
  const roleLine = who ? shown[shown.indexOf(who.name) + 1] : null;
  results.check("window", "window/schedule/started-shift-role-in-words" + tail, !!who && roleLine === w.role[who.role],
    !opened ? "no started shift opened on the week" : !who ? "the window names nobody the API said started"
      : "the window draws the role as " + JSON.stringify(roleLine) + " where it should read " + JSON.stringify(w.role[who.role]));
  await d.closeModal();

  // ---- a file read the API refuses with a JSON error toasts the error the API wrote
  await d.goto("hr");
  await d.clickText(d.say("Documents"), { exact: true });
  await d.settle(400);
  stubs.setRefusal({ method: "GET", path: /^\/api\/jotform\/employee-documents\/hd-1\/file$/, status: 404, code: NOT_FOUND.code, error: NOT_FOUND[lang] || NOT_FOUND.en });
  await d.clickText("doc-1.pdf", { exact: true });
  const toast = await d.waitToast(2500);
  stubs.clearRefusals();
  results.check("page", "page/hr/a-refused-file-read-says-the-apis-words" + tail, toast === w.fileRefused,
    "the toast reads " + JSON.stringify(toast) + " where it should read " + JSON.stringify(w.fileRefused));
  await d.waitToastGone(3600);

  results.note("Words, codes and addresses in " + lang + ": the sync log, the failures, a pattern's result, the Started Shift role and a refused file read");
}

module.exports = { run };
