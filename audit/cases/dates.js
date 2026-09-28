// Dates: a day is read from its parts, never through UTC, Step 181 (a8ae3c7), in English and in
// Spanish at 1280.
//
// A DATE the API sends names a day. Since this build one parser, localDate, builds that day from the
// first ten characters of what the API sent, and fdDay and fdLong draw it, so it is the day sent in
// every time zone. toISO builds a day from the clock's local parts, so today is the day where the
// person is. The audit's clock is 9:30 PM in New York on March 17, which is 1:30 AM on March 18 in
// UTC: a day read through UTC is the evening before, and a today read through UTC is March 18. The
// suite reads these spots of the build's list, in both languages, and holds each to the day the API
// sent, or to March 17:
//   due dates: every card on Assigned Tasks, the day and time in its Task Detail window, and the
//     assigned task on the first site's Service Details;
//   contract dates: the first site's Contract Dates on General Info, each vendor's Reviewed line, a
//     vendor's evaluation and the approved vendor list's Last Review Date;
//   shift dates: the first site's upcoming shifts on Shifts & Schedule;
//   the hire date on a person's HR folder, and the folder's training and onboarding lines, which
//     carry the day and no clock;
//   expiry dates: a Jotform filing's Expiry in the Inbox and in its window, and a certification's on
//     Staff Management, which read the day from its parts before this build as well;
//   weekly buckets: the issue report's two trend charts and its printed trend tables, and the months
//     of Shift Pickup's Monthly Totals, which read Invalid Date before;
//   every today: Live Operations' day, the week's today column on Schedule, the day Schedule Shift
//     opens on, the days Convert Callout reads, the last 30 days on Shift Pickup and on the issue
//     report, and the day in the names of a person's and a site's timeline files, the approved vendor
//     list and the service catalog.
// The stub serves a site's assigned task with its due date, the folder's training and onboarding days
// at midnight UTC the way routes/hr.js sends them, and the months of Monthly Totals as the DATE the
// API's driver sends. The words and the days are written out here by hand, so a wrong entry in the
// table, or a day read through UTC, is red.
"use strict";
const { parseCsv, htmlTables } = require("./exports");

const WORDS = {
  en: {
    due: "Due: ", dueDate: "Due Date", contractDates: "Contract Dates", upcoming: "Upcoming Shifts (Next 7 Days)",
    reviewed: "Reviewed ", hired: "Hired ", expiry: "Expiry", exp: "Exp: ", schedulingFor: "Scheduling for ",
    monthly: "Monthly Totals", trend: "Resolution and response trend", slaTrend: "SLA compliance trend", period: "Period",
  },
  es: {
    due: "Vence: ", dueDate: "Fecha l\u00edmite", contractDates: "Fechas del contrato", upcoming: "Pr\u00f3ximos turnos (siguientes 7 d\u00edas)",
    reviewed: "Revisado el ", hired: "Contrataci\u00f3n: ", expiry: "Vencimiento", exp: "Vence: ", schedulingFor: "Programando para ",
    monthly: "Totales del mes", trend: "Tendencia de resoluci\u00f3n y respuesta", slaTrend: "Tendencia del cumplimiento del SLA", period: "Periodo",
  },
};

// Each day as the screen draws it, by hand: the day the API sent, or March 17 where it is today.
// hand: the three assigned tasks are due March 18, 17 and 20 (seed.shift(1), (0) and (3)), the first at
// 22:00; the first site's contract runs February 10, 2025 to February 10, 2027, which fdDay draws
// without the year; its upcoming shifts are March 17 and 19; the vendors were reviewed February 5 and
// December 17, and evaluated February 15; Tomasz Wisniewski was hired March 26, 2025, took his training
// December 15, 2025, and finished three onboarding steps February 25, 26 and 27; the filing expires June
// 15 and the certification May 16, 2026; the weekly buckets start February 17, 24 and March 3; the
// months are February and March; the last 30 days end March 17 and start February 16.
const DAYS = {
  en: {
    tasks: ["Mar 18", "Mar 17", "Mar 20"], taskDetail: "Mar 18 10:00 PM", siteTask: ["Mar 18"],
    contract: "Feb 10 to Feb 10", upcoming: ["Mar 17", "Mar 19"], reviewed: ["Feb 5", "Dec 17"], evaluation: ["Feb 15"],
    hired: "Mar 26, 2025", folder: ["Dec 15, 2025", "Feb 25, 2026", "Feb 26, 2026", "Feb 27, 2026"],
    expiry: "Jun 15, 2026", cert: ["May 16, 2026"], buckets: ["Feb 17", "Feb 24", "Mar 3"], months: ["Feb", "Mar"],
    range: "Feb 16 - Mar 17, 2026", scheduling: "Mar 17",
  },
  es: {
    tasks: ["18 mar", "17 mar", "20 mar"], taskDetail: "18 mar 10:00 p.m.", siteTask: ["18 mar"],
    contract: "10 feb a 10 feb", upcoming: ["17 mar", "19 mar"], reviewed: ["5 feb", "17 dic"], evaluation: ["15 feb"],
    hired: "26 mar 2025", folder: ["15 dic 2025", "25 feb 2026", "26 feb 2026", "27 feb 2026"],
    expiry: "15 jun 2026", cert: ["16 may 2026"], buckets: ["17 feb", "24 feb", "3 mar"], months: ["feb", "mar"],
    range: "16 feb - 17 mar 2026", scheduling: "17 mar",
  },
};
// Today, and the days around it the dashboard asks the API for: the last 30 days start February 16, and
// the next 30 days Convert Callout reads end April 16.
const TODAY = "2026-03-17";
const MONTH_BACK = "2026-02-16";
const MONTH_ON = "2026-04-16";
const ISSUE_REPORT = "Issue response and resolution";

const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";
const MODAL = "div[style*='z-index: 500']";
const clean = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const say = (v) => JSON.stringify(v);

// The value drawn with a label, in the open window or on the page: a label that is a div of its own
// with the value in the div after it, or a label written straight into a div that holds the value.
const labelled = (d, label, inModal) => d.page.evaluate(([l, m, sel]) => {
  const roots = Array.from(document.querySelectorAll(sel));
  const root = m ? roots.pop() : document.body;
  if (!root) return null;
  const tidy = (s) => String(s || "").replace(/\s+/g, " ").trim();
  for (const el of Array.from(root.querySelectorAll("div"))) {
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (el.children.length === 0 && own === l && el.nextElementSibling) return tidy(el.nextElementSibling.textContent);
    if (el.children.length > 0 && own === l && el.firstElementChild) return tidy(el.firstElementChild.textContent);
  }
  return null;
}, [label, !!inModal, MODAL]);

// What follows a word on every span of the page that starts with it, in the order they are drawn.
const spansAfter = (d, prefix) => d.page.evaluate(([p, sel]) => {
  const root = document.querySelector(sel) || document.body;
  return Array.from(root.querySelectorAll("span")).map((s) => String(s.textContent || "").replace(/\s+/g, " ").trim())
    .filter((x) => x.indexOf(p) === 0).map((x) => x.slice(p.length));
}, [prefix, CONTENT]);

// What follows a word in every part of a line the page writes as parts joined by a bar.
const partsAfter = async (d, prefix) => {
  const text = await d.bodyText();
  const out = [];
  text.split("\n").forEach((line) => line.split(" | ").forEach((part) => {
    const p = clean(part);
    if (p.indexOf(clean(prefix) + " ") === 0) out.push(p.slice(clean(prefix).length + 1));
  }));
  return out;
};

// The rows under a card's title: the first two lines of each, a name and a day.
const rowsUnder = (d, title) => d.page.evaluate((ti) => {
  const head = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && String(x.textContent || "").trim() === ti);
  if (!head || !head.parentElement) return null;
  return Array.from(head.parentElement.children).slice(1).map((row) => {
    const left = row.firstElementChild;
    const parts = left ? Array.from(left.children).map((c) => String(c.textContent || "").replace(/\s+/g, " ").trim()) : [];
    return { name: parts[0] || "", day: parts[1] || "" };
  });
}, title);

// Each vendor's Reviewed line, by the vendor's name on the list.
const reviewLines = (d, prefix, names) => d.page.evaluate(([p, ns]) => ns.map((n) => {
  const row = Array.from(document.querySelectorAll("table tbody tr")).find((r) => String(r.textContent || "").indexOf(n) >= 0);
  const line = row ? Array.from(row.querySelectorAll("div")).map((x) => String(x.textContent || "").replace(/\s+/g, " ").trim()).find((x) => x.indexOf(p) === 0) : null;
  return line ? line.slice(p.length) : null;
}), [prefix, names]);

// The day beside each evaluation's stars in the open window.
const evaluationDays = (d) => d.page.evaluate((sel) => {
  const box = Array.from(document.querySelectorAll(sel)).pop();
  if (!box) return null;
  return Array.from(box.querySelectorAll("span")).filter((s) => /^[\u2605\u2606]+$/.test(String(s.textContent || "").trim()))
    .map((s) => (s.nextElementSibling ? String(s.nextElementSibling.textContent || "").replace(/\s+/g, " ").trim() : ""));
}, MODAL);

// The line under a person's name on their folder, as it is written, before any capital is drawn on it.
const bannerLine = (d) => d.page.evaluate(() => {
  const span = document.querySelector("span[style*='text-transform: capitalize']");
  return span ? Array.from(span.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("") : null;
});

// The day drawn at the right of each folder row, by the row's title.
const folderDays = (d, titles) => d.page.evaluate((ts) => ts.map((ti) => {
  const el = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && String(x.textContent || "").trim() === ti);
  const row = el && el.parentElement ? el.parentElement.parentElement : null;
  const when = row ? Array.from(row.children).find((c) => String(c.getAttribute("style") || "").indexOf("white-space: nowrap") >= 0) : null;
  return when ? String(when.textContent || "").replace(/\s+/g, " ").trim() : null;
}), titles);

// One cell of a table, by the words of its column's head and a text in its row.
const cellOf = (d, head, rowText) => d.page.evaluate(([h, r]) => {
  const table = Array.from(document.querySelectorAll("table")).find((t) => Array.from(t.querySelectorAll("thead th")).some((th) => String(th.textContent || "").trim() === h));
  if (!table) return null;
  const at = Array.from(table.querySelectorAll("thead th")).findIndex((th) => String(th.textContent || "").trim() === h);
  const row = Array.from(table.querySelectorAll("tbody tr")).find((tr) => String(tr.textContent || "").indexOf(r) >= 0);
  const cell = row ? row.querySelectorAll("td")[at] : null;
  return cell ? String(cell.textContent || "").replace(/\s+/g, " ").trim() : null;
}, [head, rowText]);

// Presses the last button in the table row that holds a text.
const pressInRow = async (d, rowText) => {
  const pressed = await d.page.evaluate((r) => {
    const row = Array.from(document.querySelectorAll("table tbody tr")).find((tr) => String(tr.textContent || "").indexOf(r) >= 0);
    const b = row ? Array.from(row.querySelectorAll("button")).pop() : null;
    if (!b) return false;
    b.click();
    return true;
  }, rowText);
  await d.settle(500);
  return pressed;
};

// The labels along the bottom of the chart under a card's title.
const axisOf = (d, title) => d.page.evaluate((ti) => {
  let card = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && String(x.textContent || "").trim() === ti);
  while (card && !card.querySelector(".apexcharts-canvas")) card = card.parentElement;
  if (!card) return null;
  return Array.from(card.querySelectorAll(".apexcharts-xaxis-label")).map((t) => {
    const title = t.querySelector("title");
    return String((title ? title.textContent : t.textContent) || "").replace(/\s+/g, " ").trim();
  });
}, title);

// The month under each bar of Monthly Totals.
const monthLabels = (d, title) => d.page.evaluate((ti) => {
  const head = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && String(x.textContent || "").trim() === ti);
  const bars = head ? head.nextElementSibling : null;
  return bars ? Array.from(bars.children).map((col) => (col.lastElementChild ? String(col.lastElementChild.textContent || "").trim() : "")) : null;
}, title);

// The week's head on Schedule: each day's words and whether it is drawn as today.
const weekHead = (d) => d.page.evaluate(() => {
  const row = document.querySelector("div[style*='grid-template-columns: 140px repeat(7, 1fr)']");
  if (!row) return null;
  return Array.from(row.children).slice(1).map((c) => ({
    day: c.lastElementChild ? String(c.lastElementChild.textContent || "").trim() : "",
    today: String(c.style.background || c.style.backgroundColor || "transparent") !== "transparent",
  }));
});

// The range a date picker on the page says it shows.
const rangeLabel = (d) => d.page.evaluate((sel) => {
  const root = document.querySelector(sel) || document.body;
  const el = Array.from(root.querySelectorAll("div[style*='min-width: 160px']")).find((x) => String(x.textContent || "").indexOf("\u25be") >= 0);
  return el ? String(el.textContent || "").replace("\u25be", "").replace(/\s+/g, " ").trim() : null;
}, CONTENT);

// The file a press handed over, the last one.
const handed = async (d) => { const files = await d.downloads(); return files.length ? files[files.length - 1] : null; };
const namedForToday = (file, tailName) => !!file && String(file.name || "").slice(-tailName.length) === tailName;

// A read's start and end days.
const rangeOf = (call) => { const p = new URLSearchParams(call ? call.query : ""); return { start: p.get("start_date"), end: p.get("end_date") }; };

async function run({ d, results, seed, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const day = DAYS[lang] || DAYS.en;
  const tail = "/" + lang;
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");

  // ---- Assigned Tasks: each card's due date, and the Task Detail window's day and time
  await d.goto("assigned");
  await d.settle(400);
  const tasks = stubs.fixtures.ASSIGNED_TASKS;
  const dues = await spansAfter(d, w.due);
  results.check("page", "page/assigned/due-dates-are-the-days-sent" + tail, same(dues, day.tasks),
    "the cards read " + say(dues.map((x) => w.due + x)) + " where the API sent " + say(tasks.map((t) => t.due_date)) + ", which reads " + say(day.tasks.map((x) => w.due + x)));
  let detail = null;
  if (dues.length) {
    await d.page.locator(CONTENT).first().locator("span", { hasText: w.due }).first().click({ timeout: 8000 }).catch(() => {});
    await d.settle(500);
    detail = await labelled(d, w.dueDate, true);
  }
  results.check("window", "window/assigned/due-date-and-time-are-the-ones-sent" + tail, detail === day.taskDetail,
    detail === null ? "the Task Detail window did not open, or drew no " + say(w.dueDate)
      : "the window reads " + say(detail) + " where the API sent " + tasks[0].due_date + " at " + tasks[0].due_time + ", which reads " + say(day.taskDetail));
  await d.closeModal();

  // ---- Sites: the first site's contract dates, its assigned task's due date, its upcoming shifts and
  // the name of its timeline file
  await d.goto("sites");
  await d.clickRow(0);
  await d.settle(500);
  const profileRead = stubs.calls.filter((c) => /^\/api\/sites\/profile\/[^/]+$/.test(c.path) && c.json && c.json.site).pop();
  const site = profileRead ? profileRead.json.site : {};
  const contract = await labelled(d, w.contractDates, false);
  results.check("page", "page/sites/contract-dates-are-the-days-sent" + tail, contract === day.contract,
    contract === null ? "the site drew no " + say(w.contractDates) : "the site's contract reads " + say(contract) + " where the API sent "
      + site.contract_start_date + " and " + site.contract_end_date + ", which reads " + say(day.contract));
  await d.clickText(d.say("Service Details"), { exact: true }).catch(() => false);
  await d.settle(500);
  const siteDue = await partsAfter(d, w.due);
  const siteTask = tasks.find((t) => t.site_id === (site.id || "s-1")) || tasks[0];
  results.check("page", "page/sites/task-due-date-is-the-day-sent" + tail, same(siteDue, day.siteTask),
    "Service Details reads " + say(siteDue.map((x) => w.due + x)) + " where the API sent " + siteTask.due_date + " for " + say(siteTask.label) + ", which reads " + say(day.siteTask.map((x) => w.due + x)));
  await d.clickText(d.say("Shifts & Schedule"), { exact: true }).catch(() => false);
  await d.settle(400);
  const upcoming = (await rowsUnder(d, w.upcoming)) || [];
  const shiftsSent = profileRead ? profileRead.json.upcomingShifts : [];
  const upcomingDays = upcoming.map((r) => r.day);
  results.check("page", "page/sites/upcoming-shifts-are-the-days-sent" + tail, same(upcomingDays, day.upcoming) && upcoming.length === shiftsSent.length,
    upcoming.length === 0 ? "the site drew no " + say(w.upcoming) : "the upcoming shifts read " + say(upcoming.map((r) => r.name + ", " + r.day))
      + " where the API sent " + say(shiftsSent.map((s) => s.scheduled_date)) + ", which reads " + say(day.upcoming));
  await d.clickText(d.say("Timeline"), { exact: true }).catch(() => false);
  await d.settle(500);
  await d.clearCaptures();
  await d.clickText(d.say("Export CSV"), { exact: false }).catch(() => false);
  await d.settle(300);
  const siteFile = await handed(d);
  results.check("export", "export/sites/timeline-file-is-named-for-today" + tail, namedForToday(siteFile, "_Timeline_" + TODAY + ".csv"),
    !siteFile ? "Export CSV on the site's timeline handed over no file" : "the file is named " + say(siteFile.name) + " where today is " + TODAY);

  // ---- Vendor Registry: each vendor's Reviewed line, the approved vendor list and an evaluation
  await d.goto("vendors");
  await d.settle(400);
  const reviewedVendors = stubs.fixtures.VENDORS.filter((v) => v.last_review_date);
  const reviewed = await reviewLines(d, w.reviewed, reviewedVendors.map((v) => v.name));
  results.check("page", "page/vendors/review-dates-are-the-days-sent" + tail, same(reviewed, day.reviewed),
    "the list reads " + say(reviewed.map((x) => (x === null ? null : w.reviewed + x))) + " where the API sent " + say(reviewedVendors.map((v) => v.last_review_date))
      + ", which reads " + say(day.reviewed.map((x) => w.reviewed + x)));
  await d.clearCaptures();
  await d.clickText(d.say("Export AVL"), { exact: false }).catch(() => false);
  await d.settle(300);
  const avl = await handed(d);
  const avlRows = avl ? parseCsv(avl.body) : [];
  const reviewCol = avlRows.length ? avlRows[0].indexOf("Last Review Date") : -1;
  const avlDays = reviewedVendors.map((v) => { const r = avlRows.find((x) => x[0] === v.name); return r && reviewCol >= 0 ? r[reviewCol] : null; });
  const avlNamed = namedForToday(avl, "OCSA_Approved_Vendor_List_" + TODAY + ".csv");
  const avlWrong = [];
  if (avl && !avlNamed) avlWrong.push("the file is named " + say(avl.name) + " where today is " + TODAY);
  if (avl && !same(avlDays, day.reviewed)) avlWrong.push("Last Review Date reads " + say(avlDays) + " where the API sent " + say(reviewedVendors.map((v) => v.last_review_date)) + ", which reads " + say(day.reviewed));
  results.check("export", "export/vendors/approved-list-is-named-for-today-and-holds-the-days-sent" + tail, !!avl && avlWrong.length === 0,
    !avl ? "Export AVL handed over no file" : avlWrong.join("; "));
  await d.clickRow(0);
  await d.settle(500);
  const vendorRead = stubs.calls.filter((c) => /^\/api\/vendors\/[^/]+$/.test(c.path) && c.method === "GET" && c.json && c.json.evaluations).pop();
  const evalDays = await evaluationDays(d);
  results.check("window", "window/vendors/evaluation-date-is-the-day-sent" + tail, same(evalDays, day.evaluation),
    evalDays === null ? "the vendor's window did not open" : "the evaluations read " + say(evalDays) + " where the API sent "
      + say(vendorRead ? vendorRead.json.evaluations.map((e) => e.evaluation_date) : []) + ", which reads " + say(day.evaluation));
  await d.closeModal();

  // ---- Service Catalog: the day in the export's name
  await d.goto("services");
  await d.settle(300);
  await d.clearCaptures();
  await d.clickText(d.say("Export"), { exact: true }).catch(() => false);
  await d.settle(300);
  const catalog = await handed(d);
  results.check("export", "export/services/catalog-file-is-named-for-today" + tail, namedForToday(catalog, "OCSA_Service_Catalog_" + TODAY + ".csv"),
    !catalog ? "Export on the Service Catalog handed over no file" : "the file is named " + say(catalog.name) + " where today is " + TODAY);

  // ---- HR Records: a person's folder, its hire date and its training and onboarding days
  const person = seed.STAFF[4];
  await d.goto("hr");
  await d.page.getByText(person.name, { exact: true }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await d.clickText(person.name, { exact: true }).catch(() => false);
  await d.settle(600);
  const folderRead = stubs.calls.filter((c) => c.path === "/api/hr/employee-folder/" + person.id && c.json && c.json.items).pop();
  const line = await bannerLine(d);
  const hiredPart = line ? line.split(" . ").map(clean).find((x) => x.indexOf(clean(w.hired)) === 0) : null;
  const hired = hiredPart ? hiredPart.slice(w.hired.length) : null;
  results.check("page", "page/hr/folder-hire-date-is-the-day-sent" + tail, hired === day.hired,
    line === null ? "the folder of " + person.name + " did not open" : "the folder reads " + say(hiredPart) + " where the API sent "
      + (folderRead ? folderRead.json.employee.hire_date : person.hire_date) + ", which reads " + say(w.hired + day.hired));
  const items = folderRead ? folderRead.json.items.filter((it) => (it.source === "training" || it.source === "onboarding") && it.date) : [];
  const drawn = await folderDays(d, items.map((it) => it.title));
  results.check("page", "page/hr/folder-training-and-onboarding-carry-the-day-and-no-clock" + tail, items.length === day.folder.length && same(drawn, day.folder),
    items.length !== day.folder.length ? "the folder was served " + items.length + " dated training and onboarding rows where the stub holds " + day.folder.length
      : "the rows " + say(items.map((it) => it.title)) + " read " + say(drawn) + " where the API sent " + say(items.map((it) => it.date)) + ", which reads " + say(day.folder));

  // ---- Forms, Jotform Inbox: a filing's expiry on its row and in its window
  const filing = stubs.fixtures.JOTFORM_SUBMISSIONS.find((x) => x.expiry_date);
  await d.goto("forms");
  await d.clickText(d.say("Jotform"), { exact: true }).catch(() => false);
  await d.clickText(d.say("Inbox"), { exact: true }).catch(() => false);
  await d.settle(500);
  const expiryCell = await cellOf(d, w.expiry, filing.form_title);
  results.check("page", "page/forms/jotform-expiry-is-the-day-sent" + tail, expiryCell === day.expiry,
    expiryCell === null ? "the Inbox drew no " + say(w.expiry) + " for " + say(filing.form_title) : "the row reads " + say(expiryCell) + " where the API sent " + filing.expiry_date
      + ", which reads " + say(day.expiry));
  const opened = await pressInRow(d, filing.form_title);
  const expiryShown = opened ? await labelled(d, w.expiry, true) : null;
  results.check("window", "window/forms/jotform-expiry-is-the-day-sent" + tail, expiryShown === day.expiry,
    expiryShown === null ? "the filing's window did not open, or drew no " + say(w.expiry) : "the window reads " + say(expiryShown) + " where the API sent "
      + filing.expiry_date + ", which reads " + say(day.expiry));
  await d.closeModal();

  // ---- Staff Management: a certification's expiry, and the name of the person's timeline file
  await d.goto("staff");
  await d.clickRow(0);
  await d.settle(500);
  const staffRead = stubs.calls.filter((c) => /^\/api\/users\/profile\/[^/]+$/.test(c.path) && c.json && c.json.certifications).pop();
  await d.clickText(d.say("Certifications"), { exact: true }).catch(() => false);
  await d.settle(300);
  const certDays = await partsAfter(d, w.exp);
  results.check("page", "page/staff/certification-expiry-is-the-day-sent" + tail, same(certDays, day.cert),
    "the certifications read " + say(certDays.map((x) => w.exp + x)) + " where the API sent " + say(staffRead ? staffRead.json.certifications.map((c) => c.expiry_date) : [])
      + ", which reads " + say(day.cert.map((x) => w.exp + x)));
  await d.clickText(d.say("Timeline"), { exact: true }).catch(() => false);
  await d.settle(500);
  await d.clearCaptures();
  await d.clickText(d.say("Export CSV"), { exact: false }).catch(() => false);
  await d.settle(300);
  const staffFile = await handed(d);
  results.check("export", "export/staff/timeline-file-is-named-for-today" + tail, namedForToday(staffFile, "_Timeline_" + TODAY + ".csv"),
    !staffFile ? "Export CSV on the person's timeline handed over no file" : "the file is named " + say(staffFile.name) + " where today is " + TODAY);

  // ---- Reports: the issue report's last 30 days, its weekly buckets on the charts and on the print
  await d.goto("reports");
  let mark = d.mark();
  const ran = await d.clickRunFor(ISSUE_REPORT);
  await d.settle(900);
  const timingRead = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/report-engine/issue-timing").pop();
  const reportRange = rangeOf(timingRead);
  results.check("page", "page/reports/last-30-days-end-today" + tail, reportRange.start === MONTH_BACK && reportRange.end === TODAY,
    !timingRead ? "the report " + say(ISSUE_REPORT) + " did not run" : "the report asked for " + reportRange.start + " to " + reportRange.end
      + " where the last 30 days run " + MONTH_BACK + " to " + TODAY);
  await d.page.locator(CONTENT + " .apexcharts-xaxis-label").first().waitFor({ timeout: 8000 }).catch(() => {});
  await d.settle(400);
  const trendAxis = await axisOf(d, w.trend);
  const slaAxis = await axisOf(d, w.slaTrend);
  const buckets = timingRead && timingRead.json && timingRead.json.trend ? timingRead.json.trend.map((b) => b.bucket_start) : [];
  results.check("page", "page/reports/weekly-buckets-are-the-days-sent" + tail, !!ran && same(trendAxis, day.buckets) && same(slaAxis, day.buckets),
    !ran ? "the report " + say(ISSUE_REPORT) + " would not run from the library"
      : say(w.trend) + " reads " + say(trendAxis) + " and " + say(w.slaTrend) + " reads " + say(slaAxis) + " where the API sent "
        + say(buckets) + ", which reads " + say(day.buckets));
  await d.clearCaptures();
  await d.clickText(d.say("Export PDF"), { exact: false }).catch(() => false);
  await d.settle(900);
  const prints = await d.prints();
  const html = prints.length ? prints[prints.length - 1].html : "";
  const periodTables = htmlTables(html).filter((t) => t.headers[0] === w.period);
  const printed = periodTables.map((t) => t.rows.map((r) => clean(r[0])));
  results.check("export", "export/reports/printed-weekly-buckets-are-the-days-sent" + tail, printed.length === 2 && printed.every((col) => same(col, day.buckets)),
    !html ? "Export PDF opened no print" : printed.length !== 2 ? "the print holds " + printed.length + " tables headed " + say(w.period) + " where the report's trend and service level tables are 2"
      : "the printed periods read " + say(printed) + " where the API sent " + say(buckets) + ", which reads " + say(day.buckets));

  // ---- Live Operations: the day it reads is today
  mark = d.mark();
  await d.goto("operations");
  await d.settle(400);
  const opsRead = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/shift-sessions/by-site").pop();
  const opsAsked = new URLSearchParams(opsRead ? opsRead.query : "").get("date");
  const opsField = await d.page.locator(CONTENT).first().locator("input[type=date]").first().inputValue({ timeout: 4000 }).catch(() => null);
  results.check("page", "page/operations/the-day-is-today" + tail, opsAsked === TODAY && opsField === TODAY,
    !opsRead ? "Live Operations read nothing" : "Live Operations asked for " + opsAsked + " and its Date field holds " + opsField + " where today is " + TODAY);

  // ---- Schedule: the week's today column, and the day Schedule Shift opens on
  await d.goto("schedule");
  await d.settle(500);
  const head = await weekHead(d);
  const marked = head ? head.filter((c) => c.today).map((c) => c.day) : [];
  results.check("page", "page/schedule/the-week-marks-today" + tail, same(marked, ["17"]),
    !head ? "the week drew no head" : "the week marks " + (marked.length ? "the day " + marked.join(" and ") : "no day") + " as today where today is March 17");
  const scheduleOpened = await d.clickText(d.say("Schedule Shift"), { exact: false }).catch(() => false);
  const forLine = scheduleOpened ? (await d.modalText()).split("\n").map(clean).find((x) => x.indexOf(clean(w.schedulingFor)) === 0) : null;
  const scheduledFor = forLine ? forLine.slice(w.schedulingFor.length) : null;
  results.check("window", "window/schedule/schedule-shift-opens-on-today" + tail, scheduledFor === day.scheduling,
    !scheduleOpened ? "Schedule Shift did not open" : "the window reads " + say(forLine) + " where today, March 17, reads " + say(w.schedulingFor + day.scheduling));
  await d.closeModal();

  // ---- Shift Pickup: the last 30 days, the days Convert Callout reads, and the months of Monthly Totals
  mark = d.mark();
  await d.goto("marketplace");
  await d.settle(500);
  const listRead = d.callsSince(mark).find((c) => c.method === "GET" && c.path === "/api/pickups" && /start_date=/.test(c.query));
  const listRange = rangeOf(listRead);
  const picker = await rangeLabel(d);
  results.check("page", "page/marketplace/last-30-days-end-today" + tail, listRange.start === MONTH_BACK && listRange.end === TODAY && picker === day.range,
    !listRead ? "Shift Pickup read no shifts in a range" : "Shift Pickup asked for " + listRange.start + " to " + listRange.end + " and its range reads " + say(picker)
      + " where the last 30 days run " + MONTH_BACK + " to " + TODAY + ", which reads " + say(day.range));
  mark = d.mark();
  const converting = await d.clickText(d.say("Convert Callout"), { exact: false }).catch(() => false);
  await d.settle(400);
  const convertRead = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/schedule").pop();
  const convertRange = rangeOf(convertRead);
  results.check("window", "window/marketplace/convert-callout-reads-from-today" + tail, convertRange.start === TODAY && convertRange.end === MONTH_ON,
    !converting ? "Convert Callout did not open" : !convertRead ? "the window read no schedule"
      : "the window asked for " + convertRange.start + " to " + convertRange.end + " where the next 30 days run " + TODAY + " to " + MONTH_ON);
  await d.closeModal();
  await d.clickText(d.say("Analytics"), { exact: true }).catch(() => false);
  await d.settle(500);
  await d.clickText(d.say("Callout Patterns"), { exact: true }).catch(() => false);
  await d.settle(400);
  const patternsRead = stubs.calls.filter((c) => c.path === "/api/pickups/analytics/patterns" && c.json && c.json.by_month).pop();
  const months = await monthLabels(d, w.monthly);
  results.check("page", "page/marketplace/monthly-totals-name-their-months" + tail, same(months, day.months),
    months === null ? "the Callout Patterns tab drew no " + say(w.monthly) : "the months read " + say(months) + " where the API sent "
      + say(patternsRead ? patternsRead.json.by_month.map((m) => m.month_start) : []) + ", which reads " + say(day.months));

  stubs.reset();
  results.note("Dates in " + lang + ": due dates, contract and review dates, the hire date and the folder's days, expiry dates, weekly buckets, the months and every today, at 9:30 PM in New York on March 17");
}

module.exports = { run };
