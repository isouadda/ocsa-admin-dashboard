// The rest of the dashboard reads the catalog by app, Step 187 (13cf7e8), in English and in Spanish at 1280.
//
// Since Step 186 the API's catalog, GET /api/forms, says which apps offer each form, apps, and reads
// ?app= to list only the forms offered in one app; with no app it lists every form. Filed forms reads it
// twice when the tab opens: the whole catalog in the screen's language for the Form filter, which the tab
// read in English before, and GET /api/forms?app=dashboard for Start a form, whose picker reads the same
// address again when it opens. Customer links reads GET /api/forms?app=customer and offers every form
// whose apps names customer, where it offered two fixed codes before. The review window says Version {0}
// when the report carries the version it was filed on. The stub publishes two forms made with the
// builder, the way the builder's own suite publishes one: OCSA-FRM-037, offered in the dashboard and to
// customers, and OCSA-FRM-038, offered in the staff app alone, with one report filed on it. The suite
// holds Start a form to the dashboard's forms, the complaint log and 037, with 038 left out; the filter
// to every form the catalog holds, 038 and the customer forms among them, each builder form by its title
// in the screen's language; Customer links to 037 beside the two customer forms, and a link made for it;
// and the report's window to the version it was filed on. The words are written out here by hand.
"use strict";

const MODAL = "div[style*='z-index: 500']";
const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";

// The words the screen has to say, and the titles the catalog sends in each language, by hand.
const WORDS = {
  en: { form: "Form", site: "Site", start: "Start a form", links: "Customer links", newLink: "New link", back: "Back", version: "Version 1",
    t037: "Lobby walkthrough with the tenant", t038: "Dock door check", desk: "Complaint log",
    t006: "Facility Cleanliness Evaluation Checklist", t007: "Client Satisfaction Survey" },
  es: { form: "Formulario", site: "Sitio", start: "Iniciar un formulario", links: "Enlaces para clientes", newLink: "Nuevo enlace", back: "Volver", version: "Versi\u00f3n 1",
    t037: "Recorrido del vest\u00edbulo con el inquilino", t038: "Revisi\u00f3n de las puertas del muelle", desk: "Registro de quejas",
    t006: "Lista de evaluaci\u00f3n de limpieza del edificio", t007: "Encuesta de satisfacci\u00f3n del cliente" },
};

// The options of the select whose name is label, on the page or in the open window, as the browser
// drew them, or null when there is no such select.
const optionsOf = (d, label, inModal) => d.page.evaluate(([l, scope]) => {
  const root = Array.from(document.querySelectorAll(scope)).pop();
  const sel = root && Array.from(root.querySelectorAll("select")).find((s) => s.getAttribute("aria-label") === l);
  return sel ? Array.from(sel.options).map((o) => ({ v: o.value, l: (o.textContent || "").trim() })) : null;
}, [label, inModal ? MODAL : CONTENT]);
// Chooses an option of that select by its words or its value, the way a person picks one.
const choose = async (d, label, inModal, pick) => {
  const root = inModal ? d.modal() : d.contentBox();
  const sel = root.locator("select[aria-label='" + label + "']").first();
  if ((await sel.count()) === 0) return false;
  try { await sel.selectOption(pick, { timeout: 3000 }); } catch (e) { return false; }
  await d.settle(300);
  return true;
};
const named = (list, code) => ((list || []).find((o) => o.v === code) || {}).l || null;
// A button in the open window, pressed by its words.
const press = (d, word, within) => d.page.evaluate(([sel, w, scope]) => {
  const root = Array.from(document.querySelectorAll(sel)).pop();
  const box = root && scope ? root.querySelector(scope) : root;
  const b = box && Array.from(box.querySelectorAll("button")).find((x) => x.offsetParent !== null && !x.disabled && (x.textContent || "").trim() === w);
  if (!b) return false;
  b.click();
  return true;
}, [MODAL, word, within || ""]);
const listRows = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.innerText.replace(/\s+/g, " ").trim()));
const clickRowWith = (d, text) => d.page.evaluate((txt) => {
  const row = Array.from(document.querySelectorAll("table tbody tr")).find((r) => r.innerText.indexOf(txt) >= 0);
  if (!row) return false;
  row.click();
  return true;
}, text);

async function openFiled(d) {
  await d.goto("forms");
  const ok = await d.clickText(d.say("Filed forms"), { exact: false });
  await d.settle(500);
  return ok;
}

async function run({ d, results, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  stubs.reset();
  stubs.publishForm("OCSA-FRM-037");
  stubs.publishForm("OCSA-FRM-038");
  await d.signOutHard();
  await d.signIn("admin");
  const site = stubs.state.sites[0];

  // ---- Filed forms: the filter reads the whole catalog, in the screen's language
  let mark = d.mark();
  await openFiled(d);
  const reads = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms");
  const full = reads.find((c) => c.query === "") || null;
  const offered = reads.find((c) => c.query === "?app=dashboard") || null;
  const filter = await optionsOf(d, w.form, false);
  const served = full && full.json && Array.isArray(full.json.forms) ? full.json.forms.map((f) => f.code) : [];
  const listed = (filter || []).filter((o) => o.v).map((o) => o.v);
  mark = d.mark();
  const chose = filter ? await choose(d, w.form, false, { label: w.t038 }) : false;
  await d.settle(300);
  const byForm = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms/responses").pop() || null;
  const rows = await listRows(d);
  results.check("page", "page/forms/catalog/the-filter-reads-every-form" + tail,
    !!full && full.locale === lang && served.length > 0 && listed.join(",") === served.join(",")
      && listed.indexOf("OCSA-FRM-038") >= 0 && listed.indexOf("OCSA-FRM-006") >= 0
      && named(filter, "OCSA-FRM-037") === w.t037 && named(filter, "OCSA-FRM-038") === w.t038
      && chose && !!byForm && byForm.query.indexOf("formCode=OCSA-FRM-038") >= 0 && rows.length === 1 && rows[0].indexOf(w.t038) >= 0,
    !full ? "the tab read no catalog without an app for its Form filter"
      : full.locale !== lang ? "the filter read the catalog with locale=" + full.locale + " on a screen drawn in " + lang
        + ", and names the builder forms " + JSON.stringify([named(filter, "OCSA-FRM-037"), named(filter, "OCSA-FRM-038")])
        : listed.join(",") !== served.join(",") ? "the filter lists " + JSON.stringify(listed) + " where the catalog holds " + JSON.stringify(served)
          : named(filter, "OCSA-FRM-037") !== w.t037 || named(filter, "OCSA-FRM-038") !== w.t038 ? "the filter names the builder forms "
            + JSON.stringify([named(filter, "OCSA-FRM-037"), named(filter, "OCSA-FRM-038")]) + " where the catalog titles them " + JSON.stringify([w.t037, w.t038])
            : !chose ? "no " + JSON.stringify(w.t038) + " to choose in the filter"
              : !byForm || byForm.query.indexOf("formCode=OCSA-FRM-038") < 0 ? "choosing it read the list with " + JSON.stringify(byForm ? byForm.query : null)
                : "filtered by it the list reads " + JSON.stringify(rows));
  await choose(d, w.form, false, { value: "" });

  // ---- Start a form: the forms offered in the dashboard, read by app
  mark = d.mark();
  const started = await d.clickText(w.start, { exact: true });
  await d.settle(400);
  const pickerRead = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms").pop() || null;
  const items = started ? await d.page.evaluate((sel) => Array.from(document.querySelectorAll(sel + " [role=list] button")).map((b) => (b.textContent || "").trim()), MODAL) : [];
  const dashboard = [w.desk, w.t037].sort();
  const pickerOk = !!pickerRead && pickerRead.query === "?app=dashboard" && pickerRead.locale === lang && items.slice().sort().join("|") === dashboard.join("|");
  results.check("window", "window/forms/catalog/start-a-form-offers-the-dashboards-forms" + tail, !!offered && started && pickerOk,
    (!offered ? "the tab read no GET /api/forms?app=dashboard for Start a form; " : "")
      + (!started ? "no " + JSON.stringify(w.start) + " to press"
        : !pickerRead ? "the picker read no catalog and lists " + JSON.stringify(items)
          : "the picker read GET /api/forms" + pickerRead.query + " and lists " + JSON.stringify(items) + " where the dashboard offers " + JSON.stringify(dashboard)
            + (items.indexOf(w.t038) >= 0 ? ", " + JSON.stringify(w.t038) + " among them, which only the staff app offers" : "")));
  await d.closeModal();

  // ---- Customer links: every form whose apps names customer
  mark = d.mark();
  const linksOpen = await d.clickText(w.links, { exact: true });
  await d.settle(500);
  const custRead = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/forms").pop() || null;
  const forms = await optionsOf(d, w.form, true);
  const codes = (forms || []).map((o) => o.v).sort();
  const customer = ["OCSA-FRM-006", "OCSA-FRM-007", "OCSA-FRM-037"];
  results.check("window", "window/forms/catalog/customer-links-offers-the-builder-form" + tail,
    linksOpen && !!custRead && custRead.query === "?app=customer" && codes.join(",") === customer.join(",")
      && named(forms, "OCSA-FRM-037") === w.t037 && named(forms, "OCSA-FRM-006") === w.t006 && named(forms, "OCSA-FRM-007") === w.t007,
    !linksOpen ? "no " + JSON.stringify(w.links) + " to press"
      : !custRead ? "the window read no catalog and offers " + JSON.stringify((forms || []).map((o) => o.l))
        : custRead.query !== "?app=customer" ? "the window read GET /api/forms" + custRead.query
          : "the Form select offers " + JSON.stringify(forms) + " where every form whose apps names customer is " + JSON.stringify([w.t006, w.t007, w.t037]));

  // ---- a link made for the builder form
  const picked = forms ? await choose(d, w.form, true, { label: w.t037 }) : false;
  await choose(d, w.site, true, { value: site.id });
  mark = d.mark();
  const pressed = picked ? await press(d, w.newLink) : false;
  await d.settle(700);
  const made = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/customer-links").pop() || null;
  const qr = await d.page.evaluate((sel) => { const s = document.querySelector(sel + " [data-qr-screen]"); return s ? s.innerText.replace(/\s+/g, " ").trim() : ""; }, MODAL);
  await press(d, w.back, "[data-qr-screen]");
  await d.settle(300);
  const newId = made && made.json && made.json.link ? made.json.link.id : "";
  const newRow = newId ? await d.page.evaluate(([sel, id]) => { const r = document.querySelector(sel + " [data-customer-link='" + id + "']"); return r ? r.innerText.replace(/\s+/g, " ").trim() : ""; }, [MODAL, newId]) : "";
  const wantBody = JSON.stringify({ formCode: "OCSA-FRM-037", siteId: site.id });
  results.check("window", "window/forms/catalog/a-link-for-the-builder-form" + tail,
    picked && pressed && !!made && made.status === 201 && JSON.stringify(made.body) === wantBody && qr.indexOf(w.t037) >= 0 && newRow.indexOf(w.t037) >= 0 && newRow.indexOf(site.name) >= 0,
    !picked ? "the Form select has no " + JSON.stringify(w.t037) + ", so no link could be made for it"
      : !made ? "New link sent nothing" : made.status !== 201 || JSON.stringify(made.body) !== wantBody ? "New link sent " + JSON.stringify(made.body) + " and was answered " + made.status
        : qr.indexOf(w.t037) < 0 ? "the QR screen reads " + JSON.stringify(qr.slice(0, 160))
          : "the new link's row reads " + JSON.stringify(newRow));
  await d.closeModal();

  // ---- the report's window says the version it was filed on
  await openFiled(d);
  const opened = await clickRowWith(d, w.t038);
  await d.settle(700);
  const head = opened ? (await d.modalText()).split("\n").slice(0, 10).join(" ") : "";
  results.check("window", "window/forms/catalog/the-report-says-its-version" + tail, opened && head.indexOf(w.version) >= 0,
    !opened ? "Filed forms lists no report of " + JSON.stringify(w.t038) : "the window's head reads " + JSON.stringify(head.slice(0, 220)) + " with no " + JSON.stringify(w.version));
  await d.closeModal();

  stubs.reset();
  results.note("The catalog by app in " + lang + ": the Form filter, Start a form, Customer links and a report's version, with two builder forms published");
}

module.exports = { run };
