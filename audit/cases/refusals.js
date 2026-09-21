// Every refusal the API can answer with, stubbed one at a time and shown word for word.
//
// The test is not only that the words reach the screen. Nothing may close underneath a refusal: the
// window stays open with what the person typed still in it, so they can read the reason and try
// again. A window that vanishes and takes the typing with it fails here.
"use strict";
const seed = require("../seed");

const REFUSALS = {
  "refusals/time-off-conflict": {
    status: 409, code: "already_decided", error: "Someone else decided this already",
    arm: { method: "POST", path: "/api/time-off/" },
    act: async (d) => {
      await d.goto("schedule");
      await d.clickText("Time off", { exact: false });
      await d.clickRow(0);
      await d.fillByLabel("Note", "Approving, the pattern covers it.");
      return d.clickText("Approve", { inModal: true, exact: true });
    },
    staysOpen: true,
  },
  "refusals/time-off-gone": {
    status: 404, error: "That request is gone",
    // The window seeds from the row it opened and reads nothing on open, so the refusal has to land
    // on the decision the person sends.
    arm: { method: "POST", path: "/api/time-off/" },
    act: async (d) => {
      await d.goto("schedule");
      await d.clickText("Time off", { exact: false });
      await d.clickRow(0);
      return d.clickText("Approve", { inModal: true, exact: true });
    },
    staysOpen: true,
  },
  "refusals/supply-request-refused": {
    status: 422, error: "That supply is no longer stocked",
    arm: { method: "PATCH", path: "/api/supplies/requests/" },
    act: async (d) => {
      await d.goto("supplies");
      await d.clickText("Requests", { exact: false });
      await d.clickText("Approve", { exact: true });
      return d.clickText("Approve", { inModal: true, exact: true });
    },
    whereShown: "toast",
  },
  "refusals/pattern-overlap": {
    status: 409, error: "That person already has a shift in those hours",
    arm: { method: "POST", path: "/api/schedule/patterns" },
    act: async (d) => {
      await d.goto("schedule");
      await d.clickText("Schedule Shift", { exact: false });
      await d.pickOption("Tomasz Wisniewski");
      await d.pickOption(seed.SITES[0].name);
      await d.fillByLabel("Start Time", "18:00");
      await d.fillByLabel("End Time", "02:00");
      await d.toggleSwitch("Repeat this shift");
      await d.clickText("Mon", { inModal: true, exact: true });
      return d.clickText("Schedule All", { inModal: true, exact: true });
    },
    staysOpen: true,
    optional: "the pattern path needs Repeat turned on and a day picked",
  },
  "refusals/shift-create-refused": {
    status: 400, error: "End time has to come after the start time",
    arm: { method: "POST", path: "/api/schedule" },
    act: async (d) => {
      await d.goto("schedule");
      await d.clickText("Schedule Shift", { exact: false });
      // Staff, site and both times are required at src/App.js:4798, and the window refuses an empty
      // form before anything is sent, so the API refusal would never be reached.
      await d.pickOption("Tomasz Wisniewski");
      await d.pickOption(seed.SITES[0].name);
      await d.fillByLabel("Start Time", "18:00");
      await d.fillByLabel("End Time", "02:00");
      return d.clickText("Schedule Shift", { inModal: true, exact: true });
    },
    staysOpen: true,
  },
  "refusals/pickup-taken": {
    status: 409, error: "Someone picked that shift up first",
    arm: { method: "POST", path: "/api/pickups/" },
    act: async (d) => {
      await d.goto("marketplace");
      await d.clickText("Claimed", { exact: true });
      // Exactly "Approve". A loose match lands on the Approved tab, which sends nothing.
      return d.clickText("Approve", { exact: true });
    },
    whereShown: "toast",
  },
  "refusals/staff-add-refused": {
    status: 422, error: "That phone number already belongs to someone",
    arm: { method: "POST", path: "/api/users" },
    act: async (d) => {
      await d.goto("staff");
      await d.clickText("Add Staff", { exact: false });
      await d.fillByLabel("First Name", "Adaeze");
      await d.fillByLabel("Phone", "2155559911");
      await d.fillByLabel("Email", "adaeze.nwachukwu@example.invalid");
      return d.clickText("Add Staff", { inModal: true, exact: false });
    },
    whereShown: "toast",
    staysOpen: true,
  },
  "refusals/site-save-refused": {
    status: 400, error: "A site needs a name and an address",
    arm: { method: "POST", path: "/api/sites" },
    act: async (d) => {
      await d.goto("sites");
      await d.clickText("Add Site", { exact: false });
      await d.fillByLabel("Name", "Cedar Hollow Annex");
      await d.fillByLabel("Address", "77 Millrace Road");
      return d.clickText("Create", { inModal: true, exact: true });
    },
    whereShown: "toast",
    staysOpen: true,
  },
  "refusals/settings-save-refused": {
    status: 403, error: "Company settings are locked to an owner",
    arm: { method: "PATCH", path: "/api/settings" },
    act: async (d) => {
      await d.goto("settings");
      return d.clickText("Save Company Settings", { exact: false });
    },
    whereShown: "toast",
  },
  "refusals/permissions-save-refused": {
    status: 403, error: "You cannot change your own permissions",
    arm: { method: "PUT", path: "/permissions" },
    act: async (d) => {
      await d.goto("settings");
      await d.clickText("Roles and Permissions", { exact: false });
      await d.pickPerson("Tomasz");
      await d.clickText("Allow", { exact: true });
      return d.clickText("Save changes", { exact: false });
    },
    whereShown: "toast",
  },
  "refusals/report-delete-refused": {
    status: 409, error: "A template report cannot be deleted",
    arm: { method: "DELETE", path: "/api/report-engine/definitions/" },
    act: async (d) => {
      await d.goto("reports");
      await d.setConfirmAnswer(true);
      return d.clickText("Delete", { exact: true });
    },
    whereShown: "toast",
  },
  "refusals/list-load-refused": {
    status: 500, error: "The issue list could not be read",
    // Armed by the case itself, after the view is open. The Time off tab is drawn only when the
    // count call answered 200, and that call is the same path, so arming it up front hides the tab.
    armLate: { method: "GET", path: "/api/time-off" },
    act: async (d, stubs) => {
      await d.goto("schedule");
      const opened = await d.clickText("Time off", { exact: false });
      if (!opened) return false;
      stubs.setRefusal({ method: "GET", path: "/api/time-off", status: 500, error: "The issue list could not be read" });
      // Changing the status filter is one call, and that is the one the refusal answers.
      return d.clickText("Approved", { exact: true });
    },
    whereShown: "page",
    noArm: true,
  },
  "refusals/session-expired": {
    status: 401, error: "Session expired",
    arm: { method: "GET", path: "/api/issues" },
    act: async (d) => { await d.goto("issues"); return true; },
    // A 401 signs the person out, which is the one refusal that is meant to close everything.
    expectsSignOut: true,
  },
  "refusals/popups-blocked": {
    status: 0, error: "Allow pop-ups to export the PDF",
    act: async (d) => {
      await d.goto("reports");
      await d.clickRunFor("Issue response and resolution");
      await d.setPopupsBlocked(true);
      const pressed = await d.clickText("Export PDF", { exact: false });
      await d.setPopupsBlocked(false);
      return pressed;
    },
    whereShown: "toast",
    noArm: true,
  },
};

async function run({ d, results, inventory, stubs }) {
  await d.signOutHard();
  await d.signIn("admin");

  for (const r of inventory.REFUSALS) {
    const id = r.id;
    const spec = REFUSALS[id];
    if (!spec) { results.noCase("refusal", id, "declared in audit/inventory.js with no case"); continue; }

    stubs.clearRefusals();
    // A fresh mount before every refusal, so no window and no toast from the case before is read as
    // this one's answer.
    await d.ensureSignedIn("admin");
    await d.reload();
    await d.waitToastGone();
    if (!spec.noArm) {
      stubs.setRefusal({ method: spec.arm.method, path: spec.arm.path, status: spec.status, code: spec.code, error: spec.error });
    }

    let acted = false;
    try { acted = await spec.act(d, stubs); }
    catch (e) { results.fail("refusal", id, "could not be reached: " + String(e.message).split("\n")[0]); stubs.clearRefusals(); await d.recover("admin"); continue; }
    if (await d.crashed()) { results.fail("refusal", id, "the refusal took the app down: " + await d.crashDetail()); stubs.clearRefusals(); await d.recover("admin"); continue; }

    // A 401 is the one refusal meant to empty the screen.
    if (spec.expectsSignOut) {
      const out = await d.signedOut();
      results.check("refusal", id, out, out ? "the person is back at the login card" : "a 401 left the dashboard on screen");
      stubs.clearRefusals();
      try { await d.ensureSignedIn("admin"); }
      catch (e) { results.fail("refusal", id + "/sign-back-in", "could not sign back in after the 401: " + String(e.message).split("\n")[0]); }
      continue;
    }

    const toast = await d.waitToast(3000);
    const modalText = await d.modalText();
    const bodyText = await d.bodyText();
    const shownIn = (toast || "").indexOf(spec.error) >= 0 ? "toast"
      : modalText.indexOf(spec.error) >= 0 ? "window"
      : bodyText.indexOf(spec.error) >= 0 ? "page" : null;

    results.check("refusal", id, !!acted && !!shownIn,
      !acted ? (spec.optional ? spec.optional + ". " : "") + "the path to this refusal could not be walked"
        : "the words " + JSON.stringify(spec.error) + " are nowhere on screen. toast " + JSON.stringify(toast)
          + ", window " + JSON.stringify(modalText.slice(0, 80)));
    if (shownIn) results.pass("refusal", id + "/word-for-word", "shown in the " + shownIn + ": " + JSON.stringify(spec.error));

    // Nothing closed underneath it.
    if (spec.staysOpen) {
      const stillOpen = await d.modalOpen();
      results.check("refusal", id + "/nothing-closed", stillOpen,
        stillOpen ? "the window is still open behind the refusal" : "the window closed underneath the refusal");
    }

    stubs.clearRefusals();
    await d.closeModal();
    if (await d.crashed()) await d.recover("admin");
    // A refusal that signed the person out leaves nothing for the next case to drive.
    await d.ensureSignedIn("admin");
  }

  stubs.clearRefusals();
}

module.exports = { run, REFUSALS };
