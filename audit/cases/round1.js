// Round 1 (part 347): a case for each Now finding in audit/FINDINGS_2026-10.md that had no check, and the
// owner's decisions of Oct 15, 2026 held on screen. Each fails on main as it stood after the October
// audit and passes once the round's fix is in.
//
//   decision 1  no dollar figure, rate box or cost order for anyone without manage_employment, on every
//               page the contract 1 supervisor reaches, and the figures still there for an admin
//   decision 3  time off is decided by admins; a supervisor reads the request and is told who decides
//   decision 4  a supervisor's clearances are status and dates only
//   DASH-03     the profile's Save sends only what changed, with no rate and no employment type
//   DASH-04     a warning's draft is read when its window opens, and Issue sends the edits first
//   DASH-05     a double press on Create and Assign makes one task
//   DASH-09     a call that never answers ends in plain words
//   DASH-10     a sign-in read that failed is read again, so a picker fills without a reload
//   DASH-12     Edit Supply sends only what changed
//   DASH-14     a warning added from an evening filing is dated the day the row shows
//   DASH-17     the Not tracked line reads as the site setting does
//   DASH-18     the guide tells how to remove a report
//
// The suite makes its own drivers, each with a stub of its own, like the october suite. A few discipline
// answers the stub does not hold are laid over it through the browser, from the stub's own answer.
"use strict";
const fs = require("fs");
const path = require("path");
const seed = require("../seed");
const { createStubs } = require("../stubs");

const ROOT = path.resolve(__dirname, "..", "..");
const KIND = "round1";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];

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
const json = (route, status, data) => route.fulfill({ status, contentType: "application/json; charset=utf-8", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(data) });

// ---- decision 1: no dollars for the contract 1 supervisor ------------------------------------------------
// A dollar figure is a $ before a digit. A rate box, a cost column or a cost chart is named by its
// heading, which stands on a line of its own on screen and in a cell or heading of its own in a print.
// The report's own description, which the API writes, is text and not a figure, so it is not read.
const MONEY = /\$\s?\d/;
const MONEY_WORDS = ["Hourly Rate", "Cost/Unit", "Unit Cost", "Monthly Value", "Monthly Value ($)", "Rate Structure", "Estimated cost",
  "Estimated cost trend", "Estimated cost by site", "Estimated cost by period", "Top supplies by cost", "Cost by site", "Green-certified share of cost"];
function moneyOn(d, text, html) {
  const heads = html
    ? Array.from(html.matchAll(/<(?:th|td|h1|h2|h3|div|span)[^>]*>([^<]*)</g)).map((x) => x[1].trim())
    : text.split("\n").map((l) => l.trim());
  const words = MONEY_WORDS.map((w) => d.say(w)).filter((w) => heads.some((l) => l === w || l.toUpperCase() === w.toUpperCase()));
  const plain = html ? html.replace(/<[^>]*>/g, " ") : text;
  const m = MONEY.exec(plain);
  return (m ? ["the figure " + JSON.stringify(plain.slice(Math.max(0, m.index - 20), m.index + 12).replace(/\s+/g, " "))] : []).concat(words.map((w) => JSON.stringify(w)));
}
// The stub's vendor answers with no linked supply, so its unit cost is laid over it here: two supplies,
// each with the price the vendor sells it at.
async function vendorWithPrices(d) {
  await d.page.route((u) => /^\/api\/vendors\/v-1$/.test(u.pathname), async (route) => {
    const req = route.request();
    const a = stubAnswer(d.stubs, req, d.lang);
    if (req.method() !== "GET" || !a.json) return json(route, a.status || 200, a.json == null ? {} : a.json);
    const j = JSON.parse(JSON.stringify(a.json));
    j.linkedSupplies = [
      { supply_id: "sp-1", supply_name: "Neutral floor cleaner", unit_cost: 18.4, lead_time_days: 5, is_preferred: true },
      { supply_id: "sp-5", supply_name: "Glass cleaner concentrate", unit_cost: 22.75, lead_time_days: 12, is_preferred: false },
    ];
    return json(route, 200, j);
  });
}
async function noDollars(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  await vendorWithPrices(d);
  const sweep = async (where, why) => {
    const text = await d.bodyText();
    const found = moneyOn(d, text);
    results.check(KIND, "round1/decision-1/no-dollars/" + where, found.length === 0,
      found.length ? why + " reads " + found.join(", ") + " to a supervisor without manage_employment" : "");
  };
  try {
    await d.signIn("supervisor146");
    const ids = await navIds(d);
    for (const id of ids) {
      if (id === "signatures") await goHash(d, "hr/signatures"); else await goHash(d, id);
      await sweep(id, "#" + id);
    }
    // Where a figure sits a step inside a page: a site's General Info, a vendor's linked supplies, a
    // service's details, a person's profile, and the supply report on screen and in its PDF.
    await goHash(d, "sites/s-1");
    await sweep("site-general", "a site's General Info");
    await goHash(d, "vendors/v-1");
    await sweep("vendor-detail", "a vendor's details");
    await d.closeModal().catch(() => {});
    await goHash(d, "services");
    if (await d.clickText("Daily janitorial", { exact: false })) { await d.settle(500); await sweep("service-detail", "a service's details"); await d.closeModal().catch(() => {}); }
    else results.fail(KIND, "round1/decision-1/no-dollars/service-detail", "no service to open");
    await goHash(d, "staff/u-staff-5");
    await sweep("staff-profile", "a person's profile");


    // The service catalog's CSV, which carried the rate structure as a column.
    await goHash(d, "services");
    await d.clearCaptures();
    const exported = await d.clickText(d.say("Export"), { exact: true });
    await d.settle(500);
    const csv = (await d.downloads()).map((x) => x.body).join("\n");
    const head = (csv.replace(/^\ufeff/, "").split(/\r?\n/)[0] || "").split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const csvFound = MONEY_WORDS.filter((w) => head.indexOf(w) >= 0).concat(MONEY.test(csv) ? ["a dollar figure"] : []);
    results.check(KIND, "round1/decision-1/no-dollars/service-catalog-csv", exported && !!csv && csvFound.length === 0,
      !exported ? "Services offers no Export" : !csv ? "Export wrote nothing" : "the service catalog's CSV carries " + csvFound.join(", ") + " for a supervisor");

    await goHash(d, "reports");
    const ran = await d.clickReportAction("Supply usage and cost", d.say("Run"));
    if (!ran) results.fail(KIND, "round1/decision-1/no-dollars/supply-report", "the supply report could not be run");
    else {
      await d.settle(1200);
      await sweep("supply-report", "the supply usage report");
      await d.clearCaptures();
      const pdf = await d.clickText(d.say("Export PDF"), { exact: true });
      await d.settle(700);
      const printed = (await d.prints()).map((p) => p.html).join("");
      const found = moneyOn(d, "", printed);
      results.check(KIND, "round1/decision-1/no-dollars/supply-report-pdf", pdf && !!printed && found.length === 0,
        !pdf ? "the report offers no Export PDF" : !printed ? "Export PDF printed nothing" : "the supply report's PDF prints " + found.join(", ") + " for a supervisor");
      // No order by cost either: the supplies table lists the supplies by name.
      const tables = printed.split(/<h2>/).slice(1);
      const supplies = tables.find((x) => x.indexOf(d.say("Supply") + "</th>") >= 0) || "";
      const names = Array.from(supplies.matchAll(/<tr><td>([^<]*)<\/td>/g)).map((x) => x[1]);
      const sorted = names.slice().sort((a, b) => a.localeCompare(b, "en-US"));
      results.check(KIND, "round1/decision-1/no-cost-order/supply-report-pdf", names.length > 1 && JSON.stringify(names) === JSON.stringify(sorted),
        names.length < 2 ? "the PDF lists " + names.length + " supplies, too few to show an order" : "the PDF lists the supplies as " + names.join(", ") + ", in cost order");
    }
  } catch (e) {
    results.fail(KIND, "round1/decision-1/suite", threw(e));
  } finally { await d.close(); }
}
// The windows that hold a rate or a cost box for a holder: Edit Staff Info, Edit Site Details, a
// supply's edit, Link Supply and Add Service. Contract 1's supervisor is offered only the first, so a
// second supervisor is drawn who also manages sites, supplies and vendors and still holds no
// manage_employment, laid over the stub's permissions answer.
async function managerWindows(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  await vendorWithPrices(d);
  await d.page.route((u) => u.pathname === "/api/users/me/permissions", async (route) => {
    const a = stubAnswer(stubs, route.request(), d.lang);
    const j = JSON.parse(JSON.stringify(a.json || {}));
    j.capabilities = Object.assign({}, j.capabilities || {}, { manage_sites: true, manage_supplies: true, manage_vendors: true, manage_employment: false });
    return json(route, a.status || 200, j);
  });
  try {
    await d.signIn("supervisor146");
    const reached = [];
    const windowSweep = async (where, why, open) => {
      const opened = await open().then((x) => x !== false).catch(() => false);
      await d.settle(400);
      if (!opened || !(await d.modalOpen())) { results.fail(KIND, "round1/decision-1/no-dollars/" + where, why + " could not be opened"); return; }
      reached.push(where);
      const found = moneyOn(d, await d.modalText());
      results.check(KIND, "round1/decision-1/no-dollars/" + where, found.length === 0,
        found.length ? why + " offers " + found.join(", ") + " to a supervisor without manage_employment" : "");
      await d.closeModal().catch(() => {});
    };
    await goHash(d, "staff");
    await windowSweep("edit-staff-window", "Edit Staff Info", async () => {
      const b = d.page.locator("table tbody tr button[title='" + d.say("Edit") + "']").first();
      if ((await b.count()) === 0) return false;
      await b.click();
      return true;
    });
    await goHash(d, "sites/s-1");
    await windowSweep("edit-site-window", "Edit Site Details", () => d.clickText(d.say("Edit Details"), { exact: true }));
    await goHash(d, "supplies");
    await windowSweep("edit-supply-window", "a supply's edit", async () => {
      const c = d.page.locator("[data-supply-card]").first();
      if ((await c.count()) === 0) return false;
      await c.click();
      return true;
    });
    // A vendor's address opens its details with Edit Vendor over them for a manager; Edit Vendor's
    // Cancel is pressed to reach Link Supply (closeModal would close both).
    await goHash(d, "vendors/v-1");
    await d.modal().getByRole("button", { name: d.say("Cancel"), exact: true }).click().catch(() => {});
    await d.settle(300);
    await windowSweep("link-supply-window", "Link Supply", () => d.clickText(d.say("Link Supply"), { exact: true }));
    await goHash(d, "services");
    await windowSweep("add-service-window", "Add Service", () => d.clickText(d.say("Add Service"), { exact: true }));
    results.note("Round 1, decision 1: the managing supervisor's windows read " + (reached.join(", ") || "none"));
  } catch (e) {
    results.fail(KIND, "round1/decision-1/windows-suite", threw(e));
  } finally { await d.close(); }
}

// The figures stay for a holder of manage_employment, so the gate hides them from the right people only.
async function adminSeesDollars(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  await vendorWithPrices(d);
  try {
    await d.signIn("admin");
    await goHash(d, "sites/s-1");
    const site = await d.bodyText();
    await goHash(d, "vendors/v-1");
    const vendor = await d.bodyText();
    const ok = MONEY.test(site) && site.indexOf(d.say("Monthly Value")) >= 0 && /\$\s?\d[\d.,]*\/unit/.test(vendor);
    results.check(KIND, "round1/decision-1/admin-sees-the-figures", ok,
      ok ? "" : !MONEY.test(site) ? "an admin's site General Info shows no Monthly Value figure" : "an admin's vendor details show no unit cost");
  } catch (e) {
    results.fail(KIND, "round1/decision-1/admin-suite", threw(e));
  } finally { await d.close(); }
}

// ---- decisions 3 and 4, and DASH-03, as the contract 1 supervisor -----------------------------------------
async function supervisorWork(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setApiAsBuilt(true);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  try {
    await d.signIn("supervisor146");
    // Decision 3.
    await goHash(d, "schedule/timeoff/to-330");
    await d.page.locator("div[style*='z-index: 500']").first().waitFor().catch(() => {});
    const win = d.page.locator("div[style*='z-index: 500']").last();
    const opened = (await win.count()) > 0;
    const approve = opened ? await win.getByRole("button", { name: d.say("Approve"), exact: true }).count() : 0;
    const told = opened ? (await win.innerText()).indexOf(d.say("An admin approves or denies time off.")) >= 0 : false;
    results.check(KIND, "round1/decision-3/supervisor-reads-time-off-without-deciding", opened && approve === 0 && told,
      !opened ? "the time off request did not open" : approve ? "the request offers Approve to a supervisor" : "the request does not say an admin decides");
    await d.closeModal().catch(() => {});

    // Decision 4.
    await goHash(d, "clearances");
    let says = "the Clearances page lists no one";
    if ((await d.page.locator("table tbody tr").count()) > 0) {
      await d.clickRow(0);
      await d.settle(600);
      const box = d.page.locator("[data-clearances-person]");
      if ((await box.count()) === 0) says = "a row opens no clearances window";
      else {
        const text = await box.innerText();
        const dates = text.indexOf(d.say("Add or renew")) >= 0;
        const disclosure = /Disclosure|Divulgaci/.test(text);
        await box.getByRole("button", { name: d.say("Add or renew"), exact: true }).first().click().catch(() => {});
        await d.settle(400);
        const files = (await d.page.locator("[data-clearance-window] select[aria-label='" + d.say("Document") + "']").count()) > 0;
        says = !dates ? "the clearances window offers no Add or renew" : disclosure ? "the window reads the Act 168 disclosure" : files ? "Add or renew offers the person's HR files" : "";
      }
    }
    results.check(KIND, "round1/decision-4/clearances-are-status-and-dates", says === "", says);
    await d.closeModal().catch(() => {}); await d.closeModal().catch(() => {});

    // DASH-03 and DASH-21: the profile's Save sends the one field changed, and offers no rate or
    // employment type.
    await goHash(d, "staff/u-staff-5");
    await d.page.locator("[data-profile-edit]").first().click();
    await d.settle(300);
    const offers = await d.page.evaluate((ws) => ws.filter((w) => Array.from(document.querySelectorAll("label, div")).some((el) => el.children.length === 0 && (el.textContent || "").trim() === w)), [d.say("Hourly Rate"), d.say("Employment Type")]);
    await d.fillByLabel(d.say("Phone"), "2155550188");
    const mark = d.mark();
    await d.clickText(d.say("Save Changes"), { exact: true });
    await d.settle(500);
    const patch = d.callsSince(mark).find((c) => c.method === "PATCH" && c.path === "/api/users/u-staff-5");
    const sent = patch && patch.body ? patch.body : null;
    results.check(KIND, "round1/dash-03/profile-save-sends-only-the-change", offers.length === 0 && !!sent && JSON.stringify(sent) === JSON.stringify({ phone: "2155550188" }),
      offers.length ? "the profile's Edit offers " + offers.join(" and ") + " to a supervisor" : !sent ? "Save sent no PATCH" : "Save sent " + JSON.stringify(sent) + " for one changed phone number");
  } catch (e) {
    results.fail(KIND, "round1/supervisor/suite", threw(e));
  } finally { await d.close(); }
}

// ---- the admin's windows: DASH-04, DASH-05, DASH-12, DASH-14 ----------------------------------------------
const WARNED = "u-staff-8";
const DRAFT = "da-11";
async function adminWork(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  stubs.setStep278(true);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  const seen = [];
  const READ = "Late to the shift three times in one week.";
  // The draft as the API keeps it: the list row carries no description, the read does. A filing not on
  // the record was made at 9:30 PM in New York, the next day in UTC.
  await d.page.route("**/api/discipline/**", async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const p = u.pathname;
    let body = null;
    try { const raw = req.postData(); if (raw) body = JSON.parse(raw); } catch (e) { body = null; }
    seen.push({ method: req.method(), path: p, body });
    const a = stubAnswer(stubs, req, "en");
    if (req.method() === "GET" && p === "/api/discipline/person/" + WARNED && a.json) {
      const j = JSON.parse(JSON.stringify(a.json));
      j.notOnRecord = [{ submissionId: "js-warn-evening", submittedAt: "2026-03-18T01:30:00Z" }];
      return json(route, 200, j);
    }
    if (req.method() === "GET" && p === "/api/discipline/" + DRAFT) {
      return json(route, 200, { warning: { id: DRAFT, userId: WARNED, type: "written_warning", category: "attendance", incidentDate: seed.shift(-1), description: READ, policyRef: "", expectations: "", status: "draft", language: "en", followsProtectedActivity: false } });
    }
    if (req.method() === "PUT" && p === "/api/discipline/" + DRAFT) return json(route, 200, { warning: Object.assign({ id: DRAFT, status: "draft" }, body || {}) });
    if (req.method() === "POST" && p === "/api/discipline/" + DRAFT + "/issue") return json(route, 200, { warning: { id: DRAFT, status: "open", issuedAt: new Date().toISOString(), type: "verbal_warning" } });
    return json(route, a.status || 200, a.json == null ? {} : a.json);
  });
  try {
    await d.signIn("admin");

    // DASH-04.
    await goHash(d, "hr/" + WARNED);
    await d.page.locator("[data-warning-row='" + DRAFT + "']").first().click();
    await d.settle(800);
    const box = d.page.locator("textarea[aria-label='" + d.say("What happened") + "']").first();
    const read = (await box.count()) ? await box.inputValue() : null;
    await d.page.locator("select[aria-label='" + d.say("Step") + "']").first().selectOption("verbal_warning");
    const from = seen.length;
    let issued = false;
    const send = d.page.locator("[data-warning-issue-send]").first();
    if ((await send.count()) === 0) await d.clickText(d.say("Issue"), { inModal: true, exact: true });
    if ((await send.count()) > 0) { await send.click(); issued = true; }
    await d.settle(800);
    const after = seen.slice(from);
    const put = after.findIndex((c) => c.method === "PUT" && c.path === "/api/discipline/" + DRAFT);
    const iss = after.findIndex((c) => c.method === "POST" && c.path === "/api/discipline/" + DRAFT + "/issue");
    const putType = put >= 0 && after[put].body ? after[put].body.type : null;
    results.check(KIND, "round1/dash-04/the-draft-is-read-and-issue-sends-the-edits", read === READ && issued && put >= 0 && iss > put && putType === "verbal_warning",
      read !== READ ? "the window opened on " + JSON.stringify(read) + " where the API's draft says " + JSON.stringify(READ)
        : !issued ? "there was no Issue to press" : put < 0 ? "Issue sent the draft's edits nowhere: the Step changed to verbal after the last save was not sent"
          : iss < put ? "the warning was issued before its edits were saved" : "the draft was saved as " + JSON.stringify(putType));
    await d.closeModal().catch(() => {});

    // DASH-14.
    await goHash(d, "hr/" + WARNED);
    await d.page.locator("[data-add-to-record='js-warn-evening']").first().click();
    await d.settle(400);
    const given = await d.page.locator("input[aria-label='" + d.say("Date given") + "']").first().inputValue().catch(() => null);
    results.check(KIND, "round1/dash-14/an-evening-filing-is-dated-the-day-shown", given === "2026-03-17",
      given === null ? "Add to the record drew no Date given" : "a form filed at 9:30 PM in New York on 2026-03-17 opens dated " + given);
    await d.closeModal().catch(() => {});

    // DASH-05.
    await goHash(d, "assigned");
    await d.page.getByRole("button", { name: d.say("Create Task"), exact: true }).first().click();
    await d.settle(300);
    const win = d.modal();
    await win.locator("select").first().selectOption(seed.SITES[0].id);
    await d.fillByLabel(d.say("Task Description *"), "Wipe the lobby glass");
    await d.fillByLabel(d.say("Zone *"), "Lobby");
    await d.pickPerson("Tomasz");
    const mark = d.mark();
    await win.getByRole("button", { name: d.say("Create and Assign"), exact: true }).dblclick();
    await d.settle(700);
    const posts = d.callsSince(mark).filter((c) => c.method === "POST" && /^\/api\/sites\/[^/]+\/tasks$/.test(c.path)).length;
    results.check(KIND, "round1/dash-05/create-and-assign-sends-once", posts === 1,
      posts === 0 ? "Create and Assign sent nothing" : "a double press on Create and Assign made " + posts + " tasks");
    await d.closeModal().catch(() => {});

    // DASH-12.
    await goHash(d, "supplies");
    await d.page.locator("[data-supply-card]").first().click();
    await d.settle(300);
    const name = d.modal().locator("input").first();
    const was = await name.inputValue();
    await name.fill(was + " (renamed)");
    const mark2 = d.mark();
    await d.modal().getByRole("button", { name: d.say("Save"), exact: true }).click();
    await d.settle(600);
    const patch = d.callsSince(mark2).find((c) => c.method === "PATCH" && /^\/api\/supplies\/[^/]+$/.test(c.path));
    const sent = patch && patch.body ? patch.body : null;
    results.check(KIND, "round1/dash-12/edit-supply-sends-only-the-change", !!sent && JSON.stringify(sent) === JSON.stringify({ name: was + " (renamed)" }),
      !sent ? "Save sent no PATCH" : "a rename sent " + JSON.stringify(sent) + ", the stock count and the rest with it");
  } catch (e) {
    results.fail(KIND, "round1/admin/suite", threw(e));
  } finally { await d.close(); }
}

// ---- DASH-09 and DASH-10: a call that never answers, and a sign-in read that failed ------------------------
async function calls(ctx) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: "en" });
  d.page.setDefaultTimeout(8000);
  try {
    // DASH-10: GET /api/sites answers 500 once, at sign-in; Create Task's Site list fills without a reload.
    stubs.setRefusal({ method: "GET", path: "/api/sites", status: 500, error: "Server error", once: true });
    await d.signIn("admin");
    await goHash(d, "assigned");
    let filled = 0;
    for (let i = 0; i < 40 && filled === 0; i += 1) {
      await wait(500);
      await d.page.getByRole("button", { name: d.say("Create Task"), exact: true }).first().click().catch(() => {});
      await d.settle(200);
      filled = await d.modal().locator("select").first().locator("option").evaluateAll((els) => els.filter((o) => o.value).length).catch(() => 0);
      await d.closeModal().catch(() => {});
    }
    results.check(KIND, "round1/dash-10/a-failed-sign-in-read-is-read-again", filled > 0,
      "GET /api/sites failed once at sign-in and Create Task's Site list stayed empty for 20 seconds");
    stubs.clearRefusals();

    // DASH-09: GET /api/vendors never answers.
    const hang = (u) => u.pathname === "/api/vendors";
    await d.page.route(hang, () => { /* never answered */ });
    await goHash(d, "vendors");
    const said = await d.waitToast(40000);
    await d.page.unroute(hang).catch(() => {});
    results.check(KIND, "round1/dash-09/a-call-that-never-answers-ends-in-words", !!said && said.indexOf(d.say("The connection timed out. Try again.")) >= 0,
      said ? "the toast read " + JSON.stringify(said) : "Vendors still waited 40 seconds on a read that never answered, and said nothing");
  } catch (e) {
    results.fail(KIND, "round1/calls/suite", threw(e));
  } finally { await d.close(); }
}

// ---- DASH-17 and DASH-18, read from the source and the guide ---------------------------------------------
function readings(results) {
  const app = fs.readFileSync(path.join(ROOT, "src", "App.js"), "utf8");
  const words = fs.readFileSync(path.join(ROOT, "src", "words.js"), "utf8");
  const OLD = "Its task list is kept as the record of the work.";
  const NEW = "Staff do not check off tasks at this site. They can read its task list as a reference.";
  results.check(KIND, "round1/dash-17/not-tracked-reads-as-a-reference", app.indexOf(OLD) < 0 && words.indexOf(OLD) < 0 && app.indexOf('tr("' + NEW + '")') >= 0 && words.indexOf('"' + NEW + '"') >= 0,
    app.indexOf(OLD) >= 0 ? "Live Operations still draws " + JSON.stringify(OLD) : "the Not tracked line or its Spanish is missing");
  const guide = fs.readFileSync(path.join(ROOT, "guide", "APP-DASHBOARD.md"), "utf8");
  const entry = guide.split(/\n(?=## )/).find((e) => /^## Remove a report you no longer need/.test(e)) || "";
  const wordsLine = (entry.split("\n").find((l) => l.indexOf("Words people use for this:") === 0) || "").toLowerCase();
  const ok = !!entry && ["delete", "remove", "borrar"].every((w) => wordsLine.indexOf(w) >= 0);
  results.check(KIND, "round1/dash-18/the-guide-tells-how-to-remove-a-report", ok,
    !entry ? "the guide has no entry Remove a report you no longer need" : "its words line lacks delete, remove or borrar");
}

async function run(ctx) {
  const { results } = ctx;
  readings(results);
  await noDollars(ctx);
  await managerWindows(ctx);
  await adminSeesDollars(ctx);
  await supervisorWork(ctx);
  await adminWork(ctx);
  await calls(ctx);
}

module.exports = { run };
