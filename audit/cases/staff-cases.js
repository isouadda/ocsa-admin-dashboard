// Staff Management and Cases in the language the screen is drawn in, what Staff Management saves, and
// what a person typed into a case.
//
// Staff Management draws a role, a status and an employment type as a word: a role as the
// displayLabel of the pick list the API serves for it, or the word the table has for it when the list
// does not hold it, and a status and an employment type as the table's word. Each stays the code it is
// on the wire. A pass reads the Status, Role and Employment columns of every person on the list's
// first page, and the banner of the first person's profile, and holds each to that word. A code the
// page has no word for would still be drawn as it arrives, so the code itself is never an answer here.
//
// The same profile's HR Files tab lists the person's onboarding steps. A step is done when the API
// says is_completed, on its completed_date, the two fields GET /api/hr/onboarding/:user_id sends and
// HR Records reads; until Step 139 the tab read completed_at, which the API never sends, so no step
// ever showed as done. A pass holds every step to what was served: a done step carries its tick and
// the line saying the day it was done, and a step that is not done carries neither.
//
// Staff Management edits people, so every value it saves is exactly what it saves in English. A pass
// adds a person, edits one from the list, edits a profile, assigns a site, adds a certification,
// deactivates a person and resets a PIN. It chooses a role, an employment type, a language, a role at
// the site, a shift and a certification type from their lists, and holds each body to the one written
// out here by hand. The bodies are the same in both languages, since every list sends the code of the
// choice whatever word it shows.
//
// Cases draws a case's status, the response clock, a role and what the log says a person did as the
// table's words, and everything a person typed into a case, a summary, resolution notes and every
// name, exactly as it arrived. A pass reads every row of the list and every case's window. The first
// case's summary and the third's notes carry a bar, where the word table would cut the text if it
// went through it, so text that went through the table reads short in either language.
"use strict";
const fs = require("fs");
const path = require("path");

const APP = path.resolve(__dirname, "..", "..", "src", "App.js");

// A table the app keeps on one line, RL for the roles and ET for the employment types, read out of
// src/App.js so the two cannot drift.
function lineTable(name) {
  const line = fs.readFileSync(APP, "utf8").split("\n").find((l) => l.indexOf("const " + name + " = {") === 0) || "";
  const out = {};
  const re = /(\w+): "([^"]+)"/g;
  let m;
  while ((m = re.exec(line))) out[m[1]] = m[2];
  return out;
}

// The table's key for each status a person can have.
const STATE = { active: "active|person", inactive: "inactive|person", pending: "pending", terminated: "terminated|person" };

// A table Cases keeps as code: key, then the English the table is given for it, read out of
// src/App.js so the two cannot drift.
function pageTable(name) {
  const line = fs.readFileSync(APP, "utf8").split("\n").find((l) => l.indexOf("const " + name + " = {") >= 0) || "";
  const out = {};
  const re = /(\w+): tr\("([^"]+)"\)/g;
  let m;
  while ((m = re.exec(line))) out[m[1]] = m[2];
  return out;
}
// The response clock's words, by the code the API sends, written out here.
const CLOCK = { on_time: "On time|case", due_soon: "Due soon|case", overdue: "Overdue|case", responded: "Responded|case", closed_without_response: "Closed, no response" };
// What the log draws for an entry the system wrote: the company's tag, from the client config.
const BRAND = (fs.readFileSync(path.resolve(__dirname, "..", "..", "src", "clientConfig.js"), "utf8").match(/brandTag:\s*'([^']+)'/) || [])[1] || "";

// Chooses a value in the select under a label, in the open window or on the page. Playwright's own
// selectOption is used, since React reverts a value set by hand on its next render.
async function pickByLabel(d, label, value) {
  const found = await d.page.evaluate((lbl) => {
    document.querySelectorAll("[data-audit-pick]").forEach((x) => x.removeAttribute("data-audit-pick"));
    const box = document.querySelector("div[style*='z-index: 500']") || document.body;
    const norm = (s0) => String(s0 || "").replace(/[*\s]+/g, " ").trim().toLowerCase();
    const lab = Array.from(box.querySelectorAll("label")).find((l) => norm(l.textContent) === norm(lbl));
    const sel = lab && lab.parentElement && lab.parentElement.querySelector("select");
    if (!sel) return false;
    sel.setAttribute("data-audit-pick", "1");
    return true;
  }, label);
  if (!found) return false;
  try { await d.page.locator("select[data-audit-pick]").first().selectOption(value); } catch (e) { return false; }
  await d.settle(150);
  return true;
}

// The last call to a route since a mark.
const sentSince = (d, mark, method, re) => d.callsSince(mark).filter((c) => c.method === method && re.test(c.path)).pop();

// A body held to the one written out by hand: every field, with the same value, and nothing more.
function sameBody(call, want) {
  if (!call) return "nothing was sent";
  const got = call.body || {};
  const keys = Array.from(new Set(Object.keys(got).concat(Object.keys(want)))).sort();
  const off = keys.filter((k) => JSON.stringify(got[k]) !== JSON.stringify(want[k]));
  return off.length === 0 ? null
    : off.map((k) => k + " sent " + JSON.stringify(got[k]) + " where the body written by hand has " + JSON.stringify(want[k])).join("; ");
}

async function run({ d, results, seed, stubs, lang }) {
  const RL = lineTable("RL");
  const ET = lineTable("ET");
  const CASE_STATE = {};
  const statusWords = pageTable("statusLabel");
  Object.keys(statusWords).forEach((k) => { CASE_STATE[k] = statusWords[k]; });
  const ACTION = pageTable("actionLabel");
  const p0 = seed.STAFF[0];
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");

  // ---- the words a role, a status and an employment type are drawn as
  await d.goto("staff");
  await d.settle(500);
  const lookups = stubs.calls.filter((c) => c.path === "/api/lookups/all" && Array.isArray(c.json)).pop();
  const roleList = lookups ? ((lookups.json.find((x) => x.slug === "staff_roles") || {}).values || []) : [];
  const roleWordFor = (code) => {
    const v = roleList.find((x) => x.value === code);
    return v ? (v.displayLabel || v.label) : (RL[code] ? d.say(RL[code]) : null);
  };
  const stateWordFor = (code) => (STATE[code] ? d.say(STATE[code]) : null);
  const employmentWordFor = (code) => (code ? (ET[code] ? d.say(ET[code]) : null) : "-");
  const listCall = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/users" && !c.query && Array.isArray(c.json)).pop();
  const people = listCall ? listCall.json : [];
  const byPhone = {};
  people.forEach((p) => { byPhone[p.phone] = p; });
  // Each row's cells: the name, the phone, the status, the role, the employment type and the sites.
  const rows = await d.page.evaluate(() => Array.from(document.querySelectorAll("table tbody tr"))
    .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => String(td.textContent || "").replace(/\s+/g, " ").trim()))
    .filter((cells) => cells.length >= 6));
  const wrong = [];
  rows.forEach((cells) => {
    const p = byPhone[cells[1]];
    if (!p) { wrong.push("a row whose phone is nobody's on the list"); return; }
    const want = [stateWordFor(p.status), roleWordFor(p.role), employmentWordFor(p.employmentType)];
    const got = [cells[2], cells[3], cells[4]];
    ["status", "role", "employment type"].forEach((what, i) => {
      if (got[i] !== want[i]) wrong.push("a " + what + " drawn as " + JSON.stringify(got[i]) + " where the word is " + JSON.stringify(want[i]));
    });
  });
  results.check("page", "page/staff/codes-are-words/list/" + lang, rows.length > 0 && wrong.length === 0,
    rows.length === 0 ? "the list drew no rows" : wrong.length + " of " + (rows.length * 3) + " cells: " + wrong.slice(0, 3).join("; "));

  // The first person's banner: the role, the employment type in brackets, and the status.
  await d.clickRow(0);
  await d.settle(500);
  const first = people.find((p) => p.id === p0.id) || p0;
  const banner = await d.page.evaluate((name) => {
    const span = Array.from(document.querySelectorAll("span")).find((s) => s.textContent.trim() === name && /font-size: 20px/.test(s.getAttribute("style") || ""));
    const box = span && span.parentElement && span.parentElement.parentElement;
    if (!box) return null;
    const kids = Array.from(box.children);
    return { subtitle: kids[1] ? kids[1].textContent.trim() : "", badge: kids[2] && kids[2].querySelector("span") ? kids[2].querySelector("span").textContent.trim() : "" };
  }, first.name);
  const wantSubtitle = roleWordFor(first.role) + (first.employmentType ? " (" + employmentWordFor(first.employmentType) + ")" : "");
  const wantBadge = stateWordFor(first.status);
  results.check("page", "page/staff/codes-are-words/banner/" + lang, !!banner && banner.subtitle === wantSubtitle && banner.badge === wantBadge,
    !banner ? "the first person's profile did not open or drew no banner"
      : "the banner says " + JSON.stringify(banner.subtitle) + " and " + JSON.stringify(banner.badge) + " where the words are "
        + JSON.stringify(wantSubtitle) + " and " + JSON.stringify(wantBadge));

  // ---- the onboarding steps on the first person's HR Files tab
  await d.clickText(d.say("HR Files"), { exact: true });
  await d.settle(500);
  const onbCall = stubs.calls.filter((c) => c.method === "GET" && /^\/api\/hr\/onboarding\/[^/]+$/.test(c.path) && Array.isArray(c.json)).pop();
  const stepsServed = onbCall ? onbCall.json : [];
  const onb = await d.page.evaluate(([head, completed, tag, served]) => {
    const title = Array.from(document.querySelectorAll("div")).find((el) => el.children.length === 0 && el.textContent.trim() === head);
    const card = title && title.parentElement;
    if (!card) return null;
    // The day a step was done, formatted the way the page formats it.
    const day = (ymd) => { const [y, m, dd] = String(ymd).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString(tag, { month: "short", day: "numeric", year: "numeric" }); };
    return {
      drawn: Array.from(card.children).slice(1).map((row) => {
        const lines = row.children[1] ? Array.from(row.children[1].children).map((el) => el.textContent.trim()) : [];
        return { name: lines[0] || "", done: !!(row.children[0] && row.children[0].querySelector("svg")), line: lines[1] || "" };
      }),
      want: served.map((st) => ({ name: st.step_name, done: !!st.is_completed,
        line: st.is_completed && st.completed_date ? completed.replace("{0}", day(st.completed_date)) : "" })),
    };
  }, [d.say("Onboarding Steps"), d.say("Completed {0}"), require("../lib/words").localeTagFor(lang), stepsServed]);
  const onbWrong = !onb ? [] : onb.want.map((w, i) => {
    const got = onb.drawn[i];
    if (!got) return JSON.stringify(w.name) + " is not drawn";
    if (got.name !== w.name) return "step " + (i + 1) + " is " + JSON.stringify(got.name) + " where the API sent " + JSON.stringify(w.name);
    if (got.done !== w.done) return JSON.stringify(w.name) + (w.done ? " is done and carries no tick" : " is not done and carries a tick");
    if (got.line !== w.line) return JSON.stringify(w.name) + " says " + JSON.stringify(got.line) + " where it should say " + JSON.stringify(w.line);
    return null;
  }).filter(Boolean);
  const doneServed = stepsServed.filter((st) => st.is_completed).length;
  results.check("page", "page/staff/onboarding-steps/" + lang, !!onb && stepsServed.length > 0 && doneServed > 0 && onbWrong.length === 0,
    !onb ? "the HR Files tab drew no onboarding steps" : stepsServed.length === 0 ? "no onboarding steps were served"
      : onbWrong.length ? onbWrong.length + " of " + stepsServed.length + " steps: " + onbWrong.slice(0, 3).join("; ")
        : doneServed + " of " + stepsServed.length + " steps drawn as done, each with its day");

  // ---- what each save sends, held to a body written out by hand
  const saves = [];
  const hold = (what, call, want) => {
    const off = sameBody(call, want);
    saves.push(what);
    results.check("page", "page/staff/saves/" + what + "/" + lang, off === null, off || "");
  };
  const openFirst = async (tab) => {
    await d.goto("staff");
    await d.clickRow(0);
    await d.settle(500);
    if (tab) { await d.clickText(d.say(tab), { exact: true }); await d.settle(300); }
  };

  // A new person, with a role and an employment type chosen from their lists.
  stubs.reset();
  await d.goto("staff");
  let mark = d.mark();
  await d.clickText(d.say("Add Staff"), { exact: true });
  await d.fillByLabel(d.say("First Name *"), "Audit");
  await d.fillByLabel(d.say("Last Name"), "Newhire");
  await d.fillByLabel(d.say("Phone *"), "2155550199");
  await d.fillByLabel(d.say("Email *"), "audit.newhire@example.invalid");
  await d.fillByLabel(d.say("Employee ID"), "EMP-2001");
  await pickByLabel(d, d.say("Role"), "day_porter");
  await pickByLabel(d, d.say("Employment Type"), "part_time");
  await d.clickText(d.say("Add Staff"), { inModal: true, exact: true });
  await d.settle(400);
  hold("add", sentSince(d, mark, "POST", /^\/api\/users$/), {
    firstName: "Audit", lastName: "Newhire", phone: "2155550199", email: "audit.newhire@example.invalid",
    employeeId: "EMP-2001", role: "day_porter", employmentType: "part_time",
  });

  // The first person, edited from the list: a new role, employment type and rate.
  stubs.reset();
  await d.goto("staff");
  mark = d.mark();
  await d.clickTitle(d.say("Edit"));
  await pickByLabel(d, d.say("Role"), "custodial_lead");
  await pickByLabel(d, d.say("Employment Type"), "supplemental");
  await d.fillByLabel(d.say("Hourly Rate"), "19.25");
  await d.clickText(d.say("Save Changes"), { inModal: true, exact: true });
  await d.settle(400);
  hold("edit", sentSince(d, mark, "PATCH", new RegExp("^/api/users/" + p0.id + "$")), {
    id: p0.id, firstName: p0.first_name, lastName: p0.last_name, phone: p0.phone, email: p0.email,
    role: "custodial_lead", employeeId: p0.employee_id, hourlyRate: "19.25", employmentType: "supplemental",
  });

  // The first person's profile, edited: a role, an employment type, a language and a city. Everything
  // else goes back as the profile was served.
  stubs.reset();
  await openFirst(null);
  const profileCall = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/users/profile/" + p0.id && c.json && c.json.user).pop();
  const u = profileCall ? profileCall.json.user : {};
  mark = d.mark();
  await d.clickText(d.say("Edit"), { exact: true });
  await pickByLabel(d, d.say("Role"), "supervisor");
  await pickByLabel(d, d.say("Employment Type"), "part_time");
  await pickByLabel(d, d.say("Preferred Language"), "en");
  await d.fillByLabel(d.say("City"), "Riverton");
  await d.clickText(d.say("Save Changes"), { exact: true });
  await d.settle(400);
  hold("profile", sentSince(d, mark, "PATCH", new RegExp("^/api/users/" + p0.id + "$")), {
    firstName: p0.first_name, lastName: p0.last_name, phone: p0.phone, email: p0.email,
    role: "supervisor", employmentType: "part_time", employeeId: p0.employee_id, hourlyRate: u.hourlyRate || "",
    birthday: "", addressLine1: "", addressLine2: "", city: "Riverton", state: "", zipCode: "",
    emergencyContactName: u.emergencyContactName || "", emergencyContactPhone: u.emergencyContactPhone || "",
    preferredLanguage: "en", personalNotes: "",
  });

  // A site, with a role at the site and a shift chosen from their lists.
  stubs.reset();
  await openFirst("Assignments");
  mark = d.mark();
  await d.clickText(d.say("Assign"), { exact: true });
  await pickByLabel(d, d.say("Site *"), seed.SITES[1].id);
  await pickByLabel(d, d.say("Role at Site"), "Porter");
  await pickByLabel(d, d.say("Shift"), "Day");
  await d.fillByLabel(d.say("Start"), "07:00");
  await d.fillByLabel(d.say("End"), "15:30");
  await d.clickText(d.say("Assign"), { inModal: true, exact: true });
  await d.settle(400);
  hold("assign-site", sentSince(d, mark, "POST", new RegExp("^/api/users/" + p0.id + "/assign-site$")), {
    siteId: seed.SITES[1].id, roleAtSite: "Porter", shiftName: "Day", shiftStart: "07:00", shiftEnd: "15:30",
  });

  // A certification, with its type chosen from its list.
  stubs.reset();
  await openFirst("Certifications");
  mark = d.mark();
  await d.clickText(d.say("Add"), { exact: true });
  await d.fillByLabel(d.say("Certification Name *"), "Floor care basics");
  await pickByLabel(d, d.say("Type"), "license");
  await d.fillByLabel(d.say("Issuing Body"), "In-house");
  await d.fillByLabel(d.say("Issued Date"), "2026-01-10");
  await d.fillByLabel(d.say("Expiry Date"), "2027-01-10");
  await d.clickText(d.say("Add Certification"), { inModal: true, exact: true });
  await d.settle(400);
  hold("certification", sentSince(d, mark, "POST", new RegExp("^/api/users/" + p0.id + "/certifications$")), {
    userId: p0.id, certName: "Floor care basics", certType: "license", issuingBody: "In-house",
    issuedDate: "2026-01-10", expiryDate: "2027-01-10",
  });

  // The first person deactivated, which saves the status's code.
  stubs.reset();
  await openFirst(null);
  mark = d.mark();
  await d.clickText(d.say("Deactivate"), { exact: true });
  await d.settle(400);
  hold("deactivate", sentSince(d, mark, "PATCH", new RegExp("^/api/users/" + p0.id + "$")), { status: "inactive" });

  // A new PIN.
  stubs.reset();
  await openFirst(null);
  mark = d.mark();
  await d.clickText(d.say("Reset PIN"), { exact: true });
  await d.fillByLabel(d.say("New PIN (4 digits)"), "4821");
  await d.clickText(d.say("Reset PIN"), { inModal: true, exact: true });
  await d.settle(400);
  hold("reset-pin", sentSince(d, mark, "POST", new RegExp("^/api/users/" + p0.id + "/reset-pin$")), { newPin: "4821" });

  stubs.reset();
  results.note("Staff Management in " + lang + ": " + rows.length + " people read for their status, role and employment type, the first profile's banner, and "
    + saves.length + " saves held to their bodies");

  // ---- Cases: the words a status, the response clock, a role and the log's actions are drawn as,
  // and what a person typed, drawn exactly as it arrives.
  stubs.reset();
  await d.goto("cases");
  await d.clickText(d.say("All|cases"), { exact: true });
  await d.settle(500);
  const casesCall = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/hr-cases" && c.json && Array.isArray(c.json.cases)).pop();
  // The list's order: overdue, due soon and on time first, each oldest first, then the rest, the open
  // ones first.
  const RANK = { overdue: 0, due_soon: 1, on_time: 2 };
  const OPEN = ["open", "in_review", "escalated"];
  const cases = (casesCall ? casesCall.json.cases : []).slice().sort((a, b) => {
    const ar = RANK[a.clock] === undefined ? 3 : RANK[a.clock], br = RANK[b.clock] === undefined ? 3 : RANK[b.clock];
    if (ar !== br) return ar - br;
    const ao = OPEN.indexOf(a.status) >= 0 ? 0 : 1, bo = OPEN.indexOf(b.status) >= 0 ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  const caseRows = await d.page.evaluate(() => Array.from(document.querySelectorAll("table tbody tr"))
    .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => String(td.textContent || "").replace(/\s+/g, " ").trim()))
    .filter((cells) => cells.length >= 6));
  const listWrong = [];
  cases.forEach((c, i) => {
    const cells = caseRows[i] || [];
    const status = d.say(CASE_STATE[c.status] || c.status);
    const clock = CLOCK[c.clock] ? d.say(CLOCK[c.clock]) : "";
    const held = c.assignedTo && c.assignedTo.name ? c.assignedTo.name : d.say("Unheld");
    if (cells[2] !== status) listWrong.push("a status drawn as " + JSON.stringify(cells[2]) + " where the word is " + JSON.stringify(status));
    if (String(cells[0] || "").indexOf(clock) !== 0) listWrong.push("a response drawn as " + JSON.stringify(cells[0]) + " where it starts with " + JSON.stringify(clock));
    if (cells[5] !== held) listWrong.push("the holder drawn as " + JSON.stringify(cells[5]) + " where it is " + JSON.stringify(held));
  });
  results.check("page", "page/cases/codes-are-words/list/" + lang, caseRows.length > 0 && caseRows.length === cases.length && listWrong.length === 0,
    caseRows.length === 0 ? "the list drew no rows" : caseRows.length !== cases.length ? "the list drew " + caseRows.length + " rows for " + cases.length + " cases"
      : listWrong.slice(0, 3).join("; "));

  // Each case's window: its summary, its resolution notes and every name exactly as they arrived, and
  // its log's roles and actions as words.
  const typedWrong = [];
  const logWrong = [];
  let logRows = 0;
  for (let i = 0; i < cases.length; i += 1) {
    await d.goto("cases");
    await d.clickText(d.say("All|cases"), { exact: true });
    await d.settle(400);
    await d.clickRow(i);
    await d.settle(700);
    const c = cases[i];
    const detailCall = stubs.calls.filter((x) => x.method === "GET" && x.path === "/api/hr-cases/" + c.id && x.json).pop();
    const served = detailCall ? detailCall.json : c;
    const logCall = stubs.calls.filter((x) => x.method === "GET" && x.path === "/api/hr-cases/" + c.id + "/access-log" && x.json).pop();
    const drawn = await d.page.evaluate(([summaryWord, notesWord, fieldWords]) => {
      const box = Array.from(document.querySelectorAll("div[style*='z-index: 500']")).pop();
      if (!box) return null;
      const labels = Array.from(box.querySelectorAll("label"));
      const byLabel = (w) => labels.find((l) => l.textContent.trim() === w);
      const sumLabel = byLabel(summaryWord);
      const notes = byLabel(notesWord) && byLabel(notesWord).parentElement.querySelector("textarea");
      // A field is its label's own words with the value in the div under them.
      const fields = {};
      fieldWords.forEach((w) => {
        const el = Array.from(box.querySelectorAll("div")).find((x) => x.firstChild && x.firstChild.nodeType === 3 && x.firstChild.textContent.trim() === w && x.querySelector("div"));
        fields[w] = el ? el.querySelector("div").textContent : null;
      });
      const log = Array.from(box.querySelectorAll("div")).filter((x) => /justify-content: space-between/.test(x.getAttribute("style") || "") && /border-bottom/.test(x.getAttribute("style") || ""))
        .map((x) => (x.querySelector("span") ? x.querySelector("span").textContent : ""));
      return { summary: sumLabel && sumLabel.nextElementSibling ? sumLabel.nextElementSibling.textContent : null, notes: notes ? notes.value : null, fields, log };
    }, [d.say("Summary"), d.say("Resolution notes"), [d.say("Held by"), d.say("Reported by"), d.say("Subject named"), d.say("Escalated to")]]);
    if (!drawn) { typedWrong.push("case " + (i + 1) + " did not open"); await d.closeModal().catch(() => {}); continue; }
    const want = {};
    want[d.say("Held by")] = served.assignedTo && served.assignedTo.name ? served.assignedTo.name : d.say("Nobody yet");
    want[d.say("Reported by")] = served.reportedBy && served.reportedBy.name ? served.reportedBy.name : "-";
    want[d.say("Subject named")] = served.subject && served.subject.name ? served.subject.name : d.say("No");
    want[d.say("Escalated to")] = served.escalatedTo && served.escalatedTo.name ? served.escalatedTo.name : "-";
    if (drawn.summary !== served.summary) typedWrong.push("case " + (i + 1) + "'s summary is drawn as " + JSON.stringify(drawn.summary) + " where it was typed as " + JSON.stringify(served.summary));
    if (drawn.notes !== (served.resolutionNotes || "")) typedWrong.push("case " + (i + 1) + "'s resolution notes read " + JSON.stringify(drawn.notes) + " where they were typed as " + JSON.stringify(served.resolutionNotes || ""));
    Object.keys(want).forEach((w) => {
      if (drawn.fields[w] !== want[w]) typedWrong.push("case " + (i + 1) + "'s " + w + " reads " + JSON.stringify(drawn.fields[w]) + " where it is " + JSON.stringify(want[w]));
    });
    const entries = logCall && Array.isArray(logCall.json.entries) ? logCall.json.entries : [];
    entries.forEach((e, k) => {
      logRows += 1;
      const line = (e.name || BRAND) + (e.role ? " (" + (RL[e.role] ? d.say(RL[e.role]) : e.role) + ")" : "") + " " + (ACTION[e.action] ? d.say(ACTION[e.action]) : e.action);
      if (drawn.log[k] !== line) logWrong.push("case " + (i + 1) + "'s log reads " + JSON.stringify(drawn.log[k]) + " where it is " + JSON.stringify(line));
    });
    await d.closeModal().catch(() => {});
  }
  results.check("page", "page/cases/as-typed/" + lang, cases.length > 0 && typedWrong.length === 0,
    cases.length === 0 ? "no case was served" : typedWrong.slice(0, 3).join("; "));
  results.check("page", "page/cases/codes-are-words/log/" + lang, logRows > 0 && logWrong.length === 0,
    logRows === 0 ? "no case's log drew a row" : logWrong.slice(0, 3).join("; "));
  stubs.reset();
  results.note("Cases in " + lang + ": " + caseRows.length + " rows read for their status, response and holder, and "
    + cases.length + " windows for what was typed and " + logRows + " log rows for their words");
}

module.exports = { run };
