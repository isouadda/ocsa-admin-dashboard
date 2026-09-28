// Nothing blinks, nothing is blank, nothing spins forever (6a68c11), in English and in Spanish at 1280.
//
// A read that fails says so where its rows would have been, with Try again, through one line,
// LoadFailed: This did not load., or the words the place has for it. The build names every read it
// covers: the Dashboard's figures, Started today and Inspection scores by site; Staff Management, which
// says This page is for admins. with nothing to press when the API refuses the list to the person; a
// site's Timeline and Chat; Schedule's calendar; Shift Pickup's list and analytics; the Reports library
// and its three run views; Inspections' templates, lists and analytics; Settings' Company and Dropdown
// Options; HR Compliance; a person's HR folder, with a Back button; the Jotform Inbox, Forms and PDF
// access log and the submission window; Vendors; Services; Messages, its conversations and a
// conversation; and the Issue Tracker. The suite refuses each of those reads in turn with the API's
// server error, holds the place to the line and to Try again, then lets the read through, presses Try
// again and holds the place to the rows the stub served, with the line gone. It holds the two lines the
// build added where there is nothing to show: a chip on the Issue Tracker whose state has no rows, and
// Schedule's week when nobody matches the search. Schedule and Shift Pickup show Loading only before
// their first list arrives, so a Refresh while the stub holds the read open keeps the week and the list
// on screen. The words are written out here by hand, so a wrong entry in the table turns the case red.
"use strict";

const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";
const MODAL = "div[style*='z-index: 500']";
const q = (s) => JSON.stringify(s);

// What the screen has to say, by hand. The Dashboard's two lines carry the seed's values: Dana is the
// admin who signs in, and 10 people are active.
const WORDS = {
  en: {
    failed: "This did not load.", again: "Try again", staff: "Could not load staff.", admins: "This page is for admins.",
    messages: "Messages did not load.", folder: "Could not load folder.", back: "Back",
    noneInState: "No issues in this state.", nobody: "No staff to show for this filter.",
    loadingSchedule: "Loading schedule...", loading: "Loading...",
    welcome: "Welcome back, Dana", active: "of 10 active",
  },
  es: {
    failed: "Esto no se carg\u00f3.", again: "Intentar de nuevo", staff: "No se pudo cargar el personal.", admins: "Esta p\u00e1gina es para administradores.",
    messages: "Los mensajes no se cargaron.", folder: "No se pudo cargar la carpeta.", back: "Volver",
    noneInState: "No hay problemas en este estado.", nobody: "No hay personal para mostrar con este filtro.",
    loadingSchedule: "Cargando el horario...", loading: "Cargando...",
    welcome: "Bienvenido de nuevo, Dana", active: "de 10 activos",
  },
};
// What the API answers a read that throws, and a caller who lacks the capability a route asks for, in
// each language (helpers/words.js, common.serverError and access.insufficientPermissions).
const SERVER_ERROR = { code: "common.serverError", en: "Server error", es: "Error del servidor" };
const NO_PERMISSION = { code: "access.insufficientPermissions", en: "Insufficient permissions", es: "No tiene permiso para hacer esto" };
// Who the suite opens a conversation with and a folder for: the seed's first custodial lead.
const PERSON = "Tomasz Wisniewski";
// hand: the clock's week runs Monday March 16 to Sunday March 22, which holds one scheduled inspection,
// the Monthly quality walk on Saturday March 21. The other is on Monday March 23, the week after.
const WEEK = { start: "2026-03-16", end: "2026-03-22" };

// The line a failed read leaves in its place: the element whose own words are the line, whether Try
// again is pressed from inside it, and the words of every button beside it. Null when none is drawn.
const lineAt = (d, line, again, inModal) => d.page.evaluate(([l, a, m, sel]) => {
  const root = m ? Array.from(document.querySelectorAll(sel[1])).pop() : (document.querySelector(sel[0]) || document.body);
  if (!root) return null;
  const own = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const box = Array.from(root.querySelectorAll("div")).find((el) => el.getClientRects().length > 0 && own(el) === l);
  if (!box) return null;
  const said = (b) => (b.textContent || "").trim();
  return {
    again: Array.from(box.children).some((b) => b.tagName === "BUTTON" && said(b) === a),
    beside: box.parentElement ? Array.from(box.parentElement.querySelectorAll("button")).map(said) : [],
  };
}, [line, again, !!inModal, [CONTENT, MODAL]]);

// Presses Try again inside the line, the way a person does.
const pressAgain = async (d, line, again, inModal) => {
  const pressed = await d.page.evaluate(([l, a, m, sel]) => {
    const root = m ? Array.from(document.querySelectorAll(sel[1])).pop() : (document.querySelector(sel[0]) || document.body);
    if (!root) return false;
    const own = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    const box = Array.from(root.querySelectorAll("div")).find((el) => el.getClientRects().length > 0 && own(el) === l);
    const b = box && Array.from(box.children).find((x) => x.tagName === "BUTTON" && (x.textContent || "").trim() === a);
    if (!b) return false;
    b.click();
    return true;
  }, [line, again, !!inModal, [CONTENT, MODAL]]);
  await d.settle(600);
  return pressed;
};

// The ones of these words that are nowhere on screen as text a person reads: in a visible element of
// the content area or of the open window, outside any pick list, a chart's own text included. Spaces
// are read loosely, since a chart breaks a long name over two lines.
const unseen = (d, texts, inModal) => d.page.evaluate(([ts, m, sel]) => {
  const root = m ? Array.from(document.querySelectorAll(sel[1])).pop() : (document.querySelector(sel[0]) || document.body);
  if (!root) return ts.slice();
  const seen = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest("select, option, script, style, title") || el.getClientRects().length === 0) continue;
    seen.push(n.textContent);
  }
  const all = seen.join("\n").replace(/\s+/g, " ");
  return ts.filter((x) => all.indexOf(String(x).replace(/\s+/g, " ")) < 0);
}, [texts, !!inModal, [CONTENT, MODAL]]);
const named = (list) => list.map(q).join(", ");

// Every body row of the tables on the page, as the browser drew it.
const rowTexts = (d) => d.page.evaluate((sel) => Array.from((document.querySelector(sel) || document.body).querySelectorAll("table tbody tr"))
  .filter((tr) => tr.getClientRects().length > 0).map((tr) => (tr.textContent || "").replace(/\s+/g, " ").trim()), CONTENT);
// What is wrong with the table when it does not draw the rows the stub served: no row at all, or one
// of these words on no row. Empty when every word is on a row.
const rowsMiss = async (d, words) => {
  if (words.length === 0) return "the stub served no row to look for";
  const rows = await rowTexts(d);
  const lost = words.filter((x) => !rows.some((r) => r.indexOf(x) >= 0));
  return rows.length === 0 ? "no row is drawn" : lost.length ? "no row carries " + named(lost) + "; the rows read " + q(rows.slice(0, 3)) : "";
};

// The screen's words from a point on, for a detail that says what the screen did instead.
const excerpt = async (d, from, inModal) => {
  const text = String((inModal ? await d.modalText() : await d.bodyText()) || "").replace(/\s+/g, " ").trim();
  const at = from ? text.toLowerCase().indexOf(String(from).toLowerCase()) : -1;
  const start = at < 0 ? 0 : at;
  return q(text.slice(start, start + 170));
};

// A button in the content area pressed by its words, without waiting for the network to go quiet, so a
// read the stub holds open can be caught while it is still out.
const pressNow = (d, word) => d.page.evaluate(([w, sel]) => {
  const b = Array.from((document.querySelector(sel) || document.body).querySelectorAll("button"))
    .find((x) => x.getClientRects().length > 0 && (x.textContent || "").trim() === w);
  if (!b) return false;
  b.click();
  return true;
}, [word, CONTENT]);

// Types into the content area's field that shows this placeholder, the way a person types.
const typeInto = async (d, placeholder, value) => {
  const typed = await d.page.evaluate(([ph, v, sel]) => {
    const f = Array.from((document.querySelector(sel) || document.body).querySelectorAll("input"))
      .find((i) => i.getClientRects().length > 0 && i.getAttribute("placeholder") === ph);
    if (!f) return false;
    const setter = Object.getOwnPropertyDescriptor(f.constructor.prototype, "value").set;
    setter.call(f, v);
    f.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, [placeholder, value, CONTENT]);
  await d.settle(300);
  return typed;
};

// Whether an input in the content area holds this value.
const inputHolds = (d, value) => d.page.evaluate(([v, sel]) => Array.from((document.querySelector(sel) || document.body).querySelectorAll("input"))
  .some((i) => i.value === v), [value, CONTENT]);

// The answer the stub gave the read Try again sent, or the first of them.
const first = (served) => (served[0] && served[0].json) || null;
const unique = (list) => list.filter((x, i) => x && list.indexOf(x) === i);

// Every read the build lists, in the order a person meets them. Each is refused with the API's server
// error unless it says otherwise; `from` is where a failing detail starts reading the screen, the words
// the old screen drew in the place when there were any.
const READS = [
  // ---- the Dashboard
  { id: "page/overview/load-failed/figures", read: "GET /api/reports/overview", path: /^\/api\/reports\/overview$/,
    place: "the Dashboard", from: "Loading...",
    open: async (d) => { await d.goto("overview"); return true; },
    drawn: async ({ d, w }) => { const gone = await unseen(d, [w.welcome, w.active]); return gone.length ? "the Dashboard draws no " + named(gone) : ""; } },
  { id: "page/overview/load-failed/started-today", read: "GET /api/shift-sessions/by-site", path: /^\/api\/shift-sessions\/by-site$/,
    place: "the Started today card", from: "No shifts started yet today.",
    open: async (d) => { await d.goto("overview"); return true; },
    drawn: async ({ d, served }) => {
      const names = ((first(served) || {}).sites || []).flatMap((s) => (s.people || []).map((p) => p.name));
      const gone = await unseen(d, names);
      return names.length === 0 ? "the stub served nobody" : gone.length ? "the card names nobody the read served: " + named(gone) + " are missing" : "";
    } },
  { id: "page/overview/load-failed/inspection-scores", read: "GET /api/inspections/analytics/dashboard-summary", path: /^\/api\/inspections\/analytics\/dashboard-summary$/,
    place: "the Inspection scores by site card", from: "No inspections recorded yet.",
    open: async (d) => { await d.goto("overview"); return true; },
    drawn: async ({ d, served }) => {
      const sites = (first(served) || []).map((r) => r.site_name);
      const gone = await unseen(d, sites);
      return sites.length === 0 ? "the stub served no site" : gone.length ? "the chart draws no bar for " + named(gone) : "";
    } },

  // ---- Staff Management: the list, and the admin line when the API refuses it to the person
  { id: "page/staff/load-failed/list", read: "GET /api/users", path: /^\/api\/users$/, line: "staff",
    place: "Staff Management", from: "No staff match these filters.",
    open: async (d) => { await d.goto("staff"); return true; },
    drawn: async ({ d, served }) => {
      const names = (first(served) || []).map((p) => p.name);
      const rows = await rowTexts(d);
      const strangers = rows.filter((r) => !names.some((n) => r.indexOf(n) >= 0));
      return rows.length === 0 ? "the list draws no row" : strangers.length ? "a row names nobody the read served: " + q(strangers[0]) : "";
    } },
  { id: "page/staff/load-refused/admins-line", read: "GET /api/users", path: /^\/api\/users$/, line: "admins", status: 403, noRetry: true,
    place: "Staff Management", from: "No staff match these filters.",
    open: async (d) => { await d.goto("staff"); return true; } },

  // ---- a site's Timeline and Chat
  { id: "page/sites/load-failed/timeline", read: "GET /api/sites/timeline/:siteId", path: /^\/api\/sites\/timeline\/[^/]+$/,
    place: "the site's Timeline", from: "No activity recorded for this site",
    open: async (d) => { await d.goto("sites"); return (await d.clickRow(0)) && d.clickText(d.say("Timeline"), { exact: true }); },
    drawn: async ({ d, served }) => {
      const said = ((first(served) || {}).entries || []).map((e) => e.description);
      const gone = await unseen(d, said);
      return said.length === 0 ? "the stub served no entry" : gone.length ? "the Timeline draws no " + named(gone) : "";
    } },
  { id: "page/sites/load-failed/chat", read: "GET /api/sites/chat/:siteId", path: /^\/api\/sites\/chat\/[^/]+$/, line: "messages",
    place: "the site's Chat", from: "No messages in this site channel",
    open: async (d) => { await d.goto("sites"); return (await d.clickRow(0)) && d.clickText(d.say("Chat"), { exact: true }); },
    drawn: async ({ d, served }) => {
      const said = ((first(served) || {}).messages || []).map((m) => m.text);
      const gone = await unseen(d, said);
      return said.length === 0 ? "the stub served no message" : gone.length ? "the Chat draws no " + named(gone) : "";
    } },

  // ---- the Issue Tracker, and a chip whose state has no rows
  { id: "page/issues/load-failed/list", read: "GET /api/issues", path: /^\/api\/issues$/,
    place: "the Issue Tracker", from: "No problems reported yet.",
    open: async (d) => { await d.goto("issues"); return true; },
    drawn: async ({ d, served }) => {
      const titles = (first(served) || []).map((i) => i.title);
      const gone = await unseen(d, titles);
      return titles.length === 0 ? "the stub served no issue" : gone.length ? "the list draws no " + named(gone) : "";
    } },
  { id: "page/issues/a-state-with-no-rows-says-so", run: emptyChip },

  // ---- Messages: the conversations, and one conversation
  { id: "page/chat/load-failed/conversations", read: "GET /api/chat/dm-inbox", path: /^\/api\/chat\/dm-inbox$/, line: "messages",
    place: "the list of conversations", from: "No conversations.",
    open: async (d) => { await d.goto("chat"); return true; },
    drawn: async ({ d, served }) => {
      const names = (first(served) || []).map((x) => x.staffName);
      const gone = await unseen(d, names);
      return names.length === 0 ? "the stub served no conversation" : gone.length ? "the list names no " + named(gone) : "";
    } },
  { id: "page/chat/load-failed/messages", read: "GET /api/chat/channels/:id/messages", path: /^\/api\/chat\/channels\/[^/]+\/messages$/, line: "messages",
    place: "the conversation", from: "No messages yet.",
    open: async (d) => { await d.goto("chat"); return d.clickText(PERSON, { exact: false }); },
    // The conversations list carries each one's last message, so only a message no row of it carries
    // proves the conversation drew.
    drawn: async ({ d, served, stubs }) => {
      const last = stubs.fixtures.DM_INBOX.map((x) => x.lastMessage);
      const said = (first(served) || []).map((m) => m.text).filter((x) => last.indexOf(x) < 0);
      const gone = await unseen(d, said);
      return said.length === 0 ? "the stub served no message" : gone.length ? "the conversation draws no " + named(gone) : "";
    } },

  // ---- Reports: the library and its three run views
  { id: "page/reports/load-failed/library", read: "GET /api/report-engine/definitions", path: /^\/api\/report-engine\/definitions$/,
    place: "the Reports library", from: "No saved reports yet. Use New report to create one.",
    open: async (d) => { await d.goto("reports"); return true; },
    drawn: async ({ d, served }) => {
      const names = (first(served) || []).map((x) => x.name);
      const gone = await unseen(d, names);
      return names.length === 0 ? "the stub served no report" : gone.length ? "the library draws no " + named(gone) : "";
    } },
  { id: "page/reports/load-failed/issue-timing", read: "GET /api/report-engine/issue-timing", path: /^\/api\/report-engine\/issue-timing$/,
    place: "the Issue response and resolution report", from: "No issue activity in this range yet.",
    open: async (d) => { await d.goto("reports"); return d.clickRunFor("Issue response and resolution"); },
    drawn: async ({ d, seed }) => {
      const h = seed.ISSUE_TIMING_HAND;
      const gone = await unseen(d, [h.medianResolution, h.medianFirstResponse]);
      return gone.length ? "the report draws no " + named(gone) + ", the medians worked out by hand from 195 and 42 minutes" : "";
    } },
  { id: "page/reports/load-failed/supply-usage", read: "GET /api/report-engine/supply-usage", path: /^\/api\/report-engine\/supply-usage$/,
    place: "the Supply usage and cost report", from: "No supply usage in this range yet.",
    open: async (d) => { await d.goto("reports"); return d.clickRunFor("Supply usage and cost"); },
    drawn: async ({ d, seed }) => {
      const gone = await unseen(d, [seed.SUPPLY_HAND.estimatedCost]);
      return gone.length ? "the report draws no " + named(gone) + ", the cost worked out by hand over nine supplies" : "";
    } },
  // The run view reads three routes at once, and one refused is the whole read refused.
  { id: "page/reports/load-failed/inspection-quality", read: "GET /api/inspections/analytics/scores-over-time", path: /^\/api\/inspections\/analytics\/scores-over-time$/,
    place: "the Inspection scores and quality report", from: "No completed inspections in this range yet.",
    open: async (d) => { await d.goto("reports"); return d.clickRunFor("Inspection scores and quality"); },
    drawn: async ({ d, seed }) => {
      const gone = await unseen(d, [seed.INSPECTION_HAND.avgScore]);
      return gone.length ? "the report draws no " + named(gone) + ", 350 of 400 points worked out by hand" : "";
    } },

  // ---- Vendors and Services
  { id: "page/vendors/load-failed/list", read: "GET /api/vendors", path: /^\/api\/vendors$/,
    place: "the vendor list", from: "No vendors yet. Use Add Vendor to start.",
    open: async (d) => { await d.goto("vendors"); return true; },
    drawn: async ({ d, served }) => rowsMiss(d, (first(served) || []).map((v) => v.name)) },
  { id: "page/services/load-failed/catalog", read: "GET /api/services", path: /^\/api\/services$/,
    place: "the Service Catalog", from: "No services yet.",
    open: async (d) => { await d.goto("services"); return true; },
    drawn: async ({ d, served }) => {
      const names = (first(served) || []).map((x) => x.name);
      const gone = await unseen(d, names);
      return names.length === 0 ? "the stub served no service" : gone.length ? "the catalog draws no " + named(gone) : "";
    } },

  // ---- Schedule: the calendar, a Refresh while it is out, and a week with nobody to show
  { id: "page/schedule/load-failed/calendar", read: "GET /api/schedule/calendar", path: /^\/api\/schedule\/calendar$/,
    place: "Schedule's week", from: "Inspection",
    open: async (d) => { await d.goto("schedule"); return true; },
    drawn: async ({ d, served }) => {
      const inWeek = ((first(served) || {}).inspections || []).filter((i) => i.scheduled_date >= WEEK.start && i.scheduled_date <= WEEK.end).map((i) => i.template_name);
      const gone = await unseen(d, inWeek);
      return inWeek.length === 0 ? "the stub served no inspection in the week" : gone.length ? "the week draws no " + named(gone) : "";
    } },
  { id: "page/schedule/refresh-keeps-the-week", run: quietSchedule },
  { id: "page/schedule/a-week-with-nobody-says-so", run: nobodyThisWeek },

  // ---- Shift Pickup: the list, the analytics, and a Refresh while the list is out
  { id: "page/marketplace/load-failed/list", read: "GET /api/pickups", path: /^\/api\/pickups$/,
    place: "the Open list", from: "No shifts found for this period and filter.",
    open: async (d) => { await d.goto("marketplace"); return true; },
    drawn: async ({ d, served }) => {
      const open = served.find((c) => /status=open/.test(c.query || ""));
      return rowsMiss(d, unique(((open && open.json) || []).map((p) => p.site_name)));
    } },
  { id: "page/marketplace/load-failed/analytics", read: "GET /api/pickups/analytics/staff-reliability", path: /^\/api\/pickups\/analytics\/staff-reliability$/,
    place: "the Analytics tab", from: "Reason Breakdown",
    open: async (d) => { await d.goto("marketplace"); return d.clickText(d.say("Analytics"), { exact: true }); },
    drawn: async ({ d, served }) => {
      const names = ((first(served) || {}).staff || []).map((s) => s.name);
      if (!(await d.clickText(d.say("Staff Reliability"), { exact: true }))) return "the analytics drew no Staff Reliability tab to open";
      const gone = await unseen(d, names);
      return names.length === 0 ? "the stub served nobody" : gone.length ? "Staff Reliability names no " + named(gone) : "";
    } },
  { id: "page/marketplace/refresh-keeps-the-list", run: quietPickup },

  // ---- Inspections: the templates, the Scheduled and Completed lists, which one read fills, and the
  // analytics, whose read is four routes at once
  { id: "page/inspections/load-failed/templates", read: "GET /api/inspections/templates", path: /^\/api\/inspections\/templates$/,
    place: "the Templates tab", from: "No templates yet. Create one to get started.",
    open: async (d) => { await d.goto("inspections"); return true; },
    drawn: async ({ d, served }) => {
      const names = (first(served) || []).map((x) => x.name);
      const gone = await unseen(d, names);
      return names.length === 0 ? "the stub served no template" : gone.length ? "the tab draws no " + named(gone) : "";
    } },
  { id: "page/inspections/load-failed/lists", read: "GET /api/inspections/scheduled", path: /^\/api\/inspections\/scheduled$/,
    place: "the Scheduled tab", from: "No pending inspections.",
    open: async (d) => { await d.goto("inspections"); return d.clickText(d.say("Scheduled|inspections"), { exact: true }); },
    // The Completed tab's list comes from the same read, so it says so too, and Try again is pressed
    // back on the Scheduled tab.
    also: async ({ d, w }) => {
      const went = await d.clickText(d.say("Completed|inspections"), { exact: true });
      const there = went ? await lineAt(d, w.failed, w.again) : null;
      await d.clickText(d.say("Scheduled|inspections"), { exact: true });
      return !went ? "the Completed tab could not be opened" : !there ? "the Completed tab says no " + q(w.failed) + "; it reads " + await excerpt(d, null)
        : !there.again ? "the Completed tab's line carries no " + q(w.again) : "";
    },
    drawn: async ({ d, served }) => {
      const all = first(served) || [];
      const pending = unique(all.filter((s) => s.status !== "completed" && s.status !== "cancelled").map((s) => s.site_name));
      const done = unique(all.filter((s) => s.status === "completed").map((s) => s.site_name));
      const onScheduled = await rowsMiss(d, pending);
      if (onScheduled) return "the Scheduled tab: " + onScheduled;
      if (!(await d.clickText(d.say("Completed|inspections"), { exact: true }))) return "the Completed tab could not be opened";
      const onCompleted = await rowsMiss(d, done);
      return onCompleted ? "the Completed tab: " + onCompleted : "";
    } },
  { id: "page/inspections/load-failed/analytics", read: "GET /api/inspections/analytics/category-breakdown", path: /^\/api\/inspections\/analytics\/category-breakdown$/,
    place: "the Reports tab", from: "No completed inspections in the selected date range. Complete some inspections to see analytics here.",
    open: async (d) => { await d.goto("inspections"); return d.clickText(d.say("Reports"), { exact: true }); },
    drawn: async ({ d, calls }) => {
      const compared = calls.filter((c) => c.path === "/api/inspections/analytics/site-comparison" && c.status === 200).pop();
      const sites = ((compared && compared.json) || []).map((r) => r.site_name);
      const gone = await unseen(d, sites);
      return sites.length === 0 ? "Try again read no site comparison" : gone.length ? "Site Comparison names no " + named(gone) : "";
    } },

  // ---- Settings: Company and Dropdown Options
  { id: "page/settings/load-failed/company", read: "GET /api/settings", path: /^\/api\/settings$/,
    place: "the Company tab", from: "Loading company settings...",
    open: async (d) => { await d.goto("settings"); return true; },
    drawn: async ({ d, served }) => {
      const name = (first(served) || {}).display_name;
      return !name ? "the stub served no display name" : (await inputHolds(d, name)) ? "" : "no field holds the display name " + q(name) + " the read served";
    } },
  { id: "page/settings/load-failed/dropdown-options", read: "GET /api/lookups/all", path: /^\/api\/lookups\/all$/,
    place: "the Dropdown Options tab", from: "Dropdown Options",
    open: async (d) => { await d.goto("settings"); return d.clickText(d.say("Dropdown Options"), { exact: true }); },
    drawn: async ({ d, served }) => {
      const lists = (first(served) || []).map((c) => c.label);
      const gone = await unseen(d, lists);
      return lists.length === 0 ? "the stub served no list" : gone.length ? "the tab names no " + named(gone) : "";
    } },

  // ---- HR Records: Compliance, and a person's folder
  { id: "page/hr/load-failed/compliance", read: "GET /api/hr/compliance", path: /^\/api\/hr\/compliance$/,
    place: "the Compliance tab", from: "Loading...",
    open: async (d) => { await d.goto("hr"); return d.clickText(d.say("Compliance"), { exact: true }); },
    drawn: async ({ d, served }) => {
      const c = first(served) || {};
      const certs = (c.expiringCerts || []).concat(c.expiredCerts || []).map((x) => x.cert_name);
      const gone = await unseen(d, certs);
      return certs.length === 0 ? "the stub served no certification" : gone.length ? "the tab lists no " + named(gone) : "";
    } },
  { id: "page/hr/load-failed/folder", read: "GET /api/hr/employee-folder/:userId", path: /^\/api\/hr\/employee-folder\/[^/]+$/, line: "folder", beside: "back",
    place: "the person's folder", from: "Could not load folder.",
    open: async (d) => { await d.goto("hr"); return d.clickText(PERSON, { exact: true }); },
    drawn: async ({ d, served }) => {
      const e = (first(served) || {}).employee || {};
      const name = [e.first_name, e.last_name].filter(Boolean).join(" ");
      const gone = await unseen(d, [name]);
      return !name ? "the stub served nobody" : gone.length ? "the folder does not name " + q(name) : "";
    } },

  // ---- Forms, the Jotform tab: the Inbox, Forms, the PDF access log and a submission's window
  { id: "page/forms/load-failed/inbox", read: "GET /api/jotform/submissions", path: /^\/api\/jotform\/submissions$/,
    place: "the Inbox", from: "No submissions found. Press Sync All Submissions under Maintenance to pull the latest.",
    open: async (d) => { await d.goto("forms"); return d.clickText(d.say("Jotform"), { exact: true }); },
    drawn: async ({ d, served }) => rowsMiss(d, unique(((first(served) || {}).submissions || []).map((x) => x.form_title))) },
  { id: "page/forms/load-failed/form-library", read: "GET /api/jotform/forms", path: /^\/api\/jotform\/forms$/,
    place: "the Forms section", from: "No forms found. Press Sync Form Catalog under Maintenance to pull your account's forms.",
    open: async (d) => { await d.goto("forms"); return (await d.clickText(d.say("Jotform"), { exact: true })) && d.clickText(d.say("Forms"), { exact: true }); },
    drawn: async ({ d, served }) => rowsMiss(d, (first(served) || []).map((f) => f.title)) },
  { id: "page/forms/load-failed/pdf-access-log", read: "GET /api/jotform/pdf-access-log", path: /^\/api\/jotform\/pdf-access-log$/,
    place: "the PDF access log", from: "No PDF access events recorded yet. Events appear here as soon as anyone views, downloads, or prints a submission PDF.",
    open: async (d) => { await d.goto("forms"); return d.clickText(d.say("PDF access log"), { exact: true }); },
    drawn: async ({ d, served }) => rowsMiss(d, unique(((first(served) || {}).entries || []).map((x) => x.form_title))) },
  { id: "window/forms/submission-detail/load-failed", read: "GET /api/jotform/submissions/:id", path: /^\/api\/jotform\/submissions\/[^/]+$/, inModal: true,
    place: "the Submission Detail window", from: null,
    open: async (d) => { await d.goto("forms"); return (await d.clickText(d.say("Jotform"), { exact: true })) && d.clickText(d.say("View"), { exact: true }); },
    drawn: async ({ d, served }) => {
      const answers = (((first(served) || {}).live || {}).answers || []).map((a) => a.answer);
      const gone = await unseen(d, answers, true);
      return answers.length === 0 ? "the stub served no answer" : gone.length ? "the window draws no " + named(gone) : "";
    } },
];

// One read refused, held to its line and Try again, let through, and held to the rows it served.
async function hold(ctx, r) {
  const { d, results, stubs, lang, w } = ctx;
  const kind = r.inModal ? "window" : "page";
  const id = r.id + "/" + lang;
  const line = w[r.line || "failed"];
  const refusal = r.status === 403 ? NO_PERMISSION : SERVER_ERROR;
  stubs.clearRefusals();
  stubs.clearDelays();
  await d.ensureSignedIn("admin");
  const mark = d.mark();
  stubs.setRefusal({ method: "GET", path: r.path, status: r.status || 500, code: refusal.code, error: refusal[lang] || refusal.en });
  let reached = false;
  try { reached = await r.open(d); } catch (e) { reached = false; }
  await d.settle(500);
  if (await d.crashed()) {
    results.fail(kind, id, "the refused read took the app down: " + await d.crashDetail());
    stubs.clearRefusals();
    await d.recover("admin");
    return;
  }
  const refused = d.callsSince(mark).some((c) => c.method === "GET" && r.path.test(c.path) && c.refused);
  const shown = await lineAt(d, line, w.again, r.inModal);
  const instead = shown ? "" : await excerpt(d, r.from ? d.say(r.from) : null, r.inModal);
  const also = shown && shown.again && r.also ? await r.also(ctx) : "";
  stubs.clearRefusals();

  const noBeside = r.beside && shown && shown.beside.indexOf(w[r.beside]) < 0;
  let detail = "";
  if (!reached) detail = "the way to " + r.place + " could not be walked";
  else if (!refused) detail = "the page never asked for " + r.read + " while it was refused";
  else if (!shown) detail = "with " + r.read + " refused" + (r.status ? " with " + r.status : "") + ", " + r.place + " says no " + q(line) + "; the screen reads " + instead;
  else if (r.noRetry) detail = shown.again ? "the line offers " + q(w.again) + ", which cannot change the API's refusal" : "";
  else if (!shown.again) detail = "the line " + q(line) + " carries no " + q(w.again) + (noBeside ? " and has no " + q(w[r.beside]) + " beside it" : "");
  else if (noBeside) detail = "the line has no " + q(w[r.beside]) + " beside it; its buttons read " + q(shown.beside);
  else if (also) detail = also;
  else {
    const mark2 = d.mark();
    const pressed = await pressAgain(d, line, w.again, r.inModal);
    const calls = d.callsSince(mark2);
    const served = calls.filter((c) => c.method === "GET" && r.path.test(c.path) && c.status === 200);
    const after = await lineAt(d, line, w.again, r.inModal);
    const drawn = served.length && !after ? await r.drawn(Object.assign({}, ctx, { served, calls })) : "";
    detail = !pressed ? q(w.again) + " could not be pressed"
      : served.length === 0 ? q(w.again) + " sent no new " + r.read
        : after ? "the line " + q(line) + " stays after " + q(w.again) + " read " + r.read + " again"
          : drawn ? "after " + q(w.again) + ", " + drawn : "";
  }
  results.check(kind, id, detail === "", detail);
  if (r.inModal) await d.closeModal();
}

// ---- the Issue Tracker: the escalated chip, whose state no issue is in, says so, and the open chip
// draws its issues with no such line.
async function emptyChip({ d, results, seed, lang, w }, r) {
  const id = r.id + "/" + lang;
  await d.goto("issues");
  const titles = seed.ISSUES.map((i) => i.title);
  const pressed = await d.clickText(d.say("escalated|issues"), { exact: true });
  const line = await lineAt(d, w.noneInState, w.again);
  const drawn = titles.length - (await unseen(d, titles)).length;
  const instead = line ? "" : await excerpt(d, d.say("Issue Tracker"));
  const opened = await d.clickText(d.say("open|issues"), { exact: true });
  const openLine = await lineAt(d, w.noneInState, w.again);
  const openTitles = seed.ISSUES.filter((i) => i.status === "open").map((i) => i.title);
  const openGone = await unseen(d, openTitles);
  results.check("page", id, pressed && !!line && drawn === 0 && opened && !openLine && openGone.length === 0,
    !pressed ? "the escalated chip could not be pressed"
      : !line ? "the escalated chip, with no issue in its state, says no " + q(w.noneInState) + "; the screen reads " + instead
        : drawn ? "the escalated chip draws " + drawn + " issues that are in other states"
          : !opened ? "the open chip could not be pressed"
            : openLine ? "the open chip says " + q(w.noneInState) + " over its " + openTitles.length + " issues"
              : openGone.length ? "the open chip draws no " + named(openGone) : "");
}

// ---- Schedule: a Refresh while the stub holds the calendar read open keeps the week on screen, with no
// Loading schedule... in its place.
async function quietSchedule({ d, results, stubs, lang, w }, r) {
  const id = r.id + "/" + lang;
  stubs.clearDelays();
  await d.goto("schedule");
  const served = stubs.calls.filter((c) => c.path === "/api/schedule/calendar" && c.status === 200 && c.json).pop();
  const inWeek = ((served && served.json.inspections) || []).filter((i) => i.scheduled_date >= WEEK.start && i.scheduled_date <= WEEK.end).map((i) => i.template_name);
  const drawnFirst = inWeek.length > 0 && (await unseen(d, inWeek)).length === 0;
  stubs.setDelay("/api/schedule/calendar", 2600);
  const mark = d.mark();
  const pressed = await pressNow(d, d.say("Refresh"));
  await d.page.waitForTimeout(700);
  const asked = d.callsSince(mark).some((c) => c.path === "/api/schedule/calendar");
  const spinning = await lineAt(d, w.loadingSchedule, w.again);
  const gone = await unseen(d, inWeek);
  const instead = gone.length ? await excerpt(d, spinning ? w.loadingSchedule : null) : "";
  await d.page.waitForTimeout(2300);
  stubs.clearDelays();
  await d.settle(300);
  results.check("page", id, drawnFirst && pressed && asked && !spinning && gone.length === 0,
    !drawnFirst ? "the week never drew " + named(inWeek.length ? inWeek : ["the week's inspection"]) + " before the Refresh"
      : !pressed ? "Refresh could not be pressed"
        : !asked ? "Refresh sent no GET /api/schedule/calendar"
          : spinning ? "while the calendar read is out, a Refresh puts " + q(w.loadingSchedule) + " where the week was"
            : gone.length ? "while the calendar read is out, the week no longer draws " + named(gone) + "; the screen reads " + instead : "");
}

// ---- Schedule: a week with nobody matching the search says so.
async function nobodyThisWeek({ d, results, lang, w }, r) {
  const id = r.id + "/" + lang;
  await d.goto("schedule");
  const typed = await typeInto(d, d.say("Search staff..."), "no one by this name");
  const line = await lineAt(d, w.nobody, w.again);
  const instead = line ? "" : await excerpt(d, d.say("Inspection"));
  results.check("page", id, typed && !!line,
    !typed ? "the week's staff search could not be typed into"
      : !line ? "a search that matches nobody leaves the week with no " + q(w.nobody) + "; the screen reads " + instead : "");
  await typeInto(d, d.say("Search staff..."), "");
}

// ---- Shift Pickup: a Refresh while the stub holds the list's reads open keeps the list on screen,
// with no Loading... in its place.
async function quietPickup({ d, results, stubs, lang, w }, r) {
  const id = r.id + "/" + lang;
  stubs.clearDelays();
  await d.goto("marketplace");
  const served = stubs.calls.filter((c) => c.path === "/api/pickups" && /status=open/.test(c.query || "") && c.status === 200 && Array.isArray(c.json)).pop();
  const sites = unique(((served && served.json) || []).map((p) => p.site_name));
  const drawnFirst = sites.length > 0 && (await rowsMiss(d, sites)) === "";
  stubs.setDelay("/api/pickups", 2600);
  const mark = d.mark();
  const pressed = await pressNow(d, d.say("Refresh"));
  await d.page.waitForTimeout(700);
  const asked = d.callsSince(mark).some((c) => c.path === "/api/pickups");
  const spinning = await lineAt(d, w.loading, w.again);
  const kept = await rowsMiss(d, sites);
  await d.page.waitForTimeout(2300);
  stubs.clearDelays();
  await d.settle(300);
  results.check("page", id, drawnFirst && pressed && asked && !spinning && kept === "",
    !drawnFirst ? "the Open list never drew " + named(sites.length ? sites : ["the open shift"]) + " before the Refresh"
      : !pressed ? "Refresh could not be pressed"
        : !asked ? "Refresh sent no GET /api/pickups"
          : spinning ? "while the list's reads are out, a Refresh puts " + q(w.loading) + " where the list was"
            : kept ? "while the list's reads are out, the list is gone: " + kept : "");
}

async function run({ d, results, stubs, seed, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const ctx = { d, results, stubs, seed, lang, w };
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");

  for (const r of READS) {
    try {
      if (r.run) await r.run(ctx, r);
      else await hold(ctx, r);
    } catch (e) {
      results.fail(r.inModal ? "window" : "page", r.id + "/" + lang, "the case threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
      stubs.clearRefusals();
      stubs.clearDelays();
      if (await d.crashed()) await d.recover("admin");
      await d.closeModal().catch(() => {});
    }
  }

  stubs.reset();
  results.note("Nothing blinks, nothing is blank, nothing spins forever in " + lang + ": " + READS.filter((r) => !r.run).length
    + " reads refused and read again, a chip with no rows, a week with nobody, and two quiet refreshes");
}

module.exports = { run };
