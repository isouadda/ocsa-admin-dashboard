// Every state the filed report window can be in past its first draw, and the two lines the Help page
// shows when a report is refused for missing answers.
//
// The footer's calls are its own: the report is still read once per opening, the file is fetched with
// the signed-in token and saved under the name the API chose, and a send asks first and goes out once
// however many times the button is pressed.
"use strict";

const PDF_CHOICE = "Attach the filled report as a PDF";
const LINK_CHOICE = "Link to the app";

async function openReport(d, which) {
  await d.goto("forms");
  await d.clickText("Filed forms", { exact: false });
  if (which === "draft") await d.clickText("Unfinished", { exact: true });
  return d.clickRow(0);
}

async function openWhoGetsTold(d) {
  await d.goto("settings");
  return d.clickText("Who gets told", { exact: false });
}

async function run({ d, results, inventory, stubs }) {
  await d.signOutHard();
  await d.signIn("admin");
  const driven = new Set();
  const check = (id, ok, detail) => { driven.add(id); results.check("window", id, ok, detail); };

  // ---- what the footer offers ------------------------------------------
  {
    const opened = await openReport(d, "submitted");
    const text = await d.modalText();
    check("window-states/report-offers-download", !!opened && text.indexOf("Download PDF") >= 0,
      "a loaded report does not offer Download PDF. The window ends " + JSON.stringify(text.slice(-100)));
    check("window-states/report-offers-send-again", text.indexOf("Send again") >= 0,
      "a filed report does not offer Send again");
    await d.closeModal();
  }
  {
    const opened = await openReport(d, "draft");
    const text = await d.modalText();
    check("window-states/report-hides-send-again-on-a-draft", !!opened && text.indexOf("Send again") < 0,
      "an unfinished report offers Send again, which the API refuses");
    await d.closeModal();
  }

  // ---- the download -----------------------------------------------------
  {
    await d.clearCaptures();
    await openReport(d, "submitted");
    const mark = d.mark();
    const pressed = await d.clickText("Download PDF", { inModal: true, exact: true });
    await d.settle(500);
    const sent = d.callsSince(mark).find((c) => c.method === "GET" && /\/pdf$/.test(c.path));
    const files = await d.downloads();
    const name = files.length ? String(files[files.length - 1].name || "") : "";
    const body = files.length ? String(files[files.length - 1].body || "") : "";
    check("window-states/report-download-saves-the-file",
      !!pressed && !!sent && /^OCSA-FRM-\d+-.+\.pdf$/.test(name) && body.indexOf("%PDF") === 0,
      !sent ? "nothing was fetched when Download PDF was pressed"
        : "the file saved as " + JSON.stringify(name) + " and starts " + JSON.stringify(body.slice(0, 8)));
    // The report itself is still read once, whatever the footer does.
    const reads = d.callsSince(mark).filter((c) => c.method === "GET" && /\/api\/forms\/responses\/[^/]+$/.test(c.path));
    check("window-states/report-download-is-its-own-call", reads.length === 0,
      "the download read the report again: " + reads.map((c) => c.path).join(", "));
    await d.closeModal();
  }
  {
    // A browser hands JS no Content-Disposition across origins unless the server exposes it. With it
    // taken away, the dashboard names the file the way the API would rather than saving a stranger.
    stubs.setExposeDisposition(false);
    await d.clearCaptures();
    await openReport(d, "submitted");
    await d.clickText("Download PDF", { inModal: true, exact: true });
    await d.settle(500);
    const files = await d.downloads();
    const name = files.length ? String(files[files.length - 1].name || "") : "";
    check("window-states/report-download-names-the-file-itself",
      name.indexOf("OCSA-FRM-") < 0 && /\.pdf$/.test(name) && name !== "report.pdf",
      "with no name to read off the response, the file saved as " + JSON.stringify(name));
    stubs.setExposeDisposition(true);
    await d.closeModal();
  }
  {
    // Held open on purpose, so the button can be read while the file is in flight.
    stubs.setDelay("/pdf", 1500);
    await openReport(d, "submitted");
    await d.clickText("Download PDF", { inModal: true, exact: true });
    await d.settle(300);
    const mid = await d.modalText();
    const stillPressable = await d.controlEnabled("Downloading...");
    check("window-states/report-downloading", mid.indexOf("Downloading...") >= 0 && !stillPressable,
      "while the file is in flight the button reads " + JSON.stringify(mid.slice(-90)) + ", pressable " + stillPressable);
    stubs.clearDelays();
    await d.settle(1600);
    await d.closeModal();
  }

  // ---- the question, and the two answers --------------------------------
  {
    await openReport(d, "submitted");
    await d.clickText("Send again", { inModal: true, exact: true });
    const asked = await d.modalText();
    check("window-states/report-asks-before-sending",
      asked.indexOf("Send this report again to everyone set for this form?") >= 0
        && asked.indexOf("Send it") >= 0 && asked.indexOf("Not yet") >= 0,
      "the window asked " + JSON.stringify(asked.slice(-140)));

    const mark = d.mark();
    const backed = await d.clickText("Not yet", { inModal: true, exact: true });
    await d.settle(250);
    const after = await d.modalText();
    const sent = d.callsSince(mark).filter((c) => c.method === "POST" && c.path.indexOf("/resend") >= 0);
    check("window-states/report-not-yet-sends-nothing",
      !!backed && sent.length === 0 && after.indexOf("Send this report again") < 0 && after.indexOf("Send again") >= 0,
      sent.length ? "Not yet sent " + sent.length + " request(s)" : "the question is still on screen after Not yet");
    await d.closeModal();
  }

  // ---- the line it writes afterward -------------------------------------
  {
    stubs.reset();
    await d.reload();
    await openReport(d, "submitted");
    await d.clickText("Send again", { inModal: true, exact: true });
    const mark = d.mark();
    await d.clickText("Send it", { inModal: true, exact: true });
    await d.settle(600);
    const text = await d.modalText();
    const sent = d.callsSince(mark).find((c) => c.method === "POST" && c.path.indexOf("/resend") >= 0);
    check("window-states/report-sent-line-with-a-link",
      !!sent && text.indexOf("Sent again: 3 emails and 2 app notices, with a link to the app.") >= 0,
      !sent ? "nothing was sent" : "the line read " + JSON.stringify(text.slice(-160)));
    await d.closeModal();
  }
  {
    // The same send, with the form set to carry the report itself.
    await openWhoGetsTold(d);
    await d.clickText(PDF_CHOICE, { exact: true });
    await d.settle(500);
    await openReport(d, "submitted");
    await d.clickText("Send again", { inModal: true, exact: true });
    await d.clickText("Send it", { inModal: true, exact: true });
    await d.settle(600);
    const text = await d.modalText();
    check("window-states/report-sent-line-with-the-pdf",
      text.indexOf("Sent again: 3 emails and 2 app notices, with the PDF attached.") >= 0,
      "the line read " + JSON.stringify(text.slice(-160)));
    await d.closeModal();
    stubs.reset();
    await d.reload();
  }

  // ---- one send, however many presses -----------------------------------
  {
    stubs.setDelay("/resend", 900);
    await openReport(d, "submitted");
    await d.clickText("Send again", { inModal: true, exact: true });
    const mark = d.mark();
    const clicks = await d.page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === "Send it");
      if (!b) return 0;
      b.click(); b.click();
      return 2;
    });
    await d.settle(1400);
    const sent = d.callsSince(mark).filter((c) => c.method === "POST" && c.path.indexOf("/resend") >= 0);
    check("window-states/report-double-click-sends-once", clicks === 2 && sent.length === 1,
      clicks !== 2 ? "the Send it button was not on screen" : "two presses sent " + sent.length + " requests");
    stubs.clearDelays();
    await d.closeModal();
    stubs.reset();
    await d.reload();
  }

  // Every declared state has to have been driven above.
  inventory.WINDOW_STATES.forEach((w) => {
    if (!driven.has(w.id)) results.noCase("window", w.id, w.name);
  });

  // ---- the delivery switch, past the decision itself ---------------------
  {
    // A refusal puts the choice back on what the server holds, and the note goes with it.
    stubs.setRefusal({ method: "PATCH", path: "/api/notification-recipients/forms/", status: 503,
      error: "The delivery setting has not been set up yet" });
    await openWhoGetsTold(d);
    await d.clickText(PDF_CHOICE, { exact: true });
    await d.settle(500);
    const body = await d.bodyText();
    const said = body.indexOf("The delivery setting has not been set up yet") >= 0;
    const noNote = body.indexOf("Every email about this form carries everything the report says") < 0;
    results.check("page", "page/settings/delivery-snaps-back-on-a-refusal", said && noNote,
      !said ? "the 503 is nowhere on the screen" : "the note is on screen although the server refused the change");
    stubs.clearRefusals();
    await d.reload();
  }
  {
    // The Every form list has no control of its own: two forms, two controls.
    await openWhoGetsTold(d);
    const body = await d.bodyText();
    const count = body.split(PDF_CHOICE).length - 1;
    const forms = stubs.fixtures.NOTIFICATION_FORMS.length;
    results.check("page", "page/settings/delivery-is-per-form", count === forms,
      "the tab draws " + count + " delivery controls for " + forms + " forms, so Every form has one too");
  }

  // ---- the Help page, when a report is refused for missing answers -------
  {
    const NAMED = "Who did you tell about this?";
    stubs.setRefusal({ method: "POST", path: "/submit", status: 422, error: "Required fields are unanswered",
      body: { missing: ["reported_to"], missingFields: [{ key: "reported_to", label: NAMED }] } });
    await d.goto("help");
    await d.clickText("Resume", { exact: true });
    await d.clickText("Submit report", { exact: false });
    await d.settle(500);
    const body = await d.bodyText();
    results.check("page", "page/help/missing-answers-named",
      body.indexOf("Still needed before you can submit") >= 0 && body.indexOf(NAMED) >= 0,
      "the page lists " + JSON.stringify(body.slice(body.indexOf("Still needed"), body.indexOf("Still needed") + 120)));
    stubs.clearRefusals();
  }
  {
    // The same refusal without the labels behaves as it always did: the keys, turned into words.
    stubs.setRefusal({ method: "POST", path: "/submit", status: 422, error: "Required fields are unanswered",
      body: { missing: ["reported_to"] } });
    await d.reload();
    await d.goto("help");
    await d.clickText("Resume", { exact: true });
    await d.clickText("Submit report", { exact: false });
    await d.settle(500);
    const body = await d.bodyText();
    results.check("page", "page/help/missing-answers-unnamed",
      body.indexOf("Still needed before you can submit") >= 0 && body.indexOf("Reported to") >= 0,
      "the page lists " + JSON.stringify(body.slice(body.indexOf("Still needed"), body.indexOf("Still needed") + 120)));
    stubs.clearRefusals();
  }
}

module.exports = { run };
