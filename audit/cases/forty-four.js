// Forty-four pixels, everywhere, Step 181 (c09f43e), on a phone, 390 by 844, in English and in Spanish.
//
// Every button is at least 44 by 44 and every select, text area and text input at least 44 tall,
// through one rule in the stylesheet and minHeight in the primitives. Every close X is 44 by 44 and
// named Close. The floor plan View, the file, the website and the Open in Jotform links are 44 tall,
// and since 4106371 the floor plan's View is 44 wide as well. A checkbox that stood in a div sits
// inside a 44 by 44 label. Schedule's shift, started, open, drop request, claim and inspection chips are
// buttons, and under 700 pixels the week is a stacked list of days. The suite reads every page an admin
// opens and holds every button on it to 44 by 44 and every input, select and text area to 44 tall,
// with half a pixel for rounding; holds the four links to 44 by 44; opens a sample of windows the way
// audit/cases/windows.js opens them and holds each close X to 44 by 44 and to the word Close in the
// screen's language; holds the six checkboxes to a label 44 by 44; and holds Schedule's week to seven
// blocks, one per day in order, with every chip in it a button. What the build left as it was is not
// held: the month view's day cells, the week grid's empty day cell, and the two stacked move arrows on
// Dropdown Options. The words are written out here by hand, so a wrong entry in the table turns the
// case red.
"use strict";

const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";
const WINDOW = "div[style*='z-index: 500']";
// The two stacked move arrows on Dropdown Options, left as they were.
const ARROWS = ["\u25b2", "\u25bc"];
// The path of the X icon every window's close button draws.
const X_PATH = "M18 6L6 18M6 6l12 12";

const WORDS = {
  en: { close: "Close", view: "View", viewFile: "View file", viewSite: "View Site", jotform: "Open in Jotform",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], started: "Started", open: "OPEN", dropReq: "DROP REQ", claimed: "CLAIMED" },
  es: { close: "Cerrar", view: "Ver", viewFile: "Ver el archivo", viewSite: "Ver el sitio web", jotform: "Abrir en Jotform",
    days: ["Lun", "Mar", "Mi\u00e9", "Jue", "Vie", "S\u00e1b", "Dom"], started: "Iniciado", open: "ABIERTO", dropReq: "SOL. DE BAJA", claimed: "TOMADO" },
};

// The clock's today is Tuesday, March 17, so Schedule opens on the week of Monday the 16th to Sunday
// the 22nd.
const WEEK = ["2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22"];

// Every chip the stub's week draws, by day, worked out by hand from audit/stubs.js: SCHEDULE's four
// shifts, the four sessions SHIFT_SESSIONS started on the 17th, PICKUPS' drop request on the 18th, open
// shift on the 19th and claim on the 20th, and SCHEDULED_INSPECTIONS' walk on the 21st. The dock check
// on the 23rd and the approved pickup on the 14th fall outside the week. A chip is known by the words
// it starts with and a word further in. hand: 4 shifts + 4 starts + 3 pickups + 1 inspection = 12.
const chipsFor = (w) => [
  { day: WEEK[1], what: "the 18:00 shift on the 17th", starts: "18:00-02:00", has: "North Wing" },
  { day: WEEK[1], what: "the 06:00 shift on the 17th", starts: "06:00-14:00", has: "Clinic" },
  { day: WEEK[1], what: "the start in North Wing on the 17th", starts: w.started + " ", has: "North Wing" },
  { day: WEEK[1], what: "the start in South Wing on the 17th", starts: w.started + " ", has: "South Wing" },
  { day: WEEK[1], what: "the start in the clinic on the 17th", starts: w.started + " ", has: "Clinic" },
  { day: WEEK[1], what: "the start at Dock A on the 17th", starts: w.started + " ", has: "Dock A" },
  { day: WEEK[2], what: "the 22:00 shift on the 18th", starts: "22:00-06:00", has: "Dock A" },
  { day: WEEK[2], what: "the drop request on the 18th", starts: "22:00-06:00", has: w.dropReq },
  { day: WEEK[3], what: "the 14:00 shift on the 19th", starts: "14:00-22:00", has: "South Wing" },
  { day: WEEK[3], what: "the open shift on the 19th", starts: "18:00-02:00", has: w.open },
  { day: WEEK[4], what: "the claim on the 20th", starts: "06:00-14:00", has: w.claimed },
  { day: WEEK[5], what: "the inspection on the 21st", starts: "Monthly quality walk", has: "Harbor Point Center" },
];

// The windows read, each opened the way audit/cases/windows.js opens it, pressing the words this pass
// draws. x holds the window's close X, box its checkbox, and link the link that reads that word.
const WINDOWS = [
  { id: "staff/add", x: true, open: async (d) => { await d.goto("staff"); return d.clickText(d.say("Add Staff"), { exact: true }); } },
  // The third entry of a person's timeline is a task resolved with a photo, whose address is the file.
  { id: "staff/timeline-detail", x: true, link: { word: "viewFile", check: "view-file-44" },
    open: async (d) => { await d.goto("staff"); await d.clickRow(0); await d.clickText(d.say("Timeline"), { exact: true }); return d.clickText("Restock clinic restrooms", { exact: false }); } },
  { id: "sites/add", x: true, open: async (d) => { await d.goto("sites"); return d.clickText(d.say("Add Site"), { exact: false }); } },
  { id: "sites/edit", x: true, open: async (d) => { await d.goto("sites"); await d.clickRow(0); return d.clickText(d.say("Edit Details"), { exact: false }); } },
  { id: "issues/detail", x: true, open: async (d) => { await d.goto("issues"); return d.clickText("Lobby floor scuffed after delivery", { exact: false }); } },
  { id: "supplies/add", x: true, box: true, open: async (d) => { await d.goto("supplies"); return d.clickText(d.say("Add Supply"), { exact: false }); } },
  { id: "supplies/edit", x: true, box: true, open: async (d) => { await d.goto("supplies"); return d.clickText("Neutral floor cleaner", { exact: false }); } },
  { id: "assigned/create", x: true, open: async (d) => { await d.goto("assigned"); return d.clickText(d.say("Create Task"), { exact: false }); } },
  { id: "vendors/detail", x: true, link: { word: "viewSite", check: "view-site-44" }, open: async (d) => { await d.goto("vendors"); return d.clickRow(0); } },
  { id: "vendors/link-supply", box: true, open: async (d) => { await d.goto("vendors"); await d.clickRow(0); return d.clickText(d.say("Link Supply"), { inModal: true, exact: false }); } },
  { id: "services/detail", x: true, open: async (d) => { await d.goto("services"); return d.clickText("Daily janitorial", { exact: false }); } },
  { id: "schedule/create-shift", x: true, open: async (d) => { await d.goto("schedule"); return d.clickText(d.say("Schedule Shift"), { exact: true }); } },
  { id: "marketplace/create", x: true, open: async (d) => { await d.goto("marketplace"); return d.clickText(d.say("Post Open Shift"), { exact: false }); } },
  { id: "inspections/new-template", x: true, open: async (d) => { await d.goto("inspections"); return d.clickText(d.say("New Template"), { exact: false }); } },
  { id: "forms/submission-detail", x: true, link: { word: "jotform", check: "open-in-jotform-44" },
    open: async (d) => { await d.goto("forms"); await d.clickText(d.say("Jotform"), { exact: true }); await d.clickText(d.say("Inbox"), { exact: true }); return d.clickText(d.say("View"), { exact: true }); } },
  { id: "cases/window", x: true, open: async (d) => { await d.goto("cases"); return d.clickRow(0); } },
  { id: "settings/add-value", box: true, open: async (d) => { await d.goto("settings"); await d.clickText(d.say("Dropdown Options"), { exact: true }); return d.clickText(d.say("+ Add Value"), { exact: true }); } },
  { id: "settings/edit-value", box: true, open: async (d) => { await d.goto("settings"); await d.clickText(d.say("Dropdown Options"), { exact: true }); return d.clickText(d.say("Edit"), { exact: true, nth: 1 }); } },
];

const size = (n) => String(Math.round(n * 10) / 10);

// Every control a finger presses on the screen as drawn, the bar included, counted, and each one drawn
// smaller than the build holds it to: a button under 44 by 44, and an input, a select or a text area
// under 44 tall, in the page's own pixels, with half a pixel for rounding. A checkbox or a radio is
// measured by the label that holds it, at 44 by 44. What is not drawn, has no size or cannot be seen is
// left out, and so are the two stacked move arrows.
const measure = (d) => d.page.evaluate((arrows) => {
  const root = document.body;
  const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
  const seen = (el) => {
    if (el.getClientRects().length === 0 || getComputedStyle(el).visibility === "hidden") return false;
    for (let p = el; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).opacity === "0") return false;
    return true;
  };
  const out = { buttons: 0, fields: 0, small: [] };
  root.querySelectorAll("button, input, select, textarea").forEach((el) => {
    if (el.closest("svg") || el.type === "hidden" || !seen(el)) return;
    const tag = el.tagName.toLowerCase();
    const words = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (tag === "button" && arrows.indexOf(words) >= 0) return;
    const tick = el.type === "checkbox" || el.type === "radio";
    const r = (tick ? (el.closest("label") || el) : el).getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const w = r.width / zoom;
    const h = r.height / zoom;
    if (tag === "button") out.buttons += 1; else out.fields += 1;
    if (h < 43.5 || ((tag === "button" || tick) && w < 43.5)) {
      const name = el.getAttribute("aria-label") || words.slice(0, 28) || el.getAttribute("placeholder") || el.getAttribute("title") || "";
      out.small.push(tag + (tag === "input" ? " " + el.type : "") + " " + JSON.stringify(name) + " " + (Math.round(w * 10) / 10) + " by " + (Math.round(h * 10) / 10));
    }
  });
  return out;
}, ARROWS);

// The link in the content area or the open window whose words are exactly these, and its size.
const linkBox = (d, word, inWindow) => d.page.evaluate(([sel, wd]) => {
  const root = Array.from(document.querySelectorAll(sel)).pop();
  if (!root) return null;
  const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
  const a = Array.from(root.querySelectorAll("a[href]")).find((x) => (x.textContent || "").replace(/\s+/g, " ").trim() === wd && x.getClientRects().length > 0);
  if (!a) return null;
  const r = a.getBoundingClientRect();
  return { w: r.width / zoom, h: r.height / zoom };
}, [inWindow ? WINDOW : CONTENT, word]);
const linkHolds = (b) => !!b && b.w >= 43.5 && b.h >= 43.5;
const linkLine = (word, b) => "the link reading " + JSON.stringify(word) + " is " + size(b.w) + " by " + size(b.h);

// The close X in the open window, the first button that draws the X icon and no words, with its name
// and its size.
const closeX = (d) => d.page.evaluate(([sel, path]) => {
  const box = Array.from(document.querySelectorAll(sel)).pop();
  if (!box) return null;
  const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
  const x = Array.from(box.querySelectorAll("button")).find((b) => {
    const p = b.querySelector("svg path");
    return p && p.getAttribute("d") === path && !(b.textContent || "").trim() && b.getClientRects().length > 0;
  });
  if (!x) return { found: false };
  const r = x.getBoundingClientRect();
  return { found: true, name: x.getAttribute("aria-label"), w: r.width / zoom, h: r.height / zoom };
}, [WINDOW, X_PATH]);

// Every checkbox drawn in the open window or on the content area, what stands around it, and the size
// of what a finger presses: the label that holds it, or the box alone when there is none.
const ticks = (d, inWindow) => d.page.evaluate((sel) => {
  const root = Array.from(document.querySelectorAll(sel)).pop();
  if (!root) return null;
  const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
  return Array.from(root.querySelectorAll("input[type=checkbox]")).filter((c) => c.getClientRects().length > 0).map((c) => {
    const label = c.closest("label");
    const r = (label || c).getBoundingClientRect();
    return { label: !!label, holder: c.parentElement ? c.parentElement.tagName.toLowerCase() : "", w: r.width / zoom, h: r.height / zoom };
  });
}, inWindow ? WINDOW : CONTENT);
const ticksHold = (list) => !!list && list.length > 0 && list.every((c) => c.label && c.w >= 43.5 && c.h >= 43.5);
const ticksLine = (list) => {
  if (!list || !list.length) return "no checkbox is drawn";
  const bad = list.find((c) => !(c.label && c.w >= 43.5 && c.h >= 43.5));
  if (!bad) return list.length + (list.length === 1 ? " checkbox sits" : " checkboxes sit") + " inside a label at least 44 by 44";
  return bad.label ? "a checkbox's label is " + size(bad.w) + " by " + size(bad.h)
    : "a checkbox stands in a " + bad.holder + " with no label around it, " + size(bad.w) + " by " + size(bad.h) + " on its own";
};

// Schedule's week as the screen draws it: each block that names a day, where it sits and what its
// heading says, and every seven-column grid drawn.
const weekShape = (d) => d.page.evaluate((area) => {
  const box = document.querySelector(area) || document.body;
  const blocks = Array.from(box.querySelectorAll("[data-week-day]")).filter((b) => b.getClientRects().length > 0).map((b) => {
    const r = b.getBoundingClientRect();
    const head = b.firstElementChild;
    return { day: b.getAttribute("data-week-day"), top: r.top, bottom: r.bottom, left: r.left, right: r.right,
      head: head ? (head.textContent || "").replace(/\s+/g, " ").trim() : "" };
  });
  const grids = Array.from(box.querySelectorAll("[style*='repeat(7']")).filter((g) => g.getClientRects().length > 0).map((g) => g.style.gridTemplateColumns);
  return { vw: document.documentElement.clientWidth, blocks, grids };
}, CONTENT);

// Each chip of the week, looked for in its day's block, or anywhere in the week when there is no
// block: the innermost element whose words start with the chip's and hold its word further in.
const chipsOf = (d, chips) => d.page.evaluate(([area, list]) => {
  const box = document.querySelector(area) || document.body;
  const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
  const words = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
  return list.map((c) => {
    const block = box.querySelector("[data-week-day='" + c.day + "']");
    const hits = Array.from((block || box).querySelectorAll("button, div")).filter((el) => el.getClientRects().length > 0
      && words(el).indexOf(c.starts) === 0 && words(el).indexOf(c.has) >= 0);
    const inner = hits.filter((h) => !hits.some((o) => o !== h && h.contains(o)));
    const el = inner[0];
    if (!el) return { what: c.what, found: false, block: !!block };
    const r = el.getBoundingClientRect();
    return { what: c.what, found: true, block: !!block, tag: el.tagName.toLowerCase(), w: r.width / zoom, h: r.height / zoom };
  });
}, [CONTENT, chips]);

async function run({ d, results, stubs, inventory, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");

  // ---- every page an admin opens: every button 44 by 44, every input, select and text area 44 tall
  let pages = 0;
  for (const p of inventory.PAGES) {
    const id = "page/" + p.id + "/controls-44" + tail;
    await d.goto(p.id);
    await d.settle(250);
    if (await d.crashed()) { results.fail("page", id, await d.crashDetail()); await d.recover("admin"); continue; }
    // The page is the one asked for when the bar names it, the way the pages suite tells, in the words
    // of the screen.
    const named = (await d.text()).indexOf(d.say(p.label)) >= 0;
    const len = await d.bodyLength();
    const m = await measure(d);
    pages += 1;
    results.check("page", id, named && len > 40 && !!m && m.buttons > 0 && m.small.length === 0,
      !named || len <= 40 || !m ? "the " + p.id + " page did not open: the bar reads " + JSON.stringify(await d.headerTitle()) + " and the body holds " + len + " characters"
        : m.small.length ? m.small.length + " controls under 44 on the " + p.id + " page: " + m.small.slice(0, 4).join(", ")
          : "the " + p.id + " page draws " + m.buttons + " buttons, each at least 44 by 44, and "
            + (m.fields ? m.fields + " inputs, selects and text areas, each at least 44 tall" : "no input, select or text area"));
  }

  // ---- Schedule's week: a list of seven days, one block per day in order, each chip a button
  await d.goto("schedule");
  await d.settle(500);
  const shape = await weekShape(d);
  const blocks = shape.blocks;
  const days = blocks.map((b) => b.day);
  const misnamed = blocks.filter((b, i) => WEEK[i] === b.day && b.head.indexOf(w.days[i] + " " + Number(b.day.slice(8))) !== 0);
  const unstacked = blocks.filter((b, i) => i > 0 && (b.top < blocks[i - 1].bottom - 1 || Math.abs(b.left - blocks[0].left) > 1));
  const wide = blocks.filter((b) => b.right > shape.vw + 1);
  results.check("page", "page/schedule/week-is-seven-days" + tail,
    blocks.length === 7 && days.join(",") === WEEK.join(",") && misnamed.length === 0 && unstacked.length === 0 && wide.length === 0 && shape.grids.length === 0,
    blocks.length === 0 ? "the week is drawn as a grid, " + (shape.grids[0] || "with no columns named") + ", with no list of days"
      : blocks.length !== 7 || days.join(",") !== WEEK.join(",") ? "the blocks name " + days.join(", ") + " where the week runs " + WEEK.join(", ")
        : misnamed.length ? "the block for " + misnamed[0].day + " is headed " + JSON.stringify(misnamed[0].head) + " where it should start "
          + JSON.stringify(w.days[WEEK.indexOf(misnamed[0].day)] + " " + Number(misnamed[0].day.slice(8)))
          : unstacked.length ? "the block for " + unstacked[0].day + " sits beside the block before it"
            : wide.length ? "the block for " + wide[0].day + " runs " + Math.round(wide[0].right - shape.vw) + " pixels past the side of a screen " + shape.vw + " wide"
              : shape.grids.length ? "a seven-column grid, " + shape.grids[0] + ", is still drawn beside the list"
                : "seven blocks, Monday the 16th to Sunday the 22nd, one under the other and inside the screen");
  const chips = await chipsOf(d, chipsFor(w));
  const wrong = chips.filter((c) => !(c.found && c.block && c.tag === "button" && c.w >= 43.5 && c.h >= 43.5));
  results.check("page", "page/schedule/week-chips-are-buttons" + tail, wrong.length === 0,
    wrong.length ? wrong.length + " of " + chips.length + " chips are not buttons 44 by 44 in their day: " + wrong.slice(0, 3).map((c) => !c.found
      ? c.what + " is not drawn" + (c.block ? " in its day's block" : "")
      : c.what + " is a " + c.tag + " " + size(c.w) + " by " + size(c.h) + (c.block ? "" : " in a week with no block for its day")).join("; ")
      : "the " + chips.length + " chips, four shifts, four starts, an open shift, a drop request, a claim and an inspection, are buttons at least 44 by 44 in their days");

  // ---- the floor plan's View on the first site's General Info
  await d.goto("sites");
  await d.clickRow(0);
  await d.clickText(d.say("General Info"), { exact: false });
  await d.settle(300);
  const plan = await linkBox(d, w.view, false);
  results.check("page", "page/sites/floor-plan-view-44" + tail, linkHolds(plan),
    !plan ? "no link reading " + JSON.stringify(w.view) + " under the floor plans on the first site's General Info" : linkLine(w.view, plan));

  // ---- the windows: each X, each checkbox, and the file, the website and Open in Jotform
  let xs = 0;
  for (const win of WINDOWS) {
    let opened = false;
    try { opened = await win.open(d); } catch (e) { opened = false; }
    if (await d.crashed()) {
      const why = await d.crashDetail();
      if (win.x) results.fail("window", "window/" + win.id + "/close-x" + tail, why);
      if (win.box) results.fail("window", "window/" + win.id + "/checkbox-in-a-44-label" + tail, why);
      if (win.link) results.fail("window", "window/" + win.id + "/" + win.link.check + tail, why);
      await d.recover("admin");
      continue;
    }
    await d.settle(250);
    const onScreen = opened && (await d.modalOpen());
    const title = onScreen ? (await d.modalText()).split("\n")[0].trim() : "";
    const shut = "the window did not open from " + win.id;
    if (win.x) {
      const x = onScreen ? await closeX(d) : null;
      xs += 1;
      results.check("window", "window/" + win.id + "/close-x" + tail, !!x && x.found && x.name === w.close && x.w >= 43.5 && x.h >= 43.5,
        !onScreen ? shut : !x || !x.found ? JSON.stringify(title) + " draws no X"
          : x.name !== w.close ? "the X of " + JSON.stringify(title) + (x.name ? " is named " + JSON.stringify(x.name) : " carries no name") + " where it should be named " + JSON.stringify(w.close)
            : x.w < 43.5 || x.h < 43.5 ? "the X of " + JSON.stringify(title) + " is " + size(x.w) + " by " + size(x.h)
              : "the X of " + JSON.stringify(title) + " is " + size(x.w) + " by " + size(x.h) + " and named " + JSON.stringify(w.close));
    }
    if (win.box) {
      const list = onScreen ? await ticks(d, true) : null;
      results.check("window", "window/" + win.id + "/checkbox-in-a-44-label" + tail, ticksHold(list),
        !onScreen ? shut : "in " + JSON.stringify(title) + ", " + ticksLine(list));
    }
    if (win.link) {
      const word = w[win.link.word];
      const b = onScreen ? await linkBox(d, word, true) : null;
      results.check("window", "window/" + win.id + "/" + win.link.check + tail, linkHolds(b),
        !onScreen ? shut : !b ? "no link reading " + JSON.stringify(word) + " in " + JSON.stringify(title) : linkLine(word, b));
    }
    await d.closeModal();
  }

  // ---- HR Records' onboarding steps, each checkbox in a label: hand, 5 steps for the person picked
  await d.goto("hr");
  await d.clickText(d.say("Onboarding"), { exact: false });
  await d.pickPerson("Tomasz");
  await d.settle(400);
  const steps = await ticks(d, false);
  results.check("page", "page/hr/onboarding-checkboxes-in-44-labels" + tail, ticksHold(steps) && steps.length === 5,
    steps && steps.length && steps.length !== 5 && ticksHold(steps) ? steps.length + " checkboxes on the onboarding list where the person has 5 steps" : "on the onboarding list, " + ticksLine(steps));

  stubs.reset();
  results.note("Forty-four pixels in " + lang + " at 390: " + pages + " pages, Schedule's week, the four links, the X of " + xs + " windows and the six checkboxes");
}

module.exports = { run };
