// Customer links and their QR codes, and a customer's filings in Filed forms. Step 169.
//
// The stub serves three links, one live, one switched off and one unused past its clock, and two
// filings a customer made through a link, one of each customer form. The suite opens the window
// from Filed forms as an admin, reads the list, makes a link and finds the one that exists, turns
// one off and on, reads a refusal under its row in the API's own words, opens the QR screen, copies
// the address, prints the sheet and reads what the window was given, and sees a supervisor offered
// no button. It then reads the customer's row and window in Filed forms: Customer in the filed-by
// column, the customer's name and role in the header, the customer's signature drawn above its
// line, a number box that sends a number, and the survey's averages. Everything runs in English and
// in Spanish, and the window is read once more at 390 wide.
"use strict";

const MODAL = "div[style*='z-index: 500']";

async function openFiled(d) {
  await d.goto("forms");
  return d.clickText(d.say("Filed forms"), { exact: false });
}
async function openLinks(d) {
  await openFiled(d);
  const ok = await d.clickText(d.say("Customer links"), { exact: true });
  await d.settle(400);
  return ok;
}

// The rows of the list: each by its id, its words, its visible buttons and the line under it.
function rows(d) {
  return d.page.evaluate((sel) => Array.from(document.querySelectorAll(sel + " [data-customer-link]")).map((el) => ({
    id: el.getAttribute("data-customer-link"),
    text: el.innerText.replace(/\s+/g, " ").trim(),
    buttons: Array.from(el.querySelectorAll("button")).filter((b) => b.offsetParent !== null).map((b) => (b.innerText || "").trim()),
    refusal: (el.querySelector("[data-link-refusal]") || { innerText: "" }).innerText.trim(),
  })), MODAL);
}
// A button inside one row, or anywhere in the window when no row is named, pressed by its words.
function press(d, word, within) {
  return d.page.evaluate(([sel, w, scope]) => {
    const root = document.querySelector(sel + (scope ? " " + scope : ""));
    if (!root) return false;
    const b = Array.from(root.querySelectorAll("button")).find((x) => x.offsetParent !== null && !x.disabled
      && ((x.innerText || "").trim() === w || x.getAttribute("aria-label") === w));
    if (!b) return false;
    b.click();
    return true;
  }, [MODAL, word, within || ""]);
}
// The QR screen: the image and what it holds, the words, the address and the buttons.
function qrScreen(d) {
  return d.page.evaluate((sel) => {
    const s = document.querySelector(sel + " [data-qr-screen]");
    if (!s) return null;
    const img = s.querySelector("img");
    return {
      src: img ? String(img.getAttribute("src") || "").slice(0, 22) : "",
      width: img ? img.getAttribute("width") : "",
      text: s.innerText.replace(/\s+/g, " ").trim(),
      address: (s.querySelector("[data-link-address]") || { innerText: "" }).innerText.trim(),
      refusal: (s.querySelector("[data-link-refusal]") || { innerText: "" }).innerText.trim(),
      buttons: Array.from(s.querySelectorAll("button")).filter((b) => b.offsetParent !== null).map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim()),
    };
  }, MODAL);
}
function geometry(d) {
  return d.page.evaluate((sel) => {
    const doc = document.documentElement;
    const box = document.querySelector(sel);
    const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
    const small = [];
    if (box) {
      Array.from(box.querySelectorAll("button, input, select, textarea")).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        if (Math.round(r.width / zoom) < 44 || Math.round(r.height / zoom) < 44) {
          small.push((el.getAttribute("aria-label") || el.innerText || el.tagName).trim().slice(0, 24) + " " + Math.round(r.width / zoom) + "x" + Math.round(r.height / zoom));
        }
      });
    }
    return { over: doc.scrollWidth - doc.clientWidth, small: small.slice(0, 4) };
  }, MODAL);
}
// The clipboard, kept on the page so a copy can be read back: a headless browser grants no
// permission to write the real one.
const armClipboard = (d) => d.page.evaluate(() => {
  window.__copied = [];
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text) => { window.__copied.push(String(text)); return Promise.resolve(); } } });
});
const copiedText = (d) => d.page.evaluate(() => (window.__copied || []).slice());
// The words of a printed page, the text between its tags with the stylesheet left out.
const printLines = (html) => String(html || "").replace(/<style[\s\S]*?<\/style>/gi, "").split(/<[^>]+>/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
// The rows of Filed forms, as their text.
const listRows = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.innerText.replace(/\s+/g, " ").trim()));
const clickRowWith = (d, text) => d.page.evaluate((txt) => {
  const row = Array.from(document.querySelectorAll("table tbody tr")).find((r) => r.innerText.indexOf(txt) >= 0);
  if (!row) return false;
  row.click();
  return true;
}, text);

async function run({ d, results, inventory, stubs, lang }) {
  const suffix = lang === "es" ? " es" : "";
  const driven = new Set();
  const check = (id, ok, detail) => { driven.add(id); results.check("window", id + suffix, ok, detail); };
  const say = (w) => d.say(w);
  const pause = (ms) => d.page.waitForTimeout(ms);
  const es = lang === "es";
  const T006 = es ? "Lista de evaluaci\u00f3n de limpieza del edificio" : "Facility Cleanliness Evaluation Checklist";
  const T007 = es ? "Encuesta de satisfacci\u00f3n del cliente" : "Client Satisfaction Survey";
  const SITE = (i) => stubs.fixtures ? (stubs.state.sites[i] || {}).name : "";
  const bodyOf = (calls, method, re) => { const c = calls.filter((x) => x.method === method && re.test(x.path)); return c.length ? c[c.length - 1] : null; };
  // A state is drawn in a badge, which the stylesheet writes in capitals, so it is read case-blind.
  const has = (text, word) => String(text).toUpperCase().indexOf(String(word).toUpperCase()) >= 0;

  await d.signOutHard();
  await d.signIn("admin");
  stubs.reset();

  // ---- the button, the list and its rows ------------------------------------
  {
    await openFiled(d);
    const buttons = await d.visibleButtons();
    check("customer-links/the-button-is-offered-to-an-admin", buttons.indexOf(say("Customer links")) >= 0,
      "Filed forms offers " + JSON.stringify(buttons.slice(0, 8)));
    const opened = await d.clickText(say("Customer links"), { exact: true });
    await pause(500);
    const list = await rows(d);
    const ids = list.map((r) => r.id).join(",");
    const words = list.map((r) => r.text);
    check("customer-links/the-list-draws-every-link",
      opened && ids === "cl-2,cl-1,cl-3"
        && words[0].indexOf(T007) >= 0 && words[0].indexOf(SITE(1)) >= 0 && has(words[0], say("Off|link")) && words[0].indexOf(say("Uses") + ": 1") >= 0
        && words[1].indexOf(T006) >= 0 && words[1].indexOf(SITE(0)) >= 0 && has(words[1], say("Live|link")) && words[1].indexOf(say("Uses") + ": 4") >= 0
        && words[2].indexOf(T006) >= 0 && words[2].indexOf(SITE(2)) >= 0 && has(words[2], say("Expired|link")) && words[2].indexOf(say("Last used") + ": --") >= 0,
      !opened ? "the button could not be pressed" : "the list draws " + JSON.stringify(ids) + " reading " + JSON.stringify(words));
    const live = list.find((r) => r.id === "cl-1") || { buttons: [] };
    const off = list.find((r) => r.id === "cl-2") || { buttons: [] };
    const expired = list.find((r) => r.id === "cl-3") || { buttons: [] };
    check("customer-links/each-row-offers-its-buttons",
      live.buttons.join("|") === [say("Show QR code"), say("Copy link"), say("Turn off")].join("|")
        && off.buttons.join("|") === [say("Show QR code"), say("Copy link"), say("Turn on")].join("|")
        && expired.buttons.join("|") === [say("Show QR code"), say("Copy link"), say("Turn on")].join("|"),
      "the live row offers " + JSON.stringify(live.buttons) + ", the one switched off " + JSON.stringify(off.buttons) + ", the expired one " + JSON.stringify(expired.buttons));

    // ---- a new link, and the one that exists -----------------------------------
    await d.modal().locator("select[aria-label='" + say("Form") + "']").selectOption("OCSA-FRM-007");
    await d.modal().locator("select[aria-label='" + say("Site") + "']").selectOption(stubs.state.sites[0].id);
    const mark = d.mark();
    await press(d, say("New link"));
    await pause(700);
    const made = bodyOf(d.callsSince(mark), "POST", /\/api\/customer-links$/);
    const q1 = await qrScreen(d);
    check("customer-links/a-new-link-is-made",
      !!made && made.status === 201 && made.body && made.body.formCode === "OCSA-FRM-007" && made.body.siteId === stubs.state.sites[0].id
        && !!q1 && q1.address.indexOf("/c/") > 0 && q1.text.indexOf(SITE(0)) >= 0 && q1.text.indexOf(T007) >= 0,
      "New link sent " + JSON.stringify(made ? [made.status, made.body] : null) + " and the screen reads " + JSON.stringify(q1 ? q1.text.slice(0, 120) : null));
    const first = q1 ? q1.address : "";
    await press(d, say("Back"));
    await pause(300);
    const four = await rows(d);
    const mark2 = d.mark();
    await press(d, say("New link"));
    await pause(700);
    const found = bodyOf(d.callsSince(mark2), "POST", /\/api\/customer-links$/);
    const q2 = await qrScreen(d);
    await press(d, say("Back"));
    await pause(300);
    const still = await rows(d);
    check("customer-links/an-existing-pair-opens-its-link",
      four.length === 4 && four[0].id === "cl-new-1" && !!found && found.status === 200 && found.json && found.json.created === false
        && !!q2 && q2.address === first && still.length === 4,
      "after the first link the list held " + four.length + " rows headed " + JSON.stringify(four[0] ? four[0].id : null) + "; asking again answered " + JSON.stringify(found ? [found.status, found.json && found.json.created] : null)
        + " and opened " + JSON.stringify(q2 ? q2.address : null) + " against " + JSON.stringify(first) + "; the list then held " + still.length);

    // ---- off, on, and a refused switch --------------------------------------
    const mark3 = d.mark();
    await press(d, say("Turn off"), "[data-customer-link='cl-1']");
    await pause(600);
    const offCall = bodyOf(d.callsSince(mark3), "POST", /\/api\/customer-links\/cl-1\/disable$/);
    const r1 = (await rows(d)).find((r) => r.id === "cl-1") || { text: "", buttons: [] };
    check("customer-links/turned-off", !!offCall && has(r1.text, say("Off|link")) && r1.buttons.indexOf(say("Turn on")) >= 0 && r1.buttons.indexOf(say("Turn off")) < 0,
      "Turn off " + (offCall ? "sent the request" : "sent nothing") + " and the row reads " + JSON.stringify(r1.text) + " offering " + JSON.stringify(r1.buttons));
    const mark4 = d.mark();
    await press(d, say("Turn on"), "[data-customer-link='cl-1']");
    await pause(600);
    const onCall = bodyOf(d.callsSince(mark4), "POST", /\/api\/customer-links\/cl-1\/enable$/);
    const r2 = (await rows(d)).find((r) => r.id === "cl-1") || { text: "", buttons: [] };
    check("customer-links/turned-on", !!onCall && has(r2.text, say("Live|link")) && r2.buttons.indexOf(say("Turn off")) >= 0,
      "Turn on " + (onCall ? "sent the request" : "sent nothing") + " and the row reads " + JSON.stringify(r2.text) + " offering " + JSON.stringify(r2.buttons));
    const liveWords = es ? "Otro enlace para este sitio y formulario est\u00e1 activo" : "Another link for this site and form is live";
    stubs.setRefusal({ method: "POST", path: "/enable", status: 409, code: "customer.anotherLinkLive", error: liveWords, body: { liveId: "cl-1" } });
    await press(d, say("Turn on"), "[data-customer-link='cl-3']");
    await pause(600);
    const r3 = (await rows(d)).find((r) => r.id === "cl-3") || { text: "", buttons: [], refusal: "" };
    check("customer-links/refusal/customer.anotherLinkLive", r3.refusal === liveWords && has(r3.text, say("Expired|link")) && (await d.modalOpen()),
      "the line under the row reads " + JSON.stringify(r3.refusal) + " and the row reads " + JSON.stringify(r3.text));
    stubs.clearRefusals();
    const siteWords = es ? "No se encontr\u00f3 el sitio" : "Site not found";
    stubs.setRefusal({ method: "POST", path: "/api/customer-links", status: 404, code: "customer.siteNotFound", error: siteWords });
    await press(d, say("New link"));
    await pause(600);
    const under = await d.page.evaluate((sel) => (document.querySelector(sel + " [data-links-list] [data-link-refusal]") || { innerText: "" }).innerText.trim(), MODAL);
    check("customer-links/refusal/customer.siteNotFound", under === siteWords && (await qrScreen(d)) === null,
      "the line under New link reads " + JSON.stringify(under));
    stubs.clearRefusals();

    // ---- the QR screen, the copy and the sheet ----------------------------------
    await armClipboard(d);
    await d.clearCaptures();
    await press(d, say("Show QR code"), "[data-customer-link='cl-1']");
    await pause(700);
    const q3 = await qrScreen(d);
    const titles006 = es ? [T006, "Facility Cleanliness Evaluation Checklist"] : [T006, "Lista de evaluaci\u00f3n de limpieza del edificio"];
    check("customer-links/the-qr-screen",
      !!q3 && q3.src === "data:image/png;base64," && q3.width === "512" && q3.text.indexOf(SITE(0)) >= 0 && titles006.every((x) => q3.text.indexOf(x) >= 0)
        && /\/c\/k7Qm2vX9pL4wR8sT1nB6yH3jF0cD5gZa$/.test(q3.address)
        && [say("Print"), say("Copy link"), say("Back"), say("Close")].every((b) => q3.buttons.indexOf(b) >= 0),
      "the screen is " + JSON.stringify(q3));
    await press(d, say("Copy link"), "[data-qr-screen]");
    await pause(200);
    const copied = await copiedText(d);
    const q4 = await qrScreen(d);
    check("customer-links/copy-link", copied.length === 1 && copied[0] === (q3 ? q3.address : "") && !!q4 && q4.buttons.indexOf(say("Copied")) >= 0,
      "the clipboard holds " + JSON.stringify(copied) + " and the buttons read " + JSON.stringify(q4 ? q4.buttons : null));
    await press(d, say("Print"), "[data-qr-screen]");
    await pause(600);
    const printed = (await d.prints()).pop();
    const html = printed ? printed.html : "";
    const lines = printLines(html);
    const scan006 = ["Scan to tell OCSA how the building is being kept.", "Escanee para decirle a OCSA c\u00f3mo se mantiene el edificio."];
    check("customer-links/the-print-sheet",
      !!printed && printed.printed && /<img[^>]*src="[^"]*ocsa-logo\.png"/.test(html) && lines.indexOf(SITE(0)) >= 0 && titles006.every((x) => lines.indexOf(x) >= 0)
        && /<img class="qr" width="512" height="512" alt="[^"]*" src="data:image\/png;base64,/.test(html)
        && scan006.every((x) => lines.indexOf(x) >= 0) && lines.indexOf(q3 ? q3.address : "?") >= 0,
      !printed ? "Print opened no window" : "the sheet " + (printed.printed ? "was printed" : "was not printed") + " and reads " + JSON.stringify(lines.slice(0, 8)) + (html.indexOf("data:image/png;base64,") >= 0 ? " with the image" : " without the image"));
    await d.closeModal();
  }

  // ---- a supervisor is offered no button ---------------------------------------
  {
    await d.signOutHard();
    await d.signIn("supervisor");
    await openFiled(d);
    const buttons = await d.visibleButtons();
    check("customer-links/a-supervisor-sees-no-button", buttons.indexOf(say("Customer links")) < 0,
      "Filed forms offers " + JSON.stringify(buttons.filter((b) => b === say("Customer links"))));
    await d.signOutHard();
    await d.signIn("admin");
    stubs.reset();
  }

  // ---- a customer's filings in Filed forms --------------------------------------
  {
    await openFiled(d);
    const list = await listRows(d);
    const row = list.find((r) => r.indexOf("Rosalind Achterberg") >= 0) || "";
    check("customer-filing/the-row-reads-customer", row.indexOf(say("Customer")) >= 0 && row.indexOf(T006) >= 0 && row.indexOf("Facilities manager") >= 0,
      "the customer's row reads " + JSON.stringify(row) + " among " + JSON.stringify(list.map((r) => r.slice(0, 40))));
    await clickRowWith(d, "Rosalind Achterberg");
    await pause(700);
    const text = await d.modalText();
    const head = text.split("\n").slice(0, 8).join(" ");
    check("customer-filing/the-header-names-the-customer",
      has(head, say("Customer")) && head.indexOf(say("Filed by {0}").replace("{0}", "Rosalind Achterberg, Facilities manager")) >= 0,
      "the header reads " + JSON.stringify(head.slice(0, 200)));
    const sig = await d.page.evaluate((sel) => {
      const img = document.querySelector(sel + " img[data-signature-image='customer_signed']");
      const box = img ? img.closest("[data-question]") : null;
      return { blob: !!img && String(img.getAttribute("src") || "").indexOf("blob:") === 0, text: box ? box.innerText.replace(/\s+/g, " ").trim() : "" };
    }, MODAL);
    const signedLine = es ? "Firmado por Rosalind Achterberg, Facilities manager el 16 de marzo de 2026 a las 4:12 PM" : "Signed by Rosalind Achterberg, Facilities manager on March 16, 2026 at 4:12 PM";
    check("customer-filing/the-signature-is-drawn", sig.blob && sig.text.indexOf(signedLine) >= 0,
      "the customer's signature draws " + JSON.stringify(sig));
    const labelCount = es ? "L\u00edneas aceptables" : "Acceptable lines";
    const box = d.modal().locator("input[aria-label='" + labelCount + "']");
    const kind = await box.getAttribute("type").catch(() => null);
    const held = await box.inputValue().catch(() => null);
    await box.fill("26");
    const mark = d.mark();
    await press(d, say("Save"));
    await pause(700);
    const saved = bodyOf(d.callsSince(mark), "PATCH", /\/api\/forms\/responses\/cf-1\/supervisor$/);
    const sent = saved && saved.body && saved.body.answers ? saved.body.answers : null;
    check("customer-filing/a-number-box-sends-a-number",
      kind === "number" && held === "27" && !!sent && sent.acceptable_count === 26 && Object.keys(sent).length === 1,
      "the box is " + JSON.stringify([kind, held]) + " and Save sent " + JSON.stringify(sent));
    await d.closeModal();

    await clickRowWith(d, "Corvin Ballantyne");
    await pause(700);
    const avg = await d.page.evaluate((sel) => {
      const box = document.querySelector(sel + " [data-computed]");
      return box ? box.innerText.replace(/\s+/g, " ").trim() : "";
    }, MODAL);
    const want = es ? ["Promedios por secci\u00f3n", "Calidad del servicio 4.0", "Comunicaci\u00f3n 2.0", "General 3.3"] : ["Section averages", "Service quality 4.0", "Communication 2.0", "Overall 3.3"];
    check("customer-filing/the-averages-are-drawn", want.every((w) => avg.indexOf(w) >= 0),
      "under the answers the window reads " + JSON.stringify(avg));
    await d.closeModal();
  }

  // ---- the window on a phone ------------------------------------------------------
  {
    stubs.reset();
    await d.page.setViewportSize({ width: 390, height: 844 });
    await openLinks(d);
    const g1 = await geometry(d);
    await press(d, say("Show QR code"), "[data-customer-link='cl-1']");
    await pause(700);
    const g2 = await geometry(d);
    const q = await qrScreen(d);
    check("customer-links/the-window-fits-a-phone", g1.over <= 1 && g1.small.length === 0 && g2.over <= 1 && g2.small.length === 0 && !!q && q.src === "data:image/png;base64,",
      "at 390 the list runs " + g1.over + " off the side with controls under 44: " + JSON.stringify(g1.small) + "; the QR screen runs " + g2.over + " with " + JSON.stringify(g2.small));
    await d.closeModal();
    await d.page.setViewportSize({ width: 1280, height: 900 });
    stubs.reset();
  }

  inventory.CUSTOMER_LINKS.forEach((w) => {
    if (!driven.has(w.id)) results.noCase("window", w.id + suffix, w.name);
  });
}

module.exports = { run };
