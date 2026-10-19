// Send the welcome email to everyone who has not signed in (part 361), against the invite route as ocsa-api
// main af63dca answers it, which audit/welcome-all-stub.js answers once setStep361 arms it for people of
// its own. Each case fails on main as it stood at 49b2d77 and passes once the part is in.
//
//   the list        Send welcome emails lists the active people who have never signed in and have a
//                   working email, and leaves out the ones with no email, a placeholder email, a welcome
//                   in the last 7 days, a test account and an account the admin may not change, each
//                   under its reason, with the count of those who have signed in; nobody inactive
//   the switch      Include people sent one in the last 7 days adds that person and takes them back out
//   one at a time   Send to 5 people asks once and posts once per person, in order, each after the one
//                   before was answered and a pause; a second press while it runs does nothing; closing
//                   the window stops nothing, the list's button reads how far it has got, and the end
//                   says the counts in a toast
//   a refusal       each person reads Sent or Not sent with the API's reason, and Try the ones that
//                   failed posts again to those two alone, asking nothing
//   the CSV         Download CSV saves name, email, Sent or the reason, and the time, for each person
//   who             offered to the admin, and not to a supervisor who holds manage_staff
//   in Spanish      the window, the question, the API's reason and the CSV in Spanish
//   on a phone      the window fits 390 wide
//
// The suite makes its own drivers, each with a stub of its own, like the round2 suite.
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "welcome-all";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const PAUSE_MS = 900;
const ANSWER_MS = 400;
const SEND = ["u-wel-1", "u-wel-2", "u-wel-4", "u-wel-9", "u-wel-10"];
const LEFT = { noEmail: ["u-wel-5"], placeholder: ["u-wel-6"], recent: ["u-wel-3"], test: ["u-wel-7"], notYours: ["u-wel-11"] };
// The seed's ten active people, who have all signed in.
const SIGNED_IN = 10;
const REFUSED = { en: "This person has already signed in.", es: "Esta persona ya inici\u00f3 sesi\u00f3n." };
const NOT_SENT = { en: "The email could not be sent. Try again later.", es: "No se pudo enviar el correo. Int\u00e9ntelo m\u00e1s tarde." };
const SAID = {
  en: { sendTo: (n) => "Send to " + n + (n === 1 ? " person" : " people"), ask: "Send the welcome email to 5 people now? Anyone sent one before gets a new link, and the last one stops working.",
    signedIn: "10 people have already signed in.", notSent: "Not sent: ", sent: "Sent", head: ["Name", "Email", "Result", "Time"], toast: "Welcome emails: 3 sent, 2 not sent" },
  es: { sendTo: (n) => "Enviar a " + n + (n === 1 ? " persona" : " personas"), ask: "\u00bfEnviar ahora el correo de bienvenida a 5 personas? Quien ya recibi\u00f3 uno recibe un enlace nuevo, y el anterior deja de funcionar.",
    signedIn: "10 personas ya iniciaron sesi\u00f3n.", notSent: "No se envi\u00f3: ", sent: "Enviado", head: ["Nombre", "Correo", "Resultado", "Hora"], toast: "Correos de bienvenida: 3 enviados, 2 no enviados" },
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// One CSV, cells unquoted.
function readCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// What the window reads before anything is sent: whom it sends to, each left-out group with its heading
// and people, the signed-in count, and the send button's words.
async function planOf(d) {
  return d.page.evaluate(() => {
    const w = document.querySelector("[data-welcome-all-window]");
    if (!w) return null;
    const ids = (root) => Array.from(root.querySelectorAll("[data-welcome-all-person]")).map((x) => x.getAttribute("data-welcome-all-person"));
    const left = {};
    w.querySelectorAll("[data-welcome-all-left]").forEach((g) => { left[g.getAttribute("data-welcome-all-left")] = { head: g.firstElementChild ? g.firstElementChild.innerText.trim() : "", ids: ids(g) }; });
    const list = w.querySelector("[data-welcome-all-send-list]");
    const signed = w.querySelector("[data-welcome-all-signed-in]");
    const button = w.querySelector("[data-welcome-all-send]");
    return { state: w.getAttribute("data-welcome-all-window"), send: list ? ids(list) : [], left, signedIn: signed ? signed.innerText.trim() : "",
      button: button ? button.innerText.trim() : "", disabled: button ? button.disabled : null, text: w.innerText };
  });
}
// What the window reads once a run started: each person's status and line, and the summary.
async function resultsOf(d) {
  return d.page.evaluate(() => {
    const w = document.querySelector("[data-welcome-all-window]");
    if (!w) return null;
    const rows = {};
    w.querySelectorAll("[data-welcome-all-result]").forEach((r) => { rows[r.getAttribute("data-welcome-all-result")] = { status: r.getAttribute("data-welcome-all-status"), text: r.innerText }; });
    const sum = w.querySelector("[data-welcome-all-summary]");
    return { state: w.getAttribute("data-welcome-all-window"), rows, summary: sum ? sum.getAttribute("data-welcome-all-summary") : null, summaryText: sum ? sum.innerText : "",
      retry: !!w.querySelector("[data-welcome-all-retry]"), csv: !!w.querySelector("[data-welcome-all-csv]") };
  });
}
async function openWindow(d) {
  const b = d.page.locator("[data-welcome-all-open]").first();
  if ((await b.count()) === 0) return false;
  await b.click();
  await d.page.locator("[data-welcome-all-window]").first().waitFor({ timeout: 4000 }).catch(() => {});
  await d.settle(150);
  return (await d.page.locator("[data-welcome-all-window]").count()) > 0;
}
// Waits until the run is over: the list's button no longer reads running and the stub holds n invites.
async function untilDone(d, stubs, n, ms) {
  const until = Date.now() + (ms || 20000);
  while (Date.now() < until) {
    const going = await d.page.locator("[data-welcome-all-open='running'], [data-welcome-all-window='running']").count();
    if (stubs.invites361().length >= n && going === 0) return true;
    await wait(100);
  }
  return false;
}
async function staffList(d) {
  await d.goto("staff");
  await d.page.locator("table tbody tr").first().waitFor({ timeout: 8000 }).catch(() => {});
  await d.page.locator("[data-sign-in-state]").first().waitFor({ timeout: 4000 }).catch(() => {});
  await d.settle(200);
}

async function withDriver(ctx, persona, opts, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setStep361(true);
  const d = await createDriver({ browser, origin, stubs, viewport: opts.viewport || "wide", lang: opts.lang || "en" });
  d.page.setDefaultTimeout(8000);
  try {
    await d.signIn(persona);
    await fn(d, stubs);
  } catch (e) {
    results.fail(KIND, "welcome-all/" + persona + (opts.lang === "es" ? "/es" : "") + (opts.viewport === "phone" ? "/390" : "") + "/suite", threw(e));
  } finally { await d.close(); }
}

// ---- the admin, in English or in Spanish ------------------------------------------------------------
async function adminPass(ctx, lang, seen) {
  const { results } = ctx;
  const said = SAID[lang];
  const id = (x) => "welcome-all/" + x + (lang === "es" ? "/es" : "");
  await withDriver(ctx, "admin", { lang }, async (d, stubs) => {
    await staffList(d);
    const offered = (await d.page.locator("[data-welcome-all-open]").count()) > 0;
    if (lang === "en") seen.admin = offered;
    const opened = offered && await openWindow(d);
    const plan = opened ? await planOf(d) : null;
    if (lang === "en") {
      const closes = opened && (await d.page.locator("[data-welcome-all-window] button[aria-label='" + d.say("Close") + "']").count()) > 0;
      results.check("window", "window/staff/welcome-all", !!plan && plan.text.indexOf(d.say("Send welcome emails")) >= 0 && closes,
        !offered ? "Staff Management offers no Send welcome emails" : !plan ? "Send welcome emails opened no window" : "the window does not say Send welcome emails with a Close");
    }

    // The list, and who is left out with their reasons.
    const heads = { noEmail: d.say("No email on file"), placeholder: d.say("Placeholder email"), recent: d.say("Sent one in the last 7 days"), test: d.say("Test account"), notYours: d.say("Accounts you may not change") };
    const leftOff = plan ? Object.keys(LEFT).filter((k) => !plan.left[k] || !same(plan.left[k].ids, LEFT[k]) || plan.left[k].head !== heads[k]) : Object.keys(LEFT);
    const stray = plan ? Object.keys(plan.left).filter((k) => !LEFT[k]) : [];
    const inactiveShown = !!plan && plan.text.indexOf("Ilse Brannigan") >= 0;
    results.check(KIND, id("the-list-holds-the-right-people"), !!plan && same(plan.send, SEND) && plan.button === said.sendTo(5) && !inactiveShown,
      !plan ? "no window to read" : !same(plan.send, SEND) ? "it would send to " + JSON.stringify(plan.send) + " where the people are " + JSON.stringify(SEND)
        : inactiveShown ? "the inactive person is listed" : "the button reads " + JSON.stringify(plan.button) + " where it says " + JSON.stringify(said.sendTo(5)));
    results.check(KIND, id("leaves-out-the-rest-with-their-reasons"), !!plan && leftOff.length === 0 && stray.length === 0 && plan.signedIn === said.signedIn,
      !plan ? "no window to read" : leftOff.length ? leftOff.map((k) => k + " reads " + JSON.stringify(plan.left[k] || null) + " where it is " + JSON.stringify({ head: heads[k], ids: LEFT[k] })).join("; ")
        : stray.length ? "it also leaves out " + stray.join(", ") : "the signed-in line reads " + JSON.stringify(plan.signedIn) + " where it says " + JSON.stringify(said.signedIn));

    // The 7-day switch, on and back off.
    if (plan) {
      await d.page.locator("[data-welcome-all-recent]").first().click();
      await d.settle(120);
      const on = await planOf(d);
      await d.page.locator("[data-welcome-all-recent]").first().click();
      await d.settle(120);
      const off = await planOf(d);
      const withRecent = ["u-wel-1", "u-wel-2", "u-wel-3", "u-wel-4", "u-wel-9", "u-wel-10"];
      results.check(KIND, id("the-seven-day-switch"), same(on.send, withRecent) && !on.left.recent && on.button === said.sendTo(6) && same(off.send, SEND) && !!off.left.recent && off.button === said.sendTo(5),
        "switched on it sends to " + JSON.stringify(on.send) + " (" + on.button + "), and back off to " + JSON.stringify(off.send) + " (" + off.button + ")");
    } else results.check(KIND, id("the-seven-day-switch"), false, "no window to read");

    // Send to 5 people, pressed twice at once: one question, then one post per person, one at a time.
    const calls0 = d.mark();
    await d.clearCaptures();
    if (plan) await d.page.evaluate(() => { const b = document.querySelector("[data-welcome-all-send]"); if (b) { b.click(); b.click(); } });
    const firstArrived = Date.now();
    while (plan && stubs.invites361().length === 0 && Date.now() - firstArrived < 4000) await wait(50);
    // Closing the window while the first is on its way.
    const closeBtn = d.page.locator("[data-welcome-all-window] button[aria-label='" + d.say("Close") + "']").first();
    if (plan && (await closeBtn.count())) await closeBtn.click();
    await d.settle(100);
    const closed = (await d.page.locator("[data-welcome-all-window]").count()) === 0;
    const runningLine = closed ? await d.page.locator("[data-welcome-all-open='running']").first().innerText().catch(() => "") : "";
    const done = plan ? await untilDone(d, stubs, SEND.length) : false;
    const toast = done ? await d.waitToast(3000) : null;
    const asked = await d.confirms();
    const inv = stubs.invites361();
    const posts = d.callsSince(calls0).filter((c) => c.method === "POST" && /\/invite$/.test(c.path));
    const gaps = inv.slice(1).map((x, i) => x.at - inv[i].at);
    if (lang === "en") {
      results.check(KIND, id("one-post-per-person-one-at-a-time"), done && same(inv.map((x) => x.id), SEND) && posts.length === SEND.length && gaps.every((g) => g >= ANSWER_MS + PAUSE_MS),
        !done ? "the run did not finish; the stub holds " + JSON.stringify(inv.map((x) => x.id)) : !same(inv.map((x) => x.id), SEND) ? "it posted to " + JSON.stringify(inv.map((x) => x.id)) + " where the people are " + JSON.stringify(SEND)
          : posts.length !== SEND.length ? posts.length + " invites were posted for " + SEND.length + " people" : "a post went " + Math.min.apply(null, gaps) + " ms after the one before, under its answer and the pause");
      results.check(KIND, id("asks-once-and-a-second-press-does-nothing"), asked.length === 1 && asked[0] === said.ask && posts.length === SEND.length,
        asked.length !== 1 ? "two presses asked " + asked.length + " times" : asked[0] !== said.ask ? "it asked " + JSON.stringify(asked[0]) : posts.length + " invites for two presses");
      results.check(KIND, id("closing-the-window-stops-nothing"), closed && /^Sending \d of 5$/.test(runningLine.trim()) && inv.length === SEND.length && toast === said.toast,
        !closed ? "the window did not close" : !/^Sending \d of 5$/.test(runningLine.trim()) ? "the list's button read " + JSON.stringify(runningLine) + " while it ran"
          : inv.length !== SEND.length ? "only " + inv.length + " were sent after it closed" : "the toast read " + JSON.stringify(toast) + " where it says " + JSON.stringify(said.toast));
    } else {
      results.check(KIND, id("asks-and-sends"), done && asked.length === 1 && asked[0] === said.ask && same(inv.map((x) => x.id), SEND) && inv.every((x) => x.lang === "es") && toast === said.toast,
        "asked " + JSON.stringify(asked) + ", posted " + JSON.stringify(inv.map((x) => x.id)) + ", toast " + JSON.stringify(toast));
    }

    // Reopened: each person's line, then Try the ones that failed.
    const reopened = done && await openWindow(d);
    const r1 = reopened ? await resultsOf(d) : null;
    const lineOf = (r, who) => (r && r.rows[who] ? r.rows[who].text : "");
    const sentOk = (r, who) => !!r && r.rows[who] && r.rows[who].status === "sent" && lineOf(r, who).indexOf(said.sent) >= 0;
    const refusedOk = (r, who, words) => !!r && r.rows[who] && r.rows[who].status === "failed" && lineOf(r, who).indexOf(said.notSent + words[lang]) >= 0;
    results.check(KIND, id("a-refusal-reads-the-api-reason"), !!r1 && r1.state === "done" && ["u-wel-1", "u-wel-2", "u-wel-4"].every((w) => sentOk(r1, w)) && refusedOk(r1, "u-wel-9", REFUSED) && refusedOk(r1, "u-wel-10", NOT_SENT) && r1.summary === "3/2" && r1.retry,
      !r1 ? "the window did not open on the run" : JSON.stringify(Object.keys(r1.rows).map((k) => k + ": " + r1.rows[k].status + " " + r1.rows[k].text.split("\n").pop())) + ", summary " + r1.summary);
    const before = stubs.invites361().length;
    if (r1 && r1.retry) await d.page.locator("[data-welcome-all-retry]").first().click();
    const again = r1 && r1.retry ? await untilDone(d, stubs, before + 2) : false;
    await d.settle(150);
    const r2 = await resultsOf(d);
    const retried = stubs.invites361().slice(before).map((x) => x.id);
    if (lang === "en") {
      results.check(KIND, id("try-the-ones-that-failed-resends-only-those"), again && same(retried, ["u-wel-9", "u-wel-10"]) && (await d.confirms()).length === 1 && sentOk(r2, "u-wel-10") && refusedOk(r2, "u-wel-9", REFUSED) && r2.summary === "4/1",
        !again ? "the retry did not finish" : !same(retried, ["u-wel-9", "u-wel-10"]) ? "the retry posted to " + JSON.stringify(retried) : (await d.confirms()).length !== 1 ? "the retry asked again"
          : "after it the window reads " + JSON.stringify(r2 && r2.rows) + ", summary " + (r2 && r2.summary));
    }

    // Download CSV: name, email, Sent or the reason, and the time, for each person.
    await d.clearCaptures();
    if (r2 && r2.csv) await d.page.locator("[data-welcome-all-csv]").first().click();
    await d.settle(150);
    const files = await d.downloads();
    const file = files[files.length - 1] || null;
    const rows = file ? readCsv(file.body) : [];
    // The time each row was sent, as the browser writes it in the screen's language on the company's clock.
    const when = await d.page.evaluate((x) => new Date(x.iso).toLocaleString(x.tag, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), { iso: seed.NOW_ISO, tag: lang === "es" ? "es-US" : "en-US" });
    const people = { "u-wel-1": ["Amara Lindqvist", "amara.lindqvist@example.invalid"], "u-wel-2": ["Corin Halloway", "corin.halloway@example.invalid"], "u-wel-4": ["Emeka Fairbanks", "emeka.fairbanks@example.invalid"],
      "u-wel-9": ["Jules Ostrander", "jules.ostrander@example.invalid"], "u-wel-10": ["Kasimir Delacourt", "kasimir.delacourt@example.invalid"] };
    const want = [said.head].concat(SEND.map((w) => people[w].concat([w === "u-wel-9" ? REFUSED[lang] : said.sent, when])));
    results.check(KIND, id("the-csv"), !!file && file.name === "welcome-emails-" + seed.TODAY + ".csv" && same(rows, want),
      !file ? "Download CSV saved nothing" : file.name !== "welcome-emails-" + seed.TODAY + ".csv" ? "the file is named " + file.name : "the CSV reads " + JSON.stringify(rows) + " where it is " + JSON.stringify(want));

    // Done puts the run away: the next opening lists the people again.
    if (r2) await d.page.locator("[data-welcome-all-done]").first().click();
    await d.settle(200);
    if (lang === "en") {
      const fresh = (await openWindow(d)) ? await planOf(d) : null;
      results.check(KIND, id("done-puts-the-run-away"), !!fresh && fresh.state === "plan" && fresh.send.indexOf("u-wel-9") < 0 && fresh.send.indexOf("u-wel-1") < 0,
        !fresh ? "the window did not open again" : "it opened on " + fresh.state + " listing " + JSON.stringify(fresh.send));
    }
  });
}

// ---- a supervisor who holds manage_staff ---------------------------------------------------------------
async function supervisorPass(ctx, seen) {
  const { results } = ctx;
  await withDriver(ctx, "supervisor146", {}, async (d) => {
    await staffList(d);
    const listed = (await d.page.locator("[data-sign-in-state]").count()) > 0;
    const offered = (await d.page.locator("[data-welcome-all-open]").count()) > 0;
    results.check(KIND, "welcome-all/offered-to-an-admin-and-not-a-supervisor", seen.admin === true && listed && !offered,
      seen.admin !== true ? "the admin was not offered Send welcome emails" : !listed ? "the supervisor's list drew no sign-in lines" : "a supervisor is offered Send welcome emails");
  });
}

// ---- on a phone ----------------------------------------------------------------------------------------
async function phonePass(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "admin", { viewport: "phone" }, async (d) => {
    await staffList(d);
    const opened = await openWindow(d);
    const fit = opened ? await d.page.evaluate(() => {
      const w = document.querySelector("[data-welcome-all-window]");
      return { page: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, box: w.scrollWidth <= w.clientWidth + 1 };
    }) : null;
    results.check(KIND, "welcome-all/390/fits", !!fit && fit.page && fit.box,
      !opened ? "the window did not open at 390" : !fit.page ? "the page scrolls sideways with the window open" : "the window scrolls sideways");
  });
}

async function run(ctx) {
  const seen = {};
  await adminPass(ctx, "en", seen);
  await supervisorPass(ctx, seen);
  await adminPass(ctx, "es", seen);
  await phonePass(ctx);
}

module.exports = { run };
