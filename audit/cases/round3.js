// What the API's Rounds 3 and 4 gave the dashboard, and its findings (part 364), against ocsa-api main
// a1e7e58, which audit/round3-stub.js answers once setStep364 arms it, over the API as built
// (setApiAsBuilt) and Round 2's HR file log (setStep353). The refusals new since Round 2 are the stub's
// own setRefusal, in the API's words (helpers/words.js, copied below). Each case runs in English and in
// Spanish where it reads words, and each fails on main as it stood at 9302c53 unless its name says it is
// a guard: a guard holds what main already did and the round must keep.
//
//   section 1   a clearance opens its file with Who opened this, and says when it was entered with none;
//               a supervisor sees neither (guard); recording one sends the HR document picked (guard);
//               Take back on an end waiting for its day, asked once, redrawn from the answer with its
//               history; 409 employment.noPendingEnd in its words; a case's report and a way to it; a
//               report the case cannot carry, said under it with a way to open the case without it; and
//               personal details another admin's record leaves out, said instead of drawn empty
//   section 2   each refusal new since Round 2 in plain words with the next step: pickups.alreadyPosted
//               under the shift its keys name, issues.request.decideFirst, issues.cannotAssign,
//               issues.assigneeNotStaff under the person, tasks.badAssignee under the person,
//               inspections.completedLocked, supplies.requestFulfilled, supplies.badDetails by its keys,
//               common.bodyTooLarge, common.badBody, uploads.tooLarge in megabytes, and the 403 naming
//               manage_schedule on Shift Pickup
//   section 3   API-73 the alias list without read_hr_records; API-93 one press sends once, and a send
//               the browser gave up on is not offered again; API-97 the time a case log entry sends;
//               API-99 no raw category code and no raw key; API-100 a list at the API's limit says so;
//               API-103 the HR document box's accept list, a wrong file refused before it goes, and a file
//               stored as a page saved, never opened; API-68 and API-119 an address that is not safe is
//               never drawn; API-96 an evening moment is the company's day
"use strict";
const seed = require("../seed");
const { createStubs } = require("../stubs");

const KIND = "round3";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const threw = (e) => "threw: " + String(e && e.message ? e.message : e).split("\n")[0];
const LANGS = ["en", "es"];

// The API's own words for each refusal (ocsa-api a1e7e58, helpers/words.js), English and Spanish.
const APIW = {
  "pickups.alreadyPosted": ["This shift already has a drop request or a posting for pickup.", "Este turno ya tiene una solicitud para dejarlo o ya est\u00e1 publicado como turno libre."],
  "issues.request.decideFirst": ["A request waiting for approval is approved or declined first, and a declined request stays declined.", "Una solicitud en espera de aprobaci\u00f3n primero se aprueba o se rechaza, y una solicitud rechazada sigue rechazada."],
  "issues.cannotAssign": ["This issue is closed, declined or waiting for approval, so it cannot be assigned.", "Este problema est\u00e1 cerrado, rechazado o esperando aprobaci\u00f3n, as\u00ed que no se puede asignar."],
  "issues.assigneeNotStaff": ["Choose an active person on staff", "Elija a una persona activa del personal"],
  "tasks.badAssignee": ["Choose an active staff member to take this task.", "Elija a un miembro activo del personal para esta tarea."],
  "inspections.completedLocked": ["This inspection is completed. Its status and its safety walk cannot be changed.", "Esta inspecci\u00f3n est\u00e1 completada. Su estado y su recorrido de seguridad no se pueden cambiar."],
  "supplies.requestFulfilled": ["This request was already fulfilled", "Esta solicitud ya fue surtida"],
  "supplies.badDetails": ["Some details are missing or not valid", "Faltan algunos datos o no son v\u00e1lidos"],
  "common.bodyTooLarge": ["What was sent is too large.", "Lo que se envi\u00f3 es demasiado grande."],
  "common.badBody": ["What was sent could not be read. Try again.", "No se pudo leer lo que se envi\u00f3. Int\u00e9ntelo de nuevo."],
  "uploads.tooLarge": ["File is too large for this bucket", "El archivo es demasiado grande"],
  "access.insufficientPermissions": ["Insufficient permissions", "No tiene permiso para hacer esto"],
  "employment.noPendingEnd": ["This person has no employment end waiting to take effect.", "Esta persona no tiene un fin de empleo pendiente de entrar en vigor."],
  "speakUp.reportNotReadable": ["Choose a report you can read, or open the case without one", "Elija un reporte que pueda leer, o abra el caso sin uno"],
};
const apiWords = (code, lang) => APIW[code][lang === "es" ? 1 : 0];
// The dashboard's words for each, as src/App.js PLAIN_REFUSALS has them, read through the word table.
const PLAIN = {
  "pickups.alreadyPosted": "This shift is already posted for pickup or has a drop request waiting. Open it on Shift Pickup to change or cancel that posting first.",
  "issues.request.decideFirst": "This client request is waiting for approval or was declined. Approve or decline it on the Client requests tab first. A declined request stays declined.",
  "issues.cannotAssign": "This issue is closed, declined or waiting for approval, so it cannot be assigned. Reopen it, or approve the request first.",
  "issues.assigneeNotStaff": "Choose an active staff member. A client contact or someone who has left cannot take an issue.",
  "tasks.badAssignee": "Choose an active staff member to take this task. A client contact or someone who has left cannot take it.",
  "inspections.completedLocked": "This inspection is completed, so it cannot be cancelled or reopened, and its safety walk stays as it is. Schedule a new inspection if another visit is needed.",
  "supplies.requestFulfilled": "This request was already fulfilled, so it cannot change. Make a new request for anything more.",
  "common.bodyTooLarge": "What was sent is too large. Send less at once, or a smaller file.",
  "common.badBody": "What was sent could not be read. Try again, and if it happens again, reload the page.",
};
const STILL_GOING = "This is taking longer than usual and may still be going out. Check before you send it again.";
const STILL_GOING_ANNOUNCEMENT = "This is taking longer than usual and may still be going out. Press Send again to check: it will not go out twice.";
const fill = (s, ...v) => v.reduce((x, y, i) => x.split("{" + i + "}").join(String(y)), s);
const refusal = (method, path, status, code, lang, extra) => ({ method, path, status, code, error: apiWords(code, lang), body: extra || {}, once: true });

async function goHash(d, h) {
  await d.page.evaluate(() => { window.location.hash = "overview"; });
  await wait(150);
  await d.page.evaluate((x) => { window.location.hash = x; }, h);
  await d.settle(700);
}
const textOf = async (d, sel) => { const l = d.page.locator(sel).first(); return (await l.count()) > 0 ? (await l.innerText()).trim() : ""; };
const has = async (d, sel) => (await d.page.locator(sel).count()) > 0;
const until = async (d, sel, ms) => { await d.page.locator(sel).first().waitFor({ timeout: ms || 6000 }).catch(() => {}); return has(d, sel); };
const posts = (d, mark, path) => d.callsSince(mark).filter((c) => c.method !== "GET" && (path instanceof RegExp ? path.test(c.path) : c.path === path));

// One driver on a stub of its own, armed with the API as built, Round 2's file log and part 364.
async function withDriver(ctx, o, fn) {
  const { browser, origin, createDriver, results } = ctx;
  const stubs = createStubs();
  if (o.asBuilt !== false) stubs.setApiAsBuilt(true);
  stubs.setStep353(true);
  stubs.setStep364(true);
  if (o.arm) o.arm(stubs);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", lang: o.lang || "en", timezoneId: o.timezoneId });
  d.page.setDefaultTimeout(8000);
  try {
    await d.signIn(o.persona || "admin");
    await fn(d, stubs);
  } catch (e) {
    results.fail(KIND, "round3/" + (o.lang || "en") + "/" + o.name + "/suite", threw(e));
  } finally { await d.close(); }
}

// ---- section 1 --------------------------------------------------------------------------------------
async function clearanceCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => "round3/" + lang + "/clearance/" + x;
  await withDriver(ctx, { name: "clearance", lang }, async (d) => {
    await goHash(d, "hr/u-staff-5/clearances");
    await until(d, "[data-person-clearances] [data-clearance='act34']");
    const file = d.page.locator("[data-clearance-file='act34']");
    const named = (await file.count()) > 0 ? await file.first().getAttribute("data-clearance-file-id") : null;
    await d.clearCaptures();
    const mark = d.mark();
    if (named) { await file.first().click().catch(() => {}); await d.settle(700); }
    const read = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/jotform/employee-documents/hd-5/file");
    const opened = (await d.prints()).some((p) => /^blob:/.test(p.url || ""));
    results.check(KIND, id("opens-its-file"), named === "hd-5" && read && opened,
      named === null ? "the Act 34 clearance offers no file" : named !== "hd-5" ? "the file named is " + named : !read ? "Open the file read nothing" : "the file was read and not opened");
    const who = await has(d, "[data-who-opened='clearance_file'][data-who-opened-id='hd-5']");
    results.check(KIND, id("who-opened-this"), who, "no Who opened this beside the clearance's file");
    const none = await textOf(d, "[data-clearance-no-file='act151']");
    results.check(KIND, id("entered-with-no-file"), none === d.say("Entered with no file."),
      none ? "the Act 151 clearance reads " + JSON.stringify(none) : "a clearance recorded with no file says nothing about it");
    const act168 = await textOf(d, "[data-clearance-no-file='act168']");
    results.check(KIND, id("review-entered-with-no-file"), act168 === d.say("Entered with no file."), act168 ? "the review reads " + JSON.stringify(act168) : "the Act 168 review says nothing about a file");
  });
  // Guards: a supervisor reads status and dates only, and recording sends the document picked.
  await withDriver(ctx, { name: "clearance-supervisor", lang, persona: "supervisor" }, async (d) => {
    await goHash(d, "clearances/u-staff-5");
    await until(d, "[data-clearances-person] [data-clearance='act34']");
    const shown = await has(d, "[data-clearances-person] [data-clearance='act34']");
    const files = await d.page.locator("[data-clearance-file], [data-clearance-no-file]").count();
    results.check(KIND, id("guard-supervisor-sees-no-file"), shown && files === 0, !shown ? "the supervisor's clearances did not open" : files + " file lines are drawn for a supervisor");
  });
  await withDriver(ctx, { name: "clearance-record", lang }, async (d) => {
    await goHash(d, "hr/u-staff-5/clearances");
    await until(d, "[data-clearance='fbi']");
    await d.page.locator("[data-clearance='fbi'] button", { hasText: d.say("Add or renew") }).first().click();
    await until(d, "[data-clearance-window]");
    const box = d.page.locator("[data-clearance-window]");
    await box.locator("input[type='date']").fill(seed.shift(-3));
    const doc = box.locator("select").filter({ has: d.page.locator("option[value='hd-5']") }).first();
    for (let i = 0; i < 20 && (await doc.count()) === 0; i += 1) await wait(150);
    if ((await doc.count()) > 0) await doc.selectOption("hd-5");
    const mark = d.mark();
    await box.getByRole("button", { name: d.say("Save"), exact: true }).click();
    await d.settle(600);
    const put = posts(d, mark, "/api/users/u-staff-5/clearances/fbi").pop();
    results.check(KIND, id("guard-recording-sends-the-document"), !!put && put.body && put.body.documentId === "hd-5",
      !put ? "Save sent nothing" : "Save sent " + JSON.stringify(put.body));
  });
}

async function employmentCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => "round3/" + lang + "/take-back/" + x;
  await withDriver(ctx, { name: "take-back", lang }, async (d) => {
    await goHash(d, "staff/u-staff-5");
    await until(d, "[data-employment-pending-end]");
    const offered = await has(d, "[data-employment-take-back]");
    results.check(KIND, id("offered-on-a-waiting-end"), offered, (await has(d, "[data-employment-pending-end]")) ? "a waiting end offers no Take back" : "the waiting end is not drawn");
    if (!offered) {
      ["asks-once", "sends-once-and-redraws-from-the-answer", "history-shows-the-end-taken-back"].forEach((x) => results.check(KIND, id(x), false, "a waiting end offers no Take back"));
      results.check("window", "window/staff/take-back-end", false, "a waiting end offers no Take back");
      return;
    }
    let mark = d.mark();
    await d.page.locator("[data-employment-take-back]").first().click();
    await until(d, "[data-employment-window='take-back']");
    const asked = await textOf(d, "[data-employment-window='take-back']");
    const sentEarly = posts(d, mark, /pending-end\/cancel$/).length;
    results.check(KIND, id("asks-once"), asked.indexOf(d.say("Take back the end")) >= 0 && sentEarly === 0,
      sentEarly ? "Take back sent before it asked" : "the window reads " + JSON.stringify(asked.slice(0, 120)));
    results.check("window", "window/staff/take-back-end", asked.indexOf(d.say("Take back the end")) >= 0 && (await d.page.locator("[data-employment-window='take-back'] button[aria-label='" + d.say("Close") + "']").count()) > 0,
      asked ? "the window has no Close" : "the window did not open");
    mark = d.mark();
    // Two presses in the same moment send once.
    await d.page.locator("[data-employment-take-back-send]").evaluate((b) => { b.click(); b.click(); });
    await d.settle(700);
    const sent = posts(d, mark, "/api/users/u-staff-5/employment/pending-end/cancel");
    const reread = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/users/u-staff-5/employment").length;
    const pendingGone = !(await has(d, "[data-employment-pending-end]"));
    results.check(KIND, id("sends-once-and-redraws-from-the-answer"), sent.length === 1 && pendingGone && reread === 0,
      sent.length !== 1 ? sent.length + " requests were sent" : !pendingGone ? "the card still reads the waiting end" : "the card read the history again instead of drawing the answer");
    await d.page.locator("[data-employment] button[aria-expanded]").first().click().catch(() => {});
    await d.settle(300);
    const cancelled = await textOf(d, "[data-employment-event='end_cancelled']");
    const end = await textOf(d, "[data-employment-event='ended'][data-employment-event-cancelled='yes']");
    const who = fill(d.say("Taken back by {0} on {1}"), "Dana Whitlock", "").replace(/\s+$/, "");
    results.check(KIND, id("history-shows-the-end-taken-back"), cancelled.indexOf(d.say("End taken back")) >= 0 && end.indexOf(who) >= 0,
      !cancelled ? "the history has no end_cancelled entry" : cancelled.indexOf(d.say("End taken back")) < 0 ? "the entry reads " + JSON.stringify(cancelled) : "the end reads " + JSON.stringify(end));
  });
  await withDriver(ctx, { name: "take-back-refused", lang, arm: (s) => s.setRaceTakeBack364(true) }, async (d) => {
    await goHash(d, "staff/u-staff-5");
    await until(d, "[data-employment-take-back]");
    if (!(await has(d, "[data-employment-take-back]"))) { results.check(KIND, id("no-pending-end-in-its-words"), false, "a waiting end offers no Take back"); return; }
    await d.page.locator("[data-employment-take-back]").first().click();
    await until(d, "[data-employment-take-back-send]");
    await d.page.locator("[data-employment-take-back-send]").click();
    await d.settle(600);
    const said = await textOf(d, "[data-employment-window='take-back'] [data-employment-refusal]");
    results.check(KIND, id("no-pending-end-in-its-words"), said === apiWords("employment.noPendingEnd", lang), said ? "the window reads " + JSON.stringify(said) : "409 employment.noPendingEnd shows nothing");
  });
}

async function caseReportCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => "round3/" + lang + "/case-report/" + x;
  await withDriver(ctx, { name: "case-report", lang }, async (d) => {
    await goHash(d, "cases/hc-2");
    await until(d, "[data-case-report]");
    const line = (await has(d, "[data-case-report='fr-incident-327']")) ? (await d.page.locator("[data-case-report='fr-incident-327']").first().textContent()).trim() : "";
    const name = lang === "es" ? "Reporte de incidente de seguridad" : "Safety Incident Report";
    results.check(KIND, id("a-case-shows-its-report"), line.indexOf(name) >= 0 && line.indexOf(d.say("Opened from a filed report")) >= 0,
      line ? "the case reads " + JSON.stringify(line) : "a case opened from a report shows no report");
    if (line) {
      await d.page.locator("[data-case-report-open]").first().click();
      await d.settle(600);
      const hash = await d.page.evaluate(() => window.location.hash);
      results.check(KIND, id("open-the-report"), hash === "#forms/reports/fr-incident-327", "Open the report went to " + hash);
    } else results.check(KIND, id("open-the-report"), false, "there is no report to open");
    await goHash(d, "cases/hc-3");
    await d.settle(500);
    const hidden = await has(d, "[data-case-report]");
    const opened = await has(d, "[data-case-view], [data-case-status]");
    results.check(KIND, id("guard-a-report-the-reader-cannot-read-is-not-drawn"), opened && !hidden, !opened ? "the case did not open" : "a report the API will not show is drawn");
  });
  await withDriver(ctx, { name: "case-report-refused", lang, arm: (s) => s.setUnreadable364(["fr-incident-327"]) }, async (d) => {
    await goHash(d, "forms/reports/fr-incident-327");
    await until(d, "[data-report-open-case]");
    await d.page.locator("[data-report-open-case]").first().click();
    await until(d, "[data-open-case]");
    const box = d.page.locator("[data-open-case]");
    await box.locator("select[aria-label='" + d.say("Is this about someone in management?") + "']").selectOption("no");
    let mark = d.mark();
    await box.getByRole("button", { name: d.say("Open a case"), exact: true }).click();
    await d.settle(600);
    const first = posts(d, mark, "/api/hr-cases").pop();
    const said = await textOf(d, "[data-case-refusal='report']");
    const way = await has(d, "[data-open-case-without-report]");
    results.check(KIND, id("refused-report-said-under-it"), !!first && first.body.formResponseId === "fr-incident-327" && said.indexOf(apiWords("speakUp.reportNotReadable", lang)) === 0 && way,
      !first ? "Open a case sent nothing" : !said ? "400 speakUp.reportNotReadable is not drawn under the report" : !way ? "no way to open the case without the report" : "it reads " + JSON.stringify(said));
    if (way) {
      await d.page.locator("[data-open-case-without-report]").click();
      mark = d.mark();
      await box.getByRole("button", { name: d.say("Open a case"), exact: true }).click();
      await d.settle(600);
      const again = posts(d, mark, "/api/hr-cases").pop();
      results.check(KIND, id("opened-without-the-report"), !!again && !Object.prototype.hasOwnProperty.call(again.body || {}, "formResponseId"),
        !again ? "the second press sent nothing" : "it sent " + JSON.stringify(again.body));
    } else results.check(KIND, id("opened-without-the-report"), false, "no way to open the case without the report");
  });
}

async function personalCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => "round3/" + lang + "/personal/" + x;
  await withDriver(ctx, { name: "personal", lang }, async (d) => {
    await goHash(d, "staff/u-super-1");
    await until(d, "[data-profile-edit], [data-profile-personal-held]");
    const said = await textOf(d, "[data-profile-personal-held]");
    const birthday = (await d.page.getByText(d.say("Birthday"), { exact: true }).count()) > 0;
    results.check(KIND, id("held-back-details-are-said"), said === d.say("This person's birthday, address, emergency contact and personal notes are not shown to you.") && !birthday,
      !said ? "the profile draws the details the API left out as " + JSON.stringify(d.say("Not set")) : birthday ? "the profile still draws Birthday" : "it reads " + JSON.stringify(said));
    await goHash(d, "staff/u-staff-5");
    await until(d, "[data-profile-edit]");
    const own = await has(d, "[data-profile-personal-held]");
    results.check(KIND, id("guard-details-the-api-sends-are-drawn"), !own && (await d.page.getByText(d.say("Emergency Contact"), { exact: false }).count()) > 0, own ? "a record that carries them says they are not shown" : "no emergency contact is drawn");
  });
}

// ---- section 2 --------------------------------------------------------------------------------------
async function refusalCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => "round3/" + lang + "/refusals/" + x;
  const plain = (d, code) => d.say(PLAIN[code]);

  // pickups.alreadyPosted on a time off approval, under the shift its keys name, outlined.
  await withDriver(ctx, { name: "time-off", lang }, async (d, stubs) => {
    await goHash(d, "schedule/timeoff/to-330");
    await until(d, "[data-affected-shift] [data-affected-action]");
    const firstShift = d.page.locator("[data-affected-shift]").first();
    const sid = (await firstShift.count()) > 0 ? await firstShift.getAttribute("data-affected-shift") : "";
    await firstShift.locator("[data-affected-action]").selectOption("post");
    await d.settle(200);
    stubs.setRefusal(refusal("POST", "/api/time-off/to-330/approve", 409, "pickups.alreadyPosted", lang, { keys: ["shifts[0]"], openShiftId: "os-r3", status: "open" }));
    await d.page.locator("div[style*='z-index: 500']").last().getByRole("button", { name: d.say("Approve"), exact: true }).click();
    await d.settle(900);
    const shift = d.page.locator("[data-affected-shift='" + sid + "']");
    const marked = (await shift.count()) > 0 ? await shift.getAttribute("data-affected-refused") : null;
    const said = (await shift.locator("[data-affected-refusal]").count()) > 0 ? (await shift.locator("[data-affected-refusal]").innerText()).trim() : "";
    results.check(KIND, id("already-posted-under-its-shift"), marked === "yes" && said === plain(d, "pickups.alreadyPosted"),
      !sid ? "the request lists no shift" : !said ? "the refusal is not drawn under the shift its keys name" : marked !== "yes" ? "the shift is not outlined" : "it reads " + JSON.stringify(said));
  });

  // The issue window: a status change, Assign as Task.
  await withDriver(ctx, { name: "issues", lang }, async (d, stubs) => {
    await d.goto("issues");
    await d.clickText("Lobby floor scuffed after delivery", { exact: false });
    stubs.setRefusal(refusal("PATCH", "/api/issues/i-1", 409, "issues.request.decideFirst", lang, { status: "awaiting_approval" }));
    await d.clickText(d.say("Start Work"), { inModal: true });
    await d.settle(400);
    const said = await textOf(d, "[data-issue-status-refusal]");
    results.check(KIND, id("decide-first"), said === plain(d, "issues.request.decideFirst"), said ? "it reads " + JSON.stringify(said) : "the refusal is not drawn in the window");
    await d.clickText(d.say("Assign as Task"), { inModal: true });
    await until(d, "[data-person-pick-field]");
    await d.pickPerson("Yuki");
    stubs.setRefusal(refusal("POST", "/api/issues/i-1/assign-as-task", 409, "issues.cannotAssign", lang, { status: "closed" }));
    await d.clickText(d.say("Assign Task"), { inModal: true });
    await d.settle(400);
    const top = await textOf(d, "[data-issue-assign-refusal='']");
    results.check(KIND, id("cannot-assign"), top === plain(d, "issues.cannotAssign"), top ? "it reads " + JSON.stringify(top) : "the refusal is not drawn in the window");
    stubs.setRefusal(refusal("POST", "/api/issues/i-1/assign-as-task", 400, "issues.assigneeNotStaff", lang, { keys: ["userId"] }));
    await d.clickText(d.say("Assign Task"), { inModal: true });
    await d.settle(400);
    const under = await textOf(d, "[data-issue-assign-refusal='userId']");
    results.check(KIND, id("assignee-not-staff-under-the-person"), under === plain(d, "issues.assigneeNotStaff"), under ? "it reads " + JSON.stringify(under) : "the refusal is not drawn under the person");
  });

  // Assigned Tasks: Reassign.
  await withDriver(ctx, { name: "tasks", lang }, async (d, stubs) => {
    await d.goto("assigned");
    await d.clickText(lang === "es" ? "Decapar y encerar" : "Strip and refinish lobby", { exact: false });
    if (!(await d.clickText(d.say("Reassign"), { inModal: true, exact: false }))) { results.check(KIND, id("bad-assignee-under-the-person"), false, "the assigned task offers no Reassign"); return; }
    await until(d, "[data-person-pick-field]");
    await d.pickPerson("Yuki");
    await d.modal().locator("textarea").first().fill("Covering the north wing this week.");
    stubs.setRefusal(refusal("POST", /\/api\/sites\/[^/]+\/tasks\/[^/]+\/reassign$/, 400, "tasks.badAssignee", lang, { keys: ["userId"] }));
    await d.clickText(d.say("Reassign"), { inModal: true });
    await d.settle(400);
    const under = await textOf(d, "[data-task-reassign-refusal='userId']");
    results.check(KIND, id("bad-assignee-under-the-person"), under === d.say(PLAIN_TASK), under ? "it reads " + JSON.stringify(under) : "the refusal is not drawn under the person");
  });

  // Toasts: a completed inspection, a fulfilled request, a status the request route refuses, Shift
  // Pickup's capability, a file over the limit.
  await withDriver(ctx, { name: "toasts", lang, asBuilt: false }, async (d, stubs) => {
    await d.waitToastGone(6000);
    await d.goto("inspections");
    await d.clickText(d.say("Scheduled|inspections"), { exact: true });
    await d.setConfirmAnswer(true);
    stubs.setRefusal(refusal("PATCH", /\/api\/inspections\/scheduled\/[^/]+$/, 409, "inspections.completedLocked", lang, { status: "completed" }));
    const cancel = d.page.locator("button[aria-label='" + d.say("Cancel") + "']").first();
    if ((await cancel.count()) > 0) { await cancel.click(); }
    const t1 = await d.waitToast(2500);
    results.check(KIND, id("completed-locked"), t1 === plain(d, "inspections.completedLocked"), t1 ? "the toast reads " + JSON.stringify(t1) : "no toast");
    await d.waitToastGone();

    await d.goto("supplies");
    await d.clickText(d.say("Requests"), { exact: false });
    stubs.setRefusal(refusal("PATCH", /\/api\/supplies\/requests\/[^/]+$/, 409, "supplies.requestFulfilled", lang));
    await d.clickText(d.say("Approve"), { exact: true });
    await d.clickText(d.say("Approve"), { inModal: true });
    const t2 = await d.waitToast(2500);
    results.check(KIND, id("request-fulfilled"), t2 === plain(d, "supplies.requestFulfilled"), t2 ? "the toast reads " + JSON.stringify(t2) : "no toast");
    await d.waitToastGone();
    await d.closeModal().catch(() => {});
    stubs.setRefusal(refusal("PATCH", /\/api\/supplies\/requests\/[^/]+$/, 400, "supplies.badDetails", lang, { keys: ["status"] }));
    await d.clickText(d.say("Approve"), { exact: true });
    await d.clickText(d.say("Approve"), { inModal: true });
    const t3 = await d.waitToast(2500);
    results.check(KIND, id("bad-details-by-its-keys"), t3 === d.say("Choose Approved or Denied."), t3 ? "the toast reads " + JSON.stringify(t3) : "no toast");
    await d.waitToastGone();
    await d.closeModal().catch(() => {});

    await d.goto("marketplace");
    await d.clickText(d.say("Convert Callout"), { exact: false });
    stubs.setRefusal(refusal("POST", /\/api\/pickups\/convert\/[^/]+$/, 403, "access.insufficientPermissions", lang, { capability: "manage_schedule" }));
    const row = d.modal().locator("div[style*='cursor: pointer']").first();
    if ((await row.count()) > 0) await row.click();
    const t4 = await d.waitToast(2500);
    results.check(KIND, id("manage-schedule"), t4 === d.say("Changing shifts on Shift Pickup needs permission to manage the schedule. Ask an admin to give it to you."), t4 ? "the toast reads " + JSON.stringify(t4) : "no toast");
    await d.waitToastGone();
    await d.closeModal().catch(() => {});

    await goHash(d, "staff/u-staff-5");
    await until(d, "input[type='file'][accept='image/*']");
    stubs.setRefusal(refusal("POST", "/api/uploads", 413, "uploads.tooLarge", lang, { maxBytes: 52428800 }));
    await d.page.locator("input[type='file'][accept='image/*']").first().setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG });
    const t5 = await d.waitToast(4000);
    results.check(KIND, id("upload-too-large-in-megabytes"), t5 === fill(d.say("This file is over {0} MB. Choose a smaller file."), 50), t5 ? "the toast reads " + JSON.stringify(t5) : "no toast");
  });

  // A body the parsers refuse, on an announcement.
  await withDriver(ctx, { name: "bodies", lang }, async (d, stubs) => {
    await d.goto("announcements");
    await until(d, "[data-announcement-send]");
    await d.page.getByLabel(d.say("Title"), { exact: true }).fill("Floor wax drying on level 2");
    await d.page.getByLabel(d.say("Message"), { exact: true }).fill("Please keep off the east hallway until 6 AM.");
    for (const code of ["common.bodyTooLarge", "common.badBody"]) {
      stubs.setRefusal(refusal("POST", "/api/announcements", code === "common.bodyTooLarge" ? 413 : 400, code, lang));
      await d.page.locator("[data-announcement-send]").click().catch(() => {});
      await d.settle(500);
      const shown = (await d.page.getByText(plain(d, code), { exact: true }).count()) > 0;
      results.check(KIND, id(code === "common.bodyTooLarge" ? "body-too-large" : "bad-body"), shown, "the page does not read " + JSON.stringify(plain(d, code)));
    }
    // API-93 and API-108: an announcement the browser gave up on after 30 seconds may still be going out
    // to every phone. Since part 368 it carries a clientId made once (the API's part 365), so the page
    // says so and keeps Send on: a press again is answered with the first announcement.
    stubs.setDelay("/api/announcements", 31500);
    const mark = d.mark();
    await d.page.locator("[data-announcement-send]").click().catch(() => {});
    await wait(31500);
    await d.settle(300);
    const going = (await d.page.getByText(d.say(STILL_GOING_ANNOUNCEMENT), { exact: true }).count()) > 0;
    const off = await d.page.locator("[data-announcement-send]").isDisabled().catch(() => false);
    const sentNow = posts(d, mark, "/api/announcements");
    const sent = sentNow.length;
    const withId = sentNow.length === 1 && sentNow[0].body && /^[0-9a-f-]{36}$/i.test(String(sentNow[0].body.clientId || ""));
    results.check(KIND, "round3/" + lang + "/findings/api-108-an-announcement-given-up-is-safe-to-send-again", going && !off && sent === 1 && withId,
      !going ? "the page does not say the announcement may still be going out" : off ? "Send announcement is held off" : !withId ? "the announcement went with no clientId" : sent + " sends went");
  });
}
const PLAIN_TASK = "Choose an active staff member to take this task. A client contact or someone who has left cannot take it.";
// A 1x1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

// ---- section 3 --------------------------------------------------------------------------------------
async function findingCases(ctx, lang) {
  const { results } = ctx;
  const id = (x) => "round3/" + lang + "/findings/" + x;

  // API-73: the alias list without read_hr_records.
  await withDriver(ctx, { name: "aliases", lang, arm: (s) => s.setCapabilityOff364("u-admin-1", "read_hr_records") }, async (d) => {
    await d.goto("forms");
    const mark = d.mark();
    await d.clickText("Jotform", { exact: false });
    await d.clickText(d.say("Maintenance"), { exact: true });
    await d.settle(800);
    const read = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/jotform/user-aliases");
    const said = await textOf(d, "[data-jotform-aliases-held]");
    results.check(KIND, id("api-73-alias-list-held"), !read && said.indexOf(d.say("The alias list names people with the names and personal emails on their paperwork, so it is shown only to people with HR Records access.")) >= 0,
      read ? "the alias list was read without HR Records access" : "the Maintenance tab says nothing about the alias list");
  });

  // API-93: one press sends once, and a send the browser gave up on is not offered again.
  await withDriver(ctx, { name: "sends", lang, arm: (s) => s.setStep308Holder(true) }, async (d, stubs) => {
    await d.goto("supplies");
    await d.page.locator('[data-supplies-tab="requests"]').click();
    await until(d, '[data-request-open="sr-9"]');
    await d.page.locator('[data-request-open="sr-9"]').click();
    await until(d, "[data-request-approve-all]");
    await d.page.locator("[data-request-approve-all]").click();
    await until(d, "[data-order-vendor]");
    await d.page.locator("[data-order-vendor]").selectOption("v-1");
    await d.drawSignature();
    await d.page.locator("[data-order-sign] [data-signature-box] button").first().click();
    await until(d, "[data-order-send]");
    stubs.setDelay("/api/supplies/requests/sr-9/send", 600);
    let mark = d.mark();
    await d.page.locator("[data-order-send]").evaluate((b) => { b.click(); b.click(); });
    await d.settle(1400);
    const twice = posts(d, mark, "/api/supplies/requests/sr-9/send").length;
    results.check(KIND, id("api-93-purchase-order-sends-once"), twice === 1, twice + " sends went for two presses");
    await until(d, "[data-order-send-again]");
    stubs.clearDelays();
    stubs.setDelay("/api/supplies/requests/sr-9/send", 31500);
    mark = d.mark();
    await d.page.locator("[data-order-send-again]").click();
    await wait(31500);
    await d.settle(300);
    const said = await textOf(d, "[data-order-send-refusal]");
    const off = await d.page.locator("[data-order-send-again]").isDisabled().catch(() => false);
    results.check(KIND, id("api-93-a-send-given-up-is-not-offered-again"), said === d.say(STILL_GOING) && off,
      said !== d.say(STILL_GOING) ? "it reads " + JSON.stringify(said) : "Send again is offered while the first may still be going");
  });

  // API-97: When it happened is the company's time, whatever zone the computer is in.
  await withDriver(ctx, { name: "case-log", lang, timezoneId: "America/Los_Angeles" }, async (d) => {
    await goHash(d, "cases/hc-1");
    await until(d, "[data-case-update-kind]");
    await d.page.locator("[data-case-update-kind]").selectOption("call");
    await until(d, "[data-case-update-when]");
    const opened = await d.page.locator("[data-case-update-when]").inputValue();
    await d.page.locator("[data-case-update-with-name]").fill("Outside caller").catch(() => {});
    await d.page.locator("[data-case-update-when]").fill(seed.shift(-1) + "T14:00");
    await d.page.locator("[data-case-update-body]").fill("Called back about the overnight cover.");
    const mark = d.mark();
    await d.page.locator("[data-case-update-add]").click();
    await d.settle(700);
    const sent = posts(d, mark, "/api/hr-cases/hc-1/updates").pop();
    const want = new Date(Date.parse(seed.shift(-1) + "T14:00:00-04:00")).toISOString();
    results.check(KIND, id("api-97-occurred-at-is-the-company-time"), !!sent && sent.body.occurredAt === want && opened === seed.TODAY + "T21:30",
      !sent ? "Add sent nothing" : sent.body.occurredAt !== want ? "it sent occurredAt " + sent.body.occurredAt + " for 2:00 PM in the office (" + want + ")" : "the box opened at " + opened);
  });

  // API-99, API-100, API-103, API-68 and API-96, on the scenes setFindings364 lays.
  await withDriver(ctx, { name: "scenes", lang, arm: (s) => s.setFindings364(true) }, async (d) => {
    await d.goto("services");
    await d.settle(400);
    const content = await d.page.locator("body").innerText();
    const raw = /\bZZ\b/.test(content);
    results.check(KIND, id("api-99-no-raw-category-code"), !raw && content.indexOf("Window film care") >= 0, raw ? "the service's category code ZZ is drawn" : "the service is not listed");

    // Since part 368 the two lists page (the API's part 365), so neither says it stops: Show more reads on.
    await goHash(d, "cases");
    await until(d, '[data-show-more="cases"]');
    const capped = await has(d, "[data-cases-capped]");
    const casesMore = await has(d, '[data-show-more="cases"]');
    results.check(KIND, id("api-100-cases-past-200-read-on"), !capped && casesMore, capped ? "Cases says the list stops at 200" : "200 cases offer no Show more");
    await d.goto("discipline");
    await until(d, '[data-show-more="discipline"]');
    const warned = await has(d, "[data-discipline-capped]");
    const warnMore = await has(d, '[data-show-more="discipline"]');
    results.check(KIND, id("api-100-warnings-past-500-read-on"), !warned && warnMore, warned ? "Discipline says the list stops at its limit" : "500 warnings offer no Show more");

    await goHash(d, "hr");
    await d.page.locator("[data-hr-tab='documents']").first().click().catch(() => {});
    await d.settle(500);
    await d.clickText(d.say("+ Add Document"), { exact: false });
    await until(d, "[data-hr-doc-file]");
    const accept = (await has(d, "[data-hr-doc-file]")) ? await d.page.locator("[data-hr-doc-file]").getAttribute("accept") : null;
    results.check(KIND, id("api-103-accept-list"), !!accept && accept.split(",").sort().join(",") === ".doc,.docx,.heic,.heif,.jpeg,.jpg,.pdf,.png,application/msword,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/heic,image/heif,image/jpeg,image/png",
      accept === null ? "the HR document box takes any file" : "it accepts " + accept);
    if (accept !== null) {
      // Since part 368 an iPhone's HEIC photo is taken (the API's part 365 turns it into a JPEG); a
      // page saved from a browser is still refused before it goes.
      await d.page.locator("[data-hr-doc-file]").setInputFiles({ name: "saved-page.html", mimeType: "text/html", buffer: Buffer.from("<p>not a document</p>") });
      await d.settle(200);
      const why = await textOf(d, "[data-hr-doc-file-refusal]");
      results.check(KIND, id("api-103-a-wrong-file-refused-before-it-goes"), why === fill(d.say("{0} is not a PDF, a JPEG, PNG or HEIC photo, or a Word file."), "saved-page.html"), why ? "it reads " + JSON.stringify(why) : "a saved page is taken without a word");
    } else results.check(KIND, id("api-103-a-wrong-file-refused-before-it-goes"), false, "the HR document box takes any file");
    await d.closeModal().catch(() => {});

    // The document stored as a page, hd-1, from HR Records' Documents.
    await goHash(d, "hr");
    await d.page.locator("[data-hr-tab='documents']").first().click().catch(() => {});
    await d.settle(600);
    // Since part 368 the tab lists newest first, as the API pages it, so the document is found by its name.
    await d.page.getByPlaceholder(d.say("Search employee, category, file, uploaded by")).first().fill("doc-1.pdf").catch(() => {});
    await d.settle(300);
    await d.clearCaptures();
    const doc = d.page.getByRole("button", { name: "doc-1.pdf", exact: true }).first();
    const listed = (await doc.count()) > 0;
    if (listed) await doc.click();
    await d.settle(600);
    const page = (await d.prints()).some((p) => /^blob:/.test(p.url || ""));
    const saved = (await d.downloads()).some((x) => x.name === "doc-1.pdf");
    results.check(KIND, id("api-103-a-file-stored-as-a-page-is-saved"), listed && !page && saved, !listed ? "the document is not listed" : page ? "a file served as text/html was opened as a page of the dashboard" : "the file was neither opened nor saved");

    // API-68 and API-119: an issue's photos, one javascript:, one //host and one signed https.
    await d.goto("issues");
    await d.clickText("Lobby floor scuffed after delivery", { exact: false });
    await d.settle(600);
    const srcs = await d.modal().locator("img").evaluateAll((els) => els.map((e) => e.getAttribute("src") || ""));
    const ok = srcs.filter((x) => /^https:\/\/storage\.example\.invalid\//.test(x)).length;
    const unsafe = srcs.filter((x) => /^javascript:|^\/\//i.test(x)).length;
    results.check(KIND, id("api-68-an-unsafe-address-is-never-drawn"), ok === 1 && unsafe === 0 && srcs.length === 1,
      unsafe ? unsafe + " photos draw an address that is not safe: " + JSON.stringify(srcs) : ok !== 1 ? "the signed https photo is not drawn" : "the window draws " + JSON.stringify(srcs));
    await d.closeModal().catch(() => {});

    // API-96: a signature request made at 9:30 PM in the office is that day, not the next.
    await goHash(d, "hr/signatures");
    await d.settle(800);
    const want = await d.page.evaluate((day) => { const [y, m, dd] = day.split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString(document.documentElement.lang || undefined, { month: "short", day: "numeric", year: "numeric" }); }, seed.TODAY);
    const cells = await d.page.locator("table tbody tr").first().innerText().catch(() => "");
    results.check(KIND, id("api-96-an-evening-moment-is-the-company-day"), !!cells && cells.indexOf(want) >= 0, cells ? "the newest request reads " + JSON.stringify(cells.slice(0, 160)) + " where it was made on " + want : "no signature request is listed");
  });
}

async function run(ctx) {
  for (const lang of LANGS) {
    await clearanceCases(ctx, lang);
    await employmentCases(ctx, lang);
    await caseReportCases(ctx, lang);
    await personalCases(ctx, lang);
    await refusalCases(ctx, lang);
    await findingCases(ctx, lang);
  }
}

module.exports = { run };
