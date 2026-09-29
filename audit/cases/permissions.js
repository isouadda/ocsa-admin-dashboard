// Permissions: each capability toggled for one person, the effective map after, and one screen
// proving the change took.
"use strict";
const fs = require("fs");
const path = require("path");
const seed = require("../seed");

// The name the dashboard draws for a capability: its own word for a code it knows, CAPABILITY_LABELS in
// src/App.js, and the name the API sends for one it does not. Since Step 185 the dashboard's word wins
// over the API's for view_help_insights, and since Step 187 for build_forms.
const APP = path.resolve(__dirname, "..", "..", "src", "App.js");
function dashboardNames() {
  const src = fs.readFileSync(APP, "utf8");
  const at = src.indexOf("const CAPABILITY_LABELS = {");
  const block = at >= 0 ? src.slice(at, src.indexOf("};", at)) : "";
  const out = {};
  const re = /^\s*(\w+): "([^"]+)",?$/gm;
  let m;
  while ((m = re.exec(block))) out[m[1]] = m[2];
  return out;
}

async function open(d) {
  await d.goto("settings");
  await d.clickText("Roles and Permissions", { exact: false });
  return d.pickPerson("Tomasz Wisniewski");
}

async function run({ d, results, stubs }) {
  await d.signOutHard();
  await d.signIn("admin");

  const names = dashboardNames();
  const caps = stubs.fixtures.CAPABILITIES.map((c) => Object.assign({}, c, { label: names[c.key] || c.label }));

  const opened = await open(d);
  if (!opened) {
    results.fail("permission", "permissions/open", "no person picker on the Roles and Permissions tab");
    return;
  }
  const body = await d.bodyText();
  const listed = caps.filter((c) => body.indexOf(c.label) >= 0);
  results.check("permission", "permissions/every-capability-listed", listed.length === caps.length,
    listed.length === caps.length ? caps.length + " capabilities on screen"
      : "the screen lists " + listed.length + " of " + caps.length + ": missing "
        + caps.filter((c) => body.indexOf(c.label) < 0).map((c) => c.label).join(", "));

  // Each capability, one at a time: set it, save it, and read the effective map the API answered
  // with against what the app then shows.
  for (const cap of caps) {
    const id = "permissions/" + cap.key;
    const row = await d.capabilityRow(cap.label);
    if (!row) { results.fail("permission", id, "no row for " + JSON.stringify(cap.label)); continue; }
    if (row.locked) {
      results.pass("permission", id, "locked on for an admin target, so it has no buttons to press");
      continue;
    }
    // manage_admins is granted only by someone who holds it, which no admin does by default, so its row
    // says so and offers nothing to press.
    if (row.onlyHolder) {
      results.check("permission", id, cap.key === "manage_admins" && row.buttons.length === 0,
        cap.key !== "manage_admins" ? "the row says only a holder can grant it" : "the row says only a holder can grant it and still offers " + row.buttons.join(", "));
      continue;
    }

    const want = row.state === "allow" ? "Deny" : "Allow";
    const set = await d.setCapability(cap.label, want);
    if (!set) { results.fail("permission", id, "could not press " + want + " on " + cap.label); continue; }

    const mark = d.mark();
    const saved = await d.clickText("Save changes", { exact: false });
    const toast = await d.waitToast(3000);
    const sent = d.callsSince(mark).find((c) => c.method === "PUT" && c.path.indexOf("/permissions") >= 0);

    const wantValue = want === "Allow";
    const bodyOk = sent && sent.body && sent.body.permissions
      && sent.body.permissions[cap.key] === wantValue;
    results.check("permission", id + "/sends", saved && !!sent && !!bodyOk,
      !saved ? "no Save changes button" : !sent ? "nothing was saved"
        : "the body carried " + JSON.stringify(sent.body && sent.body.permissions) + ", expected " + cap.key + " " + wantValue);
    results.check("permission", id + "/toast", !!toast && /saved|permission/i.test(toast || ""),
      toast ? "" : "the save showed no toast");

    // The effective map the stub answered with, read back off the row.
    const after = await d.capabilityRow(cap.label);
    const expectWord = wantValue ? "Allowed" : "Blocked";
    results.check("permission", id + "/effective-map", !!after && after.currently.indexOf(expectWord) >= 0,
      after ? "the row now reads " + JSON.stringify(after.currently) + ", expected it to say " + expectWord
        : "the row is gone after the save");
    results.check("permission", id + "/override-marked", !!after && after.currently.indexOf("override") >= 0,
      after && after.currently.indexOf("override") >= 0 ? ""
        : "the row does not say the value is an override rather than the role default");

    // Put it back, so each capability is exercised on its own.
    await d.setCapability(cap.label, "Default");
    await d.clickText("Save changes", { exact: false });
    await d.settle(250);
  }

  // One screen proving a change took: the manage permissions capability decides who can open this
  // very tab, so the person holding only that one is the proof.
  {
    const id = "permissions/one-screen-proves-it";
    await d.signOutHard();
    await d.signIn("capability");
    await d.goto("settings");
    const seen = await d.bodyText();
    results.check("permission", id, seen.indexOf("Per-person permissions") >= 0,
      seen.indexOf("Per-person permissions") >= 0 ? "the capability holder can open the tab"
        : "the person holding manage_permissions cannot open Settings: the body is "
          + seen.replace(/\s+/g, " ").trim().length + " characters");
    // And only that tab. The other four are an admin's, on the tab bar and on the render.
    const otherTabs = ["Dropdown Options", "Site Lookups", "Who gets told", "Save Company Settings"].filter((tb) => seen.indexOf(tb) >= 0);
    results.check("permission", id + "/other-tabs-absent", otherTabs.length === 0,
      otherTabs.length ? "the capability holder can also see " + otherTabs.join(", ") : "the other four tabs are absent");
    await d.signOutHard();
    await d.signIn("admin");
  }

  // The reference matrix, on the second view of the tab that holds it.
  {
    const id = "permissions/matrix-panel-is-reachable";
    await d.goto("settings");
    await d.clickText("Roles and Permissions", { exact: false });
    await d.clickText("Role reference", { exact: false });
    const text = await d.bodyText();
    const reachable = text.indexOf("Access each role has in the platform today") >= 0;
    results.check("permission", id, reachable,
      reachable ? "" : "the Role reference view on the Roles and Permissions tab does not draw the matrix");
  }
}

module.exports = { run };
