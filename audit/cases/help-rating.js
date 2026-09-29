// Rating an answer, and names under it, Step 185 (1cbffda), in English and in Spanish at 1280.
//
// Help's page rates an answer the way the portal does. Under each answer that carries its id, the one
// done carries or the conversation stores, Was this helpful? offers Yes and No: Yes posts helpful true at
// once, No opens What was missing? and Send posts helpful false with the note, and either draws the
// thanks line. An answer read back from the conversation with a rating stored on it draws that rating
// on its buttons, and a No with a note draws the note under them. The line under an answer names each
// source by the name the API sent for it, citedNames, rather than by its code. The words are written out
// here by hand, so a wrong entry in the table is red and not merely followed.
"use strict";

const WORDS = {
  en: { helpful: "Was this helpful?", yes: "Yes", no: "No", missing: "What was missing?", thanks: "Thanks. This helps Help get better.", basedOn: "Based on ",
    names: ["Staff portal guide", "Practice procedure seven"] },
  es: { helpful: "\u00bfLe sirvi\u00f3?", yes: "S\u00ed", no: "No", missing: "\u00bfQu\u00e9 falt\u00f3?", thanks: "Gracias. Esto ayuda a mejorar la Ayuda.", basedOn: "Seg\u00fan ",
    names: ["Gu\u00eda del portal del personal", "Procedimiento de pr\u00e1ctica siete"] },
};
const CITED = ["APP-PORTAL", "DOC-PRACTICE-7"];
const NOTE = "The part about the dock gate was missing.";
const STORED_NOTE = "The steps for the dock log.";
const TALK = "hr-rated";

// Every rating row on the page, oldest first: its buttons with whether each is pressed, and its lines.
const ratingRows = (d, helpful) => d.page.evaluate((h) => Array.from(document.querySelectorAll("span"))
  .filter((sp) => (sp.textContent || "").trim() === h)
  .map((sp) => {
    const row = sp.parentElement;
    const box = row.parentElement;
    return {
      buttons: Array.from(row.querySelectorAll("button")).map((b) => ({ text: (b.textContent || "").trim(), pressed: b.getAttribute("aria-pressed") === "true" })),
      lines: Array.from(box.children).slice(1).map((x) => (x.textContent || "").trim()).filter(Boolean),
    };
  }), helpful);
// The line under each answer that names its sources.
const sourceLines = (d, basedOn) => d.page.evaluate((b) => Array.from(document.querySelectorAll("div"))
  .filter((x) => x.children.length === 0 && (x.textContent || "").indexOf(b) === 0).map((x) => (x.textContent || "").trim()), basedOn);

async function run({ d, results, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  const names = CITED.map((code, i) => ({ code, name: w.names[i] }));
  const describe = d.say("Describe what happened");
  const send = d.say("Send");
  const ask = async (text) => {
    await d.page.locator('textarea[aria-label="' + describe + '"]').fill(text);
    await d.page.locator('button[aria-label="' + send + '"]').click({ timeout: 8000 });
  };
  const rowsUntil = async (n) => {
    const end = Date.now() + 8000;
    let rows = [];
    while (Date.now() < end) { rows = await ratingRows(d, w.helpful); if (rows.length >= n) return rows; await d.page.waitForTimeout(80); }
    return rows;
  };
  const press = (i, word) => d.page.evaluate(([h, n, text]) => {
    const sp = Array.from(document.querySelectorAll("span")).filter((x) => (x.textContent || "").trim() === h)[n];
    const b = sp && Array.from(sp.parentElement.querySelectorAll("button")).find((x) => (x.textContent || "").trim() === text);
    if (b) b.click();
    return !!b;
  }, [w.helpful, i, word]);
  const feedbackSince = (mark) => d.callsSince(mark).filter((c) => c.method === "POST" && /^\/api\/agent\/messages\/[^/]+\/feedback$/.test(c.path));

  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");
  await d.goto("help");

  // ---- an answer that names its sources, rated Yes
  stubs.setAgentStream({ pieces: ["Log the refill on Supplies."], done: { messageId: "hm-rate-1", citedDocs: CITED, citedNames: names } });
  await ask("Where do I log a soap refill?");
  const first = await rowsUntil(1);
  const lines = await sourceLines(d, w.basedOn);
  const wantLine = w.basedOn + w.names.join(", ");
  results.check("help", "help/rating/a-source-reads-by-its-name" + tail, lines.indexOf(wantLine) >= 0,
    "the line under the answer reads " + JSON.stringify(lines) + " where it should read " + JSON.stringify(wantLine));
  let mark = d.mark();
  const pressedYes = first.length === 1 && (await press(0, w.yes));
  await d.settle(400);
  const yes = feedbackSince(mark);
  const afterYes = await ratingRows(d, w.helpful);
  results.check("help", "help/rating/yes-posts-helpful-true" + tail,
    pressedYes && yes.length === 1 && yes[0].path === "/api/agent/messages/hm-rate-1/feedback" && JSON.stringify(yes[0].body) === JSON.stringify({ helpful: true })
      && afterYes[0] && afterYes[0].lines.indexOf(w.thanks) >= 0,
    first.length !== 1 ? "the answer carries " + first.length + " rating rows" : !pressedYes ? "no " + JSON.stringify(w.yes) + " under the answer"
      : yes.length !== 1 ? "Yes posted " + yes.length + " times" : "Yes posted " + JSON.stringify(yes[0].body) + " to " + yes[0].path + " and the row reads " + JSON.stringify(afterYes[0] && afterYes[0].lines));

  // ---- another answer, rated No with a note
  stubs.setAgentStream({ pieces: ["The dock log is signed at close."], done: { messageId: "hm-rate-2", citedDocs: [], citedNames: [] } });
  await ask("Who signs the dock log?");
  const second = await rowsUntil(2);
  mark = d.mark();
  const pressedNo = second.length === 2 && (await press(1, w.no));
  await d.settle(300);
  const noteBox = d.page.locator('textarea[aria-label="' + w.missing + '"]');
  const boxShown = (await noteBox.count()) > 0;
  const beforeSend = feedbackSince(mark).length;
  if (boxShown) {
    await noteBox.first().fill(NOTE);
    await d.page.evaluate(([label, word]) => {
      const box = document.querySelector('textarea[aria-label="' + label + '"]');
      const b = box && Array.from(box.closest("div").parentElement.querySelectorAll("button")).find((x) => (x.textContent || "").trim() === word);
      if (b) b.click();
    }, [w.missing, send]);
    await d.settle(400);
  }
  const no = feedbackSince(mark);
  const afterNo = await ratingRows(d, w.helpful);
  results.check("help", "help/rating/no-posts-helpful-false-and-the-note" + tail,
    pressedNo && boxShown && beforeSend === 0 && no.length === 1 && no[0].path === "/api/agent/messages/hm-rate-2/feedback"
      && JSON.stringify(no[0].body) === JSON.stringify({ helpful: false, note: NOTE }) && afterNo[1] && afterNo[1].lines.indexOf(w.thanks) >= 0,
    !pressedNo ? "no " + JSON.stringify(w.no) + " under the second answer" : !boxShown ? "No did not open " + JSON.stringify(w.missing)
      : beforeSend ? "No posted before the note was sent" : no.length !== 1 ? "the note was posted " + no.length + " times"
        : "No posted " + JSON.stringify(no[0].body) + " and the row reads " + JSON.stringify(afterNo[1] && afterNo[1].lines));

  // ---- an answer read back from the conversation, with its rating stored on it
  const drafts = stubs.fixtures.AGENT_DRAFTS;
  const theirs = drafts.slice();
  drafts.splice(0, drafts.length, { id: "hr-1", formName: "Practice report 1", answered: 3, remaining: 0, status: "draft", conversationId: TALK });
  stubs.fixtures.AGENT_CONVERSATIONS[TALK] = [
    { role: "user", text: "What goes in the dock log?" },
    { id: "hm-rate-3", role: "assistant", text: "The time, the gate and who closed it.", citedDocs: CITED, citedNames: names, feedback: { helpful: false, note: STORED_NOTE, at: "2026-03-16T15:00:00Z" } },
  ];
  try {
    await d.goto("help");
    await d.settle(300);
    const resumed = await d.page.getByRole("button", { name: d.say("Resume") }).first().click({ timeout: 5000 }).then(() => true, () => false);
    const back = await rowsUntil(1);
    const stored = back[back.length - 1];
    const noPressed = !!stored && stored.buttons.some((b) => b.text === w.no && b.pressed) && !stored.buttons.some((b) => b.text === w.yes && b.pressed);
    results.check("help", "help/rating/a-read-back-answer-shows-its-rating" + tail,
      resumed && noPressed && stored.lines.indexOf(w.missing + " " + STORED_NOTE) >= 0 && stored.lines.indexOf(w.thanks) < 0,
      !resumed ? "the report could not be resumed" : !stored ? "the answer read back carries no rating row"
        : !noPressed ? "the buttons read " + JSON.stringify(stored.buttons) + " where No is the rating stored"
          : "the row reads " + JSON.stringify(stored.lines) + " where it should say " + JSON.stringify(w.missing + " " + STORED_NOTE) + " and no thanks");
  } finally {
    drafts.splice(0, drafts.length, ...theirs);
    delete stubs.fixtures.AGENT_CONVERSATIONS[TALK];
  }
  stubs.reset();
  results.note("Rating an answer in " + lang + ": the sources by name, Yes, No with a note, and a rating read back");
}

module.exports = { run };
