// The checklist editor on Sites keeps every item.
//
// Since Step 124 a site's checklist read answers only today's items of the caller's open shift when
// it is not told otherwise, and a manager who tests from the portal has a shift open. Service Details
// is the list the dashboard edits, so it asks for every item of every shift. Each journey opens the
// Night shift at the first site for the person signed in, opens that site's Service Details, and
// reads what the editor draws: every item, with the other shift's, a weekly one, one set to other
// days and a seasonal one out of season among them.
//
// runLate holds every checklist read the whole run made to the same rule, the pickers on Schedule
// and Shift Pickup included, since each of them builds a form out of the site's whole list.
"use strict";

const SHIFT = "Night";

async function run({ d, results, stubs, seed }) {
  const site = seed.SITES[0];
  const every = ["Strip and refinish lobby"].concat(stubs.fixtures.CHECKLIST[site.id].map((c) => c.label));
  // The four that a read of today's Night items leaves out, named for what each one is.
  const leftOut = {
    "the other shift's item": "Wipe lobby glass",
    "a weekly item": "Scrub restroom grout",
    "an item set to other days": "Buff the upper hallway",
    "a seasonal item out of season": "Clean window tracks",
  };
  for (const persona of ["admin", "supervisor"]) {
    await d.signOutHard();
    await d.signIn(persona);
    stubs.setOpenSession(persona, { siteId: site.id, shift: SHIFT });
    const mark = d.mark();
    await d.goto("sites");
    await d.clickRow(0);
    await d.clickText(d.say("Service Details"), { exact: false });
    const body = await d.bodyText();
    const drawn = every.filter((l) => body.indexOf(l) >= 0);
    const missing = Object.keys(leftOut).filter((k) => body.indexOf(leftOut[k]) < 0);
    const read = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/sites/" + site.id + "/tasks").pop();
    const query = read ? read.query : null;
    results.check("page", "page/sites/every-item-in-the-editor/" + persona,
      drawn.length === every.length && missing.length === 0,
      !read ? "the editor never read the site's checklist"
        : "with the " + SHIFT + " shift open the editor asked " + JSON.stringify(read.path + query) + " and drew "
          + drawn.length + " of " + every.length + " items" + (missing.length ? ", without " + missing.join(", ") : ""));
    results.note("Sites, signed in as the " + seed.PERSONA_LABEL[persona] + " with the " + SHIFT + " shift open at the first site: the editor asked "
      + (read ? read.path + (query || "") : "nothing") + " and drew " + drawn.length + " of " + every.length + " items");
    stubs.setOpenSession(persona, null);
  }
}

// Every read of a site's checklist in the run asked for every item of every shift.
function runLate({ stubs, results }) {
  const reads = stubs.checklistReads();
  if (reads.length === 0) { results.note("no site checklist was read in this run"); return; }
  const wrong = reads.filter((r) => r.query !== "?day=all&shift=");
  results.check("checklist", "checklist/every-read-asks-for-every-item", wrong.length === 0,
    wrong.length + " of " + reads.length + " checklist reads asked for less than every item: "
      + wrong.slice(0, 3).map((r) => r.path + (r.query || " with no query")).join("; "));
  if (wrong.length === 0) results.note("every one of the " + reads.length + " checklist reads asked for every item of every shift");
}

module.exports = { run, runLate };
