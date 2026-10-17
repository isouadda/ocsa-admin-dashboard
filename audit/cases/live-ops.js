// Live Ops shows the day you pick (part 351). The owner's ticket of Oct 16, 2026: a past day on Live Ops
// showed the same start times and task counts as today. GET /api/shift-sessions/by-site?date= answers
// every session still open whatever its day, the most recent per person, so a past day read as today;
// start_date and end_date answer that day's sessions. The stub answers both forms as the API does, with
// sessions today and yesterday (SHIFT_SESSIONS and SHIFT_SESSIONS_EARLIER).
//
// Yesterday is picked, then today: each time the board holds exactly that day's people, each with the
// start time and the task count of that day's session, the heading and the count line name the day,
// and a past day is read once while today is read again every 30 seconds.
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "live-ops";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];

// What the board should read for a day's sessions: per site, each person's name, start and count.
function expected(sites) {
  const out = {};
  sites.forEach((site) => {
    out[site.siteName] = site.people.map((p) => p.name + " | Started " + new Date(p.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: seed.TIMEZONE })
      + " | " + p.tasksCompleted + " of " + p.tasksTotal + " tasks").sort();
  });
  return out;
}

// What the board reads: per site card, each person row's name, start and count.
async function boardOf(d) {
  return d.page.evaluate(() => {
    const out = {};
    document.querySelectorAll("[data-ops-site]").forEach((head) => {
      const card = head.parentElement;
      const site = (head.firstElementChild ? head.firstElementChild.innerText : "").trim();
      const rows = Array.from(card.children).slice(1).filter((r) => /Started /.test(r.innerText || ""));
      out[site] = rows.map((r) => {
        const lines = (r.innerText || "").split("\n").map((x) => x.trim()).filter(Boolean);
        // The avatar's initials come first; the name is the first line of the block beside it.
        const who = r.children[1] && r.children[1].firstElementChild ? r.children[1].firstElementChild.innerText.trim() : "";
        const started = lines.find((x) => /^Started /.test(x)) || "";
        const count = lines.find((x) => / of \d+ tasks$/.test(x)) || "";
        return who + " | " + started + " | " + count;
      }).sort();
    });
    return out;
  });
}

const dayWord = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

async function run(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  const today = seed.TODAY;
  const yesterday = seed.shift(-1);
  const sessionReads = (mark) => d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/shift-sessions/by-site");
  const pick = async (day) => {
    await d.page.locator("input[type=date]").first().fill(day);
    await d.settle(700);
  };
  const look = async (day, want, heading, countLine) => {
    const id = "live-ops/" + (day === today ? "today" : "yesterday");
    const got = await boardOf(d);
    const text = await d.bodyText();
    const field = await d.page.locator("input[type=date]").first().inputValue().catch(() => null);
    const off = Object.keys(want).concat(Object.keys(got)).filter((k, i, a) => a.indexOf(k) === i)
      .filter((k) => JSON.stringify(want[k] || []) !== JSON.stringify(got[k] || []));
    results.check(KIND, id + "/the-board-is-the-day", field === day && off.length === 0,
      field !== day ? "the Date field holds " + field + " where " + day + " was picked"
        : off.map((k) => k + " reads " + JSON.stringify(got[k] || []) + " where " + day + "'s sessions are " + JSON.stringify(want[k] || [])).join("; "));
    results.check(KIND, id + "/the-heading-names-the-day", text.indexOf(heading) >= 0 && text.indexOf(countLine) >= 0,
      text.indexOf(heading) < 0 ? "the heading does not read " + JSON.stringify(heading) : "the count line does not read " + JSON.stringify(countLine));
  };
  try {
    await d.signIn("admin");
    await d.goto("operations");
    await d.settle(700);
    const todayWant = expected(stubs.fixtures.SHIFT_SESSIONS.sites);
    const yesterdayWant = expected(stubs.fixtures.SHIFT_SESSIONS_EARLIER);
    const count = (want) => Object.keys(want).reduce((a, k) => a + want[k].length, 0);

    // Yesterday, asked as that day and read once.
    let mark = d.mark();
    await pick(yesterday);
    const asked = sessionReads(mark).pop();
    const q = new URLSearchParams(asked ? asked.query : "");
    results.check(KIND, "live-ops/yesterday/asks-the-day", !!asked && q.get("start_date") === yesterday && q.get("end_date") === yesterday && q.get("date") === null,
      !asked ? "picking " + yesterday + " read nothing" : "picking " + yesterday + " asked " + (asked.query || "nothing") + " where start_date and end_date are both " + yesterday);
    await look(yesterday, yesterdayWant, "Started on " + dayWord(yesterday), count(yesterdayWant) + " started on " + dayWord(yesterday));
    mark = d.mark();
    await wait(32000);
    const again = sessionReads(mark).length;
    results.check(KIND, "live-ops/yesterday/is-read-once", again === 0,
      "a past day was read " + again + " more times in 32 seconds, where it does not change");

    // Today, read again every 30 seconds.
    await pick(today);
    await look(today, todayWant, "Started today", count(todayWant) + " started today");
    mark = d.mark();
    await wait(32000);
    const kept = sessionReads(mark).length;
    results.check(KIND, "live-ops/today/is-read-every-30-seconds", kept >= 1,
      "today was not read again in 32 seconds");
  } catch (e) {
    results.fail(KIND, "live-ops/suite", threw(e));
  } finally { await d.close(); }
}

module.exports = { run };
