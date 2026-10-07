// npm run shots: the pictures of the screen beside the Help guide (Step 278, STEP276_CONTRACT.md
// sections 1 and 3).
//
// It serves the build/ that npm run build made, against the audit's own stub, so every name, site
// and number in a picture is invented, and opens each screen a guide entry describes at 1280 by 900
// in the light theme, once in English and once in Spanish. Each picture is written to
// public/guide-shots/<name>.en.jpg and <name>.es.jpg, a JPEG of at most 250 KB: the quality is
// lowered first, and the picture is cut shorter only when the lowest quality is still too big.
//
// SHOTS below is the one list. Each picture names the guide entry whose Picture: line names it and
// says how its screen is reached: who is signed in (as), the address it opens (open), what it waits
// for (ready), and what it presses or types once there (act). Before it takes anything the run holds
// the list to guide/APP-DASHBOARD.md: every picture's entry is in the guide, an entry has at most two,
// and a Picture: line names a picture on this list under the same entry.
//
//   npm run shots                                   every picture, both languages
//   npm run shots -- training-catalog               one picture, by its name
//   npm run shots -- "Assign training to people"    an entry's pictures, by its title
//   npm run shots -- --lang=es --missing            only the Spanish files not taken yet
//
// Any pull request that adds or changes a guide entry reruns this for that entry's pictures, and
// npm run guide-check holds the files to the guide. It is not part of npm run smoke.
//
// Since Step 293 the run keeps guide/shots-taken.json, each picture's name with the day it was taken,
// YYYY-MM-DD where the run is: a picture taken in both languages in one run gets that day, one taken
// in one language only keeps the day it had, and a name no longer on the list is taken out. npm run
// guide-check fails an entry whose Last checked: is later than the day of any of its pictures.
"use strict";
const fs = require("fs");
const path = require("path");
const { createStubs } = require("./stubs");
const { serve } = require("./lib/serve");
const { launch } = require("./lib/browser");
const { createDriver } = require("./lib/driver");
const { BUILD_DIR, ROOT } = require("./lib/build");
const seed = require("./seed");

const OUT = path.join(ROOT, "public", "guide-shots");
const TAKEN = path.join(ROOT, "guide", "shots-taken.json");
const GUIDE = path.join(ROOT, "guide", "APP-DASHBOARD.md");
const SUFFIX = " (admin dashboard)";
const NAME = /^[a-z0-9-]{1,60}$/;
const LANGS = ["en", "es"];
const MAX_BYTES = 250 * 1024;
// The quality is lowered a step at a time until the picture fits; only past the last step is it cut.
const QUALITIES = [80, 72, 64, 56, 48, 40];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- helpers the list's act functions use -----------------------------------------------------
// Each takes the shot's context, { d, page, say, lang, stubs }.
const until = (c, sel, timeout) => c.page.locator(sel).first().waitFor({ timeout: timeout || 8000 });
const click = async (c, sel) => { await c.page.locator(sel).first().click(); };
// A button by its words in the screen's language.
const press = async (c, english, within) => { await (within ? c.page.locator(within) : c.page).getByRole("button", { name: c.say(english) }).first().click(); };
// A row of the first table on the page holding the words, in the screen's language when given as
// { en, es }.
const row = async (c, sel, words) => { await c.page.locator(sel).filter({ hasText: typeof words === "object" ? words[c.lang] : words }).first().click(); };
// Brings what the picture is about into view inside whatever scrolls it.
const show = async (c, sel) => { await c.page.locator(sel).first().scrollIntoViewIfNeeded(); };
// A drawn signature in the box, the way the audit's driver draws one.
const sign = async (c) => { await c.d.drawSignature(); };
// A topic's lesson editor: the draft already open, or a new one from the live lesson.
const openLesson = async (c, topic) => {
  await row(c, "[data-training-catalog] table tbody tr", topic);
  await click(c, '[data-topic-tab="lesson"]');
  await until(c, "[data-topic-lesson]");
  if ((await c.page.locator("[data-lesson-open-draft]").count()) > 0) await click(c, "[data-lesson-open-draft]");
  else await click(c, '[data-lesson-new="published"]');
  await until(c, "[data-lesson-editor]");
};
// Help's answer to how the evidence pack is printed, the way the API writes one from the app guide,
// in the screen's language.
const HELP_ANSWER = {
  en: "1. Click **Reports** in the side panel. Under **Management review**, click **Open** on its card.\n2. Pick **Monthly** or **Quarterly**, then the month or the quarter.\n3. Click **Print the evidence pack**. The pack opens in a new window, ready to print or to save as a PDF.",
  es: "1. Haga clic en **Informes** en el panel lateral. En **Revisi\u00f3n por la direcci\u00f3n**, haga clic en **Abrir** en su tarjeta.\n2. Elija **Mensual** o **Trimestral**, y luego el mes o el trimestre.\n3. Haga clic en **Imprimir el paquete de evidencias**. El paquete se abre en una ventana nueva, listo para imprimir o para guardar como PDF.",
};
const HELP_QUESTION = { en: "How do I print the evidence pack?", es: "\u00bfC\u00f3mo imprimo el paquete de evidencias?" };
// The shell is up once the side panel's items are drawn, and a window is the one at z-index 500.
const SHELL = "[data-nav-item]";
const MODAL = "div[style*='z-index: 500']";
// The stub's first assigned task, at-1, in the words each language draws it with.
const TASK = { en: "Strip and refinish lobby", es: "Decapar y encerar el vest\u00edbulo" };
// The avatar chip at the top right, which opens the person's menu.
const userMenu = async (c) => { await c.d.openUserMenu(); await until(c, "button[aria-pressed]"); };
// A button whose words start with the English words, in the screen's language.
const btn = (c, english, within) => (within ? c.page.locator(within) : c.page).getByRole("button", { name: c.say(english) }).first();
// The same, for a word that is also the start of a longer button's words.
const exact = (c, english, within) => (within ? c.page.locator(within) : c.page).getByRole("button", { name: c.say(english), exact: true }).first();
const inModal = (c) => c.page.locator(MODAL).last();
// A choice in a picker, by the words of the option; inside the open window when there is one.
const choose = async (c, words) => {
  const sels = ((await c.page.locator(MODAL).count()) ? inModal(c) : c.page).locator("select");
  for (let i = 0; i < (await sels.count()); i += 1) {
    const sel = sels.nth(i);
    if (!(await sel.isVisible())) continue;
    const at = (await sel.locator("option").allTextContents()).findIndex((l) => l.indexOf(words) >= 0);
    if (at >= 0) { await sel.selectOption({ index: at }); await wait(200); return; }
  }
  // Since Step 291 a person is chosen in a searchable picker: each one in sight is opened, searched
  // for the words and closed again when it does not offer them.
  const picks = ((await c.page.locator(MODAL).count()) ? inModal(c) : c.page).locator("[data-person-pick]");
  for (let i = 0; i < (await picks.count()); i += 1) {
    const box = picks.nth(i);
    if (!(await box.isVisible())) continue;
    await box.locator("[data-person-pick-field]").click();
    await box.locator("[data-person-pick-search]").fill(words);
    const opt = box.locator("[data-person-pick-option]").filter({ hasText: words }).first();
    if (await opt.count()) { await opt.click(); await wait(200); return; }
    await c.page.keyboard.press("Escape");
  }
  throw new Error("no picker offers " + words);
};
// A person picked in the searchable picker inside within (Step 291), found by what is typed (a name,
// a badge number or an employee ID, the person's id when nothing is given) and picked by their id.
const pickIn = async (c, within, id, typed) => {
  const box = c.page.locator(within).locator("[data-person-pick]").first();
  await box.locator("[data-person-pick-field]").click();
  if (typed) await box.locator("[data-person-pick-search]").fill(typed);
  await box.locator('[data-person-pick-option="' + id + '"]').click();
  await wait(150);
};
// The same, for the picker whose field carries the label, in the open window or on the page.
const pickByLabel = async (c, label, id, typed) => {
  const field = c.page.locator('button[data-person-pick-field][aria-label="' + c.say(label) + '"]').last();
  await field.click();
  const box = field.locator("xpath=..");
  if (typed) await box.locator("[data-person-pick-search]").fill(typed);
  await box.locator('[data-person-pick-option="' + id + '"]').click();
  await wait(150);
};
// A date or time field keeps its part picked in blue while it has the focus, so the picture is
// taken with nothing focused.
const blur = async (c) => { await c.page.evaluate(() => document.activeElement && document.activeElement.blur()); };
// The place of the first option holding the words, in one picker.
const optionIndex = async (sel, words) => {
  const i = (await sel.locator("option").allTextContents()).findIndex((l) => l.indexOf(words) >= 0);
  if (i < 0) throw new Error("no option holds " + words);
  return i;
};

// The top of what the picture is about, brought to the top of whatever scrolls it, less off pixels
// (the bar across the top of a page is 80 high).
const top = async (c, sel, off) => {
  await c.page.locator(sel).first().evaluate((e, o) => {
    e.scrollIntoView({ block: "start" });
    let p = e.parentElement;
    while (p && !(p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    (p || document.scrollingElement).scrollTop -= o;
  }, off == null ? 100 : off);
};
const tab = async (c, english) => { await c.page.getByRole("button", { name: c.say(english), exact: true }).first().click(); };
// A kept record opened from its card on Reports, with the first site picked and its count drawn.
const kept = async (c, english) => {
  const card = c.page.locator("[data-report-group] > div:nth-child(2) > div").filter({ has: c.page.getByText(c.say(english), { exact: true }) });
  await card.getByRole("button").first().click();
  await until(c, "[data-kept-record]");
  await c.page.locator("[data-kept-record] select").first().selectOption("s-1");
  await c.page.locator('[data-kept-record] [role="status"]').filter({ hasText: /\d/ }).first().waitFor();
};
// A person in the open people picker, by name.
const pickPerson = async (c, name) => { await c.page.locator("[data-people-picker] label").filter({ hasText: name }).first().locator('input[type="checkbox"]').check(); };
const inLang = (c, en, sp) => (c.lang === "es" ? sp : en);
// A row of the equipment register by the item's name.
const equipmentRow = (c, name) => c.page.locator("[data-equipment-page] table tbody tr").filter({ hasText: name });

// A filed report's window, at #forms/reports/<id>. cf-1 and cf-2 are the stub's own customer
// filings; every fr-p- report is one the picture stub files (audit/pictures-stub.js).
const report = (id) => "forms/reports/" + id;
// A question of the supervisor half, by the label the stub sends for it.
const asked = (c, en, es) => c.page.getByLabel(inLang(c, en, es), { exact: true });
// Brings sel to the top of whatever scrolls it, gap pixels below the edge.
const toTop = async (c, sel, gap) => {
  await c.page.locator(sel).first().evaluate((el, g) => {
    let p = el.parentElement;
    while (p && !(p.scrollHeight > p.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    const box = p || document.scrollingElement;
    const edge = p ? p.getBoundingClientRect().top : 0;
    box.scrollTop += el.getBoundingClientRect().top - edge - (g || 0);
  }, gap || 0);
  await wait(200);
};
const STILL = (c) => 'ul[aria-label="' + c.say("Still needed in the supervisor section") + '"]';
// Opens the box of a sign-off, draws in it, and brings its buttons into view.
const signBox = async (c, key) => {
  await press(c, "Sign", '[data-question="' + key + '"]');
  await until(c, "[data-signature-box]");
  await sign(c);
  await c.page.locator("[data-signature-box] button").last().scrollIntoViewIfNeeded();
};
// A card on Reports, opened by its name.
const openReport = async (c, name) => {
  await c.page.getByText(c.say(name), { exact: true }).first().locator("xpath=../..").getByRole("button").first().click();
};
// Start a form, the form picked by its title, then the site.
const startForm = async (c, title, site) => {
  await press(c, "Start a form");
  await row(c, MODAL + ' button[role="listitem"]', title);
  await until(c, "[data-form-site-question]");
  if (site) { await row(c, '[data-form-site-question] button[role="listitem"]', site); await until(c, "[data-form-window]"); }
};
const REVIEW = { en: "Employee Performance Evaluation", es: "Evaluaci\u00f3n del desempe\u00f1o del empleado" };
const CALLS = { en: "Call Intake and Communication Log", es: "Registro de llamadas y comunicaciones" };
// The employment the pictures open: u-staff-5, active and holding company property, and u-staff-12,
// whose employment ended with three past sites, one a school site (audit/stubs.js, Steps 247 and 262);
// u-staff-9 on leave and u-staff-10 inactive with no reason recorded (audit/pictures-stub.js).
const ACTIVE = "u-staff-5";
const LEFT = "u-staff-12";
const win = (mode) => '[data-employment-window="' + mode + '"]';
// A date typed into the window's date box, left without the focus ring.
const day = async (c, mode, value) => {
  const box = c.page.locator(win(mode) + ' input[type="date"]').first();
  await box.fill(value);
  await box.blur();
};
// A picker in the open window or on the page, by the words of its label.
const pickLabeled = async (c, label, value) => { await c.page.locator('select[aria-label="' + c.say(label) + '"]').last().selectOption(value); };
// A picker's choices come from the API, so the act waits for the one it picks to be there.
const offered = async (c, sel) => { await c.page.locator(sel).first().waitFor({ state: "attached", timeout: 8000 }); };
const typeIn = async (c, sel, en, es) => { await c.page.locator(sel).first().fill(c.lang === "es" ? es : en); };
// The stub's warned person, u-staff-8, with a draft final warning da-11, an issued written warning
// da-9 and a warning on the old form not on the record yet (audit/pictures-stub.js).
const WARNED = "hr/u-staff-8";
const newWarning = async (c, step) => {
  await press(c, "Issue a warning", "[data-person-discipline]");
  await until(c, '[data-warning-window="draft"]');
  await pickLabeled(c, "Step", step);
  await pickLabeled(c, "Category", step === "termination" ? "conduct" : "attendance");
  await c.page.locator('[data-warning-window] input[type="date"]').first().fill(seed.shift(-1));
};
const openWarning = async (c, id) => {
  await click(c, '[data-warning-row="' + id + '"]');
  await until(c, "[data-warning-window]");
};
// insp-4, the walk at Harbor Point Center scored 94 percent, with photos, the inspector's signature
// and a review line open (audit/pictures-stub.js).
const openInspection = async (c, view) => {
  await c.page.getByRole("button", { name: c.say(view) }).first().click();
  await row(c, "table tbody tr", "94%");
  await until(c, "[data-inspection-signature]");
};
// A signature drawn in a box that is not in a window, the way the driver draws one in a window.
const drawIn = async (c, sel) => {
  const box = await c.page.locator(sel).first().boundingBox();
  await c.page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.55);
  await c.page.mouse.down();
  await c.page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, { steps: 6 });
  await c.page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 6 });
  await c.page.mouse.up();
};
const openRehire = async (c) => {
  await click(c, '[data-employment-action="rehire"]');
  await until(c, win("rehire") + " [data-restore-site]");
  await day(c, "rehire", "2026-03-23");
};

// The stub's topics and people the training pictures open (audit/stubs.js, Steps 256 to 275).
const TOPIC = {
  spill: { en: "Spill response", es: "Respuesta a derrames" },
  ladder: { en: "Ladder use", es: "Uso de escaleras" },
  keys: { en: "Keys and access", es: "Llaves y acceso" },
};
const PROPERTY_PERSON = "u-staff-5";

// ---- the list ---------------------------------------------------------------------------------
// In the order the screens staff use in October come first (Step 278): the training catalog and Who
// needs it, Assign training, sessions and their roster, trainer sign-off, the training matrix and the
// time report, Issue property, Issue PPE and Waiting for signatures, People and a person's HR folder,
// Help itself; then every other entry, in the guide's order.
const SHOTS = [
  // The screens staff use in October first, in the order Step 278 names them.
  { name: "training-catalog", entry: "Read and change the training catalog",
    open: "training/catalog", ready: "[data-catalog-category]" },
  { name: "training-topic-add", entry: "Read and change the training catalog",
    open: "training/catalog", ready: "[data-topic-add]",
    act: async (c) => { await click(c, "[data-topic-add]"); await until(c, '[data-topic-field="key"] input'); } },
  { name: "training-who-needs-it", entry: "Say who needs a training topic",
    open: "training/catalog", ready: "[data-training-catalog] table tbody tr",
    act: async (c) => {
      await row(c, "[data-training-catalog] table tbody tr", TOPIC.spill);
      await click(c, '[data-topic-tab="who"]');
      await until(c, "[data-topic-who]");
      await click(c, "[data-who-edit]");
      await until(c, "[data-topic-who-form]");
    } },
  { name: "training-assign", entry: "Assign training to people",
    open: "training/catalog", ready: "[data-assign-training]",
    act: async (c) => {
      await click(c, "[data-assign-training]");
      await until(c, "[data-assign-window]");
      for (const id of ["tp-1", "tp-4"]) await c.page.locator('[data-assign-topic="' + id + '"] input').check();
      for (const id of ["u-staff-5", "u-staff-7"]) await c.page.locator('[data-assign-person="' + id + '"] input').check();
    } },
  { name: "training-sessions", entry: "Run a training session people sign on their phones",
    open: "training/sessions", ready: "[data-training-sessions] tbody tr" },
  { name: "training-session-page", entry: "Run a training session people sign on their phones",
    open: "training/sessions", ready: "[data-training-sessions] tbody tr",
    act: async (c) => {
      await click(c, "[data-training-sessions] tbody tr");
      await until(c, "[data-session-signin]");
      await c.page.waitForFunction(() => { const i = document.querySelector("[data-session-qr]"); return !!(i && i.complete && i.naturalWidth > 0); }, null, { timeout: 8000 });
    } },
  { name: "training-log-session", entry: "Log training for several people at once",
    open: "hr/training", ready: "[data-training-views]",
    act: async (c) => {
      await press(c, "Log training for several people");
      await c.page.locator('[data-session-field="topicId"] select option[value="tp-1"]').waitFor({ state: "attached" });
      await c.page.locator('[data-session-field="topicId"] select').selectOption("tp-1");
      await pickIn(c, '[data-session-field="trainerId"]', seed.PEOPLE.supervisor.id);
      for (const id of ["u-staff-5", "u-staff-6", "u-staff-7"]) await c.page.locator('[data-session-person="' + id + '"] input').check();
      await show(c, '[data-session-field="topicId"]');
    } },
  { name: "training-gaps-sessions", entry: "Print a training attendance sheet",
    open: "training/gaps", ready: "[data-gaps-person]",
    act: async (c) => { await c.page.locator("[data-gaps-topics] tbody tr").first().click(); await until(c, "[data-gaps-session]"); await show(c, "[data-gaps-session]"); } },
  { name: "training-awaiting", entry: "Sign off training after a demonstration",
    open: "training/awaiting", ready: "[data-training-awaiting] tbody tr" },
  { name: "training-signoff-window", entry: "Sign off training after a demonstration",
    open: "training/awaiting", ready: '[data-signoff-open="at-1"]',
    act: async (c) => {
      await click(c, '[data-signoff-open="at-1"]');
      await until(c, "[data-signoff-window]");
      await sign(c);
      await c.page.locator("[data-signoff-watched]").check();
      await c.page.locator("[data-signoff-note]").fill(c.lang === "es" ? "Contuvo un derrame con almohadillas en el muelle." : "Contained a spill with pads at the dock.");
    } },
  { name: "training-matrix", entry: "Show the assessor who is trained",
    open: "training/matrix", ready: "[data-matrix-cell]" },
  { name: "training-matrix-cell", entry: "Show the assessor who is trained",
    open: "training/matrix", ready: "[data-matrix-cell]",
    act: async (c) => { await click(c, '[data-matrix-cell-person="u-staff-6"][data-matrix-per-site]'); await until(c, "[data-matrix-detail] [data-matrix-site]"); } },
  { name: "training-time", entry: "Pay phone training time",
    open: "training/time", ready: "[data-time-total]" },
  { name: "property-list", entry: "Issue company property and mark it returned",
    open: "hr/" + PROPERTY_PERSON, ready: "[data-person-property] [data-property-row]",
    act: async (c) => { await show(c, "[data-person-property]"); } },
  { name: "property-issue-window", entry: "Issue company property and mark it returned",
    open: "hr/" + PROPERTY_PERSON, ready: "[data-property-issue]",
    act: async (c) => {
      await click(c, "[data-property-issue]");
      await click(c, '[data-property-kind="uniform_shirt"]');
      await c.page.locator('[data-property-field="size"]').fill("M");
    } },
  { name: "ppe-issue-window", entry: "Issue PPE to someone",
    open: "hr/" + PROPERTY_PERSON, ready: "[data-ppe-issues]",
    act: async (c) => { await c.page.locator("[data-ppe-issues]").getByRole("button", { name: c.say("Issue PPE") }).click(); await until(c, "[data-ppe-window]"); } },
  { name: "signature-send-to-phone", entry: "Send something to a person's phone to sign",
    open: "hr/" + PROPERTY_PERSON, ready: "[data-property-issue]",
    act: async (c) => {
      await click(c, "[data-property-issue]");
      await until(c, "[data-who-signs-field]");
      await click(c, '[data-property-kind="key"]');
      await c.page.locator('[data-property-field="siteId"]').selectOption("s-2");
      await show(c, "[data-who-signs-field]");
    } },
  { name: "signatures-waiting", entry: "See what is waiting for a signature",
    open: "hr/signatures", ready: "[data-signature-requests] table tbody tr" },
  { name: "signatures-request-window", entry: "See what is waiting for a signature",
    open: "hr/signatures/sr-1", ready: '[data-signature-request-window="sr-1"] [data-signature-state]' },
  { name: "hr-folder-add-document", entry: "Add an HR document for an employee",
    open: "hr/" + PROPERTY_PERSON, ready: "[data-person-property]",
    act: async (c) => { await press(c, "+ Add Document"); await until(c, 'input[type="file"]'); } },
  { name: "hr-folder-add-training", entry: "Add a training record",
    open: "hr/" + PROPERTY_PERSON, ready: "[data-person-property]",
    act: async (c) => { await press(c, "+ Add Training"); await wait(300); } },
  { name: "hr-onboarding", entry: "Set up and check off an onboarding checklist",
    open: "hr", ready: '[data-hr-tab="onboarding"]',
    act: async (c) => {
      await click(c, '[data-hr-tab="onboarding"]');
      await pickIn(c, "body", PROPERTY_PERSON, "Tomasz");
      await until(c, 'button:has-text("' + c.say("+ Custom Step") + '")');
    } },
  { name: "staff-add-window", entry: "Add a staff member",
    open: "staff", ready: "table tbody tr",
    act: async (c) => { await press(c, "Add Staff"); await wait(300); } },
  { name: "staff-profile-edit", entry: "Edit a staff member's information",
    open: "staff/" + PROPERTY_PERSON, ready: '[data-employment-action]',
    act: async (c) => { await press(c, "Edit"); await show(c, 'button:has-text("' + c.say("Save Changes") + '")'); } },
  { name: "help-answer", entry: "Ask Help a question from the dashboard",
    open: "help", ready: "textarea",
    act: async (c) => {
      c.stubs.setAgentStream({ pieces: [HELP_ANSWER[c.lang]], done: { citedDocs: ["APP-DASHBOARD"], messageId: "am-shots-1" } });
      await c.page.locator("textarea").first().fill(HELP_QUESTION[c.lang]);
      await c.page.locator('button[aria-label="' + c.say("Send") + '"]').first().click();
      await c.page.getByText(c.say("Was this helpful?")).first().waitFor();
      await until(c, "[data-help-picture] img");
    } },
  // The same answer's picture open full screen, with its entry's title under it and Close (Step 278).
  { name: "help-picture-open", entry: "Ask Help a question from the dashboard",
    open: "help", ready: "textarea",
    act: async (c) => {
      c.stubs.setAgentStream({ pieces: [HELP_ANSWER[c.lang]], done: { citedDocs: ["APP-DASHBOARD"], messageId: "am-shots-2" } });
      await c.page.locator("textarea").first().fill(HELP_QUESTION[c.lang]);
      await c.page.locator('button[aria-label="' + c.say("Send") + '"]').first().click();
      await until(c, "[data-help-picture] img");
      await click(c, "[data-help-picture]");
      await until(c, "[data-help-picture-open] img");
    } },
  // Every other entry, in the guide's order.
  { name: "sign-in-card", entry: "Sign in to the admin dashboard", as: "signedOut",
    open: "overview", ready: "input[type=password]",
    act: async (c) => {
      await c.page.locator("input").nth(0).fill(seed.PEOPLE.admin.login.phone);
      await c.page.locator("input[type=password]").fill(seed.PEOPLE.admin.login.pin);
    } },
  // Step 284: Choose your PIN, drawn for a person still on the PIN the office gave, the new PIN typed.
  { name: "choose-your-pin", entry: "Sign in to the admin dashboard", as: "pin",
    open: "overview", ready: "input[type=password]",
    act: async (c) => {
      await c.page.locator("input").nth(0).fill(seed.PEOPLE.admin.login.phone);
      await c.page.locator("input[type=password]").fill(seed.PEOPLE.admin.login.pin);
      await c.page.locator("[data-signin-submit]").click();
      await until(c, "[data-choose-pin]");
      await c.page.locator("[data-choose-pin-new]").fill("4826");
    } },
  { name: "user-menu-sign-out", entry: "Sign out of the dashboard",
    open: "overview", ready: SHELL,
    act: async (c) => { await userMenu(c); await btn(c, "Sign Out").hover(); } },
  { name: "user-menu-text-size", entry: "Make the text bigger",
    open: "overview", ready: SHELL,
    act: async (c) => {
      await userMenu(c);
      await c.page.locator('button[title="' + c.say("Large") + '"]').first().click();
      if (!(await c.page.locator("button[aria-pressed]").count())) await userMenu(c);
    } },
  { name: "user-menu-language", entry: "Switch the dashboard to Spanish or English",
    open: "overview", ready: SHELL,
    act: async (c) => { await userMenu(c); await c.page.locator('button[title="Espa\u00f1ol"]').first().hover(); } },
  { name: "search-pages", entry: "Find a page",
    open: "overview", ready: SHELL,
    act: async (c) => {
      await c.page.locator('input[placeholder="' + c.say("Search pages") + '"]').fill(c.say("Schedule").slice(0, 5).toLowerCase());
      await wait(300);
    } },
  { name: "notifications-panel", entry: "See your notifications",
    open: "overview", ready: SHELL,
    act: async (c) => { await click(c, 'button[title="' + c.say("Notifications") + '"]'); await until(c, "div[role=dialog]"); } },
  { name: "settings-who-gets-told", entry: "Change who gets told about reports and requests",
    open: "settings", ready: SHELL,
    act: async (c) => {
      await press(c, "Who gets told");
      const field = c.page.locator("button[data-person-pick-field][aria-label^='" + c.say("Add a person to {0}").split("{0}")[0] + "']").first();
      await field.waitFor();
      await field.click();
      await field.locator("xpath=..").locator('[data-person-pick-option="' + seed.PEOPLE.capability.id + '"]').click();
    } },
  { name: "staff-pending", entry: "Approve a new employee's registration",
    open: "staff", ready: "table tbody tr",
    act: async (c) => {
      await press(c, "Pending|people"); await until(c, "table tbody tr");
      // The Spanish headings make the table wider than the window, so it is scrolled to the row's Approve.
      await show(c, "table tbody tr button:has-text('" + c.say("Approve") + "')");
    } },
  // Step 284: each person's sign-in under their status, one locked with Unlock.
  { name: "staff-sign-in", entry: "See whether a person can sign in, and unlock them",
    open: "staff", ready: '[data-staff-unlock="u-staff-5"]',
    act: async (c) => { await until(c, '[data-sign-in-state*="welcome"]'); await top(c, '[data-staff-unlock="u-staff-5"]', 260); } },
  // Step 293: the welcome email, from Add Staff's window and from a profile.
  { name: "staff-added-welcome", entry: "Add a staff member",
    open: "staff", ready: "table tbody tr",
    act: async (c) => {
      await press(c, "Add Staff"); await until(c, MODAL);
      const inputs = inModal(c).locator("input");
      await inputs.nth(0).fill("Imani"); await inputs.nth(1).fill("Castellanos");
      await inputs.nth(2).fill("2155550199"); await inputs.nth(3).fill("imani.castellanos@example.invalid");
      await inModal(c).getByRole("button", { name: c.say("Add Staff") }).click();
      await until(c, "[data-added-welcome]");
    } },
  { name: "staff-welcome-email", entry: "Send a welcome email",
    open: "staff/u-staff-6", ready: "[data-welcome-send]" },
  { name: "staff-welcome-no-email", entry: "Send a welcome email",
    open: "staff/u-staff-9", ready: "[data-welcome-no-email]" },
  { name: "staff-reset-pin", entry: "Reset a staff member's PIN",
    open: "staff/u-staff-6", ready: "text=Ngozi Okonkwo",
    act: async (c) => { await press(c, "Reset PIN"); await until(c, MODAL); await inModal(c).locator("input").first().fill("4827"); } },
  { name: "staff-employment-card", entry: "Deactivate or reactivate a staff member",
    open: "staff/u-staff-5", ready: "[data-employment-action]" },
  { name: "staff-assignments", entry: "Assign a staff member to a site",
    open: "staff/u-staff-6/assign", ready: "text=Ngozi Okonkwo",
    act: async (c) => { await wait(400); await exact(c, "Assign").click(); await until(c, MODAL); await choose(c, seed.SITES[2].name); } },
  // Step 291: Certifications live in the person's HR Records folder.
  { name: "hr-folder-add-certification", entry: "Add a certification to a staff member",
    open: "hr/u-staff-6", ready: "[data-folder-certifications]",
    act: async (c) => {
      await click(c, "[data-folder-certification-add]"); await until(c, MODAL);
      await inModal(c).locator("input").first().fill(c.lang === "es" ? "Cuidado de pisos" : "Floor care basics");
    } },
  { name: "cases-case-window", entry: "Respond to a Speak Up case",
    open: "cases", ready: "table tbody tr",
    act: async (c) => { await click(c, "table tbody tr"); await until(c, "[data-case-log-entry]"); await top(c, "[data-case-log]", 160); } },
  { name: "cases-closing-note", entry: "Respond to a Speak Up case",
    open: "cases", ready: "table tbody tr",
    act: async (c) => {
      await click(c, "table tbody tr"); await until(c, "[data-case-log-entry]");
      await c.page.locator("[data-case-status]").selectOption("resolved");
      await typeIn(c, "[data-case-closing-note]", "Cover was added to the overnight shift and the person who raised it was told.", "Se agreg\u00f3 cobertura al turno de noche y se le avis\u00f3 a quien lo plante\u00f3.");
      await top(c, "[data-case-status]", 200);
    } },
  { name: "cases-add-update", entry: "Add to a case as it goes",
    open: "cases", ready: "table tbody tr",
    act: async (c) => {
      await click(c, "table tbody tr"); await until(c, "[data-case-update]");
      await c.page.locator("[data-case-update-kind]").selectOption("conversation");
      await pickIn(c, "[data-case-update]", "u-staff-6", "Okonkwo");
      await typeIn(c, "[data-case-update-body]", "Went over the overnight rota with them at the start of the shift.", "Revis\u00f3 con la persona el turno de noche al empezar el turno.");
      await c.page.locator("[data-case-update-files]").setInputFiles({ name: "rota-meeting.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n", "latin1") });
      await until(c, "[data-case-update-file]");
      await blur(c);
      await top(c, "[data-case-update]", 20);
    } },
  { name: "cases-correct-entry", entry: "Correct an entry in a case log",
    open: "cases", ready: "table tbody tr",
    act: async (c) => {
      await click(c, "table tbody tr"); await until(c, "[data-case-log-entry]");
      await click(c, '[data-case-log-entry="cu-1"] [data-case-log-correct]');
      await until(c, '[data-case-update-correcting="cu-1"]');
      await typeIn(c, "[data-case-update-body]", "The rota was read on the second day of the week.", "El turno se ley\u00f3 el segundo d\u00eda de la semana.");
      await blur(c);
      await top(c, "[data-case-update]", 20);
    } },
  { name: "cases-print", entry: "Print a case",
    open: "cases", ready: "table tbody tr",
    act: async (c) => {
      await click(c, "table tbody tr"); await until(c, "[data-case-print]");
      await click(c, "[data-case-print]");
      let html = "";
      for (let i = 0; i < 40 && !html; i++) { await wait(100); const p = await c.d.prints(); html = p.length ? p[p.length - 1].html : ""; }
      if (!html) throw new Error("Print case opened no page");
      await c.page.setContent(html);
    } },
  { name: "issues-issue-window", entry: "Review a reported problem and assign it",
    open: "issues", ready: "[data-issue-row]",
    act: async (c) => { await click(c, '[data-issue-row="i-1"]'); await until(c, "[data-issue-status]"); } },
  { name: "issues-assign-task", entry: "Review a reported problem and assign it",
    open: "issues", ready: "[data-issue-row]",
    act: async (c) => {
      await click(c, '[data-issue-row="i-1"]'); await until(c, "[data-issue-status]");
      await press(c, "Assign as Task", MODAL); await until(c, MODAL);
      await choose(c, "Tomasz Wisniewski");
    } },
  { name: "tasks-create", entry: "Create a task for a staff member",
    open: "assigned", ready: SHELL,
    act: async (c) => {
      await until(c, "text=" + TASK[c.lang]);
      await press(c, "Create Task"); await until(c, MODAL);
      await choose(c, seed.SITES[0].name);
      await inModal(c).locator("input").first().fill(c.lang === "es" ? "Limpiar las persianas de la sala de juntas" : "Clean the conference room blinds");
    } },
  { name: "tasks-reassign", entry: "Reassign a task",
    open: "assigned", ready: SHELL,
    act: async (c) => {
      await c.page.getByText(TASK[c.lang]).first().click(); await until(c, MODAL);
      await press(c, "Reassign", MODAL);
      await until(c, "text=" + c.say("Reassign Task"));
      await choose(c, "Elena Barbosa");
      await inModal(c).locator("textarea").first().fill(c.lang === "es" ? "Tomasz cubre otro sitio esta noche." : "Tomasz is covering another site tonight.");
    } },
  { name: "schedule-shift-window", entry: "Schedule a shift",
    open: "schedule", ready: "text=Tomasz Wisniewski",
    act: async (c) => {
      await press(c, "Schedule Shift"); await until(c, MODAL);
      await choose(c, "Elena Barbosa");
      await choose(c, seed.SITES[0].name);
      const times = inModal(c).locator("input[type=time]");
      await times.nth(0).fill("18:00"); await times.nth(1).fill("23:00");
      await blur(c);
    } },
  { name: "schedule-repeat", entry: "Schedule a shift that repeats",
    open: "schedule", ready: "text=Tomasz Wisniewski",
    act: async (c) => {
      await press(c, "Schedule Shift"); await until(c, MODAL);
      await choose(c, "Elena Barbosa");
      await choose(c, seed.SITES[0].name);
      const times = inModal(c).locator("input[type=time]");
      await times.nth(0).fill("18:00"); await times.nth(1).fill("23:00");
      await c.d.toggleSwitch(c.say("Repeat this shift"));
      for (const d of ["Mon", "Wed", "Fri"]) await exact(c, d, MODAL).click();
      await show(c, MODAL + " >> text=" + c.say("Repeat on"));
      await inModal(c).getByRole("button", { name: c.say("Schedule All") }).scrollIntoViewIfNeeded();
    } },
  { name: "schedule-pattern-window", entry: "See or change a weekly pattern",
    open: "schedule", ready: "text=Tomasz Wisniewski",
    act: async (c) => {
      await press(c, "Patterns"); await until(c, "table tbody tr");
      await row(c, "table tbody tr", "Ngozi Okonkwo"); await until(c, MODAL);
      await until(c, MODAL + " >> text=" + c.say("Changes start on"));
    } },
  { name: "schedule-pattern-end", entry: "End a weekly pattern",
    open: "schedule", ready: "text=Tomasz Wisniewski",
    act: async (c) => {
      await press(c, "Patterns"); await until(c, "table tbody tr"); await click(c, "table tbody tr"); await until(c, MODAL);
      // The first End pattern only asks; the window then holds the confirm.
      await press(c, "End pattern", MODAL);
      await show(c, MODAL + " button[aria-label='" + c.say("Confirm ending this pattern") + "']");
    } },
  { name: "schedule-edit-shift", entry: "Change or cancel a scheduled shift",
    open: "schedule", ready: "text=Tomasz Wisniewski",
    act: async (c) => {
      await c.page.locator("button").filter({ hasText: "18:00-02:00" }).filter({ hasText: "North Wing" }).first().click();
      await until(c, MODAL);
    } },
  { name: "pickup-requests", entry: "Approve or deny a request to drop a shift",
    open: "marketplace", ready: SHELL,
    act: async (c) => { await wait(600); await press(c, "Requests"); await until(c, "table tbody tr"); } },
  { name: "pickup-post-open-shift", entry: "Post an open shift for staff to claim",
    open: "marketplace", ready: SHELL,
    act: async (c) => {
      await wait(400); await press(c, "Post Open Shift"); await until(c, MODAL); await choose(c, seed.SITES[1].name);
      await inModal(c).locator("input[type=date]").first().fill(seed.shift(4));
      const times = inModal(c).locator("input[type=time]");
      await times.nth(0).fill("06:00"); await times.nth(1).fill("14:00");
      await blur(c);
    } },
  { name: "pickup-claimed", entry: "Approve a shift someone claimed",
    open: "marketplace", ready: SHELL,
    act: async (c) => { await wait(600); await press(c, "Claimed|shift"); await until(c, "table tbody tr"); } },
  // Step 282: the three-item request the stub lists first, its first item at 3 of 5 and a note for a
  // denial typed on the second, and the list with Download for ordering (CSV) over it.
  { name: "supplies-request-approve", entry: "Approve or deny a supply request",
    open: "supplies", ready: SHELL,
    act: async (c) => {
      await wait(400); await click(c, '[data-supplies-tab="requests"]'); await until(c, '[data-request-open="sr-4"]');
      await click(c, '[data-request-open="sr-4"]'); await until(c, '[data-request-window="sr-4"]');
      await c.page.locator('[data-request-line="sr-4-1"] [data-request-line-qty]').fill("3");
      await c.page.locator('[data-request-line="sr-4-2"] [data-request-line-note]').fill(c.lang === "es" ? "Use el jab\u00f3n que ya est\u00e1 en el sitio." : "Use the soap already at the site.");
    } },
  { name: "supplies-request-list", entry: "Approve or deny a supply request",
    open: "supplies", ready: SHELL,
    act: async (c) => { await wait(400); await click(c, '[data-supplies-tab="requests"]'); await until(c, "[data-ordering-download]"); await until(c, '[data-request-open="sr-4"]'); } },
  { name: "supplies-add-supply", entry: "Add a supply to the inventory",
    open: "supplies", ready: SHELL,
    act: async (c) => {
      await wait(400); await press(c, "Add Supply"); await until(c, MODAL);
      await inModal(c).locator("input").first().fill(c.lang === "es" ? "Limpiador de acero inoxidable" : "Stainless steel cleaner");
    } },
  { name: "inspections-schedule", entry: "Schedule an inspection",
    open: "inspections", ready: SHELL,
    act: async (c) => {
      await wait(400); await press(c, "Scheduled|inspections"); await press(c, "Schedule Inspection"); await until(c, MODAL);
      await choose(c, "Monthly quality walk"); await choose(c, seed.SITES[1].name); await choose(c, "Marcus Ferreira");
      await inModal(c).locator("input[type=date]").first().fill(seed.shift(7));
      await blur(c);
    } },
  { name: "inspections-new-template", entry: "Create an inspection template",
    open: "inspections", ready: SHELL,
    act: async (c) => {
      await wait(400); await press(c, "New Template"); await until(c, MODAL);
      await inModal(c).locator("input").first().fill(c.lang === "es" ? "Auditor\u00eda trimestral de oficinas" : "Quarterly office audit");
      await choose(c, c.say("Audit inspection"));
    } },
  { name: "live-ops", entry: "See who has started a shift today",
    open: "operations", ready: SHELL, act: async (c) => { await wait(800); } },
  { name: "messages-private-chat", entry: "Message a staff member",
    open: "chat/dm-1", ready: SHELL,
    act: async (c) => { await c.page.locator('input[placeholder="' + c.say("Type a message") + '"]').fill(c.lang === "es" ? "Gracias, buen trabajo esta noche." : "Thanks, good work tonight."); } },
  { name: "reports-library", entry: "Run a report",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => { await c.page.getByText("Issue response and resolution").first().evaluate((el) => el.scrollIntoView({ block: "center" })); } },
  { name: "reports-issue-report", entry: "Run a report",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => {
      await until(c, "text=Issue response and resolution");
      if (!(await c.d.clickRunFor("Issue response and resolution"))) throw new Error("the issue report would not run");
      await until(c, "text=" + c.say("Export PDF"));
      await wait(500);
    } },
  { name: "sites-add-site", entry: "Add a site or change its details",
    open: "sites", ready: "table tbody tr",
    act: async (c) => {
      await press(c, "Add Site"); await until(c, MODAL);
      const f = inModal(c).locator("input");
      await f.nth(0).fill("Northgate Office Park"); await f.nth(1).fill("77 Mill Pond Road"); await f.nth(2).fill("Fairhaven");
    } },
  // The stub's picture part gives Riverbend Logistics Hub its contract reference and service lines.
  { name: "sites-edit-details", entry: "Add a site or change its details",
    open: "sites/" + seed.SITES[2].id, ready: "[data-site-contract-reference]",
    act: async (c) => {
      await press(c, "Edit Details"); await until(c, MODAL);
      const lines = inModal(c).locator("div[role=group]");
      await lines.locator("label").filter({ hasText: c.say("Disinfection|service line") }).locator("input").check();
      await lines.evaluate((el) => el.scrollIntoView({ block: "end" }));
    } },
  { name: "settings-permissions-person", entry: "Give one person a permission",
    open: "settings", ready: SHELL,
    act: async (c) => { await press(c, "Roles and Permissions"); await wait(500); await choose(c, "Tomasz Wisniewski"); await wait(600); } },
  { name: "settings-role-reference", entry: "See what each role can do, or print it",
    open: "settings", ready: SHELL,
    act: async (c) => { await press(c, "Roles and Permissions"); await press(c, "Role reference"); await wait(400); } },
  { name: "theme-button", entry: "Switch between light and dark",
    open: "overview", ready: SHELL,
    act: async (c) => { await btn(c, "Dark Mode").hover(); } },
  { name: "time-off-request", entry: "Approve or deny a time off request",
    open: "schedule", ready: "text=Tomasz Wisniewski",
    act: async (c) => {
      await press(c, "Time off"); await until(c, "table tbody tr");
      // Step 291: the PTO request the API's Step 289 brings.
      await row(c, "table tbody tr", "Bertrand Lefevre"); await until(c, MODAL);
    } },
  { name: "time-off-all", entry: "See past time off requests",
    open: "schedule", ready: "text=Tomasz Wisniewski",
    act: async (c) => { await press(c, "Time off"); await until(c, "table tbody tr"); await press(c, "All|requests"); await wait(500); } },
  { name: "complaint-what-was-done", entry: "Write what was done and close a customer complaint",
    open: report("fr-p-009"), ready: '[data-question="complaint_closed"]',
    act: async (c) => {
      await asked(c, "What was found", "Lo que se encontr\u00f3").fill(inLang(c, "Sink and counters wiped but the drain area and the fridge handles were missed.", "Se limpiaron el fregadero y la encimera, pero se olvidaron el desag\u00fce y las manijas del refrigerador."));
      await asked(c, "What caused it?", "\u00bfQu\u00e9 lo caus\u00f3?").selectOption("training");
      await blur(c);
      await toTop(c, 'textarea[aria-label="' + inLang(c, "What was found", "Lo que se encontr\u00f3") + '"]', 110);
    } },
  { name: "staff-badge-column", entry: "Find a staff member's badge number",
    open: "staff", ready: "table tbody tr" },
  // The inactive person has no badge number, so the profile reads Not set beside Generate badge number.
  { name: "staff-badge-not-set", entry: "Find a staff member's badge number",
    open: "staff/u-staff-12", ready: "[data-employment]",
    act: async (c) => { await c.page.mouse.move(700, 500); await c.page.mouse.wheel(0, 330); await wait(400); } },
  { name: "safety-inspection-verify", entry: "Verify and sign a safety inspection",
    open: report("fr-p-015"), ready: '[data-question="field_lead_reviewed"]',
    act: async (c) => { await toTop(c, STILL(c), 40); } },
  { name: "corrective-action-desk", entry: "Move a corrective action forward and close it",
    open: report("fr-p-010"), ready: '[data-question="closed"]',
    act: async (c) => { await toTop(c, STILL(c), 40); } },
  { name: "environmental-audit-verify", entry: "Verify and sign an environmental audit",
    open: report("fr-p-027"), ready: '[data-question="field_lead_reviewed"]',
    act: async (c) => {
      await asked(c, "Was the executive team told of any severity A finding?", "\u00bfSe inform\u00f3 al equipo ejecutivo de alg\u00fan hallazgo de gravedad A?").selectOption("yes");
      await toTop(c, STILL(c), 40);
    } },
  { name: "ppe-hazard-approve", entry: "Approve a PPE hazard assessment",
    open: report("fr-p-032"), ready: '[data-question="approved"]',
    act: async (c) => {
      await asked(c, "Date of the next scheduled reassessment", "Fecha de la pr\u00f3xima reevaluaci\u00f3n programada").fill("2027-03-10");
      await blur(c);
      await toTop(c, STILL(c), 40);
    } },
  { name: "committee-minutes-confirm", entry: "Confirm safety committee minutes",
    open: report("fr-p-036"), ready: '[data-question="confirmed_by_chair"]',
    act: async (c) => {
      await asked(c, "Confirmed at the meeting of", "Confirmada en la reuni\u00f3n del").fill("2026-03-17");
      await blur(c);
      await toTop(c, STILL(c), 40);
    } },
  { name: "filed-forms-list", entry: "Read a filed report",
    open: "forms", ready: "table tbody tr" },
  { name: "filed-report-window", entry: "Read a filed report",
    open: report("cf-1"), ready: "img[data-signature-image]" },
  { name: "filed-report-sign-box", entry: "Sign off on a filed report",
    open: report("cf-2"), ready: '[data-question="reviewed_by"]',
    act: async (c) => { await signBox(c, "reviewed_by"); } },
  { name: "daily-log-review", entry: "Review and sign a daily service log or a monthly PPE check",
    open: report("fr-p-005"), ready: '[data-question="site_supervisor_review"]',
    act: async (c) => { await signBox(c, "site_supervisor_review"); } },
  { name: "ppe-check-review", entry: "Review and sign a daily service log or a monthly PPE check",
    open: report("fr-p-019"), ready: '[data-question="field_lead_review"]',
    act: async (c) => { await signBox(c, "field_lead_review"); } },
  { name: "filed-report-supervisor-section", entry: "Fill in the supervisor section of a filed form",
    open: report("cf-1"), ready: '[data-question="received_by"]',
    act: async (c) => { await show(c, '[data-question="received_by"]'); } },
  { name: "jotform-maintenance", entry: "Sync the forms and their submissions from Jotform",
    open: "forms", ready: "table tbody tr",
    act: async (c) => { await press(c, "Jotform"); await press(c, "Maintenance"); await until(c, 'button[aria-pressed="true"]'); await wait(600); } },
  { name: "jotform-inbox", entry: "Find the Jotform tools",
    open: "forms", ready: "table tbody tr",
    act: async (c) => { await press(c, "Jotform"); await until(c, 'button[aria-pressed="true"]'); await wait(600); } },
  { name: "pdf-access-log", entry: "Read the PDF access log",
    open: "forms", ready: "table tbody tr",
    act: async (c) => { await press(c, "PDF access log"); await wait(800); } },
  { name: "start-form-site", entry: "Start and file a form from the dashboard",
    open: "forms", ready: "table tbody tr",
    act: async (c) => { await startForm(c, CALLS); } },
  { name: "start-form-window", entry: "Start and file a form from the dashboard",
    open: "forms", ready: "table tbody tr",
    act: async (c) => { await startForm(c, CALLS, { en: "Riverbend Logistics Hub", es: "Riverbend Logistics Hub" }); } },
  { name: "unfinished-forms", entry: "Continue an unfinished form",
    open: "forms", ready: "table tbody tr",
    act: async (c) => { await press(c, "Unfinished"); await until(c, "table tbody tr"); await wait(500); } },
  // The first site already has the first form's link on, so Make a link opens that one's QR window
  // and makes nothing new.
  { name: "customer-link-qr", entry: "Make a customer link and print its QR code",
    open: "forms/links", ready: "[data-make-link]",
    act: async (c) => { await press(c, "Make a link", "[data-make-link]"); await until(c, "[data-qr-screen]"); } },
  { name: "customer-links-table", entry: "Turn a customer link off or on",
    open: "forms/links", ready: "[data-customer-link]",
    act: async (c) => { await c.page.mouse.move(700, 600); await c.page.mouse.wheel(0, 330); await wait(400); } },
  { name: "customer-filing-survey", entry: "Read a customer's filing",
    open: report("cf-2"), ready: "[data-computed]",
    act: async (c) => { await show(c, "[data-computed]"); } },
  { name: "site-assessment-sign", entry: "Review and sign a site assessment",
    open: report("fr-p-004"), ready: '[data-question="field_lead_reviewed"]',
    act: async (c) => {
      await asked(c, "Anything to correct before the labor calculation", "Algo que corregir antes del c\u00e1lculo de mano de obra").fill(inLang(c, "Corridor area is 9,800 square feet, not 9,200.", "El pasillo mide 9,800 pies cuadrados, no 9,200."));
      await blur(c);
      await show(c, '[data-question="field_lead_reviewed"]');
    } },
  { name: "change-of-service-desk", entry: "Move a change of service request through approval and close it",
    open: report("fr-p-014"), ready: '[data-question="approved"]',
    act: async (c) => { await toTop(c, 'input[aria-label="' + inLang(c, "Labor hours added or removed per week", "Horas de trabajo agregadas o quitadas por semana") + '"]', 130); } },
  { name: "orientation-file", entry: "File an orientation in the personnel file",
    open: report("fr-p-034"), ready: '[data-question="filed_in_personnel_file"]',
    act: async (c) => { await signBox(c, "filed_in_personnel_file"); } },
  { name: "call-intake-close", entry: "Follow up a customer contact and close it",
    open: report("fr-p-013"), ready: '[data-question="closed"]',
    act: async (c) => { await show(c, '[data-question="closed"]'); } },
  // Next saves the first section to the picture stub's own draft and opens Ratings.
  { name: "performance-review-ratings", entry: "Fill in a performance review with the employee",
    open: "forms", ready: "table tbody tr",
    act: async (c) => {
      await startForm(c, REVIEW, { en: "Harbor Point Center", es: "Harbor Point Center" });
      await press(c, "Next", "[data-form-window]");
      await until(c, "[data-form-window] table");
      const pick = c.page.locator("[data-form-window] table select");
      await pick.nth(0).selectOption("meets");
      await pick.nth(1).selectOption("exceeds");
      await pick.nth(2).selectOption("meets");
      await pick.nth(6).selectOption("needs_improvement");
      await c.page.locator('[data-form-window] table input[type="text"], [data-form-window] table input:not([type])').nth(6).fill(inLang(c, "Left the floor machine uncharged twice.", "Dej\u00f3 la m\u00e1quina de pisos sin cargar dos veces."));
      await blur(c);
      await wait(300);
    } },
  { name: "performance-review-file", entry: "File a performance review in the personnel file",
    open: report("fr-p-012"), ready: '[data-question="filed_in_personnel_file"]',
    act: async (c) => { await signBox(c, "filed_in_personnel_file"); } },
  { name: "filed-report-void", entry: "Void a report filed in error",
    open: report("cf-2"), ready: '[data-question="reviewed_by"]',
    act: async (c) => {
      await press(c, "Void", MODAL);
      await until(c, "[data-void-window]");
      await c.page.locator("[data-void-window] textarea").fill(inLang(c, "Filed twice by mistake.", "Se present\u00f3 dos veces por error."));
      await show(c, "[data-void-window]");
    } },
  { name: "announcement-new", entry: "Send an announcement to staff phones",
    open: "announcements", ready: "[data-announcement]",
    act: async (c) => {
      await c.page.getByLabel(c.say("Title"), { exact: true }).fill(inLang(c, "Lobby closed Friday night", "Vest\u00edbulo cerrado el viernes"));
      await c.page.getByLabel(c.say("Message"), { exact: true }).fill(inLang(c, "The lobby floor is being refinished Friday night. Use the north entry.", "El piso del vest\u00edbulo se renueva el viernes por la noche. Use la entrada norte."));
      await press(c, "One site's people");
      await c.page.getByLabel(c.say("Site"), { exact: true }).selectOption("s-1");
      await wait(600);
    } },
  { name: "my-alerts", entry: "Choose what alerts your phone",
    open: "overview", ready: "[data-nav-item]",
    act: async (c) => { await c.d.openUserMenu(); await press(c, "My alerts"); await until(c, MODAL); } },
  { name: "chat-tag-someone", entry: "Tag someone in a chat",
    open: "chat/ch-1", ready: "[data-nav-item]",
    act: async (c) => { await click(c, 'button[title="' + c.say("Tag someone") + '"]'); await until(c, "[data-tag-picker]"); } },
  { name: "help-insights", entry: "See what people ask Help",
    open: "help-insights", ready: "table tbody tr" },
  { name: "task-spanish-wording", entry: "Correct the Spanish a person sees",
    open: "sites/s-1/tasks", ready: "[data-nav-item]",
    act: async (c) => {
      const edit = c.page.getByRole("button", { name: c.say("Edit"), exact: true }).first();
      await edit.waitFor();
      await edit.click();
      await until(c, MODAL + " textarea");
      await wait(600);
    } },
  { name: "form-builder-draft", entry: "Make a new form with the builder",
    open: "form-builder/5b0e2c4a-7d31-4f8e-9a60-000000000002", ready: "[data-phone-preview]",
    act: async (c) => { await c.page.getByPlaceholder(c.say("Write to the builder")).fill(inLang(c, "Offer it in the staff app, and send the filled report to the site supervisor.", "Ofr\u00e9zcalo en la aplicaci\u00f3n del personal y env\u00ede el reporte lleno al supervisor del sitio.")); } },
  { name: "form-builder-list", entry: "Change an existing form",
    open: "form-builder", ready: "table tbody tr" },
  { name: "form-builder-publish", entry: "Publish or retire a form",
    open: "form-builder/5b0e2c4a-7d31-4f8e-9a60-000000000001", ready: "[data-phone-preview]",
    act: async (c) => {
      await press(c, "Publish");
      await until(c, "[data-publish-window]");
      await c.page.locator("[data-publish-window] textarea").fill(inLang(c, "Asks for a number to call back.", "Pide un n\u00famero para devolver la llamada."));
      await c.page.locator("[data-publish-window] button").last().scrollIntoViewIfNeeded();
    } },
  { name: "form-builder-retire", entry: "Publish or retire a form",
    open: "form-builder", ready: "table tbody tr",
    act: async (c) => {
      await row(c, "table tbody tr", "OCSA-FRM-009");
      await press(c, "Retire form", MODAL);
      await until(c, "[data-retire-window]");
      await c.page.locator("[data-retire-window] textarea").fill(inLang(c, "No longer used at any site.", "Ya no se usa en ning\u00fan sitio."));
    } },
  { name: "client-ratings", entry: "See how clients rated a site",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => { await openReport(c, "Client ratings"); await until(c, "[data-quiet-months]"); await wait(600); await toTop(c, "[data-quiet-months]", 190); } },
  { name: "monthly-reports-list", entry: "Make and send the monthly report to a client",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => { await openReport(c, "Monthly client reports"); await until(c, "table tbody tr"); await wait(400); } },
  { name: "monthly-report-send", entry: "Make and send the monthly report to a client",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => {
      await openReport(c, "Monthly client reports");
      await until(c, "table tbody tr");
      await press(c, "Send to the client");
      await until(c, MODAL + ' input[type="checkbox"]');
    } },
  { name: "site-client-survey", entry: "Set when a site's client gets the satisfaction survey",
    open: "sites/s-2/survey", ready: "[data-survey-schedule]",
    // Add contact only lists the contact; nothing is kept until Save.
    act: async (c) => {
      const box = c.page.locator("[data-survey-schedule]");
      await box.getByLabel(c.say("Name"), { exact: true }).fill("Corvin Ballantyne");
      await box.getByLabel(c.say("Email"), { exact: true }).fill("corvin.ballantyne@example.invalid");
      await press(c, "Add contact", "[data-survey-schedule]");
      await box.getByLabel(c.say("Day of the month"), { exact: true }).selectOption("15");
    } },
  { name: "supplies-removed", entry: "Bring back a removed supply",
    open: "supplies", ready: "[data-supply-card]",
    act: async (c) => { await toTop(c, "text=" + c.say("Removed supplies"), 300); } },
  { name: "shift-names", entry: "Name a site's shifts and their blocks",
    open: "sites/s-1/blocks", ready: "[data-shift-names]",
    act: async (c) => { await toTop(c, "[data-shift-names]", 120); } },
  { name: "shift-names-rename", entry: "Name a site's shifts and their blocks",
    open: "sites/s-1/blocks", ready: "[data-shift-names]",
    act: async (c) => { await press(c, "Rename", "[data-shift-names]"); await until(c, MODAL + " input"); await wait(600); } },
  // Recordable picked, so the six questions under it open; nothing is saved.
  { name: "incident-recordable", entry: "Mark an incident report recordable",
    open: report("fr-p-016"), ready: MODAL + " select",
    act: async (c) => {
      const q = asked(c, "Is this a recordable case?", "\u00bfEs un caso registrable?");
      await q.selectOption("yes");
      await toTop(c, 'select[aria-label="' + inLang(c, "Is this a recordable case?", "\u00bfEs un caso registrable?") + '"]', 80);
    } },
  { name: "injury-log", entry: "Read and export the injury log",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => { await openReport(c, "Injury log"); await until(c, "[data-privacy-case]"); } },
  { name: "annual-summary", entry: "Fill in, certify and export the annual summary",
    open: "reports", ready: "[data-posting-banner]",
    act: async (c) => {
      await openReport(c, "Annual summary");
      await until(c, "[data-injury-totals]");
      await c.page.getByLabel(c.say("Annual average number of employees"), { exact: true }).fill("11");
      await c.page.getByLabel(c.say("Total hours worked by all employees last year"), { exact: true }).fill("21840");
      await c.page.getByLabel(c.say("Company executive"), { exact: true }).fill("Oyelaran Adebayo");
      await c.page.getByLabel(c.say("Title|job"), { exact: true }).fill(inLang(c, "Chief executive", "Director general"));
      await blur(c);
      await toTop(c, "[data-staff-hint]", 260);
    } },
  { name: "quote-new", entry: "Make a quote",
    open: "quotes/new", ready: '[data-quote-step="building"]',
    act: async (c) => {
      await c.page.locator('input[aria-label="' + c.say("Client Name") + '"]').fill("Kestrel Medical Group");
      await c.page.locator('input[aria-label="' + c.say("Contact Name") + '"]').fill("J. Marlowe");
      await c.page.locator('input[aria-label="' + c.say("Contact Email") + '"]').fill("facilities@kestrelmedical.example.invalid");
      await pickLabeled(c, "Site on file", "s-2");
      await c.page.locator('input[aria-label="' + c.say("Contact Email") + '"]').blur();
    } },
  // Q-2026-008 is priced above the national range for an office, so one check is orange.
  { name: "quote-figures-checks", entry: "Read a quote's figures and checks",
    open: "quotes/qt-8", ready: '[data-quote-figures] [data-quote-check="priceRange"]',
    act: async (c) => { await show(c, '[data-quote-check="equipmentTerm"]'); } },
  { name: "quote-send-window", entry: "Send a quote to a client",
    open: "quotes/qt-14", ready: "[data-quote-actions]",
    act: async (c) => {
      await press(c, "Send to the client", "[data-quote-actions]");
      await until(c, "[data-quote-send]");
      await typeIn(c, "[data-quote-send] textarea", "Here is our quote for the medical plaza. We are glad to walk the building with you.", "Le enviamos nuestra cotizaci\u00f3n para el centro m\u00e9dico. Con gusto recorremos el edificio con usted.");
    } },
  { name: "quote-mark-accepted", entry: "Mark a quote accepted or declined",
    open: "quotes/qt-11", ready: "[data-quote-actions]",
    act: async (c) => {
      await press(c, "Mark accepted", "[data-quote-actions]");
      await c.page.getByText(c.say("Mark this quote accepted? Once it is, the quote reads only.")).first().waitFor();
    } },
  { name: "settings-quote-defaults", entry: "Set the quote defaults",
    open: "settings", ready: "button",
    act: async (c) => {
      await c.page.getByRole("button", { name: c.say("Quote defaults"), exact: true }).first().click();
      await until(c, '[data-quote-defaults] [data-quote-step="building"]');
    } },
  { name: "messages-new-window", entry: "Start a message to anyone",
    open: "chat", ready: "[data-direct-messages]",
    act: async (c) => {
      await press(c, "New message");
      await until(c, '[data-new-message-group="staff"]');
    } },
  { name: "messages-direct-chat", entry: "Message another office person directly",
    open: "chat", ready: "[data-direct-chat]",
    act: async (c) => {
      await click(c, "[data-direct-chat]");
      await until(c, 'input[aria-label="' + c.say("Type a message") + '"]');
    } },
  { name: "clearances-person", entry: "Record a person's school clearances",
    open: "hr/u-staff-6/clearances", ready: '[data-person-clearances] [data-clearance="fbi"]' },
  { name: "clearances-add-window", entry: "Record a person's school clearances",
    open: "hr/u-staff-6/clearances", ready: '[data-person-clearances] [data-clearance="act34"]',
    act: async (c) => {
      await press(c, "Add or renew", '[data-clearance="act34"]');
      await until(c, '[data-clearance-window="add"]');
      await c.page.locator('[data-clearance-window="add"] input[type="date"]').fill("2026-03-12");
      await typeIn(c, '[data-clearance-window="add"] textarea', "Renewed early, before the school year starts.", "Renovada antes de tiempo, antes de que empiece el a\u00f1o escolar.");
    } },
  { name: "clearances-correct-window", entry: "Correct a clearance date entered wrongly",
    open: "hr/u-staff-6/clearances", ready: '[data-person-clearances] [data-clearance="fbi"]',
    act: async (c) => {
      await press(c, "Correct a date", '[data-clearance="fbi"]');
      await until(c, '[data-clearance-window="correct"]');
      await c.page.locator('[data-clearance-window="correct"] input[type="date"]').fill("2022-02-01");
      await typeIn(c, '[data-clearance-window="correct"] textarea', "The year was typed as 2021; the certificate says 2022.", "Se escribi\u00f3 el a\u00f1o 2021; el certificado dice 2022.");
    } },
  { name: "clearances-page", entry: "See everyone's clearances and export them for a school",
    open: "clearances", ready: "[data-clearances-page] table tbody tr" },
  // Rehire is pressed: the stub refuses the ticked school site, so nothing is saved, and the shell
  // opens Clearances missing over the window, which is the point of the picture.
  { name: "clearances-missing-window", entry: "When a person's clearances are missing",
    open: "staff/" + LEFT, ready: '[data-employment-action="rehire"]',
    act: async (c) => {
      await openRehire(c);
      await press(c, "Rehire", win("rehire"));
      await until(c, "[data-clearance-missing]");
    } },
  { name: "annual-summary-posting", entry: "Record when the annual summary was posted, and download it for OSHA",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => {
      await c.page.locator("[data-report-group] > div > div").filter({ hasText: c.say("Annual summary") }).getByRole("button", { name: c.say("Open|verb") }).first().click();
      await until(c, "[data-injury-totals]");
      await pickLabeled(c, "Year", String(Number(seed.TODAY.slice(0, 4)) - 1));
      await until(c, "[data-summary-posting]");
      const posted = c.page.locator('[data-summary-posting] input[type="date"]');
      await posted.fill(seed.TODAY.slice(0, 4) + "-02-02");
      await posted.blur();
      await show(c, "[data-summary-posting]");
    } },
  // The catalog and the sites asked about come from the picture stub's forms (audit/pictures-stub.js).
  { name: "form-product-evaluation-site", entry: "File the product and equipment performance evaluation",
    open: "forms", ready: "button",
    act: async (c) => {
      await press(c, "Start a form");
      await row(c, 'div[style*="z-index: 500"] button[role="listitem"]', { en: "Product and Equipment Performance Evaluation", es: "Evaluaci\u00f3n del desempe\u00f1o de productos y equipos" });
      await until(c, '[data-form-site-question] button[role="listitem"]');
    } },
  { name: "site-plan-read", entry: "Read a site's workload plan",
    open: "sites/s-3/plan", ready: '[data-workload-plan="current"] [data-plan-tile]' },
  { name: "site-plan-none", entry: "Make a site's workload plan",
    open: "sites/s-2/plan", ready: '[data-workload-plan="none"] [data-plan-actions]' },
  { name: "site-plan-new-quote", entry: "Make a site's workload plan",
    open: "quotes/new/s-2", ready: '[data-quote-step="building"]' },
  { name: "site-plan-use-saved", entry: "Use a saved quote as a site's workload plan",
    open: "sites/s-2/plan", ready: '[data-workload-plan="none"] [data-plan-actions]',
    act: async (c) => {
      await press(c, "Use a saved quote", "[data-plan-actions]");
      await until(c, '[data-plan-quote="qt-11"]');
      await show(c, '[data-plan-quote="qt-11"]');
    } },
  { name: "site-plan-update-end", entry: "Update or end a site's workload plan",
    open: "sites/s-1/plan", ready: "[data-plan-stale]",
    act: async (c) => {
      await press(c, "End the plan", "[data-plan-actions]");
      await typeIn(c, "[data-plan-ending] textarea", "The client is taking the building in house from April.", "El cliente se encarga del edificio por su cuenta desde abril.");
    } },
  { name: "site-plan-print", entry: "Print a site's workload plan",
    open: "sites/s-3/plan", ready: '[data-workload-plan="current"]',
    act: async (c) => {
      await press(c, "Print the plan", '[data-workload-plan="current"]');
      await until(c, "[data-plan-pdf] iframe");
      await wait(1200);
    } },
  { name: "sites-workload-plans", entry: "See which sites have a workload plan",
    open: "sites", ready: "[data-site-plan]" },
  { name: "inspection-completed-photos", entry: "Read a completed inspection, its photos and its signature",
    open: "inspections", ready: "button",
    act: async (c) => {
      await openInspection(c, "Completed|inspections");
      await c.page.locator("button").filter({ hasText: c.lang === "es" ? "Pasamanos de la escalera" : "Stairwell handrails" }).first().click();
      await until(c, '[data-inspection-photos="it-2"] img');
      await show(c, '[data-inspection-photos="it-2"]');
    } },
  { name: "inspection-completed-signature", entry: "Read a completed inspection, its photos and its signature",
    open: "inspections", ready: "button",
    act: async (c) => {
      await openInspection(c, "Completed|inspections");
      await until(c, "[data-signature-image]");
      await show(c, "[data-inspection-lines]");
    } },
  { name: "roster-check", entry: "Check who is still working with the roster check",
    open: "staff/roster", ready: "[data-roster-check] table tbody tr" },
  { name: "staff-put-on-leave-window", entry: "Put someone on leave",
    open: "staff/" + ACTIVE, ready: '[data-employment-action="leave"]',
    act: async (c) => {
      await click(c, '[data-employment-action="leave"]');
      await offered(c, win("leave") + ' option[value="medical"]');
      await pickLabeled(c, "Reason", "medical");
      await day(c, "leave", "2026-04-13");
    } },
  { name: "staff-end-employment-window", entry: "End someone's employment",
    open: "staff/" + ACTIVE, ready: '[data-employment-action="end"]',
    act: async (c) => {
      await click(c, '[data-employment-action="end"]');
      await until(c, win("end") + " [data-collect-item]");
      await offered(c, win("end") + ' option[value="resigned"]');
      await pickLabeled(c, "Reason", "resigned");
      await day(c, "end", "2026-03-27");
      await c.page.locator(win("end") + ' select[aria-label="' + c.say("Eligible for rehire?") + '"]').selectOption("yes");
    } },
  { name: "staff-return-from-leave-window", entry: "Bring someone back from leave",
    open: "staff/u-staff-9", ready: '[data-employment-action="return"]',
    act: async (c) => {
      await click(c, '[data-employment-action="return"]');
      await until(c, win("return"));
      await typeIn(c, win("return") + " textarea", "Back from medical leave with a note from the doctor.", "Regresa de la licencia m\u00e9dica con una nota del m\u00e9dico.");
    } },
  { name: "staff-rehire-window", entry: "Rehire someone",
    open: "staff/" + LEFT, ready: '[data-employment-action="rehire"]',
    act: openRehire },
  { name: "staff-record-reason-window", entry: "Record why someone is inactive or left",
    open: "staff/u-staff-10", ready: "[data-employment-no-reason]",
    act: async (c) => {
      await press(c, "Record the reason", "[data-employment-no-reason]");
      await offered(c, win("record-leave") + ' option[value="family"]');
      await pickLabeled(c, "Reason", "family");
      await day(c, "record-leave", "2026-04-20");
    } },
  { name: "inspection-review-sign", entry: "Sign an inspection's review line",
    open: "inspections", ready: "button",
    act: async (c) => {
      await openInspection(c, "Awaiting review");
      await show(c, '[data-inspection-line="reviewer"] canvas');
      await drawIn(c, '[data-inspection-line="reviewer"] canvas');
    } },
  { name: "inspections-awaiting-review", entry: "See the inspections awaiting review",
    open: "inspections", ready: "button",
    act: async (c) => {
      await c.page.getByRole("button", { name: c.say("Awaiting review") }).first().click();
      await until(c, "[data-inspections-awaiting] table tbody tr");
    } },
  { name: "warning-verbal-window", entry: "Issue a verbal warning",
    open: WARNED, ready: "[data-person-discipline]",
    act: async (c) => {
      await newWarning(c, "verbal_warning");
      await typeIn(c, '[data-warning-window] textarea', "Came in 30 minutes late on Monday without calling ahead.", "Lleg\u00f3 30 minutos tarde el lunes sin avisar.");
      await pickLabeled(c, "Does this follow a complaint or other protected activity by this person?", "no");
    } },
  { name: "warning-written-issue", entry: "Issue a written or final written warning",
    open: WARNED, ready: '[data-warning-row="da-11"]',
    act: async (c) => {
      await openWarning(c, "da-11");
      await until(c, "[data-warning-issue] canvas");
      await show(c, "[data-warning-issue] canvas");
      await sign(c);
      await show(c, "[data-who-signs-field]");
    } },
  { name: "warning-termination-window", entry: "Issue a termination",
    open: WARNED, ready: "[data-person-discipline]",
    act: async (c) => {
      await newWarning(c, "termination");
      await typeIn(c, '[data-warning-window] textarea', "Took cleaning supplies home from the site storeroom.", "Se llev\u00f3 a casa suministros de limpieza del almac\u00e9n del sitio.");
      await pickLabeled(c, "Does this follow a complaint or other protected activity by this person?", "no");
    } },
  { name: "warning-send-window", entry: "Send a warning to the person",
    open: WARNED, ready: '[data-warning-row="da-9"]',
    act: async (c) => {
      await openWarning(c, "da-9");
      await c.page.locator("[data-warning-window] button").filter({ hasText: c.say("Email") }).first().click();
      await c.page.locator('[data-warning-window] input[type="email"]').fill("office@example.invalid");
    } },
  { name: "warning-declined-to-sign", entry: "When a person declines to sign a warning",
    open: WARNED, ready: '[data-warning-row="da-11"]',
    act: async (c) => {
      await openWarning(c, "da-11");
      await click(c, '[data-who-signs="here"]');
      await c.page.locator("[data-warning-issue] label").filter({ hasText: c.say("Declined to sign") }).locator("input").check();
      await c.page.locator('[data-warning-issue] input[aria-label="' + c.say("Witness") + '"]').fill("Marcus Ferreira");
      await show(c, '[data-warning-issue] input[aria-label="' + c.say("Witness") + '"]');
    } },
  { name: "warning-rescind", entry: "Rescind a warning",
    open: WARNED, ready: '[data-warning-row="da-9"]',
    act: async (c) => {
      await openWarning(c, "da-9");
      await press(c, "Rescind", "[data-warning-window]");
      await typeIn(c, "[data-warning-rescind] textarea", "The late days were swaps the supervisor had approved.", "Los d\u00edas tarde fueron cambios que el supervisor hab\u00eda aprobado.");
      await show(c, "[data-warning-rescind]");
    } },
  { name: "discipline-page", entry: "See every warning on the Discipline page",
    open: "discipline", ready: "[data-discipline-page] table tbody tr" },
  { name: "case-open-window", entry: "Open a case",
    open: "cases", ready: "table tbody tr",
    act: async (c) => {
      await press(c, "Open a case");
      await until(c, "[data-open-case]");
      await typeIn(c, "[data-open-case] textarea", "A staff member said a coworker keeps taking their assigned floor.", "Un empleado dijo que un compa\u00f1ero sigue qued\u00e1ndose con el piso que le asignaron.");
      await pickByLabel(c, "About whom", "u-staff-6", "4115");
      await press(c, "Add", "[data-open-case]");
      await pickByLabel(c, "On behalf of", "u-staff-7", "EMP-1007");
      await pickLabeled(c, "Is this about someone in management?", "no");
    } },
  { name: "warning-add-past-window", entry: "Add an old form's warning to the record",
    open: WARNED, ready: "[data-add-to-record]",
    act: async (c) => {
      await click(c, "[data-add-to-record]");
      await until(c, "[data-past-warning]");
      await pickLabeled(c, "Step", "written_warning");
      await typeIn(c, "[data-past-warning] textarea", "Written warning for repeated late arrivals, given on the old form.", "Amonestaci\u00f3n por escrito por llegar tarde varias veces, dada en el formulario anterior.");
    } },
  { name: "sign-in-code", entry: "Sign in with a code on a new device", as: "code",
    open: "overview", ready: "input",
    act: async (c) => {
      const inputs = c.page.locator("input");
      await inputs.nth(0).fill(seed.PEOPLE.admin.login.phone);
      await inputs.nth(1).fill(seed.PEOPLE.admin.login.pin);
      await press(c, "Sign In");
      await until(c, "[data-second-code]");
    } },
  { name: "settings-trusted-devices", entry: "See or forget the devices you are remembered on",
    open: "settings", ready: "button",
    act: async (c) => {
      await c.page.getByRole("button", { name: c.say("Trusted devices"), exact: true }).first().click();
      await until(c, "[data-trusted-devices] table tbody tr");
    } },
  { name: "ws-new-project", entry: "Start a project and choose its members",
    open: "workspace", ready: "[data-workspace] [data-project-card]",
    act: async (c) => {
      await press(c, "New project", "[data-workspace]");
      await until(c, '[data-project-window="new"] [data-people-picker] label');
      await c.page.locator('[data-project-window="new"] input').first().fill(inLang(c, "Lobby refresh", "Renovaci\u00f3n del vest\u00edbulo"));
      await c.page.locator('[data-project-window="new"] textarea').fill(inLang(c, "New mats and a deep clean before the client's visit.", "Tapetes nuevos y una limpieza profunda antes de la visita del cliente."));
      await pickPerson(c, "Marcus Ferreira");
      await pickPerson(c, "Priya Raghunathan");
    } },
  { name: "ws-message-board", entry: "Post on a project's message board",
    open: "workspace/wp-1/posts", ready: "[data-ws-posts] [data-ws-post]" },
  { name: "ws-new-post", entry: "Post on a project's message board",
    open: "workspace/wp-1/posts", ready: "[data-ws-posts] [data-ws-post]",
    act: async (c) => {
      await press(c, "New post", "[data-ws-posts]");
      await c.page.locator('[data-post-window="new"] input').first().fill(inLang(c, "Elevator pads on Thursday", "Protectores del ascensor el jueves"));
      await c.page.locator('[data-post-window="new"] textarea').fill(inLang(c, "The movers need the elevator pads up by 7 AM on Thursday.\nPlease leave the service elevator free.", "Los de la mudanza necesitan los protectores del ascensor puestos a las 7 AM del jueves.\nDejen libre el ascensor de servicio."));
      await c.page.locator('[data-post-window="new"] input[type="checkbox"]').check();
    } },
  { name: "ws-post-comment", entry: "Comment on a post or a to-do, and tag someone",
    open: "workspace/wp-1/posts/po-1", ready: "[data-ws-comments] [data-ws-comment]",
    act: async (c) => {
      await c.page.locator("[data-ws-comments] textarea").last().fill(inLang(c, "The tenant's facilities manager will walk floor 2 with us. ", "El encargado de instalaciones del inquilino recorrer\u00e1 el piso 2 con nosotros. "));
      await click(c, "[data-ws-tag]");
      await until(c, "[data-ws-tags]");
      await show(c, "[data-ws-tags]");
    } },
  { name: "ws-todos", entry: "Keep a project's to-dos",
    open: "workspace/wp-1/todos", ready: "[data-ws-todos] [data-ws-todo]",
    act: async (c) => { await click(c, '[data-ws-done-toggle="tl-1"]'); await until(c, '[data-ws-done-list="tl-1"]'); } },
  { name: "ws-add-todo", entry: "Keep a project's to-dos",
    open: "workspace/wp-1/todos", ready: "[data-ws-todos] [data-ws-todo]",
    act: async (c) => {
      await click(c, '[data-ws-add-todo="tl-2"]');
      await until(c, '[data-todo-window="new"] [data-people-picker] label');
      await c.page.locator('[data-todo-window="new"] input').first().fill(inLang(c, "Clean the elevator tracks", "Limpiar los rieles del ascensor"));
      await c.page.locator('[data-todo-window="new"] textarea').fill(inLang(c, "After the movers leave on Thursday.", "Despu\u00e9s de que se vayan los de la mudanza el jueves."));
      await c.page.locator('[data-todo-window="new"] input[type="date"]').fill("2026-04-03");
      await pickPerson(c, "Marcus Ferreira");
    } },
  { name: "ws-my-assignments", entry: "See what is assigned to you across projects",
    open: "workspace", ready: "[data-my-assignments] [data-my-todo]" },
  { name: "ws-project-chat", entry: "Talk in a project's chat",
    open: "workspace/wp-1", ready: '[data-project-page="wp-1"] [data-tool-card="chat"]',
    act: async (c) => {
      await click(c, '[data-tool-card="chat"]');
      await c.page.getByText("@Marcus Ferreira").first().waitFor();
      await c.page.getByPlaceholder(c.say("Type a message")).fill(inLang(c, "Yes, two people from 10 PM.", "S\u00ed, dos personas desde las 10 PM."));
    } },
  { name: "ws-files", entry: "Add, open or remove a project's files",
    open: "workspace/wp-1/files", ready: "[data-ws-files] [data-ws-file]" },
  { name: "ws-project-page", entry: "Get email copies of a project's posts",
    open: "workspace/wp-1", ready: '[data-project-page="wp-1"] [data-email-copies]',
    act: async (c) => { await until(c, "[data-project-activity]"); await until(c, '[data-tool-card="files"] span span'); } },
  { name: "ws-archived-list", entry: "Archive a project, or bring it back",
    open: "workspace/archived", ready: '[data-workspace="archived"] [data-project-card]' },
  { name: "ws-archived-project", entry: "Archive a project, or bring it back",
    open: "workspace/wp-4", ready: '[data-project-page="wp-4"] [data-project-archive]',
    act: async (c) => { await until(c, "[data-project-activity]"); } },
  { name: "chat-records-search", entry: "Search the chat records",
    open: "chat-records", ready: "[data-chat-records] [data-records-log]",
    act: async (c) => {
      await c.page.locator("[data-chat-records] input").first().fill("Marcus");
      await click(c, "[data-records-people] button");
      await c.page.locator('[data-chat-records] input[type="date"]').nth(0).fill("2026-03-01");
      await c.page.locator('[data-chat-records] input[type="date"]').nth(1).fill("2026-03-17");
      await click(c, "[data-records-search]");
      await until(c, "[data-records-result] table tbody tr");
    } },
  { name: "kept-records-group", entry: "Print a site's zone cleaning checklists",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => { await c.page.getByText(c.say("Master Zone Cleaning Checklist"), { exact: true }).first().waitFor(); } },
  { name: "kept-zone-checklists", entry: "Print a site's zone cleaning checklists",
    open: "reports", ready: "[data-report-group]", act: async (c) => { await kept(c, "Master Zone Cleaning Checklist"); } },
  { name: "kept-disinfection-logs", entry: "Print a site's disinfection coverage logs",
    open: "reports", ready: "[data-report-group]", act: async (c) => { await kept(c, "Disinfection Coverage Log"); } },
  { name: "kept-chemical-log", entry: "Print a site's chemical usage log",
    open: "reports", ready: "[data-report-group]", act: async (c) => { await kept(c, "Chemical Usage Log"); } },
  { name: "kept-ppe-log", entry: "Print a site's PPE compliance log",
    open: "reports", ready: "[data-report-group]", act: async (c) => { await kept(c, "PPE Compliance Log"); } },
  { name: "kept-clearance-record", entry: "Print a site's school clearance tracking record",
    open: "reports", ready: "[data-report-group]", act: async (c) => { await kept(c, "School Clearance Tracking Record"); } },
  { name: "kept-inspections", entry: "Print a site's inspections for the assessor",
    open: "reports", ready: "[data-report-group]", act: async (c) => { await kept(c, "Inspections"); } },
  { name: "kept-training-rosters", entry: "Print a site's training attendance rosters",
    open: "reports", ready: "[data-report-group]", act: async (c) => { await kept(c, "Training Attendance Roster"); } },
  { name: "equipment-register", entry: "Keep the equipment register",
    open: "equipment", ready: "[data-equipment-page] table tbody tr" },
  { name: "equipment-item", entry: "Keep the equipment register",
    open: "equipment/eq-1", ready: "[data-equipment-item] [data-equipment-event]" },
  { name: "equipment-labels", entry: "Print equipment labels",
    open: "equipment", ready: "[data-equipment-page] table tbody tr",
    act: async (c) => {
      await equipmentRow(c, inLang(c, "Floor scrubber 2", "Fregadora de pisos 2")).locator('input[type="checkbox"]').check();
      await equipmentRow(c, inLang(c, "Floor burnisher", "Pulidora de pisos")).locator('input[type="checkbox"]').check();
    } },
  { name: "equipment-tag-out", entry: "Tag out a piece of equipment, and return it to service",
    open: "equipment/eq-1", ready: "[data-equipment-item]",
    act: async (c) => {
      await press(c, "Tag out", "[data-equipment-item]");
      await c.page.locator('[data-equipment-action="tagged_out"] textarea').fill(c.lang === "es" ? "La bater\u00eda no carga." : "The battery does not charge.");
    } },
  { name: "equipment-return-to-service", entry: "Tag out a piece of equipment, and return it to service",
    open: "equipment/eq-2", ready: "[data-equipment-item] [data-equipment-event]" },
  { name: "periodic-work", entry: "See periodic work across every site",
    open: "periodic", ready: "[data-periodic-work] table tbody tr" },
  { name: "touchpoint-task-window", entry: "Mark a checklist item as a touchpoint",
    open: "sites/s-1/tasks", ready: "[data-nav-item]",
    act: async (c) => {
      await c.page.getByText(c.say("Touchpoint"), { exact: true }).first().click();
      await until(c, "[data-touchpoint-toggle]");
      await c.page.locator("[data-critical-toggle] input").check();
      await show(c, "[data-critical-toggle]");
    } },
  { name: "concern-link-make", entry: "Make a site's concern link, so a client can report a problem",
    open: "forms/links", ready: "[data-link-kind]",
    act: async (c) => {
      const form = c.page.locator('[data-customer-links-tab] select[aria-label="' + c.say("Form") + '"]').first();
      await form.locator('option[value="OCSA-FRM-009"]').waitFor({ state: "attached" });
      await form.selectOption("OCSA-FRM-009");
    } },
  { name: "site-customer-links-card", entry: "Make or print a site's customer links from the site",
    open: "sites/s-1", ready: "[data-site-customer-links]",
    act: async (c) => { await top(c, "[data-site-customer-links]", 260); } },
  // Form is set to the Customer Complaint Log once the catalog offers it.
  { name: "concern-filed-forms", entry: "Answer a client's concern on time",
    open: "forms", ready: "[data-complaint-due]",
    act: async (c) => {
      const form = c.page.locator('select[aria-label="' + c.say("Form") + '"]').first();
      if (await form.locator('option[value="OCSA-FRM-009"]').count()) { await form.selectOption("OCSA-FRM-009"); await until(c, "[data-complaint-due]"); }
    } },
  { name: "concern-mark-acknowledged", entry: "Answer a client's concern on time",
    open: "forms/reports/cf-concern-1", ready: "[data-mark-acknowledged]",
    act: async (c) => {
      await click(c, "[data-mark-acknowledged]");
      await c.page.locator("[data-acknowledge-form] select").selectOption("phone");
      await show(c, "[data-acknowledge-form]");
    } },
  { name: "management-review-pack", entry: "Print the management review evidence pack",
    open: "reports", ready: "[data-report-group]",
    act: async (c) => {
      await c.page.locator("text=OCSA-QMS-018").locator("xpath=../..").getByRole("button").first().click();
      await until(c, "[data-management-review]");
    } },
  { name: "holidays-year", entry: "Enter the year's holidays",
    open: "settings", ready: '[data-nav-item="settings"]',
    act: async (c) => { await tab(c, "Holidays"); await until(c, "[data-holidays] table tbody tr"); } },
  { name: "holidays-add-window", entry: "Enter the year's holidays",
    open: "settings", ready: '[data-nav-item="settings"]',
    act: async (c) => {
      await tab(c, "Holidays");
      await until(c, "[data-holidays] table tbody tr");
      await c.page.getByRole("button", { name: "2027", exact: true }).click();
      await until(c, "[data-holidays] table tbody tr");
      await click(c, "[data-holiday-add]");
      await c.page.locator('[data-holiday-window] input[type="date"]').fill("2027-03-10");
      await c.page.locator("[data-holiday-window] input").nth(1).fill("Eid al-Fitr");
      await c.page.locator("[data-holiday-window] textarea").fill(c.lang === "es" ? "Confirmado por escrito" : "Confirmed in writing");
    } },
  { name: "request-qr-make", entry: "Make a request QR, so anyone in the building can ask for help",
    open: "forms/links", ready: "[data-link-kind]",
    act: async (c) => {
      await c.page.locator("[data-link-kind]").selectOption("request");
      await c.page.locator("[data-link-area-input]").fill(c.lang === "es" ? "Ba\u00f1o del vest\u00edbulo" : "Lobby restroom");
    } },
  { name: "request-qr-window", entry: "Make a request QR, so anyone in the building can ask for help",
    open: "forms/links", ready: '[data-customer-link="cl-4"]',
    act: async (c) => { await press(c, "Show QR code", '[data-customer-link="cl-4"]'); await until(c, "[data-qr-screen] [data-link-area]"); } },
  { name: "site-request-qrs-print-all", entry: "Print every request QR of a site at once",
    open: "sites/s-1", ready: "[data-site-request-links]",
    act: async (c) => { await top(c, "[data-site-customer-links]", 100); } },
  { name: "request-qr-rename", entry: "Rename a request QR's area",
    open: "forms/links", ready: '[data-customer-link="cl-4"]',
    act: async (c) => {
      await press(c, "Rename", '[data-customer-link="cl-4"]');
      await c.page.locator("[data-link-rename] input").fill(c.lang === "es" ? "Ba\u00f1o del segundo piso, lado este" : "Second floor restroom, east side");
    } },
  { name: "client-requests-list", entry: "See the client requests waiting for approval",
    open: "issues/requests", ready: "[data-client-requests] table tbody tr" },
  { name: "client-request-window", entry: "See the client requests waiting for approval",
    open: "issues/requests/rq-1", ready: "[data-request-window] [data-request-approve]" },
  // rq-2 is at the site whose supervisor is on shift, so the picker starts on them.
  { name: "client-request-approve", entry: "Approve a client request and assign it",
    open: "issues/requests/rq-2", ready: "[data-request-approve]",
    act: async (c) => { await click(c, "[data-request-approve]"); await until(c, "[data-request-approve-form]"); await show(c, "[data-request-approve-form]"); } },
  { name: "client-request-decline", entry: "Decline a client request",
    open: "issues/requests/rq-1", ready: "[data-request-decline]",
    act: async (c) => {
      await click(c, "[data-request-decline]");
      await c.page.locator("[data-request-decline-form] textarea").fill(c.lang === "es" ? "Esta \u00e1rea no es parte del servicio en este sitio." : "This area is not part of the service at this site.");
      await show(c, "[data-request-decline-form]");
    } },
  { name: "client-request-note", entry: "Send a note to the person who asked",
    open: "issues/requests/rq-1", ready: "[data-request-note-button]",
    act: async (c) => {
      await click(c, "[data-request-note-button]");
      await c.page.locator("[data-request-note-form] textarea").fill(c.lang === "es" ? "Alguien va en camino para secar el piso." : "Someone is on the way to dry the floor.");
      await c.page.locator("[data-request-send-client]").check();
      await show(c, "[data-request-note-form]");
    } },
  { name: "client-request-patterns", entry: "See what is asked for again and again",
    open: "issues/requests/site/s-1", ready: "[data-request-patterns]" },
  { name: "supply-inventory-labels", entry: "Print supply labels",
    open: "supplies", ready: "[data-supply-site-labels]" },
  { name: "supply-label-window", entry: "Print supply labels",
    open: "supplies", ready: "[data-supply-card]",
    act: async (c) => { await click(c, "[data-supply-card]"); await until(c, "[data-supply-print-label]"); await show(c, "[data-supply-print-label]"); } },
  { name: "findings-list", entry: "Verify a finding someone else fixed",
    open: "issues", ready: "[data-issue-source]",
    act: async (c) => { await c.page.locator("[data-issue-source]").selectOption("inspection"); await until(c, "[data-finding-fixed]"); } },
  // The finding is opened once the Issue Tracker reads the findings (Source offers Inspection): opened
  // by its address before then it opens as a plain issue, with no Verify.
  { name: "finding-verify", entry: "Verify a finding someone else fixed",
    open: "issues", ready: "[data-finding-fixed]",
    act: async (c) => {
      await c.page.locator('[data-issue-source] option[value="inspection"]').waitFor({ state: "attached" });
      await c.page.evaluate(() => { window.location.hash = "issues/f-3"; });
      await until(c, "[data-verify]");
      await c.page.locator("[data-verify] textarea").fill(c.lang === "es" ? "Revisado en persona en el muelle." : "Checked in person at the dock.");
      await show(c, "[data-verify]");
    } },
  { name: "inspection-band-findings", entry: "Read an inspection's findings and band",
    open: "inspections", ready: '[data-nav-item="inspections"]',
    act: async (c) => {
      await press(c, "Completed|inspections");
      await row(c, "table tbody tr", "Dock area check");
      await until(c, "[data-inspection-finding]");
      await show(c, "[data-inspection-band]");
    } },
  { name: "corrective-link-findings", entry: "Link findings to a corrective action",
    open: "forms/reports/fr-ca-1", ready: "[data-link-findings]",
    act: async (c) => { await click(c, "[data-link-findings]"); await until(c, "[data-link-finding]"); await show(c, "[data-link-findings-form]"); } },
  { name: "corrective-tell-client", entry: "Tell the client what was done",
    open: "forms/reports/fr-ca-1", ready: "[data-tell-client-open]",
    act: async (c) => {
      await click(c, "[data-tell-client-open]");
      await until(c, "[data-tell-client-form]");
      const isEs = c.lang === "es";
      await c.page.locator('[data-tell-client-field="whatHappened"]').fill(isEs ? "La inspecci\u00f3n encontr\u00f3 las marcas del muelle gastadas." : "The inspection found the dock markings worn.");
      await c.page.locator('[data-tell-client-field="whatWasDone"]').fill(isEs ? "Las marcas se volvieron a pintar." : "The markings were repainted.");
      await c.page.locator('[data-tell-client-field="prevention"]').fill(isEs ? "El muelle est\u00e1 ahora en la ronda semanal." : "The dock is now on the weekly walk.");
      await top(c, "[data-tell-client-form]", 30);
    } },
  { name: "training-gaps", entry: "See training gaps by role and site",
    open: "training/gaps", ready: "[data-gaps-person]" },
  { name: "training-gaps-missing", entry: "See who has no record of a training",
    open: "training/gaps", ready: "[data-gaps-person]",
    act: async (c) => { await c.page.locator('[data-gaps-filter="status"]').selectOption("missing"); await wait(400); await until(c, "[data-gaps-person]"); } },
  { name: "training-gaps-person", entry: "See training gaps by role and site",
    open: "training/gaps", ready: "[data-gaps-person]",
    act: async (c) => { await click(c, "[data-gaps-person]"); await until(c, "[data-person-training] [data-training-item]"); } },
  { name: "training-lesson-versions", entry: "Write and publish a training lesson",
    open: "training/catalog", ready: "[data-training-catalog] table tbody tr",
    act: async (c) => { await row(c, "[data-training-catalog] table tbody tr", TOPIC.spill); await click(c, '[data-topic-tab="lesson"]'); await until(c, "[data-topic-lesson] tbody tr"); } },
  { name: "training-lesson-editor", entry: "Write and publish a training lesson",
    open: "training/catalog", ready: "[data-training-catalog] table tbody tr",
    act: async (c) => { await openLesson(c, TOPIC.spill); } },
  { name: "training-record-print", entry: "Print a training record for an assessor",
    open: "training/gaps", ready: "[data-gaps-person]",
    act: async (c) => { await click(c, "[data-gaps-person]"); await until(c, "[data-person-attempt]"); await show(c, "[data-person-attempt]"); } },
  { name: "training-certificate-upload", entry: "Upload a training certificate from an outside course",
    open: "training/gaps", ready: "[data-gaps-person]",
    act: async (c) => {
      await click(c, "[data-gaps-person]");
      await until(c, "[data-person-training] [data-certificate-upload]");
      await click(c, "[data-certificate-upload]");
      await until(c, "[data-certificate-window]");
      const topic = c.page.locator('[data-certificate-field="topicId"] select');
      await topic.locator('option[value="tp-2"]').waitFor({ state: "attached" });
      await topic.selectOption("tp-2");
      await until(c, '[data-certificate-field="siteId"] select');
    } },
  { name: "training-documents", entry: "See who signed a document, and say who must sign it",
    open: "training/documents", ready: "[data-training-documents] tbody tr",
    act: async (c) => { await click(c, "[data-training-documents] tbody tr"); await until(c, "[data-doc-person]"); await until(c, "[data-doc-who-row]"); } },
  { name: "training-area", entry: "Find training on the dashboard",
    open: "training", ready: "[data-training-views]" },
  { name: "training-catalog-order", entry: "Order the training catalog",
    open: "training/catalog", ready: "[data-catalog-category]",
    act: async (c) => {
      await c.page.locator("[data-catalog-category-filter]").selectOption("safety");
      await until(c, '[data-topic-down="tp-3"]');
    } },
  { name: "training-lesson-picture", entry: "Add a picture to a lesson",
    open: "training/catalog", ready: "[data-training-catalog] table tbody tr",
    act: async (c) => {
      await openLesson(c, TOPIC.spill);
      await until(c, "[data-lesson-add-image]");
      const at = await c.page.locator("[data-lesson-block]").count();
      await click(c, "[data-lesson-add-image]");
      await until(c, '[data-lesson-image="' + at + '"]');
      await show(c, '[data-lesson-image="' + at + '"]');
    } },
  { name: "training-drafts", entry: "Publish lesson drafts",
    open: "training/drafts", ready: "[data-training-drafts] tbody tr" },
  { name: "training-spanish-checker", entry: "Name the Spanish checker",
    open: "training/catalog", ready: "[data-training-catalog] table tbody tr",
    act: async (c) => { await row(c, "[data-training-catalog] table tbody tr", TOPIC.spill); await click(c, '[data-topic-tab="lesson"]'); await until(c, "[data-lesson-checkers]"); await show(c, "[data-lesson-checkers]"); } },
  { name: "owner-dashboard", entry: "Read the owner's dashboard",
    open: "owner", ready: "[data-owner-section]" },
  { name: "owner-dashboard-by-site", entry: "Read the owner's dashboard",
    open: "owner", ready: "[data-owner-section]",
    act: async (c) => {
      await click(c, '[data-owner-measure="inspectionAverage"] [data-owner-by-site-toggle]');
      await until(c, '[data-owner-measure="inspectionAverage"] [data-owner-by-site] tbody tr');
      await show(c, '[data-owner-measure="inspectionAverage"]');
    } },
  { name: "owner-dashboard-print", entry: "Print the owner's dashboard for a review",
    open: "owner", ready: "[data-owner-section]",
    act: async (c) => {
      const quarter = await c.page.locator("[data-owner-period] option").evaluateAll((os) => (os.find((o) => /-Q\d$/.test(o.value)) || {}).value);
      await c.page.locator("[data-owner-period]").selectOption(quarter);
      await c.page.waitForFunction((q) => !!document.querySelector("[data-owner-section]") && (document.querySelector("[data-owner-period]") || {}).value === q, quarter);
    } },
  // Step 291: Sites opens on the sites, each site's periodic work, HR in HR Records alone, the picker
  // that finds a badge number, App support, the language a document was signed in and the signed page.
  { name: "site-periodic-work", entry: "See periodic work across every site",
    open: "sites/s-1/tasks", ready: "[data-site-periodic] table tbody tr" },
  { name: "training-document-signed-language", entry: "See who signed a document, and say who must sign it",
    open: "training/documents", ready: "[data-training-documents] table tbody tr",
    act: async (c) => {
      await click(c, "[data-training-documents] table tbody tr");
      await until(c, "[data-doc-signed-language]");
      await top(c, "[data-doc-signed-language]", 260);
    } },
  { name: "schedule-shift-picker", entry: "Pick a person by name, badge number or employee ID",
    open: "schedule", ready: "text=Tomasz Wisniewski",
    act: async (c) => {
      await press(c, "Schedule Shift"); await until(c, MODAL);
      await c.page.locator("[data-schedule-shift-site]").selectOption(seed.SITES[1].id);
      await click(c, "[data-schedule-shift-staff] [data-person-pick-field]");
      await until(c, "[data-person-pick-group]");
    } },
  { name: "staff-open-hr-file", entry: "Open a person's HR file from Staff Management",
    open: "staff/" + ACTIVE, ready: "[data-open-hr-file]" },
  { name: "tickets-inbox", entry: "Read and answer app support tickets",
    open: "tickets", ready: "[data-ticket-state]" },
  { name: "tickets-ticket-window", entry: "Read and answer app support tickets",
    open: "tickets", ready: '[data-ticket-state="new"]',
    act: async (c) => {
      await click(c, '[data-ticket-state="new"]');
      await until(c, "[data-ticket-window]");
      await click(c, '[data-ticket-status-choice="done"]');
      await typeIn(c, "[data-ticket-note]", "Fixed in today's portal update.", "Se arregl\u00f3 en la actualizaci\u00f3n de hoy del portal.");
      await blur(c);
    } },
  { name: "tickets-export", entry: "Copy app support tickets into a chat",
    open: "tickets", ready: "[data-tickets-export-open]",
    act: async (c) => { await click(c, "[data-tickets-export-open]"); await until(c, "[data-tickets-export-text]"); } },
  { name: "settings-support-contact", entry: "Set the app support contact",
    open: "settings", ready: '[data-settings-tab="support"]',
    act: async (c) => { await click(c, '[data-settings-tab="support"]'); await until(c, "[data-support-contact]"); } },
  { name: "help-ticket-card", entry: "Send a ticket to app support from Help",
    open: "help", ready: 'button[aria-label]',
    act: async (c) => {
      await typeIn(c, "textarea", "The schedule page is not working when I add a shift.", "La p\u00e1gina del horario no funciona cuando agrego un turno.");
      await c.page.locator('button[aria-label="' + c.say("Send") + '"]').first().click();
      await until(c, "[data-help-ticket]");
    } },
  { name: "hr-folder-signed-page", entry: "Find a person's signed acknowledgment page",
    open: "hr/" + ACTIVE, ready: "[data-folder-signed-page]",
    act: async (c) => { await top(c, "[data-folder-signed-page]", 300); } },
];


// ---- reading the guide ------------------------------------------------------------------------
// Each entry's title and the pictures its Picture: lines name, the way scripts/guide-check.js reads it.
function readGuide() {
  const entries = [];
  let cur = null;
  fs.readFileSync(GUIDE, "utf8").split("\n").forEach((raw, i) => {
    const l = raw.replace(/\r$/, "");
    if (i === 0) return;
    if (/^## /.test(l)) { cur = { title: l.slice(3).trim(), pictures: [] }; entries.push(cur); return; }
    const m = /^Picture:\s*(.*?)\s*$/.exec(l);
    if (cur && m) cur.pictures.push(m[1]);
  });
  return entries;
}

// The list held to the guide. Answers the problems, one a line.
function listProblems() {
  const out = [];
  const entries = readGuide();
  const byTitle = new Map(entries.map((e) => [e.title, e]));
  const seen = new Map();
  const perEntry = new Map();
  SHOTS.forEach((s) => {
    if (!NAME.test(s.name)) out.push(s.name + ": a name is 1 to 60 of a-z, 0-9 and -");
    if (seen.has(s.name)) out.push(s.name + ": named twice on the list");
    seen.set(s.name, s);
    if (!byTitle.has(s.entry + SUFFIX)) out.push(s.name + ": no guide entry is titled " + s.entry + SUFFIX);
    perEntry.set(s.entry, (perEntry.get(s.entry) || 0) + 1);
  });
  perEntry.forEach((n, e) => { if (n > 2) out.push(e + ": " + n + " pictures on the list, and an entry takes at most two"); });
  entries.forEach((e) => e.pictures.forEach((p) => {
    const s = seen.get(p);
    if (!s) out.push(e.title + ": its Picture: line names " + p + ", which is not on the list");
    else if (s.entry + SUFFIX !== e.title) out.push(p + ": the list gives it to " + s.entry + ", and the guide names it under " + e.title);
  }));
  return out;
}

// The build/ served is the one npm run build made from src, package.json and public, the pictures
// left out, since this run writes them.
function buildIsFresh() {
  const index = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(index)) return false;
  const built = fs.statSync(index).mtimeMs;
  let newest = 0;
  const walk = (p) => {
    if (p === OUT) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) { fs.readdirSync(p).forEach((x) => walk(path.join(p, x))); return; }
    if (st.mtimeMs > newest) newest = st.mtimeMs;
  };
  ["src", "public", "package.json"].forEach((w) => { const p = path.join(ROOT, w); if (fs.existsSync(p)) walk(p); });
  return built > newest;
}

// ---- taking a picture -------------------------------------------------------------------------
// The stub answers every step the API has built, the way live does (audit/smoke.js arms the same).
function stubsFor(as) {
  const stubs = createStubs();
  stubs.setStep253(true);
  ["setStep256", "setStep262", "setStep266", "setStep270", "setStep269", "setStep275", "setStep278", "setStep280", "setStep283", "setStep289", "setStep299", "setStep292"].forEach((k) => stubs[k](true));
  // A person still on the PIN the office gave, whom the dashboard shows Choose your PIN alone (Step 284).
  if (as === "pin") stubs.setMustSetPin("admin", true);
  // The second step of sign-in, the way audit/smoke.js arms it: sign-in answers secondStep, and the
  // code is what finishes it (STEP225_CONTRACT.md).
  if (as === "code") {
    const orig = stubs.handle;
    let held = null;
    stubs.handle = (req) => {
      const p = new URL(req.url).pathname;
      if (p === "/api/auth/login" && req.method === "POST") {
        const a = orig(req);
        if (a.status !== 200) return a;
        held = a;
        return { status: 200, json: { secondStep: true, challengeId: "shots-challenge", emailHint: "d***@example.invalid" } };
      }
      if (p === "/api/auth/second-step" && req.method === "POST") return held || { status: 401, json: { error: "No sign-in to finish" } };
      return orig(req);
    };
  }
  return stubs;
}

// What is on screen once the shot has done its part: the images loaded and a moment for anything
// that slides or fades.
async function steady(page) {
  await wait(350);
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 4000 }).catch(() => {});
  await page.evaluate(() => (document.fonts && document.fonts.ready) || null).catch(() => {});
  await wait(150);
}

async function jpeg(page) {
  for (const quality of QUALITIES) {
    const buf = await page.screenshot({ type: "jpeg", quality, animations: "disabled", caret: "hide" });
    if (buf.length <= MAX_BYTES) return { buf, quality, cut: 0 };
  }
  const vp = page.viewportSize();
  for (let h = Math.round(vp.height * 0.9); h >= 300; h = Math.round(h * 0.9)) {
    const buf = await page.screenshot({ type: "jpeg", quality: QUALITIES[QUALITIES.length - 1], clip: { x: 0, y: 0, width: vp.width, height: h }, animations: "disabled", caret: "hide" });
    if (buf.length <= MAX_BYTES) return { buf, quality: QUALITIES[QUALITIES.length - 1], cut: vp.height - h };
  }
  throw new Error("no picture of it fits in 250 KB");
}

// A session of one kind in one language: signed out, at the code screen's door, or signed in as the
// stub's admin or supervisor.
async function openSession(browser, origin, lang, as) {
  const stubs = stubsFor(as);
  const d = await createDriver({ browser, origin, stubs, viewport: "wide", theme: "light", lang });
  d.page.setDefaultTimeout(8000);
  if (as === "signedOut" || as === "code" || as === "pin") await d.page.goto(origin + "/#overview", { waitUntil: "domcontentloaded" });
  else await d.signIn(as);
  return { d, stubs, as };
}

async function takeOne(session, origin, shot, lang) {
  const { d, stubs } = session;
  const page = d.page;
  const c = { d, page, say: d.say, lang, stubs, origin };
  if (session.as === "signedOut" || session.as === "code" || session.as === "pin") {
    await page.goto(origin + "/#" + (shot.open || "overview"), { waitUntil: "domcontentloaded" });
  } else {
    // A fresh load at the shot's address, so no window or menu from the shot before is still open.
    await page.evaluate((h) => { window.location.hash = h; }, "#" + (shot.open || "overview"));
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  if (shot.ready) await until(c, shot.ready, 15000);
  else await wait(600);
  if (shot.act) await shot.act(c);
  await steady(page);
  if (await d.crashed()) throw new Error(await d.crashDetail());
  return jpeg(page);
}

// The day each picture was taken (Step 293), read and written in name order, one name to a line.
const dayHere = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
function readTaken() {
  try { return JSON.parse(fs.readFileSync(TAKEN, "utf8")); } catch (e) { return {}; }
}
function writeTaken(days) {
  const names = Object.keys(days).sort();
  const body = names.map((n) => "  " + JSON.stringify(n) + ": " + JSON.stringify(days[n])).join(",\n");
  fs.writeFileSync(TAKEN, "{\n" + body + (names.length ? "\n" : "") + "}\n");
}

// ---- the run ----------------------------------------------------------------------------------
function chosen(args) {
  const words = args.filter((a) => !a.startsWith("--"));
  if (!words.length) return SHOTS.slice();
  const unknown = words.filter((w) => !SHOTS.some((s) => s.name === w || s.entry === w || s.entry + SUFFIX === w));
  if (unknown.length) throw new Error("not on the list: " + unknown.join(", "));
  return SHOTS.filter((s) => words.some((w) => s.name === w || s.entry === w || s.entry + SUFFIX === w));
}

const fileFor = (name, lang) => path.join(OUT, name + "." + lang + ".jpg");

async function lane(browser, origin, lang, shots, report) {
  // Signed out first, then the code screen, then Choose your PIN, then the admin, then the supervisor,
  // each a session.
  const order = ["signedOut", "code", "pin", "admin", "supervisor"];
  for (const as of order) {
    const mine = shots.filter((s) => (s.as || "admin") === as);
    if (!mine.length) continue;
    let session = await openSession(browser, origin, lang, as);
    try {
      for (const shot of mine) {
        const started = Date.now();
        try {
          const pic = await takeOne(session, origin, shot, lang);
          fs.writeFileSync(fileFor(shot.name, lang), pic.buf);
          report(true, lang, shot.name, Math.round(pic.buf.length / 1024) + " KB at " + pic.quality + (pic.cut ? ", " + pic.cut + " px cut" : "") + ", " + ((Date.now() - started) / 1000).toFixed(1) + "s");
        } catch (e) {
          report(false, lang, shot.name, String(e.message || e).split("\n")[0].slice(0, 200));
          // The next picture starts from a session that is known to be well.
          await session.d.close().catch(() => {});
          session = await openSession(browser, origin, lang, as);
        }
      }
    } finally { await session.d.close().catch(() => {}); }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const problems = listProblems();
  if (problems.length) {
    problems.forEach((p) => process.stdout.write("FAIL  list  " + p + "\n"));
    process.exit(1);
  }
  if (!buildIsFresh()) {
    process.stdout.write("FAIL  build  build/ is missing or older than src, public or package.json; run npm run build\n");
    process.exit(1);
  }
  const langArg = args.find((a) => a.startsWith("--lang="));
  const langs = langArg ? [langArg.slice(7)] : LANGS;
  if (langs.some((l) => LANGS.indexOf(l) < 0)) throw new Error("--lang is en or es");
  let shots = chosen(args);
  fs.mkdirSync(OUT, { recursive: true });
  const started = Date.now();
  let failed = 0, taken = 0;
  // Which languages of each picture this run took, for guide/shots-taken.json.
  const tookIn = {};
  const report = (ok, lang, name, what) => {
    if (ok) { taken += 1; (tookIn[name] = tookIn[name] || new Set()).add(lang); } else failed += 1;
    process.stdout.write((ok ? "ok    " : "FAIL  ") + lang + "  " + name.padEnd(44) + what + "\n");
  };
  const server = await serve(BUILD_DIR);
  const browser = await launch();
  try {
    await Promise.all(langs.map((lang) => {
      const mine = args.indexOf("--missing") >= 0 ? shots.filter((s) => !fs.existsSync(fileFor(s.name, lang))) : shots;
      return lane(browser, server.origin, lang, mine, report);
    }));
  } finally {
    await browser.close();
    await server.close();
  }
  const listed = new Set(SHOTS.map((s) => s.name));
  const days = readTaken();
  const today = dayHere(new Date());
  Object.keys(tookIn).forEach((name) => {
    if (LANGS.every((l) => tookIn[name].has(l))) days[name] = today;
    else process.stdout.write("note  " + name + " was taken in " + [...tookIn[name]].join(" and ") + " alone, so its day in guide/shots-taken.json stays " + (days[name] || "unset") + "\n");
  });
  Object.keys(days).forEach((name) => { if (!listed.has(name)) delete days[name]; });
  writeTaken(days);
  const strays = fs.readdirSync(OUT).filter((f) => !listed.has(f.replace(/\.(en|es)\.jpg$/, "")));
  strays.forEach((f) => process.stdout.write("note  public/guide-shots/" + f + " is on no line of the list\n"));
  process.stdout.write(taken + " taken, " + failed + " failed, in " + Math.round((Date.now() - started) / 1000) + "s\n");
  process.exit(failed ? 1 : 0);
}

// The list is read by itself too, by whatever needs to know which entry a picture belongs to.
module.exports = { SHOTS, SUFFIX };
if (require.main === module) main().catch((e) => { process.stdout.write("FAIL  shots  " + (e.stack || String(e)).split("\n")[0] + "\n"); process.exit(1); });

