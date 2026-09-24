// The questions Schedule and Shift Pickup ask before they change something, and the word a custom
// date range puts between its two dates, in the language the screen is drawn in.
//
// Step 129 taught the finder to see window.confirm and a lone lowercase word on screen, and it found
// five questions on those two pages still written in English, and the "to" in DateRangePicker.
// They go through the word table now. The driver keeps every question the page asks in place of the
// browser's box; this suite has it answer No, which changes nothing, and reads the words it kept.
"use strict";

// A pickup on the week grid carries its state beside its hours, so a shift is the chip without one.
const notAPickup = (d) => new RegExp(["OPEN", "CLAIMED", "DROP REQ"].map((w) => d.say(w)).join("|"));

// Each question by the English it is keyed by, and the steps that put it on screen. A shift chip on
// the week grid starts with its hours: the first site's shift tonight is a single one, and the
// second site's this morning was written by a weekly pattern.
const QUESTIONS = [
  { id: "page/schedule/question/delete-shift", key: "Delete this scheduled shift? This cannot be undone.",
    ask: async (d) => { await d.goto("schedule"); return (await d.clickGridCell(/^18:00-02:00/, notAPickup(d))) && d.clickText(d.say("Delete"), { inModal: true }); } },
  { id: "page/schedule/question/cancel-pattern-date", key: "Cancel this shift? The pattern will not add it again.",
    ask: async (d) => { await d.goto("schedule"); return (await d.clickGridCell(/^06:00-14:00/, notAPickup(d))) && d.clickText(d.say("Cancel this date"), { inModal: true }); } },
  { id: "page/schedule/question/cancel-inspection", key: "Cancel this inspection?",
    ask: async (d) => { await d.goto("schedule"); return (await d.clickGridCell(/quality walk|Dock area/)) && d.clickText(d.say("Cancel Inspection"), { inModal: true }); } },
  // Shift Pickup opens on its open shifts, each with Cancel; a claimed one has Release.
  { id: "page/marketplace/question/cancel-open-shift", key: "Cancel this open shift? It will no longer be available for pickup.",
    ask: async (d) => { await d.goto("marketplace"); return d.clickText(d.say("Cancel"), { exact: true }); } },
  { id: "page/marketplace/question/release-shift", key: "Release this shift back to the open pool?",
    ask: async (d) => { await d.goto("marketplace"); await d.clickText(d.say("Claimed|shift"), { exact: false }); return d.clickText(d.say("Release"), { exact: true }); } },
];

async function run({ d, results, lang }) {
  await d.signOutHard();
  await d.signIn("admin");
  await d.setConfirmAnswer(false);
  try {
    for (const q of QUESTIONS) {
      await d.clearCaptures();
      const pressed = await q.ask(d).catch(() => false);
      await d.settle(300);
      const want = d.say(q.key);
      const got = (await d.confirms())[0];
      results.check("page", q.id + "/" + lang, !!pressed && got === want,
        !pressed ? "the button that asks the question could not be pressed"
          : got === undefined ? "pressing the button asked no question"
            : "the question reads " + JSON.stringify(got) + " where the table says " + JSON.stringify(want));
      await d.closeModal().catch(() => {});
    }

    // The custom range on Shift Pickup: the word between the two date fields.
    await d.goto("marketplace");
    await d.clickText(d.say("Custom"), { exact: true }).catch(() => false);
    const between = await d.page.evaluate(() => {
      const span = Array.from(document.querySelectorAll("span")).find((s) => s.previousElementSibling && s.nextElementSibling
        && s.previousElementSibling.matches("input[type=date]") && s.nextElementSibling.matches("input[type=date]"));
      return span ? span.textContent.trim() : null;
    });
    const want = d.say("to|between two dates");
    results.check("page", "page/marketplace/date-range-to/" + lang, between === want,
      between === null ? "the custom date range did not open" : "the range joins its dates with " + JSON.stringify(between) + " where the table says " + JSON.stringify(want));
    results.note("Schedule and Shift Pickup in " + lang + ": " + QUESTIONS.length + " questions and the date range read");
  } finally {
    await d.setConfirmAnswer(true).catch(() => {});
  }
}

module.exports = { run, QUESTIONS };
