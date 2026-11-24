// What the dashboard's part 413 (Round 14) needs of the stub beyond the API as built at ocsa-api main 06b6d1b (#171),
// each route answered the way the API's code there answers it, with the API's own words in English and Spanish
// (helpers/words.js). audit/stubs.js lays it over the part405 stub and every layer under it, in every run.
//
//   Sections 1 and 2, the Employee of the Month and shout-outs (routes/recognition.js, helpers/recognition.js):
//     GET  /api/recognition/current               { award, seen, isMe }: this month's standing award of the reader's
//                                                 kind (a test reader reads test awards alone), else null
//     GET  /api/recognition/awards?cursor=&limit=  the team wall, standing awards of the reader's kind, newest month
//                                                 first, paged (limit 50 by default, 200 at most), { awards,
//                                                 nextCursor }; 400 paging.badLimit / paging.badCursor
//     GET  /api/recognition/awards/:id             { award, seen, isMe }; a taken-down one for the office
//     POST /api/recognition/awards                 manage_recognition; { userId, month, reason, siteId? } -> 201 {
//                                                 award, told }, told the active staff of the award's kind for this
//                                                 month and 0 for an earlier one; 400 recognition.badDetails keys; 409
//                                                 recognition.monthTaken; 403 recognition.testPerson (a real poster
//                                                 naming a test account) and testCrew.realRecord (a test poster naming
//                                                 a real person)
//     PATCH /api/recognition/awards/:id            { reason?, siteId?, reasonEs?, reasonFr? } during the award's month,
//                                                 409 recognition.monthClosed after; null gives a language back to
//                                                 the translation
//     POST /api/recognition/awards/:id/remove      { reason } 1 to 280 -> { award }; 409 recognition.alreadyRemoved
//     GET  /api/recognition/awards/:id/certificate.pdf?locale=   the PDF; the locale asked is kept (certificates())
//     GET  /api/recognition/shoutouts              the last 30 days, standing, at the reader's sites (an admin every
//                                                 site's), paged; the office's carry lineWords, isTest and removed
//     GET  /api/recognition/shoutouts/people       post_shoutouts; the people the caller may name with the sites they
//                                                 share, { people, nextCursor }; a supervisor the people sharing an
//                                                 active site, an admin everyone active
//     POST /api/recognition/shoutouts              { userId, line, siteId } -> 201 { shoutout }; 403
//                                                 recognition.notYourTeam; 400 recognition.badDetails keys
//     POST /api/recognition/shoutouts/:id/remove   its poster or manage_recognition; 409
//                                                 recognition.shoutoutAlreadyRemoved the second time
//     POST /api/uploads?bucket=profile-photos and POST /api/users/profile/photo { userId, photoUrl }: the photo is
//                                                 kept on the person, and every award and the staff list draw it
//   Scenes: testOffice (the signed-in person is a test office account, as the robot's Test Supervisor is), translated
//   (every award's Spanish and French have arrived), staleTeam (a person the people route offers the supervisor whom the
//   post then refuses 403 recognition.notYourTeam), removedElsewhere (a shout-out someone else took down after the list
//   was read), noWall (no past awards), wallSize (how many past awards the wall holds, 14 by default).
//
// Every value is invented: the people's reasons, the months, the lines and the counts.
"use strict";

module.exports = (ctx) => {
  const { seed, state, clone, person, PNG_BYTES, PDF_BYTES } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const okj = (json) => ({ status: 200, json });
  const made = (json) => ({ status: 201, json });
  const me = () => person();
  const TODAY = seed.TODAY;
  const THIS_MONTH = TODAY.slice(0, 7);
  const PHOTO = "data:image/png;base64," + PNG_BYTES.toString("base64");

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], awards: null, shoutouts: null, seq: 0, photos: {}, certificates: [] };
    return model;
  };
  const sc = () => m().scene;
  const sent = (what, body) => { m().sent.push({ what, body: clone(body === undefined ? null : body) }); };

  // ---- words (helpers/words.js at 06b6d1b) --------------------------------------------------------------------
  const W = {
    "recognition.badDetails": ["Some details are missing or not valid.", "Faltan algunos datos o no son válidos."],
    "recognition.notFound": ["Employee of the Month not found", "No se encontró el Empleado del Mes"],
    "recognition.monthTaken": ["This month already has an Employee of the Month. Take that one down first to post another.", "Este mes ya tiene un Empleado del Mes. Retire ese primero para publicar otro."],
    "recognition.monthClosed": ["An Employee of the Month can only be changed during its own month.", "Un Empleado del Mes solo se puede cambiar durante su propio mes."],
    "recognition.alreadyRemoved": ["This Employee of the Month was already taken down.", "Este Empleado del Mes ya se retiró."],
    "recognition.shoutoutAlreadyRemoved": ["This shout-out was already taken down.", "Este reconocimiento ya se retiró."],
    "recognition.shoutoutNotFound": ["Shout-out not found", "No se encontró el reconocimiento"],
    "recognition.testPerson": ["This is a test account. Only a test office account can recognize a test account.", "Esta es una cuenta de prueba. Solo una cuenta de oficina de prueba puede reconocer a una cuenta de prueba."],
    "recognition.notYourTeam": ["You can give a shout-out only to someone who works at one of your sites.", "Solo puede dar un reconocimiento a alguien que trabaje en uno de sus sitios."],
    "testCrew.realRecord": ["A test account cannot change a real record.", "Una cuenta de prueba no puede cambiar un registro real."],
    "access.insufficientPermissions": ["You do not have permission to do this.", "No tiene permiso para hacer esto."],
    "paging.badLimit": ["The page size is not valid.", "El tamaño de página no es válido."],
    "paging.badCursor": ["The page to start from is not valid.", "La página desde la que empezar no es válida."],
  };
  const say = (lang, key) => T(lang, W[key][0], W[key][1]);
  const refuse = (lang, status, key, extra) => bad(status, key, say(lang, key), extra);
  const MONTHS = {
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  };
  const monthName = (mo, lang) => { const [y, n] = String(mo).split("-").map(Number); return lang === "es" ? MONTHS.es[n - 1] + " de " + y : MONTHS.en[n - 1] + " " + y; };

  // ---- who is who -----------------------------------------------------------------------------------------------
  const staffOf = (id) => (state.staff || []).find((x) => String(x.id) === String(id)) || null;
  const testAccount = (id) => { const p = staffOf(id); return !!p && (p.isTestAccount === true || String(p.id) === "u-staff-10"); };
  const testReader = () => !!sc().testOffice;
  const isAdmin = () => { const p = me(); return !!p && p.role === "admin"; };
  const manages = () => isAdmin();
  const postsShoutouts = () => { const p = me(); return !!p && (p.role === "admin" || p.role === "supervisor"); };
  const activeStaff = () => (state.staff || []).filter((p) => (p.status || "active") === "active" && p.role !== "client_contact");
  const sitesOf = (id) => { const p = staffOf(id); return p && Array.isArray(p.sites) ? p.sites.map((s) => ({ id: String(s.siteId), name: s.siteName })) : []; };
  const initialsOf = (p) => ((p.firstName || p.first_name || "").charAt(0) + (p.lastName || p.last_name || "").charAt(0)).toUpperCase();
  const photoOf = (id) => (m().photos[String(id)] !== undefined ? m().photos[String(id)] : null);
  const personView = (id) => { const p = staffOf(id) || {}; return { id: String(id), firstName: p.firstName || p.first_name || "", lastName: p.lastName || p.last_name || "", initials: initialsOf(p), photoUrl: photoOf(id) }; };
  const siteName = (id) => { const s = (state.sites || []).find((x) => String(x.id) === String(id)); return s ? s.name : ""; };

  // ---- the awards ---------------------------------------------------------------------------------------------
  const REASONS = [
    ["Covered three extra shifts during the storm week and kept every lobby spotless.", "Cubrió tres turnos extra durante la semana de la tormenta y mantuvo cada vestíbulo impecable.", "A couvert trois quarts de plus pendant la semaine de la tempête et a gardé chaque hall impeccable."],
    ["Trained two new porters and never missed a checklist.", "Capacitó a dos nuevos conserjes y nunca se saltó una lista de tareas.", "A formé deux nouveaux agents et n'a jamais manqué une liste."],
    ["Found a leak early and saved the client's new floor.", "Encontró una fuga a tiempo y salvó el piso nuevo del cliente.", "A trouvé une fuite tôt et a sauvé le nouveau sol du client."],
  ];
  const monthsBack = (n) => { const [y, mo] = THIS_MONTH.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 - n, 1)); return d.toISOString().slice(0, 7); };
  const seedAwards = () => {
    const out = [];
    if (sc().noWall) return out;
    const people = ["u-staff-5", "u-staff-6", "u-staff-7", "u-staff-8", "u-staff-9", "u-sup-1"];
    const size = sc().wallSize !== undefined ? Number(sc().wallSize) : 14;
    for (let i = 1; i <= size; i++) {
      const uid = people[i % people.length];
      const r = REASONS[i % REASONS.length];
      const s0 = sitesOf(uid)[0] || null;
      out.push({ id: "aw-" + String(i).padStart(2, "0"), userId: uid, month: monthsBack(i), reason: r[0], es: r[1], esSource: "model", fr: r[2], frSource: "model", siteId: s0 ? s0.id : null, isTest: false, postedBy: "u-admin-1", postedAt: monthsBack(i) + "-02T14:00:00Z", updatedAt: monthsBack(i) + "-02T14:00:00Z", removed: null, counts: { clap: i % 4, star: i % 3, heart: 2, fire: i % 2, muscle: 1 } });
    }
    // One test award, which only a test reader reads.
    out.push({ id: "aw-test-1", userId: "u-staff-10", month: monthsBack(1), reason: "Robot check award.", es: "Reconocimiento de prueba del robot.", esSource: "model", fr: "Distinction de test du robot.", frSource: "model", siteId: null, isTest: true, postedBy: "u-sup-1", postedAt: monthsBack(1) + "-03T14:00:00Z", updatedAt: monthsBack(1) + "-03T14:00:00Z", removed: null, counts: { clap: 0, star: 0, heart: 0, fire: 0, muscle: 0 } });
    if (sc().standingAward) {
      const a = sc().standingAward;
      out.push({ id: a.id || "aw-now", userId: a.userId || "u-staff-6", month: a.month || THIS_MONTH, reason: a.reason || "Kept the clinic ready for its inspection.", es: a.es !== undefined ? a.es : null, esSource: a.es ? "model" : null, fr: a.fr !== undefined ? a.fr : null, frSource: a.fr ? "model" : null, siteId: a.siteId !== undefined ? a.siteId : null, isTest: false, postedBy: "u-admin-1", postedAt: TODAY + "T13:00:00Z", updatedAt: TODAY + "T13:00:00Z", removed: null, counts: { clap: 3, star: 1, heart: 0, fire: 0, muscle: 0 } });
    }
    return out;
  };
  const awards = () => { if (!m().awards) m().awards = seedAwards(); return m().awards; };
  const awardView = (a, lang) => {
    const tr = !!sc().translated;
    const es = a.es || (tr ? "(es) " + a.reason : null);
    const fr = a.fr || (tr ? "(fr) " + a.reason : null);
    const counts = Object.assign({ clap: 0, star: 0, heart: 0, fire: 0, muscle: 0 }, a.counts || {});
    const total = Object.keys(counts).reduce((n, k) => n + (Number(counts[k]) || 0), 0);
    const view = {
      id: a.id, month: a.month, monthName: monthName(a.month, lang),
      person: personView(a.userId),
      site: a.siteId ? { id: a.siteId, name: siteName(a.siteId) } : null,
      reason: lang === "es" && es ? es : a.reason,
      postedAt: a.postedAt,
      reactions: { counts, total, mine: null },
    };
    if (manages()) {
      const pb = staffOf(a.postedBy);
      view.reasonWords = { en: a.reason, es, fr };
      view.postedBy = pb ? { id: String(pb.id), name: (pb.firstName || "") + " " + (pb.lastName || "") } : null;
      view.isTest = a.isTest === true;
      view.updatedAt = a.updatedAt;
      view.removed = a.removed ? { at: a.removed.at, reason: a.removed.reason } : null;
    }
    return view;
  };
  const ofKind = (a) => (a.isTest === true) === testReader();
  const standing = (a) => !a.removed;
  const awardById = (id) => awards().find((a) => a.id === id) || null;
  const readsAward = (a) => !!a && ofKind(a) && (standing(a) || manages());
  const pageOf = (list, query, lang, key) => {
    const limitRaw = query.get("limit");
    const cursor = query.get("cursor") || "";
    let limit = 50;
    if (limitRaw !== null && limitRaw !== "") { limit = Number(limitRaw); if (!Number.isInteger(limit) || limit < 1 || limit > 200) return refuse(lang, 400, "paging.badLimit", { keys: ["limit"] }); }
    let from = 0;
    if (cursor) { from = Number(String(cursor).replace(/^c/, "")); if (!Number.isInteger(from) || from < 0 || from > list.length) return refuse(lang, 400, "paging.badCursor", { keys: ["cursor"] }); }
    const rows = list.slice(from, from + limit);
    const next = from + limit < list.length ? "c" + (from + limit) : null;
    sent(key + "-page", { cursor, limit });
    return { rows, next };
  };
  const toldCount = (isTest) => activeStaff().filter((p) => testAccount(p.id) === isTest).length;
  const textOk = (v, max) => typeof v === "string" && v.trim().length >= 1 && v.trim().length <= max;

  function awardsRoute(method, path, query, body, lang) {
    const b = body && typeof body === "object" ? body : {};
    if (path === "/api/recognition/current" && method === "GET") {
      const a = awards().find((x) => x.month === THIS_MONTH && standing(x) && ofKind(x));
      return okj({ award: a ? awardView(a, lang) : null, seen: false, isMe: !!a && String(a.userId) === String((me() || {}).id) });
    }
    if (path === "/api/recognition/awards" && method === "GET") {
      const list = awards().filter((a) => standing(a) && ofKind(a)).sort((x, y) => (x.month < y.month ? 1 : x.month > y.month ? -1 : (x.id < y.id ? 1 : -1)));
      const pg = pageOf(list, query, lang, "wall");
      if (pg.status) return pg;
      return okj({ awards: pg.rows.map((a) => awardView(a, lang)), nextCursor: pg.next });
    }
    if (path === "/api/recognition/awards" && method === "POST") {
      if (!manages()) return refuse(lang, 403, "access.insufficientPermissions", { capability: "manage_recognition" });
      const keys = [];
      const target = staffOf(b.userId);
      if (!target || (target.status || "active") !== "active" || target.role === "client_contact") keys.push("userId");
      if (typeof b.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(b.month) || b.month > THIS_MONTH) keys.push("month");
      if (!textOk(b.reason, 280)) keys.push("reason");
      if (b.siteId !== undefined && b.siteId !== null && b.siteId !== "" && !(target && sitesOf(target.id).some((s) => s.id === String(b.siteId)))) keys.push("siteId");
      if (keys.length) { sent("award-refused", { keys }); return refuse(lang, 400, "recognition.badDetails", { keys }); }
      const isTest = testAccount(target.id);
      if (isTest && !testReader()) { sent("award-refused", { code: "recognition.testPerson" }); return refuse(lang, 403, "recognition.testPerson"); }
      if (!isTest && testReader()) { sent("award-refused", { code: "testCrew.realRecord" }); return refuse(lang, 403, "testCrew.realRecord", { keys: ["userId"], testRecordsOnly: true }); }
      if (awards().some((a) => a.month === b.month && standing(a) && a.isTest === isTest)) { sent("award-refused", { code: "recognition.monthTaken" }); return refuse(lang, 409, "recognition.monthTaken"); }
      m().seq += 1;
      const a = { id: "aw-new-" + m().seq, userId: String(target.id), month: b.month, reason: b.reason.trim(), es: null, esSource: null, fr: null, frSource: null, siteId: b.siteId ? String(b.siteId) : null, isTest, postedBy: String((me() || {}).id), postedAt: TODAY + "T21:30:00Z", updatedAt: TODAY + "T21:30:00Z", removed: null, counts: {} };
      awards().push(a);
      const told = b.month === THIS_MONTH ? toldCount(isTest) : 0;
      sent("award", { body: b, told });
      return made({ award: awardView(a, lang), told });
    }
    const pdf = /^\/api\/recognition\/awards\/([^/]+)\/certificate\.pdf$/.exec(path);
    if (pdf && method === "GET") {
      const a = awardById(decodeURIComponent(pdf[1]));
      if (!readsAward(a)) return refuse(lang, 404, "recognition.notFound");
      const asked = query.get("locale");
      m().certificates.push({ id: a.id, locale: asked });
      return { status: 200, bytes: PDF_BYTES, contentType: "application/pdf", json: null, headers: { "Content-Disposition": 'inline; filename="employee-of-the-month-' + a.month + '.pdf"' } };
    }
    const rm = /^\/api\/recognition\/awards\/([^/]+)\/remove$/.exec(path);
    if (rm && method === "POST") {
      if (!manages()) return refuse(lang, 403, "access.insufficientPermissions", { capability: "manage_recognition" });
      const a = awardById(decodeURIComponent(rm[1]));
      if (!readsAward(a)) return refuse(lang, 404, "recognition.notFound");
      if (a.removed || sc().awardRemovedElsewhere === a.id) { sent("award-remove-refused", { id: a.id }); return refuse(lang, 409, "recognition.alreadyRemoved"); }
      if (!textOk(b.reason, 280)) return refuse(lang, 400, "recognition.badDetails", { keys: ["reason"] });
      a.removed = { at: TODAY + "T21:40:00Z", reason: b.reason.trim(), by: String((me() || {}).id) };
      sent("award-remove", { id: a.id, reason: b.reason.trim() });
      return okj({ award: awardView(a, lang) });
    }
    const one = /^\/api\/recognition\/awards\/([^/]+)$/.exec(path);
    if (one && method === "GET") {
      const a = awardById(decodeURIComponent(one[1]));
      if (!readsAward(a)) return refuse(lang, 404, "recognition.notFound");
      return okj({ award: awardView(a, lang), seen: false, isMe: false });
    }
    if (one && method === "PATCH") {
      if (!manages()) return refuse(lang, 403, "access.insufficientPermissions", { capability: "manage_recognition" });
      const a = awardById(decodeURIComponent(one[1]));
      if (!readsAward(a)) return refuse(lang, 404, "recognition.notFound");
      if (a.removed) return refuse(lang, 409, "recognition.alreadyRemoved");
      if (a.month !== THIS_MONTH || sc().monthClosed) { sent("award-edit-refused", { id: a.id, code: "recognition.monthClosed" }); return refuse(lang, 409, "recognition.monthClosed"); }
      const keys = [];
      if (b.reason !== undefined && !textOk(b.reason, 280)) keys.push("reason");
      if (b.siteId !== undefined && b.siteId !== null && !sitesOf(a.userId).some((s) => s.id === String(b.siteId))) keys.push("siteId");
      ["reasonEs", "reasonFr"].forEach((k) => { if (b[k] !== undefined && b[k] !== null && !textOk(b[k], 560)) keys.push(k); });
      if (keys.length) return refuse(lang, 400, "recognition.badDetails", { keys });
      if (b.reason !== undefined) a.reason = b.reason.trim();
      if (b.siteId !== undefined) a.siteId = b.siteId === null ? null : String(b.siteId);
      if (b.reasonEs !== undefined) { a.es = b.reasonEs === null ? null : b.reasonEs.trim(); a.esSource = b.reasonEs === null ? null : "person"; }
      if (b.reasonFr !== undefined) { a.fr = b.reasonFr === null ? null : b.reasonFr.trim(); a.frSource = b.reasonFr === null ? null : "person"; }
      a.updatedAt = TODAY + "T21:45:00Z";
      sent("award-edit", { id: a.id, body: b });
      return okj({ award: awardView(a, lang) });
    }
    return null;
  }

  // ---- shout-outs ---------------------------------------------------------------------------------------------
  const LINES = [
    ["Thanks for jumping in on the loading dock tonight.", "Gracias por ayudar en el muelle de carga esta noche.", "Merci d'avoir aidé au quai de chargement ce soir."],
    ["The lobby glass has never looked better.", "El vidrio del vestíbulo nunca se vio mejor.", "Les vitres du hall n'ont jamais été aussi belles."],
    ["You kept the clinic calm during the inspection.", "Mantuvo la clínica en calma durante la inspección.", "Vous avez gardé la clinique calme pendant l'inspection."],
  ];
  const seedShoutouts = () => {
    const out = [];
    const rows = [["u-staff-5", "s-2", "u-sup-1", 1], ["u-staff-6", "s-3", "u-admin-1", 2], ["u-staff-8", "s-2", "u-sup-1", 3], ["u-staff-7", "s-1", "u-admin-1", 5], ["u-staff-9", "s-1", "u-cap-1", 8]];
    rows.forEach((r, i) => {
      const l = LINES[i % LINES.length];
      out.push({ id: "so-" + (i + 1), userId: r[0], siteId: r[1], postedBy: r[2], postedAt: seed.shift(-r[3]) + "T18:00:00Z", line: l[0], es: l[1], fr: l[2], isTest: false, removed: null, counts: { clap: i, star: 1, heart: 0, fire: 0, muscle: 0 } });
    });
    out.push({ id: "so-test-1", userId: "u-staff-10", siteId: "s-1", postedBy: "u-sup-1", postedAt: seed.shift(-1) + "T19:00:00Z", line: "Robot check shout-out.", es: "Reconocimiento de prueba del robot.", fr: "Félicitations de test du robot.", isTest: true, removed: null, counts: {} });
    return out;
  };
  const shoutouts = () => { if (!m().shoutouts) m().shoutouts = seedShoutouts(); return m().shoutouts; };
  const readerSites = () => { const p = me(); if (!p || p.role === "admin" || p.role === "supervisor") return null; return sitesOf(p.id).map((s) => s.id); };
  const shoutView = (o, lang) => {
    const pb = staffOf(o.postedBy);
    const counts = Object.assign({ clap: 0, star: 0, heart: 0, fire: 0, muscle: 0 }, o.counts || {});
    const total = Object.keys(counts).reduce((n, k) => n + (Number(counts[k]) || 0), 0);
    const meId = String((me() || {}).id);
    const v = {
      id: o.id, person: personView(o.userId), line: lang === "es" && o.es ? o.es : o.line,
      site: { id: o.siteId, name: siteName(o.siteId) },
      postedBy: pb ? { id: String(pb.id), firstName: pb.firstName, lastName: pb.lastName, initials: initialsOf(pb) } : null,
      postedAt: o.postedAt, reactions: { counts, total, mine: null }, seen: true, isMe: String(o.userId) === meId,
      canRemove: !o.removed && (manages() || String(o.postedBy) === meId),
    };
    if (manages()) { v.lineWords = { en: o.line, es: o.es || null, fr: o.fr || null }; v.isTest = o.isTest === true; v.removed = o.removed ? { at: o.removed.at, reason: o.removed.reason || null } : null; }
    return v;
  };
  // The sites the caller shares with a person: a supervisor's own active sites against theirs; an admin theirs whole.
  const sharedSites = (uid) => {
    const p = me();
    const theirs = sitesOf(uid);
    if (!p || p.role === "admin") return theirs;
    const mine = new Set(sitesOf(p.id).map((s) => s.id));
    return theirs.filter((s) => mine.has(s.id));
  };
  const nameMatch = (p, q) => { const n = String(q || "").trim().toLowerCase(); if (!n) return true; const f = String(p.firstName || "").toLowerCase(); const l = String(p.lastName || "").toLowerCase(); return n.split(/\s+/).every((w) => f.indexOf(w) >= 0 || l.indexOf(w) >= 0); };

  function shoutoutsRoute(method, path, query, body, lang) {
    const b = body && typeof body === "object" ? body : {};
    const meP = me() || {};
    if (path === "/api/recognition/shoutouts/people" && method === "GET") {
      if (!postsShoutouts()) return refuse(lang, 403, "access.insufficientPermissions", { capability: "post_shoutouts" });
      const q = query.get("q") || "";
      if (q.length > 80) return refuse(lang, 400, "recognition.badDetails", { keys: ["q"] });
      const stale = sc().staleTeam ? String(sc().staleTeam) : "";
      const list = activeStaff().filter((p) => String(p.id) !== String(meP.id) && testAccount(p.id) === testReader())
        .map((p) => ({ p, sites: String(p.id) === stale ? sitesOf(p.id) : sharedSites(p.id) }))
        .filter((x) => meP.role === "admin" || x.sites.length > 0)
        .filter((x) => nameMatch(x.p, q))
        .sort((x, y) => (String(x.p.lastName) + " " + x.p.firstName).localeCompare(String(y.p.lastName) + " " + y.p.firstName));
      const pg = pageOf(list, query, lang, "people");
      if (pg.status) return pg;
      sent("people", { q });
      return okj({ people: pg.rows.map((x) => Object.assign(personView(x.p.id), { sites: x.sites })), nextCursor: pg.next });
    }
    if (path === "/api/recognition/shoutouts" && method === "GET") {
      const sites = readerSites();
      const from = seed.shift(-30);
      const list = shoutouts().filter((o) => !o.removed && (o.isTest === true) === testReader() && o.postedAt.slice(0, 10) >= from && (sites === null || sites.indexOf(o.siteId) >= 0 || String(o.userId) === String(meP.id) || String(o.postedBy) === String(meP.id)))
        .sort((x, y) => (x.postedAt < y.postedAt ? 1 : -1));
      const pg = pageOf(list, query, lang, "shoutouts");
      if (pg.status) return pg;
      return okj({ shoutouts: pg.rows.map((o) => shoutView(o, lang)), nextCursor: pg.next });
    }
    if (path === "/api/recognition/shoutouts" && method === "POST") {
      if (!postsShoutouts()) return refuse(lang, 403, "access.insufficientPermissions", { capability: "post_shoutouts" });
      const keys = [];
      const target = staffOf(b.userId);
      if (!target || (target.status || "active") !== "active" || target.role === "client_contact" || String(target.id) === String(meP.id)) keys.push("userId");
      if (!textOk(b.line, 200)) keys.push("line");
      if (!b.siteId || !(state.sites || []).some((s) => String(s.id) === String(b.siteId))) keys.push("siteId");
      if (keys.length) { sent("shoutout-refused", { keys }); return refuse(lang, 400, "recognition.badDetails", { keys }); }
      const isTest = testAccount(target.id);
      if (isTest && !testReader()) return refuse(lang, 403, "recognition.testPerson");
      if (!isTest && testReader()) { sent("shoutout-refused", { code: "testCrew.realRecord" }); return refuse(lang, 403, "testCrew.realRecord", { keys: ["userId"], testRecordsOnly: true }); }
      if (meP.role !== "admin" && (String(target.id) === String(sc().staleTeam || "") || sharedSites(target.id).length === 0)) { sent("shoutout-refused", { code: "recognition.notYourTeam" }); return refuse(lang, 403, "recognition.notYourTeam"); }
      m().seq += 1;
      const o = { id: "so-new-" + m().seq, userId: String(target.id), siteId: String(b.siteId), postedBy: String(meP.id), postedAt: TODAY + "T21:31:00Z", line: b.line.trim(), es: null, fr: null, isTest, removed: null, counts: {} };
      shoutouts().push(o);
      sent("shoutout", { body: b });
      return made({ shoutout: shoutView(o, lang) });
    }
    const rm = /^\/api\/recognition\/shoutouts\/([^/]+)\/remove$/.exec(path);
    if (rm && method === "POST") {
      const o = shoutouts().find((x) => x.id === decodeURIComponent(rm[1]));
      if (!o || (o.isTest === true) !== testReader()) return refuse(lang, 404, "recognition.shoutoutNotFound");
      const mayRemove = manages() || String(o.postedBy) === String(meP.id);
      if (!mayRemove) return refuse(lang, 404, "recognition.shoutoutNotFound");
      if (o.removed || String(sc().removedElsewhere || "") === o.id) { sent("shoutout-remove-refused", { id: o.id }); return refuse(lang, 409, "recognition.shoutoutAlreadyRemoved"); }
      o.removed = { at: TODAY + "T21:41:00Z", reason: typeof b.reason === "string" && b.reason.trim() ? b.reason.trim() : null };
      sent("shoutout-remove", { id: o.id, reason: o.removed.reason });
      return okj({ shoutout: shoutView(o, lang) });
    }
    const one = /^\/api\/recognition\/shoutouts\/([^/]+)$/.exec(path);
    if (one && method === "GET") {
      const o = shoutouts().find((x) => x.id === decodeURIComponent(one[1]));
      if (!o) return refuse(lang, 404, "recognition.shoutoutNotFound");
      return okj({ shoutout: shoutView(o, lang) });
    }
    return null;
  }

  // ---- photos -------------------------------------------------------------------------------------------------
  function photoRoute(method, path, query, body, lang, base) {
    if (path === "/api/uploads" && method === "POST" && query.get("bucket") === "profile-photos") {
      m().seq += 1;
      sent("photo-upload", { ext: query.get("ext") });
      return okj({ url: PHOTO, path: "profile/audit-photo-" + m().seq + "." + (query.get("ext") === "heic" ? "jpg" : query.get("ext") || "jpg"), kind: "image" });
    }
    if (path === "/api/users/profile/photo" && method === "POST") {
      const b = body && typeof body === "object" ? body : {};
      const target = b.userId != null ? String(b.userId) : String((me() || {}).id);
      if (testAccount(target) !== testReader() && b.userId != null) return refuse(lang, 403, "testCrew.realRecord", { keys: ["userId"] });
      m().photos[target] = PHOTO;
      sent("photo", { userId: target, photoUrl: b.photoUrl });
      return okj({ message: T(lang, "Photo updated", "Foto actualizada"), profilePhotoUrl: PHOTO });
    }
    if (path === "/api/users" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map((x) => (m().photos[String(x.id)] !== undefined ? Object.assign({}, x, { profilePhotoUrl: m().photos[String(x.id)] }) : x));
      return a;
    }
    return null;
  }

  // ---- sign-in: the scene testOffice --------------------------------------------------------------------------
  function signInRoute(method, path, query, body, lang, base) {
    const a = base();
    if (!sc().testOffice || !a || a.status !== 200 || !a.json || !a.json.user || typeof a.json.user !== "object") return a;
    a.json = Object.assign({}, a.json, { user: Object.assign({}, a.json.user, { isTestAccount: true }) });
    return a;
  }

  // ---- a person's timeline: the scene timeline413 ----------------------------------------------------------------
  // The rows routes/users.js timelineEntry answers for the three actions this round words: their English
  // descriptions as helpers/recognition.js and routes/users.js write them, and the month in metadata.
  function timelineRoute(method, path, query, body, lang, base) {
    if (!sc().timeline413 || method !== "GET" || !/^\/api\/users\/timeline\/[^/]+$/.test(path)) return null;
    const month = THIS_MONTH;
    const rows = [
      { id: "tl-413-1", entityType: "user", entityId: "u-staff-7", actionType: "recognized", description: "Named Employee of the Month for " + monthName(month, "en"), metadata: { awardId: "aw-now", month }, createdAt: TODAY + "T15:00:00Z", actorName: "Dana Whitlock" },
      { id: "tl-413-2", entityType: "user", entityId: "u-staff-7", actionType: "recognition_removed", description: "Employee of the Month for " + monthName(month, "en") + " taken down", metadata: { awardId: "aw-now", month }, createdAt: TODAY + "T14:00:00Z", actorName: "Dana Whitlock" },
      { id: "tl-413-3", entityType: "user", entityId: "u-staff-7", actionType: "profile_photo_removed", description: "Admin removed the profile photo of Elena Barbosa", metadata: {}, createdAt: TODAY + "T13:00:00Z", actorName: "Dana Whitlock" },
    ];
    return okj({ entries: rows, nextCursor: null });
  }

  function route(method, path, query, body, lang, base) {
    if (/^\/api\/users\/timeline\//.test(path)) { const r = timelineRoute(method, path, query, body, lang, base); if (r) return r; }
    if (path === "/api/auth/login" || path === "/api/auth/me" || path === "/api/auth/verify-code" || path === "/api/auth/second-step") return signInRoute(method, path, query, body, lang, base);
    if (/^\/api\/recognition\/shoutouts(\/|$)/.test(path)) { const r = shoutoutsRoute(method, path, query, body, lang); if (r) return r; }
    if (/^\/api\/recognition\//.test(path)) { const r = awardsRoute(method, path, query, body, lang); if (r) return r; }
    if (path === "/api/uploads" || path === "/api/users/profile/photo" || path === "/api/users") { const r = photoRoute(method, path, query, body, lang, base); if (r) return r; }
    return base();
  }

  return {
    route,
    // A scene that changes what is seeded seeds again; any other keeps what the run posted.
    setScene: (o) => { const x = m(); const k = Object.keys(o || {}); x.scene = Object.assign({}, x.scene, clone(o || {})); if (k.some((n) => ["noWall", "wallSize", "standingAward"].indexOf(n) >= 0)) { x.awards = null; } },
    sent: () => clone(m().sent),
    certificates: () => clone(m().certificates),
    model: () => m(),
    reset: () => { model = null; },
  };
};
