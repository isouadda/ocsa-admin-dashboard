// npm run smoke: the dashboard's quick check, run on every build (Step 245).
//
// It serves the build/ that npm run build already made, and stops at once when anything in src,
// public or package.json is newer than that build, since a check of a stale bundle proves nothing.
// It signs in against the audit's own stub, with the audit's server, browser and driver, and checks
// what a broken build breaks first:
//   - at 1280 in English and in Spanish, and at 390 in English, an admin signs in (the Spanish pass
//     with the stub answering secondStep, so the code screen is on the way in);
//   - every side panel item opens with no page error, no crash and no sideways scroll;
//   - Reports opens one card of each group, a filed form opens, and Customer links opens;
//   - Help opens and answers the stub;
//   - at 1280 in English a supervisor signs in, sees no admin-only item, and every item they do see
//     opens the same way.
// One line a check. Any failure exits non-zero, and so does a run of three minutes or more. The full
// npm run audit is untouched by this.
"use strict";
const { createStubs } = require("./stubs");
const { serve } = require("./lib/serve");
const { launch } = require("./lib/browser");
const { createDriver } = require("./lib/driver");
const { buildIsFresh, BUILD_DIR } = require("./lib/build");
const seed = require("./seed");

const LIMIT_MS = 3 * 60 * 1000;
// The admin items of the side panel, the same list the audit's pages case reads.
const ADMIN_ONLY_NAV = ["Staff Management", "Cases", "Forms", "Settings"];
// The stub's answer to any question Help is asked.
const HELP_REPLY = "Here is what the dashboard shows for that.";
const PASSES = [
  { name: "1280 en admin", viewport: "wide", lang: "en", who: "admin" },
  { name: "1280 es admin", viewport: "wide", lang: "es", who: "admin", secondStep: true },
  { name: "390 en admin", viewport: "phone", lang: "en", who: "admin" },
  { name: "1280 en supervisor", viewport: "wide", lang: "en", who: "supervisor" },
];

const started = Date.now();
let failures = 0;
function say(ok, pass, what, why) {
  if (!ok) failures += 1;
  process.stdout.write((ok ? "ok    " : "FAIL  ") + pass.padEnd(20) + what + (why ? "  (" + why + ")" : "") + "\n");
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The stub answers sign-in with secondStep and holds the real answer until the code is sent, the
// way POST /api/auth/second-step answers what sign-in answers (STEP225_CONTRACT.md).
function armSecondStep(stubs) {
  const orig = stubs.handle;
  let held = null;
  stubs.handle = (req) => {
    const path = new URL(req.url).pathname;
    if (path === "/api/auth/login" && req.method === "POST") {
      const a = orig(req);
      if (a.status !== 200) return a;
      held = a;
      return { status: 200, json: { secondStep: true, challengeId: "smoke-challenge", emailHint: "a***@example.invalid" } };
    }
    if (path === "/api/auth/second-step" && req.method === "POST") return held || { status: 401, json: { error: "No sign-in to finish" } };
    return orig(req);
  };
}

// What went wrong on the page since mark: a page error, the root error boundary, or a page wider
// than the window.
async function trouble(d, mark) {
  const errs = d.pageErrors.slice(mark).filter((e) => !/favicon|Failed to load resource/.test(e));
  if (errs.length) return "page error: " + errs[0].split("\n")[0].slice(0, 160);
  if (await d.crashed()) return await d.crashDetail();
  const over = await d.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) return "the page scrolls sideways by " + over + " pixels";
  return "";
}

async function signIn(d, who) {
  const p = seed.PEOPLE[who];
  await d.page.locator("input").nth(1).waitFor({ timeout: 20000 });
  const inputs = d.page.locator("input");
  await inputs.nth(0).fill(p.login.phone);
  await inputs.nth(1).fill(p.login.pin);
  await d.page.getByRole("button", { name: d.say("Sign In") }).or(d.page.getByRole("button", { name: "Sign In" })).first().click();
  let sawCode = false;
  for (let i = 0; i < 80; i++) {
    if (!(await d.signedOut())) return { sawCode };
    if (!sawCode && (await d.page.locator("[data-second-code]").count()) > 0) {
      sawCode = true;
      await d.page.fill("[data-second-code]", "123456");
    }
    await wait(250);
  }
  throw new Error("the dashboard did not open");
}

// The side panel's items, by id and by the words on them, read once the panel has stopped growing:
// an item whose route the shell asks about first draws once that route answers. On a phone the panel
// is the drawer.
async function navItems(d) {
  const read = () => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]"))
    .map((b) => ({ id: b.getAttribute("data-nav-item"), label: ((b.innerText || "").trim().split("\n")[0] || b.getAttribute("title") || "").trim() })));
  if (d.phone) await d.openDrawer();
  let items = await read();
  for (let same = 0, i = 0; same < 3 && i < 20; i++) {
    await wait(400);
    const again = await read();
    same = again.length === items.length ? same + 1 : 0;
    items = again;
  }
  if (d.phone) await d.closeDrawer();
  return items;
}

// After a check that left the app behind its root error boundary, a fresh load and a fresh sign-in, so
// the checks after it still run. A crash is already a failed line.
async function recover(d, origin, p) {
  if (!(await d.crashed())) return;
  await d.signOutHard();
  await d.page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
  await signIn(d, p.who);
}

async function openNav(d, id) {
  if (d.phone) await d.openDrawer();
  await d.page.click('[data-nav-item="' + id + '"]');
  await wait(650);
}

async function runPass(browser, origin, p) {
  const stubs = createStubs();
  if (p.secondStep) armSecondStep(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: p.viewport, lang: p.lang });
  // A control that is not there fails its line in seconds, not in the driver's thirty.
  d.page.setDefaultTimeout(8000);
  try {
    await d.page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
    try {
      const r = await signIn(d, p.who);
      say(!p.secondStep || r.sawCode, p.name, p.secondStep ? "signs in through the code screen" : "signs in", p.secondStep && !r.sawCode ? "no code screen" : "");
    } catch (e) { say(false, p.name, "signs in", e.message); return; }

    const items = await navItems(d);
    say(items.length > 0, p.name, "side panel holds " + items.length + " items");
    if (p.who === "supervisor") {
      // Forms is a supervisor's when the forms API lets them list filed reports, and Settings when they
      // hold manage permissions, the way the audit's pages case reads the seed. No other admin item.
      const who = seed.PEOPLE[p.who];
      const allowed = [].concat(who.singleCapability === "manage_permissions" ? ["Settings"] : [], who.readsFiledForms ? ["Forms"] : []);
      const has = (w) => items.some((it) => it.label === d.say(w));
      const shown = ADMIN_ONLY_NAV.filter((w) => allowed.indexOf(w) < 0 && has(w));
      const missing = allowed.filter((w) => !has(w));
      say(!shown.length && !missing.length, p.name, "sees " + (allowed.length ? allowed.join(", ") + " and " : "") + "no other admin-only item",
        shown.length ? "can see " + shown.join(", ") : missing.length ? "is missing " + missing.join(", ") : "");
    }
    for (const it of items) {
      const mark = d.pageErrors.length;
      try { await openNav(d, it.id); const why = await trouble(d, mark); say(!why, p.name, "opens " + it.label, why); }
      catch (e) { say(false, p.name, "opens " + it.label, e.message.split("\n")[0]); }
      await recover(d, origin, p);
    }

    if (p.who === "admin") {
      // Reports: one card of each group, and back.
      await d.goto("reports"); await wait(900);
      const groups = await d.page.locator("[data-report-group]").count();
      say(groups > 0, p.name, "Reports shows " + groups + " groups");
      for (let i = 0; i < groups; i++) {
        const g = d.page.locator("[data-report-group]").nth(i);
        const heading = ((await g.locator("div").first().innerText()) || "").trim();
        const mark = d.pageErrors.length;
        try {
          await g.locator("button").first().click();
          await wait(900);
          const why = await trouble(d, mark);
          say(!why, p.name, "Reports opens a card of " + heading, why);
        } catch (e) { say(false, p.name, "Reports opens a card of " + heading, e.message.split("\n")[0]); }
        await recover(d, origin, p);
        await d.goto("reports"); await wait(700);
      }
      // A filed form, from Filed forms.
      {
        await d.goto("forms"); await wait(1200);
        const mark = d.pageErrors.length;
        const row = d.page.locator("table tbody tr").first();
        let why = (await row.count()) === 0 ? "no filed form listed" : "";
        if (!why) { await row.click(); await wait(1200); why = (await d.page.locator("div[style*='z-index: 500']").count()) === 0 ? "the report did not open" : await trouble(d, mark); }
        say(!why, p.name, "a filed form opens", why);
        await d.page.keyboard.press("Escape").catch(() => {});
        await recover(d, origin, p);
      }
      // Customer links.
      {
        const mark = d.pageErrors.length;
        await d.goto("forms", ["links"]); await wait(1200);
        const why = (await d.page.locator("[data-customer-links-tab]").count()) === 0 ? "the tab did not open" : await trouble(d, mark);
        say(!why, p.name, "Customer links opens", why);
        await recover(d, origin, p);
      }
    }

    // Help, asked one question.
    {
      const mark = d.pageErrors.length;
      await d.goto("help"); await wait(900);
      const send = d.page.locator('button[aria-label="' + d.say("Send") + '"]').first();
      let why = (await send.count()) === 0 ? "no Send button" : "";
      if (!why) {
        const box = d.page.locator("textarea").first();
        await box.fill(p.lang === "es" ? "¿Cómo imprimo el paquete de evidencias?" : "How do I print the evidence pack?");
        await send.click();
        let answered = false;
        for (let i = 0; i < 40 && !answered; i++) { await wait(250); answered = (await d.page.locator("text=" + HELP_REPLY).count()) > 0; }
        why = answered ? await trouble(d, mark) : "no answer came back";
      }
      say(!why, p.name, "Help answers", why);
    }
  } finally {
    await d.close();
  }
}

(async () => {
  if (!buildIsFresh()) {
    say(false, "build", "build/ is current", "build/ is missing or older than src, public or package.json; run npm run build");
    process.exit(1);
  }
  say(true, "build", "build/ is current");
  const server = await serve(BUILD_DIR);
  const browser = await launch();
  try {
    for (const p of PASSES) {
      try { await runPass(browser, server.origin, p); }
      catch (e) { say(false, p.name, "runs", e.message.split("\n")[0]); }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  const ms = Date.now() - started;
  say(ms < LIMIT_MS, "time", "finished in " + Math.round(ms / 1000) + "s", ms < LIMIT_MS ? "" : "three minutes or more");
  process.stdout.write(failures ? failures + " failed\n" : "all passed\n");
  process.exit(failures ? 1 : 0);
})().catch((e) => { process.stdout.write("FAIL  smoke                " + (e.stack || String(e)).split("\n")[0] + "\n"); process.exit(1); });
