// Six small things before training, Step 151: what a lead sees from October 1, in English and in
// Spanish at 1280.
//
// Schedule's Month view counts the shifts started on a day with the count entry Live Ops already
// had, so one day reads "1 started" and "1 iniciado" and another "2 started" and "2 iniciados"; the
// suite has the stub serve one session on one day and two on another, and reads the month. The
// Issues page draws one line when the API answers no issue at all, and no such line when it answers
// rows. Live Ops' Refresh draws the circular arrow the Dashboard's Refresh draws, read off each
// button's own path, and never the plus. Settings, Who gets told, names the complaint log by its
// title in the screen's language beside its code. The words are written out here by hand, so a wrong
// entry in the table is red and not merely followed.
"use strict";
const fs = require("fs");
const path = require("path");

const APP = path.resolve(__dirname, "..", "..", "src", "App.js");

// What the screen has to say, by hand.
const STARTED = {
  en: { one: "1 started", two: "2 started" },
  es: { one: "1 iniciado", two: "2 iniciados" },
};
const NO_ISSUES = { en: "No problems reported yet.", es: "Todav\u00eda no se ha reportado ning\u00fan problema." };
const COMPLAINT_LOG = { en: "Customer Complaint Log", es: "Registro de quejas de clientes" };

// The path of an icon the app draws, read out of src/App.js.
function iconPath(name) {
  const m = new RegExp("^const " + name + " = p => <Ic d=\"([^\"]+)\"", "m").exec(fs.readFileSync(APP, "utf8"));
  return m ? m[1] : null;
}

// The path drawn inside the button that says a label on the page that is open, or null.
const buttonPath = (d, label) => d.page.evaluate((text) => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === text && b.querySelector("svg path"));
  return btn ? btn.querySelector("svg path").getAttribute("d") : null;
}, label);

async function run({ d, results, seed, stubs, lang }) {
  const words = STARTED[lang] || STARTED.en;
  await d.signOutHard();
  await d.signIn("admin");
  const S = seed.SITES;

  // ---- Schedule, Month: one person started on the 10th, two on the 11th
  const one = "2026-03-10";
  const two = "2026-03-11";
  const person = (id, name, day, at) => ({ sessionId: "ss-" + id, userId: id, name: name, sessionDate: day, startedAt: day + "T" + at, buildingName: "North Wing", floorNumber: "1", tasksCompleted: 1, tasksTotal: 2 });
  stubs.setShiftSessions({ date: seed.TODAY, sites: [
    { siteId: S[0].id, siteName: S[0].name, people: [person("u-staff-5", "Tomasz Wisniewski", one, "22:05:00Z"), person("u-staff-9", "Yuki Tanabe", two, "22:10:00Z")] },
    { siteId: S[1].id, siteName: S[1].name, people: [person("u-staff-6", "Ngozi Okonkwo", two, "10:30:00Z")] },
  ] });
  try {
    await d.goto("schedule");
    await d.clickText(d.say("Month"), { exact: true });
    await d.settle(600);
    const lines = await d.readable();
    const wrongOne = words.two.replace(/^2/, "1");
    const hasOne = lines.indexOf(words.one) >= 0;
    const hasTwo = lines.indexOf(words.two) >= 0;
    const hasWrong = wrongOne !== words.one && lines.indexOf(wrongOne) >= 0;
    results.check("page", "page/schedule/month-started-count/" + lang, hasOne && hasTwo && !hasWrong,
      !hasOne ? "the month does not say " + JSON.stringify(words.one) + " on the day one person started" + (hasWrong ? ", it says " + JSON.stringify(wrongOne) : "")
        : !hasTwo ? "the month does not say " + JSON.stringify(words.two) + " on the day two people started"
          : hasWrong ? "the month says " + JSON.stringify(wrongOne) + " somewhere"
            : "the month says " + JSON.stringify(words.one) + " on one day and " + JSON.stringify(words.two) + " on another");
  } finally { stubs.setShiftSessions(null); }

  // ---- Issues: one line when the API answers no rows, and none of it when it answers rows
  const want = NO_ISSUES[lang] || NO_ISSUES.en;
  stubs.setIssues([]);
  let drawnEmpty = false;
  try {
    await d.goto("issues");
    await d.settle(400);
    drawnEmpty = (await d.readable()).indexOf(want) >= 0;
  } finally { stubs.setIssues(null); }
  await d.goto("issues");
  await d.settle(400);
  const withRows = await d.readable();
  const drawnWithRows = withRows.indexOf(want) >= 0;
  const rowsDrawn = withRows.indexOf(seed.ISSUES[0].title) >= 0;
  results.check("page", "page/issues/empty-state/" + lang, drawnEmpty && !drawnWithRows && rowsDrawn,
    !drawnEmpty ? "served no issue, the page does not say " + JSON.stringify(want)
      : drawnWithRows ? "served " + seed.ISSUES.length + " issues, the page still says " + JSON.stringify(want)
        : !rowsDrawn ? "served " + seed.ISSUES.length + " issues, the page does not draw the first"
          : "served no issue the page says " + JSON.stringify(want) + ", and served " + seed.ISSUES.length + " it draws them and not the line");

  // ---- Live Ops: Refresh draws the circular arrow the Dashboard's Refresh draws, never the plus
  await d.goto("overview");
  await d.settle(400);
  const dashboardPath = await buttonPath(d, d.say("Refresh"));
  await d.goto("operations");
  await d.settle(400);
  const opsPath = await buttonPath(d, d.say("Refresh"));
  const arrow = iconPath("RfI");
  const plus = iconPath("PlI");
  results.check("page", "page/operations/refresh-draws-the-arrow/" + lang, !!arrow && !!opsPath && opsPath === arrow && opsPath === dashboardPath && opsPath !== plus,
    !arrow ? "src/App.js has no RfI icon" : !opsPath ? "Live Ops has no Refresh button with an icon"
      : opsPath === plus ? "Live Ops' Refresh draws the plus"
        : opsPath !== arrow ? "Live Ops' Refresh draws a path that is not RfI's"
          : opsPath !== dashboardPath ? "Live Ops' Refresh draws RfI and the Dashboard's Refresh draws " + JSON.stringify(dashboardPath)
            : "Live Ops' Refresh draws the same circular arrow as the Dashboard's Refresh");

  // ---- Settings, Who gets told: the complaint log by its title in the screen's language, beside its code
  await d.goto("settings");
  await d.settle(400);
  await d.clickText(d.say("Who gets told"), { exact: true });
  await d.settle(400);
  const told = await d.readable();
  const title = (COMPLAINT_LOG[lang] || COMPLAINT_LOG.en) + " (OCSA-FRM-009)";
  const english = COMPLAINT_LOG.en + " (OCSA-FRM-009)";
  const named = told.indexOf(title) >= 0;
  const inEnglish = title !== english && told.indexOf(english) >= 0;
  results.check("page", "page/settings/complaint-log-title/" + lang, named && !inEnglish,
    inEnglish ? "Who gets told names the complaint log in English, " + JSON.stringify(english) + ", where it should say " + JSON.stringify(title)
      : !named ? "Who gets told does not name " + JSON.stringify(title) : "Who gets told names " + JSON.stringify(title));

  results.note("Before training in " + lang + ": the month's started count at one and two, the Issues page with no rows and with " + seed.ISSUES.length + ", Live Ops' Refresh icon and the complaint log's title");
}

module.exports = { run };
