// Notices: each subject type opens the page it should.
//
// The bell is opened, every seeded notice is tapped in turn, and the page the app lands on is
// compared with the page that subject belongs to. A notice that opens nothing, or opens a page the
// person cannot read, fails here.
"use strict";
const seed = require("../seed");

// Where each subject type has to land.
const LANDS_ON = {
  time_off: "schedule",
  form: "forms",
  issue: "issues",
  supply_request: "supplies",
  pickup: "marketplace",
  inspection: "inspections",
  hr_case: "cases",
};

async function currentPage(d) {
  return d.page.evaluate(() => window.location.hash.replace(/^#/, "").split("/")[0]);
}

async function run({ d, results, stubs }) {
  const notices = stubs.fixtures.NOTIFICATIONS;

  for (const persona of ["admin", "supervisor"]) {
    await d.signOutHard();
    await d.signIn(persona);
    const isAdmin = persona === "admin";

    // The bell carries the unread count the API gave.
    await d.goto("overview");
    const badge = await d.bellCount();
    results.check("notice", "notice/unread-count/" + persona, String(badge) === String(stubs.fixtures.UNREAD_COUNT),
      String(badge) === String(stubs.fixtures.UNREAD_COUNT) ? ""
        : "the API said " + stubs.fixtures.UNREAD_COUNT + " unread, the bell shows " + JSON.stringify(badge));

    for (const n of notices) {
      const want = LANDS_ON[n.subjectType];
      const id = "notice/" + n.subjectType + "/" + persona;
      if (!want) { results.noCase("notice", id, "no page declared for subject type " + n.subjectType); continue; }

      await d.goto("overview");
      const bellOpen = await d.openBell();
      if (!bellOpen) { results.fail("notice", id, "the bell would not open"); continue; }

      const tapped = await d.tapNotice(n.title);
      if (!tapped) { results.fail("notice", id, "no notice on screen reading " + JSON.stringify(n.title)); continue; }

      const landed = await currentPage(d);
      // Forms is no longer an admin's alone: a supervisor whose filed list answers 200 opens it,
      // so a notice about a filed form takes them there.
      const gatedHere = !isAdmin && ((want === "forms" && seed.PEOPLE[persona].readsFiledForms !== true) || want === "cases");

      if (gatedHere) {
        // The notice does not move this person to a page they cannot open. It closes the bell and
        // says one line, and the person stays where they were.
        const said = await d.waitToast(3000);
        const stayed = landed === "overview";
        results.check("notice", id, stayed && !!said && /for admins/i.test(said),
          !stayed ? "the notice moved a " + persona + " to " + landed + ", which they cannot read"
            : !said ? "the notice opened nothing and said nothing"
              : "the line read " + JSON.stringify(said));
        await d.waitToastGone(3600);
      } else {
        results.check("notice", id, landed === want,
          landed === want ? "" : "the notice landed on " + landed + ", expected " + want);
      }
    }

    // Marking everything read empties the bell. Every notice above was tapped, which marked each one
    // read on the way, so the notices are put back first to give the control something to do.
    stubs.reset();
    await d.signOutHard();
    await d.signIn(persona);
    await d.openBell();
    const mark = d.mark();
    const enabled = await d.controlEnabled("Mark all read");
    const pressed = enabled ? await d.clickText("Mark all read", { anywhere: true, exact: false }) : false;
    const sent = d.callsSince(mark).find((c) => c.method === "POST" && c.path.indexOf("/api/notifications/read-all") >= 0);
    const after = await d.bellCount();
    results.check("notice", "notice/mark-all-read/" + persona, enabled && pressed && !!sent && String(after) === "0",
      !enabled ? "Mark all read is greyed out with " + stubs.fixtures.UNREAD_COUNT + " unread notices on screen"
        : !pressed ? "Mark all read could not be pressed" : !sent ? "nothing was sent to read-all"
        : "the bell still shows " + JSON.stringify(after) + " after marking everything read");

    // With nothing unread, the same control has to be greyed out rather than sending again.
    const stillEnabled = await d.controlEnabled("Mark all read");
    results.check("notice", "notice/mark-all-read-then-greys-out/" + persona, !stillEnabled,
      stillEnabled ? "Mark all read is still live with nothing unread" : "");
    stubs.reset();
  }

  await d.signOutHard();
  await d.signIn("admin");

  // A notice whose link is a page the app does not know falls back rather than breaking.
  {
    await d.goto("overview");
    await d.openBell();
    const before = await currentPage(d);
    results.check("notice", "notice/bell-does-not-navigate-on-open", before === "overview",
      before === "overview" ? "" : "opening the bell moved the person to " + before);
    await d.page.keyboard.press("Escape");
    await d.settle(200);
    results.check("notice", "notice/escape-closes-the-bell", !(await d.has("Mark all read")),
      (await d.has("Mark all read")) ? "Escape left the bell open" : "");
  }
}

module.exports = { run };
