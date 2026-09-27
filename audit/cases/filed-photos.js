// Photos on a filed form, and the signature box. Step 165.
//
// The daily service log carries a photos question on each half: the crew's, with two photos on it,
// and the supervisor's, empty until a writer adds some. What the window draws for each is read, the
// overlay is opened and closed, a writer uploads and removes, a person who may not write the half
// is shown no control, and each refusal the API can answer with is drawn under the question in the
// table's words for its code. Everything runs in English and in Spanish.
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
    const answered = sent.length && sent[0].json && Array.isArray(sent[0].json.value) ? sent[0].json.value : [];
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

  // ---- each refusal, under the question, in the table's words for its code ----
  // The question stays empty through a refused upload, so one window takes every code.
  {
    await openLog(d);
    await pause(400);
    const REFUSALS = [
      { code: "forms.photosFull", word: "This question is full." },
      { code: "forms.photoTooLarge", word: "That photo is too large." },
      { code: "forms.notAPhoto", word: "Only a photo can be added here." },
      { code: "forms.photosForbidden", word: "You cannot change the photos on this question." },
    ];
    for (const r of REFUSALS) {
      stubs.setRefusal({ method: "POST", path: "/photos/", status: 409, code: r.code, error: "The API's own words for " + r.code });
      await pick(["late.png"]);
      await pause(700);
      const q = await question(d, "verification_photos");
      check("filed-photos/refusal/" + r.code, !!q && q.refusal === say(r.word) && q.names.length === 0 && (await d.modalOpen()),
        "the line under the question reads " + JSON.stringify(q ? q.refusal : null) + " where the table says " + JSON.stringify(say(r.word)));
    }
    // A code the table does not know: the API's words, as sent, in the language the call asked for.
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
    stubs.setRefusal({ method: "DELETE", path: "/photos/", status: 404, code: "forms.photoNotFound", error: "The API's own words" });
    await press(d, say("Remove photo|form") + ": v1.png", "[data-question='verification_photos']");
    await pause(700);
    const q3 = await question(d, "verification_photos");
    check("filed-photos/refusal/forms.photoNotFound", !!q3 && q3.refusal === say("That photo is no longer on the form.") && q3.names.length === 1,
      "the line under the question reads " + JSON.stringify(q3 ? q3.refusal : null) + " and the question draws " + JSON.stringify(q3 ? q3.names : null));
    await d.closeModal();
    stubs.reset();
  }

  inventory.FILED_PHOTO_STATES.forEach((w) => {
    if (!driven.has(w.id)) results.noCase("window", w.id + suffix, w.name);
  });
}

module.exports = { run };
