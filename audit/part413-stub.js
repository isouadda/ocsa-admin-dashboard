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
//   was read), noWall (no past awards), wallSize (how many past awards the wall holds, 14 by default). Every answer of a
//   route that is not a recognition route (Who gets told, the roles screen, the photo, the timeline's words and section
//   3's shapes) changes only under the scene round21, which the part413 suite arms, so the older suites read the stub as
//   they always have.
//
//   Section 5, the training admin (routes/training.js, helpers/trainingCourses.js, helpers/lessonCheck.js,
//   helpers/lessonPlayer.js, helpers/courseCertificates.js, helpers/trainingAttempts.js), under round21:
//     GET  /api/training/courses/manage, POST /api/training/courses, PATCH /api/training/courses/:id and PUT
//                                                 /api/training/courses/:id/topics, each answering { course } with its
//                                                 Title Case notes; 409 training.duplicateCourseKey; 400
//                                                 training.badDetails keys (topicIds[n] for a chapter)
//     POST /api/training/lessons/:topicId/draft { kind: "player" } and /api/training/lesson-drafts/pl-* (PATCH, translate,
//                                                 publish, discard): the draft with its preview, problems and notes
//     POST /api/training/lesson-images            a video (MP4 or WebM) answers { video: { path, src } }
//     opensSignedOut on every topic; PATCH { opensSignedOut } with 409 training.signedOutTaken while another holds it
//     GET and PUT /api/training/certificate-signer
//     POST /api/training/attempts/reset-tries     { userId, topicId } or { all: true }; the gaps read attemptsLeft 0 for
//                                                 the scene outOfTries ([{ userId, topicId }]) until reset
//     the HR folder's course certificate (certificateId unless the scene certificateIds is false), GET
//                                                 /api/training/certificates/:id/pdf and POST .../resend
//   Scenes: signedOutHolder (the topic that opens before sign-in, tp-2 by default), outOfTries, certificateIds,
//   certificateMail (the resend's mailStatus).
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

  // ---- Who gets told and the roles screen (helpers/notify.js TYPES, middleware/capabilities.js) ------------------
  // The four kinds of notice the API's Rounds 19 and 20 name their own people for, and the two capabilities of Round 19,
  // with the English names the API sends.
  const NAMED_413 = [
    { type: "recognition_award", label: "The Employee of the Month is posted", keyed: false, named: true, allowOutsideEmail: false, emailCarriesDetail: false },
    { type: "recognition_reactions", label: "The Employee of the Month is told how many people congratulated them", keyed: false, named: true, allowOutsideEmail: false, emailCarriesDetail: false },
    { type: "recognition_shoutout", label: "Someone gets a shout-out", keyed: false, named: true, allowOutsideEmail: false, emailCarriesDetail: false },
    { type: "training_certificate", label: "A course's certificate is ready", keyed: false, named: true, allowOutsideEmail: false, emailCarriesDetail: false },
  ];
  const CAPS_413 = [
    { key: "manage_recognition", label: T("en", "Employee of the Month", "Empleado del Mes"), group: "Staff", enforced: true, defaults: { admin: true, supervisor: false, staff: false } },
    { key: "post_shoutouts", label: T("en", "Post shout-outs", "Publicar reconocimientos"), group: "Staff", enforced: true, defaults: { admin: true, supervisor: true, staff: false } },
  ];
  function listsRoute(method, path, query, body, lang, base) {
    if (path === "/api/notification-recipients" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.types)) {
        const have = new Set(a.json.types.map((x) => x.type));
        a.json = Object.assign({}, a.json, { types: a.json.types.concat(NAMED_413.filter((x) => !have.has(x.type))) });
      }
      return a;
    }
    if (/^\/api\/users\/[^/]+\/permissions$/.test(path) && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.capabilities)) {
        const have = new Set(a.json.capabilities.map((x) => x.key));
        const caps = CAPS_413.map((c) => Object.assign({}, c, { label: c.key === "manage_recognition" ? T(lang, "Employee of the Month", "Empleado del Mes") : T(lang, "Post shout-outs", "Publicar reconocimientos") }));
        a.json = Object.assign({}, a.json, { capabilities: a.json.capabilities.concat(caps.filter((c) => !have.has(c.key))) });
      }
      return a;
    }
    return null;
  }

  // ---- Section 3: what the API's Rounds 17, 18 and 21 gave the dashboard ---------------------------------------
  let probe = null;
  const read = (path, lng) => { const a = probe ? probe(path, lng || "en") : null; return a && a.status === 200 ? a.json : null; };
  const W3 = {
    "inspections.badDetails": ["Some details are missing or not valid.", "Faltan algunos datos o no son válidos."],
    "timeOff.insideNotice": ["Asked with less notice than the policy asks. The office decides it case by case.", "Se pidió con menos aviso del que pide la política. La oficina lo decide caso por caso."],
    "profile.photoRemoved": ["Photo removed", "Foto eliminada"],
    "leave.classTextPerson.full_time": ["Their time off follows the rules for full-time staff.", "Su tiempo libre sigue las reglas del personal de tiempo completo."],
    "leave.classTextPerson.part_time": ["Their time off follows the rules for part-time staff.", "Su tiempo libre sigue las reglas del personal de medio tiempo."],
    "leave.classTextPerson.supplemental": ["Their time off follows the rules for supplemental staff.", "Su tiempo libre sigue las reglas del personal suplementario."],
    "leave.classTextPerson.none": ["Their employment class is not on file, so only sick, bereavement and unpaid time off are offered.", "Su clase de empleo no está registrada, así que solo se ofrecen permisos por enfermedad, duelo y tiempo sin goce de sueldo."],
    "health.number.task_list_offline": ["Task lists that failed to load with no signal", "Listas de tareas que no cargaron sin señal"],
    "health.number.narration_waiting": ["Lesson screens waiting for their voice", "Pantallas de lecciones sin su voz todavía"],
  };
  const say3 = (lang, key) => T(lang, W3[key][0], W3[key][1]);
  // Templates: site_id and is_test on every row (the scene templates413 ties t-1 to a site), written by POST and PUT.
  const tplMarks = () => { if (!m().tpl) m().tpl = Object.assign({}, clone(sc().templates413 || {})); return m().tpl; };
  function templatesRoute(method, path, query, body, lang, base) {
    const b = body && typeof body === "object" ? body : {};
    const markRow = (r) => { const mk = tplMarks()[String(r.id)] || {}; return Object.assign({}, r, { site_id: mk.siteId || null, is_test: mk.isTest === true }); };
    if (path === "/api/inspections/templates" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map(markRow);
      return a;
    }
    const one = /^\/api\/inspections\/templates(?:\/([^/]+))?$/.exec(path);
    if (one && (method === "POST" || (method === "PUT" && one[1]))) {
      const keys = [];
      if (b.siteId !== undefined && b.siteId !== null && !(state.sites || []).some((x) => String(x.id) === String(b.siteId))) keys.push("siteId");
      if (b.isTest !== undefined && typeof b.isTest !== "boolean") keys.push("isTest");
      if (keys.length) { sent("template-refused", { keys }); return bad(400, "inspections.badDetails", say3(lang, "inspections.badDetails"), { keys }); }
      const a = base();
      if (a && a.status < 300) {
        const id = one[1] ? decodeURIComponent(one[1]) : String((a.json && (a.json.id || (a.json.template && a.json.template.id))) || "new");
        const mk = tplMarks()[id] || {};
        if (b.siteId !== undefined) mk.siteId = b.siteId;
        if (b.isTest !== undefined) mk.isTest = b.isTest;
        tplMarks()[id] = mk;
        sent("template", { method, id, siteId: b.siteId, isTest: b.isTest });
      }
      return a;
    }
    return null;
  }
  // The Library: the robot's test document, isTest on its own item, for an admin.
  function libraryRoute(method, path, query, body, lang, base) {
    const a = base();
    if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.documents)) return a;
    const p = me();
    if (!p || p.role !== "admin") return a;
    const q = (query.get("q") || "").trim().toLowerCase();
    const doc = { docCode: "OCSA-TST-001", title: "[TEST] Robot document", folder: "OTHER", folderName: T(lang, "Other", "Otros"), version: "1", locales: ["en", "es"], isTest: true };
    if (q && "ocsa-tst-001 [test] robot document".indexOf(q) < 0) return a;
    a.json = Object.assign({}, a.json, { documents: a.json.documents.concat([doc]) });
    return a;
  }
  // Health: coverage on the runs, and the two numbers of Rounds 17 and 20.
  const COVERAGE = { apps: { staff: { full: 70, stop: 15, read: 25, notYet: 58 }, dashboard: { full: 21, stop: 0, read: 74, notYet: 446 } }, notYet: [{ id: "dash:page:recognition", screen: "Employee of the Month", round: 8 }, { id: "dash:window:CoursesPanel:onClose", screen: "Training", round: 8 }] };
  function healthRoute(method, path, query, body, lang, base) {
    if (path === "/api/health/runs" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.runs)) a.json = Object.assign({}, a.json, { runs: a.json.runs.map((r, i) => Object.assign({}, r, { coverage: i === 0 ? { apps: clone(COVERAGE.apps), notYetCount: COVERAGE.notYet.length } : null })) });
      return a;
    }
    const rm = /^\/api\/health\/runs\/([^/]+)$/.exec(path);
    if (rm && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.run) {
        const first = read("/api/health/runs?_raw413=1", lang);
        const isFirst = first && Array.isArray(first.runs) && first.runs[0] && first.runs[0].id === a.json.run.id;
        a.json = Object.assign({}, a.json, { run: Object.assign({}, a.json.run, { coverage: isFirst ? clone(COVERAGE) : null }) });
      }
      return a;
    }
    if (path === "/api/health/numbers" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.numbers) && a.json.numbers.length) {
        const like = a.json.numbers[0];
        const add = [["task_list_offline", 12, "yellow", "work"], ["narration_waiting", 3, "yellow", "training"]].filter(([k]) => !a.json.numbers.some((n) => n.key === k))
          .map(([k, v, st, g]) => Object.assign({}, like, { key: k, label: say3(lang, "health.number." + k), labelEn: W3["health.number." + k][0], group: g, unit: "count", value: v, state: st, history: [] }));
        a.json = Object.assign({}, a.json, { numbers: a.json.numbers.concat(add) });
      }
      return a;
    }
    const lm = /^\/api\/health\/numbers\/(task_list_offline|narration_waiting)\/list$/.exec(path);
    if (lm && method === "GET") {
      const items = lm[1] === "task_list_offline"
        ? [{ siteId: "s-1", site: "Harbor Point Center", offline: 9, timeout: 2, server: 0, refused: 1, people: 4 }, { siteId: "s-3", site: "Riverbend Logistics Hub", offline: 3, timeout: 0, server: 1, refused: 0, people: 2 }]
        : [{ topicId: "tp-1", topic: "Using The Staff App", versionId: "lv-9", screen: "welcome", locale: "es", chars: 182 }, { topicId: "tp-1", topic: "Using The Staff App", versionId: "lv-9", screen: "start-shift", locale: "en", chars: 240 }];
      return okj({ key: lm[1], day: query.get("day") || TODAY, items, people: lm[1] === "task_list_offline" });
    }
    return null;
  }
  // Announcements: a test office account's audience of the active test accounts alone.
  function announcementsRoute(method, path, query, body, lang, base) {
    if (!sc().testOffice) return null;
    const testIds = activeStaff().filter((p) => testAccount(p.id)).map((p) => String(p.id));
    const onlyTest = (ids) => Array.isArray(ids) && ids.length > 0 && ids.every((x) => testIds.indexOf(String(x)) >= 0);
    if (path === "/api/announcements/preview" && method === "GET") {
      const ids = String(query.get("userIds") || "").split(",").filter(Boolean);
      if (query.get("type") !== "users" || !onlyTest(ids)) return refuse(lang, 403, "testCrew.realRecord", { testRecordsOnly: true });
      return okj({ count: ids.length, people: ids.map((id) => ({ id, name: personView(id).firstName + " " + personView(id).lastName })) });
    }
    if (path === "/api/announcements" && method === "POST") {
      const b = body && typeof body === "object" ? body : {};
      const aud = b.audience || {};
      if (aud.type !== "users" || !onlyTest(aud.userIds)) { sent("announcement-refused", { audience: aud }); return refuse(lang, 403, "testCrew.realRecord", { testRecordsOnly: true }); }
      sent("announcement", { audience: aud });
      m().seq += 1;
      return made({ announcement: { id: "an-413-" + m().seq, title: b.title, body: b.body, audience: aud, createdAt: TODAY + "T21:30:00Z", sentCount: aud.userIds.length } });
    }
    return null;
  }
  // Leave: total on the missing lists; leaveClass, leaveClassText and each balance's line.
  const classOfPerson = (id) => { const p = staffOf(id); const c = p ? p.employmentType : null; return ["full_time", "part_time", "supplemental"].indexOf(c) >= 0 ? c : "none"; };
  const LEAVE_LINES = {
    paid_sick: ["1 hour for every 40 hours worked, at most 40 earned a year", "1 hora por cada 40 horas trabajadas, como máximo 40 ganadas al año"],
    vacation: ["Granted in full on the work anniversary each tier is reached, then the current tier each January 1", "Se otorga completo en el aniversario de trabajo en que se alcanza cada nivel, y luego el nivel actual cada 1 de enero"],
  };
  const withLine = (bl, lang) => (bl && typeof bl === "object" ? Object.assign({}, bl, { line: LEAVE_LINES[bl.kind] ? { text: T(lang, LEAVE_LINES[bl.kind][0], LEAVE_LINES[bl.kind][1]), note: null, classes: ["part_time", "none", "union"] } : null }) : bl);
  const withLeaveClass = (head) => (head && head.userId != null ? Object.assign({}, head, { leaveClass: classOfPerson(head.userId) }) : head);
  function leaveRoute(method, path, query, body, lang, base) {
    if ((path === "/api/leave/missing-classes" || path === "/api/leave/missing-hire-dates") && method === "GET") {
      if (query.get("_raw413")) return base();
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.people) || sc().noMissingTotals) return a;
      let total = 0; let cursor = ""; let guard = 0;
      do { const d = read(path + "?_raw413=1&limit=200&cursor=" + encodeURIComponent(cursor), lang); if (!d || !Array.isArray(d.people)) break; total += d.people.length; cursor = d.nextCursor || ""; guard += 1; } while (cursor && guard < 20);
      a.json = Object.assign({}, a.json, { total });
      sent(path === "/api/leave/missing-classes" ? "missing-classes-read" : "missing-hire-dates-read", { query: query.toString() });
      return a;
    }
    if (path === "/api/leave/balances" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.people)) a.json = Object.assign({}, a.json, { people: a.json.people.map((x) => Object.assign({}, x, { person: withLeaveClass(x.person), balances: (x.balances || []).map((bl) => withLine(bl, lang)) })) });
      return a;
    }
    const pm = /^\/api\/leave\/people\/([^/]+)$/.exec(path);
    if (pm && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.person) {
        const head = withLeaveClass(a.json.person);
        const c = head.leaveClass || "none";
        a.json = Object.assign({}, a.json, { person: Object.assign({}, head, { leaveClassText: say3(lang, "leave.classTextPerson." + c) }), balances: (a.json.balances || []).map((bl) => withLine(bl, lang)) });
      }
      return a;
    }
    return null;
  }
  // Time off: the API's inside-notice words on every request, and each day's holiday on a request's leave.
  const withNotice = (r, lang) => (r && typeof r === "object" && r.insideNotice === true ? Object.assign({}, r, { insideNoticeText: say3(lang, "timeOff.insideNotice"), insideNoticeWords: { en: W3["timeOff.insideNotice"][0], es: W3["timeOff.insideNotice"][1], fr: "Demandé avec moins de préavis que la politique ne le demande. Le bureau décide au cas par cas." } }) : (r && typeof r === "object" ? Object.assign({}, r, { insideNoticeText: null, insideNoticeWords: null }) : r));
  function timeOffRoute(method, path, query, body, lang, base) {
    if (path === "/api/time-off" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map((r) => withNotice(r, lang));
      else if (a && a.status === 200 && a.json && Array.isArray(a.json.requests)) a.json = Object.assign({}, a.json, { requests: a.json.requests.map((r) => withNotice(r, lang)) });
      return a;
    }
    const one = /^\/api\/time-off\/([^/]+)$/.exec(path);
    if (one && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.request) {
        const r = a.json.request;
        const out = Object.assign({}, a.json, { request: withNotice(r, lang) });
        if (a.json.leave && typeof a.json.leave === "object") {
          const from = String(r.startsOn || r.start_date || r.startDate || "").slice(0, 10);
          const to = String(r.endsOn || r.end_date || r.endDate || from).slice(0, 10);
          let days = Array.isArray(a.json.leave.days) ? clone(a.json.leave.days) : [];
          if (!days.length && from) { let d = from; let g = 0; while (d <= to && g < 31) { days.push({ date: d, hours: 8, from: "noShift" }); const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + 1); d = x.toISOString().slice(0, 10); g += 1; } }
          days = days.map((d, i) => Object.assign({}, d, { holiday: sc().holidayOnFirstDay && i === 0 ? { key: "memorialDay", name: T(lang, "Memorial Day", "Día de los Caídos") } : null }));
          out.leave = Object.assign({}, a.json.leave, { days });
        }
        a.json = out;
      }
      return a;
    }
    return null;
  }
  // DELETE /api/users/profile/photo { userId } by an admin.
  function photoRemoveRoute(method, path, query, body, lang) {
    if (path !== "/api/users/profile/photo" || method !== "DELETE") return null;
    const b = body && typeof body === "object" ? body : {};
    const p = me() || {};
    if (b.userId != null && String(b.userId) !== String(p.id) && p.role !== "admin") return bad(403, "profile.photoOwnOnly", T(lang, "You can only change your own photo.", "Solo puede cambiar su propia foto."));
    const target = b.userId != null ? String(b.userId) : String(p.id);
    m().photos[target] = null;
    sent("photo-removed", { userId: target });
    return okj({ message: say3(lang, "profile.photoRemoved"), code: "profile.photoRemoved", profilePhotoUrl: null });
  }
  // /me/permissions: features.maintenance as the options themselves (the API's Round 18, 3.5).
  function featuresRoute(method, path, query, body, lang, base) {
    const a = base();
    if (sc().maintenanceObject && a && a.status === 200 && a.json && a.json.features && typeof a.json.features === "object") a.json = Object.assign({}, a.json, { features: Object.assign({}, a.json.features, { maintenance: { maxPhotos: 4, responseDays: 3 } }) });
    return a;
  }
  // The staff profile: a photo the run set or removed.
  function profileRoute(method, path, query, body, lang, base) {
    const a = base();
    const id = decodeURIComponent(path.split("/").pop());
    if (a && a.status === 200 && a.json && a.json.user && Object.prototype.hasOwnProperty.call(m().photos, id)) a.json = Object.assign({}, a.json, { user: Object.assign({}, a.json.user, { profilePhotoUrl: m().photos[id] }) });
    else if (a && a.status === 200 && a.json && a.json.user && sc().photoOn && String(sc().photoOn) === id) a.json = Object.assign({}, a.json, { user: Object.assign({}, a.json.user, { profilePhotoUrl: PHOTO }) });
    return a;
  }

  // ---- Section 5: the training admin (the API's Round 20, part 415, at 06b6d1b) ---------------------------------
  // Courses (helpers/trainingCourses.js manageView), player drafts (helpers/lessonCheck.js checkPlayer and notes,
  // helpers/lessonPlayer.js learnerParts for draft.preview), a video upload, the setup chapter's switch
  // (opensSignedOut), the certificate signer, Reset tries, and course certificates in HR Records. Every answer is
  // the admin's (needAdmin, 403 training.noAccess).
  const W5 = {
    "training.noAccess": ["You do not have access to this training", "No tiene acceso a esta capacitación"],
    "training.badDetails": ["Some details are missing or not valid", "Faltan algunos datos o no son válidos"],
    "training.duplicateCourseKey": ["Another course already uses this key.", "Otro curso ya usa esta clave."],
    "training.signedOutTaken": ["Another topic already opens without signing in. Only one can.", "Otro tema ya se abre sin iniciar sesión. Solo uno puede."],
    "training.note.notTitleCase": ["Write this name in Title Case: every word starts with a capital letter, except small joining words.", "Escriba este nombre con mayúsculas iniciales: cada palabra empieza con mayúscula, salvo las palabras cortas de enlace."],
    "training.note.frenchEmpty": ["This text has no French yet; French is not offered while it is off", "Este texto aún no tiene francés; el francés no se ofrece mientras esté apagado"],
    "training.problem.screenCount": ["A player lesson needs 1 to 30 screens.", "Una lección con pantallas necesita de 1 a 30 pantallas."],
    "training.problem.checkCount": ["A player lesson needs 1 to 12 questions.", "Una lección con pantallas necesita de 1 a 12 preguntas."],
    "training.problem.keyMissing": ["Each block and question needs a key", "Cada bloque y cada pregunta necesitan una clave"],
    "training.problem.keyDuplicate": ["Each block and question needs its own key", "Cada bloque y cada pregunta necesitan su propia clave"],
    "training.problem.afterUnknown": ["This question must come after one of the lesson's screens.", "Esta pregunta debe ir después de una de las pantallas de la lección."],
    "training.problem.replayEmpty": ["Name at least one screen to watch again after a wrong answer.", "Indique al menos una pantalla para ver de nuevo después de una respuesta incorrecta."],
    "training.problem.imageOneSource": ["A picture is a drawing or an uploaded file, one of the two", "Una imagen es un dibujo o un archivo subido, uno de los dos"],
    "training.problem.targetCount": ["Mark 1 to 10 right spots on the picture.", "Marque de 1 a 10 lugares correctos en la imagen."],
    "training.problem.targetOutside": ["This spot must sit inside the picture.", "Este lugar debe estar dentro de la imagen."],
    "training.problem.playerOptionCount": ["Give this question 2 to 4 choices.", "Dé a esta pregunta de 2 a 4 opciones."],
    "training.problem.optionDuplicate": ["Each choice of a question needs its own value", "Cada opción de una pregunta necesita su propio valor"],
    "training.problem.correctMissing": ["The right answer must be one of the question's choices", "La respuesta correcta debe ser una de las opciones de la pregunta"],
    "training.problem.ackMissing": ["The lesson needs the line the person signs", "La lección necesita la frase que la persona firma"],
    "training.problem.englishMissing": ["This text needs its English", "Este texto necesita su versión en inglés"],
    "training.problem.spanishMissing": ["This text needs its Spanish", "Este texto necesita su versión en español"],
    "training.badVideo": ["This file is not an MP4 or WebM video.", "Este archivo no es un video MP4 o WebM."],
    "training.certificateNotFound": ["This certificate is not available.", "Este certificado no está disponible."],
    "training.lessonProblems": ["Fix the lesson's problems before publishing", "Corrija los problemas de la lección antes de publicarla"],
  };
  const FR5 = {
    "training.note.notTitleCase": "Écrivez ce nom avec des majuscules initiales : chaque mot commence par une majuscule, sauf les petits mots de liaison.",
    "training.note.frenchEmpty": "Ce texte n'a pas encore de français; le français n'est pas offert tant qu'il est désactivé",
  };
  const say5 = (lang, key) => T(lang, W5[key][0], W5[key][1]);
  const refuse5 = (lang, status, key, extra) => bad(status, key, say5(lang, key), extra);
  // { path, en, es, fr }, as helpers/lessonCheck.js problem shapes it.
  const prob5 = (path, key) => ({ path, en: W5[key][0], es: W5[key][1], fr: FR5[key] || W5[key][0] });
  const t3 = (x) => ({ en: x && typeof x.en === "string" ? x.en : "", es: x && typeof x.es === "string" ? x.es : "", fr: x && typeof x.fr === "string" ? x.fr : "" });
  const s5 = () => { const x = m(); if (!x.s5) x.s5 = { courses: null, seq: 0, drafts: [], signedOut: sc().signedOutHolder === undefined ? "tp-2" : sc().signedOutHolder, signer: null, signerSeq: 0, reset: {}, certs: { "tc-1": { mailStatus: "sent" } } }; return x.s5; };
  const topicsNow = (lang) => { const d = read("/api/training/topics", lang); return d && Array.isArray(d.topics) ? d.topics : []; };
  // helpers/titleCase.js offLanguages: a language whose name has a word of four letters or more that starts small.
  const SMALL = ["a", "an", "and", "the", "of", "to", "in", "on", "for", "at", "by", "or", "de", "del", "la", "el", "y", "en", "los", "las", "et", "du", "des", "le", "les", "con", "por", "para", "sur"];
  const offLanguages = (names) => ["en", "es", "fr"].filter((l) => { const v = String((names || {})[l] || "").trim(); if (!v) return false; const w = v.split(/\s+/); return w.map((x) => x.replace(/^[cdjlmnst]'/i, "")).some((x, i) => /^[a-zà-ÿ]/.test(x) && (i === 0 || SMALL.indexOf(x.toLowerCase()) < 0)); });
  const titleNotes = (names, path) => offLanguages(names).map((l) => prob5(path + "." + l, "training.note.notTitleCase"));
  const seedCourses = () => [
    { id: "cr-1", key: "staff_app", names: { en: "Using the Staff App", es: "Cómo Usar la App del Personal", fr: "Utiliser l'Application du Personnel" }, summary: { en: "The app from sign-in to the end of a shift.", es: "La app desde el inicio de sesión hasta el fin del turno.", fr: "L'application de la connexion à la fin du quart." }, audience: "staff", certificate: true, promoted: true, sortOrder: 10, active: true, topicIds: ["tp-2", "tp-1"], updatedAt: seed.NOW_ISO },
    { id: "cr-2", key: "office_tools", names: { en: "Office Tools", es: "Herramientas de la Oficina", fr: "Outils du Bureau" }, summary: { en: "The dashboard for the office.", es: "El panel para la oficina.", fr: "Le tableau de bord pour le bureau." }, audience: "office", certificate: false, promoted: false, sortOrder: 20, active: true, topicIds: [], updatedAt: seed.NOW_ISO },
  ];
  const courses = () => { const x = s5(); if (!x.courses) x.courses = seedCourses(); return x.courses; };
  const courseView = (c, lang) => {
    const tps = topicsNow(lang);
    const topics = c.topicIds.map((id) => { const tp = tps.find((x) => String(x.id) === id); return { topicId: id, key: tp ? tp.key : null, name: tp ? tp.name : null, names: tp ? t3(tp.names) : null, active: !!tp && tp.active !== false }; });
    const notes = titleNotes(c.names, "names");
    topics.forEach((tp, i) => { if (tp.names) notes.push(...titleNotes(tp.names, "topics[" + i + "].names")); });
    return { id: c.id, key: c.key, name: c.names[lang] || c.names.en, names: t3(c.names), summary: t3(c.summary), audience: c.audience, certificate: c.certificate, promoted: c.promoted, sortOrder: c.sortOrder, active: c.active, topics, notes, updatedAt: c.updatedAt };
  };
  // POST takes every key; PATCH the ones it carries. 400 training.badDetails names each key.
  const readCourse = (b, creating) => {
    const keys = [];
    const textOk = (x, need) => x && typeof x === "object" && !Array.isArray(x) && ["en", "es", "fr"].every((l) => x[l] === undefined || x[l] === null || (typeof x[l] === "string" && x[l].trim().length <= 120)) && (!need || String(x.en || "").trim());
    if (creating && !/^[a-z][a-z0-9_]{1,59}$/.test(String(b.key || ""))) keys.push("key");
    if (creating || b.names !== undefined) { if (!textOk(b.names, true)) keys.push("names"); }
    if (b.summary !== undefined && b.summary !== null && !(b.summary && typeof b.summary === "object")) keys.push("summary");
    if (creating || b.audience !== undefined) { if (["staff", "office"].indexOf(b.audience) < 0) keys.push("audience"); }
    ["certificate", "promoted"].concat(creating ? [] : ["active"]).forEach((k) => { if (b[k] !== undefined && typeof b[k] !== "boolean") keys.push(k); });
    if (b.sortOrder !== undefined && !(Number.isInteger(b.sortOrder) && b.sortOrder >= 0 && b.sortOrder <= 10000)) keys.push("sortOrder");
    return keys;
  };
  function coursesRoute(method, path, query, body, lang) {
    const b = body && typeof body === "object" ? body : {};
    if (path === "/api/training/courses/manage" && method === "GET") {
      if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
      return okj({ courses: courses().slice().sort((a, c) => a.sortOrder - c.sortOrder || a.key.localeCompare(c.key)).map((c) => courseView(c, lang)) });
    }
    if (path === "/api/training/courses" && method === "POST") {
      if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
      const keys = readCourse(b, true);
      if (keys.length) return refuse5(lang, 400, "training.badDetails", { keys });
      if (courses().some((c) => c.key === b.key)) return refuse5(lang, 409, "training.duplicateCourseKey", { keys: ["key"] });
      s5().seq += 1;
      const c = { id: "cr-new-" + s5().seq, key: b.key, names: t3(b.names), summary: t3(b.summary), audience: b.audience, certificate: b.certificate === true, promoted: b.promoted === true, sortOrder: Number.isInteger(b.sortOrder) ? b.sortOrder : 100, active: true, topicIds: [], updatedAt: seed.NOW_ISO };
      courses().push(c);
      sent("coursePost", b);
      return made({ course: courseView(c, lang) });
    }
    const one = /^\/api\/training\/courses\/([^/]+)(\/topics)?$/.exec(path);
    if (one && one[1] !== "manage" && one[1] !== "library") {
      if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
      const c = courses().find((x) => x.id === decodeURIComponent(one[1]));
      if (!c) return bad(404, "training.courseNotFound", T(lang, "Course not found.", "No se encontró el curso."));
      if (!one[2] && method === "PATCH") {
        const keys = readCourse(b, false);
        if (keys.length) return refuse5(lang, 400, "training.badDetails", { keys });
        ["audience", "certificate", "promoted", "sortOrder", "active"].forEach((k) => { if (b[k] !== undefined) c[k] = b[k]; });
        if (b.names !== undefined) c.names = t3(b.names);
        if (b.summary !== undefined) c.summary = t3(b.summary);
        c.updatedAt = seed.NOW_ISO;
        sent("coursePatch", b);
        return okj({ course: courseView(c, lang) });
      }
      if (one[2] && method === "PUT") {
        const ids = Array.isArray(b.topicIds) ? b.topicIds.map(String) : null;
        const known = topicsNow(lang).map((x) => String(x.id));
        if (!ids || ids.length > 40) return refuse5(lang, 400, "training.badDetails", { keys: ["topicIds"] });
        const keys = [];
        ids.forEach((id, i) => { if (known.indexOf(id) < 0 || ids.indexOf(id) !== i) keys.push("topicIds[" + i + "]"); });
        if (keys.length) return refuse5(lang, 400, "training.badDetails", { keys });
        c.topicIds = ids;
        c.updatedAt = seed.NOW_ISO;
        sent("courseTopics", b);
        return okj({ course: courseView(c, lang) });
      }
    }
    return null;
  }

  // A player draft, as helpers/trainingLessons.js draftAnswer answers it: the content as stored, preview the screens and
  // checks as an English learner reads them, and the problems and notes in reading order.
  const IMAGE_PATH = /^lessons\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
  const VIDEO_PATH = /^video\/[0-9a-f-]{36}\.(mp4|webm)$/;
  const VIDEO_SRC = "data:video/mp4;base64,AAAAIGZ0eXBpc29t";
  const textsOfPlayer = (c) => {
    const out = [];
    if (c.title && (c.title.en || c.title.es || c.title.fr)) out.push({ path: "title", text: c.title });
    (c.screens || []).forEach((s0, i) => { out.push({ path: "screens[" + i + "].say", text: s0.say }); if (s0.caption && (s0.caption.en || s0.caption.es || s0.caption.fr)) out.push({ path: "screens[" + i + "].caption", text: s0.caption }); });
    (c.checks || []).forEach((ck, i) => { out.push({ path: "checks[" + i + "].prompt", text: ck.prompt }); (ck.options || []).forEach((o, j) => { if (ck.kind === "picture") out.push({ path: "checks[" + i + "].options[" + j + "].alt", text: o.alt }); else if (ck.kind === "choice") out.push({ path: "checks[" + i + "].options[" + j + "].text", text: o.text }); }); });
    out.push({ path: "acknowledgement", text: c.acknowledgement });
    return out;
  };
  const pictureProblems = (p0, path, out) => {
    const p = p0 || {};
    const hasSvg = typeof p.svg === "string" && p.svg.trim() !== "";
    const hasPath = typeof p.path === "string" && p.path !== "";
    if (hasSvg === hasPath) out.push(prob5(path, "training.problem.imageOneSource"));
  };
  const playerProblems = (c, safety) => {
    const out = [];
    const screens = Array.isArray(c.screens) ? c.screens : [];
    const checks = Array.isArray(c.checks) ? c.checks : [];
    if (screens.length < 1 || screens.length > 30) out.push(prob5("screens", "training.problem.screenCount"));
    if (checks.length < 1 || checks.length > 12) out.push(prob5("checks", "training.problem.checkCount"));
    const seen = new Set();
    const keyed = (key, path) => { if (!key) { out.push(prob5(path + ".key", "training.problem.keyMissing")); return; } if (seen.has(key)) out.push(prob5(path + ".key", "training.problem.keyDuplicate")); seen.add(key); };
    const screenKeys = new Set(screens.map((x) => x.key).filter(Boolean));
    screens.forEach((s0, i) => { keyed(s0.key, "screens[" + i + "]"); const md = s0.media || {}; if (md.kind === "image") pictureProblems(md, "screens[" + i + "].media", out); });
    checks.forEach((ck, i) => {
      const p = "checks[" + i + "]";
      keyed(ck.key, p);
      if (!ck.after || !screenKeys.has(ck.after)) out.push(prob5(p + ".after", "training.problem.afterUnknown"));
      if (!Array.isArray(ck.replay) || !ck.replay.length) out.push(prob5(p + ".replay", "training.problem.replayEmpty"));
      if (ck.kind === "tap") {
        pictureProblems(ck.image, p + ".image", out);
        const tg = Array.isArray(ck.targets) ? ck.targets : [];
        if (tg.length < 1 || tg.length > 10) out.push(prob5(p + ".targets", "training.problem.targetCount"));
        tg.forEach((x, j) => { if (!(x.x >= 0 && x.y >= 0 && x.w > 0 && x.h > 0 && x.x + x.w <= 1 && x.y + x.h <= 1)) out.push(prob5(p + ".targets[" + j + "]", "training.problem.targetOutside")); });
        return;
      }
      const opts = Array.isArray(ck.options) ? ck.options : [];
      if (opts.length < 2 || opts.length > 4) out.push(prob5(p + ".options", "training.problem.playerOptionCount"));
      const vals = opts.map((o) => o.value);
      if (vals.some((v) => !v) || new Set(vals).size !== vals.length) out.push(prob5(p + ".options", "training.problem.optionDuplicate"));
      if (!ck.correct || vals.indexOf(ck.correct) < 0) out.push(prob5(p + ".correct", "training.problem.correctMissing"));
    });
    if (!c.acknowledgement || !c.acknowledgement.en) out.push(prob5("acknowledgement", "training.problem.ackMissing"));
    textsOfPlayer(c).forEach(({ path, text }) => {
      const x = text || {};
      if (!x.en) { if (path !== "title" && path !== "acknowledgement" && !/\.alt$/.test(path)) out.push(prob5(path + ".en", "training.problem.englishMissing")); return; }
      if (!x.es && !safety) out.push(prob5(path + ".es", "training.problem.spanishMissing"));
    });
    return out;
  };
  const playerNotes = (c) => {
    const out = [];
    textsOfPlayer(c).forEach(({ path, text }) => { if (text && text.en && !text.fr) out.push(prob5(path + ".fr", "training.note.frenchEmpty")); });
    if (c.title && (c.title.en || c.title.es || c.title.fr)) offLanguages(c.title).forEach((l) => out.push(prob5("title." + l, "training.note.notTitleCase")));
    return out;
  };
  const picSrc = (p) => (p && (p.svg || p.path) ? PHOTO : null);
  const previewOf = (c) => ({
    screens: (c.screens || []).map((s0) => { const md = s0.media || {}; return { key: s0.key, media: md.kind === "image" ? { kind: "image", src: picSrc(md) } : md.kind === "video" ? { kind: "video", src: md.path ? VIDEO_SRC : null, poster: md.poster ? PHOTO : null } : { kind: "none" }, say: (s0.say || {}).en || "", caption: s0.caption && s0.caption.en ? s0.caption.en : null, audio: null }; }),
    checks: (c.checks || []).map((ck) => { const o = { key: ck.key, after: ck.after, kind: ck.kind, prompt: (ck.prompt || {}).en || "" }; if (ck.kind === "choice") o.options = (ck.options || []).map((x) => ({ value: x.value, text: (x.text || {}).en || "" })); if (ck.kind === "picture") o.options = (ck.options || []).map((x) => ({ value: x.value, src: picSrc(x.image), alt: (x.alt || {}).en || "" })); if (ck.kind === "tap") o.image = { src: picSrc(ck.image) }; return o; }),
  });
  const safetyOf = (topicId, lang) => { const tp = topicsNow(lang).find((x) => String(x.id) === String(topicId)); return !!(tp && tp.safetyCritical); };
  const playerDraftView = (v) => ({ id: v.id, topicId: v.topicId, content: clone(v.content), passPercent: 100, maxAttempts: null, needsTrainer: false, sources: [], checkedEsBy: v.checkedEsBy || null, checkedFrBy: null, changeNote: null, stale: false, kind: "player", spanishUnchecked: false, preview: previewOf(v.content) });
  const playerAnswer = (v, lang) => ({ draft: playerDraftView(v), problems: playerProblems(v.content, safetyOf(v.topicId, lang)), notes: playerNotes(v.content) });
  const BLANK_PLAYER = () => ({ title: { en: "", es: "", fr: "" }, acknowledgement: { en: "", es: "", fr: "" }, screens: [], checks: [] });
  function playerRoute(method, path, query, body, lang, base) {
    const b = body && typeof body === "object" ? body : {};
    const lp = /^\/api\/training\/lessons\/([^/]+)\/(versions|draft)$/.exec(path);
    if (lp && lp[2] === "draft" && method === "POST" && b.kind === "player") {
      if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
      const topicId = decodeURIComponent(lp[1]);
      const open = s5().drafts.find((v) => v.topicId === topicId && v.status === "draft");
      if (open) return bad(409, "training.draftOpen", T(lang, "This training already has a lesson draft open", "Esta capacitación ya tiene un borrador de lección abierto"), { draftId: open.id });
      s5().seq += 1;
      const v = { id: "pl-" + s5().seq, topicId, status: "draft", content: BLANK_PLAYER(), checkedEsBy: null };
      s5().drafts.push(v);
      sent("playerDraft", b);
      return made(playerAnswer(v, lang));
    }
    if (lp && lp[2] === "versions" && method === "GET") {
      const a = base();
      const mine = s5().drafts.filter((v) => v.topicId === decodeURIComponent(lp[1]) && v.status !== "discarded");
      if (a && a.status === 200 && a.json && Array.isArray(a.json.versions) && mine.length) a.json = Object.assign({}, a.json, { versions: mine.map((v) => ({ id: v.id, version: v.version || null, status: v.status, publishedAt: v.publishedAt || null, publishedBy: null, changeNote: null, stale: false, attempts: 0, kind: "player" })).concat(a.json.versions) });
      return a;
    }
    const dp = /^\/api\/training\/lesson-drafts\/(pl-[^/]+)(?:\/(translate|publish|discard))?$/.exec(path);
    if (dp) {
      if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
      const v = s5().drafts.find((x) => x.id === decodeURIComponent(dp[1]) && x.status === "draft");
      if (!v) return bad(404, "training.noLesson", T(lang, "This training has no lesson", "Esta capacitación no tiene lección"));
      if (!dp[2] && method === "GET") return okj(playerAnswer(v, lang));
      if (!dp[2] && method === "PATCH") {
        if (b.content !== undefined) { if (!b.content || typeof b.content !== "object" || !Array.isArray(b.content.screens)) return refuse5(lang, 400, "training.badDetails", { keys: ["content"] }); v.content = clone(b.content); }
        sent("playerPatch", b);
        return okj(playerAnswer(v, lang));
      }
      if (dp[2] === "translate" && method === "POST") {
        textsOfPlayer(v.content).forEach(({ text }) => { if (text && text.en) ["es", "fr"].forEach((l) => { if (b.overwrite || !text[l]) text[l] = text.en + " (" + l + ")"; }); });
        sent("playerTranslate", b);
        return okj(playerAnswer(v, lang));
      }
      if (dp[2] === "publish" && method === "POST") {
        const problems = playerProblems(v.content, safetyOf(v.topicId, lang));
        if (problems.length) return refuse5(lang, 400, "training.lessonProblems", { problems });
        v.status = "published"; v.version = 1; v.publishedAt = seed.NOW_ISO;
        sent("playerPublish", { id: v.id });
        return okj({ version: { id: v.id, version: 1, status: "published", publishedAt: v.publishedAt, publishedBy: null, changeNote: null, stale: false, attempts: 0, kind: "player" } });
      }
      if (dp[2] === "discard" && method === "POST") { v.status = "discarded"; sent("playerDiscard", { id: v.id }); return okj({ draft: playerDraftView(v) }); }
    }
    // A video goes up through the pictures' route (POST /api/training/lesson-images): MP4 or WebM, 25 MB.
    if (path === "/api/training/lesson-images" && method === "POST" && typeof body === "string" && /Content-Type:\s*video\//i.test(body)) {
      if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
      if (!/Content-Type:\s*video\/(mp4|webm)/i.test(body)) return refuse5(lang, 400, "training.badVideo", { keys: ["file"] });
      s5().seq += 1;
      const ext = /video\/webm/i.test(body) ? "webm" : "mp4";
      const p = "video/b2c3d4e5-0000-4000-8000-" + String(s5().seq).padStart(12, "0") + "." + ext;
      sent("videoUpload", { path: p });
      return made({ video: { path: p, src: VIDEO_SRC } });
    }
    return null;
  }

  // The setup chapter: opensSignedOut on every topic, one at most; PATCH { opensSignedOut } alone is answered here.
  function signedOutRoute(method, path, query, body, lang, base) {
    const b = body && typeof body === "object" ? body : {};
    const holder = () => s5().signedOut;
    const mark = (tp) => (tp && typeof tp === "object" ? Object.assign({}, tp, { opensSignedOut: String(tp.id) === String(holder()) }) : tp);
    if (path === "/api/training/topics" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.topics)) a.json = Object.assign({}, a.json, { topics: a.json.topics.map(mark) });
      return a;
    }
    const one = /^\/api\/training\/topics\/([^/]+)$/.exec(path);
    if (one && one[1] !== "order" && method === "PATCH" && b.opensSignedOut !== undefined) {
      if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
      if (typeof b.opensSignedOut !== "boolean") return refuse5(lang, 400, "training.badDetails", { keys: ["opensSignedOut"] });
      const id = decodeURIComponent(one[1]);
      if (b.opensSignedOut && holder() && String(holder()) !== id) return refuse5(lang, 409, "training.signedOutTaken", { keys: ["opensSignedOut"] });
      const tp = topicsNow(lang).find((x) => String(x.id) === id);
      if (!tp) return bad(404, "training.topicNotFound", T(lang, "Training not found", "No se encontró la capacitación"));
      s5().signedOut = b.opensSignedOut ? id : (String(holder()) === id ? null : holder());
      sent("signedOut", { id, on: b.opensSignedOut });
      return okj({ topic: mark(tp) });
    }
    if (one && method === "GET") { const a = base(); if (a && a.status === 200 && a.json && a.json.topic) a.json = Object.assign({}, a.json, { topic: mark(a.json.topic) }); return a; }
    return null;
  }

  // The certificate signer (helpers/courseCertificates.js activeSigner and readSigner); the one before kept inactive.
  function signerRoute(method, path, query, body, lang) {
    const b = body && typeof body === "object" ? body : {};
    if (path !== "/api/training/certificate-signer") return null;
    if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
    if (method === "GET") return okj({ signer: s5().signer ? clone(s5().signer) : null });
    if (method !== "PUT") return null;
    const keys = [];
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name || name.length > 120) keys.push("name");
    const title = t3(b.title);
    if (!b.title || typeof b.title !== "object" || !title.en.trim() || ["en", "es", "fr"].some((l) => title[l].length > 120)) keys.push("title");
    if (b.signature !== undefined && b.signature !== null && b.signature !== "" && !/^data:image\/png;base64,/.test(String(b.signature))) keys.push("signature");
    if (b.approvedNote !== undefined && b.approvedNote !== null && b.approvedNote !== "" && (typeof b.approvedNote !== "string" || b.approvedNote.trim().length > 500)) keys.push("approvedNote");
    if (keys.length) return refuse5(lang, 400, "training.badDetails", { keys });
    s5().signerSeq += 1;
    s5().signer = { id: "cs-" + s5().signerSeq, name, title: { en: title.en.trim(), es: title.es.trim(), fr: title.fr.trim() }, hasSignature: !!b.signature, approvedNote: b.approvedNote ? String(b.approvedNote).trim() : null, createdAt: seed.NOW_ISO };
    sent("signer", { name, title, hasSignature: !!b.signature, approvedNote: b.approvedNote || null });
    return okj({ signer: clone(s5().signer) });
  }

  // Reset tries (helpers/trainingAttempts.js resetTries): the out-of-tries items the scene outOfTries names
  // ([{ userId, topicId }]) read attemptsLeft 0 on the gaps until reset.
  const outOfTries = () => (Array.isArray(sc().outOfTries) ? sc().outOfTries : []).filter((x) => !s5().reset[x.userId + ":" + x.topicId]);
  const spent = (uid, item) => outOfTries().some((x) => x.userId === String(uid) && x.topicId === String(item.topicId));
  const spend = (uid, item) => (spent(uid, item) ? Object.assign({}, item, { status: item.status === "current" ? "missing" : item.status, lesson: Object.assign({ versionId: "lv-1", attemptsUsed: 3 }, item.lesson || {}, { attemptsLeft: 0 }) }) : item);
  // An item out of tries as the dashboard reads it (gapNeedsSession); once reset, its tries are back.
  const isOut = (it) => !!(it && it.lesson && it.lesson.attemptsLeft != null && Number(it.lesson.attemptsLeft) === 0 && it.status !== "current" && it.status !== "awaitingTrainer");
  const fresh = (uid, it) => (s5().reset[uid + ":" + it.topicId] && isOut(it) ? Object.assign({}, it, { status: it.status === "inProgress" ? "missing" : it.status, attemptId: null, lesson: Object.assign({}, it.lesson, { attemptsUsed: 0, attemptsLeft: 3 }) }) : it);
  function triesRoute(method, path, query, body, lang, base) {
    const b = body && typeof body === "object" ? body : {};
    if (path === "/api/training/gaps" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.people)) {
        const people = a.json.people.map((p) => Object.assign({}, p, { items: (p.items || []).map((it) => fresh(p.id, spend(p.id, it))) }));
        outOfTries().forEach((x) => { if (!people.some((p) => String(p.id) === x.userId)) { const p = staffOf(x.userId); if (p) people.push({ id: p.id, name: p.name, role: p.role, sites: [], open: 1, items: [spend(p.id, { topicId: x.topicId, name: ((topicsNow(lang).find((y) => String(y.id) === x.topicId)) || {}).name || x.topicId, status: "missing", siteId: null, siteName: null, lesson: null })] }); } });
        a.json = Object.assign({}, a.json, { people });
      }
      return a;
    }
    const gp = /^\/api\/training\/gaps\/people\/([^/]+)$/.exec(path);
    if (gp && method === "GET") {
      const a = base();
      const uid = decodeURIComponent(gp[1]);
      if (a && a.status === 200 && a.json && Array.isArray(a.json.items)) a.json = Object.assign({}, a.json, { items: a.json.items.map((it) => fresh(uid, spend(uid, it))) });
      return a;
    }
    if (path === "/api/training/attempts/reset-tries" && method === "POST") {
      if (!isAdmin()) return refuse5(lang, 403, "training.noAccess");
      if (b.all !== true) {
        const keys = [];
        if (!b.userId) keys.push("userId");
        if (!b.topicId) keys.push("topicId");
        if (keys.length) return refuse5(lang, 400, "training.badDetails", { keys });
      }
      // Every item out of tries now, the stub's own and the scene's, once each.
      const g = read("/api/training/gaps", lang);
      const outs = [];
      ((g && g.people) || []).forEach((p) => (p.items || []).forEach((it) => { if (isOut(it) && !outs.some((x) => x.userId === String(p.id) && x.topicId === String(it.topicId))) outs.push({ userId: String(p.id), topicId: String(it.topicId) }); }));
      const scope = b.all === true ? outs : outs.filter((x) => x.userId === String(b.userId) && x.topicId === String(b.topicId));
      const reset = scope.map((x, i) => ({ userId: x.userId, topicId: x.topicId, versionId: "lv-1", attemptIds: ["ta-" + (i * 3 + 1), "ta-" + (i * 3 + 2), "ta-" + (i * 3 + 3)] }));
      scope.forEach((x) => { s5().reset[x.userId + ":" + x.topicId] = true; });
      sent("resetTries", b);
      return okj({ reset, voided: reset.length * 3 });
    }
    return null;
  }

  // Course certificates in HR Records: the folder's document of category training_certificate carries certificateId
  // under the scene certificateIds (the API does not send it at 06b6d1b, so the dashboard opens it as every document
  // without it); GET /api/training/certificates/:id/pdf and POST .../resend.
  function certificatesRoute(method, path, query, body, lang, base) {
    if (/^\/api\/hr\/employee-folder\/[^/]+$/.test(path) && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.items)) {
        const item = Object.assign({ source: "document", source_id: "ed-cert-1", title: T(lang, "Using the Staff App certificate", "Certificado de Cómo usar la app del personal"), category: "training_certificate", raw_category_label: null, date: TODAY + "T14:00:00.000Z", expiry_date: null }, sc().certificateIds === false ? {} : { certificateId: "tc-1" });
        const items = a.json.items.concat([item]);
        const counts = Object.assign({}, a.json.counts_by_category || {});
        counts.training_certificate = (counts.training_certificate || 0) + 1;
        a.json = Object.assign({}, a.json, { items, counts_by_category: counts, total_items: items.length });
      }
      return a;
    }
    const cp = /^\/api\/training\/certificates\/([^/]+)\/(pdf|resend)$/.exec(path);
    if (cp) {
      const id = decodeURIComponent(cp[1]);
      const c = s5().certs[id];
      if (!c) return refuse5(lang, 404, "training.certificateNotFound");
      if (cp[2] === "pdf" && method === "GET") { sent("certificatePdf", { id }); return { status: 200, bytes: PDF_BYTES, contentType: "application/pdf", json: null, headers: { "Content-Disposition": 'inline; filename="certificate-' + id + '.pdf"' } }; }
      if (cp[2] === "resend" && method === "POST") {
        const st = sc().certificateMail || "sent";
        sent("certificateResend", { id });
        return okj({ certificate: { id, number: "OCSA-TR-2026-00001", courseId: "cr-1", mailStatus: st }, mailStatus: st });
      }
    }
    return null;
  }

  function route(method, path, query, body, lang, base) {
    // Section 3's answers are the API's since Rounds 17, 18 and 21; the older suites read the stub as it was, so they
    // answer under the scene round21 alone, which the part413 suite arms.
    const r21 = !!sc().round21;
    // Section 5's answers are the API's Round 20 (part 415), under round21 as section 3's are.
    if (r21 && /^\/api\/training\/courses/.test(path)) { const r = coursesRoute(method, path, query, body, lang); if (r) return r; }
    if (r21 && (/^\/api\/training\/lessons\//.test(path) || /^\/api\/training\/lesson-drafts\/pl-/.test(path) || path === "/api/training/lesson-images")) { const r = playerRoute(method, path, query, body, lang, base); if (r) return r; }
    if (r21 && /^\/api\/training\/topics/.test(path)) { const r = signedOutRoute(method, path, query, body, lang, base); if (r) return r; }
    if (r21 && path === "/api/training/certificate-signer") { const r = signerRoute(method, path, query, body, lang); if (r) return r; }
    if (r21 && (/^\/api\/training\/gaps/.test(path) || path === "/api/training/attempts/reset-tries")) { const r = triesRoute(method, path, query, body, lang, base); if (r) return r; }
    if (r21 && (/^\/api\/hr\/employee-folder\//.test(path) || /^\/api\/training\/certificates\//.test(path))) { const r = certificatesRoute(method, path, query, body, lang, base); if (r) return r; }
    if (r21 && /^\/api\/inspections\/templates/.test(path)) { const r = templatesRoute(method, path, query, body, lang, base); if (r) return r; }
    if (r21 && path === "/api/library" && method === "GET") return libraryRoute(method, path, query, body, lang, base);
    if (r21 && /^\/api\/health\//.test(path) && !query.get("_raw413")) { const r = healthRoute(method, path, query, body, lang, base); if (r) return r; }
    if (/^\/api\/announcements/.test(path)) { const r = announcementsRoute(method, path, query, body, lang, base); if (r) return r; }
    // A test office account's private lines are the test accounts' (the API's Round 17).
    if (path === "/api/chat/dm-inbox" && method === "GET" && sc().testOffice) return okj([{ channelId: "dm-test-1", staffUserId: "u-staff-10", staffName: "Bertrand Lefevre", staffRole: "day_porter", lastMessage: "Robot check line.", lastMessageAt: TODAY + "T20:10:00Z", lastSenderId: "u-staff-10" }]);
    if (r21 && /^\/api\/leave\//.test(path)) { const r = leaveRoute(method, path, query, body, lang, base); if (r) return r; }
    if (r21 && /^\/api\/time-off/.test(path)) { const r = timeOffRoute(method, path, query, body, lang, base); if (r) return r; }
    if (path === "/api/users/profile/photo" && method === "DELETE") return photoRemoveRoute(method, path, query, body, lang);
    if (r21 && path === "/api/users/me/permissions" && method === "GET") return featuresRoute(method, path, query, body, lang, base);
    if (r21 && /^\/api\/users\/profile\/[^/]+$/.test(path) && method === "GET") return profileRoute(method, path, query, body, lang, base);
    if (r21 && (path === "/api/notification-recipients" || /^\/api\/users\/[^/]+\/permissions$/.test(path))) { const r = listsRoute(method, path, query, body, lang, base); if (r) return r; }
    if (/^\/api\/users\/timeline\//.test(path)) { const r = timelineRoute(method, path, query, body, lang, base); if (r) return r; }
    if (path === "/api/auth/login" || path === "/api/auth/me" || path === "/api/auth/verify-code" || path === "/api/auth/second-step") return signInRoute(method, path, query, body, lang, base);
    // The recognition routes are new and every run reads them as the API answers them.
    if (/^\/api\/recognition\/shoutouts(\/|$)/.test(path)) { const r = shoutoutsRoute(method, path, query, body, lang); if (r) return r; }
    if (/^\/api\/recognition\//.test(path)) { const r = awardsRoute(method, path, query, body, lang); if (r) return r; }
    if (r21 && (path === "/api/uploads" || path === "/api/users/profile/photo" || path === "/api/users")) { const r = photoRoute(method, path, query, body, lang, base); if (r) return r; }
    return base();
  }

  return {
    route,
    // A scene that changes what is seeded seeds again; any other keeps what the run posted.
    setScene: (o) => { const x = m(); const k = Object.keys(o || {}); x.scene = Object.assign({}, x.scene, clone(o || {})); if (k.some((n) => ["noWall", "wallSize", "standingAward"].indexOf(n) >= 0)) { x.awards = null; } },
    sent: () => clone(m().sent),
    certificates: () => clone(m().certificates),
    model: () => m(),
    setProbe: (fn) => { probe = fn; },
    reset: () => { model = null; },
  };
};
