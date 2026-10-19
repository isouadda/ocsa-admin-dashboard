// Round 2 and who opened each HR file (part 353), against the API as built at its part 352 (ocsa-api
// 49262a3), which audit/round2-stub.js answers once setStep353 arms it. Each case fails on main as it
// stood at 586ad48 and passes once the round is in.
//
//   who opened      Who opened this beside an HR Records document, a clearance file's document and one
//                   nobody has opened, each entry's time on the company's clock, a 404 taking it away,
//                   and an open the API logs read back
//   withheld        a 503 hrFiles.logUnavailable shows the API's words and Try again opens the file
//   access report   the page and its side panel item for the super admin, its filters, its paging by
//                   nextCursor and its CSV; refused and absent for an ordinary admin and a supervisor
//   grant           the super admin grants view_hr_access_report on an admin's account; nobody else is
//                   shown the switch
//   floor plans     View on a profile read more than 9 minutes ago reads the profile again and opens the
//                   link it signs
//   round 2 items   time off follows the capability answer, supervisors read no private line, a weak
//                   PIN is refused at Reset PIN, a held account with Unlock and its notice opening the
//                   person, a pending end, no Deactivate, a shift and a pattern on approved time off, a
//                   report day the API refuses, and an emptied rate sent as null
//
// The suite makes its own drivers, each with a stub of its own, like the round1 suite.
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "round2";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const json = (route, status, data) => route.fulfill({ status, contentType: "application/json; charset=utf-8", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(data) });

async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(600);
}
async function navIds(d) {
  let last = [];
  for (let i = 0, same = 0; i < 20 && same < 3; i += 1) {
    await wait(300);
    const ids = await d.page.evaluate(() => Array.from(document.querySelectorAll("[data-nav-item]")).map((b) => b.getAttribute("data-nav-item")));
    same = ids.length === last.length ? same + 1 : 0;
    last = ids;
  }
  return last;
}
// The stub's own answer to a request, as the driver would send it, for a route laid over it here.
function stubAnswer(stubs, req, lang) {
  let body = null;
  try { const raw = req.postData(); if (raw) body = JSON.parse(raw); } catch (e) { body = null; }
  return stubs.handle({ method: req.method(), url: req.url(), body, headers: req.headers(), lang });
}
const queryOf = (c) => new URLSearchParams(c && c.query ? c.query : "");
// A time as the page writes an entry's, on the company's clock.
const companyTime = (iso) => new Date(iso).toLocaleString("en-US", { timeZone: seed.TIMEZONE, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

// One driver on a stub of its own, armed with Round 2 and whatever else the case asks for.
async function withDriver(ctx, persona, arm, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setStep353(true);
  if (arm) arm(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  try {
    await d.signIn(persona);
    await fn(d, stubs);
  } catch (e) {
    results.fail(KIND, "round2/" + persona + "/suite", threw(e));
  } finally { await d.close(); }
}

// Who opened this beside one file: the button, and what its window reads once pressed.
async function whoOpened(d, kind, id) {
  const sel = "[data-who-opened='" + kind + "'][data-who-opened-id='" + id + "']";
  const button = d.page.locator(sel).first();
  if ((await button.count()) === 0) return null;
  const mark = d.mark();
  await button.click();
  await d.page.locator("[data-who-opened-window]").first().waitFor().catch(() => {});
  await d.settle(200);
  const box = d.page.locator("[data-who-opened-window]").first();
  const shown = (await box.count()) > 0;
  const out = {
    asked: d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/hr-files/access").pop() || null,
    shown,
    text: shown ? await box.innerText() : "",
    empty: shown ? (await box.locator("[data-who-opened-empty]").count()) > 0 : false,
    actions: shown ? await box.locator("[data-who-opened-entry]").evaluateAll((els) => els.map((e) => e.getAttribute("data-who-opened-entry"))) : [],
    entries: shown ? await box.locator("[data-who-opened-entry]").evaluateAll((els) => els.map((e) => e.innerText)) : [],
    closes: shown ? (await box.locator("button[aria-label='" + d.say("Close") + "']").count()) > 0 : false,
  };
  if (out.closes) await box.locator("button[aria-label='" + d.say("Close") + "']").first().click();
  await d.settle(200);
  return out;
}
async function hrDocuments(d) {
  await goHash(d, "hr");
  await d.page.locator("[data-hr-tab='documents']").first().click();
  await d.settle(700);
}

// ---- Who opened this, and a file withheld -----------------------------------------------------------
async function whoOpenedCases(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "admin", null, async (d, stubs) => {
    await hrDocuments(d);
    const log = stubs.hrAccessLog();
    const doc = await whoOpened(d, "employee_document", "hd-2");
    const want = log.filter((e) => e.fileId === "hd-2").sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const q = queryOf(doc && doc.asked);
    const firstOk = !!doc && doc.entries.length > 0 && doc.entries[0].indexOf(want[0].viewer.name) >= 0 && doc.entries[0].indexOf(companyTime(want[0].at)) >= 0;
    results.check(KIND, "round2/who-opened/hr-document", !!doc && doc.shown && q.get("kind") === "employee_document" && q.get("id") === "hd-2"
      && JSON.stringify(doc.actions) === JSON.stringify(want.map((e) => e.action)) && firstOk,
      !doc ? "an HR Records document has no Who opened this" : !doc.shown ? "Who opened this opened no window"
        : q.get("id") !== "hd-2" ? "Who opened this asked " + (doc.asked ? doc.asked.query : "nothing") + " for the document hd-2"
          : JSON.stringify(doc.actions) !== JSON.stringify(want.map((e) => e.action)) ? "the window lists " + JSON.stringify(doc.actions) + " where the log holds " + JSON.stringify(want.map((e) => e.action))
            : "the newest entry reads " + JSON.stringify(doc.entries[0]) + " where it is " + want[0].viewer.name + " at " + companyTime(want[0].at));
    // The inventory claims this window for this suite (drivenBy round2): its title and a way out.
    results.check("window", "window/hr/who-opened", !!doc && doc.text.indexOf(d.say("Who opened this")) >= 0 && doc.closes,
      !doc || !doc.shown ? "Who opened this opened no window" : !doc.closes ? "the window has no Close" : "the window does not say " + JSON.stringify(d.say("Who opened this")));

    const clear = await whoOpened(d, "employee_document", "hd-5");
    results.check(KIND, "round2/who-opened/clearance-file", !!clear && clear.shown && JSON.stringify(clear.actions) === JSON.stringify(["opened"]) && /opened/i.test(clear.entries[0]),
      !clear ? "the document a clearance names has no Who opened this" : "the window lists " + JSON.stringify(clear.actions) + " where the log holds the clearance file's one opening");

    const none = await whoOpened(d, "employee_document", "hd-1");
    results.check(KIND, "round2/who-opened/nobody-yet", !!none && none.empty && none.text.indexOf(d.say("Nobody has opened this file yet.")) >= 0,
      !none ? "a document has no Who opened this" : "a file nobody opened reads " + JSON.stringify(none.text));

    // Opening the file writes its row, which the window then lists.
    const fileName = (await d.page.locator("[data-who-opened-id='hd-3']").first().locator("xpath=preceding-sibling::button[1]").innerText().catch(() => "")).trim();
    let mark = d.mark();
    if (fileName) await d.page.locator("[data-who-opened-id='hd-3']").first().locator("xpath=preceding-sibling::button[1]").click();
    await d.settle(700);
    const opened = d.callsSince(mark).find((c) => c.method === "GET" && c.path === "/api/jotform/employee-documents/hd-3/file" && c.status === 200);
    const after = await whoOpened(d, "employee_document", "hd-3");
    results.check(KIND, "round2/who-opened/an-open-is-listed", !!opened && !!after && JSON.stringify(after.actions) === JSON.stringify(["opened"]) && after.entries[0].indexOf(seed.PEOPLE.admin.firstName + " " + seed.PEOPLE.admin.lastName) >= 0,
      !fileName ? "the document hd-3 has no file to open beside Who opened this" : !opened ? "opening the document read no file" : "after opening it the window lists " + JSON.stringify(after && after.actions));

    // A 404 takes it away: the API answers that to anyone who may not open the file.
    await d.page.route((u) => u.pathname === "/api/hr-files/access" && u.searchParams.get("id") === "hd-4", (route) => json(route, 404, { error: "File not found", code: "hrFiles.fileNotFound" }));
    const hidden = await whoOpened(d, "employee_document", "hd-4");
    await d.settle(300);
    const left = await d.page.locator("[data-who-opened-id='hd-4']").count();
    results.check(KIND, "round2/who-opened/a-404-takes-it-away", !!hidden && !hidden.shown && left === 0,
      !hidden ? "the document hd-4 has no Who opened this" : hidden.shown ? "a 404 opened a window" : "Who opened this is still there after a 404");

    // 503 hrFiles.logUnavailable: the API's words, and Try again opens the file.
    stubs.setLogDown(1);
    mark = d.mark();
    await d.page.locator("[data-who-opened-id='hd-6']").first().locator("xpath=preceding-sibling::button[1]").click().catch(() => {});
    await d.page.locator("[data-file-withheld]").first().waitFor().catch(() => {});
    await d.settle(300);
    const box = d.page.locator("[data-file-withheld]").first();
    const said = (await box.count()) > 0 ? await box.innerText() : "";
    const words = "The file could not be opened just now. Try again in a minute.";
    const again = (await box.locator("[data-file-withheld-again]").count()) > 0;
    const closes = (await box.locator("button[aria-label='" + d.say("Close") + "']").count()) > 0 || (await box.getByRole("button", { name: d.say("Close"), exact: true }).count()) > 0;
    results.check("window", "window/shell/file-withheld", !!said && said.indexOf(d.say("Try again")) >= 0 && closes,
      !said ? "a 503 opened no window" : !closes ? "the window has no Close" : "the window offers no Try again");
    if (again) await box.locator("[data-file-withheld-again]").first().click();
    await d.settle(800);
    const reads = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/jotform/employee-documents/hd-6/file");
    const gone = (await d.page.locator("[data-file-withheld]").count()) === 0;
    results.check(KIND, "round2/withheld/try-again-opens-the-file", said.indexOf(words) >= 0 && again && reads.length === 2 && reads[0].status === 503 && reads[1].status === 200 && gone,
      !said ? "a 503 hrFiles.logUnavailable showed no window with Try again" : said.indexOf(words) < 0 ? "the window reads " + JSON.stringify(said) + " where the API said " + JSON.stringify(words)
        : !again ? "the window has no Try again" : reads.length !== 2 || reads[1].status !== 200 ? "Try again read the file " + (reads.length - 1) + " more times, answered " + JSON.stringify(reads.map((c) => c.status)) : "the window stayed open after the file opened");
  });
}

// ---- the access report -------------------------------------------------------------------------------
async function accessReportCases(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "superAdmin", null, async (d, stubs) => {
    const ids = await navIds(d);
    let mark = d.mark();
    const item = d.page.locator("[data-nav-item='hr-access']").first();
    if ((await item.count()) > 0) await item.click(); else await goHash(d, "hr/access-report");
    await d.page.locator("[data-hr-access-report] table tbody tr").first().waitFor().catch(() => {});
    await d.settle(500);
    const hash = await d.page.evaluate(() => window.location.hash);
    const first = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/hr-files/access/report").pop();
    const rows1 = await d.page.locator("[data-hr-access-report] table tbody tr").count();
    results.check(KIND, "round2/access-report/side-panel-and-page", ids.indexOf("hr-access") >= 0 && hash === "#hr/access-report" && !!first && rows1 === 100,
      ids.indexOf("hr-access") < 0 ? "the super admin's side panel has no HR file access report" : hash !== "#hr/access-report" ? "the item opened " + hash
        : !first ? "the page read no report" : "the first page lists " + rows1 + " entries where the API answered 100");

    // Show more reads the next page by the cursor the first answered.
    const cursor = first && first.json ? first.json.nextCursor : null;
    mark = d.mark();
    await d.page.locator("[data-hr-access-more]").first().click().catch(() => {});
    await d.settle(700);
    const second = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/hr-files/access/report").pop();
    const rows2 = await d.page.locator("[data-hr-access-report] table tbody tr").count();
    const total = stubs.hrAccessLog().length;
    results.check(KIND, "round2/access-report/paging", !!cursor && !!second && queryOf(second).get("cursor") === cursor && rows2 === total && (await d.page.locator("[data-hr-access-more]").count()) === 0,
      !cursor ? "the first answer carried no nextCursor" : !second ? "Show more read nothing" : queryOf(second).get("cursor") !== cursor ? "Show more asked " + second.query + " where the cursor is " + cursor
        : rows2 !== total ? "after Show more the page lists " + rows2 + " of " + total : "Show more is still offered after the last page");

    if ((await d.page.locator("[data-hr-access-report]").count()) === 0) {
      results.fail(KIND, "round2/access-report/filters", "there is no report page to filter");
      results.fail(KIND, "round2/access-report/csv", "there is no report page to download from");
      return;
    }
    // The filters: the days, who opened it, whose file and the kind, each sent as the API names it.
    const filter = (k) => d.page.locator("[data-hr-access-filter='" + k + "']").first();
    await filter("from").locator("input").fill(seed.shift(-1));
    await filter("to").locator("input").fill(seed.TODAY);
    await filter("kind").locator("select").selectOption("clearance_file");
    const pick = async (k, name) => {
      await filter(k).locator("[data-person-pick-field]").first().click().catch(() => {});
      await filter(k).locator("[data-person-pick-option]", { hasText: name }).first().click().catch(() => {});
      await d.settle(200);
    };
    await pick("viewerId", seed.PEOPLE.admin.firstName + " " + seed.PEOPLE.admin.lastName);
    await pick("subjectId", seed.STAFF[4].name);
    mark = d.mark();
    await d.page.locator("[data-hr-access-search]").first().click();
    await d.settle(700);
    const searched = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/hr-files/access/report").pop();
    const sq = queryOf(searched);
    const sent = { from: sq.get("from"), to: sq.get("to"), viewerId: sq.get("viewerId"), subjectId: sq.get("subjectId"), kind: sq.get("kind") };
    const meant = { from: seed.shift(-1), to: seed.TODAY, viewerId: seed.PEOPLE.admin.id, subjectId: seed.STAFF[4].id, kind: "clearance_file" };
    const rows3 = await d.page.locator("[data-hr-access-report] table tbody tr").count();
    const want3 = searched && searched.json && Array.isArray(searched.json.entries) ? searched.json.entries.length : -1;
    results.check(KIND, "round2/access-report/filters", !!searched && JSON.stringify(sent) === JSON.stringify(meant) && want3 === 1 && rows3 === 1,
      !searched ? "Search read nothing" : JSON.stringify(sent) !== JSON.stringify(meant) ? "Search sent " + JSON.stringify(sent) + " where the filters are " + JSON.stringify(meant)
        : "the filtered page lists " + rows3 + " rows where the API answered " + want3);

    // Download CSV, with the filters the list was read with. The driver keeps what an anchor download
    // hands the browser.
    await d.clearCaptures();
    mark = d.mark();
    await d.page.locator("[data-hr-access-csv]").first().click();
    await d.settle(800);
    const file = (await d.downloads()).pop() || null;
    const asked = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/hr-files/access/report").pop();
    const cq = queryOf(asked);
    const head = file ? String(file.body || "").replace(/^\ufeff/, "").split(/\r?\n/)[0] : "";
    results.check(KIND, "round2/access-report/csv", !!file && file.name === "hr-file-access.csv" && cq.get("format") === "csv" && cq.get("kind") === "clearance_file" && cq.get("viewerId") === seed.PEOPLE.admin.id && /^at,viewer_id,viewer_name/.test(head),
      !file ? "Download CSV saved no file" : file.name !== "hr-file-access.csv" ? "the file is named " + file.name
        : cq.get("format") !== "csv" || cq.get("kind") !== "clearance_file" ? "the download asked " + (asked ? asked.query : "nothing") + " where it is the filters with format=csv" : "the file begins " + JSON.stringify(head));
  });

  // Refused and absent for an ordinary admin and a supervisor.
  for (const persona of ["admin", "supervisor"]) {
    await withDriver(ctx, persona, null, async (d) => {
      const ids = await navIds(d);
      const mark = d.mark();
      await goHash(d, "hr/access-report");
      await d.settle(400);
      const refused = (await d.page.locator("[data-hr-access-refused]").count()) > 0;
      const read = d.callsSince(mark).filter((c) => c.path === "/api/hr-files/access/report").length;
      const page = (await d.page.locator("[data-hr-access-report]").count()) > 0;
      let button = 0;
      if (persona === "admin") { await goHash(d, "hr"); button = await d.page.locator("[data-hr-access-open]").count(); }
      results.check(KIND, "round2/access-report/refused-for-" + persona, ids.indexOf("hr-access") < 0 && refused && !page && read === 0 && button === 0,
        ids.indexOf("hr-access") >= 0 ? "the " + persona + "'s side panel offers the HR file access report" : !refused ? "#hr/access-report shows the " + persona + " no refusal"
          : page || read ? "the " + persona + " is shown the report" : "HR Records offers the " + persona + " the access report");
    });
  }
}

// ---- the grant switch --------------------------------------------------------------------------------
const REPORT_ROW = "HR file access report";
async function openPermissions(d, name) {
  await d.goto("settings");
  await d.settle(400);
  await d.clickText(d.say("Roles and Permissions"), { exact: true });
  await d.settle(300);
  const picked = await d.pickPerson(name);
  await d.settle(500);
  return picked;
}
async function grantCases(ctx) {
  const { results } = ctx;
  // An ordinary admin, on a custodial lead's account and on another admin's: no switch.
  await withDriver(ctx, "admin", null, async (d) => {
    const onLead = (await openPermissions(d, seed.STAFF[4].name)) ? await d.capabilityRow(d.say(REPORT_ROW)) : "unpicked";
    const onAdmin = (await openPermissions(d, seed.STAFF[3].name)) ? await d.capabilityRow(d.say(REPORT_ROW)) : "unpicked";
    results.check(KIND, "round2/grant/absent-for-an-admin", onLead === null && onAdmin === null,
      onLead === "unpicked" || onAdmin === "unpicked" ? "the person picker did not offer the accounts" : "an ordinary admin is shown the HR file access report switch on " + (onLead ? "a custodial lead's" : "an admin's") + " account");
  });
  // A supervisor who holds manage_permissions: no switch.
  await withDriver(ctx, "capability", null, async (d) => {
    const onLead = (await openPermissions(d, seed.STAFF[4].name)) ? await d.capabilityRow(d.say(REPORT_ROW)) : "unpicked";
    results.check(KIND, "round2/grant/absent-for-a-supervisor", onLead === null,
      onLead === "unpicked" ? "the person picker did not offer the custodial lead" : "a supervisor holding manage_permissions is shown the HR file access report switch");
  });
  // The super admin grants it on an admin's account, and that admin then reads the report.
  const stubs = createStubs();
  stubs.setStep353(true);
  const d = await ctx.createDriver({ browser: ctx.browser, origin: ctx.origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  try {
    await d.signIn("superAdmin");
    const picked = await openPermissions(d, seed.PEOPLE.admin.firstName + " " + seed.PEOPLE.admin.lastName);
    const row = picked ? await d.capabilityRow(d.say(REPORT_ROW)) : null;
    const set = row ? await d.setCapability(d.say(REPORT_ROW), d.say("Allow")) : false;
    if (!row || !set) {
      results.fail(KIND, "round2/grant/the-super-admin-grants-it", !picked ? "the person picker did not offer the admin" : !row ? "the super admin is shown no HR file access report switch on an admin's account" : "the switch offers no Allow");
      return;
    }
    const mark = d.mark();
    await d.clickText(d.say("Save changes"), { exact: true });
    await d.settle(600);
    const put = d.callsSince(mark).find((c) => c.method === "PUT" && c.path === "/api/users/" + seed.PEOPLE.admin.id + "/permissions");
    const body = put && put.body && put.body.permissions ? put.body.permissions : null;
    await d.signOutHard();
    await d.signIn("admin");
    const ids = await navIds(d);
    results.check(KIND, "round2/grant/the-super-admin-grants-it", !!row && set && !!put && put.status === 200 && !!body && body.view_hr_access_report === true && Object.keys(body).every((k) => k === "view_hr_access_report" || k === "read_chat_records") && ids.indexOf("hr-access") >= 0,
      !picked ? "the person picker did not offer the admin" : !row ? "the super admin is shown no HR file access report switch on an admin's account" : !set ? "the switch offers no Allow"
        : !put ? "Save changes sent no PUT" : put.status !== 200 ? "the PUT was answered " + put.status + " " + JSON.stringify(put.json) : !body || body.view_hr_access_report !== true ? "the PUT sent " + JSON.stringify(put.body)
          : Object.keys(body).some((k) => k !== "view_hr_access_report" && k !== "read_chat_records") ? "the PUT on an admin's account sent " + JSON.stringify(body) + ", more than the two grants"
            : "the admin granted the report has no HR file access report in the side panel");
  } catch (e) {
    results.fail(KIND, "round2/grant/suite", threw(e));
  } finally { await d.close(); }
}

// ---- floor plans -------------------------------------------------------------------------------------
async function floorPlanCases(ctx) {
  const { results } = ctx;
  await withDriver(ctx, "admin", null, async (d) => {
    // The stored file answers where the browser goes, since nothing leaves the machine.
    await d.context.route("https://storage.example.invalid/**", (route) => route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\n%%EOF\n" }));
    await goHash(d, "sites/" + seed.SITES[0].id);
    // Main draws the link with no mark of its own, so it is also found by its word.
    const view = d.page.locator("[data-floor-plan-view], a[target='_blank']:text-is('" + d.say("View") + "')").first();
    await view.waitFor().catch(() => {});
    if ((await view.count()) === 0) { results.fail(KIND, "round2/floor-plan/opens-after-ten-minutes", "the site's General Info lists no floor plan"); return; }
    const before = await view.getAttribute("href");
    // Eleven minutes on: the link the profile was read with has ended.
    await d.context.clock.setFixedTime(new Date(Date.parse(seed.NOW_ISO) + 11 * 60000));
    // The driver stands in for window.open; where the page sends the window it opened is kept here. A
    // plain link opens a window of its own.
    await d.page.evaluate(() => {
      const orig = window.open;
      window.open = function (u, n, f) {
        const win = orig(u, n, f);
        if (!win) return win;
        const rec = window.__audit.prints[window.__audit.prints.length - 1];
        win.location = { set href(v) { rec.url = String(v); }, get href() { return rec.url; } };
        return win;
      };
    });
    await d.clearCaptures();
    const mark = d.mark();
    const popup = d.context.waitForEvent("page", { timeout: 4000 }).catch(() => null);
    await view.click();
    const w = await popup;
    if (w) await w.waitForURL(/storage\.example\.invalid/, { timeout: 8000 }).catch(() => {});
    await d.settle(500);
    const kept = (await d.prints()).pop();
    const reread = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/sites/profile/" + seed.SITES[0].id).pop();
    const fresh = reread && reread.json && Array.isArray(reread.json.floorPlans) && reread.json.floorPlans[0] ? reread.json.floorPlans[0].file_url : null;
    const went = w ? w.url() : kept ? kept.url : "";
    results.check(KIND, "round2/floor-plan/opens-after-ten-minutes", !!reread && !!fresh && went === fresh && went !== before,
      !reread ? "View on a profile read 11 minutes ago did not read the profile again" : !w && !kept ? "View opened no window" : went !== fresh ? "View opened " + JSON.stringify(went) + " where the profile now signs " + JSON.stringify(fresh) : "View opened the link that had ended");
    if (w) await w.close().catch(() => {});
    await d.context.clock.setFixedTime(seed.NOW_ISO);
  });
}

// ---- the Round 2 items -------------------------------------------------------------------------------
async function itemCases(ctx) {
  const { results } = ctx;

  // 1. Time off follows the capability answer: an admin whose answer says no is offered no Approve.
  await withDriver(ctx, "admin", null, async (d, stubs) => {
    await d.page.route((u) => u.pathname === "/api/users/me/permissions", async (route) => {
      const a = stubAnswer(stubs, route.request(), d.lang);
      const j = JSON.parse(JSON.stringify(a.json || {}));
      if (j.capabilities) j.capabilities.approve_time_off = false;
      return json(route, a.status || 200, j);
    });
    await d.page.reload({ waitUntil: "domcontentloaded" });
    await d.settle(1200);
    await goHash(d, "schedule/timeoff/to-1");
    await d.page.locator("div[style*='z-index: 500']").first().waitFor().catch(() => {});
    const win = d.page.locator("div[style*='z-index: 500']").last();
    const opened = (await win.count()) > 0;
    const approve = opened ? await win.getByRole("button", { name: d.say("Approve"), exact: true }).count() : 0;
    results.check(KIND, "round2/time-off/follows-the-capability", opened && approve === 0,
      !opened ? "the time off request did not open" : "an admin whose capability answer says no to approve_time_off is offered Approve");
  });
  await withDriver(ctx, "admin", null, async (d) => {
    await goHash(d, "schedule/timeoff/to-1");
    await d.page.locator("div[style*='z-index: 500']").first().waitFor().catch(() => {});
    const win = d.page.locator("div[style*='z-index: 500']").last();
    const approve = (await win.count()) > 0 ? await win.getByRole("button", { name: d.say("Approve"), exact: true }).count() : 0;
    results.check(KIND, "round2/time-off/an-admin-decides-by-role", approve > 0, "an admin, who holds approve_time_off by role, is offered no Approve");
  });

  // 2. A supervisor reads no private line and no DM inbox.
  await withDriver(ctx, "supervisor", null, async (d) => {
    const mark = d.mark();
    await d.goto("chat");
    await d.settle(1200);
    const inbox = d.callsSince(mark).filter((c) => c.path === "/api/chat/dm-inbox").length;
    const header = await d.page.locator("[data-private-conversations]").count();
    results.check(KIND, "round2/private-lines/a-supervisor-reads-none", inbox === 0 && header === 0,
      inbox ? "Messages read the DM inbox " + inbox + " times for a supervisor" : "Messages shows a supervisor the private conversations");
  });

  // 3. A weak PIN is refused at Reset PIN, on screen and in the API's words.
  await withDriver(ctx, "admin", null, async (d, stubs) => {
    await goHash(d, "staff/u-staff-5");
    const said = async (pin) => {
      await d.page.getByRole("button", { name: d.say("Reset PIN"), exact: true }).first().click();
      await d.settle(300);
      // Main's field and button carry no mark of their own, so they are also found inside the window.
      await d.modal().locator("input[aria-label='" + d.say("New PIN (4 digits)") + "'], input[type='password']").first().fill(pin);
      const mark = d.mark();
      await d.modal().locator("[data-reset-pin-save], button:text-is('" + d.say("Reset PIN") + "')").last().click();
      await d.settle(500);
      const posts = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/users/u-staff-5/reset-pin");
      const text = (await d.page.locator("[data-reset-pin-said]").count()) > 0 ? await d.page.locator("[data-reset-pin-said]").first().innerText() : "";
      await d.closeModal().catch(() => {});
      return { posts, text };
    };
    const weak = "Choose a PIN that is not repeated digits, a sequence, or your badge number";
    const run = await said("1234");
    const badge = await said(String(seed.STAFF[4].badge_number));
    stubs.setRefusal({ method: "POST", path: "/api/users/u-staff-5/reset-pin", status: 400, code: "PIN_WEAK", error: weak, once: true });
    const api = await said("5821");
    results.check(KIND, "round2/reset-pin/weak-is-refused", run.posts.length === 0 && run.text.indexOf(d.say(weak)) >= 0 && badge.posts.length === 0 && badge.text.indexOf(d.say(weak)) >= 0 && api.posts.length === 1 && api.text === weak,
      run.posts.length ? "Reset PIN sent the run 1234" : run.text.indexOf(d.say(weak)) < 0 ? "1234 reads " + JSON.stringify(run.text) + " under the field"
        : badge.posts.length ? "Reset PIN sent the person's badge number" : api.posts.length !== 1 ? "a PIN the screen takes was sent " + api.posts.length + " times" : "the API's PIN_WEAK reads " + JSON.stringify(api.text) + " under the field");
  });

  // 4. A held account: the line, Unlock, and the notice opening the person.
  await withDriver(ctx, "admin", (s) => { s.setStep283(true); s.setRound2People(true); }, async (d) => {
    await goHash(d, "staff/u-staff-9");
    await d.settle(400);
    const state = await d.page.locator("[data-sign-in-state]").first().getAttribute("data-sign-in-state").catch(() => "");
    const unlockAt = d.page.locator("[data-staff-unlock='u-staff-9']").first();
    const offered = (await unlockAt.count()) > 0;
    const mark = d.mark();
    if (offered) await unlockAt.click();
    await d.settle(800);
    const post = d.callsSince(mark).find((c) => c.method === "POST" && c.path === "/api/users/u-staff-9/unlock");
    const stateAfter = await d.page.locator("[data-sign-in-state]").first().getAttribute("data-sign-in-state").catch(() => "");
    results.check(KIND, "round2/held/the-line-and-unlock", /\bheld\b/.test(state || "") && offered && !!post && post.json && post.json.released === true && !/\bheld\b/.test(stateAfter || ""),
      !/\bheld\b/.test(state || "") ? "a held account's profile reads " + JSON.stringify(state) + " with no hold" : !offered ? "a held account is offered no Unlock"
        : !post ? "Unlock sent nothing" : "after Unlock the profile still reads " + JSON.stringify(stateAfter));

    await goHash(d, "overview");
    const word = d.say("Notifications");
    await d.page.evaluate((t0) => { const b = Array.from(document.querySelectorAll("button")).find((x) => x.getAttribute("title") === t0 && x.offsetParent !== null); if (b) b.click(); }, word);
    await d.settle(500);
    const row = d.page.locator("[data-notice-row='n-r2-held']").first();
    const listed = (await row.count()) > 0;
    if (listed) await row.click();
    await d.settle(800);
    const hash = await d.page.evaluate(() => window.location.hash);
    results.check(KIND, "round2/held/the-notice-opens-the-person", listed && hash === "#staff/u-staff-9",
      !listed ? "the bell lists no sign_in_held notice" : "the sign_in_held notice opened " + hash + " where it is the person, #staff/u-staff-9");
  });

  // 5. A pending end on the Employment card, and no Deactivate.
  await withDriver(ctx, "admin", (s) => s.setRound2People(true), async (d) => {
    await goHash(d, "staff/u-staff-5");
    await d.page.locator("[data-employment-pending-end]").first().waitFor().catch(() => {});
    const line = d.page.locator("[data-employment-pending-end]").first();
    const at = (await line.count()) > 0 ? await line.getAttribute("data-employment-pending-end") : null;
    results.check(KIND, "round2/employment/a-pending-end-is-shown", at === seed.shift(6),
      at === null ? "the Employment card shows no end that waits" : "the card says it takes effect on " + at + " where the API says " + seed.shift(6));
    await goHash(d, "staff/u-staff-7");
    await d.settle(600);
    const deactivate = await d.page.getByRole("button", { name: d.say("Deactivate"), exact: true }).count();
    results.check(KIND, "round2/employment/no-deactivate", deactivate === 0, "an active person's profile offers Deactivate, which the API refuses 409 users.useEmployment");
  });

  // 6. A shift and a pattern on a day of approved time off.
  await withDriver(ctx, "admin", (s) => s.setRound2People(true), async (d) => {
    const openShift = async () => {
      await d.goto("schedule");
      await d.clickText("Schedule Shift", { exact: false });
      await d.page.locator("[data-schedule-shift-site]").first().selectOption(seed.SITES[0].id);
      await d.page.locator("[data-schedule-shift-staff] [data-person-pick-field]").first().click();
      await d.page.locator("[data-schedule-shift-staff] [data-person-pick-option]", { hasText: "Ngozi" }).first().click();
      await d.settle(200);
      await d.fillByLabel("Start Time", "08:00");
      await d.fillByLabel("End Time", "16:00");
    };
    await openShift();
    let mark = d.mark();
    await d.clickText("Schedule Shift", { inModal: true, exact: true });
    await d.settle(600);
    const post = d.callsSince(mark).find((c) => c.method === "POST" && c.path === "/api/schedule");
    const said = (await d.page.locator("[data-schedule-on-leave]").count()) > 0 ? await d.page.locator("[data-schedule-on-leave]").first().innerText() : "";
    results.check(KIND, "round2/schedule/a-shift-on-time-off", !!post && post.status === 409 && !!post.json && said === post.json.error,
      !post ? "Schedule Shift sent nothing" : post.status !== 409 ? "the shift on approved time off was answered " + post.status : "the window reads " + JSON.stringify(said) + " where the API said " + JSON.stringify(post.json.error));
    await d.closeModal().catch(() => {});

    await openShift();
    await d.toggleSwitch("Repeat this shift");
    await d.clickText("Thu", { inModal: true, exact: true });
    mark = d.mark();
    await d.clickText("Schedule All", { inModal: true, exact: true });
    await d.settle(700);
    const pat = d.callsSince(mark).find((c) => c.method === "POST" && c.path === "/api/schedule/patterns");
    const box = d.page.locator("[data-pattern-skipped='on-leave']").first();
    const listed = (await box.count()) > 0 ? await box.locator("li").count() : 0;
    const want = pat && pat.json && Array.isArray(pat.json.skipped) ? pat.json.skipped.filter((x) => x.code === "patterns.skippedOnLeave").length : 0;
    results.check(KIND, "round2/schedule/a-pattern-skips-time-off", !!pat && want > 0 && listed === want,
      !pat ? "Schedule All sent no pattern" : want === 0 ? "the API skipped no day on leave" : "the window lists " + listed + " days skipped for time off where the API skipped " + want);
    await d.closeModal().catch(() => {});
  });

  // 7. A report day the API refuses, in its words.
  await withDriver(ctx, "admin", (s) => s.setRefusal({ method: "GET", path: "/api/reports/task-completion", status: 400, code: "reports.badDay", error: "Check the dates: each is a day, as YYYY-MM-DD", body: { keys: ["start_date"] } }), async (d) => {
    await d.goto("reports");
    await d.settle(1200);
    const said = (await d.page.locator("[data-report-day-refused]").count()) > 0 ? await d.page.locator("[data-report-day-refused]").first().innerText() : "";
    results.check(KIND, "round2/reports/a-bad-day-in-its-words", said === "Check the dates: each is a day, as YYYY-MM-DD",
      said ? "the Reports page reads " + JSON.stringify(said) : "a 400 reports.badDay shows nothing on the Reports page");
  });

  // 8. An emptied rate is sent as null, which clears it; "" is refused 400 users.badRate.
  await withDriver(ctx, "admin", null, async (d) => {
    await goHash(d, "staff/u-staff-5");
    await d.page.locator("[data-profile-edit]").first().click();
    await d.settle(300);
    await d.fillByLabel(d.say("Hourly Rate"), "");
    const mark = d.mark();
    await d.clickText(d.say("Save Changes"), { exact: true });
    await d.settle(500);
    const patch = d.callsSince(mark).find((c) => c.method === "PATCH" && c.path === "/api/users/u-staff-5");
    const sent = patch && patch.body ? patch.body : null;
    results.check(KIND, "round2/staff/an-emptied-rate-is-null", !!sent && Object.prototype.hasOwnProperty.call(sent, "hourlyRate") && sent.hourlyRate === null,
      !sent ? "Save sent no PATCH" : "Save sent " + JSON.stringify(sent) + " for an emptied rate");
  });
}

async function run(ctx) {
  await whoOpenedCases(ctx);
  await accessReportCases(ctx);
  await grantCases(ctx);
  await floorPlanCases(ctx);
  await itemCases(ctx);
}

module.exports = { run };
