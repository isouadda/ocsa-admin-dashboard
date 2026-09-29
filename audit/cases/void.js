// Filed forms: where a filing came from, Void, and a photo that will not load, Step 179 (4464766), in
// English and in Spanish at 1280.
//
// Under each form's name on Filed forms the list says where the filing came from, by the source the API
// stores: From the dashboard for admin, From the app for the staff portal and for Help, and From a
// customer for a customer's link. The review window draws Void when the payload says canVoid: Void
// opens a window that asks why, Void report sends the reason to POST /api/forms/responses/:id/void, a
// refusal is drawn in the API's words, and the report reads Void after, and again on a later read from
// the Void switch. Send again draws only when the payload says canResend. An admin's status switch gains
// Void once GET /api/forms/responses?status=void&limit=1 answers 200; a supervisor's does not. A photo
// whose thumbnail the API refuses draws Photo could not be loaded in its square. The stub gives the
// seed's filings their sources and the admin a filing of their own, answers the void route the way
// routes/forms.js does, and refuses one thumbnail with the API's code. The words are written out here by
// hand, so a wrong entry in the table turns its case red.
"use strict";

const WORDS = {
  en: {
    submitted: "Submitted", unfinished: "Unfinished", voidStatus: "Void", voidButton: "Void", sendAgain: "Send again",
    question: "Why is this report being voided?", voidReport: "Void report", notYet: "Not yet", photoLine: "Photo could not be loaded",
    source: { admin: "From the dashboard", portal: "From the app", agent: "From the app", customer: "From a customer" },
  },
  es: {
    submitted: "Enviado", unfinished: "Sin terminar", voidStatus: "Anulado", voidButton: "Anular", sendAgain: "Enviar de nuevo",
    question: "\u00bfPor qu\u00e9 se anula este reporte?", voidReport: "Anular reporte", notYet: "Todav\u00eda no", photoLine: "No se pudo cargar la foto",
    source: { admin: "Desde el panel", portal: "Desde la aplicaci\u00f3n", agent: "Desde la aplicaci\u00f3n", customer: "De un cliente" },
  },
};
// What routes/forms.js answers a void with no reason, and a photo whose file is not there, in each
// language (helpers/words.js at ocsa-api 1c3fb42).
const NO_REASON = { code: "forms.voidReasonRequired", en: "Write why this report is being voided.", es: "Escriba por qu\u00e9 se anula este reporte." };
const PHOTO_GONE = { code: "forms.photoNotFound", en: "Photo not found", es: "No se encontr\u00f3 la foto" };
// The reason typed into the window, invented.
const REASON = "Filed against the wrong site by mistake.";
const MODAL = "div[style*='z-index: 500']";
const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";

// The status switches on Filed forms by their words, read from the group the first one sits in, or null.
const switches = (d, first) => d.page.evaluate(([sel, word]) => {
  const box = document.querySelector(sel) || document.body;
  const b = Array.from(box.querySelectorAll("button")).find((x) => x.offsetParent !== null && (x.textContent || "").trim() === word);
  return b ? Array.from(b.parentElement.querySelectorAll("button")).map((x) => (x.textContent || "").trim()) : null;
}, [CONTENT, first]);
// One switch in that group pressed by its word.
const pressSwitch = async (d, first, word) => {
  const hit = await d.page.evaluate(([sel, head, want]) => {
    const box = document.querySelector(sel) || document.body;
    const b = Array.from(box.querySelectorAll("button")).find((x) => x.offsetParent !== null && (x.textContent || "").trim() === head);
    const s = b && Array.from(b.parentElement.querySelectorAll("button")).find((x) => (x.textContent || "").trim() === want);
    if (!s) return false;
    s.click();
    return true;
  }, [CONTENT, first, word]);
  await d.settle(500);
  return hit;
};
// Each row of the list on screen: the form's name, and the line under it or null.
const listRows = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("table tbody tr")).map((tr) => {
  const cell = tr.querySelectorAll("td")[1];
  const span = cell ? cell.querySelector("span") : null;
  const under = span ? span.querySelector("div") : null;
  return { name: span && span.firstChild ? String(span.firstChild.textContent || "").trim() : "", under: under ? (under.textContent || "").trim() : null };
}));
// The last list of this status the page read, with what the stub answered, or null. The one-row reads,
// limit=1, are the session's and the Void switch's own questions and never a list the page draws.
const lastList = (d, status) => d.stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/forms/responses"
  && new RegExp("^\\?status=" + status + "&limit=\\d+$").test(c.query) && c.query !== "?status=" + status + "&limit=1"
  && c.json && Array.isArray(c.json.responses)).pop() || null;
// Opens the row of the list of this status the page drew last that holds this report, by its first
// cell, and waits for the read.
const openReport = async (d, status, id) => {
  const list = lastList(d, status);
  const i = list ? list.json.responses.findIndex((r) => r.id === id) : -1;
  if (i < 0) return false;
  const hit = await d.page.evaluate((n) => {
    const tr = document.querySelectorAll("table tbody tr")[n];
    const td = tr ? tr.querySelector("td") : null;
    if (!td) return false;
    td.click();
    return true;
  }, i);
  await d.settle(600);
  return hit && (await d.modalOpen());
};
// Filed forms opened, signed in first when a crash has signed the person out.
const openFiled = async (d, persona) => {
  await d.recover(persona);
  await d.goto("forms");
  await d.clickText(d.say("Filed forms"), { exact: false });
  await d.settle(500);
};
// The last read of one report since a mark, with what the stub answered.
const readOf = (d, mark, id) => d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms/responses/" + id).pop() || null;
// What the open report window draws: the status badge's words, the buttons with words, the window that
// asks why with its question, its box's name and its buttons, and every line of text.
const reportWindow = (d) => d.page.evaluate((sel) => {
  const w = Array.from(document.querySelectorAll(sel)).pop();
  if (!w) return null;
  const badge = Array.from(w.querySelectorAll("span")).find((s) => (s.getAttribute("style") || "").indexOf("text-transform: uppercase") >= 0);
  const vw = w.querySelector("[data-void-window]");
  const box = vw ? vw.querySelector("textarea") : null;
  return {
    status: badge ? (badge.textContent || "").trim() : null,
    buttons: Array.from(w.querySelectorAll("button")).filter((b) => b.offsetParent !== null).map((b) => (b.textContent || "").trim()).filter(Boolean),
    asks: vw ? { question: (vw.querySelector("div") || { textContent: "" }).textContent.trim(), box: box ? box.getAttribute("aria-label") : null,
      buttons: Array.from(vw.querySelectorAll("button")).map((b) => (b.textContent || "").trim()) } : null,
    lines: Array.from(w.querySelectorAll("div")).filter((x) => x.children.length === 0).map((x) => (x.textContent || "").trim()).filter(Boolean),
  };
}, MODAL);
// A button in the open window pressed by its words.
const press = async (d, word) => {
  const hit = await d.page.evaluate(([sel, want]) => {
    const w = Array.from(document.querySelectorAll(sel)).pop();
    const b = w && Array.from(w.querySelectorAll("button")).find((x) => x.offsetParent !== null && !x.disabled && (x.textContent || "").trim() === want);
    if (!b) return false;
    b.click();
    return true;
  }, [MODAL, word]);
  await d.settle(300);
  return hit;
};
// The squares a photos question draws, by photo name: whether it is an image drawn from a blob, and
// the words in it when it is not.
const squares = (d, key) => d.page.evaluate(([sel, k]) => {
  const q = document.querySelector(sel + " [data-question='" + k + "'] [data-photos]");
  if (!q) return null;
  return Array.from(q.children).map((c) => {
    const btn = c.querySelector("button");
    const sq = btn ? btn.firstElementChild : null;
    const nameEl = btn ? btn.nextElementSibling : null;
    return { name: nameEl ? (nameEl.textContent || "").trim() : "", img: !!sq && sq.tagName === "IMG" && String(sq.getAttribute("src") || "").indexOf("blob:") === 0,
      words: sq && sq.tagName !== "IMG" ? (sq.textContent || "").trim() : "" };
  });
}, [MODAL, key]);

async function run({ d, results, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  const pause = (ms) => d.page.waitForTimeout(ms);
  const offered = (win, word) => !!win && win.buttons.indexOf(word) >= 0;
  // The window closed, and Filed forms opened again when a crash signed the person out.
  const close = async () => { await d.closeModal(); if (await d.crashed()) await openFiled(d, "admin"); };
  stubs.reset();
  stubs.setFiledSources(true);
  try {
    await d.signOutHard();
    await d.signIn("admin");

    // ---- Filed forms as an admin: the Void switch once the void list answers 200
    let mark = d.mark();
    await openFiled(d, "admin");
    const probe = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms/responses" && c.query === "?status=void&limit=1").pop();
    const sw = await switches(d, w.submitted);
    const wantSw = [w.submitted, w.unfinished, w.voidStatus];
    results.check("page", "page/forms/void-switch-for-an-admin" + tail,
      !!probe && probe.status === 200 && !!sw && sw.join("|") === wantSw.join("|"),
      !probe ? "Filed forms never asked GET /api/forms/responses?status=void&limit=1, and the status switch reads " + JSON.stringify(sw)
        : probe.status !== 200 ? "the void list answered " + probe.status
          : "the status switch reads " + JSON.stringify(sw) + " where it should read " + JSON.stringify(wantSw));

    // ---- where each filing came from, the line under its form's name, by the source the list sent
    const submitted = lastList(d, "submitted");
    const served = submitted ? submitted.json.responses : [];
    const rows = await listRows(d);
    const sources = served.map((r) => r.source).filter(Boolean);
    const misread = served.map((r, i) => {
      const want = r.source ? w.source[r.source] : null;
      const got = rows[i] || { name: "", under: null };
      return got.name === r.formName && got.under === want ? null
        : r.formName + " (" + (r.source || "no source") + ") reads " + JSON.stringify(got.under) + " where it should read " + JSON.stringify(want);
    }).filter(Boolean);
    results.check("page", "page/forms/where-a-filing-came-from" + tail,
      served.length > 0 && rows.length === served.length && ["admin", "portal", "agent", "customer"].every((s) => sources.indexOf(s) >= 0) && misread.length === 0,
      !submitted ? "Filed forms drew no list of filed reports" : rows.length !== served.length ? "the list draws " + rows.length + " rows for the " + served.length + " the API sent"
        : ["admin", "portal", "agent", "customer"].some((s) => sources.indexOf(s) < 0) ? "the stub sent the sources " + JSON.stringify(sources)
          : misread.length ? misread.join("; ") : "each row reads " + JSON.stringify(rows.map((r) => r.name + ": " + r.under)));

    // ---- the admin's own filing: the payload says canResend false, so Send again is not drawn
    mark = d.mark();
    const ownOpened = await openReport(d, "submitted", "fr-desk-1");
    const ownRead = readOf(d, mark, "fr-desk-1");
    const own = await reportWindow(d);
    const ownPayload = ownRead && ownRead.json ? ownRead.json : {};
    const ownCrash = await d.crashDetail();
    results.check("window", "window/forms/send-again-waits-for-canresend" + tail,
      ownOpened && ownPayload.canResend === false && !!ownPayload.draft && ownPayload.draft.status === "submitted" && !!own && own.buttons.length > 0 && !offered(own, w.sendAgain),
      ownCrash ? "opening the admin's own filing crashed the page: " + ownCrash : !ownOpened ? "the admin's own filing did not open from the list"
        : ownPayload.canResend !== false ? "the read answered canResend " + JSON.stringify(ownPayload.canResend)
          : "on a filed report whose payload says canResend false the window offers " + JSON.stringify(own ? own.buttons : null));
    await close();

    // ---- a photo whose thumbnail the API refuses draws its line in its square
    stubs.setRefusal({ method: "GET", path: /^\/api\/forms\/responses\/fr-9\/photos\/ph-2\/thumb$/, status: 404, code: PHOTO_GONE.code, error: PHOTO_GONE[lang] || PHOTO_GONE.en });
    mark = d.mark();
    const logOpened = await openReport(d, "submitted", "fr-9");
    await pause(600);
    const refused = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms/responses/fr-9/photos/ph-2/thumb").pop();
    const drawn = (await squares(d, "site_photos")) || [];
    stubs.clearRefusals();
    const dock = drawn.find((x) => x.name === "dock.jpg");
    const lobby = drawn.find((x) => x.name === "lobby.jpg");
    results.check("window", "window/forms/a-refused-photo-says-so" + tail,
      logOpened && !!refused && refused.status === 404 && !!dock && !dock.img && dock.words === w.photoLine && !!lobby && lobby.img && lobby.words === "",
      !logOpened ? "the service log did not open from the list" : !refused ? "the window never asked for the dock photo's thumbnail"
        : !dock ? "no square for dock.jpg: " + JSON.stringify(drawn) : dock.img ? "the photo the API refused is drawn as an image"
          : dock.words !== w.photoLine ? "the square of the photo the API refused reads " + JSON.stringify(dock.words) + " where it should read " + JSON.stringify(w.photoLine)
            : "the photo the API sent is drawn as " + JSON.stringify(lobby));
    await close();

    // ---- a filed report whose payload says canVoid and canResend: Void and Send again are drawn
    mark = d.mark();
    const opened = await openReport(d, "submitted", "ir-1");
    const read = readOf(d, mark, "ir-1");
    const p0 = read && read.json ? read.json : {};
    const w0 = await reportWindow(d);
    results.check("window", "window/forms/void-on-canvoid" + tail,
      opened && p0.canVoid === true && offered(w0, w.voidButton),
      !opened ? "the incident report did not open from the list" : p0.canVoid !== true ? "the read answered canVoid " + JSON.stringify(p0.canVoid)
        : "a filed report whose payload says canVoid offers " + JSON.stringify(w0 ? w0.buttons : null) + " and no " + JSON.stringify(w.voidButton));
    results.check("window", "window/forms/send-again-on-canresend" + tail,
      opened && p0.canResend === true && offered(w0, w.sendAgain),
      !opened ? "the incident report did not open from the list" : p0.canResend !== true ? "the read answered canResend " + JSON.stringify(p0.canResend)
        : "a filed report whose payload says canResend offers " + JSON.stringify(w0 ? w0.buttons : null) + " and no " + JSON.stringify(w.sendAgain));

    // ---- Void asks why, in the window's own words
    const pressedVoid = offered(w0, w.voidButton) && (await press(d, w.voidButton));
    const w1 = await reportWindow(d);
    const asks = w1 ? w1.asks : null;
    results.check("window", "window/forms/void-asks-why" + tail,
      pressedVoid && !!asks && asks.question === w.question && asks.box === w.question && asks.buttons.join("|") === [w.voidReport, w.notYet].join("|"),
      !pressedVoid ? "no " + JSON.stringify(w.voidButton) + " in the window to press" : !asks ? "pressing it opened nothing that asks why"
        : "the window asks " + JSON.stringify(asks) + " where it should ask " + JSON.stringify(w.question) + " with " + JSON.stringify([w.voidReport, w.notYet]));

    // ---- Void report with no reason: the API refuses it, and its words are drawn
    mark = d.mark();
    const pressedEmpty = !!asks && (await press(d, w.voidReport));
    await pause(400);
    const empty = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/forms/responses/ir-1/void").pop();
    const w2 = await reportWindow(d);
    const said = NO_REASON[lang] || NO_REASON.en;
    results.check("window", "window/forms/a-refused-void-in-the-apis-words" + tail,
      pressedEmpty && !!empty && empty.status === 400 && !!w2 && w2.lines.indexOf(said) >= 0 && w2.status === w.submitted,
      !pressedEmpty ? "there was no " + JSON.stringify(w.voidReport) + " to press" : !empty ? "Void report with nothing typed sent nothing"
        : empty.status !== 400 ? "the API answered " + empty.status : !w2 ? "the window closed on the refusal"
          : w2.lines.indexOf(said) < 0 ? "the API's words " + JSON.stringify(said) + " are not drawn in the window" : "after a refused void the report reads " + JSON.stringify(w2.status));

    // ---- the reason typed goes in the body, and the report reads Void after
    if (w2 && !w2.asks && offered(w2, w.voidButton)) await press(d, w.voidButton);
    const typed = !!(await reportWindow(d) || {}).asks
      && (await d.modal().locator("[data-void-window] textarea").first().fill(REASON, { timeout: 3000 }).then(() => true).catch(() => false));
    mark = d.mark();
    const pressedSend = typed && (await press(d, w.voidReport));
    await pause(500);
    const sent = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/forms/responses/ir-1/void");
    results.check("window", "window/forms/void-report-sends-the-reason" + tail,
      pressedSend && sent.length === 1 && JSON.stringify(sent[0].body) === JSON.stringify({ reason: REASON }) && sent[0].status === 200,
      !typed ? "there was no box to type the reason into" : sent.length !== 1 ? "Void report sent " + sent.length + " requests"
        : "Void report sent " + JSON.stringify(sent[0].body) + " and the API answered " + sent[0].status);
    const w3 = await reportWindow(d);
    results.check("window", "window/forms/void-reads-void-after" + tail,
      sent.length === 1 && !!w3 && w3.status === w.voidStatus && !w3.asks && !offered(w3, w.voidButton) && !offered(w3, w.sendAgain),
      sent.length !== 1 ? "nothing was voided, and the report reads " + JSON.stringify(w3 ? w3.status : null)
        : !w3 ? "the window closed" : w3.status !== w.voidStatus ? "after the void the report reads " + JSON.stringify(w3.status) + " where it should read " + JSON.stringify(w.voidStatus)
          : w3.asks ? "the window asking why is still open" : "a void report still offers " + JSON.stringify(w3.buttons.filter((b) => b === w.voidButton || b === w.sendAgain)));
    await close();

    // ---- the Void switch lists the report, and a later read of it says void
    mark = d.mark();
    const switched = await pressSwitch(d, w.submitted, w.voidStatus);
    const voidList = lastList(d, "void");
    const listed = voidList ? voidList.json.responses : [];
    const voidRows = await listRows(d);
    results.check("page", "page/forms/void-switch-lists-void-reports" + tail,
      switched && !!voidList && voidList.status === 200 && listed.length === 1 && listed[0].id === "ir-1" && voidRows.length === 1 && voidRows[0].name === listed[0].formName,
      !switched ? "no " + JSON.stringify(w.voidStatus) + " switch to press" : !voidList ? "the switch read no list of void reports"
        : "the void list answered " + JSON.stringify(listed.map((r) => r.id)) + " and the page draws " + JSON.stringify(voidRows.map((r) => r.name)));
    mark = d.mark();
    const reopened = await openReport(d, "void", "ir-1");
    const later = readOf(d, mark, "ir-1");
    const w4 = await reportWindow(d);
    const laterStatus = later && later.json && later.json.draft ? later.json.draft.status : null;
    results.check("window", "window/forms/a-later-read-reads-void" + tail,
      reopened && laterStatus === "void" && !!w4 && w4.status === w.voidStatus && !offered(w4, w.voidButton) && !offered(w4, w.sendAgain),
      !reopened ? "the void report did not open from the Void switch's list" : laterStatus !== "void" ? "the later read answered status " + JSON.stringify(laterStatus)
        : !w4 || w4.status !== w.voidStatus ? "on a later read the report reads " + JSON.stringify(w4 ? w4.status : null) + " where it should read " + JSON.stringify(w.voidStatus)
          : "a void report read again offers " + JSON.stringify(w4.buttons.filter((b) => b === w.voidButton || b === w.sendAgain)));
    await close();

    // ---- a supervisor, whom the list lets in: no Void switch, and a payload without canVoid draws no Void
    stubs.reset();
    await d.signOutHard();
    await d.signIn("supervisor");
    mark = d.mark();
    await openFiled(d, "supervisor");
    const asked = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms/responses" && /^\?status=void/.test(c.query));
    const supSw = await switches(d, w.submitted);
    results.check("page", "page/forms/no-void-switch-for-a-supervisor" + tail,
      asked.length === 0 && !!supSw && supSw.join("|") === [w.submitted, w.unfinished].join("|"),
      asked.length ? "Filed forms asked for void reports as a supervisor: " + asked.map((c) => c.query).join(", ") : "the status switch reads " + JSON.stringify(supSw));
    mark = d.mark();
    const supOpened = await openReport(d, "submitted", "ir-1");
    const supRead = readOf(d, mark, "ir-1");
    const sp = supRead && supRead.json ? supRead.json : {};
    const s0 = await reportWindow(d);
    results.check("window", "window/forms/no-void-without-canvoid" + tail,
      supOpened && sp.canVoid === false && sp.canResend === true && offered(s0, w.sendAgain) && !offered(s0, w.voidButton),
      !supOpened ? "the incident report did not open from the supervisor's list" : sp.canVoid !== false ? "the read answered canVoid " + JSON.stringify(sp.canVoid)
        : "a payload that says canVoid false and canResend true offers " + JSON.stringify(s0 ? s0.buttons : null));
    await d.closeModal();
  } finally {
    stubs.reset();
  }

  results.note("Void in " + lang + ": the source line, the Void switch, Void with its reason and its refusal, Send again on canResend and a refused photo");
}

module.exports = { run };
