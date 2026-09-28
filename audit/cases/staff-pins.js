// Staff, PINs and badges, Step 181 (80b182a), in English and in Spanish at 1024.
//
// Add New Staff keeps a window open once the API has saved the person: the Temporary PIN it answered,
// masked until Show, masked again by Hide, put on the clipboard by Copy, and Send activation invite,
// which asks the API to send the person their invite. Reset PIN's box is a masked number box, and its
// toast names the person. An admin's account is changed only by a holder of manage_admins, which no
// admin holds by default, so an admin without it opens another admin's profile and finds no Reset
// PIN, no reset link, no Deactivate and no Edit, and the list draws no pencil on an admin's row, while
// a custodial lead's profile offers every one. An employee ID somebody else holds is refused by the
// profile's save with the code the PATCH route sends, users.employeeIdTakenByOther, and the line under
// the field says so in the screen's language. The words are written out here by hand, so a wrong
// entry in the table is red and not merely followed.
"use strict";

const MODAL = "div[style*='z-index: 500']";

// What the screen has to say, by hand.
const WORDS = {
  en: { title: "Temporary PIN", show: "Show", hide: "Hide", copy: "Copy", copied: "Copied", invite: "Send activation invite",
    invited: "Invite sent.", done: "Done", resetFor: "PIN reset for ", taken: "That employee ID is already in use." },
  es: { title: "PIN temporal", show: "Mostrar", hide: "Ocultar", copy: "Copiar", copied: "Copiado", invite: "Enviar invitaci\u00f3n de activaci\u00f3n",
    invited: "Invitaci\u00f3n enviada.", done: "Listo", resetFor: "PIN restablecido para ",
    taken: "Ese n\u00famero de identificaci\u00f3n de empleado ya est\u00e1 en uso." },
};
// The PIN the stub's POST /api/users answers with, and the refusal the PATCH route answers when the
// employee ID belongs to somebody else, in the API's words for each language (helpers/words.js).
const TEMP_PIN = "5307";
const TAKEN_BY_OTHER = { code: "users.employeeIdTakenByOther", en: "Employee ID already in use by another user", es: "Otro usuario ya usa ese ID de empleado" };

// The clipboard, kept on the page so a copy can be read back: a headless browser grants no
// permission to write the real one.
const armClipboard = (d) => d.page.evaluate(() => {
  window.__copied = [];
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text) => { window.__copied.push(String(text)); return Promise.resolve(); } } });
});
const copiedText = (d) => d.page.evaluate(() => (window.__copied || []).slice());

// The box the Temporary PIN window draws the PIN in: the one element in the open window whose own
// text is the PIN or its mask, read as the browser drew it.
const pinBox = (d) => d.page.evaluate((sel) => {
  const box = Array.from(document.querySelectorAll(sel)).pop();
  if (!box) return null;
  const el = Array.from(box.querySelectorAll("div")).find((x) => x.children.length === 0 && /^[\u2022\d]{4}$/.test((x.textContent || "").trim()));
  return el ? el.textContent.trim() : null;
}, MODAL);

// Every button on the content area that says one of these words, as the browser drew it.
const buttonsSaying = (d, words) => d.page.evaluate(({ words: ws }) => {
  const area = document.querySelector("div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']") || document.body;
  return Array.from(area.querySelectorAll("button")).filter((b) => b.offsetParent !== null)
    .map((b) => (b.textContent || "").trim()).filter((x) => ws.indexOf(x) >= 0);
}, { words });

// Which rows of the list's first page carry the pencil, by the name in the row.
const pencils = (d, word) => d.page.evaluate((w) => Array.from(document.querySelectorAll("table tbody tr")).map((tr) => ({
  text: (tr.innerText || "").replace(/\s+/g, " ").trim(),
  pencil: !!tr.querySelector("button[title='" + w + "']"),
})), word);

async function run({ d, results, seed, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  await d.signOutHard();
  await d.signIn("admin");
  await d.collapseSidebar();

  // ---- Add New Staff: the Temporary PIN window, masked, Show, Hide, Copy and the invite
  stubs.reset();
  await d.goto("staff");
  await d.clickText(d.say("Add Staff"), { exact: true });
  await d.fillByLabel(d.say("First Name *"), "Audit");
  await d.fillByLabel(d.say("Last Name"), "Newhire");
  await d.fillByLabel(d.say("Phone *"), "2155550199");
  await d.fillByLabel(d.say("Email *"), "audit.newhire@example.invalid");
  await d.clickText(d.say("Add Staff"), { inModal: true, exact: true });
  await d.settle(500);
  const text = await d.modalText();
  const opened = text.indexOf(w.title) >= 0;
  const masked = opened ? await pinBox(d) : null;
  results.check("window", "window/staff/temporary-pin/opens-masked" + tail, opened && text.indexOf("Audit Newhire") >= 0 && masked === "\u2022\u2022\u2022\u2022" && text.indexOf(TEMP_PIN) < 0,
    !opened ? "no " + JSON.stringify(w.title) + " window after Add Staff saved the person" + (text ? ", the window on screen says " + JSON.stringify(text.split("\n")[0]) : "")
      : text.indexOf("Audit Newhire") < 0 ? "the window does not name the person it was made for"
        : masked !== "\u2022\u2022\u2022\u2022" || text.indexOf(TEMP_PIN) >= 0 ? "the PIN is not masked: the box reads " + JSON.stringify(masked)
          : "the window names the person and masks the PIN");
  if (opened) {
    await d.clickText(w.show, { inModal: true, exact: true });
    const shown = await pinBox(d);
    const hideWord = (await d.modalButtons()).indexOf(w.hide) >= 0;
    await d.clickText(w.hide, { inModal: true, exact: true });
    const again = await pinBox(d);
    results.check("window", "window/staff/temporary-pin/show-and-hide" + tail, shown === TEMP_PIN && hideWord && again === "\u2022\u2022\u2022\u2022",
      shown !== TEMP_PIN ? JSON.stringify(w.show) + " draws " + JSON.stringify(shown) + " where the API's PIN is " + TEMP_PIN
        : !hideWord ? "the button does not read " + JSON.stringify(w.hide) + " while the PIN shows"
          : again !== "\u2022\u2022\u2022\u2022" ? JSON.stringify(w.hide) + " leaves " + JSON.stringify(again) : "Show draws the PIN and Hide masks it again");

    await armClipboard(d);
    await d.clickText(w.copy, { inModal: true, exact: true });
    const toast = await d.waitToast(2500);
    const copied = await copiedText(d);
    results.check("window", "window/staff/temporary-pin/copy" + tail, copied.length === 1 && copied[0] === TEMP_PIN && toast === w.copied,
      copied.join(",") !== TEMP_PIN ? JSON.stringify(w.copy) + " put " + JSON.stringify(copied) + " on the clipboard"
        : toast !== w.copied ? "the toast reads " + JSON.stringify(toast) + " where it should read " + JSON.stringify(w.copied)
          : "Copy puts the PIN on the clipboard and says " + JSON.stringify(w.copied));
    await d.waitToastGone(3600);

    const mark = d.mark();
    await d.clickText(w.invite, { inModal: true, exact: true });
    const invited = await d.waitToast(2500);
    const sent = d.callsSince(mark).filter((c) => c.method === "POST" && /^\/api\/users\/[^/]+\/invite$/.test(c.path));
    results.check("window", "window/staff/temporary-pin/invite" + tail, sent.length === 1 && sent[0].path === "/api/users/u-new-1/invite" && invited === w.invited,
      sent.length !== 1 ? "the invite was sent " + sent.length + " times" : sent[0].path !== "/api/users/u-new-1/invite" ? "the invite went to " + sent[0].path
        : invited !== w.invited ? "the toast reads " + JSON.stringify(invited) : "POST /api/users/u-new-1/invite, then " + JSON.stringify(w.invited));
    await d.clickText(w.done, { inModal: true, exact: true });
  }
  await d.closeModal();

  // ---- Reset PIN on a custodial lead: a masked number box, and a toast that names the person
  const lead = seed.STAFF[4];
  stubs.reset();
  await d.goto("staff");
  await d.clickRow(4);
  await d.settle(400);
  const offered = await buttonsSaying(d, [d.say("Reset PIN"), d.say("Send a PIN reset link"), d.say("Deactivate"), d.say("Edit")]);
  await d.clickText(d.say("Reset PIN"), { exact: true });
  const box = await d.page.evaluate((sel) => {
    const m = Array.from(document.querySelectorAll(sel)).pop();
    const i = m && m.querySelector("input");
    return i ? { type: i.getAttribute("type"), mode: i.getAttribute("inputmode"), max: i.getAttribute("maxlength"), auto: i.getAttribute("autocomplete") } : null;
  }, MODAL);
  if (box) await d.modal().locator("input").first().fill("4821");
  await d.clickText(d.say("Reset PIN"), { inModal: true, exact: true });
  const resetToast = await d.waitToast(2500);
  results.check("window", "window/staff/reset-pin/masked-number-box" + tail, !!box && box.type === "password" && box.mode === "numeric" && box.max === "4" && box.auto === "off",
    !box ? "no box in the Reset PIN window" : "the box is " + JSON.stringify(box));
  results.check("window", "window/staff/reset-pin/toast-names-the-person" + tail, resetToast === w.resetFor + lead.name,
    "the toast reads " + JSON.stringify(resetToast) + " where it should read " + JSON.stringify(w.resetFor + lead.name));
  results.check("page", "page/staff/a-lead-can-be-changed" + tail, offered.length === 4,
    "a custodial lead's profile offers " + JSON.stringify(offered) + " of Reset PIN, the reset link, Deactivate and Edit");
  await d.waitToastGone(3600);

  // ---- An admin without manage_admins: another admin's profile offers nothing that changes it
  stubs.reset();
  await d.goto("staff");
  const rows = await pencils(d, d.say("Edit"));
  const admins = seed.STAFF.slice(0, 10).filter((p) => p.role === "admin").map((p) => p.name);
  const penciled = rows.filter((r) => admins.some((n) => r.text.indexOf(n) >= 0) && r.pencil).map((r) => r.text.split(" ").slice(0, 2).join(" "));
  const bare = rows.filter((r) => !admins.some((n) => r.text.indexOf(n) >= 0) && !r.pencil).map((r) => r.text.split(" ").slice(0, 2).join(" "));
  results.check("page", "page/staff/no-pencil-on-an-admin" + tail, rows.length >= 10 && penciled.length === 0 && bare.length === 0,
    rows.length < 10 ? "the list's first page holds " + rows.length + " rows" : penciled.length ? "an admin's row carries the pencil: " + penciled.join(", ")
      : bare.length ? "a row that is not an admin's has no pencil: " + bare.join(", ") : "no admin's row carries the pencil and every other row does");
  const other = seed.STAFF[3];
  await d.clickRow(3);
  await d.settle(400);
  const onAdmin = await buttonsSaying(d, [d.say("Reset PIN"), d.say("Send a PIN reset link"), d.say("Deactivate"), d.say("Edit")]);
  const print = await buttonsSaying(d, [d.say("Print Report")]);
  results.check("page", "page/staff/an-admin-account-is-locked" + tail, onAdmin.length === 0 && print.length === 1 && (await d.bodyHas(other.name)),
    !(await d.bodyHas(other.name)) ? "the profile of the admin on row 4 did not open"
      : onAdmin.length ? "an admin without manage_admins is offered " + onAdmin.join(", ") + " on another admin's profile"
        : "Print Report is not there either");

  // ---- A profile save refused for an employee ID somebody else holds says so under the field
  stubs.reset();
  await d.goto("staff");
  await d.clickRow(4);
  await d.settle(400);
  await d.clickText(d.say("Edit"), { exact: true });
  await d.fillByLabel(d.say("Employee ID"), seed.STAFF[5].employee_id);
  stubs.setRefusal({ method: "PATCH", path: new RegExp("^/api/users/" + lead.id + "$"), status: 409, code: TAKEN_BY_OTHER.code, error: TAKEN_BY_OTHER[lang] || TAKEN_BY_OTHER.en });
  await d.clickText(d.say("Save Changes"), { exact: true });
  const refusedToast = await d.waitToast(1500);
  const under = await d.bodyHas(w.taken);
  stubs.clearRefusals();
  results.check("page", "page/staff/employee-id-taken-on-a-profile" + tail, under && refusedToast !== (TAKEN_BY_OTHER[lang] || TAKEN_BY_OTHER.en),
    under ? "the line under the field reads " + JSON.stringify(w.taken)
      : "the save refused with " + TAKEN_BY_OTHER.code + " drew no " + JSON.stringify(w.taken) + (refusedToast ? ", the toast reads " + JSON.stringify(refusedToast) : ""));
  await d.waitToastGone(3600);

  results.note("Staff, PINs and badges in " + lang + ": the Temporary PIN window, Reset PIN, an admin's account and the employee ID line");
}

module.exports = { run };
