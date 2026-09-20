// Every decision a manager makes, exercised both ways where it has two.
//
// For each: the request body that went out, the toast that came back, and what the list says
// afterward. A button that looks like it worked and sent nothing fails here.
"use strict";
const seed = require("../seed");

async function run({ d, results, inventory, stubs }) {
  await d.signOutHard();
  await d.signIn("admin");

  // A decision case: walk to it, press it, then read the request, the toast and the list.
  const decide = async (id, spec) => {
    stubs.clearRefusals();
    // A fresh mount before every decision. A window left open by the case before swallows the
    // clicks, and a call still in flight from it would be counted as this decision's.
    await d.ensureSignedIn("admin");
    await d.reload();
    await d.waitToastGone();
    const mark = d.mark();
    let pressed = false;
    try { pressed = await spec.act(d); }
    catch (e) { results.fail("decision", id, "could not be reached: " + String(e.message).split("\n")[0]); await d.recover("admin"); return; }
    if (await d.crashed()) { results.fail("decision", id, await d.crashDetail()); await d.recover("admin"); return; }

    const toast = await d.waitToast(3500);
    const calls = d.callsSince(mark);
    const sent = calls.find((c) => c.method === spec.method && c.path.indexOf(spec.path) >= 0);

    results.check("decision", id + "/sends", pressed && !!sent,
      !pressed ? "the control could not be pressed"
        : "nothing went to " + spec.method + " " + spec.path + ". What went out: "
          + (calls.filter((c) => c.method !== "GET").map((c) => c.method + " " + c.path).join(", ") || "only reads"));

    if (sent && spec.body) {
      const problem = spec.body(sent.body || {});
      results.check("decision", id + "/request-body", problem === null,
        problem || "the body was " + JSON.stringify(sent.body));
    } else if (sent) {
      results.pass("decision", id + "/request-body", "the body was " + JSON.stringify(sent.body));
    }

    results.check("decision", id + "/toast", !!toast && spec.toast.test(toast || ""),
      !toast ? "the decision sent " + spec.method + " " + spec.path + " and showed no toast"
        : "the toast read " + JSON.stringify(toast) + ", expected " + String(spec.toast));

    if (spec.after) {
      await d.closeModal();
      const problem = await spec.after(d, calls);
      results.check("decision", id + "/list-afterward", problem === null, problem || "");
    }
    await d.closeModal();
    if (await d.crashed()) await d.recover("admin");
  };

  // ---- time off, four ways ----------------------------------------------
  const openTimeOff = async (status, rowIndex) => {
    await d.goto("schedule");
    await d.clickText("Time off", { exact: false });
    if (status) await d.clickText(status, { exact: true });
    return d.clickRow(rowIndex || 0);
  };

  await decide("decisions/time-off-approve-no-note", {
    method: "POST", path: "/api/time-off/",
    act: async (dd) => { await openTimeOff("Requested", 0); return dd.clickText("Approve", { inModal: true, exact: true }); },
    body: (b) => (Object.keys(b || {}).length === 0 ? null : "a note was sent when none was typed: " + JSON.stringify(b)),
    toast: /approved/i,
    after: async (dd) => {
      await dd.clickText("Approved", { exact: true });
      const table = await dd.tableAt(0);
      return table && table.rowCount >= 1 ? null : "the approved list is empty after an approval";
    },
  });
  stubs.reset();

  await decide("decisions/time-off-approve-with-note", {
    method: "POST", path: "/api/time-off/",
    act: async (dd) => {
      await openTimeOff("Requested", 0);
      await dd.fillByLabel("Note", "The weekend pattern covers these days.");
      return dd.clickText("Approve", { inModal: true, exact: true });
    },
    body: (b) => (b && b.note === "The weekend pattern covers these days." ? null : "the note did not travel: " + JSON.stringify(b)),
    toast: /approved/i,
  });
  stubs.reset();

  await decide("decisions/time-off-deny-with-note", {
    method: "POST", path: "/api/time-off/",
    act: async (dd) => {
      await openTimeOff("Requested", 0);
      await dd.fillByLabel("Note", "Two people are already off that week.");
      return dd.clickText("Deny", { inModal: true, exact: true });
    },
    body: (b) => (b && b.note === "Two people are already off that week." ? null : "the note did not travel: " + JSON.stringify(b)),
    toast: /denied/i,
    after: async (dd) => {
      await dd.clickText("Denied", { exact: true });
      const table = await dd.tableAt(0);
      return table && table.rowCount >= 1 ? null : "the denied list is empty after a denial";
    },
  });
  stubs.reset();

  // Deny with no note is refused by the window itself, before anything is sent.
  {
    const id = "decisions/time-off-deny-no-note";
    const mark = d.mark();
    await openTimeOff("Requested", 0);
    const pressed = await d.clickText("Deny", { inModal: true, exact: true });
    const modal = await d.modalText();
    const sent = d.callsSince(mark).find((c) => c.method === "POST" && c.path.indexOf("/api/time-off/") >= 0);
    results.check("decision", id, pressed && !sent && modal.indexOf("Add a note saying why") >= 0,
      !pressed ? "no Deny button" : sent ? "the denial went out with no note" : "the window does not say why it will not send: " + JSON.stringify(modal.slice(0, 120)));
    results.check("decision", id + "/nothing-closed", await d.modalOpen(),
      (await d.modalOpen()) ? "" : "the window closed on a refusal it raised itself");
    await d.closeModal();
    stubs.reset();
  }

  // ---- drop requests, both ways -----------------------------------------
  const openDrop = async (dd) => {
    await dd.goto("marketplace");
    await dd.clickText("Requests", { exact: true });
    return dd.clickCell(0, 0);
  };

  await decide("decisions/drop-approve", {
    method: "POST", path: "/approve-drop",
    act: async (dd) => { await openDrop(dd); return dd.clickText("Approve Drop", { inModal: true, exact: true }); },
    toast: /approv|open/i,
    after: async (dd) => {
      await dd.goto("marketplace");
      await dd.clickText("Open", { exact: true });
      const table = await dd.tableAt(0);
      return table ? null : "the open list is gone after a drop was approved";
    },
  });
  stubs.reset();

  await decide("decisions/drop-deny", {
    method: "POST", path: "/deny-drop",
    act: async (dd) => { await openDrop(dd); return dd.clickText("Deny", { inModal: true, exact: true }); },
    toast: /deni|denied/i,
  });
  stubs.reset();

  // ---- a claimed shift approved ----------------------------------------
  await decide("decisions/claimed-shift-approve", {
    method: "POST", path: "/approve",
    act: async (dd) => {
      await dd.goto("marketplace");
      await dd.clickText("Claimed", { exact: true });
      return dd.clickText("Approve", { exact: true });
    },
    toast: /approved/i,
  });
  stubs.reset();

  // ---- supply requests, both ways --------------------------------------
  await decide("decisions/supply-approve", {
    method: "PATCH", path: "/api/supplies/requests/",
    act: async (dd) => {
      await dd.goto("supplies");
      await dd.clickText("Requests", { exact: false });
      await dd.clickText("Approve", { exact: true });
      // The window's own send button reads Approve too, so it is pressed inside the window.
      return dd.clickText("Approve", { inModal: true, exact: true });
    },
    body: (b) => (b && b.status === "approved" ? null : "the body did not carry status approved: " + JSON.stringify(b)),
    toast: /approved/i,
    after: async (dd) => {
      const body = await dd.bodyText();
      return body.toLowerCase().indexOf("approved") >= 0 ? null : "the request list does not show the new state";
    },
  });
  stubs.reset();

  await decide("decisions/supply-deny", {
    method: "PATCH", path: "/api/supplies/requests/",
    act: async (dd) => {
      await dd.goto("supplies");
      await dd.clickText("Requests", { exact: false });
      await dd.clickText("Deny", { exact: true });
      return dd.clickText("Deny", { inModal: true, exact: true });
    },
    body: (b) => (b && b.status === "denied" ? null : "the body did not carry status denied: " + JSON.stringify(b)),
    toast: /denied/i,
  });
  stubs.reset();

  // ---- post an open shift ----------------------------------------------
  await decide("decisions/post-open-shift", {
    method: "POST", path: "/api/pickups",
    act: async (dd) => {
      await dd.goto("marketplace");
      await dd.clickText("Post Open Shift", { exact: false });
      await dd.pickOption(seed.SITES[0].name);
      await dd.fillByLabel("Date", seed.shift(5));
      await dd.fillByLabel("Start Time", "18:00");
      await dd.fillByLabel("End Time", "02:00");
      return dd.clickText("Post Shift", { inModal: true, exact: true });
    },
    body: (b) => (b && (b.site_id || b.siteId) ? null : "no site travelled with the posting: " + JSON.stringify(b)),
    toast: /posted|open/i,
  });
  stubs.reset();

  // ---- schedule one shift ---------------------------------------------
  await decide("decisions/schedule-shift", {
    method: "POST", path: "/api/schedule",
    act: async (dd) => {
      await dd.goto("schedule");
      await dd.clickText("Schedule Shift", { exact: false });
      await dd.pickOption("Tomasz Wisniewski");
      await dd.pickOption(seed.SITES[0].name);
      await dd.fillByLabel("Start Time", "18:00");
      await dd.fillByLabel("End Time", "02:00");
      return dd.clickText("Schedule Shift", { inModal: true, exact: true });
    },
    toast: /schedul|added|saved/i,
  });
  stubs.reset();

  // ---- schedule a repeating pattern -----------------------------------
  await decide("decisions/schedule-pattern", {
    method: "POST", path: "/api/schedule/patterns",
    act: async (dd) => {
      await dd.goto("schedule");
      await dd.clickText("Schedule Shift", { exact: false });
      await dd.pickOption("Tomasz Wisniewski");
      await dd.pickOption(seed.SITES[0].name);
      await dd.fillByLabel("Start Time", "18:00");
      await dd.fillByLabel("End Time", "02:00");
      await dd.toggleSwitch("Repeat this shift");
      await dd.clickText("Mon", { inModal: true, exact: true });
      return dd.clickText("Schedule All", { inModal: true, exact: true });
    },
    toast: /pattern|schedul|added/i,
    after: async (dd) => {
      await dd.goto("schedule");
      await dd.clickText("Patterns", { exact: true });
      const table = await dd.tableAt(0);
      return table && table.rowCount >= 1 ? null : "the pattern list is empty after a pattern was created";
    },
  });
  stubs.reset();

  // ---- cancel one date of a pattern -----------------------------------
  // A shift a pattern added says "Repeats" on the week grid, and its window offers Cancel this date
  // rather than Delete. The app asks for confirmation first, so the box is answered yes.
  await decide("decisions/pattern-skip-date", {
    method: "DELETE", path: "/api/schedule/",
    act: async (dd) => {
      await dd.goto("schedule");
      await dd.setConfirmAnswer(true);
      const opened = await dd.clickGridCell(/Repeats/, /OPEN|CLAIMED|DROP REQ/);
      if (!opened) return false;
      return dd.clickText("Cancel this date", { inModal: true, exact: true });
    },
    toast: /cancel|remov/i,
    after: async (dd) => {
      const asked = await dd.confirms();
      return asked.some((m) => /pattern will not add it again/i.test(m))
        ? null : "the app did not warn that the pattern will not add the date again: " + JSON.stringify(asked);
    },
  });
  stubs.reset();

  // ---- resolve an issue ------------------------------------------------
  await decide("decisions/issue-resolve", {
    method: "PATCH", path: "/api/issues/",
    act: async (dd) => {
      await dd.goto("issues");
      // Resolve appears once work has started, so the issue already in progress is the one opened.
      await dd.clickText("Loading bay puddle after rain", { exact: false });
      return dd.clickText("Resolve", { inModal: true, exact: true });
    },
    body: (b) => (b && String(b.status).indexOf("resolv") >= 0 ? null : "the body did not carry a resolved status: " + JSON.stringify(b)),
    // The app says "Updated" for every issue status change, resolving included.
    toast: /updated|resolv/i,
    after: async (dd) => {
      await dd.goto("issues");
      await dd.clickText("resolved", { exact: false });
      const body = await dd.bodyText();
      return body.length > 40 ? null : "the resolved filter shows nothing at all";
    },
  });
  stubs.reset();

  // ---- approve a pending person ---------------------------------------
  await decide("decisions/staff-approve", {
    method: "POST", path: "/approve",
    act: async (dd) => {
      await dd.goto("staff");
      // The one pending person is the eleventh row, so page two. The search brings them into view.
      await dd.typeSearch("Salome");
      return dd.clickText("Approve", { exact: true });
    },
    toast: /approved/i,
    after: async (dd, calls) => {
      const reread = calls.filter((c) => c.method === "GET" && c.path === "/api/users");
      return reread.length > 0 ? null : "the staff list was not read again after the approval";
    },
  });
  stubs.reset();

  // Every declared decision has to have been exercised above.
  const exercised = new Set(results.rows.filter((r) => r.kind === "decision").map((r) => r.id.split("/").slice(0, 2).join("/")));
  inventory.DECISIONS.forEach((dec) => {
    if (!exercised.has(dec.id)) results.noCase("decision", dec.id, dec.name);
  });
}

module.exports = { run };
