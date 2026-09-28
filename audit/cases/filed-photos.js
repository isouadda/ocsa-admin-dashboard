// Photos on a filed form, and the signature box. Step 165.
//
// The daily service log carries a photos question on each half: the crew's, with two photos on it,
// and the supervisor's, empty until a writer adds some. What the window draws for each is read, the
// overlay is opened and closed, a writer uploads and removes, a person who may not write the half
// is shown no control, and each refusal the API can answer with is drawn under the question in the
// API's own words, as sent, matched on its code only to place the line. Everything runs in English
// and in Spanish.
"use strict";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const file = (name) => ({ name, mimeType: "image/png", buffer: PNG });
const MODAL = "div[style*='z-index: 500']";

async function openLog(d) {
  await d.goto("forms");
  await d.clickText(d.say("Filed forms"), { exact: false });
  return d.clickRow(1);
}

// What one photos question draws: its thumbnails by name and by whether the image is a blob, the
// words under it, the buttons with words in it and the file input.
function question(d, key) {
  return d.page.evaluate(([sel, k]) => {
    const box = document.querySelector(sel + " [data-question='" + k + "']");
    if (!box) return null;
    return {
      names: Array.from(box.querySelectorAll("[data-photos] img")).map((i) => i.getAttribute("alt")),
      blobs: Array.from(box.querySelectorAll("[data-photos] img")).map((i) => String(i.getAttribute("src") || "").indexOf("blob:") === 0),
      text: box.innerText.replace(/\s+/g, " ").trim(),
      buttons: Array.from(box.querySelectorAll("button")).filter((b) => b.offsetParent !== null).map((b) => (b.innerText || "").trim()).filter(Boolean),
      inputs: box.querySelectorAll("input[type=file]").length,
      refusal: (box.querySelector("[data-photo-refusal]") || { innerText: "" }).innerText.trim(),
    };
  }, [MODAL, key]);
}

function overlay(d) {
  return d.page.evaluate((sel) => {
    const o = document.querySelector(sel + " [role=dialog]");
    if (!o) return null;
    const img = o.querySelector("img");
    return { text: o.innerText.replace(/\s+/g, " ").trim(), blob: !!img && String(img.getAttribute("src") || "").indexOf("blob:") === 0,
      buttons: Array.from(o.querySelectorAll("button")).map((b) => (b.innerText || "").trim()) };
  }, MODAL);
}

// A control inside the window pressed by its text or its name, so the window's own X and Close are
// not hit by accident.
function press(d, word, within) {
  return d.page.evaluate(([sel, w, scope]) => {
    const root = document.querySelector(sel + (scope ? " " + scope : ""));
    if (!root) return false;
    const b = Array.from(root.querySelectorAll("button")).find((x) => x.offsetParent !== null
      && ((x.innerText || "").trim() === w || x.getAttribute("aria-label") === w));
    if (!b) return false;
    b.click();
    return true;
  }, [MODAL, word, within || ""]);
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
        if (el.type === "checkbox" || el.type === "radio") return;
        if (Math.round(r.width / zoom) < 44 || Math.round(r.height / zoom) < 44) {
          small.push((el.getAttribute("aria-label") || el.innerText || el.tagName).trim().slice(0, 24) + " " + Math.round(r.width / zoom) + "x" + Math.round(r.height / zoom));
        }
      });
    }
    return { over: doc.scrollWidth - doc.clientWidth, small: small.slice(0, 4) };
  }, MODAL);
}

async function run({ d, results, inventory, stubs, lang }) {
  const suffix = lang === "es" ? " es" : "";
  const driven = new Set();
  const check = (id, ok, detail) => { driven.add(id); results.check("window", id + suffix, ok, detail); };
  const say = (w) => d.say(w);
  // A fixed pause. The page polls, so waiting for the network to go idle only waits out a timeout.
  const pause = (ms) => d.page.waitForTimeout(ms);
  const pick = (names) => d.modal().locator("input[type=file]").setInputFiles(names.map(file));

  await d.signOutHard();
  await d.signIn("admin");
  stubs.reset();

  // ---- what a photos question draws --------------------------------------
  {
    await openLog(d);
    await pause(500);
    const filed = await question(d, "site_photos");
    const sup = await question(d, "verification_photos");
    check("filed-photos/thumbnails-are-drawn",
      !!filed && filed.names.join(",") === "lobby.jpg,dock.jpg" && filed.blobs.every(Boolean) && filed.text.indexOf("lobby.jpg") >= 0 && filed.text.indexOf("dock.jpg") >= 0,
      !filed ? "no photos question headed Photos of the site in the window" : "the question draws " + JSON.stringify(filed.names) + " from blobs " + JSON.stringify(filed.blobs) + " and reads " + JSON.stringify(filed.text));
    check("filed-photos/no-photos-reads-so", !!sup && sup.names.length === 0 && sup.text.indexOf(say("No photos")) >= 0,
      !sup ? "no photos question headed Verification photos in the window" : "the empty question reads " + JSON.stringify(sup.text));
    check("filed-photos/a-writer-is-offered-add-photos",
      !!sup && sup.buttons.indexOf(say("Add photos")) >= 0 && sup.inputs === 1
        && !!filed && filed.buttons.length === 0 && filed.inputs === 0,
      "the supervisor half offers " + JSON.stringify(sup ? sup.buttons : null) + " and the filed half " + JSON.stringify(filed ? filed.buttons : null));

    // The overlay: the full image, the name, Close. Close leaves the window open.
    const opened = await press(d, say("Open photo {0}").replace("{0}", "lobby.jpg"), "[data-question='site_photos']");
    await pause(500);
    const over = await overlay(d);
    check("filed-photos/the-overlay-opens", opened && !!over && over.blob && over.text.indexOf("lobby.jpg") >= 0 && over.buttons.indexOf(say("Close")) >= 0,
      !opened ? "no thumbnail button named for the photo" : "the overlay is " + JSON.stringify(over));
    const closed = await press(d, say("Close"), "[role=dialog]");
    await pause(200);
    const after = await overlay(d);
    check("filed-photos/the-overlay-closes", closed && after === null && (await d.modalOpen()) && (await d.modalText()).indexOf("lobby.jpg") >= 0,
      !closed ? "no Close in the overlay" : after ? "the overlay is still up" : "the window closed with the overlay");

    const g = await geometry(d);
    check("filed-photos/the-controls-fit", g.over <= 1 && g.small.length === 0,
      "the page runs " + g.over + " pixels off the side, controls under 44 by 44: " + JSON.stringify(g.small));

    // ---- a writer uploads, hits the limit and removes, in the same window ----
    stubs.setDelay("/photos/", 900);
    const mark = d.mark();
    await pick(["v1.png", "v2.png"]);
    await pause(300);
    const mid = await question(d, "verification_photos");
    check("filed-photos/uploading-reads-so", !!mid && mid.buttons.indexOf(say("Uploading...")) >= 0,
      "while the upload is in flight the question offers " + JSON.stringify(mid ? mid.buttons : null));
    await pause(1600);
    stubs.clearDelays();
    const sent = d.callsSince(mark).filter((c) => c.method === "POST" && /\/photos\/verification_photos$/.test(c.path));
    const raw = sent.length ? String(sent[0].body || "") : "";
    // The API answers { key, photos }, never { value }: what the question draws is that list.
    const answered = sent.length && sent[0].json && Array.isArray(sent[0].json.photos) ? sent[0].json.photos : [];
    const q1 = await question(d, "verification_photos");
    check("filed-photos/a-writer-uploads",
      sent.length === 1 && raw.indexOf('name="photos"; filename="v1.png"') >= 0 && raw.indexOf('name="photos"; filename="v2.png"') >= 0
        && !!q1 && q1.names.join(",") === "v1.png,v2.png" && q1.blobs.every(Boolean),
      "picking two photos sent " + sent.length + " requests carrying " + JSON.stringify(raw.slice(0, 160)) + " and the question draws " + JSON.stringify(q1 ? q1.names : null));
    check("filed-photos/the-full-line",
      !!q1 && q1.text.indexOf(say("This question is full.")) >= 0 && q1.buttons.indexOf(say("Add photos")) < 0 && q1.inputs === 0,
      "at two photos of two the question reads " + JSON.stringify(q1 ? q1.text : null) + " and offers " + JSON.stringify(q1 ? q1.buttons : null));

    const mark2 = d.mark();
    const removed = await press(d, say("Remove photo|form") + ": v1.png", "[data-question='verification_photos']");
    await pause(700);
    const gone = d.callsSince(mark2).filter((c) => c.method === "DELETE" && /\/photos\/verification_photos\//.test(c.path));
    const q2 = await question(d, "verification_photos");
    const firstId = answered.length ? answered[0].id : "";
    check("filed-photos/a-writer-removes",
      removed && gone.length === 1 && !!firstId && gone[0].path === "/api/forms/responses/fr-9/photos/verification_photos/" + firstId
        && !!q2 && q2.names.join(",") === "v2.png" && q2.buttons.indexOf(say("Add photos")) >= 0,
      !removed ? "no Remove photo under the first photo" : "Remove photo sent " + JSON.stringify(gone.map((c) => c.path)) + " for the photo the API answered as " + JSON.stringify(firstId) + ", and the question draws " + JSON.stringify(q2 ? q2.names : null) + " offering " + JSON.stringify(q2 ? q2.buttons : null));
    await d.closeModal();
  }

  // ---- a person who may not write the half ---------------------------------
  {
    stubs.reset();
    stubs.setFiledFormExtras({ locked: true });
    await openLog(d);
    await pause(500);
    const sup = await question(d, "verification_photos");
    const filed = await question(d, "site_photos");
    check("filed-photos/a-non-writer-sees-no-add-photos",
      !!sup && sup.buttons.length === 0 && sup.inputs === 0 && sup.text.indexOf(say("No photos")) >= 0
        && !!filed && filed.names.length === 2 && filed.buttons.length === 0 && filed.inputs === 0,
      "with the half locked the supervisor question offers " + JSON.stringify(sup ? sup.buttons : null) + " with " + (sup ? sup.inputs : 0) + " file inputs, and the filed half draws " + JSON.stringify(filed ? filed.names : null) + " offering " + JSON.stringify(filed ? filed.buttons : null));
    await d.closeModal();
    stubs.reset();
  }

  // ---- each refusal, under the question, in the API's own words as sent ----
  // The codes are routes/forms.js's own (Step 169). The words are the case's, different in each
  // language, so a line drawn from a table of the dashboard's own would not match. The question
  // stays empty through a refused upload, so one window takes every code.
  {
    await openLog(d);
    await pause(400);
    const UPLOAD_CODES = ["forms.photoTooLarge", "forms.photoType", "forms.photoHeic", "forms.photoUnreadable", "forms.photoLimit",
      "forms.photoNoFile", "forms.notAPhotosQuestion", "forms.photosByRoute"];
    const wordsFor = (code) => (lang === "es" ? "Las palabras propias de la API para " : "The API's own words for ") + code;
    for (const code of UPLOAD_CODES) {
      stubs.setRefusal({ method: "POST", path: "/photos/", status: 400, code: code, error: wordsFor(code), body: code === "forms.photoLimit" ? { max: 2 } : undefined });
      await pick(["late.png"]);
      await pause(700);
      const q = await question(d, "verification_photos");
      check("filed-photos/refusal/" + code, !!q && q.refusal === wordsFor(code) && q.names.length === 0 && (await d.modalOpen()),
        "the line under the question reads " + JSON.stringify(q ? q.refusal : null) + " where the API said " + JSON.stringify(wordsFor(code)));
    }
    // A code nobody listed: the API's words, as sent, the same way.
    const own = lang === "es" ? "Las palabras propias de la API" : "The API's own words";
    stubs.setRefusal({ method: "POST", path: "/photos/", status: 422, code: "forms.somethingNew", error: own });
    await pick(["late.png"]);
    await pause(700);
    const q2 = await question(d, "verification_photos");
    check("filed-photos/refusal/unknown-code", !!q2 && q2.refusal === own,
      "the line under the question reads " + JSON.stringify(q2 ? q2.refusal : null) + " where the API said " + JSON.stringify(own));
    // A removal refused: the photo goes up first, then the API says it is gone.
    stubs.clearRefusals();
    await pick(["v1.png"]);
    await pause(700);
    stubs.setRefusal({ method: "DELETE", path: "/photos/", status: 404, code: "forms.photoNotFound", error: wordsFor("forms.photoNotFound") });
    await press(d, say("Remove photo|form") + ": v1.png", "[data-question='verification_photos']");
    await pause(700);
    const q3 = await question(d, "verification_photos");
    check("filed-photos/refusal/forms.photoNotFound", !!q3 && q3.refusal === wordsFor("forms.photoNotFound") && q3.names.length === 1,
      "the line under the question reads " + JSON.stringify(q3 ? q3.refusal : null) + " and the question draws " + JSON.stringify(q3 ? q3.names : null));
    await d.closeModal();
    stubs.reset();
  }

  // ---- the signature box --------------------------------------------------
  // Sign opens the box under the sign-off. Nothing goes until something is drawn, a pointer path
  // turns Sign on, Clear turns it off, and the request carries the drawing as a PNG data URL. The
  // filer's stamp on the other half draws its signature image; the reviewer's, made here, draws
  // its own once the API answers.
  const box = () => d.page.evaluate((sel) => {
    const b = document.querySelector(sel + " [data-signature-box]");
    if (!b) return null;
    const canvas = b.querySelector("canvas");
    const r = canvas ? canvas.getBoundingClientRect() : { width: 0, height: 0 };
    const zoom = parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1;
    const white = canvas ? getComputedStyle(canvas).backgroundColor : "";
    const buttons = Array.from(b.querySelectorAll("button")).map((x) => ({ text: (x.innerText || "").trim(), off: x.disabled }));
    return { text: b.innerText.replace(/\s+/g, " ").trim(), canvas: !!canvas, width: Math.round(r.width / zoom), height: Math.round(r.height / zoom), white,
      buttons, refusal: (b.querySelector("[data-signature-refusal]") || { innerText: "" }).innerText.trim(),
      boxWidth: Math.round(b.getBoundingClientRect().width / zoom) };
  }, MODAL);
  const images = () => d.page.evaluate((sel) => Array.from(document.querySelectorAll(sel + " img[data-signature-image]")).map((i) => ({
    key: i.getAttribute("data-signature-image"), blob: String(i.getAttribute("src") || "").indexOf("blob:") === 0, height: Math.round(i.getBoundingClientRect().height / (parseFloat(getComputedStyle(document.querySelector("#root > div")).zoom) || 1)) })), MODAL);
  {
    stubs.reset();
    await openLog(d);
    await pause(500);
    const before = await images();
    check("filed-signature/the-stamp-image-is-drawn", before.some((i) => i.key === "filed_signoff" && i.blob && i.height >= 40 && i.height <= 56),
      "the filer's stamp draws " + JSON.stringify(before));
    check("filed-signature/a-stamp-without-one-draws-nothing", !before.some((i) => i.key === "review_signoff"),
      "the unsigned part draws an image: " + JSON.stringify(before));

    const mark0 = d.mark();
    const opened = await press(d, say("Sign"), "[data-question='review_signoff']");
    await pause(300);
    const b0 = await box();
    const sign0 = b0 ? b0.buttons.find((x) => x.text === say("Sign")) : null;
    check("filed-signature/the-box-is-drawn",
      opened && !!b0 && b0.canvas && b0.width === 420 && b0.height === 160 && b0.white === "rgb(255, 255, 255)"
        && b0.text.indexOf("Reviewed by") >= 0 && b0.text.indexOf(say("Sign with your mouse or finger")) >= 0
        && !!sign0 && sign0.off && b0.buttons.some((x) => x.text === say("Clear") && !x.off),
      !opened ? "no Sign beside the sign-off" : "the box is " + JSON.stringify(b0));
    const noneSent = d.callsSince(mark0).filter((c) => c.method === "POST" && /\/signoff$/.test(c.path));
    check("filed-signature/refused-empty", !!sign0 && sign0.off && noneSent.length === 0,
      "with nothing drawn Sign is " + (sign0 && sign0.off ? "off" : "on") + " and " + noneSent.length + " requests went");

    await d.drawSignature();
    const b1 = await box();
    const sign1 = b1 ? b1.buttons.find((x) => x.text === say("Sign")) : null;
    await press(d, say("Clear"), "[data-signature-box]");
    await pause(150);
    const b2 = await box();
    const sign2 = b2 ? b2.buttons.find((x) => x.text === say("Sign")) : null;
    check("filed-signature/a-path-turns-sign-on", !!sign1 && !sign1.off && !!sign2 && sign2.off,
      "after a path Sign is " + (sign1 && !sign1.off ? "on" : "off") + ", after Clear it is " + (sign2 && sign2.off ? "off" : "on"));

    // A refusal from the API, in its own words, with the box still open.
    stubs.setRefusal({ method: "POST", path: "/signoff", status: 400, code: "forms.signatureRequired", error: lang === "es" ? "Firme antes de enviar" : "Draw your signature before you sign" });
    await d.drawSignature();
    await press(d, say("Sign"), "[data-signature-box]");
    await pause(700);
    const b3 = await box();
    check("filed-signature/the-api-refusal-is-in-the-box", !!b3 && b3.refusal === (lang === "es" ? "Firme antes de enviar" : "Draw your signature before you sign"),
      "the box reads " + JSON.stringify(b3 ? b3.refusal : null) + (b3 ? "" : ", or is gone"));
    stubs.clearRefusals();

    const mark = d.mark();
    await press(d, say("Sign"), "[data-signature-box]");
    await pause(800);
    const sent = d.callsSince(mark).filter((c) => c.method === "POST" && /\/signoff$/.test(c.path));
    const body = sent.length ? sent[0].body : null;
    const sig = body && typeof body.signature === "string" ? body.signature : "";
    const bytes = Math.floor((sig.split(",")[1] || "").length * 3 / 4);
    const after = await images();
    const text = await d.modalText();
    check("filed-signature/accepted-with-a-pointer-path",
      sent.length === 1 && body.key === "review_signoff" && sig.indexOf("data:image/png;base64,") === 0 && bytes > 200 && bytes <= 300 * 1024
        && text.indexOf(say("Not signed")) < 0 && after.some((i) => i.key === "review_signoff" && i.blob) && (await box()) === null,
      "Sign sent " + sent.length + " requests, key " + JSON.stringify(body ? body.key : null) + ", a signature of " + bytes + " bytes starting " + JSON.stringify(sig.slice(0, 22))
        + "; afterwards the images are " + JSON.stringify(after) + " and the box is " + ((await box()) ? "still open" : "gone"));
    await d.closeModal();

    // The box on a phone.
    stubs.reset();
    await d.page.setViewportSize({ width: 390, height: 844 });
    await openLog(d);
    await pause(400);
    await press(d, say("Sign"), "[data-question='review_signoff']");
    await pause(300);
    const b4 = await box();
    const g = await geometry(d);
    check("filed-signature/the-box-fits-a-phone",
      !!b4 && b4.canvas && b4.width >= b4.boxWidth - 26 && b4.width < 420 && b4.height === 160 && g.over <= 1 && g.small.length === 0,
      "at 390 the canvas is " + JSON.stringify(b4 ? [b4.width, b4.height, b4.boxWidth] : null) + ", the page runs " + g.over + " off the side, controls under 44: " + JSON.stringify(g.small));
    await d.closeModal();
    await d.page.setViewportSize({ width: 1280, height: 900 });
    stubs.reset();
  }

  inventory.FILED_PHOTO_STATES.forEach((w) => {
    if (!driven.has(w.id)) results.noCase("window", w.id + suffix, w.name);
  });
}

module.exports = { run };
