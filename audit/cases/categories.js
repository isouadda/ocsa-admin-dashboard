// The framework's words off every screen, page and file, Step 181 (67b7a28), in English and in Spanish
// at 1280.
//
// A service category is one of six plain words, Cleaning, Quality checks, Management, Green cleaning,
// Safety, and Staff and training, keyed by the codes the API stores. Where a page reads the
// cims_categories pick list and the list holds the code, the list's shown label comes first; a code the
// list does not hold is drawn as the plain word. Each language's pass reads every place below twice:
// with the list as the stub serves it, and with SD left off the list, which setListGap does, so both
// paths are on the screen at once. On the Service Catalog that is each card's badge and the line under
// it, a service's window, and Edit Service's list, which offers the words and sends the code; the
// export writes the English word. On Inspections it is the pill on each of a template's items and on
// each item of an inspection and its printed report, the Reports tab's breakdown and lowest items and
// their printed page, and the two files, which write the list's English label or the English word. On
// Staff Management and Sites it is the Record Detail window of a task on the timeline and its printed
// page, whose row is labeled Service category; and on Staff Management the window of a service somebody
// created, which the detail route cannot find, so the window draws the entry's metadata, the category
// with it. On Reports the issue reports saved under the framework's old category read Issues, and a new
// report's Category starts empty with its example. The framework's own name is on none of these. The
// words are written out here by hand, so a wrong entry in the table turns the case red.
"use strict";
const { parseCsv, htmlTables } = require("./exports");
const { printLines } = require("./prints");

const AREA = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";
const MODAL = "div[style*='z-index: 500']";

// The six words by the code the API stores, the label a record's row carries, the heading the issue
// reports sit under and a new report's example, in each language.
const WORDS = {
  en: { SD: "Cleaning", HSE: "Safety", GB: "Green cleaning", QS: "Quality checks", HR: "Staff and training", MC: "Management",
    field: "Service category", issues: "Issues", example: "e.g. Issues" },
  es: { SD: "Limpieza", HSE: "Seguridad", GB: "Limpieza ecol\u00f3gica", QS: "Controles de calidad", HR: "Personal y capacitaci\u00f3n",
    MC: "Gesti\u00f3n", field: "Categor\u00eda de servicio", issues: "Problemas", example: "p. ej. Problemas" },
};
const CODES = ["SD", "HSE", "GB", "QS", "HR", "MC"];
// The code the second pass leaves off the list the page is served.
const GAP = "SD";
// The framework's own name, in either case and inside any word.
const FRAMEWORK = /cims/i;

// The cims_categories values of the lists the page was last served.
const servedList = (stubs) => {
  const call = stubs.calls.filter((c) => c.method === "GET" && c.path === "/api/lookups/all" && Array.isArray(c.json)).pop();
  return call ? ((call.json.find((l) => l.slug === "cims_categories") || {}).values || []) : [];
};
// What a screen draws for a code: the list's shown label where the list holds the code, and the plain
// word where it does not. What a file writes: the list's English label, or the plain word in English.
const shownFor = (list, code, w) => { const v = list.find((x) => x.value === code); return v ? (v.displayLabel || v.label) : w[code]; };
const englishFor = (list, code) => { const v = list.find((x) => x.value === code); return v ? v.label : WORDS.en[code]; };
// The last answer a route gave to a read, by its path.
const lastServed = (stubs, re) => { const c = stubs.calls.filter((x) => x.method === "GET" && re.test(x.path) && x.json).pop(); return c ? c.json : null; };

// Each service's card on the catalog: the badge beside its name and the line under its description.
const serviceCards = (d, names) => d.page.evaluate(([area, list]) => {
  const box = document.querySelector(area) || document.body;
  return list.map((name) => {
    const el = Array.from(box.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === name);
    const head = el && el.parentElement ? el.parentElement.parentElement : null;
    const card = head ? head.parentElement : null;
    const badge = head && head.lastElementChild && head.lastElementChild.tagName === "SPAN" ? head.lastElementChild.textContent.trim() : null;
    const foot = card && card.lastElementChild !== head ? card.lastElementChild : null;
    const line = foot && foot.firstElementChild ? foot.firstElementChild.textContent.trim() : null;
    return { name, badge, line };
  });
}, [AREA, names]);

// The words beside a name at the top of the open window.
const besideName = (d, name) => d.page.evaluate(([sel, nm]) => {
  const box = Array.from(document.querySelectorAll(sel)).pop();
  const el = box ? Array.from(box.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === nm) : null;
  return el && el.nextElementSibling ? Array.from(el.nextElementSibling.querySelectorAll("span")).map((s) => s.textContent.trim()).filter(Boolean) : null;
}, [MODAL, name]);

// The pill in the row of each item named, which is the row's first child.
const pillsBeside = (d, labels) => d.page.evaluate(([area, list]) => {
  const box = document.querySelector(area) || document.body;
  return list.map((label) => {
    const el = Array.from(box.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === label);
    const row = el && el.parentElement ? el.parentElement.parentElement : null;
    return { label, pill: row && row.firstElementChild ? row.firstElementChild.textContent.trim() : null };
  });
}, [AREA, labels]);

// The Reports tab on Inspections: the category on each card under the breakdown's heading, and each of
// the lowest items with its category.
const reportsTab = (d, head) => d.page.evaluate(([area, h]) => {
  const box = document.querySelector(area) || document.body;
  const title = Array.from(box.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === h);
  const cards = title && title.nextElementSibling ? Array.from(title.nextElementSibling.children) : [];
  const table = Array.from(box.querySelectorAll("table")).pop();
  const rows = table ? Array.from(table.querySelectorAll("tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim())) : [];
  return {
    breakdown: cards.map((c) => { const s = c.querySelector("span"); return s ? s.textContent.trim() : null; }),
    lowest: rows.map((r) => ({ label: r[0] || "", pill: r[2] === undefined ? null : r[2] })),
  };
}, [AREA, head]);

// Every line under a heading in the open window: its whole text, the label it starts with and the value
// after it.
const underHeading = (d, head) => d.page.evaluate(([sel, h]) => {
  const box = Array.from(document.querySelectorAll(sel)).pop();
  const title = box ? Array.from(box.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === h) : null;
  const grid = title ? title.nextElementSibling : null;
  return grid ? Array.from(grid.children).map((f) => ({
    text: (f.textContent || "").replace(/\s+/g, " ").trim(),
    label: f.children[0] ? (f.children[0].textContent || "").trim() : "",
    value: f.children[1] ? (f.children[1].textContent || "").trim() : "",
  })) : null;
}, [MODAL, head]);

// The label and value of every field a printed record carries.
const printedFields = (html) => {
  const out = [];
  const re = /<div class="label">([^<]*)<\/div><div class="value">([^<]*)<\/div>/g;
  let m;
  while ((m = re.exec(String(html || "")))) out.push({ label: m[1], value: m[2] });
  return out;
};

// The groups of the Reports library: each heading, and every name on the cards under it.
const reportGroups = (d) => d.page.evaluate((area) => {
  const box = document.querySelector(area) || document.body;
  return Array.from(box.querySelectorAll("div")).filter((h) => h.children.length === 0 && /text-transform: uppercase/.test(h.getAttribute("style") || "")
    && h.nextElementSibling && /display: grid/.test(h.nextElementSibling.getAttribute("style") || ""))
    .map((h) => ({ heading: (h.textContent || "").trim(), names: Array.from(h.nextElementSibling.querySelectorAll("span")).map((s) => (s.textContent || "").trim()) }));
}, AREA);

// The box under a label on the page: what it holds and its example.
const boxUnder = (d, label) => d.page.evaluate(([area, l]) => {
  const box = document.querySelector(area) || document.body;
  const lab = Array.from(box.querySelectorAll("label")).find((x) => (x.textContent || "").trim() === l);
  const input = lab && lab.parentElement ? lab.parentElement.querySelector("input") : null;
  return input ? { value: input.value, placeholder: input.getAttribute("placeholder") || "" } : null;
}, [AREA, label]);

// The rows of the newest file whose name matches, header first.
const fileRows = (downloads, re) => { const f = downloads.filter((x) => re.test(x.name)).pop(); return f ? { rows: parseCsv(f.body), body: f.body } : null; };

// One read of every place a category is drawn, with the list the page was last served.
async function readPass(d, stubs, w, fx) {
  const out = { list: servedList(stubs), texts: [] };
  const keep = async (where) => { out.texts.push({ where, text: (await d.readable()).join("\n") }); };
  const keepText = (where, text) => { if (text) out.texts.push({ where, text }); };
  const press = (label, opts) => d.clickText(label, opts).catch(() => false);
  const printed = async () => { const p = (await d.prints()).pop(); return p && p.html ? p.html : null; };

  // ---- the Service Catalog: the cards, the export, the first service's window, Edit Service on the second
  await d.goto("services");
  await d.settle(300);
  out.cards = await serviceCards(d, fx.services.map((s) => s.name));
  await keep("the Service Catalog");
  await d.clearCaptures();
  await press(d.say("Export"), { exact: true });
  await d.settle(300);
  const catalog = fileRows(await d.downloads(), /Service_Catalog/);
  out.catalogFile = catalog ? catalog.rows : null;
  keepText("the catalog's file", catalog && catalog.body);
  out.window = null;
  if (await press(fx.services[0].name, { exact: true })) {
    await d.settle(300);
    out.window = await besideName(d, fx.services[0].name);
    await keep("the window of " + fx.services[0].name);
    await d.closeModal();
  }
  out.edit = { options: null, word: shownFor(out.list, GAP, w), picked: false, sent: null };
  if (await press(fx.services[1].name, { exact: true }) && await press(d.say("Edit"), { inModal: true, exact: true })) {
    await d.settle(300);
    out.edit.options = await d.modal().locator("select option").evaluateAll((els) => els.map((o) => ({ v: o.value, l: (o.textContent || "").trim() })));
    await keep("Edit Service");
    out.edit.picked = await d.modal().locator("select").first().selectOption({ label: out.edit.word }).then(() => true).catch(() => false);
    await d.settle(150);
    const mark = d.mark();
    await press(d.say("Save Changes"), { inModal: true, exact: true });
    await d.settle(300);
    out.edit.sent = d.callsSince(mark).filter((c) => c.method === "PATCH" && c.path === "/api/services/" + fx.services[1].id).pop() || null;
  }
  await d.closeModal();
  await d.closeModal();

  // ---- Inspections: a template's items, an inspection's items, its file and printed report, and the
  // Reports tab with its file and printed page
  const labels = fx.items.map((i) => i.label);
  await d.goto("inspections");
  await d.settle(300);
  out.templateItems = (await press(fx.template.name, { exact: true })) ? await pillsBeside(d, labels) : null;
  await keep("the items of a template");
  out.inspection = null;
  out.inspectionFile = null;
  out.inspectionPrint = null;
  await press(d.say("Completed|inspections"), { exact: false });
  if (await d.clickRow(0).catch(() => false)) {
    await d.settle(300);
    out.inspection = await pillsBeside(d, labels);
    await keep("an inspection's items");
    await d.clearCaptures();
    await press(d.say("CSV"), { exact: true });
    await press(d.say("Export PDF"), { exact: true });
    await d.settle(300);
    const file = fileRows(await d.downloads(), /^inspection-(?!analytics-)/);
    out.inspectionFile = file ? file.rows : null;
    keepText("an inspection's file", file && file.body);
    out.inspectionPrint = await printed();
    keepText("an inspection's printed report", out.inspectionPrint && printLines(out.inspectionPrint).join("\n"));
    await press(d.say("Back"), { exact: true });
  }
  await press(d.say("Reports"), { exact: true });
  await d.settle(600);
  out.reportsTab = await reportsTab(d, d.say("Score by Service Category"));
  out.breakdownServed = lastServed(stubs, /^\/api\/inspections\/analytics\/category-breakdown/) || [];
  out.lowestServed = lastServed(stubs, /^\/api\/inspections\/analytics\/lowest-items/) || [];
  await keep("the Reports tab on Inspections");
  await d.clearCaptures();
  await press(d.say("Export CSV"), { exact: true });
  await press(d.say("Print Report"), { exact: true });
  await d.settle(300);
  const analytics = fileRows(await d.downloads(), /^inspection-analytics-/);
  out.analyticsFile = analytics ? analytics.rows : null;
  keepText("the Reports tab's file", analytics && analytics.body);
  out.analyticsPrint = await printed();
  keepText("the Reports tab's printed page", out.analyticsPrint && printLines(out.analyticsPrint).join("\n"));

  // ---- Staff Management: a task and a service on the first person's timeline, each in its window
  const taskCode = () => { const r = lastServed(stubs, /^\/api\/users\/timeline-detail\/task\//); return r && r.record ? r.record.cims_category : null; };
  stubs.setTimeline(fx.entries);
  await d.goto("staff");
  await d.clickRow(0).catch(() => false);
  await d.settle(300);
  await press(d.say("Timeline"), { exact: true });
  await d.settle(300);
  out.staffTask = null;
  out.staffTaskPrint = null;
  out.staffService = null;
  if (await press(fx.entries[1].description, { exact: true })) {
    await d.settle(300);
    out.staffTask = await underHeading(d, d.say("Record Fields"));
    out.staffTaskCode = taskCode();
    await keep("the Record Detail of a task on Staff Management");
    await d.clearCaptures();
    if (await press(d.say("Print"), { inModal: true, exact: true })) out.staffTaskPrint = await printed();
    keepText("the printed record of a task on Staff Management", out.staffTaskPrint && printLines(out.staffTaskPrint).join("\n"));
    await d.closeModal();
  }
  if (await press(fx.entries[0].description, { exact: true })) {
    await d.settle(300);
    out.staffService = await underHeading(d, d.say("Available Metadata"));
    await keep("the Record Detail of a service on Staff Management");
    await d.closeModal();
  }
  stubs.setTimeline(null);

  // ---- Sites: the task on the first site's timeline, in its window
  await d.goto("sites");
  await d.clickRow(0).catch(() => false);
  await d.settle(300);
  await press(d.say("Timeline"), { exact: true });
  await d.settle(300);
  const line = lastServed(stubs, /^\/api\/sites\/timeline\//);
  const siteTask = line && Array.isArray(line.entries) ? line.entries.find((e) => e.entityType === "task") : null;
  out.sitesTask = null;
  out.sitesTaskPrint = null;
  if (siteTask && await press(siteTask.description, { exact: true })) {
    await d.settle(300);
    out.sitesTask = await underHeading(d, d.say("Record Fields"));
    out.sitesTaskCode = taskCode();
    await keep("the Record Detail of a task on Sites");
    await d.clearCaptures();
    if (await press(d.say("Print"), { inModal: true, exact: true })) out.sitesTaskPrint = await printed();
    keepText("the printed record of a task on Sites", out.sitesTaskPrint && printLines(out.sitesTaskPrint).join("\n"));
    await d.closeModal();
  }
  return out;
}

async function run({ d, results, seed, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  const say = (x) => JSON.stringify(x);
  const admin = seed.PEOPLE.admin.firstName + " " + seed.PEOPLE.admin.lastName;
  const service = stubs.fixtures.SERVICES[0];
  const task = stubs.fixtures.ASSIGNED_TASKS.find((x) => x.id === "at-2");
  const fx = {
    services: stubs.fixtures.SERVICES,
    template: stubs.fixtures.INSPECTION_TEMPLATES[0],
    items: stubs.fixtures.INSPECTION_ITEMS,
    // Two entries on the first person's timeline, the way the API logs them: a service they created,
    // which routes/services.js logs with no entity id and the category in its metadata, and a task they
    // finished, whose row the detail route reads. Invented.
    entries: [
      { id: "tl-21", createdAt: seed.shift(-2) + "T15:00:00Z", actionType: "service_created", actorName: admin, description: "Created service: " + service.name,
        entityType: "service", entityId: null, metadata: { service_id: service.id, name: service.name, cims_category: service.cims_category } },
      { id: "tl-22", createdAt: seed.shift(-3) + "T16:20:00Z", actionType: "task_completed", actorName: admin, description: task.label,
        entityType: "task", entityId: task.id, metadata: {} },
    ],
  };

  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");
  const served = await readPass(d, stubs, w, fx);
  stubs.setListGap({ slug: "cims_categories", value: GAP });
  await d.goto("overview");
  await d.reload();
  const gap = await readPass(d, stubs, w, fx);
  stubs.setListGap(null);

  // The problems each pass shows, named by the pass that showed them.
  const PASSES = [["with the list as served", served], ["with " + GAP + " off the list", gap]];
  const across = (judge) => Array.from(new Set(PASSES.reduce((all, [name, p]) => all.concat(judge(p).map((x) => name + ", " + x)), [])));
  const itemCode = (label) => (fx.items.find((i) => i.label === label) || {}).cims_category;
  // Each pill against the word for its item's code.
  const pillsWrong = (reads, list, codeOf) => reads.map((x) => {
    const want = shownFor(list, codeOf(x.label), w);
    return x.pill === want ? null : say(x.label) + " reads " + say(x.pill) + " where the word is " + say(want);
  }).filter(Boolean);
  // A record's Service category row against the word for its code, with every row that names a
  // category read out when it is not there.
  const recordWrong = (fields, code, list, where) => {
    if (!fields || !code) return [where + " did not open on a task's record"];
    const want = shownFor(list, code, w);
    const row = fields.find((f) => f.label === w.field);
    if (row && row.value === want) return [];
    const near = fields.filter((f) => /categ/i.test(f.label)).map((f) => f.label + ": " + f.value);
    return [where + (row ? " reads " + say(row.value) : " has no " + say(w.field) + " row; " + (near.length ? "it reads " + say(near) : "no row names a category"))
      + " where the word is " + say(want)];
  };

  // ---- the Service Catalog
  const cardsOff = across((p) => (!p.cards || p.cards.every((c) => c.badge === null) ? ["the catalog drew no card"]
    : p.cards.map((c, i) => {
      const want = shownFor(p.list, fx.services[i].cims_category, w);
      return c.badge === want && c.line === want ? null : say(c.name) + " reads " + say(c.badge) + " and " + say(c.line) + " where the word is " + say(want);
    }).filter(Boolean)));
  results.check("page", "page/services/category-on-each-card" + tail, cardsOff.length === 0, cardsOff.slice(0, 3).join("; "));

  const windowOff = across((p) => {
    const want = shownFor(p.list, fx.services[0].cims_category, w);
    if (!p.window) return ["the window of " + say(fx.services[0].name) + " did not open"];
    return p.window.length > 0 && p.window.every((x) => x === want) ? [] : ["the window draws " + say(p.window) + " beside the name where the word is " + say(want)];
  });
  results.check("window", "window/services/detail-category" + tail, windowOff.length === 0, windowOff.slice(0, 2).join("; "));

  const editOff = across((p) => {
    if (!p.edit.options) return ["Edit Service did not open on " + say(fx.services[1].name)];
    const want = CODES.map((c) => c + "=" + shownFor(p.list, c, w)).sort();
    const got = p.edit.options.map((o) => o.v + "=" + o.l).sort();
    if (JSON.stringify(got) !== JSON.stringify(want)) return ["the Service Category list offers " + say(got) + " where it should offer " + say(want)];
    if (!p.edit.picked) return [say(p.edit.word) + " could not be chosen"];
    const sent = p.edit.sent && p.edit.sent.body ? p.edit.sent.body.cimsCategory : undefined;
    return sent === GAP ? [] : [!p.edit.sent ? "Save Changes sent nothing" : "choosing " + say(p.edit.word) + " sent cimsCategory " + say(sent) + " where the code is " + GAP];
  });
  results.check("window", "window/services/edit-category-list" + tail, editOff.length === 0, editOff.slice(0, 2).join("; "));

  const catalogOff = across((p) => {
    const rows = p.catalogFile;
    const col = rows && rows[0] ? rows[0].indexOf("Service Category") : -1;
    if (!rows || col < 0) return [rows ? "the export has no Service Category column: " + say(rows[0]) : "Export wrote no file"];
    return fx.services.map((s) => {
      const row = rows.slice(1).find((r) => r[0] === s.name);
      const want = WORDS.en[s.cims_category];
      return row && row[col] === want ? null : "the export writes " + say(s.name) + " with " + say(row ? row[col] : null) + " where the English word is " + say(want);
    }).filter(Boolean);
  });
  results.check("page", "page/services/export-writes-the-english-word" + tail, catalogOff.length === 0, catalogOff.slice(0, 2).join("; "));

  // ---- Inspections
  const templateOff = across((p) => (!p.templateItems || p.templateItems.every((x) => x.pill === null)
    ? ["the items of " + say(fx.template.name) + " did not open"] : pillsWrong(p.templateItems, p.list, itemCode)));
  results.check("page", "page/inspections/template-item-pills" + tail, templateOff.length === 0, templateOff.slice(0, 3).join("; "));

  const inspectionOff = across((p) => {
    if (!p.inspection || p.inspection.every((x) => x.pill === null)) return ["no inspection opened from the Completed tab"];
    const table = p.inspectionPrint ? htmlTables(p.inspectionPrint)[0] : null;
    const rows = table ? table.rows.map((r) => ({ label: r[0], pill: r[2] === undefined ? null : r[2] })) : [];
    return pillsWrong(p.inspection, p.list, itemCode).concat(!p.inspectionPrint ? ["Export PDF printed nothing"]
      : rows.length !== fx.items.length ? ["the printed report carries " + rows.length + " items for " + fx.items.length]
        : pillsWrong(rows, p.list, itemCode).map((x) => "on the printed report " + x));
  });
  results.check("page", "page/inspections/inspection-item-pills" + tail, inspectionOff.length === 0, inspectionOff.slice(0, 3).join("; "));

  const tabOff = across((p) => {
    const t0 = p.reportsTab || { breakdown: [], lowest: [] };
    const want = p.breakdownServed.map((c) => shownFor(p.list, c.cims_category, w));
    const lowCode = (label) => (p.lowestServed.find((x) => x.label === label) || {}).cims_category;
    const out = [];
    if (want.length === 0 || JSON.stringify(t0.breakdown) !== JSON.stringify(want)) out.push("the breakdown reads " + say(t0.breakdown) + " where the words are " + say(want));
    if (t0.lowest.length === 0) out.push("the lowest items drew no row");
    else pillsWrong(t0.lowest, p.list, lowCode).forEach((x) => out.push("among the lowest items " + x));
    const tables = p.analyticsPrint ? htmlTables(p.analyticsPrint) : [];
    if (tables.length < 3) out.push("Print Report printed " + tables.length + " tables");
    else {
      const cats = tables[1].rows.map((r) => r[0]);
      if (JSON.stringify(cats) !== JSON.stringify(want)) out.push("the printed breakdown reads " + say(cats) + " where the words are " + say(want));
      pillsWrong(tables[2].rows.map((r) => ({ label: r[0], pill: r[2] === undefined ? null : r[2] })), p.list, lowCode).forEach((x) => out.push("on the printed page " + x));
    }
    return out;
  });
  results.check("page", "page/inspections/reports-tab-categories" + tail, tabOff.length === 0, tabOff.slice(0, 3).join("; "));

  const filesOff = across((p) => {
    const out = [];
    const f = p.inspectionFile;
    const col = f && f[0] ? f[0].indexOf("Service Category") : -1;
    if (!f || col < 0) out.push(f ? "an inspection's file has no Service Category column" : "an inspection's CSV wrote no file");
    else fx.items.forEach((it) => {
      const row = f.find((r) => r[0] === it.label);
      const want = englishFor(p.list, it.cims_category);
      if (!row || row[col] !== want) out.push("an inspection's file writes " + say(it.label) + " with " + say(row ? row[col] : null) + " where the word is " + say(want));
    });
    const a = p.analyticsFile;
    const item = a && a[0] ? a[0].indexOf("Item") : -1;
    const cat = a && a[0] ? a[0].indexOf("Category") : -1;
    if (!a || a.length < 2 || item < 0 || cat < 0) out.push(a ? "the Reports tab's file has no Item and Category columns or no rows" : "Export CSV wrote no file");
    else a.slice(1).forEach((r) => {
      const want = englishFor(p.list, itemCode(r[item]));
      if (r[cat] !== want) out.push("the Reports tab's file writes " + say(r[item]) + " with " + say(r[cat]) + " where the word is " + say(want));
    });
    return out;
  });
  results.check("page", "page/inspections/files-fall-back-to-the-word" + tail, filesOff.length === 0, filesOff.slice(0, 3).join("; "));

  // ---- Record Detail on Staff Management and on Sites, the window and its printed page
  const staffOff = across((p) => recordWrong(p.staffTask, p.staffTaskCode, p.list, "the window"));
  results.check("window", "window/staff/record-detail-service-category" + tail, staffOff.length === 0, staffOff.slice(0, 2).join("; "));
  const staffPrintOff = across((p) => (!p.staffTaskPrint ? ["Print on the task's window printed nothing"]
    : recordWrong(printedFields(p.staffTaskPrint), p.staffTaskCode, p.list, "the printed record")));
  results.check("page", "page/staff/record-detail-print-service-category" + tail, staffPrintOff.length === 0, staffPrintOff.slice(0, 2).join("; "));
  // A service's entry, whose record the detail route cannot find: the window draws the entry's metadata,
  // and the category's line is labeled Service category with the word.
  const metaOff = across((p) => {
    if (!p.staffService) return ["the window of the service's entry drew no metadata"];
    const want = w.field + ": " + shownFor(p.list, fx.entries[0].metadata.cims_category, w);
    const lines = p.staffService.map((x) => x.text);
    return lines.indexOf(want) >= 0 ? [] : ["the metadata reads " + say(lines) + " where the category's line is " + say(want)];
  });
  results.check("window", "window/staff/record-detail-metadata-service-category" + tail, metaOff.length === 0, metaOff.slice(0, 2).join("; "));
  const sitesOff = across((p) => recordWrong(p.sitesTask, p.sitesTaskCode, p.list, "the window"));
  results.check("window", "window/sites/record-detail-service-category" + tail, sitesOff.length === 0, sitesOff.slice(0, 2).join("; "));
  const sitesPrintOff = across((p) => (!p.sitesTaskPrint ? ["Print on the task's window printed nothing"]
    : recordWrong(printedFields(p.sitesTaskPrint), p.sitesTaskCode, p.list, "the printed record")));
  results.check("page", "page/sites/record-detail-print-service-category" + tail, sitesPrintOff.length === 0, sitesPrintOff.slice(0, 2).join("; "));

  // ---- Reports: the issue reports saved under the framework's old category, and a new report's Category
  const texts = [];
  await d.goto("reports");
  await d.settle(300);
  const defs = lastServed(stubs, /^\/api\/report-engine\/definitions$/) || [];
  const oldCategory = (Array.isArray(defs) ? defs : []).filter((x) => String(x.category || "").replace(/_/g, " ").toLowerCase() === "service delivery");
  const groups = await reportGroups(d);
  texts.push({ where: "the Reports library", text: (await d.readable()).join("\n") });
  const headingOver = (name) => { const g = groups.find((x) => x.names.indexOf(name) >= 0); return g ? g.heading : null; };
  const wrongHeads = oldCategory.map((x) => ({ name: x.name, heading: headingOver(x.name) })).filter((x) => x.heading !== w.issues);
  const opened = await d.clickText(d.say("New report"), { exact: true }).catch(() => false);
  await d.settle(300);
  const box = opened ? await boxUnder(d, d.say("Category")) : null;
  if (opened) texts.push({ where: "the report editor", text: (await d.readable()).join("\n") });
  const reportsOff = (oldCategory.length === 0 ? ["the stub served no report saved under the old category"] : [])
    .concat(wrongHeads.map((x) => say(x.name) + " sits under " + say(x.heading) + " where the heading is " + say(w.issues)))
    .concat(!box ? ["New report has no Category box"] : box.value !== "" || box.placeholder !== w.example
      ? ["a new report's Category holds " + say(box.value) + " with the example " + say(box.placeholder) + " where it should start empty with " + say(w.example)] : []);
  results.check("page", "page/reports/issue-category" + tail, reportsOff.length === 0, reportsOff.join("; "));

  // ---- the framework's own name, on every screen, page and file read above
  const read = served.texts.concat(gap.texts, texts);
  const named = read.filter((x) => FRAMEWORK.test(x.text))
    .map((x) => x.where + " reads " + say((x.text.split("\n").find((l) => FRAMEWORK.test(l)) || "").slice(0, 80)));
  results.check("page", "page/categories/framework-name-nowhere" + tail, read.length > 0 && named.length === 0,
    named.length + " of " + read.length + " screens, pages and files name the framework: " + Array.from(new Set(named)).slice(0, 3).join("; "));

  stubs.reset();
  results.note("Service categories in " + lang + ": the catalog's " + fx.services.length + " cards, a service's window, Edit Service and the export; "
    + fx.items.length + " items on a template and on an inspection, its printed report, the Reports tab, its printed page and the two files; "
    + "a task's Record Detail on Staff Management and on Sites and their printed pages, and a service's; each with the list as served and with "
    + GAP + " off it; and the issue reports' category on Reports. " + read.length + " screens, pages and files read for the framework's name");
}

module.exports = { run };
