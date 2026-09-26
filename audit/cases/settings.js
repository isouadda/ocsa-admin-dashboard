// Settings in the language the screen is drawn in, and what Settings saves.
//
// Settings edits the company's own records, so every value it saves is exactly what it saves in
// English. A pass saves the company's settings with the time zone and the pay period's first day
// chosen by the words the lists show for them, adds, edits and turns off a list and a list value,
// moves a value, deletes one, and adds and edits a site's value with its type chosen by its word,
// and holds each body the page sends to one written out here by hand. The bodies are the same in both
// languages: every list sends the code or the English of the choice whatever word it shows, and a
// value a person typed is sent as typed. A question the page asks before it deletes is the table's.
//
// The Dropdown Options editor draws each value as the English it was saved in, which is what Edit
// changes, and on a screen in another language the words that language draws it with, the
// displayLabel the API sent, on the line under it. A pass reads every value of the first list.
//
// The API sends a capability's name, a kind of report's name and a form's title in English only. The
// page draws each by its code, as the table's word for the English the dashboard knows the code by,
// and a code it does not know as the API names it; the stub sends one such capability. A pass reads
// every capability and group on Roles and Permissions for one person, and every kind of report and
// form on Who gets told, and holds each to that word. A role, in the person picker, in the line under
// the person's name, and beside a name on Who gets told, is the staff_roles list's shown label or the
// table's word for it. Roles and Permissions and Who gets told save the codes they always saved.
//
// The company, its lists and every value typed here are invented.
"use strict";
const fs = require("fs");
const path = require("path");

const APP = path.resolve(__dirname, "..", "..", "src", "App.js");

// A table the app keeps by code, one entry to a line, read out of src/App.js so the two cannot drift.
function codeTable(name) {
  const text = fs.readFileSync(APP, "utf8");
  const at = text.indexOf("const " + name + " = {");
  if (at < 0) return {};
  const block = text.slice(at, text.indexOf("};", at));
  const out = {};
  const re = /^\s*"?([\w-]+)"?: "([^"]+)",?$/gm;
  let m;
  while ((m = re.exec(block))) out[m[1]] = m[2];
  return out;
}
// The same for RL, which the app keeps on one line.
function lineTable(name) {
  const line = fs.readFileSync(APP, "utf8").split("\n").find((l) => l.indexOf("const " + name + " = {") === 0) || "";
  const out = {};
  const re = /(\w+): "([^"]+)"/g;
  let m;
  while ((m = re.exec(line))) out[m[1]] = m[2];
  return out;
}

// Chooses the option a select under a label shows as word, in the open window or on the page.
// Playwright's own selectOption is used, since React reverts a value set by hand on its next render.
async function pickShown(d, label, word) {
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
  try { await d.page.locator("select[data-audit-pick]").first().selectOption({ label: word }); } catch (e) { return false; }
  await d.settle(150);
  return true;
}

// Presses the button reading word in the smallest row of the page that holds text on its own.
async function pressInRow(d, text, word) {
  const hit = await d.page.evaluate(([txt, w]) => {
    const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
    const rows = Array.from(box.querySelectorAll("div")).filter((el) => el.children.length > 1
      && Array.from(el.querySelectorAll("*")).some((x) => x.children.length === 0 && x.textContent.trim() === txt)
      && Array.from(el.querySelectorAll("button")).some((b) => b.textContent.trim() === w));
    if (!rows.length) return false;
    rows.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length);
    Array.from(rows[0].querySelectorAll("button")).find((b) => b.textContent.trim() === w).click();
    return true;
  }, [text, word]);
  await d.settle(400);
  return hit;
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
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");
  const saves = [];
  const hold = (what, call, want) => {
    const off = sameBody(call, want);
    saves.push(what);
    results.check("page", "page/settings/saves/" + what + "/" + lang, off === null, off || "");
  };
  const openTab = async (tab) => {
    await d.goto("settings");
    await d.settle(400);
    if (tab) { await d.clickText(d.say(tab), { exact: true }); await d.settle(400); }
  };

  // ---- the Dropdown Options editor: each value's English, and its words in the screen's language
  await openTab("Dropdown Options");
  const lists = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/lookups/all" && Array.isArray(c.json)).pop();
  const first = lists && lists.json[0];
  const values = first ? first.values.slice().sort((a, b) => a.sort_order - b.sort_order) : [];
  // Each value's lines: its label, then its code in a monospace line, which also says when the value
  // asks for text. A list's own rows carry their slug the same way and never match a value's label.
  const rows = await d.page.evaluate(() => Array.from(document.querySelectorAll("div[style*='monospace']"))
    .map((el) => (el.parentElement ? Array.from(el.parentElement.children).map((x) => x.textContent.trim()) : []))
    .filter((lines) => lines.length >= 2));
  const shownAs = d.say("Shown as: {0}");
  const wrongRows = [];
  values.forEach((v, i) => {
    const code = v.value + (v.show_other_input ? " | " + d.say("prompts text input") : "");
    const want = lang === "en" ? [v.label, code] : [v.label, shownAs.replace("{0}", v.displayLabel || v.label), code];
    const got = rows.find((lines) => lines[0] === v.label);
    if (!got) wrongRows.push("value " + (i + 1) + " is not drawn as " + JSON.stringify(v.label));
    else if (JSON.stringify(got) !== JSON.stringify(want)) {
      wrongRows.push(JSON.stringify(v.label) + " reads " + JSON.stringify(got) + " where it should read " + JSON.stringify(want));
    }
  });
  results.check("page", "page/settings/lookup-editor/" + lang, values.length > 0 && wrongRows.length === 0,
    values.length === 0 ? "Dropdown Options was served no list" : wrongRows.length
      ? wrongRows.length + " of " + values.length + " values: " + wrongRows.slice(0, 3).join("; ")
      : values.length + " values drawn as their English" + (lang === "en" ? "" : ", each with the words this language draws it with"));

  // ---- what each save sends, held to a body written out by hand
  // The company's settings, with the time zone moved to Chicago and the pay period starting on Sunday,
  // each chosen by the words the list shows for it.
  stubs.reset();
  await openTab(null);
  let mark = d.mark();
  const zoned = await pickShown(d, d.say("Timezone"), d.say("Central Time (Chicago)"));
  const picked = zoned && await pickShown(d, d.say("Pay period start day"), d.say("Sunday"));
  if (picked) await d.clickText(d.say("Save Company Settings"), { exact: true });
  await d.settle(400);
  hold("company", picked ? sentSince(d, mark, "PATCH", /^\/api\/settings$/) : null, {
    legal_name: "Orchard Cove Service Alliance", display_name: "Orchard Cove", address: "1 Orchard Cove Way, Fairhaven PA 19044",
    phone: null, email: null, website: null, ein: "00-0000000", show_ein_on_reports: true, logo_url: null,
    primary_color: "#0A1628", secondary_color: "#E7B017", timezone: "America/Chicago", pay_period_start_day: "Sunday",
  });

  // A new list, its slug made from the label as it is typed.
  stubs.reset();
  await openTab("Dropdown Options");
  mark = d.mark();
  await d.clickText(d.say("+ Add"), { exact: true });
  await d.fillByLabel(d.say("Label *"), "Audit Equipment");
  await d.fillByLabel(d.say("Description"), "An invented list for the audit");
  await d.clickText(d.say("Create Category"), { inModal: true, exact: true });
  await d.settle(400);
  hold("add-list", sentSince(d, mark, "POST", /^\/api\/lookups\/categories$/), {
    label: "Audit Equipment", slug: "audit_equipment", description: "An invented list for the audit",
  });

  // The first list, saved as it opens: its English label and no description.
  mark = d.mark();
  await d.clickText(d.say("Edit"), { exact: true });
  await d.clickText(d.say("Save"), { inModal: true, exact: true });
  await d.settle(400);
  hold("edit-list", sentSince(d, mark, "PATCH", /^\/api\/lookups\/categories\/lk-1$/), { label: "Service categories", description: "" });

  // The first list, turned off.
  mark = d.mark();
  await d.clickText(d.say("Deactivate"), { exact: true });
  await d.settle(400);
  hold("list-off", sentSince(d, mark, "PATCH", /^\/api\/lookups\/categories\/lk-1$/), { is_active: false });

  // A new value in the first list, asking for text when chosen.
  stubs.reset();
  await openTab("Dropdown Options");
  mark = d.mark();
  await d.clickText(d.say("+ Add Value"), { exact: true });
  await d.fillByLabel(d.say("Value (stored) *"), "audit_value");
  await d.fillByLabel(d.say("Label (displayed) *"), "Audit Value");
  await d.fillByLabel(d.say("Color (optional)"), "#123456");
  await d.toggleSwitch(d.say("Show \"Other\" text input"));
  await d.clickText(d.say("Add Value"), { inModal: true, exact: true });
  await d.settle(400);
  hold("add-value", sentSince(d, mark, "POST", /^\/api\/lookups\/values$/), {
    value: "audit_value", label: "Audit Value", color: "#123456", show_other_input: true, category_id: "lk-1",
  });

  // The first value, saved as it opens: the English it was saved in, whatever the screen shows.
  mark = d.mark();
  await d.clickText(d.say("Edit"), { exact: true, nth: 1 });
  await d.clickText(d.say("Save"), { inModal: true, exact: true });
  await d.settle(400);
  hold("edit-value", sentSince(d, mark, "PATCH", /^\/api\/lookups\/values\/lv-1$/), {
    label: "Service Delivery", value: "SD", color: "#24A4F4", show_other_input: false,
  });

  // The first value, turned off, then moved down one.
  mark = d.mark();
  await pressInRow(d, "Service Delivery", d.say("Off|value"));
  hold("value-off", sentSince(d, mark, "PATCH", /^\/api\/lookups\/values\/lv-1$/), { is_active: false });
  mark = d.mark();
  await d.page.evaluate(() => {
    const down = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "\u25bc");
    if (down) down.click();
  });
  await d.settle(400);
  hold("move-value", sentSince(d, mark, "PATCH", /^\/api\/lookups\/reorder$/), {
    items: [{ id: "lv-1", sort_order: 2 }, { id: "lv-2", sort_order: 1 }],
  });

  // The first value, deleted after the table's question.
  await d.setConfirmAnswer(true);
  const asked = (await d.confirms()).length;
  mark = d.mark();
  await pressInRow(d, "Service Delivery", d.say("Del"));
  const question = (await d.confirms()).slice(asked)[0] || null;
  const deleted = sentSince(d, mark, "DELETE", /^\/api\/lookups\/values\/lv-1$/);
  results.check("page", "page/settings/saves/delete-value/" + lang, question === d.say("Delete this value?") && !!deleted,
    question !== d.say("Delete this value?") ? "the page asked " + JSON.stringify(question) + " where the table says " + JSON.stringify(d.say("Delete this value?"))
      : deleted ? "" : "no DELETE was sent");
  saves.push("delete-value");

  // A site's value, its type chosen by the word the list shows for building.
  stubs.reset();
  await openTab("Site Lookups");
  const site = seed.SITES[0];
  await d.pickOption(site.name);
  await d.settle(500);
  mark = d.mark();
  await d.clickText(d.say("+ Add"), { exact: true });
  const typed = await pickShown(d, d.say("Type"), d.say("Building"));
  await d.fillByLabel(d.say("Value *"), "Audit Hall");
  await d.clickText(d.say("Add"), { inModal: true, exact: true });
  await d.settle(400);
  hold("add-site-value", typed ? sentSince(d, mark, "POST", new RegExp("^/api/lookups/site/" + site.id + "$")) : null, {
    lookup_type: "building", value: "Audit Hall", label: "Audit Hall",
  });

  // The site's first zone, saved as it opens.
  mark = d.mark();
  await d.clickText(d.say("Edit"), { exact: true });
  await d.clickText(d.say("Save"), { inModal: true, exact: true });
  await d.settle(400);
  hold("edit-site-value", sentSince(d, mark, "PATCH", new RegExp("^/api/lookups/site/" + site.id + "/sl-1$")), {
    label: "Atrium", value: "atrium", lookup_type: "zone",
  });

  // ---- Roles and Permissions: a capability, a group and a role are words
  const CAPS = codeTable("CAPABILITY_LABELS");
  const TYPES = codeTable("NOTICE_TYPE_LABELS");
  const FORMS = codeTable("FORM_TITLE_LABELS");
  const RL = lineTable("RL");
  const lastJson = (re) => { const c = stubs.calls.filter((x) => x.method === "GET" && re.test(x.path) && x.json).pop(); return c ? c.json : null; };
  const roleList = () => (((lastJson(/^\/api\/lookups\/all$/) || []).find((x) => x.slug === "staff_roles") || {}).values || []);
  const roleWordFor = (code) => {
    const v = roleList().find((x) => x.value === code);
    return v ? (v.displayLabel || v.label) : (RL[code] ? d.say(RL[code]) : code);
  };
  const person = seed.STAFF[4];
  const openPerson = async () => {
    await openTab("Roles and Permissions");
    await d.pickPerson(person.name);
    await d.settle(500);
  };
  stubs.reset();
  await openPerson();
  const detail = lastJson(/^\/api\/users\/[^/]+\/permissions$/);
  const caps = (detail && detail.capabilities) || [];
  let lines = await d.readable();
  const capWrong = [];
  caps.forEach((c) => {
    const known = !!CAPS[c.key];
    const want = known ? d.say(CAPS[c.key]) : c.label;
    if (lines.indexOf(want) < 0) capWrong.push(c.key + " is not drawn as " + JSON.stringify(want));
    else if (known && lang !== "en" && want === c.label) capWrong.push(c.key + " has no word in this language, so it reads as the API's " + JSON.stringify(c.label));
    else if (known && lang !== "en" && lines.indexOf(c.label) >= 0) capWrong.push(c.key + " is also drawn as the API's " + JSON.stringify(c.label));
  });
  const groups = Array.from(new Set(caps.map((c) => c.group)));
  groups.forEach((g) => { if (lines.indexOf(d.say(g)) < 0) capWrong.push("the group " + JSON.stringify(g) + " is not drawn as " + JSON.stringify(d.say(g))); });
  const unknown = caps.filter((c) => !CAPS[c.key]).length;
  results.check("page", "page/settings/capabilities-are-words/" + lang, caps.length > 0 && unknown > 0 && capWrong.length === 0,
    caps.length === 0 ? "Roles and Permissions was served no capability" : unknown === 0 ? "the stub sent no capability the dashboard does not know"
      : capWrong.length ? capWrong.length + " of " + (caps.length + groups.length) + ": " + capWrong.slice(0, 3).join("; ")
        : (caps.length - unknown) + " capabilities drawn by their code, " + unknown + " as the API names it, and " + groups.length + " groups");

  // The person picker, and the line under the person's name, name a role as a word.
  const staffList = (lastJson(/^\/api\/users$/) || []);
  const people = Array.isArray(staffList) ? staffList : (staffList.users || []);
  const roleWrong = [];
  people.filter((u) => u.role).forEach((u) => {
    const name = ((u.first_name || u.firstName || "") + " " + (u.last_name || u.lastName || "")).trim();
    const want = name + "  (" + roleWordFor(u.role) + ")";
    if (lines.indexOf(want.replace(/\s+/g, " ")) < 0) roleWrong.push("the picker does not offer " + JSON.stringify(want));
  });
  const roleLine = d.say("Role: {0}. Default follows this role until you override it.").replace("{0}", roleWordFor(person.role));
  if (lines.indexOf(roleLine) < 0) roleWrong.push("the line under the name does not read " + JSON.stringify(roleLine));

  // A capability allowed for this person, and saved.
  mark = d.mark();
  const allowed = await pressInRow(d, d.say(CAPS.manage_tasks), d.say("Allow"));
  if (allowed) await d.clickText(d.say("Save changes"), { exact: true });
  await d.settle(400);
  hold("permissions", allowed ? sentSince(d, mark, "PUT", new RegExp("^/api/users/" + person.id + "/permissions$")) : null, {
    permissions: { manage_tasks: true },
  });

  // ---- Who gets told: a kind of report, a form and a role are words, and what it saves
  stubs.reset();
  await openTab("Who gets told");
  const told = lastJson(/^\/api\/notification-recipients$/) || {};
  lines = await d.readable();
  const typeWrong = [];
  (told.types || []).forEach((ty) => {
    const want = TYPES[ty.type] ? d.say(TYPES[ty.type]) : ty.label;
    if (lines.indexOf(want) < 0) typeWrong.push(ty.type + " is not drawn as " + JSON.stringify(want));
    else if (lang !== "en" && TYPES[ty.type] && want === ty.label) typeWrong.push(ty.type + " has no word in this language");
  });
  (told.forms || []).forEach((f) => {
    const want = (FORMS[f.code] ? d.say(FORMS[f.code]) : f.title) + " (" + f.code + ")";
    if (lines.indexOf(want) < 0) typeWrong.push(f.code + " is not drawn as " + JSON.stringify(want));
    else if (lang !== "en" && FORMS[f.code] && d.say(FORMS[f.code]) === f.title) typeWrong.push(f.code + " has no title in this language");
  });
  results.check("page", "page/settings/notice-types-are-words/" + lang,
    (told.types || []).length > 0 && (told.forms || []).length > 0 && typeWrong.length === 0,
    !(told.types || []).length ? "Who gets told was served no kind of report" : typeWrong.length
      ? typeWrong.length + ": " + typeWrong.slice(0, 3).join("; ")
      : (told.types || []).length + " kinds of report and " + (told.forms || []).length + " forms drawn by their codes");

  (told.recipients || []).filter((r) => r.isActive && r.user && r.user.role).forEach((r) => {
    const want = r.user.name + " (" + roleWordFor(r.user.role) + ")";
    if (lines.indexOf(want) < 0) roleWrong.push("Who gets told does not name " + JSON.stringify(want));
  });
  results.check("page", "page/settings/roles-are-words/" + lang, roleWrong.length === 0 && people.length > 0,
    people.length === 0 ? "the person picker was served nobody" : roleWrong.slice(0, 3).join("; "));

  // The first kind of report: a person added, chosen by the name and role word the list shows, then
  // an outside address, then the second person already told has email turned on, then is removed.
  const kind = (told.types || [])[0] || { type: "issue", label: "" };
  const firstName = TYPES[kind.type] ? d.say(TYPES[kind.type]) : kind.label;
  const newcomer = seed.STAFF[4];
  mark = d.mark();
  const picker = d.page.locator('select[aria-label="' + d.say("Add a person to {0}").replace("{0}", firstName) + '"]').first();
  let chosen = false;
  if ((await picker.count()) > 0) {
    try { await picker.selectOption({ label: newcomer.name + " (" + roleWordFor(newcomer.role) + ")" }); chosen = true; } catch (e) { chosen = false; }
  }
  if (chosen) {
    await d.settle(200);
    await picker.locator("xpath=../following-sibling::button[1]").click().catch(() => {});
  }
  await d.settle(500);
  hold("add-person", chosen ? sentSince(d, mark, "POST", /^\/api\/notification-recipients$/) : null, { subjectType: kind.type, userId: newcomer.id });

  mark = d.mark();
  const box = d.page.locator('input[aria-label="' + d.say("Add an email address to {0}").replace("{0}", firstName) + '"]').first();
  const typedEmail = (await box.count()) > 0;
  if (typedEmail) {
    await box.fill("audit.notice@example.invalid");
    await box.locator("xpath=../following-sibling::button[1]").click().catch(() => {});
  }
  await d.settle(500);
  hold("add-address", typedEmail ? sentSince(d, mark, "POST", /^\/api\/notification-recipients$/) : null, { subjectType: kind.type, email: "audit.notice@example.invalid" });

  const held = (told.recipients || []).find((r) => r.isActive && r.user && r.subjectType === kind.type && !r.viaEmail);
  const heldName = held ? held.user.name + " (" + roleWordFor(held.user.role) + ")" : "";
  mark = d.mark();
  const toggled = held ? await pressInRow(d, heldName, d.say("Email")) : false;
  hold("email-on", toggled ? sentSince(d, mark, "PATCH", /^\/api\/notification-recipients\/[^/]+$/) : null, { viaEmail: true });

  // The first form's email carries the report as a PDF.
  mark = d.mark();
  await d.clickText(d.say("Attach the filled report as a PDF"), { exact: true });
  await d.settle(400);
  const firstForm = (told.forms || [])[0] || { code: "" };
  hold("delivery", sentSince(d, mark, "PATCH", new RegExp("^/api/notification-recipients/forms/" + firstForm.code + "$")), { delivery: "pdf" });

  // The person told about the first kind of report, removed after the table's question.
  mark = d.mark();
  const removing = held ? await pressInRow(d, heldName, d.say("Remove")) : false;
  const asking = removing ? (await d.bodyText()).indexOf(d.say("Stop telling {0} about this?").replace("{0}", heldName)) >= 0 : false;
  if (asking) await d.page.locator('button[aria-label="' + d.say("Remove {0}").replace("{0}", heldName) + '"]').first().click().catch(() => {});
  await d.settle(500);
  const removed = held ? sentSince(d, mark, "DELETE", new RegExp("^/api/notification-recipients/" + held.id + "$")) : null;
  results.check("page", "page/settings/saves/remove-person/" + lang, asking && !!removed,
    !held ? "nobody was told about the first kind of report" : !asking ? "the page did not ask " + JSON.stringify(d.say("Stop telling {0} about this?").replace("{0}", heldName))
      : removed ? "" : "no DELETE was sent");
  saves.push("remove-person");

  stubs.reset();
  results.note("Settings in " + lang + ": " + values.length + " list values, " + caps.length + " capabilities and " + (told.types || []).length
    + " kinds of report read, and " + saves.length + " saves held to their bodies");
}

module.exports = { run };
