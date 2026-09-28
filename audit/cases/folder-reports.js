// Reports in a person's HR folder, and the person picker, Step 187 (adf6eb7), in English and in Spanish at 1280.
//
// Since Step 186 a form may name one person question as aboutPerson, with an HR folder category, and every
// filed report of it goes in that person's folder: GET /api/hr/employee-folder/:user_id sends it as an item
// with source form, its title in both languages, the category, the day it was filed, who filed it, its
// status and the report's id. HR Records' folder draws it under its category with the mark FRM, the title
// in the screen's language, Filed form, Filed by and the day, a Void badge once it is void, and View PDF,
// which reads GET /api/forms/responses/:id/pdf; pressing the row opens the report's review window. Staff
// Management's HR Files tab reads the same route and draws the same reports in a Filed forms card. A person
// question is answered through a list of the active staff searched by name, and the answer is { id, name }.
// The stub publishes a form made with the builder, OCSA-FRM-039, a follow-up talk whose person question
// names the employee and files under HR - Ongoing / Annual, with one report filed from the staff app by the
// supervisor about Tomasz Wisniewski at 9:10 PM in New York on March 16, which is March 17 in UTC. The
// suite reads that report in his folder and on his HR Files tab, opens it from each row, downloads its PDF
// from each, voids it and reads the mark in both places, and holds the folder row's status to the table's
// word and the card's day to the day it was filed in New York. It then starts the form, searches for a
// person by name, picks one, changes to another, and holds the save to { id, name } and the review step
// and the filed report's window to the name. The words are written out here by hand.
"use strict";

const MODAL = "div[style*='z-index: 500']";
const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";

// What the screen has to say, by hand, and the lines the API sends for the form in each language.
const WORDS = {
  en: { title: "Follow-up talk", category: "HR - Ongoing / Annual", source: "Filed form", mark: "FRM", filedBy: "Filed by Marcus Ferreira",
    void: "Void", viewPdf: "View PDF", card: "Filed forms (1)", voidIt: "Void", why: "Why is this report being voided?",
    voidReport: "Void report", start: "Start a form", search: "Search by name", noMatch: "No one matches.", change: "Change", review: "Review",
    employee: "Employee", topic: "What was talked about", tag: "en-US" },
  es: { title: "Charla de seguimiento", category: "RR. HH. - Continuo / Anual", source: "Formulario presentado", mark: "FRM", filedBy: "Presentado por Marcus Ferreira",
    void: "Anulado", viewPdf: "Ver el PDF", card: "Formularios presentados (1)", voidIt: "Anular", why: "\u00bfPor qu\u00e9 se anula este reporte?",
    voidReport: "Anular reporte", start: "Iniciar un formulario", search: "Buscar por nombre", noMatch: "Nadie coincide.", change: "Cambiar", review: "Revisar",
    employee: "Empleado", topic: "De qu\u00e9 se habl\u00f3", tag: "es-US" },
};
// The report the stub serves about Tomasz Wisniewski, the name of its PDF, and the day it was filed in New
// York, March 16, 2026, with the day it was in UTC, March 17, which no screen may say.
const REPORT = "fr-b2";
const PDF_NAME = "OCSA-FRM-039-fr-b2.pdf";
const ABOUT = { id: "u-staff-5", name: "Tomasz Wisniewski" };
const PICKED = { id: "u-staff-6", name: "Ngozi Okonkwo" };
const REASON = "Filed about the wrong week.";
// hand: the seed's twelve people, less Salome Mkhize, who is pending, and Kwabena Asante, who is inactive.
const ACTIVE = ["Dana Whitlock", "Marcus Ferreira", "Priya Raghunathan", "Oyelaran Adebayo", "Tomasz Wisniewski", "Ngozi Okonkwo",
  "Elena Barbosa", "Rashid Haddad", "Yuki Tanabe", "Bertrand Lefevre"];

// A day as the language writes it, month short, day and year, read in the browser the screen is drawn in.
const dayIn = (d, tag, y, m, dd) => d.page.evaluate(([t0, a, b, c]) => new Date(a, b - 1, c).toLocaleDateString(t0, { month: "short", day: "numeric", year: "numeric" }), [tag, y, m, dd]);

// The row of a person's folder that names the report, as the browser drew it: its words, its mark, the
// badges beside its title, its buttons and whether it can be pressed.
const folderRow = (d, title) => d.page.evaluate(([scope, t0]) => {
  const box = document.querySelector(scope) || document.body;
  const rows = Array.from(box.querySelectorAll("div[style*='padding: 12px 16px']")).filter((el) => (el.textContent || "").indexOf(t0) >= 0);
  const row = rows[rows.length - 1];
  if (!row) return null;
  const spans = Array.from(row.querySelectorAll("span"));
  const lines = Array.from(row.querySelectorAll("div")).filter((el) => el.children.length === 0 || el.querySelector("span[style*='letter-spacing']")).map((el) => (el.textContent || "").trim());
  const words = [];
  const walk = (n) => { if (n.nodeType === 3) { const v = (n.textContent || "").replace(/\s+/g, " ").trim(); if (v) words.push(v); return; } Array.from(n.childNodes).forEach(walk); };
  walk(row);
  return {
    text: words.join(" "),
    mark: spans.length ? (spans[0].textContent || "").trim() : "",
    badges: spans.filter((s) => (s.getAttribute("style") || "").indexOf("letter-spacing") >= 0).map((s) => (s.textContent || "").trim()),
    lines: lines,
    buttons: Array.from(row.querySelectorAll("button")).map((b) => (b.textContent || "").trim()),
    pointer: (row.getAttribute("style") || "").indexOf("cursor: pointer") >= 0,
  };
}, [CONTENT, title]);
// The card on the HR Files tab headed by these words, and its rows as the browser drew them.
const filedCard = (d, head) => d.page.evaluate(([scope, h]) => {
  const box = document.querySelector(scope) || document.body;
  const label = Array.from(box.querySelectorAll("div")).find((el) => el.children.length === 0 && (el.textContent || "").trim() === h);
  const card = label && label.parentElement;
  if (!card) return null;
  const words = (el) => { const out = []; const walk = (n) => { if (n.nodeType === 3) { const v = (n.textContent || "").replace(/\s+/g, " ").trim(); if (v) out.push(v); return; } Array.from(n.childNodes).forEach(walk); }; walk(el); return out.join(" "); };
  return Array.from(card.children).filter((el) => el !== label && el.querySelector("button")).map((el) => ({
    text: words(el),
    badges: Array.from(el.querySelectorAll("span")).filter((s) => (s.getAttribute("style") || "").indexOf("letter-spacing") >= 0).map((s) => (s.textContent || "").trim()),
    buttons: Array.from(el.querySelectorAll("button")).map((b) => (b.textContent || "").trim()),
  }));
}, [CONTENT, head]);
// Presses the title of a row, which is where a person presses a row, or a button inside it by its words.
const pressIn = (d, head, title, word) => d.page.evaluate(([scope, h, t0, w]) => {
  const box = document.querySelector(scope) || document.body;
  let row = null;
  if (h) {
    const label = Array.from(box.querySelectorAll("div")).find((el) => el.children.length === 0 && (el.textContent || "").trim() === h);
    row = label && label.parentElement ? Array.from(label.parentElement.children).find((el) => el !== label && (el.textContent || "").indexOf(t0) >= 0) : null;
  } else {
    const rows = Array.from(box.querySelectorAll("div[style*='padding: 12px 16px']")).filter((el) => (el.textContent || "").indexOf(t0) >= 0);
    row = rows[rows.length - 1] || null;
  }
  if (!row) return false;
  const target = w ? Array.from(row.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === w)
    : Array.from(row.querySelectorAll("div")).find((el) => el.children.length === 0 && (el.textContent || "").trim() === t0) || row;
  if (!target) return false;
  target.click();
  return true;
}, [CONTENT, head || "", title, word || ""]);
// A button in the open window, pressed by its words.
const press = (d, word) => d.page.evaluate(([sel, w]) => {
  const root = Array.from(document.querySelectorAll(sel)).pop();
  const b = root && Array.from(root.querySelectorAll("button")).find((x) => x.offsetParent !== null && !x.disabled && ((x.textContent || "").trim() === w || x.getAttribute("aria-label") === w));
  if (!b) return false;
  b.click();
  return true;
}, [MODAL, word]);
// The open window's lines, and the answer a question's block draws under its label: the block that holds
// the label and the answer and nothing else, which is how the review window and the fill window's review
// step draw one.
const windowLines = async (d) => (await d.modalText()).split("\n").map((x) => x.trim()).filter(Boolean);
const answerIn = (d, label) => d.page.evaluate(([sel, l]) => {
  const root = Array.from(document.querySelectorAll(sel)).pop();
  const block = root && Array.from(root.querySelectorAll("div")).find((el) => el.children.length === 2 && el.children[0].tagName === "DIV" && el.children[1].tagName === "DIV"
    && (el.children[0].textContent || "").trim() === l);
  return block ? (block.children[1].textContent || "").trim() : null;
}, [MODAL, label]);
// The badge on the open window's head.
const windowBadges = (d) => d.page.evaluate((sel) => {
  const root = Array.from(document.querySelectorAll(sel)).pop();
  return root ? Array.from(root.querySelectorAll("span")).filter((s) => (s.getAttribute("style") || "").indexOf("letter-spacing") >= 0).map((s) => (s.textContent || "").trim()) : [];
}, MODAL);
// The person question in the fill window: the search box, the list, the name picked and its Change.
const personQuestion = (d, key) => d.page.evaluate(([sel, k]) => {
  const q = document.querySelector(sel + " [data-question='" + k + "']");
  if (!q) return null;
  const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
  const input = q.querySelector("input");
  const picked = q.querySelector("[data-person-picked]");
  const words = [];
  const walk = (n) => { if (n.nodeType === 3) { const v = (n.textContent || "").replace(/\s+/g, " ").trim(); if (v) words.push(v); return; } Array.from(n.childNodes).forEach(walk); };
  walk(q);
  return {
    text: words.join(" "),
    placeholder: input ? input.getAttribute("placeholder") : null,
    options: Array.from(q.querySelectorAll("[role=option]")).map((o) => ({ name: (o.childNodes[0] && o.childNodes[0].textContent || "").trim(), height: Math.round(o.getBoundingClientRect().height / zoom) })),
    listText: (q.querySelector("[role=listbox]") || { textContent: "" }).textContent.trim(),
    picked: picked ? ((picked.querySelector("div") || { textContent: "" }).textContent || "").trim() : null,
    change: picked ? Array.from(picked.querySelectorAll("button")).map((b) => ({ text: (b.textContent || "").trim(), label: b.getAttribute("aria-label") })) : [],
  };
}, [MODAL, key]);
const searchFor = async (d, key, text) => {
  const box = d.modal().locator("[data-question='" + key + "'] input").first();
  if ((await box.count()) === 0) return false;
  await box.fill(text);
  await d.settle(200);
  return true;
};
const pickPerson = (d, key, name) => d.page.evaluate(([sel, k, n]) => {
  const q = document.querySelector(sel + " [data-question='" + k + "']");
  const o = q && Array.from(q.querySelectorAll("[role=option]")).find((x) => (x.childNodes[0] && x.childNodes[0].textContent || "").trim() === n);
  if (!o) return false;
  o.click();
  return true;
}, [MODAL, key, name]);
const clickRowWith = (d, text) => d.page.evaluate((txt) => {
  const row = Array.from(document.querySelectorAll("table tbody tr")).find((r) => r.innerText.indexOf(txt) >= 0);
  if (!row) return false;
  row.click();
  return true;
}, text);

async function openFolder(d, name) {
  await d.goto("hr");
  await d.settle(400);
  const mark = d.mark();
  const ok = await d.clickText(name, { exact: true });
  await d.settle(700);
  return { ok, read: d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/hr/employee-folder/" + ABOUT.id).pop() || null };
}
async function openHrFiles(d) {
  await d.goto("staff");
  await d.settle(400);
  const opened = await clickRowWith(d, ABOUT.name);
  await d.settle(600);
  const mark = d.mark();
  const tab = opened ? await d.clickText(d.say("HR Files"), { exact: true }) : false;
  await d.settle(700);
  return { ok: opened && tab, read: d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/hr/employee-folder/" + ABOUT.id).pop() || null };
}
// Void from the open window: Void, the reason, and Void report. The request it sent, or null.
async function voidOpen(d, w) {
  if (!(await press(d, w.voidIt))) return null;
  await d.settle(200);
  await d.modal().locator("textarea[aria-label='" + w.why + "']").fill(REASON).catch(() => {});
  const mark = d.mark();
  await press(d, w.voidReport);
  await d.settle(600);
  return d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/forms/responses/" + REPORT + "/void").pop() || null;
}

async function run({ d, results, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  stubs.reset();
  stubs.publishForm("OCSA-FRM-039");
  await d.signOutHard();
  await d.signIn("admin");
  const nyDay = await dayIn(d, w.tag, 2026, 3, 16);
  const utcDay = await dayIn(d, w.tag, 2026, 3, 17);

  // ---- HR Records: the report in Tomasz Wisniewski's folder, under its category
  const f = await openFolder(d, ABOUT.name);
  const pill = f.ok ? await d.page.evaluate(([scope, c]) => {
    const box = document.querySelector(scope) || document.body;
    const b = Array.from(box.querySelectorAll("button")).find((x) => (x.textContent || "").trim().indexOf(c + " (") === 0);
    if (!b) return null;
    b.click();
    return (b.textContent || "").trim();
  }, [CONTENT, w.category]) : null;
  await d.settle(300);
  const row = await folderRow(d, w.title);
  const rowOk = !!row && row.mark === w.mark && row.text.indexOf(w.source) >= 0 && row.text.indexOf(w.filedBy) >= 0 && row.text.indexOf(nyDay) >= 0
    && row.text.indexOf(w.category) >= 0 && row.buttons.indexOf(w.viewPdf) >= 0;
  results.check("page", "page/hr/folder/the-report-is-under-its-category" + tail, !!f.read && !!pill && rowOk,
    !f.ok ? "the Employees tab has no card for " + ABOUT.name
      : !f.read ? "the folder read no GET /api/hr/employee-folder/" + ABOUT.id
        : !pill ? "the folder draws no " + JSON.stringify(w.category) + " to pick"
          : !row ? "under " + JSON.stringify(pill) + " the folder lists no row named " + JSON.stringify(w.title)
            : "the row reads " + JSON.stringify(row.text) + " with the mark " + JSON.stringify(row.mark) + " where it should carry " + JSON.stringify([w.mark, w.title, w.source, w.filedBy, nyDay, w.category, w.viewPdf]));

  // ---- the row opens the report's window
  let mark = d.mark();
  const pressed = row ? await pressIn(d, "", w.title) : false;
  await d.settle(700);
  const read = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/forms/responses/" + REPORT);
  let lines = (await d.modalOpen()) ? await windowLines(d) : [];
  const aboutRead = lines.length ? await answerIn(d, w.employee) : null;
  results.check("window", "window/hr/folder/the-row-opens-the-report" + tail,
    pressed && read && lines.length > 0 && lines[0] === w.title && lines.join(" ").indexOf(w.filedBy) >= 0 && aboutRead === ABOUT.name,
    !pressed ? "no row to press" : !read ? "pressing the row read no report" + (row && !row.pointer ? ", and the row does not take a press" : "")
      : "the window reads " + JSON.stringify(lines.slice(0, 12)) + " with " + JSON.stringify(aboutRead) + " under " + JSON.stringify(w.employee));
  await d.closeModal();

  // ---- View PDF on the row downloads the report's own PDF, and opens no window
  await d.clearCaptures();
  mark = d.mark();
  const pdfPressed = row ? await pressIn(d, "", w.title, w.viewPdf) : false;
  await d.settle(700);
  let pdf = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms/responses/" + REPORT + "/pdf").pop() || null;
  let files = await d.downloads();
  let file = files.length ? files[files.length - 1] : null;
  const pdfWindow = await d.modalOpen();
  results.check("page", "page/hr/folder/view-pdf-downloads-the-report" + tail,
    pdfPressed && !!pdf && !!file && file.name === PDF_NAME && String(file.body).indexOf("%PDF") === 0 && !pdfWindow,
    !pdfPressed ? "the row has no " + JSON.stringify(w.viewPdf) : !pdf ? "View PDF read no GET /api/forms/responses/" + REPORT + "/pdf"
      : !file ? "no file was saved" : pdfWindow ? "View PDF opened the report's window as well"
        : "the file saved as " + JSON.stringify(file.name) + " and starts " + JSON.stringify(String(file.body).slice(0, 8)));
  await d.closeModal();

  // ---- Staff Management, HR Files: the Filed forms card, and the day it was filed in New York
  let s = await openHrFiles(d);
  let card = s.ok ? await filedCard(d, w.card) : null;
  let cardRow = card && card.length === 1 ? card[0] : null;
  results.check("page", "page/staff/hr-files/the-report-is-in-the-filed-forms-card" + tail,
    !!s.read && !!cardRow && cardRow.text.indexOf(w.title) >= 0 && cardRow.text.indexOf(w.category) >= 0 && cardRow.text.indexOf(w.filedBy) >= 0 && cardRow.buttons.indexOf(w.viewPdf) >= 0,
    !s.ok ? "the HR Files tab of " + ABOUT.name + " did not open" : !s.read ? "the HR Files tab read no GET /api/hr/employee-folder/" + ABOUT.id
      : !card ? "the tab draws no card headed " + JSON.stringify(w.card) : !cardRow ? "the card holds " + card.length + " rows"
        : "the card's row reads " + JSON.stringify(cardRow.text));
  results.check("page", "page/staff/hr-files/the-day-it-was-filed-in-new-york" + tail,
    !!cardRow && cardRow.text.indexOf(nyDay) >= 0 && cardRow.text.indexOf(utcDay) < 0,
    !cardRow ? "no row in a " + JSON.stringify(w.card) + " card to read a day from"
      : "the row reads " + JSON.stringify(cardRow.text) + " where it was filed on " + JSON.stringify(nyDay) + " in New York, " + JSON.stringify(utcDay) + " in UTC");

  // ---- the card's row opens the report, and its View PDF downloads it
  mark = d.mark();
  const cardPressed = cardRow ? await pressIn(d, w.card, w.title) : false;
  await d.settle(700);
  const cardRead = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/forms/responses/" + REPORT);
  lines = (await d.modalOpen()) ? await windowLines(d) : [];
  results.check("window", "window/staff/hr-files/the-row-opens-the-report" + tail,
    cardPressed && cardRead && lines.length > 0 && lines[0] === w.title && lines.join(" ").indexOf(w.filedBy) >= 0,
    !cardPressed ? "no row in the card to press" : !cardRead ? "pressing the row read no report" : "the window reads " + JSON.stringify(lines.slice(0, 10)));
  await d.closeModal();
  await d.clearCaptures();
  mark = d.mark();
  const cardPdf = cardRow ? await pressIn(d, w.card, w.title, w.viewPdf) : false;
  await d.settle(700);
  pdf = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms/responses/" + REPORT + "/pdf").pop() || null;
  files = await d.downloads();
  file = files.length ? files[files.length - 1] : null;
  const cardWindow = await d.modalOpen();
  results.check("page", "page/staff/hr-files/view-pdf-downloads-the-report" + tail,
    cardPdf && !!pdf && !!file && file.name === PDF_NAME && String(file.body).indexOf("%PDF") === 0 && !cardWindow,
    !cardPdf ? "the card's row has no " + JSON.stringify(w.viewPdf) : !pdf ? "View PDF read no GET /api/forms/responses/" + REPORT + "/pdf"
      : !file ? "no file was saved" : cardWindow ? "View PDF opened the report's window as well"
        : "the file saved as " + JSON.stringify(file.name) + " and starts " + JSON.stringify(String(file.body).slice(0, 8)));
  await d.closeModal();

  // ---- void it from the card's row, and the mark on the card and in the folder
  const fromRow = cardRow ? await pressIn(d, w.card, w.title) : false;
  await d.settle(700);
  let voided = (await d.modalOpen()) ? await voidOpen(d, w) : null;
  const marked = voided ? await windowBadges(d) : [];
  results.check("window", "window/staff/hr-files/void-from-the-row" + tail,
    fromRow && !!voided && JSON.stringify(voided.body) === JSON.stringify({ reason: REASON }) && voided.status === 200 && marked.indexOf(w.void) >= 0,
    !fromRow ? "no row in the card opens the report, so nothing was voided from it"
      : !voided ? "the report's window offers no " + JSON.stringify(w.voidIt) + " or sent nothing"
        : "Void report sent " + JSON.stringify(voided.body) + ", was answered " + voided.status + " and the window's badges read " + JSON.stringify(marked));
  await d.closeModal();
  if (!voided) {
    // The old screen opens no report from either row: the report is voided from Filed forms, so the marks
    // below are read on a void report either way.
    await d.goto("forms");
    await d.clickText(d.say("Filed forms"), { exact: false });
    await d.settle(500);
    if (await clickRowWith(d, w.title)) { await d.settle(700); voided = await voidOpen(d, w); }
    await d.closeModal();
    await d.goto("staff");
  }
  s = await openHrFiles(d);
  card = s.ok ? await filedCard(d, w.card) : null;
  cardRow = card && card.length === 1 ? card[0] : null;
  results.check("page", "page/staff/hr-files/a-void-report-is-marked" + tail, !!voided && !!cardRow && cardRow.badges.indexOf(w.void) >= 0,
    !voided ? "the report could not be voided" : !cardRow ? "no row in a " + JSON.stringify(w.card) + " card"
      : "the card's row reads " + JSON.stringify(cardRow.text) + " with the badges " + JSON.stringify(cardRow.badges));
  await openFolder(d, ABOUT.name);
  const after = await folderRow(d, w.title);
  // The line under the title: where the item came from, who filed it, and its status last.
  const under = after ? after.lines.filter((x) => x.indexOf(w.source) === 0 || x.indexOf("form") === 0).pop() || "" : "";
  const said = under.split(" . ").pop();
  results.check("page", "page/hr/folder/a-void-report-is-marked" + tail, !!voided && !!after && after.badges.indexOf(w.void) >= 0 && said === w.void,
    !voided ? "the report could not be voided" : !after ? "the folder lists no row named " + JSON.stringify(w.title)
      : "the row reads " + JSON.stringify(after.text) + " with the badges " + JSON.stringify(after.badges) + " and the status " + JSON.stringify(said) + " where the table's word is " + JSON.stringify(w.void));

  // ---- the person question: search by name, pick, change, and what is saved and read
  await d.goto("forms");
  await d.clickText(d.say("Filed forms"), { exact: false });
  await d.settle(500);
  await d.clickText(w.start, { exact: true });
  await d.settle(400);
  mark = d.mark();
  const chosen = await d.page.evaluate(([sel, t0]) => {
    const b = Array.from(document.querySelectorAll(sel + " [role=list] button")).find((x) => (x.textContent || "").trim() === t0);
    if (!b) return false;
    b.click();
    return true;
  }, [MODAL, w.title]);
  await d.settle(700);
  const began = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/forms/OCSA-FRM-039/drafts").pop() || null;
  const draftId = began && began.json && began.json.draft ? began.json.draft.id : "";
  const q0 = await personQuestion(d, "employee");
  const names0 = q0 ? q0.options.map((o) => o.name) : [];
  const short = q0 ? q0.options.filter((o) => o.height < 44).map((o) => o.name + " " + o.height) : [];
  await searchFor(d, "employee", "wis");
  const q1 = await personQuestion(d, "employee");
  await searchFor(d, "employee", "qz");
  const q2 = await personQuestion(d, "employee");
  await searchFor(d, "employee", "wis");
  const first = await pickPerson(d, "employee", ABOUT.name);
  await d.settle(200);
  const q3 = await personQuestion(d, "employee");
  const changeOk = !!q3 && q3.change.length === 1 && q3.change[0].text === w.change && q3.change[0].label === w.employee + ": " + w.change;
  results.check("window", "window/forms/person-question/search-and-pick" + tail,
    chosen && !!q0 && q0.placeholder === w.search && names0.join("|") === ACTIVE.join("|") && short.length === 0
      && !!q1 && q1.options.map((o) => o.name).join("|") === ABOUT.name && !!q2 && q2.options.length === 0 && q2.listText === w.noMatch
      && first && !!q3 && q3.picked === ABOUT.name && changeOk,
    !chosen ? "the picker offers no " + JSON.stringify(w.title) : !q0 ? "the fill window drew no Employee question"
      : q0.placeholder !== w.search ? "the Employee question draws no search box: it reads " + JSON.stringify(q0.text.slice(0, 160))
        : names0.join("|") !== ACTIVE.join("|") ? "the list offers " + JSON.stringify(names0) + " where the active staff are " + JSON.stringify(ACTIVE)
          : short.length ? "rows under 44 pixels: " + JSON.stringify(short)
            : !q1 || q1.options.map((o) => o.name).join("|") !== ABOUT.name ? "searching wis lists " + JSON.stringify(q1 ? q1.options.map((o) => o.name) : null)
              : !q2 || q2.listText !== w.noMatch ? "searching qz reads " + JSON.stringify(q2 ? q2.listText : null)
                : "picking " + ABOUT.name + " draws " + JSON.stringify(q3 ? { picked: q3.picked, change: q3.change } : null));

  const reopened = changeOk ? await press(d, w.employee + ": " + w.change) : false;
  await d.settle(200);
  const q4 = await personQuestion(d, "employee");
  await searchFor(d, "employee", "oko");
  const second = await pickPerson(d, "employee", PICKED.name);
  await d.settle(200);
  const q5 = await personQuestion(d, "employee");
  results.check("window", "window/forms/person-question/change" + tail,
    reopened && !!q4 && q4.placeholder === w.search && q4.options.length === ACTIVE.length && second && !!q5 && q5.picked === PICKED.name,
    !reopened ? "no " + JSON.stringify(w.change) + " beside the name picked"
      : !q4 || q4.placeholder !== w.search ? "Change drew " + JSON.stringify(q4 ? q4.text.slice(0, 120) : null)
        : "picking " + PICKED.name + " after Change draws " + JSON.stringify(q5 ? q5.picked : null));

  await d.modal().locator("[aria-label='" + w.topic + "']").first().fill("Closing the dock on nights").catch(() => {});
  mark = d.mark();
  await press(d, d.say("Save"));
  await d.settle(700);
  const saved = d.callsSince(mark).filter((c) => c.method === "PATCH" && c.path === "/api/forms/drafts/" + draftId).pop() || null;
  const sent = saved && saved.body && saved.body.answers ? saved.body.answers.employee : undefined;
  results.check("window", "window/forms/person-question/saves-id-and-name" + tail,
    !!saved && saved.status === 200 && JSON.stringify(sent) === JSON.stringify(PICKED),
    !draftId ? "the form was not started" : !saved ? "Save sent nothing"
      : "Save sent the Employee answer " + JSON.stringify(sent === undefined ? "(none)" : sent) + " and was answered " + saved.status + " where the person picked is " + JSON.stringify(PICKED));

  await press(d, d.say("Next"));
  await d.settle(700);
  const step = await d.page.evaluate((sel) => { const s = document.querySelector(sel + " [data-form-step]"); return s ? s.textContent.trim() : ""; }, MODAL);
  const reviewed = step ? await answerIn(d, w.employee) : null;
  results.check("window", "window/forms/person-question/the-review-step-reads-the-name" + tail, step === w.review && reviewed === PICKED.name,
    step !== w.review ? "Next led to " + JSON.stringify(step) + " where the review is " + JSON.stringify(w.review)
      : "the review reads " + JSON.stringify(reviewed) + " under " + JSON.stringify(w.employee));

  mark = d.mark();
  await press(d, d.say("Send"));
  await d.settle(200);
  await press(d, d.say("Send it"));
  await d.settle(700);
  const filed = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/forms/drafts/" + draftId + "/submit").pop() || null;
  await press(d, d.say("Done"));
  await d.settle(700);
  const opened = filed && filed.status === 200 ? await clickRowWith(d, w.title) : false;
  await d.settle(700);
  const filedRead = opened && (await d.modalOpen()) ? await answerIn(d, w.employee) : null;
  results.check("window", "window/forms/person-question/the-filed-report-reads-the-name" + tail,
    !!filed && filed.status === 200 && opened && filedRead === PICKED.name,
    !filed ? "the form could not be sent" : filed.status !== 200 ? "Send was answered " + filed.status
      : !opened ? "Filed forms lists no " + JSON.stringify(w.title) : "the report's window reads " + JSON.stringify(filedRead) + " under " + JSON.stringify(w.employee));
  await d.closeModal();

  stubs.reset();
  results.note("Reports about a person in " + lang + ": the folder, HR Files, View PDF, a void report's mark, and the person picker");
}

module.exports = { run };
