// Log training for a whole room at once, and see who is missing it.
//
// OCSA's staff training runs October 1 to 29 and every session is logged in the app the same day: the
// back office, each shift of about 35 in the office, each site's orientation and each person's skills
// sign-off at the site. HR Records, Training logs one session for everyone in the room from one window,
// one record each through the route that adds a single record, and never twice.
//
// The window is driven as a supervisor, the way the API lets one in. GET /api/users is refused to a
// supervisor, since manage_staff is an admin's, so the staff list the shell reads is empty for them and
// the window's people come from the HR routes a supervisor may call: everyone active from
// /api/hr/employees-summary, and a site's active people from /api/sites/:id. The stub's site route
// still lists a site's inactive person, so a window that trusted it alone would offer him.
//
// Every claim is read in English and in Spanish, with each body the window sends held to one written
// out by hand, the same in both. Each check here was broken on purpose once and seen to fail; the
// break is named beside it. The window is read again on a phone, 390 wide, at every text size.
"use strict";
const { englishLeftOn } = require("../lib/english");
const { readTable, baseOf } = require("../lib/words");

const TEXT_SIZES = ["standard", "large", "xlarge", "largest"];
const LANGS = ["en", "es"];
const WINDOW = "div[style*='z-index: 500']";
// 11:30 PM in Philadelphia on March 17, which is already March 18 in UTC.
const LATE_NIGHT = "2026-03-18T03:30:00.000Z";
// The API's refusal of the staff list to a supervisor, which the stub does not make on its own.
const STAFF_LIST_REFUSED = { method: "GET", path: /^\/api\/users$/, status: 403, error: "Insufficient permissions" };

// A count and its word, in whichever form the language uses for that number, from the table the
// screen reads.
let table = null;
function sayCount(key, lang, count, ...values) {
  if (!table) table = readTable() || {};
  const entry = table[key] || {};
  const forms = entry[lang] || entry.en || {};
  const form = new Intl.PluralRules(lang === "es" ? "es-US" : "en-US").select(count);
  const text = forms[form] !== undefined ? forms[form] : (forms.other !== undefined ? forms.other : baseOf(key));
  return [count].concat(values).reduce((s, v, i) => s.split("{" + i + "}").join(String(v)), text);
}

// Each body held to one written out by hand: every key the same, and no key more or less.
function sameBody(got, want) {
  const keys = Array.from(new Set(Object.keys(got || {}).concat(Object.keys(want)))).sort();
  const off = keys.filter((k) => JSON.stringify((got || {})[k]) !== JSON.stringify(want[k]));
  return off.map((k) => k + " sent " + JSON.stringify((got || {})[k]) + " where the body written by hand has " + JSON.stringify(want[k]));
}
// The creates since a mark, each by the person it names.
const creates = (d, mark) => d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/hr/training");
const writes = (d, mark) => d.callsSince(mark).filter((c) => c.method !== "GET" && c.path.indexOf("/api/hr/training") === 0);
// The bodies sent, against the bodies written by hand, as one line of what is off.
function heldToHand(sent, hand) {
  if (sent.length !== hand.length) return sent.length + " creates were sent where " + hand.length + " people were logged";
  const off = [];
  hand.forEach((want) => {
    const got = sent.find((c) => c.body && c.body.user_id === want.user_id);
    if (!got) { off.push("nothing was sent for " + want.user_id); return; }
    sameBody(got.body, want).forEach((x) => off.push(want.user_id + ": " + x));
  });
  return off.length ? off.slice(0, 3).join("; ") : null;
}

// What the window shows: its lines, the people it lists and ticks, what it says was saved, who it says
// already had the training and who it could not save, with the words it gave for each.
function readWindow(d) {
  return d.page.evaluate(({ sel, words }) => {
    const box = document.querySelector(sel);
    if (!box) return null;
    const text = (el) => (el && el.innerText ? el.innerText : "").replace(/\s+/g, " ").trim();
    const heading = (w) => Array.from(box.querySelectorAll("div")).find((el) => el.children.length === 0 && text(el) === w);
    const after = (h) => (h ? Array.from(h.parentElement.children).filter((el) => el !== h && el.tagName === "DIV") : []);
    const labels = Array.from(box.querySelectorAll("label"));
    const group = Array.from(box.querySelectorAll("[role=group]")).find((g) => g.getAttribute("aria-label") === words.offered);
    return {
      status: Array.from(box.querySelectorAll("[role=status]")).map(text),
      alert: Array.from(box.querySelectorAll("[role=alert]")).map(text),
      listed: labels.map((l) => text(l.querySelector("span"))),
      ticked: labels.filter((l) => l.querySelector("input").checked).map((l) => text(l.querySelector("span"))),
      already: after(heading(words.already)).map(text),
      failed: after(heading(words.failed)).map((el) => ({ name: text(el.children[0]), why: text(el.children[1]) })),
      offered: group ? Array.from(group.querySelectorAll("button")).map(text) : [],
      name: (box.querySelector("input[aria-label='" + words.name + "']") || {}).value || "",
      type: (box.querySelector("select[aria-label='" + words.type + "']") || {}).value || "",
      date: (box.querySelector("input[type=date]") || {}).value || "",
      loading: text(box).indexOf(words.loading) >= 0,
    };
  }, { sel: WINDOW, words: d.trainingWords });
}

// Every piece of text a person reads in the window, the way the driver reads a page.
function windowReadable(d) {
  return d.page.evaluate((sel) => {
    const box = document.querySelector(sel);
    const out = [];
    const walk = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      Array.from(el.childNodes).forEach((n) => {
        if (n.nodeType === 3) { const v = String(n.textContent || "").replace(/\s+/g, " ").trim(); if (v) out.push(v); return; }
        if (n.nodeType !== 1) return;
        const tag = n.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "svg") return;
        ["aria-label", "placeholder", "title", "alt"].forEach((a) => { const v = n.getAttribute(a); if (v && v.trim()) out.push(v.trim()); });
        walk(n);
      });
    };
    if (box) walk(box);
    return out;
  }, WINDOW);
}

// The window's box on screen: whether it or anything in it runs past the side of a phone, and every
// control smaller than 44 by 44. A checkbox is pressed through the row it sits in, so the row is what
// is measured for it.
function fitOf(d, sel) {
  return d.page.evaluate((s) => {
    const box = document.querySelector(s);
    if (!box) return null;
    const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
    const r = box.getBoundingClientRect();
    let right = r.right;
    let left = r.left;
    box.querySelectorAll("*").forEach((el) => {
      const rr = el.getBoundingClientRect();
      if (rr.width > 0 && rr.height > 0) { right = Math.max(right, rr.right); left = Math.min(left, rr.left); }
    });
    const small = [];
    let controls = 0;
    box.querySelectorAll("button, input, select, textarea").forEach((el) => {
      const target = el.type === "checkbox" || el.type === "radio" ? (el.closest("label") || el) : el;
      const rr = target.getBoundingClientRect();
      if (rr.width < 2 || rr.height < 2) return;
      controls += 1;
      const w = Math.round(rr.width / zoom);
      const h = Math.round(rr.height / zoom);
      if (w < 44 || h < 44) small.push(String(el.getAttribute("aria-label") || el.innerText || el.value || el.tagName).trim().slice(0, 28) + " " + w + "x" + h);
    });
    return { vw: window.innerWidth, left: Math.round(left), right: Math.round(right), sideways: box.scrollWidth - box.clientWidth, small, controls };
  }, sel);
}
const fits = (g) => !!g && g.left >= -1 && g.right <= g.vw + 1 && g.sideways <= 1 && g.small.length === 0 && g.controls > 0;
const fitLine = (g) => !g ? "it is not on screen"
  : g.controls === 0 ? "it holds no controls"
    : [g.left < -1 ? "it starts " + (-g.left) + "px left of the screen" : "",
      g.right > g.vw + 1 ? "it runs " + (g.right - g.vw) + "px past the right of a screen " + g.vw + " wide" : "",
      g.sideways > 1 ? "it scrolls " + g.sideways + "px sideways" : "",
      g.small.length ? "smaller than 44 by 44: " + g.small.slice(0, 4).join(", ") : ""].filter(Boolean).join("; ");

// ---- driving the window ------------------------------------------------------
async function openTraining(d) {
  await d.goto("hr");
  await d.clickText(d.say("Training"), { exact: true });
  await d.settle(300);
}
async function openRoom(d) {
  await openTraining(d);
  const pressed = await d.clickText(d.say("Log training for several people"), { exact: true });
  await d.settle(400);
  await waitLoaded(d);
  return pressed && (await d.modalOpen());
}
async function waitLoaded(d) {
  for (let i = 0; i < 40; i += 1) {
    const w = await readWindow(d);
    if (!w || !w.loading) return;
    await d.page.waitForTimeout(100);
  }
}
const inWindow = (d) => d.page.locator(WINDOW).last();
async function fillSession(d, s) {
  const box = inWindow(d);
  if (s.name != null) await box.locator("input[aria-label='" + d.say("Training Name") + "']").fill(s.name);
  if (s.typeWord) await box.locator("select[aria-label='" + d.say("Training Type") + "']").selectOption({ label: s.typeWord });
  if (s.by != null) await box.locator("input[aria-label='" + d.say("Administered By") + "']").fill(s.by);
  if (s.lang) await box.getByRole("button", { name: d.say(s.lang), exact: true }).click({ timeout: 5000 });
  await d.settle(120);
}
async function pickSite(d, siteName) {
  await inWindow(d).locator("select[aria-label='" + d.say("Who attended") + "']").selectOption({ label: siteName || d.say("Everyone active") });
  await d.settle(300);
  await waitLoaded(d);
}
async function tick(d, names) {
  for (const n of names) {
    await inWindow(d).locator("label").filter({ has: d.page.getByText(n, { exact: true }) }).first().click({ timeout: 5000 });
  }
  await d.settle(120);
}
// Save, and wait for the run to finish: the button reads Save again and can be pressed.
async function save(d, word) {
  await inWindow(d).getByRole("button", { name: d.say(word || "Save"), exact: true }).click({ timeout: 5000 });
  await finished(d);
}
async function finished(d) {
  const saving = d.say("Saving...");
  for (let i = 0; i < 60; i += 1) {
    const busy = await d.page.evaluate(({ sel, w }) => {
      const box = document.querySelector(sel);
      return !!box && Array.from(box.querySelectorAll("button")).some((b) => b.disabled || (b.innerText || "").trim() === w);
    }, { sel: WINDOW, w: saving });
    if (!busy) break;
    await d.page.waitForTimeout(100);
  }
  await d.settle(200);
}
async function closeRoom(d) {
  if (!(await d.modalOpen())) return;
  const box = inWindow(d);
  for (const w of ["Close", "Cancel"]) {
    const b = box.getByRole("button", { name: d.say(w), exact: true });
    if (await b.count()) { await b.first().click({ timeout: 5000 }); break; }
  }
  await d.settle(200);
}

// The people the seed makes active, and each person's id and site, by name.
function world(seed) {
  const byName = {};
  seed.STAFF.forEach((p) => { byName[p.name] = p; });
  const active = seed.STAFF.filter((p) => p.status === "active").map((p) => p.name);
  const atSite = (siteName) => seed.STAFF.filter((p) => p.site_name === siteName && p.status === "active").map((p) => p.name);
  return { byName, active, atSite };
}
// hand: ten of the twelve are active; Salome Mkhize is pending and Kwabena Asante inactive. Harbor
// Point Center has Dana Whitlock, Oyelaran Adebayo, Elena Barbosa and Bertrand Lefevre, all active.
// Riverbend Logistics Hub has Priya Raghunathan, Ngozi Okonkwo and Yuki Tanabe active, and Kwabena
// Asante, whom its site record still lists.
const SESSION = { name: "Site orientation, Harbor Point", type: "safety", by: "Marcus Ferreira", lang: "Spanish", note: "Given in Spanish", day: "2026-03-17" };

async function run(ctx) {
  const { browser, origin, stubs, results, createDriver, seed } = ctx;
  const langOnly = (process.env.AUDIT_LANG || "").trim();
  const W = world(seed);
  const hand = (name, s) => ({ user_id: W.byName[name].id, training_name: s.name, training_type: s.type, completed_date: s.day, administered_by: s.by, notes: s.note });
  const check = (id, lang, ok, detail) => results.check("page", "page/hr/training-room/" + id + "/" + lang, ok, ok ? "" : detail);

  for (const lang of LANGS) {
    if (langOnly && lang !== langOnly) continue;
    process.stdout.write("run        training at 1280x900 in dark" + (lang === "en" ? "" : ", in " + lang) + "\n");
    const d = await createDriver({ browser, origin, stubs, viewport: "wide", theme: "dark", textSize: "standard", lang });
    d.trainingWords = { already: d.say("Already logged, not sent again"), failed: d.say("Not saved"), offered: d.say("Names already used"),
      name: d.say("Training Name"), type: d.say("Training Type"), loading: d.say("Loading...") };
    try {
      stubs.reset();
      stubs.setRefusal(STAFF_LIST_REFUSED);
      await d.signOutHard();
      await d.signIn("supervisor");
      // The shown word for the session's type, from the list the page was served in this language.
      const served = stubs.calls.filter((c) => c.path === "/api/lookups/all" && c.json).pop();
      const types = ((served && served.json) || []).find((c) => c.slug === "training_types");
      const typeWord = ((types && types.values) || []).filter((v) => v.value === SESSION.type).map((v) => v.displayLabel || v.label)[0];

      // ---- a supervisor's window lists everyone active, and a site's active people ----------------
      // Break: the people taken from the staff list the shell reads, which is empty for a supervisor.
      const opened = await openRoom(d);
      let w = await readWindow(d);
      const everyone = w ? w.listed.slice() : [];
      await pickSite(d, "Riverbend Logistics Hub");
      w = await readWindow(d);
      const riverbend = w ? w.listed.slice() : [];
      const wantRiver = W.atSite("Riverbend Logistics Hub");
      const sameSet = (a, b) => a.length === b.length && a.every((x) => b.indexOf(x) >= 0);
      check("a-supervisor-lists-everyone-active", lang, opened && sameSet(everyone, W.active) && sameSet(riverbend, wantRiver),
        !opened ? "the window did not open from " + JSON.stringify(d.say("Log training for several people"))
          : !sameSet(everyone, W.active) ? "everyone active reads " + JSON.stringify(everyone) + " where the seed's active people are " + JSON.stringify(W.active)
            : "Riverbend Logistics Hub reads " + JSON.stringify(riverbend) + " where its active people are " + JSON.stringify(wantRiver));

      // ---- three people, three creates ------------------------------------------------------------
      // Break: one body sent for all three.
      await pickSite(d, "Harbor Point Center");
      const three = ["Dana Whitlock", "Elena Barbosa", "Bertrand Lefevre"];
      await tick(d, three);
      await fillSession(d, { name: SESSION.name, typeWord, by: SESSION.by, lang: SESSION.lang });
      let mark = d.mark();
      await save(d);
      const first = creates(d, mark);
      w = await readWindow(d);
      const savedLine = sayCount("{1} of {0} saved|count", lang, 3, 3);
      const offFirst = heldToHand(first, three.map((n) => hand(n, SESSION)));
      check("three-people-three-creates", lang, !offFirst && writes(d, mark).length === 3 && !!w && w.status.indexOf(savedLine) >= 0,
        offFirst || (writes(d, mark).length !== 3 ? writes(d, mark).length + " writes to the training routes where 3 creates were due"
          : "the window reads " + JSON.stringify(w ? w.status : null) + " where it should read " + JSON.stringify(savedLine)));

      // ---- Spanish through and through ------------------------------------------------------------
      if (lang === "es") {
        // Break: one of the window's new strings drawn without the table.
        const left = englishLeftOn(await windowReadable(d), stubs.calls);
        check("no-english-left", lang, left.length === 0,
          left.length + " lines of the window are not Spanish: " + left.slice(0, 4).map((x) => JSON.stringify(x.left || x.line)).join(", "));
      }

      // ---- Save again logs nobody twice -----------------------------------------------------------
      // Break: the same-name, same-day check dropped.
      mark = d.mark();
      await save(d);
      const again = creates(d, mark);
      w = await readWindow(d);
      const savedAgain = w ? w.status.filter((x) => /\d/.test(x) && x !== sayCount("{0} person selected|count", lang, 3)) : [];
      // A double press, the two clicks landing before the page can draw again, sends each person once.
      await closeRoom(d);
      await openRoom(d);
      await fillSession(d, { name: SESSION.name, typeWord, by: SESSION.by, lang: SESSION.lang });
      await tick(d, ["Oyelaran Adebayo", "Marcus Ferreira"]);
      mark = d.mark();
      await d.page.evaluate(({ sel, word }) => {
        const b = Array.from(document.querySelector(sel).querySelectorAll("button")).find((x) => (x.innerText || "").trim() === word);
        b.click(); b.click();
      }, { sel: WINDOW, word: d.say("Save") });
      await finished(d);
      const doubled = creates(d, mark);
      const doubleOff = heldToHand(doubled, ["Oyelaran Adebayo", "Marcus Ferreira"].map((n) => hand(n, SESSION)));
      check("save-twice-logs-nobody-twice", lang, again.length === 0 && !!w && sameSet(w.already, three) && savedAgain.length === 0 && !doubleOff,
        again.length ? "pressing Save again sent " + again.length + " creates for people already logged: "
          + again.map((c) => c.body && c.body.user_id).join(", ")
          : !w || !sameSet(w.already, three) ? "the people already logged read " + JSON.stringify(w ? w.already : null) + " where they are " + JSON.stringify(three)
            : savedAgain.length ? "with nobody left to send the window still reads " + JSON.stringify(savedAgain)
              : "a double press: " + doubleOff);
      await closeRoom(d);

      // ---- one person refused, the other two saved, and Try again sends only that one ---------------
      // Break: the run stopped at the first refusal.
      stubs.reset();
      const refusedWords = "insert or update on table \"training_records\" violates foreign key constraint \"training_records_user_id_fkey\"";
      const room = ["Tomasz Wisniewski", "Ngozi Okonkwo", "Rashid Haddad"];
      const refusedId = W.byName["Ngozi Okonkwo"].id;
      stubs.setRefusal([STAFF_LIST_REFUSED, { method: "POST", path: "/api/hr/training", status: 500, error: refusedWords, once: true, when: (b) => b.user_id === refusedId }]);
      await openRoom(d);
      await fillSession(d, { name: SESSION.name, typeWord, by: SESSION.by, lang: SESSION.lang });
      await tick(d, room);
      mark = d.mark();
      await save(d);
      const tried = creates(d, mark);
      const refusedRun = await readWindow(d);
      const twoLine = sayCount("{1} of {0} saved|count", lang, 3, 2);
      mark = d.mark();
      await save(d, "Try again");
      const retried = creates(d, mark);
      const afterRetry = await readWindow(d);
      const oneLine = sayCount("{1} of {0} saved|count", lang, 1, 1);
      const triedOff = heldToHand(tried, room.map((n) => hand(n, SESSION)));
      const retryOff = heldToHand(retried, [hand("Ngozi Okonkwo", SESSION)]);
      const listedRefused = refusedRun ? refusedRun.failed : [];
      check("one-refused-the-rest-saved", lang,
        !triedOff && !!refusedRun && refusedRun.status.indexOf(twoLine) >= 0 && listedRefused.length === 1
          && listedRefused[0].name === "Ngozi Okonkwo" && listedRefused[0].why === refusedWords
          && !retryOff && !!afterRetry && afterRetry.failed.length === 0 && afterRetry.status.indexOf(oneLine) >= 0,
        triedOff ? "the first press: " + triedOff
          : !refusedRun || refusedRun.status.indexOf(twoLine) < 0 ? "after the refusal the window reads " + JSON.stringify(refusedRun ? refusedRun.status : null) + " where it should read " + JSON.stringify(twoLine)
            : listedRefused.length !== 1 || listedRefused[0].name !== "Ngozi Okonkwo" ? "the people not saved read " + JSON.stringify(listedRefused)
              : listedRefused[0].why !== refusedWords ? "the refusal reads " + JSON.stringify(listedRefused[0].why) + " where the API said " + JSON.stringify(refusedWords)
                : retryOff ? "Try again: " + retryOff
                  : "after Try again the window reads " + JSON.stringify(afterRetry ? afterRetry.status : null) + " and lists " + JSON.stringify(afterRetry ? afterRetry.failed : null));
      await closeRoom(d);

      // ---- the day sent is the phone's own calendar day, at 11:30 PM in Philadelphia ---------------
      // Break: the day taken from toISOString, which is March 18 by then.
      stubs.reset();
      stubs.setRefusal(STAFF_LIST_REFUSED);
      await d.context.clock.setFixedTime(new Date(LATE_NIGHT));
      await openRoom(d);
      const late = await readWindow(d);
      await fillSession(d, { name: "Skills sign-off", typeWord, by: SESSION.by, lang: SESSION.lang });
      await tick(d, ["Yuki Tanabe"]);
      mark = d.mark();
      await save(d);
      const lateSent = creates(d, mark);
      await closeRoom(d);
      await d.context.clock.setFixedTime(new Date(seed.NOW_ISO));
      const lateBody = lateSent[0] && lateSent[0].body;
      check("the-local-day-at-11-30-pm", lang, !!late && late.date === SESSION.day && lateSent.length === 1 && !!lateBody && lateBody.completed_date === SESSION.day,
        !late ? "the window did not open" : late.date !== SESSION.day ? "at 11:30 PM on March 17 the window opens on " + JSON.stringify(late.date)
          : "the create sent " + JSON.stringify(lateBody ? lateBody.completed_date : null) + " where the local day is " + JSON.stringify(SESSION.day));

      // ---- the names already used are offered as a name is typed ----------------------------------
      // Break: nothing offered.
      stubs.reset();
      stubs.setRefusal(STAFF_LIST_REFUSED);
      await openRoom(d);
      await inWindow(d).locator("input[aria-label='" + d.say("Training Name") + "']").fill("blood");
      await d.settle(120);
      const offering = await readWindow(d);
      const offeredOk = !!offering && offering.offered.indexOf("Bloodborne pathogens") >= 0;
      if (offeredOk) await inWindow(d).getByRole("button", { name: "Bloodborne pathogens", exact: true }).click({ timeout: 5000 });
      await d.settle(120);
      const taken = await readWindow(d);
      check("names-already-used-are-offered", lang, offeredOk && !!taken && taken.name === "Bloodborne pathogens" && taken.type === "safety" && taken.offered.length === 0,
        !offeredOk ? "typing \"blood\" offers " + JSON.stringify(offering ? offering.offered : null)
          : "taking the name leaves the name " + JSON.stringify(taken ? taken.name : null) + " and the type " + JSON.stringify(taken ? taken.type : null));
      await closeRoom(d);
    } catch (e) {
      results.fail("page", "page/hr/training-room/suite/" + lang, "the suite threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
    } finally {
      stubs.reset();
      await d.close();
    }

    // ---- on a phone, at every text size --------------------------------------------------------------
    // Break: one control in the window fixed at 30 pixels.
    for (const size of TEXT_SIZES) {
      const p = await createDriver({ browser, origin, stubs, viewport: "wide", theme: "dark", textSize: size, lang });
      p.trainingWords = { already: p.say("Already logged, not sent again"), failed: p.say("Not saved"), offered: p.say("Names already used"),
        name: p.say("Training Name"), type: p.say("Training Type"), loading: p.say("Loading...") };
      try {
        stubs.reset();
        await p.page.setViewportSize({ width: 390, height: 844 });
        await p.signOutHard();
        await p.signIn("admin");
        // Every state of the window at once: a name typed with names offered under it, two people
        // ticked, one of them refused, and the run's lines, Try again and all.
        await openRoom(p);
        await tick(p, ["Tomasz Wisniewski", "Ngozi Okonkwo"]);
        const served = stubs.calls.filter((c) => c.path === "/api/lookups/all" && c.json).pop();
        const types = ((served && served.json) || []).find((c) => c.slug === "training_types");
        const typeWord = ((types && types.values) || []).filter((v) => v.value === SESSION.type).map((v) => v.displayLabel || v.label)[0];
        await fillSession(p, { name: "Bl", typeWord, by: SESSION.by, lang: SESSION.lang });
        stubs.setRefusal({ method: "POST", path: "/api/hr/training", status: 500, error: "The record could not be saved", once: true, when: (b) => b.user_id === W.byName["Ngozi Okonkwo"].id });
        await save(p);
        await inWindow(p).locator("input[aria-label='" + p.say("Training Name") + "']").fill("Bl");
        await p.settle(150);
        const g = await fitOf(p, WINDOW + " > div");
        check("window-fits-a-phone/" + size, lang, fits(g), "at 390 wide: " + fitLine(g));
        await closeRoom(p);
      } catch (e) {
        results.fail("page", "page/hr/training-room/window-fits-a-phone/" + size + "/" + lang, "the case threw: " + String(e && e.message ? e.message : e).split("\n")[0]);
      } finally {
        stubs.reset();
        await p.close();
      }
    }
  }
}

module.exports = { run, TEXT_SIZES, SESSION };
