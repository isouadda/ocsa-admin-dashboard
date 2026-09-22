// Every window, dialog and confirmation the dashboard can put on screen.
//
// Each entry names the state that opens it and the route a person takes to get there. For each, the
// suite records the window's fields, its buttons, what it sends, the toast it shows, and whether the
// list behind it reloaded. Every <Mdl site in src/App.js is claimed by one of these; a new one
// prints NO CASE from cases/coverage.js.
"use strict";

// How each window is reached. `open` returns true when the window is on screen.
// `send` is optional: it fills what the window needs and presses the button that sends, then the
// case reads the request, the toast and the reload behind it.
const ROUTES = {
  "staff/add": {
    open: async (d) => { await d.goto("staff"); return d.clickText("Add Staff", { exact: false }); },
    fields: ["First", "Last", "Phone", "Email"],
    // First name, phone and email are required at src/App.js:702.
    send: { fillLabels: [["First Name", "Adaeze"], ["Last Name", "Nwachukwu"], ["Phone", "2155559911"], ["Email", "adaeze.nwachukwu@example.invalid"]], press: "Add Staff", expect: { path: "/api/users", method: "POST", toast: /added|staff/i } },
  },
  "staff/edit": {
    // The pencil in the list's Actions column, which is an icon button titled Edit.
    open: async (d) => { await d.goto("staff"); return d.clickTitle("Edit"); },
    send: { press: "Save", expect: { path: "/api/users/", method: "PATCH", toast: /updated|saved/i } },
  },
  "staff/reset-pin": {
    open: async (d) => { await d.goto("staff"); await d.clickRow(0); return d.clickText("Reset PIN", { exact: false }); },
    fields: ["PIN"],
  },
  "staff/assign-site": {
    open: async (d) => { await d.goto("staff"); await d.clickRow(0); await d.clickText("Assignments", { exact: false }); return d.clickText("Assign", { exact: true }); },
  },
  "staff/add-cert": {
    open: async (d) => { await d.goto("staff"); await d.clickRow(0); await d.clickText("Certifications", { exact: false }); return d.clickText("Add", { exact: true }); },
  },
  "staff/timeline-detail": {
    open: async (d) => {
      await d.goto("staff"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      return d.clickText("Lobby floor scuffed after delivery", { exact: false });
    },
  },
  "staff/timeline-loading": {
    // The loading window is the same open, caught while the detail call is still in flight.
    open: async (d, stubs) => {
      await d.goto("staff"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      stubs.setDelay("/api/users/timeline-detail/", 900);
      const box = d.page.locator("div", { hasText: "Lobby floor scuffed after delivery" }).last();
      await box.click({ timeout: 8000 }).catch(() => {});
      const seen = await d.page.locator("text=Loading record details").count().then((n) => n > 0).catch(() => false);
      stubs.clearDelays();
      await d.settle(900);
      return seen;
    },
    skipShape: true,
  },

  "sites/add": {
    open: async (d) => { await d.goto("sites"); return d.clickText("Add Site", { exact: false }); },
    // Name and address are both required at src/App.js:1478.
    send: { fillLabels: [["Name", "Cedar Hollow Annex"], ["Address", "77 Millrace Road"]], press: "Create", expect: { path: "/api/sites", method: "POST", toast: /added|site|created/i } },
  },
  "sites/edit": {
    open: async (d) => { await d.goto("sites"); await d.clickRow(0); return d.clickText("Edit Details", { exact: false }); },
  },
  "sites/add-task": {
    open: async (d) => { await d.goto("sites"); await d.clickRow(0); await d.clickText("Service Details", { exact: false }); return d.clickText("Add Task", { exact: false }); },
  },
  "sites/edit-task": {
    open: async (d) => {
      await d.goto("sites"); await d.clickRow(0); await d.clickText("Service Details", { exact: false });
      return d.clickText("Strip and refinish lobby", { exact: false });
    },
  },
  "sites/delete-confirm": {
    open: async (d) => { await d.goto("sites"); await d.clickRow(0); return d.clickText("Delete", { exact: true }); },
  },
  "sites/add-supply": {
    open: async (d) => { await d.goto("sites"); await d.clickRow(0); await d.clickText("Supplies", { exact: false }); return d.clickText("Add Supply", { exact: false }); },
  },
  "sites/timeline-detail": {
    open: async (d) => {
      await d.goto("sites"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      return d.clickText("Lobby floor scuffed after delivery", { exact: false });
    },
  },

  "issues/detail": {
    open: async (d) => { await d.goto("issues"); return d.clickText("Lobby floor scuffed after delivery", { exact: false }); },
  },
  "issues/assign-task": {
    open: async (d) => {
      await d.goto("issues"); await d.clickText("Lobby floor scuffed after delivery", { exact: false });
      return d.clickText("Assign as Task", { inModal: true, exact: false });
    },
  },

  "supplies/add": {
    open: async (d) => { await d.goto("supplies"); return d.clickText("Add Supply", { exact: false }); },
    send: { fillLabels: [["Name", "Floor pad 20 inch"]], press: "Add Supply", expect: { path: "/api/supplies", method: "POST", toast: /added|supply/i } },
  },
  "supplies/edit": {
    open: async (d) => { await d.goto("supplies"); return d.clickText("Neutral floor cleaner", { exact: false }); },
  },
  "supplies/handle-request": {
    open: async (d) => { await d.goto("supplies"); await d.clickText("Requests", { exact: false }); return d.clickText("Approve", { exact: false }); },
  },

  "assigned/detail": {
    open: async (d) => { await d.goto("assigned"); return d.clickText("Strip and refinish lobby", { exact: false }); },
  },
  "assigned/reassign": {
    open: async (d) => {
      await d.goto("assigned"); await d.clickText("Strip and refinish lobby", { exact: false });
      return d.clickText("Reassign", { inModal: true, exact: false });
    },
  },
  "assigned/create": {
    open: async (d) => { await d.goto("assigned"); return d.clickText("Create Task", { exact: false }); },
  },

  "vendors/add": {
    open: async (d) => { await d.goto("vendors"); return d.clickText("Add Vendor", { exact: false }); },
  },
  "vendors/detail": {
    open: async (d) => { await d.goto("vendors"); return d.clickRow(0); },
  },
  "vendors/edit": {
    open: async (d) => { await d.goto("vendors"); await d.clickRow(0); return d.clickText("Edit", { inModal: true, exact: false }); },
  },
  "vendors/add-eval": {
    open: async (d) => { await d.goto("vendors"); await d.clickRow(0); return d.clickText("Evaluat", { inModal: true, exact: false }); },
  },
  "vendors/link-supply": {
    open: async (d) => { await d.goto("vendors"); await d.clickRow(0); return d.clickText("Link Supply", { inModal: true, exact: false }); },
  },

  "services/detail": {
    open: async (d) => { await d.goto("services"); return d.clickText("Daily janitorial", { exact: false }); },
  },
  "services/add": {
    open: async (d) => { await d.goto("services"); return d.clickText("Add Service", { exact: false }); },
  },
  "services/edit": {
    open: async (d) => { await d.goto("services"); await d.clickText("Daily janitorial", { exact: false }); return d.clickText("Edit", { inModal: true, exact: false }); },
  },
  "services/link-site": {
    open: async (d) => { await d.goto("services"); await d.clickText("Daily janitorial", { exact: false }); return d.clickText("Link Site", { inModal: true, exact: false }); },
  },

  "schedule/create-shift": {
    open: async (d) => { await d.goto("schedule"); return d.clickText("Schedule Shift", { exact: false }); },
  },
  "schedule/edit-shift": {
    // A scheduled shift chip on the week grid. Its text starts with the start and end time, and the
    // pickup chips beside it carry a badge, so those are excluded.
    open: async (d) => { await d.goto("schedule"); return d.clickGridCell(/^\d\d:\d\d-\d\d:\d\d/, /OPEN|CLAIMED|DROP REQ/); },
  },
  "schedule/pattern-window": {
    open: async (d) => { await d.goto("schedule"); await d.clickText("Patterns", { exact: false }); return d.clickRow(0); },
  },
  "schedule/time-off-window": {
    open: async (d) => { await d.goto("schedule"); await d.clickText("Time off", { exact: false }); return d.clickRow(0); },
    fields: ["Note"],
  },
  "schedule/started-detail": {
    open: async (d) => { await d.goto("schedule"); return d.clickGridCell(/^Started \d/); },
    optional: "a started shift only appears on the week grid when a session falls in the range",
  },
  "schedule/inspection-detail": {
    open: async (d) => { await d.goto("schedule"); return d.clickGridCell(/quality walk|Dock area/); },
    optional: "an inspection only appears on the week grid when one is scheduled in the range",
  },
  "schedule/pickup-detail": {
    open: async (d) => { await d.goto("schedule"); return d.clickGridCell(/DROP REQ|\bOPEN\b/); },
    optional: "a pickup only appears on the week grid when one falls in the range",
  },

  "marketplace/create": {
    open: async (d) => { await d.goto("marketplace"); return d.clickText("Post Open Shift", { exact: false }); },
  },
  "marketplace/convert": {
    open: async (d) => { await d.goto("marketplace"); return d.clickText("Convert Callout", { exact: false }); },
    optional: "Convert only shows when a scheduled shift can become an open one",
  },
  "marketplace/shift-detail": {
    open: async (d) => { await d.goto("marketplace"); await d.clickText("All", { exact: true }); return d.clickCell(0, 0); },
  },

  "inspections/new-template": {
    open: async (d) => { await d.goto("inspections"); return d.clickText("New Template", { exact: false }); },
  },
  "inspections/schedule": {
    open: async (d) => { await d.goto("inspections"); await d.clickText("Scheduled", { exact: true }); return d.clickText("Schedule Inspection", { exact: false }); },
  },
  "inspections/edit-scheduled": {
    open: async (d) => { await d.goto("inspections"); await d.clickText("Scheduled", { exact: true }); return d.clickText("Edit", { exact: true }); },
  },

  "settings/add-category": {
    open: async (d) => { await d.goto("settings"); await d.clickText("Dropdown Options", { exact: false }); return d.clickText("+ Add", { exact: true }); },
  },
  "settings/edit-category": {
    open: async (d) => { await d.goto("settings"); await d.clickText("Dropdown Options", { exact: false }); return d.clickText("Edit", { exact: true }); },
  },
  "settings/add-value": {
    open: async (d) => { await d.goto("settings"); await d.clickText("Dropdown Options", { exact: false }); return d.clickText("+ Add Value", { exact: true }); },
  },
  "settings/edit-value": {
    open: async (d) => { await d.goto("settings"); await d.clickText("Dropdown Options", { exact: false }); return d.clickText("Edit", { exact: true, nth: 1 }); },
  },
  "settings/add-site-value": {
    open: async (d) => {
      await d.goto("settings"); await d.clickText("Site Lookups", { exact: false });
      await d.pickOption("Harbor Point Center");
      return d.clickText("+ Add", { exact: false });
    },
  },
  "settings/edit-site-value": {
    open: async (d) => {
      await d.goto("settings"); await d.clickText("Site Lookups", { exact: false });
      await d.pickOption("Harbor Point Center");
      return d.clickText("Edit", { exact: true });
    },
  },

  "forms/incident-report-window": {
    open: async (d) => { await d.goto("forms"); await d.clickText("Filed forms", { exact: false }); return d.clickRow(0); },
  },
  "forms/edit-form": {
    open: async (d) => { await d.goto("forms"); return d.clickText("Edit", { exact: true }); },
  },
  "forms/submission-detail": {
    open: async (d) => { await d.goto("forms"); await d.clickText("Submissions", { exact: true }); return d.clickText("View", { exact: true }); },
  },
  "forms/full-refresh": {
    open: async (d) => { await d.goto("forms"); await d.clickText("Settings", { exact: true }); return d.clickText("Full Refresh", { exact: false }); },
  },
  "forms/link-user": {
    // The link window opens from inside the submission detail, for a submission nobody linked yet.
    open: async (d) => {
      await d.goto("forms"); await d.clickText("Submissions", { exact: true });
      await d.clickText("View", { exact: true });
      return d.clickText("Link to Record", { inModal: true, exact: false });
    },
  },

  "cases/window": {
    open: async (d) => { await d.goto("cases"); return d.clickRow(0); },
  },

  "hr/document-window": {
    open: async (d) => { await d.goto("hr"); await d.clickText("Documents", { exact: false }); return d.clickText("Add Document", { exact: false }); },
  },
  "hr/training-window": {
    open: async (d) => { await d.goto("hr"); await d.clickText("Training", { exact: false }); return d.clickText("Add Training", { exact: false }); },
  },
  "hr/onboarding-step-window": {
    open: async (d) => { await d.goto("hr"); await d.clickText("Onboarding", { exact: false }); await d.pickPerson("Tomasz"); return d.clickText("Custom Step", { exact: false }); },
  },
};

async function run({ d, results, inventory, stubs }) {
  await d.signOutHard();
  await d.signIn("admin");

  for (const w of inventory.WINDOWS) {
    const id = "window/" + w.id;
    const route = ROUTES[w.id];
    if (!route) { results.noCase("window", id, w.lines.map((l) => "src/App.js:" + l).join(", ")); continue; }

    let opened = false;
    try { opened = await route.open(d, stubs); }
    catch (e) { results.fail("window", id, "could not be opened: " + String(e.message).split("\n")[0]); await d.recover("admin"); continue; }
    if (await d.crashed()) { results.fail("window", id, await d.crashDetail()); await d.recover("admin"); continue; }

    const onScreen = route.skipShape ? opened : await d.modalOpen();
    if (!onScreen) {
      results.check("window", id, false,
        (route.optional ? route.optional + ". " : "") + "the window did not open from " + w.lines.map((l) => "src/App.js:" + l).join(", "));
      await d.closeModal();
      continue;
    }
    if (route.skipShape) { results.pass("window", id, "seen while its call was still in flight"); await d.closeModal(); continue; }

    // What is in it: the fields, the buttons and the title.
    const text = await d.modalText();
    const buttons = await d.modalButtons();
    const fields = await d.modalFields();
    const titled = text.toLowerCase().indexOf(String(w.title).toLowerCase()) >= 0;
    const missingFields = (route.fields || []).filter((f) => fields.join(" ").toLowerCase().indexOf(f.toLowerCase()) < 0
      && text.toLowerCase().indexOf(f.toLowerCase()) < 0);
    // A window closes by a text button, or by the icon-only X in its header.
    const iconOnly = await d.modalIconButtons();
    const hasAWayOut = iconOnly > 0 || buttons.some((b) => /close|cancel|save|add|done|deny|approve|delete|remove|link|reset|schedule|convert|refresh|update|print/i.test(b));

    results.check("window", id, titled && buttons.length > 0 && hasAWayOut && missingFields.length === 0,
      !titled ? "the window does not say " + JSON.stringify(w.title) + ", it says " + JSON.stringify(text.split("\n")[0])
        : missingFields.length ? "no field for " + missingFields.join(", ")
        : !hasAWayOut ? "the window has no button that closes or sends it, only " + buttons.join(", ") : "");

    // What it sends, the toast, and the list behind it.
    if (route.send) {
      const mark = d.mark();
      const inputs = d.modal().locator("input, textarea");
      for (const [i, v] of (route.send.fill || [])) {
        await inputs.nth(i).fill(String(v)).catch(() => {});
      }
      for (const [label, v] of (route.send.fillLabels || [])) {
        await d.fillByLabel(label, v);
      }
      const pressed = await d.clickText(route.send.press, { inModal: true, exact: false });
      const toast = await d.waitToast(3000);
      const calls = d.callsSince(mark);
      const sent = calls.find((c) => c.path.indexOf(route.send.expect.path) >= 0 && c.method === route.send.expect.method);
      const reloaded = calls.some((c) => c.method === "GET" && c.path.indexOf(route.send.expect.path.split("/").slice(0, 3).join("/")) >= 0);
      results.check("window", id + "/sends", pressed && !!sent && !!toast && route.send.expect.toast.test(toast || ""),
        !pressed ? "no button reading " + route.send.press
          : !sent ? "nothing was sent to " + route.send.expect.method + " " + route.send.expect.path
          : !toast ? "the window sent " + route.send.expect.method + " " + route.send.expect.path + " and showed no toast"
          : !route.send.expect.toast.test(toast) ? "the toast read " + JSON.stringify(toast)
          : "");
      results.check("window", id + "/reloads-the-list", reloaded,
        reloaded ? "" : "the list behind the window was not read again after the save");
    }

    // Escape closes it and leaves the page behind it standing.
    await d.page.keyboard.press("Escape");
    await d.settle(220);
    await d.closeModal();
    results.check("window", id + "/closes", !(await d.modalOpen()) && !(await d.crashed()),
      (await d.modalOpen()) ? "the window is still on screen after Escape and Close" : "");
    if (await d.crashed()) await d.recover("admin");
  }
}

module.exports = { run, ROUTES };
