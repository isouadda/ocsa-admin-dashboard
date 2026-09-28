// Capabilities, Step 181 (3a69db1), in English and in Spanish at 1280.
//
// The shell reads GET /api/users/me/permissions once after sign-in and gates every control the API
// guards with a capability on that capability, through one rule, hasCap. A supervisor holding
// manage_sites by override is offered Add Site on Sites and Edit Details and Deactivate on a site's
// General Info, where a supervisor on the role's defaults is offered none of them. An admin denied
// manage_supplies finds no Add Supply on Supplies and a card that opens no Edit Supply, where an admin
// on the role's defaults finds both. Roles and Permissions offers no Allow or Deny on an admin's
// account or on the signed-in person, offers manage_admins only to a holder, and says why in one line
// each. The overrides are set in the stub before the person signs in, the way the API holds them on
// the account. The words are written out here by hand, so a wrong entry in the table is red and not
// merely followed.
"use strict";

// What the screen has to say, by hand.
const WORDS = {
  en: { addSite: "Add Site", editDetails: "Edit Details", deactivate: "Deactivate", addSupply: "Add Supply", editSupply: "Edit Supply",
    allow: "Allow", deny: "Deny",
    adminNote: "An admin account holds these by role. There is nothing to change here.",
    ownNote: "Your own capabilities are set by another admin.",
    holderNote: "Only someone who holds this can grant it." },
  es: { addSite: "Agregar sitio", editDetails: "Editar los detalles", deactivate: "Desactivar", addSupply: "Agregar suministro", editSupply: "Editar el suministro",
    allow: "Permitir", deny: "Denegar",
    adminNote: "Una cuenta de administrador los tiene por su rol. Aqu\u00ed no hay nada que cambiar.",
    ownNote: "Sus propias capacidades las define otro administrador.",
    holderNote: "Solo quien la tiene puede otorgarla." },
};

// The words on every button the content area draws, as the browser drew them.
const buttons = (d) => d.page.evaluate(() => {
  const area = document.querySelector("div[style*='padding: 16px 24px 30px'], div[style*='padding: 12px 16px 30px']") || document.body;
  return Array.from(area.querySelectorAll("button")).filter((b) => b.offsetParent !== null).map((b) => (b.textContent || "").trim());
});
const has = (list, word) => list.some((x) => x === word || x.replace(/^\+\s*/, "") === word);

// Signs a person in with the overrides the API would hold on their account.
async function signInWith(d, stubs, persona, seed, overrides) {
  stubs.reset();
  if (overrides) stubs.state.overrides[seed.PEOPLE[persona].id] = overrides;
  await d.signOutHard();
  const mark = d.mark();
  await d.signIn(persona);
  return d.callsSince(mark);
}

async function run({ d, results, seed, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;

  // ---- the shell reads this person's own capabilities, once, from the me route
  const calls = await signInWith(d, stubs, "supervisor", seed, null);
  const me = calls.filter((c) => c.method === "GET" && c.path === "/api/users/me/permissions");
  const perPerson = calls.filter((c) => c.method === "GET" && /^\/api\/users\/[^/]+\/permissions$/.test(c.path) && c.path !== "/api/users/me/permissions");
  results.check("page", "page/shell/reads-its-own-capabilities" + tail, me.length === 1 && perPerson.length === 0,
    "signing in read GET /api/users/me/permissions " + me.length + " times and the per-person route " + perPerson.length + " times");

  // ---- a supervisor on the role's defaults: nothing on Sites that manage_sites guards
  await d.goto("sites");
  await d.settle(400);
  const plainList = await buttons(d);
  await d.clickRow(0);
  await d.settle(400);
  const plainSite = await buttons(d);
  const leaked = [w.addSite].filter((x) => has(plainList, x)).concat([w.editDetails, w.deactivate].filter((x) => has(plainSite, x)));
  results.check("page", "page/sites/no-manage-sites-no-controls" + tail, leaked.length === 0,
    leaked.length ? "a supervisor on the role's defaults is offered " + leaked.join(", ") : "a supervisor on the role's defaults is offered no Add Site, Edit Details or Deactivate");

  // ---- a supervisor holding manage_sites by override: Add Site, Edit Details and Deactivate
  await signInWith(d, stubs, "supervisor", seed, { manage_sites: true });
  await d.goto("sites");
  await d.settle(400);
  const heldList = await buttons(d);
  await d.clickRow(0);
  await d.settle(400);
  const heldSite = await buttons(d);
  const missing = [w.addSite].filter((x) => !has(heldList, x)).concat([w.editDetails, w.deactivate].filter((x) => !has(heldSite, x)));
  results.check("page", "page/sites/manage-sites-by-override" + tail, missing.length === 0,
    missing.length ? "a supervisor holding manage_sites is not offered " + missing.join(", ") : "a supervisor holding manage_sites is offered Add Site, Edit Details and Deactivate");

  // ---- an admin on the role's defaults: Add Supply, and a card opens Edit Supply
  await signInWith(d, stubs, "admin", seed, null);
  await d.goto("supplies");
  await d.settle(400);
  const adminSupplies = await buttons(d);
  await d.clickText("Neutral floor cleaner", { exact: false });
  const adminEdit = (await d.modalText()).indexOf(w.editSupply) >= 0;
  await d.closeModal();
  results.check("page", "page/supplies/manage-supplies-by-role" + tail, has(adminSupplies, w.addSupply) && adminEdit,
    !has(adminSupplies, w.addSupply) ? "an admin on the role's defaults is not offered " + JSON.stringify(w.addSupply)
      : !adminEdit ? "a card does not open " + JSON.stringify(w.editSupply) : "Add Supply is offered and a card opens Edit Supply");

  // ---- an admin denied manage_supplies: no Add Supply, and a card opens nothing
  await signInWith(d, stubs, "admin", seed, { manage_supplies: false });
  await d.goto("supplies");
  await d.settle(400);
  const deniedSupplies = await buttons(d);
  await d.clickText("Neutral floor cleaner", { exact: false });
  const deniedEdit = (await d.modalText()).indexOf(w.editSupply) >= 0;
  await d.closeModal();
  const listed = await d.bodyHas("Neutral floor cleaner");
  results.check("page", "page/supplies/manage-supplies-denied" + tail, listed && !has(deniedSupplies, w.addSupply) && !deniedEdit,
    !listed ? "the supplies are not listed" : has(deniedSupplies, w.addSupply) ? "an admin denied manage_supplies is offered " + JSON.stringify(w.addSupply)
      : deniedEdit ? "a card opens " + JSON.stringify(w.editSupply) + " for an admin denied manage_supplies" : "the supplies are listed with no Add Supply and no Edit Supply");

  // ---- Roles and Permissions: an admin's account, the manage_admins row, and one's own account
  const openPermissions = async (name) => {
    await d.goto("settings");
    await d.settle(400);
    await d.clickText(d.say("Roles and Permissions"), { exact: true });
    await d.settle(300);
    const picked = await d.pickPerson(name);
    await d.settle(400);
    return picked;
  };
  const allowDeny = (list) => list.filter((x) => x === w.allow || x === w.deny).length;

  await signInWith(d, stubs, "admin", seed, null);
  const adminPicked = await openPermissions(seed.STAFF[3].name);
  const onAdmin = await buttons(d);
  const adminNote = await d.bodyHas(w.adminNote);
  results.check("page", "page/settings/permissions/an-admin-account-says-why" + tail, adminPicked && adminNote && allowDeny(onAdmin) === 0,
    !adminPicked ? "the person picker did not offer the admin on row 4" : !adminNote ? "an admin's account does not say " + JSON.stringify(w.adminNote)
      : "an admin's account offers " + allowDeny(onAdmin) + " Allow or Deny buttons");

  const leadPicked = await openPermissions(seed.STAFF[4].name);
  const holderRow = await d.capabilityRow(d.say("Change admin accounts (role, status, PIN)"));
  const onLead = await buttons(d);
  results.check("page", "page/settings/permissions/manage-admins-for-a-holder-only" + tail, leadPicked && !!holderRow && holderRow.onlyHolder && holderRow.buttons.length === 0 && allowDeny(onLead) > 0,
    !leadPicked ? "the person picker did not offer the custodial lead on row 5" : !holderRow ? "no manage_admins row"
      : !holderRow.onlyHolder ? "the manage_admins row does not say " + JSON.stringify(w.holderNote)
        : holderRow.buttons.length ? "the manage_admins row offers " + holderRow.buttons.join(", ")
          : "no other row offers Allow or Deny");

  await signInWith(d, stubs, "capability", seed, null);
  const ownPicked = await openPermissions(seed.PEOPLE.capability.firstName + " " + seed.PEOPLE.capability.lastName);
  const onSelf = await buttons(d);
  const ownNote = await d.bodyHas(w.ownNote);
  results.check("page", "page/settings/permissions/ones-own-account-says-why" + tail, ownPicked && ownNote && allowDeny(onSelf) === 0,
    !ownPicked ? "the person picker did not offer the signed-in person" : !ownNote ? "one's own account does not say " + JSON.stringify(w.ownNote)
      : "one's own account offers " + allowDeny(onSelf) + " Allow or Deny buttons");

  stubs.reset();
  results.note("Capabilities in " + lang + ": the me route, manage_sites by override, manage_supplies denied, and the three lines on Roles and Permissions");
}

module.exports = { run };
