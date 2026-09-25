// Every printed page on a page taken as done, read in the language the screen is drawn in.
//
// A print is a page the dashboard builds as a string of HTML, writes into a new window and prints.
// The finder counts its words in the source; this reads what the window was actually given. The
// driver keeps every window the page opens, so each print is opened the way a person opens it and
// its text read between the tags, its stylesheet left out. In Spanish, what the English check finds
// once the Spanish, the served values and the dates are taken out has to be nothing. In English the
// page has to open and carry its words.
"use strict";
const { englishLeftOn } = require("../lib/english");

// The words of a printed page: the text between its tags, in order, with its stylesheet left out and
// an entity read as the mark it stands for. A line the page runs together with " | " or a middle dot
// is several things side by side, a count, a channel and a date, so each is read as a line of its own.
const printLines = (html) => String(html || "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .split(/<[^>]+>/)
  .map((x) => x.replace(/&middot;/g, " | ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"))
  .reduce((out, x) => out.concat(x.split(/\s+\|\s+/)), [])
  .map((x) => x.replace(/\s+/g, " ").trim())
  .filter(Boolean);

// The first site's profile, which carries a chat channel and a timeline.
async function openSite(d) {
  await d.goto("sites");
  await d.clickRow(0);
  await d.settle(400);
}
// The first person's profile on Staff Management, which carries a timeline and a profile report.
async function openPerson(d) {
  await d.goto("staff");
  await d.clickRow(0);
  await d.settle(400);
}
const tab = async (d, word) => { await d.clickText(d.say(word), { exact: true }); await d.settle(400); };
// A saved report, run from the library by the name it was saved under, and its PDF export pressed.
async function exportReport(d, name) {
  await d.goto("reports");
  if (!(await d.clickRunFor(name))) return false;
  await d.settle(600);
  return d.clickText(d.say("Export PDF"), { exact: true });
}

// Each print by what it is, and the steps that put it in a window.
const PRINTS = [
  { id: "sites/chat-history", what: "a site's chat history",
    open: async (d) => { await openSite(d); await tab(d, "Chat"); return d.clickText(d.say("Print"), { exact: true }); } },
  { id: "sites/timeline", what: "a site's timeline",
    open: async (d) => { await openSite(d); await tab(d, "Timeline"); return d.clickText(d.say("Print"), { exact: true }); } },
  // The record behind the timeline's first entry, opened from its window.
  { id: "sites/record", what: "a record from a site's timeline",
    open: async (d, stubs) => {
      await openSite(d); await tab(d, "Timeline");
      const served = stubs.calls.filter((c) => /\/timeline/.test(c.path) && c.json && Array.isArray(c.json.entries)).pop();
      const first = served && served.json.entries[0];
      if (!first || !(await d.clickText(first.description, { exact: true }))) return false;
      await d.settle(400);
      return d.clickText(d.say("Print"), { exact: true, inModal: true });
    } },
  // Staff Management's three: the record behind the first entry of a person's timeline, the timeline,
  // and the profile report. The report is printed from the Timeline tab, so the timeline it carries
  // is printed with it.
  { id: "staff/record", what: "a record from a person's timeline",
    open: async (d, stubs) => {
      await openPerson(d); await tab(d, "Timeline");
      const served = stubs.calls.filter((c) => /^\/api\/users\/timeline\//.test(c.path) && c.json && Array.isArray(c.json.entries)).pop();
      const first = served && served.json.entries[0];
      if (!first || !(await d.clickText(first.description, { exact: true }))) return false;
      await d.settle(400);
      return d.clickText(d.say("Print"), { exact: true, inModal: true });
    } },
  { id: "staff/timeline", what: "a person's timeline",
    open: async (d) => { await openPerson(d); await tab(d, "Timeline"); return d.clickText(d.say("Print"), { exact: true }); } },
  { id: "staff/profile-report", what: "a person's profile report",
    open: async (d) => { await openPerson(d); await tab(d, "Timeline"); return d.clickText(d.say("Print Report"), { exact: true }); } },
  // Each report's printed page, from the saved report of its source. The issue report is the one
  // saved with the SLA panel on, so every table it can print is on the page.
  { id: "reports/issue-timing", what: "the issue report",
    open: (d) => exportReport(d, "Issue response and resolution") },
  { id: "reports/supply-usage", what: "the supply report",
    open: (d) => exportReport(d, "Supply usage and cost") },
  { id: "reports/inspection-quality", what: "the inspection report",
    open: (d) => exportReport(d, "Inspection scores and quality") },
];

async function run({ d, results, lang, stubs }) {
  await d.signOutHard();
  await d.signIn("admin");
  let read = 0;
  for (const p of PRINTS) {
    await d.clearCaptures();
    const pressed = await p.open(d, stubs).catch(() => false);
    await d.settle(400);
    const printed = (await d.prints()).pop();
    const lines = printLines(printed && printed.html);
    const id = "page/prints/" + p.id + "/" + lang;
    if (!pressed || !printed || lines.length === 0) {
      results.check("page", id, false, !pressed ? "the button that prints " + p.what + " could not be pressed"
        : !printed ? "pressing Print opened no window" : "the printed page carries no words");
    } else if (lang === "en") {
      results.check("page", id, true, "");
    } else {
      const left = englishLeftOn(lines, stubs.calls);
      results.check("page", id, left.length === 0,
        left.length + " lines of the printed page are not Spanish: " + left.slice(0, 6).map((x) => JSON.stringify(x.left || x.line)).join(", "));
    }
    if (pressed && printed) read += 1;
    await d.closeModal().catch(() => {});
  }
  results.note("printed pages in " + lang + ": " + read + " of " + PRINTS.length + " opened and read");
}

module.exports = { run, PRINTS };
