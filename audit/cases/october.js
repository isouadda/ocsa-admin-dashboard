// The October audit (part 343, AUDIT_CONTRACT.md revised Oct 15, 2026). Each case here is the proof of a
// finding in audit/FINDINGS_2026-10.md, driven against the stub laid out as the API is built in #146
// (setApiAsBuilt), as the supervisor who holds exactly contract 1's supervisor column (seed.js,
// supervisor146) or as the admin. A case that fails today is listed in audit/known.json with what the
// screen shows, so the run passes and the fix round turns each one green.
//
// The suite makes its own drivers, each with a stub of its own, so arming the API as built never leaks
// into another suite, and so the laptop on another clock can be driven beside the company's.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const seed = require("../seed");
const { createStubs } = require("../stubs");

const ROOT = path.resolve(__dirname, "..", "..");
const KIND = "october";
const STAFF_APP = "https://staff.example.invalid";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Every key a reply could carry a person's pay under (contract 2.1).
const PAY_KEY = /^(hourly_?rate|pay_?rate|wages?|salary|labou?r_?cost|cost_?per_?hour|overtime_?cost|burden_?rate)$/i;
function payKeys(json, at, out) {
  if (!json || typeof json !== "object") return out;
  if (Array.isArray(json)) { json.forEach((x, i) => payKeys(x, at + "[" + i + "]", out)); return out; }
  Object.keys(json).forEach((k) => {
    if (PAY_KEY.test(k) && json[k] != null && json[k] !== "") out.push(at + "." + k);
    payKeys(json[k], at + "." + k, out);
  });
  return out;
}

async function hash(d) { return d.page.evaluate(() => window.location.hash.replace(/^#/, "")); }
async function navIds(d) {
  let last = [];
  for (let i = 0, same = 0; i < 20 && same < 3; i += 1) {
    await wait(300);
    const ids = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]")).map((b) => b.getAttribute("data-nav-item")));
    same = ids.length === last.length ? same + 1 : 0;
    last = ids;
  }
  return last;
}
async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(500);
}

// ---- the stub itself: the supervisor the October audit seeds ---------------------------------------
function stubSelfCheck(results) {
  const s = createStubs();
  s.setApiAsBuilt(true);
  s.setSignedInAs("supervisor146");
  const r = s.handle({ method: "GET", url: "http://stub/api/users/me/permissions?locale=en", body: null, headers: { authorization: "Bearer t", "accept-language": "en" }, lang: "en" });
  const c = (r && r.json && r.json.capabilities) || {};
  const want = { manage_staff: true, manage_employment: false, read_hr_records: false, manage_cases: true, read_incident_reports: true };
  const off = Object.keys(want).filter((k) => c[k] !== want[k]);
  results.check(KIND, "october/stub/supervisor146-holds-contract-1-column", off.length === 0,
    off.length ? "the permissions answer reads " + off.map((k) => k + " " + c[k]).join(", ") : "");
}

// ---- the supervisor of contract 1 -------------------------------------------------------------------
async function supervisor(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  try {
    await d.signIn("supervisor146");
    const signedAt = d.mark();
    const ids = await navIds(d);
    const missing = ["staff", "cases", "training"].filter((x) => ids.indexOf(x) < 0);
    results.check(KIND, "october/supervisor/menu-follows-contract-1", missing.length === 0 && ids.indexOf("hr") < 0,
      missing.length ? "the side panel has no " + missing.join(", ") : ids.indexOf("hr") >= 0 ? "the side panel offers HR Records" : "");
    results.note("October, the contract 1 supervisor's side panel: " + ids.join(", "));

    // Pay on a profile: the card, Print Report, and what Save sends (contract 2.1 and 2.2).
    await goHash(d, "staff/u-staff-5");
    await d.page.locator("[data-profile-edit]").first().waitFor().catch(() => {});
    const body = await d.bodyText();
    const rateWord = d.say("Hourly Rate");
    results.check(KIND, "october/supervisor/profile-shows-no-hourly-rate", body.indexOf(rateWord) < 0,
      body.indexOf(rateWord) >= 0 ? "the profile of u-staff-5 reads " + JSON.stringify((body.split("\n").find((l) => l.indexOf(rateWord) >= 0) || rateWord).slice(0, 80)) + " to a supervisor" : "");
    const refused = /Insufficient permissions/.test(body);
    results.check(KIND, "october/supervisor/profile-reads-no-refusal", !refused,
      refused ? "the profile draws the API's refusal, Insufficient permissions, where the employment history card reads GET /api/users/:id/employment, which is read_hr_records'" : "");
    await d.clearCaptures();
    await d.clickText(d.say("Print Report"), { exact: false });
    const printed = (await d.prints()).map((p) => p.html).join("");
    results.check(KIND, "october/supervisor/print-report-prints-no-hourly-rate", !!printed && printed.indexOf(rateWord) < 0,
      !printed ? "Print Report wrote nothing" : printed.indexOf(rateWord) >= 0 ? "Print Report prints Hourly Rate for a supervisor" : "");
    const markEdit = d.mark();
    const opened = await d.page.locator("[data-profile-edit]").first().click().then(() => true).catch(() => false);
    await d.settle(300);
    const rateBox = opened ? await d.page.evaluate((w) => Array.from(document.querySelectorAll("label, div")).some((el) => el.children.length === 0 && (el.textContent || "").trim() === w), rateWord) : false;
    // Save sends what changed (DASH-03), so one field is changed for there to be a PATCH to read.
    if (opened) await d.fillByLabel(d.say("Phone"), "2155550188");
    const saved = opened ? await d.clickText(d.say("Save Changes"), { exact: true }) : false;
    const patch = d.callsSince(markEdit).find((c) => c.method === "PATCH" && c.path === "/api/users/u-staff-5");
    const sentRate = !!(patch && patch.body && Object.prototype.hasOwnProperty.call(patch.body, "hourlyRate"));
    results.check(KIND, "october/supervisor/profile-edit-offers-and-sends-no-hourly-rate", opened && saved && !!patch && !sentRate && !rateBox,
      !opened ? "the profile's Edit could not be pressed" : !saved ? "Save Changes could not be pressed" : !patch ? "Save sent no PATCH"
        : (rateBox ? "the edit window offers Hourly Rate to a supervisor; " : "") + (sentRate ? "Save sent hourlyRate " + JSON.stringify(patch.body.hourlyRate) + " with fields the supervisor did not change: " + Object.keys(patch.body).join(", ") : ""));

    // What reached the supervisor's browser, whatever the screen drew.
    for (const id of ids) { await goHash(d, id); }
    const leaks = {};
    d.callsSince(signedAt).forEach((c) => {
      if (!c.json || c.status >= 400) return;
      const keys = payKeys(c.json, "", []);
      if (keys.length) leaks[c.method + " " + c.path.replace(/u-[a-z]+-\d+/g, ":id")] = keys.slice(0, 3).join(", ");
    });
    const routes = Object.keys(leaks);
    results.check(KIND, "october/supervisor/no-reply-carries-pay", routes.length === 0,
      routes.map((r) => r + " carries " + leaks[r]).join("; "));

    // What contract 1 keeps with a supervisor: Waiting for signatures, clearance dates, a warning.
    await goHash(d, "hr/signatures");
    const sig = await d.bodyText();
    const sigOk = sig.indexOf(d.say("Waiting for signatures")) >= 0 && sig.indexOf(d.say("This page is for admins.")) < 0;
    results.check(KIND, "october/supervisor/waiting-for-signatures-opens", sigOk,
      sigOk ? "" : "#hr/signatures draws " + JSON.stringify(sig.trim().split("\n")[0].slice(0, 80)));
    await goHash(d, "clearances");
    const rows = await d.page.locator("table tbody tr").count();
    let clearanceSays = "the Clearances page lists no one";
    if (rows > 0) {
      await d.clickRow(0);
      await d.settle(400);
      const where = await hash(d);
      const text = await d.bodyText();
      clearanceSays = text.indexOf(d.say("This page is for admins.")) >= 0 ? "a row opens #" + where + ", which reads This page is for admins." : "";
    }
    results.check(KIND, "october/supervisor/clearance-row-opens-its-dates", clearanceSays === "", clearanceSays);
    await goHash(d, "discipline");
    const issue = await d.page.getByRole("button", { name: d.say("Issue a warning"), exact: true }).count();
    results.check(KIND, "october/supervisor/discipline-can-issue-a-warning", issue > 0,
      issue > 0 ? "" : "Discipline offers no Issue a warning; it lives in the HR folder, which read_hr_records closes");
  } catch (e) {
    results.fail(KIND, "october/supervisor/suite", "threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
  } finally { await d.close(); }
}

// ---- notices: every subject type in contract 3, from the bell and from an alert ---------------------
// Where each type opens on the dashboard: the record itself where the dashboard has an address for it,
// else the page that holds it. {id} is the notice's subjectId.
const PLACES = {
  chat: "chat/{id}", client_request: "issues/requests/{id}", customer_concern: "forms/reports/{id}",
  document_to_sign: "hr/signatures", issue: "issues/{id}", issue_assigned: "issues/{id}", issue_escalated: "issues/{id}",
  periodic_overdue: "sites/{id}/tasks", shift_assigned: "schedule", support_ticket: "tickets", support_ticket_new: "tickets",
  time_off: "schedule/timeoff/{id}", hr_case_assigned: "cases/{id}", hr_case_escalated: "cases/{id}", hr_case_filed: "cases/{id}",
  hr_case_due_soon: "cases/{id}", hr_case_overdue: "cases/{id}", task_assigned: "assigned", training_assigned: "training",
  training_session: "training", site_assigned: "sites/{id}", workspace_member: "workspace/{id}",
  inspection_unfinished: "inspections/{id}", inspection_finding: "issues/{id}", shift_drop: "marketplace", shift_claim: "marketplace",
};
const IDS = { chat: "ch-1", client_request: "cr-1", customer_concern: "fr-concern-1", issue: "i-1", issue_assigned: "i-1", issue_escalated: "i-3",
  periodic_overdue: "s-2", time_off: "to-330", inspection_unfinished: "si-1", inspection_finding: "i-4", site_assigned: "s-1", workspace_member: "wp-1" };
// The six types API #146 added for staff are linked to the staff app, the way the stub's own issue_assigned is.
const STAFF_LINKED = ["task_assigned", "training_assigned", "training_session", "site_assigned", "document_to_sign", "workspace_member", "shift_assigned", "shift_drop", "shift_claim"];

function swPlaceOf() {
  const code = fs.readFileSync(path.join(ROOT, "public", "sw.js"), "utf8");
  const sandbox = { self: { addEventListener() {}, location: { origin: "" } } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.placeOf;
}

async function tapAndWatch(d, title) {
  const before = (await d.prints()).length;
  const clicked = await d.page.evaluate((t0) => {
    const panel = document.querySelector("div[role=dialog][aria-label=Notifications]");
    if (!panel) return false;
    const row = Array.from(panel.querySelectorAll("button")).find((b) => (b.innerText || "").indexOf(t0) >= 0);
    if (!row) return false;
    row.click();
    return true;
  }, title);
  let seen = "overview";
  for (let i = 0; i < 15 && clicked; i += 1) {
    await wait(100);
    const h = await hash(d);
    if (h && h !== "overview") { seen = h; break; }
  }
  const said = clicked ? await d.waitToast(600) : null;
  const tabs = (await d.prints()).slice(before).map((p) => p.url).filter(Boolean);
  return { clicked, seen, said, tabs };
}

async function notices(ctx, persona) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  const placeOf = swPlaceOf();
  // A supervisor is not told of a support ticket (admins and the support contact are), and whether one may
  // read a client's concern is the API's to say (findings, notices), so neither is tapped as one.
  const types = Object.keys(PLACES).filter((st) => persona === "admin" || (st.indexOf("support_ticket") !== 0 && st !== "customer_concern"));
  const rows = types.map((st, i) => {
    const id = IDS[st] || (st.indexOf("hr_case") === 0 ? "hc-1" : st + "-1");
    const link = STAFF_LINKED.indexOf(st) >= 0 ? STAFF_APP + "/" + st.replace(/_/g, "-") + "/" + id : origin + "/#" + PLACES[st].replace("{id}", id);
    return { id: "n-oct-" + i, title: "October notice " + i + " " + st, body: "A notice of type " + st + ".", subjectType: st, subjectId: id, link };
  });
  rows.push({ id: "n-oct-unknown", title: "October notice unknown", body: "A type the dashboard has never heard of.", subjectType: "audit_unknown_type", subjectId: "x-1", link: null });
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  const table = [];
  try {
    await d.signIn(persona);
    await navIds(d);
    for (const n of rows) {
      // Each notice is laid on top of the bell just before it is opened, so it is on the bell's first
      // page of 30 whatever the run tapped before it.
      stubs.addNotices([n]);
      await goHash(d, "overview");
      if (!(await d.openBell())) { results.fail(KIND, "october/notices/" + n.subjectType + "/" + persona, "the bell would not open"); continue; }
      await d.page.locator("div[role=dialog][aria-label=Notifications] button", { hasText: n.title }).first().waitFor().catch(() => {});
      const r = await tapAndWatch(d, n.title);
      if (!r.clicked) { results.fail(KIND, "october/notices/" + n.subjectType + "/" + persona, "no notice on the bell reads " + JSON.stringify(n.title)); continue; }
      const landed = r.seen === "overview" ? "" : r.seen;
      if (n.subjectType === "audit_unknown_type") {
        results.check(KIND, "october/notices/unknown-type/" + persona, !!landed || !!r.said || r.tabs.length > 0,
          "a notice of a type the dashboard does not know, with no link, closes the bell and is marked read, and nothing opens and nothing is said");
        table.push("unknown type: " + (landed || (r.said ? "toast " + JSON.stringify(r.said) : "nothing")));
        continue;
      }
      const want = PLACES[n.subjectType].replace("{id}", n.subjectId);
      const ok = !!landed && (landed === want || landed.indexOf(want + "/") === 0 || (want.indexOf("/") < 0 && landed.split("/")[0] === want)) && r.tabs.length === 0;
      const got = r.tabs.length ? "a new tab on " + r.tabs[0] : landed ? "#" + landed : r.said ? "the toast " + JSON.stringify(r.said) : "nothing";
      results.check(KIND, "october/notices/" + n.subjectType + "/" + persona, ok, ok ? "" : "opens " + got + " where the dashboard's place is #" + want);
      table.push(n.subjectType + ": bell " + got + ", alert " + (placeOf(n.subjectType, n.subjectId) ? "#" + placeOf(n.subjectType, n.subjectId) : "the front page"));
      if (persona === "admin") {
        const sw = placeOf(n.subjectType, n.subjectId) || "";
        const bell = r.tabs.length ? "tab:" + r.tabs[0] : landed;
        const same = sw === bell || decodeURIComponent(sw) === bell;
        results.check(KIND, "october/notices/" + n.subjectType + "/alert-opens-where-the-bell-does", same,
          same ? "" : "the bell opens " + (bell ? bell : "nothing") + " and a tapped alert opens " + (sw ? "#" + sw : "the front page"));
      }
    }
  } catch (e) {
    results.fail(KIND, "october/notices/suite/" + persona, "threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
  } finally { await d.close(); }
  results.note("October, where each notice opens for the " + persona + ": " + table.join("; "));
}

// ---- what a person types, printed without escaping ---------------------------------------------------
const MARKUP = "<img src=x data-audit-markup=1 onerror=\"window.__auditXss=1\">";
async function prints(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  const typed = "Lobby floor scuffed after delivery " + MARKUP;
  stubs.setTimeline([
    { id: "tl-x", createdAt: seed.shift(-1) + "T14:05:00Z", actionType: "issue_reported", actorName: "Tomasz Wisniewski", description: typed, entityType: "issue", entityId: "i-1", metadata: {} },
  ]);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  const raw = (html) => html.indexOf("<img src=x data-audit-markup") >= 0;
  try {
    await d.signIn("admin");
    await d.goto("staff"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
    await d.clearCaptures();
    await d.clickText("Print", { exact: true });
    const list = (await d.prints()).map((p) => p.html).join("");
    results.check(KIND, "october/prints/staff-timeline-escapes-what-staff-typed", !!list && !raw(list),
      !list ? "the timeline printed nothing" : "the printed timeline holds an issue title's markup as markup, in a window on the dashboard's own origin, where the session token is kept");
    await d.clearCaptures();
    await d.clickText("Lobby floor scuffed after delivery", { exact: false });
    await d.clickText("Print", { inModal: true, exact: true });
    const detail = (await d.prints()).map((p) => p.html).join("");
    results.check(KIND, "october/prints/staff-record-detail-escapes-what-staff-typed", !!detail && !raw(detail),
      !detail ? "Record Detail printed nothing" : "Record Detail's print holds the entry's markup as markup");
  } catch (e) {
    results.fail(KIND, "october/prints/suite", "threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
  } finally { await d.close(); }
}

// ---- a second press sends twice (contract 5.5, 5.16) ---------------------------------------------------
async function doublePress(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  try {
    await d.signIn("admin");
    await goHash(d, "schedule");
    await d.page.getByRole("button", { name: d.say("Schedule Shift") }).first().click();
    await d.page.locator("[data-schedule-shift-site]").first().waitFor();
    await d.page.locator("[data-schedule-shift-site]").selectOption(seed.SITES[0].id);
    await d.page.locator("[data-schedule-shift-staff] [data-person-pick-field]").click();
    await d.page.locator("[data-schedule-shift-staff] [data-person-pick-option]", { hasText: "Tomasz" }).first().click();
    await d.fillByLabel("Start Time", "18:00");
    await d.fillByLabel("End Time", "23:00");
    const mark = d.mark();
    await d.modal().getByRole("button", { name: d.say("Schedule Shift"), exact: true }).dblclick();
    await d.settle(600);
    const posts = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/schedule").length;
    results.check(KIND, "october/double-press/schedule-shift-sends-once", posts === 1,
      posts === 0 ? "Schedule Shift sent nothing" : "a double press on Schedule Shift sent " + posts + " shifts");
  } catch (e) {
    results.fail(KIND, "october/double-press/suite", "threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
  } finally { await d.close(); }
}

// ---- a tall window whose bottom cannot be reached (part 15) -------------------------------------------
// Add equipment is one of the five tall windows that draw no scroller of their own. On a phone, and on a
// laptop at the Largest text size, its last button is read against the window's own box, then the wheel is
// turned over the window and it is read again.
async function tallWindow(ctx, viewport, textSize) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  const d = await createDriver({ browser, origin, stubs, viewport, lang: "en", textSize });
  d.page.setDefaultTimeout(8000);
  const label = (viewport === "phone" ? "390" : "1024") + "-" + textSize;
  try {
    await d.signIn("admin");
    await goHash(d, "equipment");
    await d.page.getByRole("button", { name: d.say("Add equipment"), exact: true }).first().click();
    await d.page.locator("[data-equipment-window]").first().waitFor();
    await d.settle(300);
    const read = () => d.page.evaluate(() => {
      const win = document.querySelector("[data-equipment-window]");
      const box = win && win.parentElement;
      if (!box) return null;
      const b = box.getBoundingClientRect();
      const buttons = Array.from(box.querySelectorAll("button")).filter((x) => x.offsetParent !== null);
      const last = buttons[buttons.length - 1];
      const scrollers = [box].concat(Array.from(box.querySelectorAll("*"))).filter((el) => {
        const oy = getComputedStyle(el).overflowY;
        return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1;
      }).length;
      return { lastBottom: last ? last.getBoundingClientRect().bottom : null, lastText: last ? (last.innerText || "").trim() : "", boxBottom: b.bottom, viewBottom: window.innerHeight, scrollers };
    });
    const before = await read();
    const box = await d.page.locator("[data-equipment-window]").first().boundingBox();
    if (box) { await d.page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 200)); await d.page.mouse.wheel(0, 2000); await d.settle(200); }
    const after = await read();
    const reachable = !!after && after.lastBottom != null && after.lastBottom <= Math.min(after.boxBottom, after.viewBottom) + 1;
    results.check(KIND, "october/phone/tall-window-reaches-its-last-button/" + label, reachable,
      !after ? "Add equipment did not open" : "the last button, " + JSON.stringify(after.lastText) + ", sits at " + Math.round(after.lastBottom) + " px, below the window's bottom at " + Math.round(Math.min(after.boxBottom, after.viewBottom)) + " px, with " + after.scrollers + " scroller in the window, before and after the wheel" + (before && before.lastBottom !== after.lastBottom ? " (it moved from " + Math.round(before.lastBottom) + ")" : ""));
  } catch (e) {
    results.fail(KIND, "october/phone/suite/" + label, "threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
  } finally { await d.close(); }
}

// ---- time: the company's day on a laptop set to another zone ----------------------------------------
async function today(ctx, zone) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en", timezoneId: zone });
  d.page.setDefaultTimeout(8000);
  const label = zone === seed.TIMEZONE ? "new-york" : zone.toLowerCase().replace(/[^a-z]+/g, "-");
  try {
    await d.signIn("admin");
    await d.goto("hr");
    await d.clickText(d.say("Training"), { exact: true });
    await d.settle(300);
    await d.clickText(d.say("Log training for several people"), { exact: true });
    await d.settle(500);
    const day = await d.page.locator('input[aria-label="' + d.say("Completed Date") + '"]').first().inputValue().catch(() => null);
    results.check(KIND, "october/time/log-training-day-is-the-company-day/" + label, day === seed.TODAY,
      day === null ? "the window drew no Completed Date" : "at 9:30 PM in New York, on a browser set to " + zone + ", the window starts on " + day + " where the company's day is " + seed.TODAY);
    if (zone === seed.TIMEZONE) {
      // A site's Last Inspection is a date the API sends as a day (the stub's seed.shift(-7)).
      await d.closeModal();
      await goHash(d, "sites/s-1");
      await d.page.locator('[data-site-tab="shifts"]').first().click().catch(() => {});
      await d.settle(400);
      const shown = await d.page.evaluate((w) => {
        const lab = Array.from(document.querySelectorAll("div")).find((el) => el.children.length === 0 && (el.textContent || "").trim() === w);
        return lab && lab.previousElementSibling ? (lab.previousElementSibling.textContent || "").trim() : null;
      }, d.say("Last Inspection"));
      const sent = seed.shift(-7);
      const want = new Date(Number(sent.slice(0, 4)), Number(sent.slice(5, 7)) - 1, Number(sent.slice(8, 10))).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      results.check(KIND, "october/time/site-last-inspection-is-the-day-sent", shown === want,
        shown === null ? "no Last Inspection on the site's Shifts tab" : "the API sent " + sent + " and the site reads " + JSON.stringify(shown) + " where the day is " + JSON.stringify(want));
    }
  } catch (e) {
    results.fail(KIND, "october/time/suite/" + label, "threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
  } finally { await d.close(); }
}

// ---- links: no staff app address is built on the Vercel address --------------------------------------
function links(results) {
  const dir = path.join(ROOT, "build", "static", "js");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^main\..*\.js$/.test(f)) : [];
  const text = files.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("");
  const vercel = /https:\/\/[a-z0-9-]+\.vercel\.app/.exec(text);
  results.check(KIND, "october/links/no-vercel-address-in-the-build", files.length > 0 && !vercel,
    !files.length ? "no build to read" : vercel ? "the build made with no REACT_APP_PORTAL_URL holds " + vercel[0] + ", the staff app address Help's pictures are read from" : "");
}

async function run(ctx) {
  const { results } = ctx;
  stubSelfCheck(results);
  links(results);
  await supervisor(ctx);
  await notices(ctx, "admin");
  await notices(ctx, "supervisor146");
  await prints(ctx);
  await doublePress(ctx);
  await tallWindow(ctx, "phone", "standard");
  await tallWindow(ctx, "narrow", "largest");
  await today(ctx, seed.TIMEZONE);
  await today(ctx, "UTC");
}

module.exports = { run };
