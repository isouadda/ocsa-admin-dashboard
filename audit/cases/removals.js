// Nothing is deleted, Step 181 (eff3cc6), in English and in Spanish at 1280.
//
// Since Step 179 the API deletes no row a person removes: it keeps the row and marks it, a status of
// cancelled, is_active false or a removed_at stamp, and every list leaves it out. This build says so on
// every screen that removes something. A site has no Delete and no Permanently Delete window, and
// Deactivate stays. The Edit Scheduled Shift window's Delete is Cancel shift, and sends the cancel.
// Inspection templates and their line items, Jotform aliases and saved reports are Deactivated.
// Documents, training records, onboarding steps, floor plans, a site's supplies and the Dropdown Options
// lists and values are Removed from this list. No question says the change cannot be undone. A
// Completed inspection has no remove, and a Scheduled one's X cancels it.
//
// The suite presses each of these as an admin, answers the question Yes, and holds the button, the
// question and the toast to the table's words, written out here by hand. It then holds the one call the
// page sent to the call the API keeps the row on, sees the row leave the list the page reads again, and
// sees the stub, which answers the way the API does, still holding the row, marked. The Dropdown Options
// editor lists every list and value, on or off, so a removed one stays there drawn off, and for those
// the suite holds the call and the mark. Each control is found by the row it sits in and its place in
// that row, so a screen that still says the old words is seen to say them. Last, it holds every question
// it read and every question the app asks through window.confirm, read out of src/App.js with the
// table's Spanish for each, to none saying the change cannot be undone.
"use strict";
const fs = require("fs");
const path = require("path");
const { readTable } = require("../lib/words");

const APP = path.resolve(__dirname, "..", "..", "src", "App.js");

const WORDS = {
  en: {
    deactivate: "Deactivate", siteQ: "Deactivate this site?",
    removeFromList: "Remove from this list", removedFromList: "Removed from this list",
    floorQ: "Remove this floor plan from this list?", floorToast: "Floor plan removed",
    supplyQ: "Remove this supply from this list?", supplyToast: "Supply removed",
    cancelShift: "Cancel shift", shiftQ: "Cancel this scheduled shift?", shiftToast: "Shift cancelled",
    templateQ: "Deactivate this template?", templateToast: "Template deactivated",
    itemQ: "Deactivate this line item?", itemToast: "Item deactivated",
    cancel: "Cancel", inspectionQ: "Cancel this inspection?", inspectionToast: "Inspection cancelled", view: "View inspection",
    reportQ: "Deactivate \"{0}\"?", reportToast: "Report deactivated",
    valueQ: "Remove this value from this list?", listQ: "Remove this list and its values from the lists shown?",
    aliasQ: "Deactivate alias {0}?", aliasNote: "This affects future auto-matching. Existing linked submissions are not changed.", aliasToast: "Alias deactivated.",
    documentQ: "Remove this document from this list?", trainingQ: "Remove this training record from this list?", stepQ: "Remove this step from this list?",
  },
  es: {
    deactivate: "Desactivar", siteQ: "\u00bfDesactivar este sitio?",
    removeFromList: "Quitar de esta lista", removedFromList: "Quitado de esta lista",
    floorQ: "\u00bfQuitar este plano de esta lista?", floorToast: "Plano quitado",
    supplyQ: "\u00bfQuitar este suministro de esta lista?", supplyToast: "Suministro quitado",
    cancelShift: "Cancelar turno", shiftQ: "\u00bfCancelar este turno programado?", shiftToast: "Turno cancelado",
    templateQ: "\u00bfDesactivar esta plantilla?", templateToast: "Plantilla desactivada",
    itemQ: "\u00bfDesactivar este elemento?", itemToast: "Elemento desactivado",
    cancel: "Cancelar", inspectionQ: "\u00bfCancelar esta inspecci\u00f3n?", inspectionToast: "Inspecci\u00f3n cancelada", view: "Ver la inspecci\u00f3n",
    reportQ: "\u00bfDesactivar \"{0}\"?", reportToast: "Informe desactivado",
    valueQ: "\u00bfQuitar este valor de esta lista?", listQ: "\u00bfQuitar esta lista y sus valores de las listas que se muestran?",
    aliasQ: "\u00bfDesactivar el alias {0}?", aliasNote: "Esto afecta las futuras vinculaciones autom\u00e1ticas. Los env\u00edos ya vinculados no cambian.", aliasToast: "Alias desactivado.",
    documentQ: "\u00bfQuitar este documento de esta lista?", trainingQ: "\u00bfQuitar este registro de capacitaci\u00f3n de esta lista?", stepQ: "\u00bfQuitar este paso de esta lista?",
  },
};
// What a question said before Step 181, in either language. No screen says it any more.
const UNDONE = ["cannot be undone", "no se puede deshacer"];

const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";
const MODAL = "div[style*='z-index: 500']";
// RD, the red a remove is drawn in: the border of a list's remove, and the fill of a danger button.
const RED = "rgb(231, 76, 60)";

// Finds the row that holds this text and presses one button in it: the last one, or with red the one
// bordered in red. It answers with the words of every button in the row and of the one it pressed, as
// each reads, or for an icon its title and its name, or null when no row holds the text. With tr the
// row is the table row; otherwise it is the smallest box that holds the text and a button.
const pressInRow = (d, anchor, how) => d.page.evaluate(([a, h, sel, red]) => {
  const scope = document.querySelector(sel) || document.body;
  const own = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
  let row = null;
  if (h.tr) row = Array.from(scope.querySelectorAll("tbody tr")).find((tr) => (tr.innerText || "").indexOf(a) >= 0) || null;
  else {
    const rows = Array.from(scope.querySelectorAll("*")).filter((el) => el.offsetParent !== null && own(el) === a).map((el) => {
      let box = el;
      while (box && box !== scope && !box.querySelector("button")) box = box.parentElement;
      return box && box !== scope ? box : null;
    }).filter(Boolean);
    rows.sort((x, y) => x.querySelectorAll("*").length - y.querySelectorAll("*").length);
    row = rows[0] || null;
  }
  if (!row) return null;
  const words = (b) => ({ text: (b.innerText || "").replace(/\s+/g, " ").trim(), title: b.getAttribute("title"), label: b.getAttribute("aria-label") });
  const buttons = Array.from(row.querySelectorAll("button")).filter((b) => b.offsetParent !== null);
  const target = h.red ? buttons.find((b) => getComputedStyle(b).borderTopColor === red) : buttons[buttons.length - 1];
  if (!target) return { buttons: buttons.map(words), pressed: null };
  const pressed = words(target);
  target.click();
  return { buttons: buttons.map(words), pressed };
}, [anchor, how || {}, CONTENT, RED]);

// The one button filled in red in the open window, pressed.
const pressDanger = (d) => d.page.evaluate(([sel, red]) => {
  const box = Array.from(document.querySelectorAll(sel)).pop();
  const b = box ? Array.from(box.querySelectorAll("button")).find((x) => x.offsetParent !== null && getComputedStyle(x).backgroundColor === red) : null;
  if (!b) return null;
  const pressed = { text: (b.innerText || "").replace(/\s+/g, " ").trim(), title: b.getAttribute("title"), label: b.getAttribute("aria-label") };
  b.click();
  return { buttons: [pressed], pressed };
}, [MODAL, RED]);

// Whether an element on the page reads exactly this, and whether a table row holds it.
const onScreen = (d, text) => d.page.evaluate(([t0, sel]) => {
  const scope = document.querySelector(sel) || document.body;
  const own = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
  return Array.from(scope.querySelectorAll("*")).some((el) => el.offsetParent !== null && own(el) === t0);
}, [text, CONTENT]);
const inRows = (d, text) => d.page.evaluate(([t0, sel]) => {
  const scope = document.querySelector(sel) || document.body;
  return Array.from(scope.querySelectorAll("tbody tr")).some((tr) => (tr.innerText || "").indexOf(t0) >= 0);
}, [text, CONTENT]);

// The shift chips on the week grid that start with these hours, leaving out a pickup's chip, which
// carries its state beside its hours. A chip is what a person presses, a button or a div drawn with a
// pointer, the way the driver's clickGridCell reads the grid, and a cell holding a chip is not one.
const shiftChips = (d, hours, pickupWords) => d.page.evaluate(([h, pw, sel]) => {
  const box = document.querySelector(sel) || document.body;
  const chips = Array.from(box.querySelectorAll("div, button")).filter((el) => {
    const txt = (el.innerText || "").trim();
    return el.offsetParent !== null && txt.indexOf(h) === 0 && txt.length <= 160
      && !pw.some((w) => txt.toLowerCase().indexOf(w.toLowerCase()) >= 0)
      && (el.tagName === "BUTTON" || (el.getAttribute("style") || "").indexOf("cursor: pointer") >= 0);
  });
  return chips.filter((el) => !chips.some((other) => other !== el && el.contains(other))).length;
}, [hours, pickupWords, CONTENT]);

// Every question the app asks through window.confirm, read out of src/App.js: the strings on the line
// that asks it, and for a question kept in a name, the line before that gives the name its words. In
// English they are the strings; in Spanish, the table's word for each. The suite presses only the
// removes, so this reaches the questions it never presses.
function confirmQuestions(lang) {
  const lines = fs.readFileSync(APP, "utf8").split("\n");
  const table = lang === "en" ? null : readTable() || {};
  const strings = (text) => {
    const out = [];
    text.replace(/"((?:[^"\\]|\\.)*)"/g, (m, s) => { try { out.push(JSON.parse("\"" + s + "\"")); } catch (e) { out.push(s); } return m; });
    return out;
  };
  const asked = [];
  lines.forEach((line, i) => {
    const at = line.indexOf("window.confirm(");
    if (at < 0) return;
    let texts = strings(line.slice(at));
    const named = /window\.confirm\(\s*([A-Za-z_$][\w$]*)\s*\)/.exec(line);
    if (named) {
      for (let j = i - 1; j >= Math.max(0, i - 6); j -= 1) {
        if (new RegExp("\\b(const|let|var)\\s+" + named[1] + "\\s*=").test(lines[j])) { texts = texts.concat(strings(lines[j])); break; }
      }
    }
    const said = table ? texts.map((s) => (table[s] && typeof table[s][lang] === "string" ? table[s][lang] : null)).filter(Boolean) : texts;
    asked.push({ line: i + 1, texts: said });
  });
  return asked;
}

// How a control said its word: the words on a button, or an icon's title and name, both.
const says = (p, word) => !!p && (p.text ? p.text === word : p.title === word && p.label === word);
const told = (p) => (!p ? "nothing" : p.text ? JSON.stringify(p.text)
  : p.title || p.label ? "an icon titled " + JSON.stringify(p.title) + " and named " + JSON.stringify(p.label) : "an icon with no name");

async function run({ d, results, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  // Every question the suite was asked and every screen it read, for the check at the end.
  const seen = [];

  // Presses a control, answers its question Yes, and reads what came of it: the question, the toast,
  // every call the page made, and the screen once the page has read its list again. The toast is read
  // first, since a page that polls never goes idle and a settle there outlasts a toast's 3 seconds.
  let toastAt = 0;
  const press = async (find) => {
    await d.waitToastGone(3600);
    await d.clearCaptures();
    const mark = d.mark();
    const hit = await find().catch(() => null);
    const toast = hit ? await d.waitToast(3000) : null;
    if (toast) toastAt = Date.now();
    const asked = (await d.confirms())[0] || null;
    await d.settle(500);
    if (asked) seen.push(asked);
    seen.push(await d.text());
    return { hit, asked, toast, calls: d.callsSince(mark) };
  };
  // The app clears whatever toast is up 3 seconds after each toast it shows, so a toast shown before
  // the last one's time is up is cleared early. Each press waits the last toast's 3 seconds out.
  const settled = async () => {
    await d.waitToastGone(3600);
    const rest = toastAt + 3200 - Date.now();
    if (rest > 0) await d.page.waitForTimeout(rest);
  };

  // The button, the question and the toast, each held to the table's words.
  const holdWords = (kind, id, r, want) => {
    const off = [];
    if (!r.hit) off.push("no row reading " + JSON.stringify(want.row) + " was on screen to press");
    else if (!r.hit.pressed) off.push("the row reading " + JSON.stringify(want.row) + " has no control to press");
    else {
      if (!says(r.hit.pressed, want.button)) off.push("the button is " + told(r.hit.pressed) + " where the table says " + JSON.stringify(want.button));
      if (r.asked !== want.question) off.push(r.asked === null ? "pressing it asked no question" : "the question reads " + JSON.stringify(r.asked) + " where the table says " + JSON.stringify(want.question));
      if (r.toast !== want.toast) off.push(r.toast === null ? "no toast followed" : "the toast reads " + JSON.stringify(r.toast) + " where the table says " + JSON.stringify(want.toast));
    }
    results.check(kind, id + tail, off.length === 0, off.length ? off.join("; ") : "the button, the question and the toast read the table's words");
  };
  // The one write the page sent, held to the call the API keeps the row on; the row gone from the list
  // the page read again, where the screen lists live rows alone, while a row beside it is still drawn;
  // and the row still in the stub, marked.
  const holdKept = (kind, id, r, want) => {
    const writes = (r.calls || []).filter((c) => c.method !== "GET");
    const off = [];
    if (!r.hit || !r.hit.pressed) off.push("nothing was pressed");
    else if (writes.length !== 1 || writes[0].method !== want.method || writes[0].path !== want.path
      || (want.body !== undefined && JSON.stringify(writes[0].body) !== JSON.stringify(want.body)) || writes[0].status !== 200) {
      off.push((writes.length ? "the page sent " + writes.map((c) => c.method + " " + c.path + (c.body ? " " + JSON.stringify(c.body) : "") + " (" + c.status + ")").join(", ") : "the page sent nothing")
        + (want.callIs || " where the API keeps the row on ") + want.method + " " + want.path + (want.body !== undefined ? " " + JSON.stringify(want.body) : ""));
    }
    if (want.left !== undefined && !want.drawn) off.push("the list is no longer drawn once the page read it again");
    else if (want.left !== undefined && !want.left) off.push("the row is still on the list after the page read it again");
    if (!want.kept) off.push(want.keptWhy);
    results.check(kind, id + tail, off.length === 0, off.length ? off.join("; ")
      : want.method + " " + want.path + (want.body !== undefined ? " " + JSON.stringify(want.body) : "") + (want.left !== undefined ? ", the row left the list" : "")
        + ", and the row is kept, " + want.keptAs);
  };
  const stateRow = (list, id) => (list || []).find((x) => x.id === id) || null;

  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");
  await d.setConfirmAnswer(true);
  // The greeting's toast, and its 3 seconds, before anything is pressed.
  await d.waitToastGone(3600);

  try {
    // ---- a site: Deactivate alone in the profile's header, which asks and opens no window
    await d.goto("sites");
    await d.clickRow(0);
    await d.settle(500);
    const head = await d.page.evaluate(([sel, word]) => {
      const box = document.querySelector(sel) || document.body;
      const b = Array.from(box.querySelectorAll("button")).find((x) => x.offsetParent !== null && (x.innerText || "").trim() === word);
      return b ? Array.from(b.parentElement.querySelectorAll("button")).map((x) => (x.innerText || "").trim()) : null;
    }, [CONTENT, w.deactivate]);
    const headPressed = [];
    await d.setConfirmAnswer(false);
    for (let i = 0; i < (head || []).length; i += 1) {
      await d.clearCaptures();
      await d.page.evaluate(([sel, word, n]) => {
        const box = document.querySelector(sel) || document.body;
        const b = Array.from(box.querySelectorAll("button")).find((x) => x.offsetParent !== null && (x.innerText || "").trim() === word);
        if (b) b.parentElement.querySelectorAll("button")[n].click();
      }, [CONTENT, w.deactivate, i]);
      await d.settle(300);
      const asked = (await d.confirms())[0] || null;
      const shown = (await d.modalOpen()) ? await d.modalText() : null;
      if (asked) seen.push(asked);
      if (shown) seen.push(shown);
      headPressed.push({ word: head[i], asked, window: shown ? shown.split("\n")[0].trim() : null });
      if (shown) await d.closeModal();
    }
    await d.setConfirmAnswer(true);
    const opened = headPressed.filter((x) => x.window);
    results.check("page", "page/sites/removals/no-delete" + tail,
      !!head && head.length === 1 && head[0] === w.deactivate && headPressed[0].asked === w.siteQ && opened.length === 0,
      !head ? "the first site's profile offers no " + JSON.stringify(w.deactivate)
        : head.length !== 1 || opened.length ? "the profile's header offers " + head.map((x) => JSON.stringify(x)).join(", ")
          + opened.map((x) => "; " + JSON.stringify(x.word) + " opens a window that reads " + JSON.stringify(x.window)).join("")
          : headPressed[0].asked !== w.siteQ ? JSON.stringify(w.deactivate) + " asks " + JSON.stringify(headPressed[0].asked) + " where the table says " + JSON.stringify(w.siteQ)
            : "the header offers Deactivate alone, which asks the table's question and opens no window");

    // ---- a floor plan, on the site's General Info
    let r = await press(() => pressInRow(d, "North Wing, floor 3"));
    holdWords("page", "page/sites/removals/floor-plan/words", r, { row: "North Wing, floor 3", button: w.removeFromList, question: w.floorQ, toast: w.floorToast });
    const plan = stateRow(stubs.state.floorPlans && stubs.state.floorPlans["s-1"], "fp-1");
    holdKept("page", "page/sites/removals/floor-plan/kept", r, { method: "DELETE", path: "/api/sites/s-1/floor-plans/fp-1",
      left: !(await onScreen(d, "North Wing, floor 3")), drawn: await onScreen(d, "Harbor Point Center"), kept: !!plan && plan.is_active === false,
      keptWhy: "the stub holds no floor plan fp-1 marked is_active false", keptAs: "is_active false" });
    await settled();

    // ---- a supply, on the site's Supplies
    await d.clickText(d.say("Supplies"), { exact: true });
    await d.settle(400);
    r = await press(() => pressInRow(d, "Neutral floor cleaner"));
    holdWords("page", "page/sites/removals/supply/words", r, { row: "Neutral floor cleaner", button: w.removeFromList, question: w.supplyQ, toast: w.supplyToast });
    const stock = ((stubs.state.siteSupplies && stubs.state.siteSupplies["s-1"]) || []).find((x) => x.supply_id === "sp-1") || null;
    holdKept("page", "page/sites/removals/supply/kept", r, { method: "DELETE", path: "/api/sites/s-1/supplies/sp-1",
      left: !(await onScreen(d, "Neutral floor cleaner")), drawn: await onScreen(d, "Microfiber cloth pack"), kept: !!stock && stock.is_active === false,
      keptWhy: "the stub holds no supply row for sp-1 at s-1 marked is_active false", keptAs: "is_active false" });
    await settled();

    // ---- a single shift, from the Edit Scheduled Shift window
    stubs.reset();
    await d.goto("schedule");
    await d.settle(400);
    const pickupWords = [d.say("OPEN"), d.say("CLAIMED"), d.say("DROP REQ")];
    const chipsBefore = await shiftChips(d, "18:00-02:00", pickupWords);
    const shiftOpened = await d.clickGridCell(/^18:00-02:00/, new RegExp(pickupWords.join("|"), "i"));
    await d.settle(300);
    r = await press(() => (shiftOpened ? pressDanger(d) : Promise.resolve(null)));
    holdWords("window", "window/schedule/removals/cancel-shift/words", r, { row: "18:00-02:00", button: w.cancelShift, question: w.shiftQ, toast: w.shiftToast });
    const chipsAfter = await shiftChips(d, "18:00-02:00", pickupWords);
    const otherChips = await shiftChips(d, "06:00-14:00", pickupWords);
    const shift = stateRow(stubs.state.schedule, "sh-1");
    holdKept("window", "window/schedule/removals/cancel-shift/kept", r, { method: "DELETE", path: "/api/schedule/sh-1",
      left: chipsBefore === 1 && chipsAfter === 0, drawn: otherChips > 0, kept: !!shift && shift.status === "cancelled",
      keptWhy: "the stub holds no shift sh-1 with status cancelled", keptAs: "status cancelled" });
    if (await d.modalOpen()) await d.closeModal();
    await settled();

    // ---- Inspections: a template, one of a template's line items, a scheduled inspection, and the
    // completed ones, which keep every row
    stubs.reset();
    await d.goto("inspections");
    await d.settle(500);
    r = await press(() => pressInRow(d, "Dock area check"));
    holdWords("page", "page/inspections/removals/template/words", r, { row: "Dock area check", button: w.deactivate, question: w.templateQ, toast: w.templateToast });
    const template = stateRow(stubs.state.templates, "tp-2");
    holdKept("page", "page/inspections/removals/template/kept", r, { method: "DELETE", path: "/api/inspections/templates/tp-2",
      left: !(await onScreen(d, "Dock area check")), drawn: await onScreen(d, "Monthly quality walk"), kept: !!template && template.is_active === false,
      keptWhy: "the stub holds no template tp-2 marked is_active false", keptAs: "is_active false" });
    await settled();

    await d.clickText("Monthly quality walk", { exact: true });
    await d.settle(500);
    r = await press(() => pressInRow(d, "Dock floor markings"));
    holdWords("page", "page/inspections/removals/line-item/words", r, { row: "Dock floor markings", button: w.deactivate, question: w.itemQ, toast: w.itemToast });
    const item = stateRow(stubs.state.templateItems && stubs.state.templateItems["tp-1"], "it-1");
    holdKept("page", "page/inspections/removals/line-item/kept", r, { method: "DELETE", path: "/api/inspections/templates/tp-1/items/it-1",
      left: !(await onScreen(d, "Dock floor markings")), drawn: await onScreen(d, "Stairwell handrails"), kept: !!item && item.is_active === false,
      keptWhy: "the stub holds no item it-1 of tp-1 marked is_active false", keptAs: "is_active false" });
    await settled();

    await d.clickText(d.say("Scheduled|inspections"), { exact: true });
    await d.settle(500);
    r = await press(() => pressInRow(d, "Monthly quality walk", { tr: true }));
    holdWords("page", "page/inspections/removals/scheduled/words", r, { row: "Monthly quality walk", button: w.cancel, question: w.inspectionQ, toast: w.inspectionToast });
    const inspection = stateRow(stubs.state.inspections, "si-1");
    holdKept("page", "page/inspections/removals/scheduled/kept", r, { method: "PATCH", path: "/api/inspections/scheduled/si-1", body: { status: "cancelled" },
      callIs: " where the X cancels the inspection, and the page cancels one with ",
      left: !(await inRows(d, "Monthly quality walk")), drawn: await inRows(d, "Dock area check"), kept: !!inspection && inspection.status === "cancelled",
      keptWhy: "the stub holds no inspection si-1 with status cancelled", keptAs: "status cancelled" });
    await settled();

    await d.clickText(d.say("Completed|inspections"), { exact: true });
    await d.settle(500);
    const completed = await d.page.evaluate((sel) => {
      const box = document.querySelector(sel) || document.body;
      return Array.from(box.querySelectorAll("tbody tr")).filter((tr) => tr.querySelectorAll("td").length > 1)
        .map((tr) => Array.from(tr.querySelectorAll("button")).map((b) => (b.innerText || "").trim() || b.getAttribute("title") || b.getAttribute("aria-label") || ""));
    }, CONTENT);
    const more = completed.filter((bs) => !(bs.length === 1 && bs[0] === w.view));
    results.check("page", "page/inspections/removals/completed-has-no-remove" + tail, completed.length === 4 && more.length === 0,
      completed.length !== 4 ? "the Completed tab draws " + completed.length + " rows for the 4 the stub serves"
        : more.length ? more.length + " of " + completed.length + " completed rows carry " + JSON.stringify(more[0]) + " where a completed row offers " + JSON.stringify([w.view]) + " alone"
          : "every completed row offers " + JSON.stringify(w.view) + " alone");

    // ---- Reports: the one custom report, deactivated
    stubs.reset();
    await d.goto("reports");
    await d.settle(600);
    r = await press(() => pressInRow(d, "Night shift issue watch"));
    holdWords("page", "page/reports/removals/deactivate/words", r, { row: "Night shift issue watch", button: w.deactivate, question: w.reportQ.replace("{0}", "Night shift issue watch"), toast: w.reportToast });
    const report = stateRow(stubs.state.reportDefs, "rd-4");
    holdKept("page", "page/reports/removals/deactivate/kept", r, { method: "DELETE", path: "/api/report-engine/definitions/rd-4",
      left: !(await onScreen(d, "Night shift issue watch")), drawn: await onScreen(d, "Issue response and resolution"), kept: !!report && report.is_active === false,
      keptWhy: "the stub holds no report rd-4 marked is_active false", keptAs: "is_active false" });
    await settled();

    // ---- Settings: a value, a list of the company's own and a site's value, each kept switched off,
    // which is what the lists read again answer
    stubs.reset();
    await d.goto("settings");
    await d.clickText(d.say("Dropdown Options"), { exact: true });
    await d.settle(500);
    const readAgain = (calls, path) => calls.filter((c) => c.method === "GET" && c.path === path && c.json).pop() || null;
    r = await press(() => pressInRow(d, "Green Buildings"));
    holdWords("page", "page/settings/removals/value/words", r, { row: "Green Buildings", button: w.removeFromList, question: w.valueQ, toast: w.removedFromList });
    let lists = readAgain(r.calls, "/api/lookups/all");
    const value = lists ? [].concat(...lists.json.map((c) => c.values || [])).find((v) => v.id === "lv-3") : null;
    holdKept("page", "page/settings/removals/value/kept", r, { method: "DELETE", path: "/api/lookups/values/lv-3",
      kept: !!value && value.is_active === false,
      keptWhy: !lists ? "the lists were not read again" : "the lists read again answer " + (value ? "lv-3 with is_active " + value.is_active : "no lv-3"), keptAs: "is_active false in the lists read again" });
    await settled();

    await d.clickText("Contract types", { exact: true });
    await d.settle(400);
    r = await press(() => pressInRow(d, "Contract types", { red: true }));
    holdWords("page", "page/settings/removals/list/words", r, { row: "Contract types", button: w.removeFromList, question: w.listQ, toast: w.removedFromList });
    lists = readAgain(r.calls, "/api/lookups/all");
    const list = lists ? lists.json.find((c) => c.id === "lk-9") : null;
    holdKept("page", "page/settings/removals/list/kept", r, { method: "DELETE", path: "/api/lookups/categories/lk-9",
      kept: !!list && list.is_active === false,
      keptWhy: !lists ? "the lists were not read again" : "the lists read again answer " + (list ? "lk-9 with is_active " + list.is_active : "no lk-9"), keptAs: "is_active false in the lists read again" });
    await settled();

    // The list is gone from the lists shown: once the shell reads the lists again, an admin's Add Site
    // offers none of its choices under Contract Type, the way a supervisor's lists leave it out.
    await d.reload();
    await d.goto("sites");
    const addOpen = await d.clickText(d.say("Add Site"), { exact: false });
    await d.settle(400);
    const offered = addOpen ? await d.page.evaluate((label) => {
      const box = Array.from(document.querySelectorAll("div[style*='z-index: 500']")).pop();
      const head = box && Array.from(box.querySelectorAll("*")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === label);
      const sel = head && head.parentElement ? head.parentElement.querySelector("select") : null;
      return sel ? Array.from(sel.options).map((o) => o.value).filter(Boolean) : null;
    }, d.say("Contract Type")) : null;
    results.check("page", "page/settings/removals/list/leaves-the-pick-lists" + tail,
      !!offered && offered.indexOf("subcontractor") < 0 && offered.indexOf("direct") < 0,
      !addOpen ? "Add Site did not open" : !offered ? "Add Site has no Contract Type list"
        : "after Contract types was removed, Add Site's Contract Type still offers " + JSON.stringify(offered));
    await d.closeModal();
    await d.goto("settings");
    await d.clickText(d.say("Dropdown Options"), { exact: true });
    await d.settle(500);

    await d.clickText(d.say("Site Lookups"), { exact: true });
    await d.pickOption("Harbor Point Center");
    await d.settle(500);
    r = await press(() => pressInRow(d, "Atrium"));
    holdWords("page", "page/settings/removals/site-value/words", r, { row: "Atrium", button: w.removeFromList, question: w.valueQ, toast: w.removedFromList });
    const siteLists = readAgain(r.calls, "/api/lookups/site/s-1/all");
    const zone = siteLists && Array.isArray(siteLists.json.zones) ? siteLists.json.zones.find((v) => v.id === "sl-1") : null;
    holdKept("page", "page/settings/removals/site-value/kept", r, { method: "DELETE", path: "/api/lookups/site/s-1/sl-1",
      kept: !!zone && zone.is_active === false,
      keptWhy: !siteLists ? "the site's values were not read again" : "the site's values read again answer " + (zone ? "sl-1 with is_active " + zone.is_active : "no sl-1"), keptAs: "is_active false in the site's values read again" });
    await settled();

    // ---- Forms: an alias on Jotform's Maintenance
    stubs.reset();
    await d.goto("forms");
    await d.clickText(d.say("Jotform"), { exact: true });
    await d.clickText(d.say("Maintenance"), { exact: true });
    await d.settle(800);
    const aliasRead = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/jotform/user-aliases" && Array.isArray(c.json)).pop();
    const alias = aliasRead ? aliasRead.json.find((a) => a.id === "al-1") : null;
    const aliasValue = alias ? alias.alias_value : "(no alias al-1 was served)";
    r = await press(() => pressInRow(d, aliasValue, { tr: true }));
    holdWords("page", "page/forms/removals/alias/words", r, { row: aliasValue, button: w.deactivate,
      question: w.aliasQ.replace("{0}", "\"" + aliasValue + "\"") + "\n\n" + w.aliasNote, toast: w.aliasToast });
    const aliasKept = stateRow(stubs.state.aliases, "al-1");
    holdKept("page", "page/forms/removals/alias/kept", r, { method: "DELETE", path: "/api/jotform/user-aliases/al-1",
      left: !(await inRows(d, aliasValue)), drawn: await inRows(d, "gigi okonkwo"), kept: !!aliasKept && aliasKept.is_active === false,
      keptWhy: "the stub holds no alias al-1 marked is_active false", keptAs: "is_active false" });
    await settled();

    // ---- HR Records: a document on Documents and on Other, a training record, an onboarding step,
    // and a document in a person's folder
    stubs.reset();
    await d.goto("hr");
    const stamped = (list, id) => { const x = stateRow(list, id); return !!x && !!x.removed_at && !!x.removed_by; };
    await d.clickText(d.say("Documents"), { exact: true });
    await d.settle(500);
    r = await press(() => pressInRow(d, "doc-2.pdf", { tr: true }));
    holdWords("page", "page/hr/removals/document/words", r, { row: "doc-2.pdf", button: w.removeFromList, question: w.documentQ, toast: w.removedFromList });
    holdKept("page", "page/hr/removals/document/kept", r, { method: "DELETE", path: "/api/jotform/employee-documents/hd-2",
      left: !(await inRows(d, "doc-2.pdf")), drawn: await inRows(d, "doc-1.pdf"), kept: stamped(stubs.state.documents, "hd-2"),
      keptWhy: "the stub holds no document hd-2 stamped removed_at", keptAs: "stamped removed_at and who" });
    await settled();

    await d.clickText(d.say("Other|items"), { exact: true });
    await d.settle(500);
    r = await press(() => pressInRow(d, "doc-8.pdf", { tr: true }));
    holdWords("page", "page/hr/removals/other/words", r, { row: "doc-8.pdf", button: w.removeFromList, question: w.documentQ, toast: w.removedFromList });
    holdKept("page", "page/hr/removals/other/kept", r, { method: "DELETE", path: "/api/jotform/employee-documents/hd-8",
      left: !(await inRows(d, "doc-8.pdf")), drawn: await inRows(d, "doc-4.pdf"), kept: stamped(stubs.state.documents, "hd-8"),
      keptWhy: "the stub holds no document hd-8 stamped removed_at", keptAs: "stamped removed_at and who" });
    await settled();

    await d.clickText(d.say("Training"), { exact: true });
    await d.settle(600);
    r = await press(() => pressInRow(d, "Kwabena Asante", { tr: true }));
    holdWords("page", "page/hr/removals/training/words", r, { row: "Kwabena Asante", button: w.removeFromList, question: w.trainingQ, toast: w.removedFromList });
    holdKept("page", "page/hr/removals/training/kept", r, { method: "DELETE", path: "/api/hr/training/ht-12",
      left: !(await inRows(d, "Kwabena Asante")), drawn: await inRows(d, "Salome Mkhize"), kept: stamped(stubs.state.training, "ht-12"),
      keptWhy: "the stub holds no training record ht-12 stamped removed_at", keptAs: "stamped removed_at and who" });
    await settled();

    await d.clickText(d.say("Onboarding"), { exact: true });
    await d.pickPerson("Tomasz Wisniewski");
    await d.settle(500);
    r = await press(() => pressInRow(d, "Site walkthrough"));
    holdWords("page", "page/hr/removals/step/words", r, { row: "Site walkthrough", button: w.removeFromList, question: w.stepQ, toast: w.removedFromList });
    holdKept("page", "page/hr/removals/step/kept", r, { method: "DELETE", path: "/api/hr/onboarding/step/ob-4",
      left: !(await onScreen(d, "Site walkthrough")), drawn: await onScreen(d, "Keys and badge issued"), kept: stamped(stubs.state.onboarding, "ob-4"),
      keptWhy: "the stub holds no step ob-4 stamped removed_at", keptAs: "stamped removed_at and who" });
    await settled();

    await d.clickText(d.say("Employees"), { exact: true });
    await d.settle(500);
    await d.clickText("Tomasz Wisniewski", { exact: true });
    await d.settle(700);
    r = await press(() => pressInRow(d, "Handbook acknowledgement"));
    holdWords("page", "page/hr/removals/folder-document/words", r, { row: "Handbook acknowledgement", button: w.removeFromList, question: w.documentQ, toast: w.removedFromList });
    holdKept("page", "page/hr/removals/folder-document/kept", r, { method: "DELETE", path: "/api/jotform/employee-documents/hd-5",
      left: !(await onScreen(d, "Handbook acknowledgement")), drawn: await onScreen(d, "Bloodborne pathogens"), kept: stamped(stubs.state.documents, "hd-5"),
      keptWhy: "the stub holds no document hd-5 stamped removed_at", keptAs: "stamped removed_at and who" });
    await settled();

    // ---- no question and no screen the suite read says the change cannot be undone
    const lines = [];
    seen.forEach((s) => String(s).split("\n").forEach((line) => {
      if (UNDONE.some((u) => line.toLowerCase().indexOf(u) >= 0) && lines.indexOf(line.trim()) < 0) lines.push(line.trim());
    }));
    results.check("page", "page/removals/nothing-says-cannot-be-undone" + tail, lines.length === 0,
      lines.length ? "these read that it cannot be undone: " + lines.map((x) => JSON.stringify(x)).join(", ")
        : seen.length + " questions and screens read, none says it cannot be undone");

    // ---- and no question the app asks anywhere says it, in the language of this pass
    const questions = confirmQuestions(lang);
    const undone = questions.filter((q) => q.texts.some((x) => UNDONE.some((u) => x.toLowerCase().indexOf(u) >= 0)));
    results.check("page", "page/removals/no-question-says-cannot-be-undone" + tail, questions.length >= 20 && undone.length === 0,
      questions.length < 20 ? "only " + questions.length + " questions were found in src/App.js"
        : undone.length ? undone.map((q) => "src/App.js:" + q.line + " asks " + JSON.stringify(q.texts.find((x) => UNDONE.some((u) => x.toLowerCase().indexOf(u) >= 0)))).join(", ")
          : questions.length + " questions in src/App.js, none says it cannot be undone");
  } finally {
    await d.setConfirmAnswer(true).catch(() => {});
    stubs.reset();
  }

  results.note("Nothing is deleted in " + lang + ": a site's header, a floor plan, a site's supply, a shift, a template, a line item, a scheduled"
    + " and the completed inspections, a report, a value, a list, a site's value, an alias, three documents, a training record and a step");
}

module.exports = { run, confirmQuestions };
