// Every staff picker fills for a supervisor.
//
// The staff list the shell reads, GET /api/users, is an admin's (manage_staff), and until Step 146 every
// picker built from it was empty for a supervisor: Assign To on Assigned Tasks, Schedule's people and
// its shift windows' Staff, the reassign list on a pickup, HR Records' person filter and + Add Document's
// Employee list. Since Step 146 the shell reads a supervisor's people from GET /api/hr/employees-summary
// when the API refuses the list, through one helper, and Inspections' Assigned Supervisor falls back the
// same way. The stub refuses GET /api/users to anyone without manage_staff, the way the API does, so this
// suite drives each picker as the supervisor the API lets in and holds it to the seed's active people,
// then reads the same pickers as an admin, whose lists do not change.
//
// Every claim is read in English and in Spanish at 1024, and what a picker sends is held to the id of
// the person picked. Each check here was broken on purpose once and seen to fail; the break is named
// beside it.
"use strict";

const WINDOW = "div[style*='z-index: 500']";

// The seed's people by the list each picker draws: everyone active, the active people who are not
// admins, the active supervisors, and a site's active people with every active admin, which is who
// Schedule's site filter keeps.
function world(seed) {
  const active = seed.STAFF.filter((p) => p.status === "active");
  const names = (list) => list.map((p) => p.name);
  const byName = {};
  seed.STAFF.forEach((p) => { byName[p.name] = p; });
  return {
    byName,
    everyone: names(active),
    staff: names(active.filter((p) => p.role !== "admin")),
    supervisors: names(active.filter((p) => p.role === "supervisor")),
    atSite: (siteName) => names(active.filter((p) => p.site_name === siteName || p.role === "admin")),
  };
}
// hand: ten of the twelve are active. Two are admins, so eight are staff; two are supervisors. Harbor
// Point Center has Elena Barbosa and Bertrand Lefevre active beside the two admins, who are at that site
// as well, so its list under the site filter is four.

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.indexOf(x) >= 0);
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

// The choices a picker offers under a label, the empty choice left out: the label as drawn (upper case
// is by style only, so textContent is read), then the select beside it. In the open window when one is
// open, on the page otherwise.
function optionsUnder(d, label, inModal) {
  return d.page.evaluate(([lbl, modal, sel]) => {
    const roots = Array.from(document.querySelectorAll(sel));
    const root = modal ? (roots.length ? roots[roots.length - 1] : null) : document;
    if (!root) return null;
    const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
    const labels = Array.from(root.querySelectorAll("label, div")).filter((el) => el.children.length === 0 && clean(el.textContent) === lbl);
    for (const l of labels) {
      const box = l.parentElement && l.parentElement.querySelector("select");
      if (box) return Array.from(box.options).filter((o) => o.value).map((o) => ({ v: o.value, l: clean(o.textContent) }));
    }
    return null;
  }, [label, !!inModal, WINDOW]);
}
// The choices of the picker whose empty choice reads a given word, for a picker that stands without a
// label, such as HR Records' person filter.
function optionsOfPicker(d, emptyWord, inModal) {
  return d.page.evaluate(([word, modal, sel]) => {
    const roots = Array.from(document.querySelectorAll(sel));
    const root = modal ? (roots.length ? roots[roots.length - 1] : null) : document;
    if (!root) return null;
    const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
    const box = Array.from(root.querySelectorAll("select")).find((s0) => s0.options.length > 0 && clean(s0.options[0].textContent) === word && !s0.options[0].value);
    return box ? Array.from(box.options).filter((o) => o.value).map((o) => ({ v: o.value, l: clean(o.textContent) })) : null;
  }, [emptyWord, !!inModal, WINDOW]);
}
const namesOf = (opts) => (opts || []).map((o) => o.l);
// What a picker holds, said in one line: its count and its first three names.
const said = (opts) => (opts === null ? "no such picker" : (opts.length + ": " + namesOf(opts).slice(0, 3).join(", ") + (opts.length > 3 ? ", ..." : "")));
// The one line a check gives when a list is off: what it offers and what the seed says.
const offWhy = (what, opts, want) => (opts === null ? what + " has no picker"
  : what + " offers " + JSON.stringify(namesOf(opts)) + " where the seed's people are " + JSON.stringify(want));

// GET /api/users as the person signed in most recently made it, with the status it was answered with.
const staffListCalls = (calls) => calls.filter((c) => c.method === "GET" && c.path === "/api/users");
const summaryCalls = (calls) => calls.filter((c) => c.method === "GET" && c.path === "/api/hr/employees-summary");

async function run({ d, results, seed, stubs, lang }) {
  const W = world(seed);
  const check = (id, ok, detail) => results.check("page", "page/pickers/" + id + "/" + lang, ok, ok ? "" : detail);
  const read = {};
  const note = (who, what, opts) => { read[who + " / " + what] = said(opts); };

  // ---- a supervisor, refused the staff list by the stub itself -----------------------------------
  stubs.reset();
  await d.signOutHard();
  const mark = d.mark();
  await d.signIn("supervisor");
  await d.settle(400);
  const since = d.callsSince(mark);
  const refused = staffListCalls(since);
  const summary = summaryCalls(since);
  // Break: the stub answering GET /api/users to everyone again.
  check("the-stub-refuses-the-staff-list-to-a-supervisor",
    refused.length > 0 && refused.every((c) => c.status === 403 && c.refused === undefined),
    refused.length === 0 ? "the shell never read /api/users"
      : "GET /api/users was answered " + refused.map((c) => c.status + (c.refused ? " by an armed refusal" : "")).join(", ") + " to a supervisor");
  // Break: the shell's fallback taken out, so nothing reads the summary after the refusal.
  check("the-shell-reads-the-summary-after-the-refusal",
    summary.length > 0 && summary.every((c) => c.status === 200) && summary.some((c) => c.query === "?status=active"),
    summary.length === 0 ? "refused /api/users, the shell never read /api/hr/employees-summary"
      : "the summary was read with " + summary.map((c) => c.query + " -> " + c.status).join(", "));

  // ---- Assigned Tasks: Assign To lists everyone active, and a task sends the person's id -----------
  await d.goto("assigned");
  let opened = await d.clickText(d.say("Create Task"), { exact: false }).catch(() => false);
  let assignTo = opened ? await optionsUnder(d, d.say("Assign To *"), true) : null;
  note("supervisor", "Assigned Tasks, Create Task, Assign To", assignTo);
  // Break: the shell's fallback taken out; the list is empty.
  check("assign-to-lists-the-active-people", opened && assignTo !== null && sameSet(namesOf(assignTo), W.everyone),
    !opened ? "the create window did not open from " + JSON.stringify(d.say("Create Task")) : offWhy("Assign To", assignTo, W.everyone));
  let sent = null;
  const who = W.byName["Ngozi Okonkwo"];
  if (opened && assignTo && assignTo.length) {
    const before = d.mark();
    await d.pickOption(seed.SITES[0].name, { inModal: true });
    await d.fillByLabel(d.say("Task Description *"), "Wipe the lobby glass");
    await d.fillByLabel(d.say("Zone *"), "Lobby");
    await d.pickOption(who.name, { inModal: true });
    await d.clickText(d.say("Create and Assign"), { inModal: true, exact: true }).catch(() => false);
    await d.settle(300);
    sent = d.callsSince(before).find((c) => c.method === "POST" && /^\/api\/sites\/[^/]+\/tasks$/.test(c.path)) || null;
  }
  // Break: the option's value the person's name rather than their id.
  check("a-task-assigned-sends-the-persons-id", !!(sent && sent.body && JSON.stringify(sent.body.assignToUsers) === JSON.stringify([who.id])),
    !sent ? "no task was created" : "the task sent assignToUsers " + JSON.stringify(sent.body && sent.body.assignToUsers) + " where the person's id is " + JSON.stringify(who.id));
  await d.closeModal().catch(() => {});

  // ---- Schedule: the shift window's Staff Member lists the staff, and the site filter keeps a site's --
  await d.goto("schedule");
  opened = await d.clickText(d.say("Schedule Shift"), { exact: false }).catch(() => false);
  const shiftStaff = opened ? await optionsUnder(d, d.say("Staff Member *"), true) : null;
  note("supervisor", "Schedule, Schedule Shift, Staff Member", shiftStaff);
  // Break: the shell's fallback taken out; the list is empty.
  check("schedule-lists-the-staff", opened && shiftStaff !== null && sameSet(namesOf(shiftStaff), W.staff),
    !opened ? "the shift window did not open from " + JSON.stringify(d.say("Schedule Shift")) : offWhy("Staff Member", shiftStaff, W.staff));
  await d.closeModal().catch(() => {});
  // The site filter. A supervisor's people carry no site assignments, so the page reads the site's
  // people from its record and keeps those, and every admin, the way it does for an admin's list.
  const site = seed.SITES[0];
  const siteMark = d.mark();
  const filtered = await d.pickOption(site.name, { anywhere: true }).catch(() => false);
  await d.settle(500);
  const siteRead = d.callsSince(siteMark).filter((c) => c.method === "GET" && c.path === "/api/sites/" + site.id);
  opened = filtered && await d.clickText(d.say("Schedule Shift"), { exact: false }).catch(() => false);
  const siteStaff = opened ? await optionsUnder(d, d.say("Staff Member *"), true) : null;
  note("supervisor", "Schedule, " + site.name + ", Schedule Shift, Staff Member", siteStaff);
  // Break: the site's people not read for a list without assignments, so the filter keeps admins alone.
  check("schedule-site-filter-keeps-the-sites-people", filtered && opened && siteRead.length > 0 && siteStaff !== null && sameSet(namesOf(siteStaff), W.atSite(site.name)),
    !filtered ? "the site filter did not take " + JSON.stringify(site.name)
      : !opened ? "the shift window did not open under the site filter"
        : siteRead.length === 0 ? "the site's record was never read for a list without site assignments"
          : offWhy("Staff Member under " + site.name, siteStaff, W.atSite(site.name)));
  await d.closeModal().catch(() => {});

  // ---- Schedule: the open pickup's Reassign To lists the staff ------------------------------------
  await d.goto("schedule");
  const openChip = new RegExp("^18:00-02:00[\\s\\S]*" + d.say("OPEN"));
  opened = await d.clickGridCell(openChip).catch(() => false);
  const reassign = opened ? await optionsUnder(d, d.say("Reassign To"), true) : null;
  note("supervisor", "Schedule, open pickup, Reassign To", reassign);
  // Break: the shell's fallback taken out; the list is empty.
  check("pickup-reassign-lists-the-staff", opened && reassign !== null && sameSet(namesOf(reassign), W.staff),
    !opened ? "the open pickup's window did not open from the week grid" : offWhy("Reassign To", reassign, W.staff));
  await d.closeModal().catch(() => {});

  // ---- the same pickers as an admin, whose list the stub answers -----------------------------------
  await d.signOutHard();
  const adminMark = d.mark();
  await d.signIn("admin");
  await d.settle(400);
  const adminCalls = staffListCalls(d.callsSince(adminMark));
  // Break: the stub refusing GET /api/users to everyone.
  check("the-stub-answers-the-staff-list-to-an-admin", adminCalls.length > 0 && adminCalls.every((c) => c.status === 200),
    adminCalls.length === 0 ? "the shell never read /api/users" : "GET /api/users was answered " + adminCalls.map((c) => c.status).join(", ") + " to an admin");
  await d.goto("assigned");
  if (await d.clickText(d.say("Create Task"), { exact: false }).catch(() => false)) {
    note("admin", "Assigned Tasks, Create Task, Assign To", await optionsUnder(d, d.say("Assign To *"), true));
    await d.closeModal().catch(() => {});
  }
  await d.goto("schedule");
  if (await d.clickText(d.say("Schedule Shift"), { exact: false }).catch(() => false)) {
    note("admin", "Schedule, Schedule Shift, Staff Member", await optionsUnder(d, d.say("Staff Member *"), true));
    await d.closeModal().catch(() => {});
  }
  await d.goto("schedule");
  if (await d.clickGridCell(openChip).catch(() => false)) {
    note("admin", "Schedule, open pickup, Reassign To", await optionsUnder(d, d.say("Reassign To"), true));
    await d.closeModal().catch(() => {});
  }

  Object.keys(read).forEach((k) => results.note("pickers in " + lang + ", " + k + ": " + read[k]));
}

module.exports = { run, world, optionsUnder, optionsOfPicker };
