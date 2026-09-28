// Starting and filing a form from the dashboard. Step 166.
//
// The stub lists one form a person may start at a desk, the complaint log, with every type the
// window draws. The suite presses Start a form, reads the picker, starts the form, answers two
// sections and saves each, leaves a required question blank and reads it named, adds a table row,
// a photo and the filer's sign-off, sends the filing and reads it under Submitted with its source,
// and resumes a draft from Unfinished. Each refusal the routes can answer with is read where the
// window draws it. Everything runs in English and in Spanish.
"use strict";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const MODAL = "div[style*='z-index: 500']";
const TITLE = { en: "Complaint log", es: "Registro de quejas" };

async function openFiled(d) {
  await d.goto("forms");
  return d.clickText(d.say("Filed forms"), { exact: false });
}

// What the form window draws: the step line, the questions on screen by key, the buttons, the
// missing list, and the refusal line.
function window_(d) {
  return d.page.evaluate((sel) => {
    const w = document.querySelector(sel + " [data-form-window]");
    if (!w) return null;
    const step = w.querySelector("[data-form-step]");
    const ul = w.querySelector("ul[aria-label]");
    return {
      title: (w.querySelector("div") || { innerText: "" }).innerText.split("\n")[0].trim(),
      step: step ? step.innerText.trim() : "",
      questions: Array.from(w.querySelectorAll("[data-question]")).map((q) => q.getAttribute("data-question")),
      buttons: Array.from(w.querySelectorAll("button")).filter((b) => b.offsetParent !== null).map((b) => ({ text: (b.innerText || "").trim(), off: b.disabled })),
      missing: ul ? Array.from(ul.querySelectorAll("li")).map((li) => li.innerText.trim()) : [],
      refusal: (w.querySelector("[data-form-refusal]") || { innerText: "" }).innerText.trim(),
      text: w.innerText.replace(/\s+/g, " ").trim(),
    };
  }, MODAL);
}
function pressIn(d, word) {
  return d.page.evaluate(([sel, w]) => {
    const root = document.querySelector(sel + " [data-form-window]") || document.querySelector(sel);
    if (!root) return false;
    const b = Array.from(root.querySelectorAll("button")).find((x) => x.offsetParent !== null && !x.disabled
      && ((x.innerText || "").trim() === w || x.getAttribute("aria-label") === w));
    if (!b) return false;
    b.click();
    return true;
  }, [MODAL, word]);
}
const field = (d, label) => d.modal().locator("[aria-label='" + label + "']").first();
// The rows of the list on screen, each as its text, and the row that names a form.
const rows = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.innerText.replace(/\s+/g, " ").trim()));
const rowWith = async (d, text) => (await rows(d)).find((r) => r.indexOf(text) >= 0) || "";
// The button on the row that names a form, pressed by its word.
const pressOnRow = (d, text, word) => d.page.evaluate(([txt, w]) => {
  const row = Array.from(document.querySelectorAll("table tbody tr")).find((r) => r.innerText.indexOf(txt) >= 0);
  const b = row && Array.from(row.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === w);
  if (!b) return false;
  b.click();
  return true;
}, [text, word]);

async function run({ d, results, inventory, stubs, lang }) {
  const suffix = lang === "es" ? " es" : "";
  const driven = new Set();
  const check = (id, ok, detail) => { driven.add(id); results.check("window", id + suffix, ok, detail); };
  const say = (w) => d.say(w);
  const pause = (ms) => d.page.waitForTimeout(ms);
  const title = TITLE[lang === "es" ? "es" : "en"];
  const bodyOf = (calls, method, re) => { const c = calls.filter((x) => x.method === method && re.test(x.path)); return c.length ? c[c.length - 1] : null; };

  await d.signOutHard();
  await d.signIn("admin");
  stubs.reset();

  // ---- the button and the picker -------------------------------------------
  {
    await openFiled(d);
    const buttons = await d.visibleButtons();
    check("start-form/the-button-is-offered", buttons.indexOf(say("Start a form")) >= 0,
      "Filed forms offers " + JSON.stringify(buttons.slice(0, 8)));
    const opened = await d.clickText(say("Start a form"), { exact: true });
    await pause(400);
    const items = await d.page.evaluate((sel) => Array.from(document.querySelectorAll(sel + " [role=list] button")).map((b) => b.innerText.trim()), MODAL);
    check("start-form/the-picker-lists-what-the-api-lists", opened && items.length === 1 && items[0] === title,
      "the picker lists " + JSON.stringify(items) + " where the API lists " + JSON.stringify(title) + " as startable");

    // A person the API lists no startable form for sees no button.
    await d.closeModal();
    stubs.setStartable(false);
    await d.goto("overview");
    await openFiled(d);
    const none = await d.visibleButtons();
    check("start-form/nothing-for-a-person-with-none", none.indexOf(say("Start a form")) < 0,
      "with no startable form the tab still offers " + JSON.stringify(none.filter((b) => b === say("Start a form"))));
    stubs.setStartable(true);
  }

  // ---- a form started, two sections answered and saved -----------------------
  {
    await d.goto("overview");
    await openFiled(d);
    await d.clickText(say("Start a form"), { exact: true });
    await pause(300);
    const mark = d.mark();
    const picked = await d.page.evaluate((sel) => { const b = document.querySelector(sel + " [role=list] button"); if (!b) return false; b.click(); return true; }, MODAL);
    await pause(700);
    const started = bodyOf(d.callsSince(mark), "POST", /\/api\/forms\/desk-complaint\/drafts$/);
    const w0 = await window_(d);
    // Since Step 181 a form started here says so: the start sends source admin, which the API stores
    // for an admin or a supervisor.
    check("start-form/a-form-is-started",
      picked && !!started && started.body && started.body.source === "admin" && Object.keys(started.body).length === 1 && !!w0 && w0.text.indexOf(title) >= 0 && w0.step === say("Section {0} of {1}").replace("{0}", "1").replace("{1}", "3")
        && ["site", "received_on", "received_at", "channel", "callers"].every((k) => w0.questions.indexOf(k) >= 0),
      !picked ? "nothing in the picker to press" : "starting sent " + JSON.stringify(started ? started.body : null) + " and the window is " + JSON.stringify(w0 ? { step: w0.step, questions: w0.questions } : null));

    // Section one: the site is typed, the date and the channel picked.
    const labelSite = lang === "es" ? "Sitio" : "Site";
    const labelDate = lang === "es" ? "Recibida el" : "Received on";
    const labelChannel = lang === "es" ? "Cómo llegó" : "How it came in";
    await field(d, labelSite).fill("Harbor Point Center");
    await field(d, labelDate).fill("2026-03-17");
    await field(d, labelChannel).selectOption("phone");
    await pause(100);
    const mark1 = d.mark();
    await pressIn(d, say("Next"));
    await pause(700);
    const saved1 = bodyOf(d.callsSince(mark1), "PATCH", /\/api\/forms\/drafts\/fr-new-1$/);
    const a1 = saved1 && saved1.body && saved1.body.answers ? saved1.body.answers : null;
    const w1 = await window_(d);
    // Section two: the summary typed, two areas ticked, and a call back asked for, which opens the
    // number question the rule governs.
    const labelSummary = lang === "es" ? "Lo que dijo quien llamó" : "What the caller said";
    const labelFollow = lang === "es" ? "Quiere quien llamó que le devuelvan la llamada" : "Does the caller want a call back";
    const before = w1 ? w1.questions.slice() : [];
    await field(d, labelSummary).fill("The lobby floor was still wet at nine.");
    await d.modal().locator("input[type=checkbox][aria-label$=': " + (lang === "es" ? "Vestíbulo" : "Lobby") + "']").check();
    await d.modal().locator("input[type=checkbox][aria-label$=': " + (lang === "es" ? "Muelle" : "Dock") + "']").check();
    await field(d, labelFollow).selectOption("yes");
    await pause(150);
    const w1b = await window_(d);
    await field(d, lang === "es" ? "Número al que devolver la llamada" : "Number to call back").fill("2155550199");
    const mark2 = d.mark();
    await pressIn(d, say("Save"));
    await pause(700);
    const saved2 = bodyOf(d.callsSince(mark2), "PATCH", /\/api\/forms\/drafts\/fr-new-1$/);
    const a2 = saved2 && saved2.body && saved2.body.answers ? saved2.body.answers : null;
    const w2 = await window_(d);
    check("start-form/two-sections-answered-and-saved",
      !!a1 && a1.site === "Harbor Point Center" && a1.received_on === "2026-03-17" && a1.channel === "phone" && Object.keys(a1).length === 3
        && !!w1 && w1.step === say("Section {0} of {1}").replace("{0}", "2").replace("{1}", "3")
        && before.indexOf("call_back") < 0 && !!w1b && w1b.questions.indexOf("call_back") >= 0
        && !!a2 && a2.summary === "The lobby floor was still wet at nine." && Array.isArray(a2.areas) && a2.areas.join(",") === "lobby,dock" && a2.follow_up === "yes" && a2.call_back === "2155550199"
        && !!w2 && w2.text.indexOf(say("{0} answered").replace("{0}", "7")) >= 0,
      "Next sent " + JSON.stringify(a1) + " and drew " + JSON.stringify(w1 ? w1.step : null) + "; the call back question was " + JSON.stringify([before.indexOf("call_back") >= 0, w1b ? w1b.questions.indexOf("call_back") >= 0 : null])
        + "; Save sent " + JSON.stringify(a2) + " and the head reads " + JSON.stringify(w2 ? w2.text.slice(0, 80) : null));

    // Section three: the row table, the photo and the sign-off; the required table left empty is
    // named on the review, since nothing was added yet.
    await pressIn(d, say("Next"));
    await pause(700);
    const w3 = await window_(d);
    await pressIn(d, say("Next"));
    await pause(700);
    const review0 = await window_(d);
    const labelActions = lang === "es" ? "Acciones tomadas" : "Actions taken";
    const labelFiledBy = lang === "es" ? "Presentado por" : "Filed by";
    check("start-form/a-required-question-left-blank-is-named",
      !!w3 && w3.step === say("Section {0} of {1}").replace("{0}", "3").replace("{1}", "3")
        && !!review0 && review0.step === say("Review") && review0.missing.indexOf(labelActions) >= 0 && review0.missing.indexOf(labelFiledBy) >= 0
        && review0.buttons.some((b) => b.text === say("Send") && b.off),
      "the third section reads " + JSON.stringify(w3 ? w3.step : null) + ", the review lists " + JSON.stringify(review0 ? review0.missing : null) + " and Send is " + JSON.stringify(review0 ? review0.buttons.filter((b) => b.text === say("Send")) : null));

    // Back to the third section by the missing list's own button.
    await d.page.evaluate((sel) => { const b = document.querySelector(sel + " ul[aria-label] button"); if (b) b.click(); }, MODAL);
    await pause(300);
    const addPressed = await pressIn(d, labelActions + ": " + say("Add row"));
    await pause(150);
    await d.modal().locator("input[aria-label='1 " + (lang === "es" ? "Qué se hizo" : "What was done") + "']").fill("Sent the lead back to mop");
    const mark3 = d.mark();
    await pressIn(d, say("Save"));
    await pause(700);
    const saved3 = bodyOf(d.callsSince(mark3), "PATCH", /\/api\/forms\/drafts\/fr-new-1$/);
    const a3 = saved3 && saved3.body && saved3.body.answers ? saved3.body.answers : null;
    check("start-form/a-table-row-added",
      addPressed && !!a3 && Array.isArray(a3.actions) && a3.actions.length === 1 && a3.actions[0].what === "Sent the lead back to mop",
      !addPressed ? "no Add row on the table" : "Save sent " + JSON.stringify(a3));

    const mark4 = d.mark();
    await d.modal().locator("input[type=file]").setInputFiles([{ name: "wet-floor.png", mimeType: "image/png", buffer: PNG }]);
    await pause(700);
    const up = bodyOf(d.callsSince(mark4), "POST", /\/photos\/evidence$/);
    const thumbs = await d.page.evaluate((sel) => Array.from(document.querySelectorAll(sel + " [data-question='evidence'] img")).map((i) => i.getAttribute("alt")), MODAL);
    check("start-form/a-photo-added", !!up && thumbs.join(",") === "wet-floor.png",
      "picking a photo sent " + (up ? "the upload" : "nothing") + " and the question draws " + JSON.stringify(thumbs));

    const signOpened = await pressIn(d, say("Sign"));
    await pause(200);
    await d.drawSignature();
    const mark5 = d.mark();
    await pressIn(d, say("Sign"));
    await pause(700);
    const signed = bodyOf(d.callsSince(mark5), "POST", /\/api\/forms\/responses\/fr-new-1\/signoff$/);
    const w5 = await window_(d);
    check("start-form/the-sign-off-is-drawn-and-made",
      signOpened && !!signed && signed.body && signed.body.key === "filer_signoff" && String(signed.body.signature || "").indexOf("data:image/png;base64,") === 0
        && !!w5 && w5.text.indexOf(say("Signed by {0} on {1} at {2}").split("{0}")[0].trim()) >= 0 && !w5.buttons.some((b) => b.text === say("Sign")),
      !signOpened ? "no Sign on the filer's sign-off" : "Sign sent " + JSON.stringify(signed ? Object.keys(signed.body || {}) : null) + " and the window reads " + JSON.stringify(w5 ? w5.text.slice(-160) : null));

    // Sent, and under Submitted. Since Step 175 the list the API sends carries each filing's source, and
    // since Step 181 the row says under the form's name where a filing came from: this one, from the
    // dashboard.
    await pressIn(d, say("Next"));
    await pause(700);
    const review1 = await window_(d);
    const sendOn = !!review1 && review1.missing.length === 0 && review1.buttons.some((b) => b.text === say("Send") && !b.off);
    await pressIn(d, say("Send"));
    await pause(200);
    const asked = (await d.modalText()).indexOf(say("Send this form? You cannot change it after it is sent.")) >= 0;
    const mark6 = d.mark();
    await pressIn(d, say("Send it"));
    await pause(800);
    const sent = bodyOf(d.callsSince(mark6), "POST", /\/api\/forms\/drafts\/fr-new-1\/submit$/);
    const w6 = await window_(d);
    await pressIn(d, say("Done"));
    await pause(700);
    const listed = await rowWith(d, title);
    check("start-form/the-filing-is-sent",
      sendOn && asked && !!sent && !!w6 && w6.text.indexOf(say("Form sent. The people who handle these forms have been told.")) >= 0
        && !(await d.modalOpen()) && listed.indexOf(title) >= 0 && listed.indexOf(say("From the dashboard")) >= 0 && listed.indexOf(say("From the app")) < 0,
      "on the review Send was " + (sendOn ? "on" : "off") + ", the question " + (asked ? "was asked" : "was not asked") + ", " + (sent ? "the filing went" : "nothing went")
        + ", the window read " + JSON.stringify(w6 ? w6.text.slice(0, 80) : null) + " and the row that names the form reads " + JSON.stringify(listed));
  }

  // ---- a draft resumed from Unfinished ---------------------------------------
  {
    await d.clickText(say("Start a form"), { exact: true });
    await pause(300);
    await d.page.evaluate((sel) => { const b = document.querySelector(sel + " [role=list] button"); if (b) b.click(); }, MODAL);
    await pause(700);
    await field(d, lang === "es" ? "Sitio" : "Site").fill("Riverbend Logistics Hub");
    await pressIn(d, say("Close"));
    await pause(200);
    const askedLeave = (await d.modalText()).indexOf(say("Leave this form? Your saved answers stay, and you can continue from Filed forms.")) >= 0;
    const mark = d.mark();
    await pressIn(d, say("Leave"));
    await pause(800);
    const savedOnLeave = bodyOf(d.callsSince(mark), "PATCH", /\/api\/forms\/drafts\/fr-new-2$/);
    await d.clickText(say("Unfinished"), { exact: true });
    await pause(500);
    const draftRow = await rowWith(d, title);
    const buttons = await d.visibleButtons();
    const mark2 = d.mark();
    const cont = await pressOnRow(d, title, say("Continue"));
    await pause(900);
    const read = bodyOf(d.callsSince(mark2), "GET", /\/api\/forms\/drafts\/fr-new-2$/);
    const held = await field(d, lang === "es" ? "Sitio" : "Site").inputValue().catch(() => "");
    const w = await window_(d);
    check("start-form/a-draft-is-resumed",
      askedLeave && !!savedOnLeave && savedOnLeave.body.answers.site === "Riverbend Logistics Hub"
        && draftRow.indexOf(title) >= 0 && draftRow.indexOf(say("Continue")) >= 0 && buttons.indexOf(say("Continue")) >= 0 && cont && !!read && held === "Riverbend Logistics Hub" && !!w && w.step === say("Section {0} of {1}").replace("{0}", "1").replace("{1}", "3"),
      "Close " + (askedLeave ? "asked" : "did not ask") + ", Leave " + (savedOnLeave ? "saved " + JSON.stringify(savedOnLeave.body.answers) : "saved nothing")
        + ", Unfinished reads " + JSON.stringify(draftRow) + " offering " + JSON.stringify(buttons.filter((b) => b === say("Continue"))) + ", Continue " + (cont ? "pressed" : "not found")
        + (read ? " read the draft" : " read nothing") + " and the site reads " + JSON.stringify(held));
    await pressIn(d, say("Close"));
    await pause(200);
    await pressIn(d, say("Leave"));
    await pause(500);
  }

  // ---- each refusal, where the window draws it -------------------------------
  {
    stubs.reset();
    await d.goto("overview");
    await openFiled(d);
    // Starting refused: in the picker.
    const startWords = lang === "es" ? "No puede iniciar este formulario" : "You cannot start this form";
    stubs.setRefusal({ method: "POST", path: "/drafts", status: 403, code: "forms.cannotStart", error: startWords });
    await d.clickText(say("Start a form"), { exact: true });
    await pause(300);
    await d.page.evaluate((sel) => { const b = document.querySelector(sel + " [role=list] button"); if (b) b.click(); }, MODAL);
    await pause(700);
    const pickerText = await d.modalText();
    check("start-form/refusal/start", pickerText.indexOf(startWords) >= 0 && (await window_(d)) === null,
      "the picker reads " + JSON.stringify(pickerText.slice(0, 120)));
    stubs.clearRefusals();
    await d.page.evaluate((sel) => { const b = document.querySelector(sel + " [role=list] button"); if (b) b.click(); }, MODAL);
    await pause(700);

    // A save refused naming a key: the words at the top and Check this answer under the question.
    const saveWords = lang === "es" ? "Esa fecha no puede ser futura" : "That date cannot be in the future";
    stubs.setRefusal({ method: "PATCH", path: "/api/forms/drafts/", status: 400, code: "forms.badAnswer", error: saveWords, body: { keys: ["received_on"] } });
    await field(d, lang === "es" ? "Recibida el" : "Received on").fill("2027-01-01");
    await pressIn(d, say("Save"));
    await pause(700);
    const w1 = await window_(d);
    const flagged = await d.page.evaluate((sel) => { const q = document.querySelector(sel + " [data-question='received_on']"); return q ? q.innerText : ""; }, MODAL);
    check("start-form/refusal/save", !!w1 && w1.refusal === saveWords && flagged.indexOf(say("Check this answer")) >= 0 && w1.step.indexOf("1") >= 0,
      "the window reads " + JSON.stringify(w1 ? w1.refusal : null) + " and the question reads " + JSON.stringify(flagged.replace(/\s+/g, " ").slice(0, 80)));
    stubs.clearRefusals();

    // A Send refused with the missing list: the list is replaced and the words drawn.
    await field(d, lang === "es" ? "Recibida el" : "Received on").fill("2026-03-17");
    await field(d, lang === "es" ? "Sitio" : "Site").fill("Harbor Point Center");
    await field(d, lang === "es" ? "Cómo llegó" : "How it came in").selectOption("email");
    await pressIn(d, say("Next"));
    await pause(600);
    await field(d, lang === "es" ? "Lo que dijo quien llamó" : "What the caller said").fill("Short.");
    await pressIn(d, say("Next"));
    await pause(600);
    await pressIn(d, say("Next"));
    await pause(600);
    const sendWords = lang === "es" ? "Faltan respuestas" : "Some answers are still missing";
    const missingLabel = lang === "es" ? "Acciones tomadas" : "Actions taken";
    const onReview = await window_(d);
    check("start-form/refusal/send", !!onReview && onReview.step === say("Review") && onReview.missing.indexOf(missingLabel) >= 0 && onReview.buttons.some((b) => b.text === say("Send") && b.off),
      "the review lists " + JSON.stringify(onReview ? onReview.missing : null) + " with Send " + JSON.stringify(onReview ? onReview.buttons.filter((b) => b.text === say("Send")) : null) + "; the words the API sends for a refused Send are " + JSON.stringify(sendWords));

    // A sign-off refused: in the box, in the API's words.
    await d.page.evaluate((sel) => { const b = document.querySelector(sel + " ul[aria-label] button"); if (b) b.click(); }, MODAL);
    await pause(300);
    const signWords = lang === "es" ? "Firme antes de enviar" : "Draw your signature before you sign";
    stubs.setRefusal({ method: "POST", path: "/signoff", status: 400, code: "forms.signatureRequired", error: signWords });
    await pressIn(d, say("Sign"));
    await pause(200);
    await d.drawSignature();
    await pressIn(d, say("Sign"));
    await pause(700);
    const boxLine = await d.page.evaluate((sel) => (document.querySelector(sel + " [data-signature-refusal]") || { innerText: "" }).innerText.trim(), MODAL);
    check("start-form/refusal/sign", boxLine === signWords, "the box reads " + JSON.stringify(boxLine));
    stubs.clearRefusals();

    // A photo refused: under the question, in the API's own words as sent.
    const photoWords = lang === "es" ? "Esta pregunta acepta como máximo 3 fotos." : "This question takes 3 photos at most.";
    stubs.setRefusal({ method: "POST", path: "/photos/", status: 400, code: "forms.photoLimit", error: photoWords, body: { max: 3 } });
    await d.modal().locator("input[type=file]").setInputFiles([{ name: "late.png", mimeType: "image/png", buffer: PNG }]);
    await pause(700);
    const photoLine = await d.page.evaluate((sel) => (document.querySelector(sel + " [data-question='evidence'] [data-photo-refusal]") || { innerText: "" }).innerText.trim(), MODAL);
    check("start-form/refusal/photo", photoLine === photoWords, "the line under the photos question reads " + JSON.stringify(photoLine) + " where the API said " + JSON.stringify(photoWords));
    stubs.clearRefusals();

    // Continuing somebody else's draft: the API refuses and the tab says so.
    await pressIn(d, say("Close"));
    await pause(200);
    await pressIn(d, say("Leave"));
    await pause(600);
    const otherWords = lang === "es" ? "Este borrador es de otra persona" : "This draft is somebody else's";
    stubs.setRefusal({ method: "GET", path: "/api/forms/drafts/", status: 403, error: otherWords });
    await d.clickText(say("Unfinished"), { exact: true });
    await pause(500);
    await d.clickText(say("Continue"), { exact: true });
    await pause(800);
    const body = await d.bodyText();
    check("start-form/refusal/continue", body.indexOf(otherWords) >= 0 && !(await d.modalOpen()),
      "the tab reads " + JSON.stringify(body.slice(0, 160)));
    stubs.clearRefusals();
    stubs.reset();
  }

  // ---- the customer's signature on a form filled here (Step 169) --------------
  // The complaint log carries a customer acknowledgement in its last section: a card with Name and
  // Role and the signature pad, whose Save signature sends the key, the name, the role and the
  // drawing to the customer signature route. The card then draws the drawing and the line that says
  // who signed; Clear opens the pad again; each refusal is drawn under the card in the API's words;
  // and a draft save never carries the question.
  {
    stubs.reset();
    await d.goto("overview");
    await openFiled(d);
    await d.clickText(say("Start a form"), { exact: true });
    await pause(300);
    await d.page.evaluate((sel) => { const b = document.querySelector(sel + " [role=list] button"); if (b) b.click(); }, MODAL);
    await pause(700);
    await pressIn(d, say("Next"));
    await pause(600);
    await pressIn(d, say("Next"));
    await pause(600);
    const labelAck = lang === "es" ? "Reconocimiento del cliente" : "Customer acknowledgement";
    const card = () => d.page.evaluate((sel) => {
      const c = document.querySelector(sel + " [data-customer-signature='customer_ack']");
      if (!c) return null;
      const img = c.querySelector("img[data-signature-image]");
      return {
        text: c.innerText.replace(/\s+/g, " ").trim(),
        inputs: Array.from(c.querySelectorAll("input")).map((i) => i.getAttribute("aria-label")),
        canvas: !!c.querySelector("canvas"),
        buttons: Array.from(c.querySelectorAll("button")).filter((b) => b.offsetParent !== null).map((b) => ({ text: (b.innerText || "").trim(), off: b.disabled })),
        image: !!img && String(img.getAttribute("src") || "").indexOf("blob:") === 0,
        refusal: (c.querySelector("[data-customer-refusal]") || { innerText: "" }).innerText.trim(),
      };
    }, MODAL);
    const c0 = await card();
    check("start-form/customer-signature/the-card-is-drawn",
      !!c0 && c0.inputs.join("|") === [labelAck + ": " + say("Name"), labelAck + ": " + say("Role|customer")].join("|") && c0.canvas
        && c0.buttons.some((b) => b.text === say("Save signature") && b.off) && c0.buttons.some((b) => b.text === say("Clear")) && !c0.buttons.some((b) => b.text === say("Cancel")),
      !c0 ? "no card for the customer acknowledgement in the third section" : "the card draws " + JSON.stringify(c0));

    await field(d, labelAck + ": " + say("Name")).fill("Rosalind Achterberg");
    await field(d, labelAck + ": " + say("Role|customer")).fill("Facilities manager");
    await d.drawSignature();
    const mark = d.mark();
    await pressIn(d, say("Save signature"));
    await pause(800);
    const sent = bodyOf(d.callsSince(mark), "POST", /\/api\/forms\/drafts\/fr-new-1\/customer-signature$/);
    const body = sent ? sent.body : null;
    const c1 = await card();
    check("start-form/customer-signature/saved",
      !!body && body.key === "customer_ack" && body.name === "Rosalind Achterberg" && body.role === "Facilities manager" && String(body.signature || "").indexOf("data:image/png;base64,") === 0 && Object.keys(body).length === 4,
      "Save signature sent " + JSON.stringify(body ? Object.assign({}, body, { signature: String(body.signature || "").slice(0, 22) }) : null));
    const line = say("Signed by {0} on {1} at {2}").split("{0}")[0].trim() + " Rosalind Achterberg, Facilities manager";
    check("start-form/customer-signature/shown",
      !!c1 && c1.image && c1.text.indexOf(line) >= 0 && !c1.canvas && c1.buttons.some((b) => b.text === say("Clear")) && !c1.buttons.some((b) => b.text === say("Save signature")),
      "after the answer the card draws " + JSON.stringify(c1));

    // Nothing for it in a save: another answer typed and saved, and the body names only that one.
    await d.modal().locator("input[aria-label='" + (lang === "es" ? "Se registró la llamada Nota" : "Logged the call Note") + "']").fill("Called the caller back");
    const mark2 = d.mark();
    await pressIn(d, say("Save"));
    await pause(700);
    const saved = bodyOf(d.callsSince(mark2), "PATCH", /\/api\/forms\/drafts\/fr-new-1$/);
    const keys = saved && saved.body && saved.body.answers ? Object.keys(saved.body.answers) : null;
    check("start-form/customer-signature/never-in-a-save", !!keys && keys.indexOf("customer_ack") < 0 && keys.length > 0,
      "Save sent the keys " + JSON.stringify(keys));

    // Clear, and signed again: a second request, and the new drawing drawn.
    await pressIn(d, say("Clear"));
    await pause(200);
    const c2 = await card();
    await d.drawSignature();
    const mark3 = d.mark();
    await pressIn(d, say("Save signature"));
    await pause(800);
    const again = bodyOf(d.callsSince(mark3), "POST", /\/customer-signature$/);
    const c3 = await card();
    check("start-form/customer-signature/cleared-and-saved-again",
      !!c2 && c2.canvas && !!again && again.body && again.body.name === "Rosalind Achterberg" && !!c3 && c3.image && !c3.canvas,
      "Clear drew the pad " + (c2 && c2.canvas ? "again" : "not at all") + ", the second Save signature " + (again ? "sent the request" : "sent nothing") + " and the card draws " + JSON.stringify(c3 ? [c3.image, c3.canvas] : null));

    // Each refusal, under the card, in the API's own words.
    const REFUSALS = [
      { code: "customer.nameRequired", status: 400, en: "Give your name.", es: "Escriba su nombre." },
      { code: "forms.signatureRequired", status: 400, en: "Draw your signature before you sign", es: "Firme antes de enviar" },
      { code: "forms.signatureTooLarge", status: 400, en: "The signature is over 300 KB.", es: "La firma pesa más de 300 KB." },
      { code: "forms.notACustomerSignature", status: 400, en: "That question is not a customer signature", es: "Esa pregunta no es una firma del cliente" },
      { code: "forms.draftNotFound", status: 404, en: "Draft not found", es: "No se encontró el reporte" },
    ];
    for (const r of REFUSALS) {
      const words = lang === "es" ? r.es : r.en;
      stubs.setRefusal({ method: "POST", path: "/customer-signature", status: r.status, code: r.code, error: words });
      await pressIn(d, say("Clear"));
      await pause(200);
      await d.drawSignature();
      await pressIn(d, say("Save signature"));
      await pause(700);
      const c = await card();
      check("start-form/customer-signature/refusal/" + r.code, !!c && c.refusal === words && c.canvas && (await d.modalOpen()),
        "the line under the card reads " + JSON.stringify(c ? c.refusal : null) + " where the API said " + JSON.stringify(words));
      stubs.clearRefusals();
    }
    await pressIn(d, say("Close"));
    await pause(200);
    await pressIn(d, say("Leave"));
    await pause(500);
    stubs.reset();
  }

  inventory.START_FORM.forEach((w) => {
    if (!driven.has(w.id)) results.noCase("window", w.id + suffix, w.name);
  });
}

module.exports = { run };
