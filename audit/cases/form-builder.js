// The Form builder page, Step 187 (2a4122b), in English and in Spanish at 1280.
//
// A page in the side panel, Form builder, for a holder of build_forms. The dashboard's role defaults
// do not hold the capability, so nothing draws until GET /api/users/me/permissions names it; the stub
// names it for an admin, the API's own default since Step 186 (ocsa-api 94dbe27), for a supervisor who
// holds it by override, and for no other supervisor. The page reads GET /api/form-builder/forms, which
// the stub answers in the API's list shape, and draws a table: the title in the screen's language
// from { en, es }, the code, Version {0} or -- for a form never published, the status as Published,
// Draft in progress or Retired, with both for a published form with an open draft, the source as From
// the code or Made with the builder, and Edit on every form that is not retired. Edit opens the form's
// open draft, or starts one through POST /api/form-builder/drafts with its code, and New form starts
// one with none; the draft opened is kept in the hash as #form-builder/<id>. A row opens its Version
// history: each version newest first, when, who published it and the change note. An admin sees
// Retire form there, which asks Why is this form being retired? and sends the reason to POST
// /api/form-builder/forms/:code/retire; anyone else sees no Retire form. A list that does not load
// says This did not load. with Try again, and an empty one says so. Roles and Permissions names the
// capability Make and change forms. The words are written out here by hand, so a wrong entry in the
// table turns the case red.
"use strict";

const WORDS = {
  en: { page: "Form builder", newForm: "New form", heads: ["Form", "Code", "Version", "Status", "Source", ""], version: "Version {0}",
    published: "Published", draft: "Draft in progress", retired: "Retired", fromCode: "From the code", builder: "Made with the builder",
    edit: "Edit", history: "Version history", retire: "Retire form", why: "Why is this form being retired?",
    retireNote: "A retired form leaves every list. Reports already filed still open.", notYet: "Not yet", close: "Close",
    admins: "This page is for admins.", notLoaded: "This did not load.", tryAgain: "Try again", empty: "No forms yet. New form starts one.",
    capability: "Make and change forms" },
  es: { page: "Creador de formularios", newForm: "Nuevo formulario", heads: ["Formulario", "C\u00f3digo", "Versi\u00f3n", "Estado", "Fuente", ""], version: "Versi\u00f3n {0}",
    published: "Publicado", draft: "Borrador en curso", retired: "Retirado", fromCode: "Del c\u00f3digo", builder: "Hecho con el creador",
    edit: "Editar", history: "Historial de versiones", retire: "Retirar formulario", why: "\u00bfPor qu\u00e9 se retira este formulario?",
    retireNote: "Un formulario retirado sale de todas las listas. Los reportes ya presentados se siguen abriendo.", notYet: "Todav\u00eda no", close: "Cerrar",
    admins: "Esta p\u00e1gina es para administradores.", notLoaded: "Esto no se carg\u00f3.", tryAgain: "Intentar de nuevo", empty: "Todav\u00eda no hay formularios. Nuevo formulario empieza uno.",
    capability: "Crear y cambiar formularios" },
};
// When each version the stub holds was published, as the history draws it: the day and the time in
// New York in the screen's language, written out by hand for the stub's three dates.
const WHEN = {
  en: { "2026-02-03T15:20:00Z": "Feb 3, 2026, 10:20 AM", "2026-03-10T14:05:00Z": "Mar 10, 2026, 10:05 AM", "2025-11-20T17:00:00Z": "Nov 20, 2025, 12:00 PM" },
  es: { "2026-02-03T15:20:00Z": "3 feb 2026, 10:20 a.m.", "2026-03-10T14:05:00Z": "10 mar 2026, 10:05 a.m.", "2025-11-20T17:00:00Z": "20 nov 2025, 12:00 p.m." },
};
// What the API writes for a read that failed on its side (helpers/words.js), which the page must not
// draw in place of its own line.
const SERVER_ERROR = { code: "common.serverError", en: "Server error", es: "Error del servidor" };
const REASON = { en: "Replaced by the paper log for the summer.", es: "Se reemplaza por el registro en papel durante el verano." };
const LOG = "OCSA-FRM-005";
const COMPLAINT = "OCSA-FRM-009";
const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";
const MODAL = "div[style*='z-index: 500']";

// Signs a person in with the overrides the API would hold on their account and the refusals armed
// before the shell reads anything, and answers the calls the sign-in made.
async function signInWith(d, stubs, seed, persona, overrides, refusals) {
  stubs.reset();
  if (overrides) stubs.state.overrides[seed.PEOPLE[persona].id] = overrides;
  if (refusals) stubs.setRefusal(refusals);
  await d.signOutHard();
  const mark = d.mark();
  await d.signIn(persona);
  return d.callsSince(mark);
}
// What GET /api/users/me/permissions named build_forms as at sign-in, or null when it answered nothing.
const namedBuildForms = (calls) => {
  const me = calls.filter((c) => c.method === "GET" && c.path === "/api/users/me/permissions" && c.status === 200).pop();
  return me && me.json && me.json.capabilities ? me.json.capabilities.build_forms === true : null;
};
// Presses the side panel's item that reads this word.
const pressNav = (d, word) => d.page.evaluate((w) => {
  const sb = document.querySelector("div[style*='position: fixed'][style*='border-right']");
  const b = sb && Array.from(sb.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === w);
  if (!b) return false;
  b.click();
  return true;
}, word);
// Presses the button on the page whose name, or failing that whose text, is exactly this.
const pressButton = (d, name) => d.page.evaluate(([sel, n]) => {
  const box = document.querySelector(sel) || document.body;
  const all = Array.from(box.querySelectorAll("button")).filter((b) => b.offsetParent !== null);
  const b = all.find((x) => x.getAttribute("aria-label") === n) || all.find((x) => (x.textContent || "").trim() === n);
  if (!b || b.disabled) return false;
  b.click();
  return true;
}, [CONTENT, name]);
// Opens the history of the row whose code is this, from the row's first cell.
const openRow = async (d, code) => {
  const hit = await d.page.evaluate(([sel, c]) => {
    const box = document.querySelector(sel) || document.body;
    const tr = Array.from(box.querySelectorAll("table tbody tr")).find((x) => { const td = x.querySelectorAll("td"); return td[1] && (td[1].textContent || "").trim() === c; });
    if (!tr) return false;
    tr.querySelector("td").click();
    return true;
  }, [CONTENT, code]);
  await d.settle(300);
  return hit;
};
const hashOf = (d) => d.page.evaluate(() => window.location.hash);
// The page's title in the top bar, the first line the bar draws in the heading size.
const pageTitle = (d) => d.page.evaluate(() => {
  const bar = document.querySelector("div[style*='position: sticky']");
  const el = bar && bar.querySelector("[data-page-title], div[style*='font-size: 16px']");
  return el ? (el.textContent || "").trim() : "";
});
// The page's table as the browser drew it, read as text so an upper-case style changes nothing: each
// heading, and each row's cells, the words of its status badges and its Edit button.
const listTable = (d) => d.page.evaluate((sel) => {
  const box = document.querySelector(sel) || document.body;
  const table = box.querySelector("table");
  if (!table) return null;
  return {
    heads: Array.from(table.querySelectorAll("thead th")).map((th) => (th.textContent || "").trim()),
    rows: Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
      const td = Array.from(tr.querySelectorAll("td"));
      const edit = td[5] ? td[5].querySelector("button") : null;
      return {
        cells: td.map((c) => (c.textContent || "").trim()),
        badges: td[3] ? Array.from(td[3].querySelectorAll("span")).filter((s) => s.children.length === 0).map((s) => (s.textContent || "").trim()) : [],
        edit: edit ? { text: (edit.textContent || "").trim(), name: edit.getAttribute("aria-label") || "" } : null,
      };
    }),
  };
}, CONTENT);
// The history window as the browser drew it: the title, the line under it, the badges and the source,
// each version's three lines, and the words on its buttons.
const historyWindow = (d) => d.page.evaluate((sel) => {
  const box = Array.from(document.querySelectorAll(sel)).pop();
  if (!box) return null;
  const title = box.querySelector("div[style*='font-size: 16px']");
  const badges = Array.from(box.querySelectorAll("span[style*='text-transform: uppercase']"));
  const row = badges.length ? badges[0].parentElement : null;
  return {
    title: title ? (title.textContent || "").trim() : "",
    sub: title && title.nextElementSibling ? (title.nextElementSibling.textContent || "").trim() : "",
    badges: badges.map((b) => (b.textContent || "").trim()),
    source: row ? Array.from(row.children).filter((c) => badges.indexOf(c) < 0).map((c) => (c.textContent || "").trim()).join(" ") : "",
    versions: Array.from(box.querySelectorAll("[role='listitem']")).map((li) => {
      const spans = li.querySelectorAll("span");
      return { version: spans[0] ? (spans[0].textContent || "").trim() : "", line: spans[1] ? (spans[1].textContent || "").trim() : "",
        note: li.children[1] ? (li.children[1].textContent || "").trim() : "" };
    }),
    buttons: Array.from(box.querySelectorAll("button")).map((b) => (b.textContent || "").trim()).filter(Boolean),
    retireBox: (() => { const r = box.querySelector("[data-retire-window]"); return r ? (r.textContent || "") : null; })(),
  };
}, MODAL);

// The row a form the list answered with has to draw, worked out from the answer with the words above.
function wantRow(f, w, lang) {
  const title = (lang === "es" && f.title.es) || f.title.en || f.title.es || f.code;
  return {
    cells: [title, f.code, Number(f.latestVersion) > 0 ? w.version.replace("{0}", f.latestVersion) : "--", null, f.source === "builder" ? w.builder : w.fromCode],
    badges: f.status === "retired" ? [w.retired] : f.status === "draft" ? [w.draft] : [w.published].concat(f.draft ? [w.draft] : []),
    edit: f.status === "retired" ? null : { text: w.edit, name: w.edit + " " + title },
  };
}
const titleIn = (f, lang) => (lang === "es" && f.title.es) || f.title.en || f.code;
// Where a drawn row parts from the row wanted, in plain words, or "".
function rowDiffers(got, want) {
  if (!got) return "the row is not drawn";
  const cells = [0, 1, 2, 4].filter((i) => got.cells[i] !== want.cells[i]).map((i) => "cell " + (i + 1) + " reads " + JSON.stringify(got.cells[i]) + " where it should read " + JSON.stringify(want.cells[i]));
  if (cells.length) return cells.join(", ");
  if (JSON.stringify(got.badges) !== JSON.stringify(want.badges)) return "the status reads " + JSON.stringify(got.badges) + " where it should read " + JSON.stringify(want.badges);
  if (JSON.stringify(got.edit) !== JSON.stringify(want.edit)) return "the Edit cell holds " + JSON.stringify(got.edit) + " where it should hold " + JSON.stringify(want.edit);
  return "";
}
const lastList = (d, mark) => d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/form-builder/forms" && c.status === 200).pop() || null;

async function run({ d, results, seed, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;

  // ---- a supervisor on the role's defaults: no item, and the address draws the line and reads nothing
  const supCalls = await signInWith(d, stubs, seed, "supervisor", null, null);
  await d.expandSidebar();
  const supNav = await d.visibleNavItems();
  let mark = d.mark();
  await d.goto("form-builder");
  const supReads = d.callsSince(mark).filter((c) => c.path.indexOf("/api/form-builder/") === 0);
  const supTold = await d.bodyHas(w.admins);
  results.check("page", "nav/form-builder/not-for-a-non-holder" + tail,
    namedBuildForms(supCalls) === false && supNav.indexOf(w.page) < 0 && supTold && supReads.length === 0,
    namedBuildForms(supCalls) !== false ? "the permissions route named build_forms as " + namedBuildForms(supCalls) + " for a supervisor on the role's defaults"
      : supNav.indexOf(w.page) >= 0 ? "a supervisor who does not hold build_forms finds " + JSON.stringify(w.page) + " in the side panel"
        : !supTold ? "the address #form-builder does not say " + JSON.stringify(w.admins) + " to a supervisor, the page reads " + JSON.stringify((await d.bodyText()).slice(0, 80))
          : "the page read " + supReads.map((c) => c.path).join(", ") + " for a supervisor");

  // ---- an admin whose permissions route does not answer: the role's defaults hold nothing for it
  await signInWith(d, stubs, seed, "admin", null, [{ method: "GET", path: /^\/api\/users\/[^/]+\/permissions$/, status: 500, code: SERVER_ERROR.code, error: SERVER_ERROR[lang] }]);
  await d.expandSidebar();
  const unnamedNav = await d.visibleNavItems();
  mark = d.mark();
  await d.goto("form-builder");
  const unnamedReads = d.callsSince(mark).filter((c) => c.path.indexOf("/api/form-builder/") === 0);
  const unnamedTold = await d.bodyHas(w.admins);
  stubs.clearRefusals();
  results.check("page", "nav/form-builder/nothing-until-the-route-names-it" + tail, unnamedNav.indexOf(w.page) < 0 && unnamedTold && unnamedReads.length === 0,
    unnamedNav.indexOf(w.page) >= 0 ? "with the permissions route refused, an admin still finds " + JSON.stringify(w.page) + " in the side panel"
      : !unnamedTold ? "with the permissions route refused, the address #form-builder does not say " + JSON.stringify(w.admins) + ", the page reads " + JSON.stringify((await d.bodyText()).slice(0, 80))
        : "with the permissions route refused, the page read " + unnamedReads.map((c) => c.path).join(", "));

  // ---- an admin the route names: the item, which opens the page on one read of the list
  const adminCalls = await signInWith(d, stubs, seed, "admin", null, null);
  await d.expandSidebar();
  const nav = await d.visibleNavItems();
  mark = d.mark();
  const pressed = nav.indexOf(w.page) >= 0 ? await pressNav(d, w.page) : false;
  await d.settle(500);
  const reads = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/form-builder/forms");
  const header = await pageTitle(d);
  results.check("page", "nav/form-builder/for-a-holder" + tail, namedBuildForms(adminCalls) === true && pressed && reads.length === 1 && header === w.page,
    namedBuildForms(adminCalls) !== true ? "the permissions route named build_forms as " + namedBuildForms(adminCalls) + " for an admin"
      : nav.indexOf(w.page) < 0 ? "an admin the permissions route names does not find " + JSON.stringify(w.page) + " in the side panel, which holds " + JSON.stringify(nav)
        : header !== w.page ? "the item opened a page titled " + JSON.stringify(header)
          : "opening the page read GET /api/form-builder/forms " + reads.length + " times");

  // ---- the table: the headings, and each form the list answered with, in its order
  const listed = reads.length ? reads[reads.length - 1].json : null;
  const forms = listed && Array.isArray(listed.forms) ? listed.forms : [];
  const table = await listTable(d);
  const tableWrong = !table ? ["no table is drawn, the page reads " + JSON.stringify((await d.bodyText()).slice(0, 80))]
    : JSON.stringify(table.heads) !== JSON.stringify(w.heads) ? ["the headings read " + JSON.stringify(table.heads) + " where they should read " + JSON.stringify(w.heads)]
      : table.rows.length !== forms.length ? [table.rows.length + " rows drawn for the " + forms.length + " forms the list answered with"]
        : forms.map((f, i) => { const why = rowDiffers(table.rows[i], wantRow(f, w, lang)); return why ? f.code + ": " + why : ""; }).filter(Boolean);
  // hand: 4 forms, 005 published from the code, 009 published from the builder with a draft open, 040
  // retired, 041 a draft never published; one of each status, both sources and both kinds of Edit.
  results.check("page", "page/form-builder/the-table-reads-the-list" + tail, forms.length === 4 && tableWrong.length === 0,
    !listed ? "the page read no list, it reads " + JSON.stringify((await d.bodyText()).slice(0, 80))
      : forms.length !== 4 ? "the list answered with " + forms.length + " forms where the stub holds 4" : tableWrong.slice(0, 3).join("; "));

  // ---- a row's Version history, newest first, and Retire form for an admin
  const complaint = forms.find((f) => f.code === COMPLAINT) || null;
  const opened = complaint ? await openRow(d, COMPLAINT) : false;
  const hw = opened ? await historyWindow(d) : null;
  const wantVersions = complaint ? complaint.versions.slice().sort((a, b) => b.version - a.version).map((v) => ({
    version: w.version.replace("{0}", v.version), line: [WHEN[lang][v.publishedAt], v.publishedBy && v.publishedBy.name].filter(Boolean).join(" . "), note: v.changeNote || "",
  })) : [];
  const histWrong = !hw ? "the row opened no window"
    : hw.title !== (complaint ? titleIn(complaint, lang) : "") ? "the window is titled " + JSON.stringify(hw.title)
      : hw.sub !== COMPLAINT + " . " + w.history ? "the line under the title reads " + JSON.stringify(hw.sub)
        : JSON.stringify(hw.badges) !== JSON.stringify([w.published, w.draft]) || hw.source !== w.builder ? "the status and source read " + JSON.stringify(hw.badges.concat([hw.source]))
          : JSON.stringify(hw.versions) !== JSON.stringify(wantVersions) ? "the versions read " + JSON.stringify(hw.versions) + " where they should read " + JSON.stringify(wantVersions)
            : hw.buttons.indexOf(w.retire) < 0 || hw.buttons.indexOf(w.close) < 0 ? "an admin is offered " + JSON.stringify(hw.buttons) : "";
  results.check("window", "window/form-builder/version-history" + tail, !!complaint && wantVersions.length === 2 && !histWrong,
    !complaint ? "no list was read, so no row of " + COMPLAINT + " opens a history"
      : wantVersions.length !== 2 ? "the list answered " + wantVersions.length + " versions of " + COMPLAINT + " where the stub holds 2" : histWrong);
  await d.closeModal();

  // ---- Retire form asks why, sends the reason, and the list reads the form retired
  const log = forms.find((f) => f.code === LOG) || null;
  const logOpened = log ? await openRow(d, LOG) : false;
  const asked = logOpened ? await d.clickText(w.retire, { inModal: true, exact: true }) : false;
  const box = asked ? await historyWindow(d) : null;
  const boxWords = !!box && box.retireBox !== null && box.retireBox.indexOf(w.why) >= 0 && box.retireBox.indexOf(w.retireNote) >= 0 && box.buttons.indexOf(w.notYet) >= 0;
  if (asked) await d.modal().locator("textarea").first().fill(REASON[lang], { timeout: 3000 }).catch(() => {});
  mark = d.mark();
  const sent = asked ? await d.clickText(w.retire, { inModal: true, exact: true }) : false;
  await d.settle(500);
  const retireCalls = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/form-builder/forms/" + LOG + "/retire");
  const reread = lastList(d, mark);
  const afterRetire = await listTable(d);
  const logRow = afterRetire ? afterRetire.rows.find((r) => r.cells[1] === LOG) : null;
  const stillOpen = await d.modalOpen();
  results.check("window", "window/form-builder/retire-sends-the-reason" + tail,
    boxWords && sent && retireCalls.length === 1 && JSON.stringify(retireCalls[0].body) === JSON.stringify({ reason: REASON[lang] }) && !stillOpen && !!reread
      && !!logRow && JSON.stringify(logRow.badges) === JSON.stringify([w.retired]) && logRow.edit === null,
    !log ? "no list was read, so no row of " + LOG + " offers " + JSON.stringify(w.retire)
      : !logOpened ? "the row " + LOG + " opened no window" : !asked ? "the history offers no " + JSON.stringify(w.retire)
      : !boxWords ? "Retire form does not ask " + JSON.stringify(w.why) + " with its note and " + JSON.stringify(w.notYet) + ", the box reads " + JSON.stringify(box && box.retireBox)
        : retireCalls.length !== 1 ? "Retire form sent " + retireCalls.length + " retire requests"
          : JSON.stringify(retireCalls[0].body) !== JSON.stringify({ reason: REASON[lang] }) ? "Retire form sent " + JSON.stringify(retireCalls[0].body)
            : stillOpen ? "the window is still open after the form was retired" : !reread ? "the list was not read again after the retire"
              : "the row reads " + JSON.stringify(logRow && { badges: logRow.badges, edit: logRow.edit }) + " after the retire");

  // ---- a list that does not load says the page's line with Try again, and Try again reads it again
  stubs.reset();
  stubs.setRefusal({ method: "GET", path: /^\/api\/form-builder\/forms$/, status: 500, code: SERVER_ERROR.code, error: SERVER_ERROR[lang] });
  await d.goto("form-builder");
  const failedBody = await d.bodyText();
  const failedButtons = await d.visibleButtons();
  stubs.clearRefusals();
  mark = d.mark();
  const retried = failedButtons.indexOf(w.tryAgain) >= 0 ? await pressButton(d, w.tryAgain) : false;
  await d.settle(400);
  const again = lastList(d, mark);
  const afterRetry = await listTable(d);
  results.check("page", "page/form-builder/a-failed-list-says-so" + tail,
    failedBody.indexOf(w.notLoaded) >= 0 && failedBody.indexOf(SERVER_ERROR[lang]) < 0 && retried && !!again && !!afterRetry && afterRetry.rows.length === 4,
    failedBody.indexOf(w.notLoaded) < 0 ? "a refused list draws " + JSON.stringify(failedBody.slice(0, 90)) + " where it should say " + JSON.stringify(w.notLoaded)
      : failedBody.indexOf(SERVER_ERROR[lang]) >= 0 ? "a refused list draws the API's words " + JSON.stringify(SERVER_ERROR[lang]) + " beside the page's line"
        : !retried ? "no " + JSON.stringify(w.tryAgain) + " beside the line, the buttons are " + JSON.stringify(failedButtons)
          : !again ? JSON.stringify(w.tryAgain) + " read nothing" : "after " + JSON.stringify(w.tryAgain) + " the table draws " + (afterRetry ? afterRetry.rows.length : 0) + " rows");

  // ---- an empty list says so
  stubs.setTrim({ path: "/api/form-builder/forms", keep: 0 });
  await d.goto("form-builder");
  const emptyTable = await listTable(d);
  stubs.setTrim(null);
  const emptyLine = emptyTable && emptyTable.rows.length === 1 ? emptyTable.rows[0].cells.join(" ") : null;
  results.check("page", "page/form-builder/an-empty-list-says-so" + tail, emptyLine === w.empty,
    "a list with no form draws " + JSON.stringify(emptyTable ? emptyTable.rows.map((r) => r.cells.join(" ")) : "no table") + " where it should say " + JSON.stringify(w.empty));

  // ---- Edit opens a form's open draft, with no request, and keeps it in the hash
  stubs.reset();
  mark = d.mark();
  await d.goto("form-builder");
  const fresh = lastList(d, mark);
  const listNow = fresh && fresh.json && Array.isArray(fresh.json.forms) ? fresh.json.forms : [];
  const withDraft = listNow.find((f) => f.code === COMPLAINT) || null;
  mark = d.mark();
  const editOpen = withDraft ? await pressButton(d, w.edit + " " + titleIn(withDraft, lang)) : false;
  await d.settle(400);
  const openHash = await hashOf(d);
  const openPosts = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/form-builder/drafts");
  results.check("page", "page/form-builder/edit-opens-the-open-draft" + tail,
    editOpen && !!withDraft.draft && openPosts.length === 0 && openHash === "#form-builder/" + withDraft.draft.id,
    !editOpen ? "no " + JSON.stringify(w.edit) + " named for " + COMPLAINT + " on the list" : !withDraft.draft ? "the list answered " + COMPLAINT + " with no draft"
      : openPosts.length ? "Edit started a draft for a form whose draft is open: " + JSON.stringify(openPosts[0].body)
        : "Edit left the address at " + JSON.stringify(openHash) + " where it should read #form-builder/" + withDraft.draft.id);

  // ---- Edit on a form with no open draft starts one with its code
  await d.goto("form-builder");
  const noDraft = listNow.find((f) => f.code === LOG) || null;
  mark = d.mark();
  const editStart = noDraft ? await pressButton(d, w.edit + " " + titleIn(noDraft, lang)) : false;
  await d.settle(400);
  const startHash = await hashOf(d);
  const started = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/form-builder/drafts");
  const startedId = started[0] && started[0].json && started[0].json.draft ? started[0].json.draft.id : null;
  results.check("page", "page/form-builder/edit-starts-a-draft" + tail,
    editStart && started.length === 1 && JSON.stringify(started[0].body) === JSON.stringify({ code: LOG }) && !!startedId && startHash === "#form-builder/" + startedId,
    !editStart ? "no " + JSON.stringify(w.edit) + " named for " + LOG + " on the list" : started.length !== 1 ? "Edit sent " + started.length + " draft starts"
      : JSON.stringify(started[0].body) !== JSON.stringify({ code: LOG }) ? "Edit sent " + JSON.stringify(started[0].body)
        : "Edit left the address at " + JSON.stringify(startHash) + " where it should read #form-builder/" + startedId);

  // ---- New form starts a form with no code, the next one the API gives
  await d.goto("form-builder");
  mark = d.mark();
  const newPressed = await pressButton(d, w.newForm);
  await d.settle(400);
  const newHash = await hashOf(d);
  const made = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/form-builder/drafts");
  const madeId = made[0] && made[0].json && made[0].json.draft ? made[0].json.draft.id : null;
  results.check("page", "page/form-builder/new-form-starts-one" + tail,
    newPressed && made.length === 1 && JSON.stringify(made[0].body) === JSON.stringify({}) && !!madeId && newHash === "#form-builder/" + madeId,
    !newPressed ? "no " + JSON.stringify(w.newForm) + " at the top of the page" : made.length !== 1 ? JSON.stringify(w.newForm) + " sent " + made.length + " draft starts"
      : JSON.stringify(made[0].body) !== JSON.stringify({}) ? JSON.stringify(w.newForm) + " sent " + JSON.stringify(made[0].body)
        : JSON.stringify(w.newForm) + " left the address at " + JSON.stringify(newHash) + " where it should read #form-builder/" + madeId);

  // ---- Roles and Permissions names the capability in the table's words
  stubs.reset();
  await d.goto("settings");
  await d.clickText(d.say("Roles and Permissions"), { exact: true });
  await d.settle(300);
  const picked = await d.pickPerson(seed.STAFF[4].name);
  await d.settle(400);
  const capRow = picked ? await d.capabilityRow(w.capability) : null;
  const apiLabel = (stubs.fixtures.CAPABILITIES.find((c) => c.key === "build_forms") || {}).label || "";
  results.check("page", "page/settings/permissions/build-forms-is-named" + tail, !!capRow,
    !picked ? "the person picker did not offer " + seed.STAFF[4].name
      : "no capability reads " + JSON.stringify(w.capability) + ((await d.bodyHas(apiLabel)) ? ", the row reads the API's name " + JSON.stringify(apiLabel) : ""));

  // ---- a supervisor the route names by override: the item, and a history with no Retire form
  const heldCalls = await signInWith(d, stubs, seed, "supervisor", { build_forms: true }, null);
  await d.expandSidebar();
  const heldNav = await d.visibleNavItems();
  mark = d.mark();
  const heldPressed = heldNav.indexOf(w.page) >= 0 ? await pressNav(d, w.page) : false;
  await d.settle(500);
  const heldReads = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/form-builder/forms");
  results.check("page", "nav/form-builder/a-supervisor-the-route-names" + tail, namedBuildForms(heldCalls) === true && heldPressed && heldReads.length === 1,
    namedBuildForms(heldCalls) !== true ? "the permissions route named build_forms as " + namedBuildForms(heldCalls) + " for a supervisor holding it by override"
      : !heldPressed ? "a supervisor holding build_forms does not find " + JSON.stringify(w.page) + " in the side panel, which holds " + JSON.stringify(heldNav)
        : "opening the page read GET /api/form-builder/forms " + heldReads.length + " times");
  const heldOpened = await openRow(d, COMPLAINT);
  const heldWindow = heldOpened ? await historyWindow(d) : null;
  results.check("window", "window/form-builder/no-retire-for-a-non-admin" + tail,
    !!heldWindow && heldWindow.sub === COMPLAINT + " . " + w.history && heldWindow.buttons.indexOf(w.retire) < 0 && heldWindow.buttons.indexOf(w.close) >= 0,
    !heldOpened ? "a supervisor holding build_forms finds no row of " + COMPLAINT + " to open, the page reads " + JSON.stringify((await d.bodyText()).slice(0, 80))
      : !heldWindow ? "the row " + COMPLAINT + " opened no window for a supervisor holding build_forms"
      : heldWindow.sub !== COMPLAINT + " . " + w.history ? "the window's line reads " + JSON.stringify(heldWindow.sub)
        : "a supervisor is offered " + JSON.stringify(heldWindow.buttons));
  await d.closeModal();

  stubs.reset();
  results.note("The Form builder page in " + lang + ": who finds it, the table, a row's history, Retire form, Edit and New form, and the capability's name");
}

module.exports = { run };
