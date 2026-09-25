// Staff Management in the language the screen is drawn in, and what it saves.
//
// Staff Management draws a role, a status and an employment type as a word: a role as the
// displayLabel of the pick list the API serves for it, or the word the table has for it when the list
// does not hold it, and a status and an employment type as the table's word. Each stays the code it is
// on the wire. A pass reads the Status, Role and Employment columns of every person on the list's
// first page, and the banner of the first person's profile, and holds each to that word. A code the
// page has no word for would still be drawn as it arrives, so the code itself is never an answer here.
//
// Staff Management edits people, so every value it saves is exactly what it saves in English. A pass
// adds a person, edits one from the list, edits a profile, assigns a site, adds a certification,
// deactivates a person and resets a PIN. It chooses a role, an employment type, a language, a role at
// the site, a shift and a certification type from their lists, and holds each body to the one written
// out here by hand. The bodies are the same in both languages, since every list sends the code of the
// choice whatever word it shows.
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
}

module.exports = { run };
