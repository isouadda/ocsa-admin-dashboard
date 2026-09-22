// Every view inside a page: every tab and every sub-screen a page swaps in.
//
// A view is driven the way a person reaches it: the page is opened, a row is opened where the view
// lives behind one, and the control named in audit/inventory.js is clicked. The case passes when the
// control was there, the click took, and the view's own text is on screen.
"use strict";
const seed = require("../seed");

// A view on a gated page is only reachable by an admin.
const GATED = { staff: true, cases: true, forms: true, settings: true };

async function openView(d, v) {
  await d.goto(v.page);
  if (v.openRow != null) {
    const opened = await d.clickRow(v.openRow);
    if (!opened) return { ok: false, why: "no rows to open on the " + v.page + " page" };
  }
  if (!v.click) return { ok: true };
  // A view behind a tab and then a second switch is reached the same way a person reaches it, one
  // control after another.
  for (const step of [].concat(v.click)) {
    const clicked = await d.clickText(step, { exact: false });
    if (!clicked) return { ok: false, why: "no control reading " + JSON.stringify(step) };
  }
  return { ok: true };
}

async function run({ d, results, inventory }) {
  await d.signOutHard();
  await d.signIn("admin");

  for (const v of inventory.VIEWS) {
    const id = "view/" + v.id;
    const before = d.pageErrors.length;
    let res;
    try { res = await openView(d, v); }
    catch (e) {
      results.fail("view", id, "could not be opened: " + String(e.message).split("\n")[0]);
      await d.recover("admin");
      continue;
    }
    if (await d.crashed()) { results.fail("view", id, await d.crashDetail()); await d.recover("admin"); continue; }
    if (!res.ok) { results.fail("view", id, res.why); continue; }

    const body = (await d.bodyText()).toLowerCase();
    const want = String(v.expect).toLowerCase();
    const errs = d.pageErrors.slice(before);
    results.check("view", id, body.indexOf(want) >= 0 && errs.length === 0,
      body.indexOf(want) < 0 ? "the view does not show " + JSON.stringify(v.expect) + ", body starts " + JSON.stringify((await d.bodyText()).slice(0, 90))
        : "the view threw: " + errs[0]);
  }

  // The Schedule page's Time off tab only appears for a person allowed to decide, so its absence is
  // as much a case as its presence.
  await d.goto("schedule");
  const adminSeesTimeOff = await d.bodyHas("Time off");
  results.check("view", "view/schedule/timeoff-visible-to-admin", adminSeesTimeOff,
    adminSeesTimeOff ? "" : "an admin has no Time off tab on the Schedule page");

  // A view a person switches to must stay switched while the page's own polls run.
  await d.goto("marketplace");
  await d.clickText("Analytics", { exact: false });
  await d.settle(1200);
  results.check("view", "view/marketplace/analytics-survives-a-poll", await d.bodyHas("Fill Rate"),
    "the Analytics tab is still open a second later");

  // The Reports page returns to the library from a run.
  await d.goto("reports");
  await d.clickText("Run", { exact: false });
  const inRun = await d.bodyHas("Back to reports");
  await d.clickText("Back to reports", { exact: false });
  results.check("view", "view/reports/back-to-library", inRun && await d.bodyHas("Quick snapshots"),
    inRun ? "" : "Run did not open a report");

  // A supervisor reaches no view on a gated page. This records absence, which is the other half.
  // Forms opens for a supervisor the filed list lets in, so there the question is which tabs they
  // can reach: Filed forms is the one they are there to read, and the other six are an admin's.
  await d.signOutHard();
  await d.signIn("supervisor");
  const opensForms = seed.PEOPLE.supervisor.readsFiledForms === true;
  let leaked = [];
  for (const v of inventory.VIEWS) {
    if (!GATED[v.page]) continue;
    await d.goto(v.page);
    if (v.page === "forms" && opensForms) {
      if (v.id === "forms/incident_reports") continue;
      const buttons = await d.visibleButtons();
      if (buttons.indexOf(v.click) >= 0) leaked.push(v.id);
      continue;
    }
    const body = (await d.bodyText()).toLowerCase();
    if (body.indexOf(String(v.expect).toLowerCase()) >= 0) leaked.push(v.id);
  }
  results.check("view", "view/gated-views-absent-for-a-supervisor", leaked.length === 0,
    leaked.length ? "a supervisor can read " + leaked.join(", ") : "no view on the four admin pages renders");
}

module.exports = { run };
