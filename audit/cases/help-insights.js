// Help insights, Step 185 (2f54e59), in English and in Spanish at 1280.
//
// A page for whoever holds view_help_insights, which the role's defaults do not hold, so nothing draws
// until GET /api/users/me/permissions names it. The stub names it for an admin, the API's own default,
// and for no supervisor. The admin finds Help insights in the side panel; the supervisor finds it
// neither there nor behind its address, where the page says it is for admins and reads nothing. The
// page reads GET /api/help-insights/summary, /misses and /people with the range on the address, the
// last 30 days ending March 17 by default, and each filter the person picks, and draws every figure the
// three answered. A row of Everyone who asked opens that person's questions, read with the same range
// and filters, under the line Opening this is recorded.
//
// The Language filter and the language every signed-in call names are one parameter on the address,
// locale=, which the API reads as both (routes/helpInsights.js and helpers/language.js at ocsa-api
// 1c3fb42). All languages therefore reaches the API as the screen's own language, and the page draws
// that language's questions alone. The stub counts the way the API does, and the case that holds All
// languages to every language the stub holds is a known failure until the API reads the filter under a
// name of its own. The words are written out here by hand.
"use strict";

const WORDS = {
  en: { page: "Help insights", their: "Their questions", recorded: "Opening this is recorded.", admins: "This page is for admins.", byLanguage: "By language",
    sec: "{0} sec", missed: "{0}% missed", lead: "Custodial Lead", portal: "Portal",
    tiles: { questions: "Questions", people: "People asking", answered: "Answered", misses: "Missed", helpfulYes: "Rated helpful", helpfulNo: "Rated not helpful", reply: "Typical reply time" } },
  es: { page: "Estad\u00edsticas de la Ayuda", their: "Sus preguntas", recorded: "Abrir esto queda registrado.", admins: "Esta p\u00e1gina es para administradores.", byLanguage: "Por idioma",
    sec: "{0} s", missed: "{0}% sin respuesta", lead: "L\u00edder de limpieza", portal: "Portal",
    tiles: { questions: "Preguntas", people: "Personas que preguntan", answered: "Respondidas", misses: "Sin respuesta", helpfulYes: "\u00datiles", helpfulNo: "No \u00fatiles", reply: "Tiempo t\u00edpico de respuesta" } },
};
const RANGE = "?from=2026-02-16&to=2026-03-17";
const ROUTES = ["/api/help-insights/summary", "/api/help-insights/misses", "/api/help-insights/people"];

// A tile's value, read off the tile whose label is this.
const tileValue = (d, label) => d.page.evaluate((l) => {
  const el = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === l && x.previousElementSibling);
  return el ? { value: (el.previousElementSibling.textContent || "").trim(), sub: el.nextElementSibling ? (el.nextElementSibling.textContent || "").trim() : "" } : null;
}, label);
// The rows of the small table titled this, label and value each.
const smallTable = (d, title) => d.page.evaluate((t0) => {
  const head = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === t0);
  const card = head && head.parentElement;
  return card ? Array.from(card.children).slice(1).map((row) => Array.from(row.querySelectorAll("span")).map((sp) => (sp.textContent || "").trim())) : null;
}, title);
// The last read of each of the three routes since a mark.
const lastReads = (d, mark) => ROUTES.map((r) => d.callsSince(mark).filter((c) => c.method === "GET" && c.path === r).pop() || null);
// Picks the option of the select labelled this by the words it shows.
const pickIn = async (d, label, words) => {
  const sel = d.page.locator("select[aria-label='" + label + "']").first();
  if ((await sel.count()) === 0) return false;
  await sel.selectOption({ label: words });
  await d.settle(500);
  return true;
};

async function run({ d, results, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  stubs.reset();

  // ---- a supervisor, who does not hold view_help_insights: no item, and no read behind the address
  await d.signOutHard();
  await d.signIn("supervisor");
  await d.expandSidebar();
  const supNav = await d.visibleNavItems();
  const markSup = d.mark();
  await d.goto("help-insights");
  const refusedRead = d.callsSince(markSup).filter((c) => c.path.indexOf("/api/help-insights/") === 0);
  const told = await d.bodyHas(w.admins);
  results.check("page", "nav/help-insights/not-for-a-non-holder" + tail, supNav.indexOf(w.page) < 0 && told && refusedRead.length === 0,
    supNav.indexOf(w.page) >= 0 ? "a supervisor finds " + JSON.stringify(w.page) + " in the side panel"
      : !told ? "the page does not say " + JSON.stringify(w.admins) + " to a supervisor" : "the page read " + refusedRead.map((c) => c.path).join(", ") + " for a supervisor");

  // ---- an admin, who holds it: the item, and the three reads with the range on the address
  await d.signOutHard();
  await d.signIn("admin");
  await d.expandSidebar();
  const adminNav = await d.visibleNavItems();
  const mark = d.mark();
  await d.goto("help-insights");
  await d.settle(700);
  const reads = lastReads(d, mark);
  const offRange = reads.map((c, i) => (c && c.query === RANGE ? null : ROUTES[i] + " " + (c ? JSON.stringify(c.query) : "not read"))).filter(Boolean);
  results.check("page", "nav/help-insights/for-a-holder" + tail, adminNav.indexOf(w.page) >= 0, "an admin does not find " + JSON.stringify(w.page) + " in the side panel");
  results.check("page", "page/help-insights/reads-the-three-routes" + tail, offRange.length === 0, "not read with " + RANGE + ": " + offRange.join("; "));

  // ---- every figure is the one the summary answered
  const summary = reads[0] && reads[0].json;
  const num = (n) => Number(n).toLocaleString(lang === "es" ? "es-US" : "en-US");
  const tiles = summary ? {
    questions: num(summary.questions), people: num(summary.people), answered: num(summary.answered), misses: num(summary.misses),
    helpfulYes: num(summary.helpfulYes), helpfulNo: num(summary.helpfulNo), reply: w.sec.replace("{0}", (summary.medianReplyMs / 1000).toFixed(1)),
  } : {};
  const wrongTiles = [];
  for (const k of Object.keys(tiles)) {
    const got = await tileValue(d, w.tiles[k]);
    if (!got || got.value !== tiles[k]) wrongTiles.push(w.tiles[k] + " reads " + JSON.stringify(got && got.value) + " where the summary says " + JSON.stringify(tiles[k]));
  }
  const missedTile = await tileValue(d, w.tiles.misses);
  const rate = summary && summary.questions ? Math.round((100 * summary.misses) / summary.questions) : 0;
  if (!missedTile || missedTile.sub !== w.missed.replace("{0}", rate)) wrongTiles.push("under " + w.tiles.misses + " reads " + JSON.stringify(missedTile && missedTile.sub));
  results.check("page", "page/help-insights/every-tile-reads-the-summary" + tail, !!summary && wrongTiles.length === 0, !summary ? "no summary was read" : wrongTiles.join("; "));

  const body = await d.bodyText();
  const missesServed = reads[1] && reads[1].json ? reads[1].json.misses : [];
  const peopleServed = reads[2] && reads[2].json ? reads[2].json.people : [];
  const undrawn = (summary ? summary.topTopics.map((x) => x.name) : []).concat(missesServed.map((x) => x.question), peopleServed.map((x) => x.name))
    .filter((x) => body.indexOf(x) < 0);
  results.check("page", "page/help-insights/every-table-reads-its-route" + tail, peopleServed.length > 0 && undrawn.length === 0,
    peopleServed.length === 0 ? "no person was served" : "not drawn: " + undrawn.slice(0, 4).map((x) => JSON.stringify(x)).join(", "));

  // ---- a person's questions, read with the same range
  // The row of Everyone who asked, the one table on the page a row of which opens something.
  const markPerson = d.mark();
  await d.page.evaluate((name) => {
    const row = Array.from(document.querySelectorAll("table tbody tr")).find((tr) => (tr.textContent || "").indexOf(name) >= 0 && tr.style.cursor === "pointer");
    if (row) row.click();
  }, peopleServed[0] ? peopleServed[0].name : "");
  await d.settle(700);
  const personRead = d.callsSince(markPerson).filter((c) => c.method === "GET" && /^\/api\/help-insights\/people\/[^/]+$/.test(c.path)).pop();
  const shown = await d.modalText();
  const turns = personRead && personRead.json ? personRead.json.turns : [];
  const missing = turns.map((x) => x.question).filter((x) => shown.indexOf(x) < 0);
  results.check("window", "window/help-insights/their-questions" + tail,
    !!personRead && personRead.query === RANGE && shown.indexOf(w.their) >= 0 && shown.indexOf(w.recorded) >= 0 && turns.length > 0 && missing.length === 0,
    !personRead ? "no person's questions were read" : personRead.query !== RANGE ? "the person was read with " + JSON.stringify(personRead.query)
      : shown.indexOf(w.their) < 0 || shown.indexOf(w.recorded) < 0 ? "the window does not say " + JSON.stringify(w.their) + " and " + JSON.stringify(w.recorded)
        : "not drawn: " + missing.join(", "));
  await d.closeModal();

  // ---- All languages: every language the stub holds, which the address cannot ask for (known)
  const langs = await smallTable(d, w.byLanguage);
  const named = (langs || []).map((r) => r[0]);
  results.check("page", "page/help-insights/all-languages-reads-every-language" + tail, named.indexOf("English") >= 0 && named.indexOf("Espa\u00f1ol") >= 0,
    "with All languages, " + JSON.stringify(w.byLanguage) + " lists " + JSON.stringify(named) + ": the reads carried locale=" + (reads[0] ? reads[0].locale : "?") + ", which the API reads as the language filter");

  // ---- each filter on the address
  const markSite = d.mark();
  const site = await pickIn(d, d.say("Site"), "Harbor Point Center");
  const bySite = lastReads(d, markSite);
  const markRole = d.mark();
  const role = await pickIn(d, d.say("Role"), w.lead);
  const byRole = lastReads(d, markRole);
  const markApp = d.mark();
  const app = await pickIn(d, d.say("App"), w.portal);
  const byApp = lastReads(d, markApp);
  const markLang = d.mark();
  const other = lang === "es" ? "English" : "Espa\u00f1ol";
  const picked = await pickIn(d, d.say("Language"), other);
  const byLang = lastReads(d, markLang);
  const wantQuery = RANGE + "&siteId=s-1&role=custodial_lead&app=portal";
  const off = [];
  if (!site || bySite.some((c) => !c || c.query !== RANGE + "&siteId=s-1")) off.push("the site: " + bySite.map((c) => c && c.query).join(", "));
  if (!role || byRole.some((c) => !c || c.query !== RANGE + "&siteId=s-1&role=custodial_lead")) off.push("the role: " + byRole.map((c) => c && c.query).join(", "));
  if (!app || byApp.some((c) => !c || c.query !== wantQuery)) off.push("the app: " + byApp.map((c) => c && c.query).join(", "));
  if (!picked || byLang.some((c) => !c || c.query !== wantQuery || c.locale !== (lang === "es" ? "en" : "es"))) off.push("the language: " + byLang.map((c) => c && (c.query + " locale=" + c.locale)).join(", "));
  results.check("page", "page/help-insights/every-filter-on-the-address" + tail, off.length === 0, off.join("; "));

  stubs.reset();
  results.note("Help insights in " + lang + ": the side panel for a holder and not for a supervisor, the three reads, every tile and table, a person's questions and each filter");
}

module.exports = { run };
