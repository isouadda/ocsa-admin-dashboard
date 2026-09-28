// The builder, Step 187 (b0b4563), in English and in Spanish at 1280.
//
// A form's Edit opens the builder on GET /api/form-builder/drafts/:id: the stored turns on the left,
// You and The builder with the time, and a box with Send; on the right the preview in three tabs,
// Staff app, Dashboard and PDF, with a button for each language and Try it; under it the problems the
// API names, who gets the filled report, and Publish. A draft that does not load says This did not
// load. with Back and Try again, the way every screen the step added does. A turn posts POST
// /api/form-builder/drafts/:id/message { text }; while it is out Send is off and the conversation says
// The builder is working..., and the answer's reply is added and its draft, problems and preview
// replace what was held. A refused turn draws the API's words under the person's line and puts the
// text back in the box. The language switch reads the draft again with locale= the other language and
// draws that read's questions. Try it turns the Staff app's controls on for a test filling that
// reaches no route, and a question a rule governs appears once its governing answer arrives. Each
// problem is drawn in the screen's language, named for the question its path points at, and with any
// problem Publish is off. The PDF tab reads GET .../pdf in the preview's language and offers Download
// PDF. Who gets the filled report sends the whole list and the delivery as PATCH
// /api/form-builder/drafts/:id. Publish, for an admin with no problems, asks What changed and posts
// it, and the list says Published as version {0}.; anyone else reads Only an admin can publish.
// Discard draft asks first. The stub answers each route the way routes/formBuilder.js does at
// ocsa-api 94dbe27. The words are written out here by hand, so a wrong entry in the table turns the
// case red.
"use strict";

const WORDS = {
  en: { edit: "Edit", version: "Version {0}", draft: "Draft in progress", you: "You", builderName: "The builder", working: "The builder is working...",
    write: "Write to the builder", send: "Send", sending: "Sending...", pdfTab: "PDF", tryIt: "Try it", testFilling: "A test filling. Nothing is saved or sent.",
    question: "Question {0} of {1}", next: "Next", problemsHead: "Needs fixing before it can be published", noProblems: "No problems. This draft can be published.",
    fixFirst: "Fix the problems above before publishing.", publishLine: "Publishing makes this the version every app offers.", publish: "Publish",
    whatChanged: "What changed", publishedAs: "Published as version {0}.", onlyAdmin: "Only an admin can publish. Your draft is saved for one to review.",
    discard: "Discard draft", discardAsk: "Discard this draft? It leaves the list and cannot be reopened.", download: "Download PDF",
    whoGets: "Who gets the filled report", linkApp: "Link to the app", pdfAttached: "Filled PDF attached", emailOnly: "Email only", published: "Published",
    notLoaded: "This did not load.", tryAgain: "Try again", back: "Back" },
  es: { edit: "Editar", version: "Versi\u00f3n {0}", draft: "Borrador en curso", you: "Usted", builderName: "El creador", working: "El creador est\u00e1 trabajando...",
    write: "Escriba al creador", send: "Enviar", sending: "Enviando...", pdfTab: "PDF", tryIt: "Probarlo", testFilling: "Un llenado de prueba. No se guarda ni se env\u00eda nada.",
    question: "Pregunta {0} de {1}", next: "Siguiente", problemsHead: "Hay que corregir esto antes de publicarlo", noProblems: "Sin problemas. Este borrador se puede publicar.",
    fixFirst: "Corrija los problemas de arriba antes de publicar.", publishLine: "Al publicar, esta pasa a ser la versi\u00f3n que ofrecen todas las aplicaciones.", publish: "Publicar",
    whatChanged: "Qu\u00e9 cambi\u00f3", publishedAs: "Publicado como versi\u00f3n {0}.", onlyAdmin: "Solo un administrador puede publicar. Su borrador queda guardado para que uno lo revise.",
    discard: "Descartar borrador", discardAsk: "\u00bfDescartar este borrador? Sale de la lista y no se puede volver a abrir.", download: "Descargar el PDF",
    whoGets: "Qui\u00e9n recibe el reporte lleno", linkApp: "Enlace a la aplicaci\u00f3n", pdfAttached: "Con el PDF lleno adjunto", emailOnly: "Solo correo", published: "Publicado",
    notLoaded: "Esto no se carg\u00f3.", tryAgain: "Intentar de nuevo", back: "Volver" },
};
// Each language as the switch names it, in its own words.
const LANGUAGE_NAMES = { en: "English", es: "Espa\u00f1ol" };
// The floor buffer sign-out as the stub serves it in each language: its title, the questions in play
// before the turn and after it, the question that governs, the choice that opens the governed
// question, and that question.
const BUFFER = {
  en: { title: "Floor Buffer Sign-out", before: ["Who is taking the buffer", "How it came back"], after: ["Who is taking the buffer", "Which buffer", "How it came back"],
    governing: "How it came back", damaged: "Damaged", governed: "What was wrong with it" },
  es: { title: "Registro de salida de la pulidora", before: ["Qui\u00e9n se lleva la pulidora", "C\u00f3mo regres\u00f3"], after: ["Qui\u00e9n se lleva la pulidora", "Cu\u00e1l pulidora", "C\u00f3mo regres\u00f3"],
    governing: "C\u00f3mo regres\u00f3", damaged: "Da\u00f1ada", governed: "Qu\u00e9 le pasaba" },
};
// The problems the API names for the draft, as the list has to draw them: the question's label, then
// the sentence, in the screen's language. At the read that opens the draft, and after the turn.
const PROBLEMS = {
  en: { before: ["How it came back: the field condition is a pick with no options", "OCSA-FRM-041 states an empty apps"],
    after: ["Photos of the damage: the photos question damage_photos has a maxPhotos that is not a whole number above zero"] },
  es: { before: ["C\u00f3mo regres\u00f3: el campo condition es una selecci\u00f3n sin opciones", "OCSA-FRM-041 indica apps vac\u00edo"],
    after: ["Fotos del da\u00f1o: la pregunta de fotos damage_photos tiene un maxPhotos que no es un n\u00famero entero mayor que cero"] },
};
// When a line was written, as a bubble draws it: the stored turns at 6:02 PM in New York, and a line
// written now, at the fixed clock's 9:30 PM.
const STORED_AT = { en: "6:02 PM", es: "6:02 p.m." };
const NOW_AT = { en: "9:30 PM", es: "9:30 p.m." };
const TURN = { en: "Offer it in the staff app. Give How it came back two choices, and when it came back damaged ask what was wrong and for photos.",
  es: "Ofr\u00e9zcalo en la aplicaci\u00f3n del personal. Dele dos opciones a C\u00f3mo regres\u00f3 y, si regres\u00f3 da\u00f1ada, pregunte qu\u00e9 le pasaba y pida fotos." };
const REFUSED = { en: "Ask for the time it came back as well.", es: "Pregunte tambi\u00e9n la hora a la que regres\u00f3." };
// What the API writes for a read that failed on its side (helpers/words.js), which the builder must not
// draw in place of the page's own line.
const SERVER_ERROR = { code: "common.serverError", en: "Server error", es: "Error del servidor" };
// What the API writes when the model cannot answer (helpers/words.js, builder.modelFailed).
const MODEL_FAILED = { code: "builder.modelFailed", en: "The builder could not answer. Try again in a moment.", es: "El constructor no pudo responder. Intente de nuevo en un momento." };
const NOTE = { en: "Adds the number to call back when the customer wants a call.", es: "Agrega el n\u00famero para devolver la llamada cuando el cliente la quiere." };
const COMPLAINT_TITLE = { en: "Customer Complaint Log", es: "Registro de quejas de clientes" };
// The sample's name as the API's Content-Disposition gives it, in the preview's language.
const SAMPLE = { en: "OCSA-FRM-041-sample.pdf", es: "OCSA-FRM-041-sample-es.pdf" };
// The complaint log's draft's recipients as the builder has to draw them: the supervisor with the
// role's word, and the outside address.
const RECIPIENTS = ["Marcus Ferreira (Supervisor)", "complaints@example.invalid"];
const BUFFER_CODE = "OCSA-FRM-041";
const COMPLAINT = "OCSA-FRM-009";
const CONTENT = "div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']";
const ROOT = "[data-form-builder]";
const PHONE = "[data-phone-preview]";

// Presses the button inside the scope whose name, text or title is exactly this, when it is live.
const pressIn = (d, scope, name) => d.page.evaluate(([s, n]) => {
  const root = document.querySelector(s);
  if (!root) return false;
  const all = Array.from(root.querySelectorAll("button")).filter((b) => b.offsetParent !== null);
  const b = all.find((x) => x.getAttribute("aria-label") === n) || all.find((x) => (x.textContent || "").trim() === n) || all.find((x) => x.getAttribute("title") === n);
  if (!b || b.disabled) return false;
  b.click();
  return true;
}, [scope, name]);
// The buttons inside the scope that read this, each with whether it is off.
const buttonsReading = (d, scope, word) => d.page.evaluate(([s, w]) => {
  const root = document.querySelector(s);
  return root ? Array.from(root.querySelectorAll("button")).filter((b) => (b.textContent || "").trim() === w).map((b) => ({ disabled: b.disabled })) : [];
}, [scope, word]);
const hashOf = (d) => d.page.evaluate(() => window.location.hash);
const lastCall = (d, mark, method, path, extra) => d.callsSince(mark).filter((c) => c.method === method && c.path === path && (!extra || extra(c))).pop() || null;
const say = (template, a, b) => template.replace("{0}", a).replace("{1}", b);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The builder's header: the title and the line under it.
const builderHead = (d) => d.page.evaluate((r) => {
  const root = document.querySelector(r);
  const t = root ? root.querySelector("div[style*='font-size: 16px']") : null;
  return t ? { title: (t.textContent || "").trim(), sub: t.nextElementSibling ? (t.nextElementSibling.textContent || "").trim() : "" } : null;
}, ROOT);
// The conversation as the browser drew it: each bubble's head and words, the refusal, whether it sits
// right under the last bubble, and the working line.
const conversation = (d) => d.page.evaluate((r) => {
  const log = document.querySelector(r + " [role='log']");
  if (!log) return null;
  const kids = Array.from(log.children);
  const bubbles = kids.filter((row) => row.firstElementChild && row.firstElementChild.firstElementChild);
  const last = bubbles.length ? kids.indexOf(bubbles[bubbles.length - 1]) : -1;
  const refusal = kids.find((k) => k.hasAttribute("data-turn-refusal")) || null;
  const working = kids.find((k) => k.hasAttribute("data-builder-working")) || null;
  return {
    lines: bubbles.map((row) => {
      const bubble = row.firstElementChild;
      const head = bubble.firstElementChild;
      return { head: (head.textContent || "").trim(), text: Array.from(bubble.childNodes).filter((n) => n !== head).map((n) => n.textContent).join("") };
    }),
    refusal: refusal ? (refusal.textContent || "").trim() : null,
    refusalUnderLast: !!refusal && kids.indexOf(refusal) === last + 1,
    working: working ? (working.textContent || "").trim() : null,
  };
}, ROOT);
// The message box, by its name, and the Send beside it.
const messageBox = (d, name) => d.page.evaluate(([r, n]) => {
  const ta = Array.from(document.querySelectorAll(r + " textarea")).find((x) => x.getAttribute("aria-label") === n);
  const send = ta && ta.parentElement ? ta.parentElement.querySelector("button") : null;
  return ta ? { value: ta.value, send: send ? { text: (send.textContent || "").trim(), disabled: send.disabled } : null } : null;
}, [ROOT, name]);
const typeInto = async (d, name, text) => {
  const box = d.page.locator(ROOT + " textarea[aria-label=\"" + name + "\"]").first();
  if ((await box.count()) === 0) return false;
  return box.fill(text, { timeout: 3000 }).then(() => true).catch(() => false);
};
const pressSend = (d, name) => d.page.evaluate(([r, n]) => {
  const ta = Array.from(document.querySelectorAll(r + " textarea")).find((x) => x.getAttribute("aria-label") === n);
  const send = ta && ta.parentElement ? ta.parentElement.querySelector("button") : null;
  if (!send || send.disabled) return false;
  send.click();
  return true;
}, [ROOT, name]);
// The problems the list names, one line each, or null when no list is drawn.
const problemLines = (d, head) => d.page.evaluate(([r, h]) => {
  const ul = Array.from(document.querySelectorAll(r + " ul")).find((u) => u.getAttribute("aria-label") === h);
  return ul ? Array.from(ul.querySelectorAll("li")).map((li) => (li.textContent || "").trim()) : null;
}, [ROOT, head]);
// The Staff app preview as it stands: its title, the line under it, the question on screen by its key
// and label, and that question's pick when it is one.
const phoneState = (d) => d.page.evaluate((p) => {
  const box = document.querySelector(p);
  if (!box) return null;
  const head = box.children[0];
  const q = box.querySelector("[data-question]");
  const labelDiv = q ? Array.from(q.children).find((c) => (c.getAttribute("style") || "").indexOf("font-size: 15px") >= 0) : null;
  const select = q ? q.querySelector("select") : null;
  return {
    title: head && head.children[0] ? (head.children[0].textContent || "").trim() : "",
    line: head && head.children[1] ? (head.children[1].textContent || "").trim() : "",
    key: q ? q.getAttribute("data-question") : null,
    label: labelDiv && labelDiv.childNodes[0] ? (labelDiv.childNodes[0].textContent || "").trim() : "",
    select: select ? { disabled: select.disabled, options: Array.from(select.options).map((o) => (o.textContent || "").trim()) } : null,
  };
}, PHONE);
// Every question the Staff app preview asks, one Next at a time, and the line it opened on.
async function walkPhone(d, w) {
  const first = await phoneState(d);
  const labels = [];
  for (let i = 0; i < 8; i += 1) {
    const s = await phoneState(d);
    if (!s || !s.key) break;
    labels.push(s.label);
    if (!(await pressIn(d, PHONE, w.next))) break;
    await d.page.waitForTimeout(120);
  }
  return { title: first ? first.title : "", line: first ? first.line : "", labels };
}
// Next until the question on screen reads this label, or the questions run out.
async function walkTo(d, w, label) {
  for (let i = 0; i < 8; i += 1) {
    const s = await phoneState(d);
    if (!s || !s.key) return null;
    if (s.label === label) return s;
    if (!(await pressIn(d, PHONE, w.next))) return null;
    await d.page.waitForTimeout(120);
  }
  return null;
}
// The card headed this, its words and its pressed pills.
const cardHeaded = (d, head) => d.page.evaluate(([r, h]) => {
  const top = Array.from(document.querySelectorAll(r + " div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === h);
  const card = top ? top.parentElement : null;
  return card ? { text: card.textContent || "", pills: Array.from(card.querySelectorAll("button[aria-pressed]")).map((b) => ({ name: b.getAttribute("aria-label"), pressed: b.getAttribute("aria-pressed") === "true" })) } : null;
}, [ROOT, head]);
// The line the list draws once a draft is published.
const publishedLine = (d, prefix) => d.page.evaluate(([sel, p]) => {
  const box = document.querySelector(sel) || document.body;
  const el = Array.from(box.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").indexOf(p) === 0);
  return el ? (el.textContent || "").trim() : null;
}, [CONTENT, prefix]);
// The codes of the rows the list draws.
const listedCodes = (d) => d.page.evaluate((sel) => {
  const box = document.querySelector(sel) || document.body;
  return Array.from(box.querySelectorAll("table tbody tr")).map((tr) => { const td = tr.querySelectorAll("td"); return td[1] ? (td[1].textContent || "").trim() : ""; });
}, CONTENT);
const rowOf = (d, code) => d.page.evaluate(([sel, c]) => {
  const box = document.querySelector(sel) || document.body;
  const tr = Array.from(box.querySelectorAll("table tbody tr")).find((x) => { const td = x.querySelectorAll("td"); return td[1] && (td[1].textContent || "").trim() === c; });
  if (!tr) return null;
  const td = tr.querySelectorAll("td");
  return { version: (td[2].textContent || "").trim(), badges: Array.from(td[3].querySelectorAll("span")).filter((s) => s.children.length === 0).map((s) => (s.textContent || "").trim()) };
}, [CONTENT, code]);
const waitGone = async (d, sel, ms) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if ((await d.page.locator(sel).count()) === 0) return true;
    await d.page.waitForTimeout(100);
  }
  return false;
};

async function run({ d, results, seed, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const b = BUFFER[lang] || BUFFER.en;
  const tail = "/" + lang;
  const other = lang === "es" ? "en" : "es";

  // ---- an admin opens the floor buffer sign-out's open draft from its Edit
  stubs.reset();
  await d.signOutHard();
  await d.signIn("admin");
  let mark = d.mark();
  await d.goto("form-builder");
  const listed = lastCall(d, mark, "GET", "/api/form-builder/forms");
  const forms = listed && listed.json && Array.isArray(listed.json.forms) ? listed.json.forms : [];
  const buffer = forms.find((f) => f.code === BUFFER_CODE) || null;
  const draftPath = "/api/form-builder/drafts/" + (buffer && buffer.draft ? buffer.draft.id : "none");

  // ---- a draft that does not load says the page's line with Back and Try again, and Try again reads it
  stubs.setRefusal({ method: "GET", path: draftPath, status: 500, code: SERVER_ERROR.code, error: SERVER_ERROR[lang] });
  const failOpened = buffer ? await pressIn(d, CONTENT, w.edit + " " + b.title) : false;
  await d.settle(500);
  const failedBody = await d.bodyText();
  const failedButtons = await d.visibleButtons();
  stubs.clearRefusals();
  mark = d.mark();
  const retried = failedButtons.indexOf(w.tryAgain) >= 0 ? await pressIn(d, CONTENT, w.tryAgain) : false;
  await d.settle(500);
  const draftAgain = lastCall(d, mark, "GET", draftPath);
  const loaded = (await d.page.locator(ROOT).count()) === 1;
  results.check("page", "page/form-builder/builder/a-failed-draft-says-so" + tail,
    failOpened && failedBody.indexOf(w.notLoaded) >= 0 && failedBody.indexOf(SERVER_ERROR[lang]) < 0 && failedButtons.indexOf(w.back) >= 0 && retried && !!draftAgain && draftAgain.status === 200 && loaded,
    !failOpened ? "no " + JSON.stringify(w.edit) + " named for " + BUFFER_CODE + " on the list"
      : failedBody.indexOf(w.notLoaded) < 0 ? "a refused draft draws " + JSON.stringify(failedBody.slice(0, 90)) + " where it should say " + JSON.stringify(w.notLoaded)
        : failedBody.indexOf(SERVER_ERROR[lang]) >= 0 ? "a refused draft draws the API's words " + JSON.stringify(SERVER_ERROR[lang]) + " beside the page's line"
          : failedButtons.indexOf(w.back) < 0 || !retried ? "a refused draft offers " + JSON.stringify(failedButtons.filter((x) => x.length < 40)) + " where it should offer " + JSON.stringify([w.back, w.tryAgain])
            : !draftAgain ? JSON.stringify(w.tryAgain) + " read nothing" : "after " + JSON.stringify(w.tryAgain) + " the builder did not draw");
  await d.goto("form-builder");

  mark = d.mark();
  const edited = buffer ? await pressIn(d, CONTENT, w.edit + " " + b.title) : false;
  await d.settle(600);
  const starts = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/form-builder/drafts");
  const read = lastCall(d, mark, "GET", draftPath);
  const head = await builderHead(d);
  const talk = await conversation(d);
  const stored = read && read.json && Array.isArray(read.json.conversation) ? read.json.conversation : [];
  const wantTalk = stored.map((m) => ({ head: (m.role === "user" ? w.you : w.builderName) + " . " + STORED_AT[lang], text: m.text }));
  const openProblems = await problemLines(d, w.problemsHead);
  const openPhone = await walkPhone(d, w);
  const wantHead = { title: b.title, sub: [BUFFER_CODE, say(w.version, 1), w.draft].join(" . ") };
  results.check("page", "page/form-builder/builder/reads-the-draft" + tail,
    edited && starts.length === 0 && !!read && read.query === "" && read.locale === lang && same(head, wantHead) && stored.length === 2 && !!talk && same(talk.lines, wantTalk)
      && same(openProblems, PROBLEMS[lang].before) && same(openPhone.labels, b.before) && openPhone.line === say(w.question, 1, 2),
    !edited ? "no " + JSON.stringify(w.edit) + " named for " + BUFFER_CODE + " on the list" : starts.length ? "Edit started a draft for a form whose draft is open"
      : !read ? "Edit opened the draft without reading GET " + draftPath + ", the page reads " + JSON.stringify((await d.bodyText()).slice(0, 80))
        : read.query !== "" || read.locale !== lang ? "the draft was read with " + JSON.stringify(read.query) + " and locale " + read.locale
          : !same(head, wantHead) ? "the header reads " + JSON.stringify(head) + " where it should read " + JSON.stringify(wantHead)
            : !talk || !same(talk.lines, wantTalk) ? "the conversation draws " + JSON.stringify(talk && talk.lines) + " where the read sent " + JSON.stringify(wantTalk)
              : !same(openProblems, PROBLEMS[lang].before) ? "the problems read " + JSON.stringify(openProblems) + " where they should read " + JSON.stringify(PROBLEMS[lang].before)
                : "the Staff app asks " + JSON.stringify(openPhone.labels) + " under " + JSON.stringify(openPhone.line) + " where the read sent " + JSON.stringify(b.before));

  // ---- a turn: while it is out Send is off and the builder is working
  const typed = await typeInto(d, w.write, TURN[lang]);
  stubs.setDelay(draftPath + "/message", 1500);
  mark = d.mark();
  const sent = typed ? await pressSend(d, w.write) : false;
  await d.page.waitForTimeout(450);
  const busy = await conversation(d);
  const busyBox = await messageBox(d, w.write);
  await waitGone(d, ROOT + " [data-builder-working]", 6000);
  stubs.clearDelays();
  await d.settle(300);
  results.check("page", "page/form-builder/builder/a-turn-is-working" + tail,
    sent && !!busy && busy.working === w.working && !!busyBox && !!busyBox.send && busyBox.send.disabled && busyBox.send.text === w.sending,
    !typed ? "no box named " + JSON.stringify(w.write) : !sent ? "no live Send beside the box"
      : !busy || busy.working !== w.working ? "while the turn is out the conversation says " + JSON.stringify(busy && busy.working) + " where it should say " + JSON.stringify(w.working)
        : "while the turn is out the button reads " + JSON.stringify(busyBox && busyBox.send));

  // ---- the answer: the person's line and the reply, and the box emptied
  const turn = lastCall(d, mark, "POST", draftPath + "/message");
  const answered = await conversation(d);
  const afterBox = await messageBox(d, w.write);
  const reply = turn && turn.json ? turn.json.reply : null;
  const wantLast = [{ head: w.you + " . " + NOW_AT[lang], text: TURN[lang] }, { head: w.builderName + " . " + NOW_AT[lang], text: reply }];
  results.check("page", "page/form-builder/builder/the-conversation-reads-the-answer" + tail,
    !!turn && turn.status === 200 && same(turn.body, { text: TURN[lang] }) && !!answered && answered.lines.length === 4 && same(answered.lines.slice(2), wantLast) && !!afterBox && afterBox.value === "",
    !turn ? "Send posted nothing to " + draftPath + "/message" : !same(turn.body, { text: TURN[lang] }) ? "the turn sent " + JSON.stringify(turn.body)
      : !answered || !same(answered.lines.slice(2), wantLast) ? "the conversation ends " + JSON.stringify(answered && answered.lines.slice(-2)) + " where it should end " + JSON.stringify(wantLast)
        : answered.lines.length !== 4 ? "the conversation holds " + answered.lines.length + " lines after one turn on two" : "the box still holds " + JSON.stringify(afterBox && afterBox.value));

  // ---- the preview is the answer's: three questions in play where there were two
  const afterPhone = await walkPhone(d, w);
  const answerLabels = turn && turn.json && turn.json.preview ? turn.json.preview.fields.filter((f) => !f.appliesWhen).map((f) => f.label) : null;
  results.check("page", "page/form-builder/builder/the-preview-reads-the-answer" + tail,
    same(answerLabels, b.after) && same(afterPhone.labels, b.after) && afterPhone.line === say(w.question, 1, 3) && afterPhone.title === b.title,
    !answerLabels ? "no turn was answered, and the page draws no Staff app preview"
      : !same(answerLabels, b.after) ? "the answer's preview asks " + JSON.stringify(answerLabels)
        : "after the answer the Staff app asks " + JSON.stringify(afterPhone.labels) + " under " + JSON.stringify(afterPhone.line) + " where the answer sent " + JSON.stringify(b.after));

  // ---- the problems are the answer's, and with one left Publish is off
  const afterProblems = await problemLines(d, w.problemsHead);
  results.check("page", "page/form-builder/builder/the-problems-read-the-answer" + tail, same(afterProblems, PROBLEMS[lang].after),
    afterProblems === null ? "the page draws no list headed " + JSON.stringify(w.problemsHead)
      : "after the answer the problems read " + JSON.stringify(afterProblems) + " where they should read " + JSON.stringify(PROBLEMS[lang].after));
  const offPublish = await buttonsReading(d, ROOT, w.publish);
  const fixLine = await d.bodyHas(w.fixFirst);
  results.check("page", "page/form-builder/builder/no-publish-with-problems" + tail, fixLine && offPublish.length === 1 && offPublish[0].disabled,
    !fixLine ? "with a problem left the page does not say " + JSON.stringify(w.fixFirst) : "with a problem left the publish buttons are " + JSON.stringify(offPublish));

  // ---- a refused turn: the API's words under the person's line, and the words back in the box
  stubs.setRefusal({ method: "POST", path: draftPath + "/message", status: 503, code: MODEL_FAILED.code, error: MODEL_FAILED[lang], once: true });
  const typedAgain = await typeInto(d, w.write, REFUSED[lang]);
  mark = d.mark();
  const sentAgain = typedAgain ? await pressSend(d, w.write) : false;
  await d.settle(400);
  stubs.clearRefusals();
  const refused = lastCall(d, mark, "POST", draftPath + "/message");
  const afterRefusal = await conversation(d);
  const refusedBox = await messageBox(d, w.write);
  const lastLine = afterRefusal && afterRefusal.lines.length ? afterRefusal.lines[afterRefusal.lines.length - 1] : null;
  results.check("page", "page/form-builder/builder/a-refused-turn-says-the-apis-words" + tail,
    sentAgain && !!refused && refused.status === 503 && !!afterRefusal && afterRefusal.refusal === MODEL_FAILED[lang] && afterRefusal.refusalUnderLast
      && same(lastLine, { head: w.you + " . " + NOW_AT[lang], text: REFUSED[lang] }) && !!refusedBox && refusedBox.value === REFUSED[lang],
    !sentAgain ? "no live Send for a second turn" : !refused || refused.status !== 503 ? "the refused turn was not sent"
      : !afterRefusal || afterRefusal.refusal !== MODEL_FAILED[lang] ? "the refusal draws " + JSON.stringify(afterRefusal && afterRefusal.refusal) + " where the API wrote " + JSON.stringify(MODEL_FAILED[lang])
        : !afterRefusal.refusalUnderLast || !same(lastLine, { head: w.you + " . " + NOW_AT[lang], text: REFUSED[lang] }) ? "the refusal is not under the person's line, which reads " + JSON.stringify(lastLine)
          : "the box holds " + JSON.stringify(refusedBox && refusedBox.value) + " where the words should be back");

  // ---- the other language: the draft read again with locale= that language, and its questions drawn
  const o = BUFFER[other];
  mark = d.mark();
  const switched = await pressIn(d, ROOT, LANGUAGE_NAMES[other]);
  await d.settle(500);
  const otherRead = lastCall(d, mark, "GET", draftPath, (c) => c.locale === other);
  const otherPhone = await walkPhone(d, w);
  const otherLabels = otherRead && otherRead.json && otherRead.json.preview ? otherRead.json.preview.fields.filter((f) => !f.appliesWhen).map((f) => f.label) : null;
  results.check("page", "page/form-builder/builder/the-other-language-reads-its-own" + tail,
    switched && !!otherRead && otherRead.status === 200 && otherRead.query === "" && same(otherLabels, o.after) && same(otherPhone.labels, o.after) && otherPhone.title === o.title,
    !switched ? "no " + JSON.stringify(LANGUAGE_NAMES[other]) + " beside the preview" : !otherRead ? "the switch read nothing with locale=" + other
      : !same(otherLabels, o.after) ? "the read with locale=" + other + " sent " + JSON.stringify(otherLabels)
        : "the Staff app reads " + JSON.stringify(otherPhone.title) + " and asks " + JSON.stringify(otherPhone.labels) + " where the read sent " + JSON.stringify(o.after));
  await pressIn(d, ROOT, LANGUAGE_NAMES[lang]);
  await d.settle(300);

  // ---- Try it: the governing question off before, live after, and the governed one appears
  const offAt = await walkTo(d, w, b.governing);
  mark = d.mark();
  const tried = await pressIn(d, ROOT, w.tryIt);
  await d.settle(300);
  const testLine = await d.bodyHas(w.testFilling);
  const onAt = await walkTo(d, w, b.governing);
  const picked = onAt ? await d.page.locator(PHONE + " select").first().selectOption({ label: b.damaged }, { timeout: 3000 }).then(() => true).catch(() => false) : false;
  await d.page.waitForTimeout(250);
  const afterPick = await phoneState(d);
  const moved = picked ? await pressIn(d, PHONE, w.next) : false;
  await d.page.waitForTimeout(150);
  const governed = await phoneState(d);
  const reached = d.callsSince(mark).filter((c) => c.method !== "GET" || c.path.indexOf("/api/form-builder/") === 0 || c.path.indexOf("/api/forms") === 0);
  results.check("page", "page/form-builder/builder/try-it-opens-the-governed-question" + tail,
    !!offAt && !!offAt.select && offAt.select.disabled && tried && testLine && !!onAt && onAt.line === say(w.question, 3, 3) && picked
      && !!afterPick && afterPick.line === say(w.question, 3, 5) && moved && !!governed && governed.label === b.governed && reached.length === 0,
    !offAt ? "the Staff app never asks " + JSON.stringify(b.governing) : !offAt.select || !offAt.select.disabled ? "before Try it the pick is live: " + JSON.stringify(offAt.select)
      : !tried ? "no " + JSON.stringify(w.tryIt) : !testLine ? "Try it does not say " + JSON.stringify(w.testFilling)
        : !onAt || !picked ? "with Try it on, " + JSON.stringify(b.damaged) + " could not be picked for " + JSON.stringify(b.governing)
          : onAt.line !== say(w.question, 3, 3) || !afterPick || afterPick.line !== say(w.question, 3, 5) ? "the count reads " + JSON.stringify(onAt.line) + " then " + JSON.stringify(afterPick && afterPick.line)
            : !governed || governed.label !== b.governed ? "Next shows " + JSON.stringify(governed && governed.label) + " where " + JSON.stringify(b.governed) + " should appear"
              : "the test filling reached " + reached.map((c) => c.method + " " + c.path).join(", "));

  // ---- the PDF tab: the sample in the preview's language, in a frame, with Download PDF
  mark = d.mark();
  const pdfTab = await pressIn(d, ROOT, w.pdfTab);
  await d.settle(700);
  const pdfRead = lastCall(d, mark, "GET", draftPath + "/pdf");
  const pdfShown = await d.page.evaluate(([r, word]) => {
    const frame = document.querySelector(r + " iframe");
    const link = Array.from(document.querySelectorAll(r + " a[download]")).find((a) => (a.textContent || "").trim() === word);
    return { src: frame ? frame.getAttribute("src") : null, download: link ? link.getAttribute("download") : null, href: link ? link.getAttribute("href") : null };
  }, [ROOT, w.download]);
  results.check("page", "page/form-builder/builder/the-sample-pdf" + tail,
    pdfTab && !!pdfRead && pdfRead.status === 200 && pdfRead.query === "" && pdfRead.locale === lang && !!pdfShown.src && pdfShown.src.indexOf("blob:") === 0
      && pdfShown.download === SAMPLE[lang] && pdfShown.href === pdfShown.src,
    !pdfTab ? "no " + JSON.stringify(w.pdfTab) + " tab" : !pdfRead ? "the tab read no sample" : pdfRead.locale !== lang ? "the sample was read with locale " + pdfRead.locale
      : !pdfShown.src ? "no frame holds the sample" : "the link reads " + JSON.stringify(pdfShown) + " where it should download " + SAMPLE[lang]);

  // ---- Discard draft asks first, then discards, and the list no longer holds the draft
  mark = d.mark();
  const discardAsked = await pressIn(d, ROOT, w.discard);
  await d.settle(200);
  const ask = await d.page.evaluate((r) => { const x = document.querySelector(r + " [data-discard-window]"); return x ? (x.textContent || "") : null; }, ROOT);
  const early = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === draftPath + "/discard").length;
  const confirmed = ask !== null ? await pressIn(d, ROOT + " [data-discard-window]", w.discard) : false;
  await d.settle(600);
  const discarded = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === draftPath + "/discard");
  const leftHash = await hashOf(d);
  const leftCodes = await listedCodes(d);
  results.check("page", "page/form-builder/builder/discard-asks-first" + tail,
    discardAsked && !!ask && ask.indexOf(w.discardAsk) >= 0 && early === 0 && confirmed && discarded.length === 1 && discarded[0].status === 200
      && leftHash === "#form-builder" && leftCodes.length > 0 && leftCodes.indexOf(BUFFER_CODE) < 0,
    !discardAsked ? "no " + JSON.stringify(w.discard) + " on the builder" : !ask || ask.indexOf(w.discardAsk) < 0 ? "Discard draft does not ask " + JSON.stringify(w.discardAsk)
      : early ? "the draft was discarded before the question was answered" : discarded.length !== 1 ? "the draft was discarded " + discarded.length + " times"
        : "after the discard the address reads " + JSON.stringify(leftHash) + " and the list holds " + JSON.stringify(leftCodes));

  // ---- the complaint log's draft: who gets the filled report, sent whole with the delivery
  mark = d.mark();
  await d.goto("form-builder");
  const complaint = (lastCall(d, mark, "GET", "/api/form-builder/forms") || { json: { forms: [] } }).json.forms.find((f) => f.code === COMPLAINT) || null;
  const complaintPath = "/api/form-builder/drafts/" + (complaint && complaint.draft ? complaint.draft.id : "none");
  mark = d.mark();
  const complaintOpened = complaint ? await pressIn(d, CONTENT, w.edit + " " + COMPLAINT_TITLE[lang]) : false;
  await d.settle(600);
  const complaintRead = lastCall(d, mark, "GET", complaintPath);
  const who = await cardHeaded(d, w.whoGets);
  const pillOn = (card, name) => { const p = card ? card.pills.find((x) => x.name === name) : null; return p ? p.pressed : null; };
  mark = d.mark();
  const toLink = await pressIn(d, ROOT, w.linkApp);
  await d.settle(400);
  const patched = lastCall(d, mark, "PATCH", complaintPath);
  const whoAfter = await cardHeaded(d, w.whoGets);
  const sentList = complaintRead && complaintRead.json && complaintRead.json.draft ? complaintRead.json.draft.recipients : null;
  results.check("page", "page/form-builder/builder/who-gets-the-report-sends-the-list" + tail,
    !!who && RECIPIENTS.every((x) => who.text.indexOf(x) >= 0) && who.text.indexOf(w.emailOnly) >= 0 && pillOn(who, w.pdfAttached) === true && toLink
      && !!patched && patched.status === 200 && same(patched.body, { recipients: sentList, delivery: "app_link" }) && pillOn(whoAfter, w.linkApp) === true && pillOn(whoAfter, w.pdfAttached) === false,
    !complaintOpened ? "no " + JSON.stringify(w.edit) + " named for " + COMPLAINT : !who ? "the builder draws no " + JSON.stringify(w.whoGets)
      : !RECIPIENTS.every((x) => who.text.indexOf(x) >= 0) || who.text.indexOf(w.emailOnly) < 0 ? "the card reads " + JSON.stringify(who.text.slice(0, 160))
        : pillOn(who, w.pdfAttached) !== true ? "the draft's delivery pdf is not the pressed pill: " + JSON.stringify(who.pills)
          : !patched ? JSON.stringify(w.linkApp) + " sent nothing" : !same(patched.body, { recipients: sentList, delivery: "app_link" }) ? "the change sent " + JSON.stringify(patched.body)
            : "after the change the pills read " + JSON.stringify(whoAfter && whoAfter.pills));

  // ---- Publish, for an admin with no problems: What changed, the note sent, and the list's line
  const clean = await d.bodyHas(w.noProblems);
  const ready = await d.bodyHas(w.publishLine);
  const opened = await pressIn(d, ROOT, w.publish);
  await d.settle(200);
  const noteBox = await typeInto(d, w.whatChanged, NOTE[lang]);
  mark = d.mark();
  const posted = noteBox ? await pressIn(d, ROOT, w.publish) : false;
  await d.settle(700);
  const pub = lastCall(d, mark, "POST", complaintPath + "/publish");
  const reread = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/form-builder/forms").length;
  const prefix = w.publishedAs.split("{0}")[0];
  const line = await publishedLine(d, prefix);
  const wantLine = say(w.publishedAs, 3) + " " + COMPLAINT_TITLE[lang];
  const row = await rowOf(d, COMPLAINT);
  results.check("page", "page/form-builder/builder/publish-as-an-admin" + tail,
    clean && ready && opened && noteBox && posted && !!pub && pub.status === 200 && same(pub.body, { changeNote: NOTE[lang] }) && line === wantLine && reread >= 1
      && !!row && row.version === say(w.version, 3) && same(row.badges, [w.published]),
    !clean || !ready ? "a draft with no problems does not say " + JSON.stringify(w.noProblems) + " and " + JSON.stringify(w.publishLine)
      : !opened || !noteBox ? JSON.stringify(w.publish) + " did not open " + JSON.stringify(w.whatChanged) : !pub ? "Publish posted nothing"
        : !same(pub.body, { changeNote: NOTE[lang] }) ? "Publish sent " + JSON.stringify(pub.body)
          : line !== wantLine ? "the list says " + JSON.stringify(line) + " where it should say " + JSON.stringify(wantLine)
            : "after the publish the list read " + reread + " times and the row reads " + JSON.stringify(row));

  // ---- a supervisor who holds build_forms reads the line where Publish would be
  stubs.reset();
  stubs.state.overrides[seed.PEOPLE.supervisor.id] = { build_forms: true };
  await d.signOutHard();
  await d.signIn("supervisor");
  mark = d.mark();
  await d.goto("form-builder");
  const supComplaint = (lastCall(d, mark, "GET", "/api/form-builder/forms") || { json: { forms: [] } }).json.forms.find((f) => f.code === COMPLAINT) || null;
  const supOpened = supComplaint ? await pressIn(d, CONTENT, w.edit + " " + COMPLAINT_TITLE[lang]) : false;
  await d.settle(600);
  const onlyAdmin = await d.bodyHas(w.onlyAdmin);
  const supPublish = await buttonsReading(d, ROOT, w.publish);
  const supRoot = await d.page.locator(ROOT).count();
  results.check("page", "page/form-builder/builder/a-supervisor-cannot-publish" + tail, supOpened && supRoot === 1 && onlyAdmin && supPublish.length === 0,
    !supOpened ? "a supervisor holding build_forms finds no " + JSON.stringify(w.edit) + " for " + COMPLAINT : supRoot !== 1 ? "the draft did not open in the builder"
      : !onlyAdmin ? "a supervisor's builder does not say " + JSON.stringify(w.onlyAdmin) : "a supervisor is offered " + supPublish.length + " " + JSON.stringify(w.publish) + " buttons");

  stubs.reset();
  results.note("The builder in " + lang + ": a draft read, a turn, a refusal, the other language, Try it, the sample, Discard, who gets the report, Publish and a supervisor");
}

module.exports = { run };
