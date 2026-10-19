// What the API answers for the welcome email to everyone who has not signed in (part 361), as ocsa-api main
// af63dca has it, for people of its own beside the staff list's twelve. GET /api/users carries each
// person's signIn (helpers/signIn.js signInView) and welcome (helpers/welcome.js welcomeViews: the latest
// try, { sentAt, status, reason }, or null), and POST /api/users/:id/invite (routes/users.js, manage_staff,
// no body read) answers as helpers/welcome.js sendWelcome decides:
//
//   200 { welcome }                                  the mail went
//   422 { error, code, status: "refused", reason, welcome }
//                                                    not active, signed in, or a client contact
//   422 { error, code, status: "suppressed", reason, welcome }
//                                                    no working email, a suppressed row written
//   502 { error, code, status: "failed", reason, welcome }
//                                                    the mail did not go, welcome.reason.notSent
//   404 common.userNotFound
//
// each reason in the API's words (helpers/words.js) in the screen's language. audit/stubs.js lays it over
// every other layer once a run arms it with setStep361. A row the people below do not hold keeps whatever
// the layers under it answered, and gains a signIn of someone who signed in two days ago and a null
// welcome only when nothing under it answered one. Every invite to these people is kept, with the time it
// arrived, and each is answered after 400 ms, so a run can see whether one went before the last was back.
//
// The people, every value invented: three to send to, one whose last try failed and one sent a welcome 12
// days ago among them; one sent a welcome 3 days ago; one with no email; one with a placeholder email; a
// test account; an inactive person; another admin; one who signs in before the send reaches them, so the
// invite is refused; and one whose mail fails the first time and goes the second.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person, effectiveMap } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const DELAY_MS = 400;
  const NOW = Date.parse(seed.NOW_ISO);
  const ago = (ms) => new Date(NOW - ms).toISOString();
  const DAY = 24 * 60 * 60 * 1000;
  // helpers/words.js, welcome.reason.*, and common.userNotFound.
  const REASON = {
    "welcome.reason.notActive": ["The account is not active.", "La cuenta no est\u00e1 activa."],
    "welcome.reason.signedIn": ["This person has already signed in.", "Esta persona ya inici\u00f3 sesi\u00f3n."],
    "welcome.reason.noEmail": ["No working email on file.", "No hay un correo que funcione registrado."],
    "welcome.reason.notStaff": ["Client contacts do not use the app.", "Los contactos de clientes no usan la app."],
    "welcome.reason.notSent": ["The email could not be sent. Try again later.", "No se pudo enviar el correo. Int\u00e9ntelo m\u00e1s tarde."],
  };
  const say = (key, lang) => T(lang, REASON[key][0], REASON[key][1]);

  // first, last, role, status, email, signed in, welcome { daysAgo, status }, and what the invite meets.
  const PEOPLE = [
    ["u-wel-1", "Amara", "Lindqvist", "custodial_laborer", "active", "amara.lindqvist@example.invalid", null, null],
    ["u-wel-2", "Corin", "Halloway", "day_porter", "active", "corin.halloway@example.invalid", null, { daysAgo: 3, status: "failed" }],
    ["u-wel-3", "Delphine", "Arkwright", "custodial_lead", "active", "delphine.arkwright@example.invalid", null, { daysAgo: 3, status: "sent" }],
    ["u-wel-4", "Emeka", "Fairbanks", "custodial_laborer", "active", "emeka.fairbanks@example.invalid", null, { daysAgo: 12, status: "sent" }],
    ["u-wel-5", "Farida", "Quenneville", "custodial_laborer", "active", null, null, null],
    ["u-wel-6", "Gideon", "Marlowe", "day_porter", "active", "gideon.marlowe@ocsa.temp", null, { daysAgo: 20, status: "suppressed" }],
    ["u-wel-7", "Hana", "Szabolcsi", "custodial_laborer", "active", "hana.szabolcsi@example.invalid", null, null, { test: true }],
    ["u-wel-8", "Ilse", "Brannigan", "custodial_laborer", "inactive", "ilse.brannigan@example.invalid", null, null],
    ["u-wel-9", "Jules", "Ostrander", "day_porter", "active", "jules.ostrander@example.invalid", null, null, { signsInFirst: true }],
    ["u-wel-10", "Kasimir", "Delacourt", "custodial_lead", "active", "kasimir.delacourt@example.invalid", null, null, { failsOnce: true }],
    ["u-wel-11", "Lorna", "Vasquez-Hale", "admin", "active", "lorna.vasquezhale@example.invalid", null, null],
  ];
  const PLACEHOLDER = /@ocsa\.temp$/i;
  const deliverable = (email) => !!(email && String(email).trim() && !PLACEHOLDER.test(String(email)));
  const mine = (id) => PEOPLE.some((p) => p[0] === String(id));

  const st = () => {
    if (state.wa) return state.wa;
    const wa = { invites: [], signedIn: {}, welcome: {}, failed: {} };
    PEOPLE.forEach(([id, , , , , , signedIn, w]) => {
      wa.signedIn[id] = signedIn;
      wa.welcome[id] = !w ? null
        : w.status === "sent" ? { sentAt: ago(w.daysAgo * DAY), status: "sent", reasonKey: null }
        : { sentAt: null, status: w.status, reasonKey: w.status === "failed" ? "welcome.reason.notSent" : "welcome.reason.noEmail" };
    });
    state.wa = wa;
    return wa;
  };
  // Each person as GET /api/users answers a row. They are answered after the list's own rows, so its first
  // page stays as it is, and only while the layer is armed, so turning it off takes them away.
  const ROWS = PEOPLE.map(([id, first, last, role, status, email, , , extra], i) => {
    const site = seed.SITES[i % seed.SITES.length];
    return {
      id, first_name: first, firstName: first, last_name: last, lastName: last, name: first + " " + last,
      role, status, phone: "21555503" + String(10 + i), email,
      employee_id: "EMP-" + String(1201 + i), employeeId: "EMP-" + String(1201 + i),
      badge_number: String(5200 + i * 3), badgeNumber: String(5200 + i * 3), badgeSource: "adp",
      hire_date: seed.shift(-30 + i), hireDate: seed.shift(-30 + i), preferred_language: i % 2 ? "es" : "en",
      site_id: site.id, site_name: site.name, sites: [{ siteId: site.id, siteName: site.name }],
      isTestAccount: !!(extra && extra.test), employmentType: "full_time", hourlyRate: null, certCount: 0,
    };
  });
  const rowOf = (id) => ROWS.find((r) => r.id === String(id)) || null;
  const signInOf = (id, email) => ({ lastSignInAt: st().signedIn[id] || null, mustSetPin: !st().signedIn[id], lockedUntil: null, emailDeliverable: deliverable(email), heldSince: null });
  const welcomeView = (id, lang) => {
    const w = st().welcome[id];
    return w ? { sentAt: w.sentAt, status: w.status, reason: w.reasonKey ? say(w.reasonKey, lang) : null } : null;
  };
  const OTHERS_SIGNED_IN = { lastSignInAt: seed.shift(-2) + "T13:10:00Z", mustSetPin: false, lockedUntil: null, emailDeliverable: true, heldSince: null };
  const withViews = (row, lang) => {
    if (mine(row.id)) return Object.assign({}, row, { signIn: signInOf(row.id, row.email), welcome: welcomeView(row.id, lang) });
    return Object.assign({}, row, { signIn: row.signIn || OTHERS_SIGNED_IN, welcome: row.welcome === undefined ? null : row.welcome });
  };

  // POST /api/users/:id/invite for one of the people, as routes/users.js answers it.
  const invite = (id, lang) => {
    const wa = st();
    const row = rowOf(id);
    const extra = (PEOPLE.find((p) => p[0] === id) || [])[8] || {};
    wa.invites.push({ id, at: Date.now(), lang });
    const answer = (status, json) => ({ status, json, delayMs: DELAY_MS });
    const refuse = (code, status, key) => answer(code, { error: say(key, lang), code: key, status, reason: say(key, lang), welcome: welcomeView(id, lang) });
    if (!row) return answer(404, { error: T(lang, "User not found", "No se encontr\u00f3 el usuario"), code: "common.userNotFound" });
    // The person signs in on their phone before the send reaches them.
    if (extra.signsInFirst && !wa.signedIn[id]) wa.signedIn[id] = ago(20 * 60 * 1000);
    if (row.role === "client_contact") return refuse(422, "refused", "welcome.reason.notStaff");
    if (row.status !== "active") return refuse(422, "refused", "welcome.reason.notActive");
    if (wa.signedIn[id]) return refuse(422, "refused", "welcome.reason.signedIn");
    if (!deliverable(row.email)) {
      wa.welcome[id] = { sentAt: null, status: "suppressed", reasonKey: "welcome.reason.noEmail" };
      return refuse(422, "suppressed", "welcome.reason.noEmail");
    }
    if (extra.failsOnce && !wa.failed[id]) {
      wa.failed[id] = true;
      wa.welcome[id] = { sentAt: null, status: "failed", reasonKey: "welcome.reason.notSent" };
      return refuse(502, "failed", "welcome.reason.notSent");
    }
    wa.welcome[id] = { sentAt: seed.NOW_ISO, status: "sent", reasonKey: null };
    return answer(200, { welcome: welcomeView(id, lang) });
  };

  return {
    route(method, path, query, body, lang, base) {
      const inv = /^\/api\/users\/([^/]+)\/invite$/.exec(path);
      if (inv && method === "POST" && mine(decodeURIComponent(inv[1]))) {
        const me = person();
        if (!me || !effectiveMap(me, (state.overrides || {})[me.id]).manage_staff) return { status: 403, json: { error: "Insufficient permissions" } };
        return invite(decodeURIComponent(inv[1]), lang);
      }
      // A profile of one of the people, as GET /api/users/profile/:id answers it.
      const prof = /^\/api\/users\/profile\/([^/]+)$/.exec(path);
      if (prof && method === "GET" && mine(decodeURIComponent(prof[1]))) {
        const a = base();
        if (!a || a.status !== 200) return a;
        return ok({ user: withViews(rowOf(decodeURIComponent(prof[1])), lang), assignments: [], certifications: [] });
      }
      const a = base();
      if (!a || a.status !== 200 || !a.json) return a;
      if (path === "/api/users" && method === "GET" && Array.isArray(a.json)) {
        const extra = ROWS.filter((r) => (!query.get("status") || r.status === query.get("status")) && (!query.get("role") || r.role === query.get("role")));
        a.json = a.json.map((r) => withViews(r, lang)).concat(extra.map((r) => withViews(r, lang)));
      }
      return a;
    },
    // Every invite to the people above since the run armed it: whom, when it arrived and in which language.
    invites: () => (state.wa ? state.wa.invites.slice() : []),
    people: () => clone(PEOPLE.map((p) => ({ id: p[0], name: p[1] + " " + p[2], email: p[5] }))),
  };
};
