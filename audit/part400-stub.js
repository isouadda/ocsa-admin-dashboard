// What the API's Round 15 answers for the dashboard (ocsa-api part 395, #165, main 3df0967), for the dashboard's part
// 400. audit/stubs.js lays it over the part397 stub and every layer under it, in every run, since the API's main answers
// it. Each route is answered the way the API's code at 3df0967 answers it, with the API's own words in English and
// Spanish (helpers/words.js). The holidays themselves (helpers/workingDays.js holidaysFor, the nine) are the Step 247
// layer's in audit/stubs.js.
//
//   Section 2, the union flag (routes/sites.js):
//     every site read                     is_union and isUnion (the list, the site, and the site's profile through
//                                         helpers/siteContract.js siteView); the scene unionSite names a union site
//     PATCH /api/sites/:id { isUnion }    manage_sites (the layer under refuses anyone else); anything but true or
//                                         false 400 sites.unionBoolean keys ["isUnion"], nothing written
//
//   Section 3, who is missing a class or a hire date (routes/leave.js):
//     GET /api/leave/missing-classes      read_hr_records or manage_leave_balances; ?limit=&cursor=; every active
//                                         person whose employment type (Staff Management's) is not full_time,
//                                         part_time or supplemental, by last name: { people: [{ person, policy,
//                                         kindsNotOffered: [{ kind, kindName }] }], nextCursor }. The scene
//                                         noMissingClasses answers as an API before Round 15 (404, no such route)
//     every leave person head             employmentClass, null when none is on file
//
//   Section 4, policies, requests and balances (helpers/leaveBalances.js, helpers/timeOff.js, routes/leave.js):
//     a policy's rules                    classes, hireYearPerHours, yearCap and useCap; the handbook's are its
//                                         HANDBOOK_RULES whatever the layer under holds; each summary line written by
//                                         summaryOf with its classes
//     PATCH /api/leave/policies/:id       rules on the handbook 409 leave.handbookRules keys ["rules"]; a policy the
//                                         office makes takes classes (full_time, part_time, supplemental, none),
//                                         hireYearPerHours on a january_1 rule, yearCap, useCap and the method
//                                         anniversary_then_january_1 (with tiers), else 400 leave.badDetails
//     every balance                       yearCapHours, useCapHours, appFigure true, and the ADP line first in notes;
//                                         a person with no class under the handbook carries leave.note.classMissing.
//                                         The scene handbookKinds adds a full-time person's vacation and personal
//                                         days under the handbook (anniversary_then_january_1, in days)
//     GET /api/leave/balances?format=csv  ends with official_balance, ADP on every line
//     POST /api/leave/hours-files         the scene yearCap names people whose year's cap is reached: their lines
//                                         post nothing and read yearCapReached
//     every request                       leaveTypeWords, insideNotice (null for a type with no notice rule and every
//                                         request filed before) and unit; vacation, personal and bereavement labeled.
//                                         The scene newTypes adds a vacation filed inside its notice, a personal day
//                                         and a bereavement request
//     a request's leave                   unit, hoursPerDay, requestDays, balanceDays, wouldLeaveDays, appFigure and
//                                         the ADP line
//
//   Section 5, Round 15's shapes (routes/health.js, helpers/discipline.js, routes/reports.js, routes/users.js):
//     GET /api/health/numbers             labelEn on every number; lines.minRequests on slowest_p95_ms
//     GET /api/health/numbers/:key/list   people, true for the numbers whose rows name people or sites
//     GET /api/health/numbers/:key/brief  view_health; text/plain, the number's brief as numberBriefOf writes it (the
//                                         part397 layer's number part); 404 health.numberNotFound. The scenes
//                                         noNumberBrief (an API before Round 15) and numberBriefFails (500). The
//                                         scene beforeRound15 answers the numbers as an API before Round 15: no
//                                         brief, no labelEn and no people (lines.minRequests stays, as since part 382)
//     a warning's full view               canRescind by mayRescind: an admin, or the issuer of a warning about a test
//                                         account, on a draft, open or closed warning. The scene noCanRescind leaves
//                                         it out
//     GET /api/reports/checklist-summary  leftOut [{ siteId, reason: "test" }] beside sites; the scene testSite names
//                                         the test site, left out of sites. The scene noLeftOut answers as before
//     GET /api/users/me/permissions       features.equipment, periodic, tickets, maintenance, leave and devices, each
//                                         by whether its list answers that person, read through every layer the way a
//                                         call is (a refusal a case sets included), as the part393 layer reads its
//                                         four. The scene noSixFeatures answers as an API before Round 15
//
// Every value is invented: the people's reasons, the days and the counts.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person, can, readsSite } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const me = () => person();
  const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
  const TODAY = seed.TODAY;
  const YEAR = Number(TODAY.slice(0, 4));
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const yearsBetween = (a, b) => { let y = Number(b.slice(0, 4)) - Number(a.slice(0, 4)); if (b.slice(5) < a.slice(5)) y -= 1; return Math.max(0, y); };

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], union: new Set(), unionOff: new Set(), extras: {}, briefs: [] };
    return model;
  };
  const sc = () => m().scene;
  const sent = (what, body) => { m().sent.push({ what, body: clone(body === undefined ? null : body) }); };
  let probe = null;
  const read = (path, lang) => { const a = probe ? probe(path, lang || "en") : null; return a && a.status === 200 ? a.json : null; };
  let part397 = null;

  // ---- words (helpers/words.js) ---------------------------------------------------------------------------------
  const W = {
    "sites.unionBoolean": ["Union site is yes or no", "Sitio sindicalizado es sí o no"],
    "leave.handbookRules": ["The handbook policy's rules are the handbook's and cannot be changed here.", "Las reglas de la política del manual son las del manual y no se pueden cambiar aquí."],
    "leave.badDetails": ["Some details are missing or not valid", "Faltan algunos datos o no son válidos"],
    "leave.note.adpOfficial": ["This is the app's figure. ADP self-service holds the official balance.", "Esta es la cifra de la aplicación. El autoservicio de ADP tiene el saldo oficial."],
    "leave.note.classMissing": ["No employment class is on file, so vacation and personal days are not offered. The office can add it.", "No hay clase de empleo registrada, así que no se ofrecen vacaciones ni días personales. La oficina puede agregarla."],
    "health.numberNotFound": ["There is no health number by that name.", "No hay ningún indicador de salud con ese nombre."],
    "access.insufficientPermissions": ["You do not have permission to do this.", "No tiene permiso para hacer esto."],
    "common.notFound": ["Not found", "No encontrado"],
    "server.error": ["Something went wrong on our side. Try again in a moment.", "Algo salió mal de nuestro lado. Inténtelo de nuevo en un momento."],
    "leave.summary.january_1": ["{amount} on January 1 each year", "{amount} el 1 de enero de cada año"],
    "leave.summary.anniversary": ["{amount} on each anniversary of the hire date", "{amount} en cada aniversario de la fecha de contratación"],
    "leave.summary.on_hire": ["{amount} on the hire date", "{amount} en la fecha de contratación"],
    "leave.summary.monthly": ["{amount} on the first of each month", "{amount} el primero de cada mes"],
    "leave.summary.per_hours_worked": ["{amount} for every {per} hours worked, from the payroll system's hours file", "{amount} por cada {per} horas trabajadas, según el archivo de horas del sistema de nómina"],
    "leave.summary.manual": ["Given by HR", "Lo asigna RR. HH."],
    "leave.summary.untracked": ["No balance is kept", "No se lleva saldo"],
    "leave.summary.anniversary_then_january_1": ["Granted in full on the work anniversary each tier is reached, then the current tier each January 1", "Se otorga completo en el aniversario de trabajo en que se alcanza cada nivel, y luego el nivel actual cada 1 de enero"],
    "leave.summary.classes": ["For {classes}", "Para {classes}"],
    "leave.summary.hireYear": ["in the year of hire, earned at 1 hour per {per} hours worked, up to {amount}", "en el año de contratación, se gana 1 hora por cada {per} horas trabajadas, hasta {amount}"],
    "leave.summary.yearCap": ["at most {amount} earned a year", "como máximo {amount} ganadas al año"],
    "leave.summary.useCap": ["at most {amount} used a year", "como máximo {amount} usadas al año"],
    "leave.summary.alsoOnHire": ["a new hire gets {amount} on the hire date", "una persona nueva recibe {amount} en su fecha de contratación"],
    "leave.summary.tiers": ["with years of service: {tiers}", "según los años de servicio: {tiers}"],
    "leave.summary.tier": ["{amount} from {years} years", "{amount} desde los {years} años"],
    "leave.summary.waiting": ["usable {days} days after the hire date", "se puede usar {days} días después de la fecha de contratación"],
    "leave.summary.noCarryover": ["nothing carries over to the next year", "nada pasa al año siguiente"],
    "leave.summary.carryover": ["up to {amount} carries over to the next year", "pasa al año siguiente hasta {amount}"],
    "leave.summary.maxBalance": ["the balance never goes above {amount}", "el saldo nunca supera {amount}"],
    "leave.amount.day": ["{n} day", "{n} día"], "leave.amount.days": ["{n} days", "{n} días"],
    "leave.amount.hour": ["{n} hour", "{n} hora"], "leave.amount.hours": ["{n} hours", "{n} horas"],
    "leave.class.full_time": ["full-time staff", "personal de tiempo completo"], "leave.class.part_time": ["part-time staff", "personal de medio tiempo"],
    "leave.class.supplemental": ["supplemental staff", "personal suplementario"], "leave.class.none": ["staff with no employment class on file", "personal sin clase de empleo registrada"],
    "leave.class.union": ["staff at a union site", "personal en un sitio sindicalizado"],
  };
  const say = (lang, key, vars) => { let s0 = T(lang, W[key][0], W[key][1]); Object.keys(vars || {}).forEach((k) => { s0 = s0.split("{" + k + "}").join(String(vars[k])); }); return s0; };
  const refuse = (lang, status, key, extra) => bad(status, key, say(lang, key), extra);
  // helpers/timeOff.js leaveTypeWords and LEAVE_LABELS, en, es and fr.
  const TYPE_WORDS = {
    paid_sick: ["Paid sick leave", "Permiso por enfermedad pagado", "Congé maladie payé"], pto: ["PTO (paid time off)", "PTO (tiempo libre pagado)", "PTO (congés payés)"],
    unpaid: ["Unpaid time off", "Tiempo libre sin goce de sueldo", "Congé sans solde"], bereavement_personal: ["Bereavement and personal", "Duelo y asuntos personales", "Deuil et raisons personnelles"],
    jury_duty: ["Jury duty", "Servicio de jurado", "Devoir de juré"], military: ["Military leave", "Permiso militar", "Congé militaire"],
    vacation: ["Vacation", "Vacaciones", "Vacances"], personal: ["Personal day", "Día personal", "Journée personnelle"], bereavement: ["Bereavement", "Duelo", "Deuil"],
  };
  const typeWords = (k) => (TYPE_WORDS[k] ? { en: TYPE_WORDS[k][0], es: TYPE_WORDS[k][1], fr: TYPE_WORDS[k][2] } : null);
  const kindNameOf = (k, lang, fallback) => (TYPE_WORDS[k] ? T(lang, TYPE_WORDS[k][0], TYPE_WORDS[k][1]) : fallback || k);
  // helpers/timeOff.js TYPE_RULES: the unit each offered type is taken in.
  const UNIT = { vacation: "days", personal: "days", paid_sick: "hours", bereavement: "hours", unpaid: "hours" };
  const adpNote = (lang) => ({ code: "leave.note.adpOfficial", message: say(lang, "leave.note.adpOfficial") });

  // ---- Section 2: the union flag --------------------------------------------------------------------------------
  const unionOf = (id) => m().union.has(String(id)) || (sc().unionSite !== undefined && [].concat(sc().unionSite).map(String).indexOf(String(id)) >= 0 && !m().unionOff.has(String(id)));
  const withUnion = (row) => (row && typeof row === "object" && row.id != null ? Object.assign({}, row, { is_union: unionOf(row.id), isUnion: unionOf(row.id) }) : row);
  function sitesRoute(method, path, query, body, lang, base) {
    if (path === "/api/sites" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map(withUnion);
      else if (a && a.status === 200 && a.json && Array.isArray(a.json.sites)) a.json = Object.assign({}, a.json, { sites: a.json.sites.map(withUnion) });
      return a;
    }
    const prof = /^\/api\/sites\/profile\/([^/]+)$/.exec(path);
    if (prof && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.site && typeof a.json.site === "object") a.json = Object.assign({}, a.json, { site: withUnion(a.json.site) });
      return a;
    }
    const one = /^\/api\/sites\/([^/]+)$/.exec(path);
    if (!one) return null;
    const id = decodeURIComponent(one[1]);
    const b = body && typeof body === "object" ? body : {};
    if (method === "PATCH" && b.isUnion !== undefined && can("manage_sites")) {
      if (typeof b.isUnion !== "boolean") { sent("union-refused", { id, isUnion: b.isUnion }); return refuse(lang, 400, "sites.unionBoolean", { keys: ["isUnion"] }); }
      const a = base();
      if (a && a.status < 300) {
        if (b.isUnion) { m().union.add(id); m().unionOff.delete(id); } else { m().union.delete(id); m().unionOff.add(id); }
        sent("union", { id, isUnion: b.isUnion });
        if (a.json && a.json.site) a.json = Object.assign({}, a.json, { site: withUnion(a.json.site) });
        else if (a.json && a.json.id != null) a.json = withUnion(a.json);
      }
      return a;
    }
    if (method === "GET" || method === "PATCH") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.site && typeof a.json.site === "object") a.json = Object.assign({}, a.json, { site: withUnion(a.json.site) });
      else if (a && a.status === 200 && a.json && a.json.id != null) a.json = withUnion(a.json);
      return a;
    }
    return null;
  }

  // ---- Sections 3 and 4: leave ----------------------------------------------------------------------------------
  const CLASSES = ["full_time", "part_time", "supplemental"];
  const POLICY_CLASSES = ["full_time", "part_time", "supplemental", "none"];
  const METHODS = ["january_1", "anniversary", "on_hire", "monthly", "per_hours_worked", "manual", "untracked", "anniversary_then_january_1"];
  const staffOf = (id) => (state.staff || []).find((x) => String(x.id) === String(id)) || null;
  const classOf = (id) => {
    const set = sc().classes || {};
    if (Object.prototype.hasOwnProperty.call(set, id)) return CLASSES.indexOf(set[id]) >= 0 ? set[id] : null;
    const p = staffOf(id);
    const v = p ? (p.employmentType !== undefined ? p.employmentType : p.employment_type) : null;
    return CLASSES.indexOf(v) >= 0 ? v : null;
  };
  const withClass = (h) => (h && typeof h === "object" && h.userId != null ? Object.assign({}, h, { employmentClass: classOf(h.userId) }) : h);
  // helpers/leaveBalances.js HANDBOOK_RULES (OCSA-HR-002 Part 8, version 1.2).
  const HANDBOOK_RULES = [
    { kind: "vacation", kindName: null, unit: "days", amount: 0, hoursPerDay: 8, method: "anniversary_then_january_1", alsoOnHire: false, perHoursWorked: null, tiers: [{ years: 1, amount: 5 }, { years: 3, amount: 10 }, { years: 5, amount: 15 }], waitingDays: 90, carryoverCap: 0, maxBalance: null, note: null, classes: ["full_time"], hireYearPerHours: null, yearCap: null, useCap: null },
    { kind: "paid_sick", kindName: null, unit: "hours", amount: 40, hoursPerDay: 8, method: "january_1", alsoOnHire: false, perHoursWorked: null, tiers: [], waitingDays: 90, carryoverCap: 0, maxBalance: null, note: null, classes: ["full_time"], hireYearPerHours: 40, yearCap: null, useCap: null },
    { kind: "paid_sick", kindName: null, unit: "hours", amount: 1, hoursPerDay: 8, method: "per_hours_worked", alsoOnHire: false, perHoursWorked: 40, tiers: [], waitingDays: 90, carryoverCap: null, maxBalance: null, note: null, classes: ["part_time", "none", "union"], hireYearPerHours: null, yearCap: 40, useCap: 40 },
    { kind: "personal", kindName: null, unit: "days", amount: 0, hoursPerDay: 8, method: "anniversary_then_january_1", alsoOnHire: false, perHoursWorked: null, tiers: [{ years: 1, amount: 3 }], waitingDays: 90, carryoverCap: 0, maxBalance: null, note: null, classes: ["full_time"], hireYearPerHours: null, yearCap: null, useCap: null },
  ];
  const L = () => state.l368 || null;
  const isHandbook = (p) => !!p && p.builtIn === true && p.code === "handbook";
  const policyById = (id) => (L() ? L().policies.find((p) => p.id === id) : null) || null;
  const extrasOf = (id) => m().extras[id] || [];
  // A policy's rules as the API holds them: the handbook's from the code, any other's with what Round 15 adds.
  const rulesOf = (p) => (isHandbook(p) ? HANDBOOK_RULES.map((r) => clone(r))
    : (p.rules || []).map((r, i) => Object.assign({ classes: null, hireYearPerHours: null, yearCap: null, useCap: null }, clone(r), extrasOf(p.id)[i] || {})));
  const hoursOf = (rule, n) => (rule.unit === "days" ? r2(Number(n) * (rule.hoursPerDay || 8)) : r2(n));
  const numText = (n) => String(r2(n));
  const amountText = (rule, n, lang) => { const one = Number(n) === 1; return say(lang, rule.unit === "days" ? (one ? "leave.amount.day" : "leave.amount.days") : (one ? "leave.amount.hour" : "leave.amount.hours"), { n: numText(n) }); };
  const tracked = (r) => !!r && r.method !== "untracked";
  // helpers/leaveBalances.js summaryOf.
  function summaryOf(rules, lang, names) {
    return rules.map((rule) => {
      const parts = [say(lang, "leave.summary." + rule.method, { amount: amountText(rule, rule.amount, lang), per: numText(rule.perHoursWorked || 0) })];
      if (rule.classes) parts.unshift(say(lang, "leave.summary.classes", { classes: rule.classes.map((c) => say(lang, "leave.class." + c)).join(", ") }));
      if (rule.hireYearPerHours !== null) parts.push(say(lang, "leave.summary.hireYear", { per: numText(rule.hireYearPerHours), amount: amountText(rule, rule.amount, lang) }));
      if (rule.yearCap !== null) parts.push(say(lang, "leave.summary.yearCap", { amount: amountText(rule, rule.yearCap, lang) }));
      if (rule.useCap !== null) parts.push(say(lang, "leave.summary.useCap", { amount: amountText(rule, rule.useCap, lang) }));
      if (tracked(rule) && rule.method !== "manual") {
        if (rule.alsoOnHire) parts.push(say(lang, "leave.summary.alsoOnHire", { amount: amountText(rule, rule.amount, lang) }));
        if (rule.tiers.length > 0) parts.push(say(lang, "leave.summary.tiers", { tiers: rule.tiers.map((t) => say(lang, "leave.summary.tier", { years: t.years, amount: amountText(rule, t.amount, lang) })).join(", ") }));
      }
      if (tracked(rule)) {
        if (rule.waitingDays > 0) parts.push(say(lang, "leave.summary.waiting", { days: rule.waitingDays }));
        if (rule.carryoverCap === 0) parts.push(say(lang, "leave.summary.noCarryover"));
        else if (rule.carryoverCap !== null) parts.push(say(lang, "leave.summary.carryover", { amount: amountText(rule, rule.carryoverCap, lang) }));
        if (rule.maxBalance !== null) parts.push(say(lang, "leave.summary.maxBalance", { amount: amountText(rule, rule.maxBalance, lang) }));
      }
      return { kind: rule.kind, kindName: kindNameOf(rule.kind, lang, rule.kindName || (names && names[rule.kind])), text: parts.join("; ") + ".", note: rule.note, classes: rule.classes };
    });
  }
  const ruleView = (r, lang) => ({ kind: r.kind, kindName: kindNameOf(r.kind, lang, r.kindName), unit: r.unit, amount: r.amount, hoursPerDay: r.hoursPerDay, method: r.method, alsoOnHire: r.alsoOnHire,
    perHoursWorked: r.perHoursWorked, tiers: r.tiers, waitingDays: r.waitingDays, carryoverCap: r.carryoverCap, maxBalance: r.maxBalance, note: r.note, classes: r.classes, hireYearPerHours: r.hireYearPerHours, yearCap: r.yearCap, useCap: r.useCap });
  function policyOut(view, lang) {
    if (!view || typeof view !== "object" || !Array.isArray(view.rules)) return view;
    const held = policyById(view.id) || view;
    const rules = rulesOf(held);
    const names = {};
    (view.rules || []).forEach((r) => { if (r.kindName) names[r.kind] = r.kindName; });
    return Object.assign({}, view, { rules: rules.map((r) => ruleView(r, lang)), summary: Object.assign({}, view.summary || {}, { lines: summaryOf(rules, lang, names) }) });
  }
  // The rules a person's class holds under a policy (helpers/leaveBalances.js rulesFor): a person at a union site
  // following the handbook reads as union.
  const clsKey = (userId, siteId, policy) => (isHandbook(policy) && siteId && unionOf(siteId) ? "union" : classOf(userId) || "none");
  const rulesFor = (policy, cls) => (policy ? rulesOf(policy).filter((r) => !r.classes || r.classes.indexOf(cls) >= 0) : []);
  // A full-time person's vacation and personal days under the handbook (the scene handbookKinds): each January 1 the tier
  // their years of service reach, and on the first anniversary within the year the first tier.
  function handbookDays(rule, hireDate) {
    if (!hireDate) return 0;
    const y0 = YEAR + "-01-01";
    const atJan = yearsBetween(hireDate, y0);
    const tierAt = (yrs) => rule.tiers.filter((t) => t.years <= yrs).map((t) => t.amount).pop() || 0;
    if (atJan >= 1) return tierAt(atJan);
    const first = addDays(hireDate, 365);
    return first >= y0 && first <= TODAY ? tierAt(1) : 0;
  }
  function balancesOut(list, head, policyRef, lang) {
    if (!Array.isArray(list)) return list;
    const policy = policyRef ? policyById(policyRef.id) : null;
    const siteId = head && head.site ? head.site.id : null;
    const cls = head ? clsKey(head.userId, siteId, policy) : "none";
    const rules = rulesFor(policy, cls);
    let out = list.map((b) => {
      const rule = rules.find((r) => r.kind === b.kind) || null;
      const notes = (b.notes || []).filter((n) => n && n.code !== "leave.note.adpOfficial");
      if (rule && cls === "none" && isHandbook(policy)) notes.push({ code: "leave.note.classMissing", message: say(lang, "leave.note.classMissing") });
      return Object.assign({}, b, {
        notes: [adpNote(lang)].concat(notes),
        yearCapHours: rule && rule.yearCap !== null ? hoursOf(rule, rule.yearCap) : rule && rule.hireYearPerHours !== null ? hoursOf(rule, rule.amount) : null,
        useCapHours: rule && rule.useCap !== null ? hoursOf(rule, rule.useCap) : null,
        appFigure: true,
      });
    });
    if (sc().handbookKinds && isHandbook(policy) && cls === "full_time" && head) {
      const add = (kind) => {
        if (out.some((b) => b.kind === kind)) return;
        const rule = rules.find((r) => r.kind === kind);
        if (!rule) return;
        const days = handbookDays(rule, head.hireDate || null);
        const hours = r2(days * rule.hoursPerDay);
        const row = { kind, kindName: kindNameOf(kind, lang), unit: "days", hoursPerDay: rule.hoursPerDay, tracked: true, method: rule.method, startHours: 0, grantedHours: hours, usedHours: 0,
          givenBackHours: 0, expiredHours: 0, adjustedHours: 0, balanceHours: hours, balanceDays: days, usableFrom: head.hireDate ? addDays(head.hireDate, rule.waitingDays) : null, hoursPostedThrough: null,
          notes: [adpNote(lang)], yearCapHours: null, useCapHours: null, appFigure: true };
        out = kind === "vacation" ? [row].concat(out) : out.concat([row]);
      };
      add("vacation"); add("personal");
    }
    return out;
  }
  const cursorOf = (parts) => Buffer.from(JSON.stringify(parts.map(String)), "utf8").toString("base64url");
  const readCursor = (raw) => { const t0 = String(raw || "").trim(); if (!t0) return { value: null }; try { const p = JSON.parse(Buffer.from(t0, "base64url").toString("utf8")); if (Array.isArray(p) && p.length === 3) return { value: p }; } catch (e) { /* not ours */ } return { bad: true }; };
  const limitOf = (v) => { const t0 = String(v || "").trim(); if (!t0) return { value: 50 }; const n0 = Number(t0); return !Number.isInteger(n0) || n0 < 1 ? { bad: true } : { value: Math.min(n0, 200) }; };
  // Every active person the balances list answers, read through every layer (their head and policy, as the API's
  // readPeople gives them), by last name.
  function activeRows(lang) {
    const rows = [];
    let cursor = "";
    for (let i = 0; i < 20; i += 1) {
      const d = read("/api/leave/balances?status=active&limit=200&cursor=" + encodeURIComponent(cursor), lang);
      if (!d || !Array.isArray(d.people)) return null;
      d.people.forEach((x) => rows.push(x));
      if (!d.nextCursor) break;
      cursor = d.nextCursor;
    }
    return rows;
  }
  function missingClasses(query, lang) {
    if (sc().noMissingClasses) return refuse(lang, 404, "common.notFound");
    if (!(can("read_hr_records") || can("manage_leave_balances"))) return bad(403, "access.insufficientPermissions", say(lang, "access.insufficientPermissions"), { capability: "read_hr_records" });
    const keys = [];
    const lim = limitOf(query.get("limit")); if (lim.bad) keys.push("limit");
    const cur = readCursor(query.get("cursor")); if (cur.bad) keys.push("cursor");
    if (keys.length) return bad(400, "leave.badFilter", T(lang, "Some filters are not valid", "Algunos filtros no son válidos"), { keys });
    const rows = activeRows(lang) || [];
    const sortKey = (x) => { const st = staffOf(x.person.userId) || {}; return [String(st.last_name || st.lastName || x.person.name || "").toLowerCase(), String(st.first_name || st.firstName || "").toLowerCase(), String(x.person.userId)]; };
    let list = rows.filter((x) => x && x.person && !classOf(x.person.userId)).sort((a, c) => sortKey(a).join("|").localeCompare(sortKey(c).join("|")));
    if (cur.value) list = list.filter((x) => sortKey(x).join("|") > cur.value.join("|"));
    const page = list.slice(0, lim.value);
    sent("missing-classes", { query: query.toString() });
    return ok({
      people: page.map((x) => ({ person: withClass(x.person), policy: x.policy || null, kindsNotOffered: ["vacation", "personal"].map((k) => ({ kind: k, kindName: kindNameOf(k, lang) })) })),
      nextCursor: list.length > lim.value ? cursorOf(sortKey(page[page.length - 1])) : null,
    });
  }
  // A policy's body as helpers/leaveBalances.js readRule reads what Round 15 adds: { keys } or { rules, extras }, the
  // rules as the layer under reads them (anniversary_then_january_1 handed to it as anniversary) and what it does not
  // hold kept here by index.
  function readRules(raw) {
    const keys = [];
    const extras = [];
    const rules = raw.map((r, i) => {
      const at = (k) => "rules[" + i + "]." + k;
      const o = r && typeof r === "object" ? r : {};
      const x = { classes: null, hireYearPerHours: null, yearCap: null, useCap: null };
      if (o.classes !== undefined && o.classes !== null) {
        if (!Array.isArray(o.classes) || o.classes.length === 0 || o.classes.some((c) => POLICY_CLASSES.indexOf(c) < 0) || new Set(o.classes).size !== o.classes.length) keys.push(at("classes"));
        else x.classes = POLICY_CLASSES.filter((c) => o.classes.indexOf(c) >= 0);
      }
      const num = (v) => (v === undefined || v === null || v === "" ? null : typeof v === "number" ? v : Number(String(v).trim()));
      if (o.hireYearPerHours !== undefined && o.hireYearPerHours !== null) {
        const n = num(o.hireYearPerHours);
        if (!Number.isFinite(n) || !(n > 0) || n > 1000 || o.method !== "january_1") keys.push(at("hireYearPerHours")); else x.hireYearPerHours = r2(n);
      }
      ["yearCap", "useCap"].forEach((k) => { if (o[k] === undefined || o[k] === null || o[k] === "") return; const n = num(o[k]); if (!Number.isFinite(n) || n < 0 || n > 10000) keys.push(at(k)); else x[k] = r2(n); });
      if (o.method === "anniversary_then_january_1" && !(Array.isArray(o.tiers) && o.tiers.length > 0)) keys.push(at("tiers"));
      if (typeof o.method === "string" && METHODS.indexOf(o.method) < 0) keys.push(at("method"));
      if (o.method === "anniversary_then_january_1") x.method = "anniversary_then_january_1";
      extras.push(x);
      const under = Object.assign({}, o);
      delete under.classes; delete under.hireYearPerHours; delete under.yearCap; delete under.useCap;
      if (under.method === "anniversary_then_january_1") under.method = "anniversary";
      // Vacation, personal and bereavement are request types since Round 15 and take no kindName; the layer under
      // knows only the types before them.
      if (TYPE_WORDS[under.kind] && !under.kindName) under.kindName = TYPE_WORDS[under.kind][0];
      return under;
    });
    return keys.length ? { keys } : { rules, extras };
  }
  function policiesRoute(method, path, query, body, lang, base) {
    const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
    const one = /^\/api\/leave\/policies\/([^/]+)$/.exec(path);
    if ((path === "/api/leave/policies" && method === "POST") || (one && method === "PATCH")) {
      const held = one ? policyById(decodeURIComponent(one[1])) : null;
      if (one && held && isHandbook(held) && b.rules !== undefined) { sent("handbook-rules-refused", { id: held.id }); return refuse(lang, 409, "leave.handbookRules", { keys: ["rules"] }); }
      let extras = null;
      let a;
      if (Array.isArray(b.rules)) {
        const got = readRules(b.rules);
        if (got.keys) { sent("policy-refused", { keys: got.keys }); return refuse(lang, 400, "leave.badDetails", { keys: got.keys }); }
        extras = got.extras;
        // The layers under read the one body every layer shares: its rules are handed to them as they read rules, and
        // put back after, so the call a run records is the one the page sent.
        const was = b.rules;
        b.rules = got.rules;
        try { a = base(); } finally { b.rules = was; }
      } else a = base();
      if (a && a.status < 300 && a.json && a.json.policy) {
        if (extras) m().extras[a.json.policy.id] = extras;
        sent("policy-saved", { id: a.json.policy.id, body: b });
        a.json = Object.assign({}, a.json, { policy: policyOut(a.json.policy, lang) });
      }
      return a;
    }
    if (method !== "GET") return null;
    const a = base();
    if (!a || a.status !== 200 || !a.json) return a;
    if (path === "/api/leave/policies" && Array.isArray(a.json.policies)) a.json = Object.assign({}, a.json, { policies: a.json.policies.map((p) => policyOut(p, lang)) });
    if (one && a.json.policy) a.json = Object.assign({}, a.json, { policy: policyOut(a.json.policy, lang), people: Array.isArray(a.json.people) ? a.json.people.map((x) => Object.assign({}, x, { person: withClass(x.person) })) : a.json.people });
    return a;
  }
  function leaveRoute(method, path, query, body, lang, base) {
    if (path === "/api/leave/missing-classes" && method === "GET") return missingClasses(query, lang);
    // helpers/leaveBalances.js kindsOf: every type a request can carry, vacation, personal and bereavement among them.
    if (path === "/api/leave/kinds" && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.kinds)) return a;
      const add = ["vacation", "personal", "bereavement"].filter((k) => !a.json.kinds.some((x) => x && x.key === k)).map((k) => ({ key: k, name: kindNameOf(k, lang), fromTimeOff: true }));
      const from = a.json.kinds.filter((x) => x && x.fromTimeOff);
      a.json = Object.assign({}, a.json, { kinds: from.concat(add, a.json.kinds.filter((x) => x && !x.fromTimeOff)) });
      return a;
    }
    if (/^\/api\/leave\/policies(\/[^/]+)?$/.test(path)) return policiesRoute(method, path, query, body, lang, base);
    if (path === "/api/leave/balances" && method === "GET") {
      const a = base();
      if (!a || a.status !== 200) return a;
      if (query.get("format") === "csv" && a.bytes) {
        const text = a.bytes.toString("utf8").replace(/^﻿/, "");
        const lines = text.split("\r\n");
        const out = lines.map((l, i) => (!l ? l : i === 0 ? l + ",official_balance" : l + ",ADP"));
        return Object.assign({}, a, { bytes: Buffer.from("﻿" + out.join("\r\n"), "utf8") });
      }
      if (a.json && Array.isArray(a.json.people)) a.json = Object.assign({}, a.json, { people: a.json.people.map((x) => Object.assign({}, x, { person: withClass(x.person), balances: balancesOut(x.balances, x.person, x.policy, lang) })) });
      return a;
    }
    if (path === "/api/leave/missing-hire-dates" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.people)) a.json = Object.assign({}, a.json, { people: a.json.people.map((x) => Object.assign({}, x, { person: withClass(x.person) })) });
      return a;
    }
    const pm = /^\/api\/leave\/people\/([^/]+)$/.exec(path);
    if (pm && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json) return a;
      const policy = a.json.policy ? policyById(a.json.policy.id) : null;
      a.json = Object.assign({}, a.json, { person: withClass(a.json.person), balances: balancesOut(a.json.balances, a.json.person, a.json.policy, lang) },
        policy && a.json.summary ? { summary: Object.assign({}, a.json.summary, { lines: summaryOf(rulesOf(policy), lang) }) } : {});
      return a;
    }
    if (/^\/api\/leave\/people\/[^/]+\/adjustments$/.test(path) && method === "POST") {
      const a = base();
      if (a && a.status < 300 && a.json && a.json.balance) a.json = Object.assign({}, a.json, { balance: Object.assign({}, a.json.balance, { appFigure: true, notes: [adpNote(lang)].concat((a.json.balance.notes || []).filter((n) => n && n.code !== "leave.note.adpOfficial")) }) });
      return a;
    }
    if (path === "/api/leave/hours-files" && method === "POST") {
      const a = base();
      const capped = [].concat(sc().yearCap || []).map(String);
      if (!capped.length || !a || a.status >= 300 || !a.json || !Array.isArray(a.json.lines)) return a;
      const gone = [];
      const lines = a.json.lines.map((l) => {
        if (!l || l.outcome !== "posted" || capped.indexOf(String(l.userId)) < 0) return l;
        (l.entries || []).forEach((e) => { if (e && e.id) gone.push(e.id); });
        return Object.assign({}, l, { outcome: "yearCapReached", entries: [] });
      });
      const n = lines.filter((l, i) => l.outcome === "yearCapReached" && a.json.lines[i].outcome === "posted").length;
      if (L() && gone.length) L().ledger = L().ledger.filter((x) => gone.indexOf(x.id) < 0);
      const file = a.json.file ? Object.assign({}, a.json.file, { postedCount: Number(a.json.file.postedCount || 0) - n, skippedCount: Number(a.json.file.skippedCount || 0) + n }) : a.json.file;
      if (L() && file && file.id) { const f = L().files.find((x) => x.id === file.id); if (f) { f.postedCount = file.postedCount; f.skippedCount = file.skippedCount; } }
      sent("year-cap", { lines: n });
      a.json = Object.assign({}, a.json, { lines, file });
      return a;
    }
    return null;
  }

  // ---- Section 4.2: requests ------------------------------------------------------------------------------------
  // The scene newTypes: a vacation filed inside its 2 weeks of notice with its reason, a personal day filed with its
  // 48 hours, and a bereavement request, each waiting on a decision.
  const NEW_REQUESTS = () => [
    { id: "to-400", userId: "u-sup-1", leaveType: "vacation", startsOn: addDays(TODAY, 6), endsOn: addDays(TODAY, 8), partDay: false, hours: null, status: "requested", reason: "A family wedding out of state.", createdAt: addDays(TODAY, -1) + "T14:10:00Z", insideNotice: true, days: 3 },
    { id: "to-401", userId: "u-admin-1", leaveType: "personal", startsOn: addDays(TODAY, 12), endsOn: addDays(TODAY, 12), partDay: false, hours: null, status: "requested", reason: "", createdAt: addDays(TODAY, -2) + "T16:30:00Z", insideNotice: false, days: 1 },
    { id: "to-402", userId: "u-staff-9", leaveType: "bereavement", startsOn: addDays(TODAY, 1), endsOn: addDays(TODAY, 3), partDay: false, hours: 24, status: "requested", reason: "", createdAt: TODAY + "T12:00:00Z", insideNotice: null, days: null },
  ];
  const ownRequests = () => { if (!sc().newTypes) return []; if (!m().requests) m().requests = NEW_REQUESTS(); return m().requests; };
  const nameOfStaff = (id) => { const p = staffOf(id); return p ? (p.name || [p.firstName || p.first_name, p.lastName || p.last_name].filter(Boolean).join(" ")) : null; };
  const requestOut = (r) => (r && typeof r === "object" && r.leaveType ? Object.assign({}, r, {
    leaveTypeLabel: ["vacation", "personal", "bereavement"].indexOf(r.leaveType) >= 0 ? TYPE_WORDS[r.leaveType][0] : r.leaveTypeLabel,
    leaveTypeWords: typeWords(r.leaveType) || r.leaveTypeWords || null,
    insideNotice: r.insideNotice === true ? true : r.insideNotice === false ? false : null,
    unit: UNIT[r.leaveType] || "hours",
  }) : r);
  const ownView = (r) => requestOut({ id: r.id, userId: r.userId, userName: nameOfStaff(r.userId), leaveType: r.leaveType, startsOn: r.startsOn, endsOn: r.endsOn, startTime: null, endTime: null, partDay: false, hours: r.hours,
    reason: r.reason || null, status: r.status, decidedBy: r.decidedBy || null, decidedByName: r.decidedBy ? nameOfStaff(r.decidedBy) : null, decidedAt: r.decidedAt || null, decisionNote: r.decisionNote || null,
    cancelledAt: null, createdAt: r.createdAt, updatedAt: r.createdAt, shifts: [], insideNotice: r.insideNotice });
  // A request's leave as helpers/leaveBalances.js requestLeave answers it since Round 15.
  function leaveOut(l, r, lang) {
    if (!l || typeof l !== "object") return l;
    const unit = l.unit || UNIT[l.kind] || "hours";
    const perDay = unit === "days" ? 8 : null;
    return Object.assign({}, l, { unit, hoursPerDay: perDay, requestDays: perDay ? (r && r.days != null ? r.days : r2(Number(l.requestHours || 0) / perDay)) : null,
      balanceDays: perDay && l.balanceHours != null ? r2(l.balanceHours / perDay) : null, wouldLeaveDays: perDay && l.wouldLeaveHours != null ? r2(l.wouldLeaveHours / perDay) : null,
      appFigure: true, notes: [adpNote(lang)] });
  }
  function ownLeave(r, lang) {
    const kn = kindNameOf(r.leaveType, lang);
    const policy = L() ? L().policies.find(isHandbook) : null;
    const ref = policy ? { id: policy.id, name: T(lang, "Employee handbook (OCSA-HR-002)", "Manual del empleado (OCSA-HR-002)"), source: "default", since: null } : null;
    if (r.leaveType === "bereavement") return leaveOut({ kind: r.leaveType, kindName: kn, tracked: false, policy: ref, balanceHours: null, requestHours: r.hours, hoursFrom: "request", days: null, wouldLeaveHours: null, taken: false, givenBack: false, usableFrom: null, warnings: [] }, r, lang);
    const st = staffOf(r.userId) || {};
    const rule = HANDBOOK_RULES.find((x) => x.kind === r.leaveType);
    const balance = r2(handbookDays(rule, st.hire_date || st.hireDate || null) * 8);
    const hours = r2((r.days || 1) * 8);
    const would = r.status === "requested" ? r2(balance - hours) : balance;
    // helpers/leaveBalances.js requestLeave: leave.warning.belowZero on a request that would take the balance below zero.
    const warnings = r.status === "requested" && would < 0 ? [{ code: "leave.warning.belowZero", message: T(lang, "This would take the " + kn + " balance below zero: " + would + " hours left after it.", "Esto dejar\u00eda el saldo de " + kn + " por debajo de cero: quedar\u00edan " + would + " horas.") }] : [];
    return leaveOut({ kind: r.leaveType, kindName: kn, tracked: true, policy: ref, balanceHours: balance, requestHours: hours, hoursFrom: "request", days: null,
      wouldLeaveHours: would, taken: false, givenBack: false, usableFrom: null, warnings, unit: "days" }, r, lang);
  }
  function timeOffRoute(method, path, query, body, lang, base) {
    if (path === "/api/time-off" && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json) return a;
      const status = query.get("status") || "requested";
      const userId = query.get("userId") || "";
      const mine = ownRequests().filter((r) => (status === "all" || r.status === status) && (!userId || r.userId === userId)).map(ownView);
      if (Array.isArray(a.json.requests)) a.json = Object.assign({}, a.json, { requests: mine.concat(a.json.requests.map(requestOut)), total: (a.json.total || a.json.requests.length) + mine.length });
      else if (Array.isArray(a.json)) a.json = mine.concat(a.json.map(requestOut));
      return a;
    }
    const one = /^\/api\/time-off\/([^/]+)(\/approve|\/deny|\/rescind)?$/.exec(path);
    if (!one) return null;
    const own = ownRequests().find((r) => r.id === decodeURIComponent(one[1]));
    if (own) {
      const tail = one[2] || "";
      if (!tail && method === "GET") return ok({ request: ownView(own), affectedShifts: [], leave: ownLeave(own, lang) });
      if ((tail === "/approve" || tail === "/deny") && method === "POST") {
        if (String(own.userId) === String(me().id)) return bad(403, "timeOff.decideOwn", T(lang, "Someone else has to decide your own request", "Otra persona tiene que decidir su propia solicitud"));
        if (own.status !== "requested") return { status: 409, json: { error: T(lang, "Someone else decided this already", "Otra persona ya decidió esto"), code: "already_decided" } };
        Object.assign(own, { status: tail === "/deny" ? "denied" : "approved", decidedBy: me().id, decidedAt: seed.NOW_ISO, decisionNote: (body && body.note) || null });
        sent("decided", { id: own.id, kind: tail.slice(1), body });
        return ok({ request: ownView(own), affectedShifts: [], shifts: [], leave: ownLeave(own, lang) });
      }
      return null;
    }
    const a = base();
    if (a && a.status < 300 && a.json && typeof a.json === "object") {
      const r = a.json.request ? requestOut(a.json.request) : null;
      a.json = Object.assign({}, a.json, r ? { request: r } : {}, a.json.leave ? { leave: leaveOut(a.json.leave, null, lang) } : {});
    }
    return a;
  }

  // ---- Section 5: Round 15's shapes -----------------------------------------------------------------------------
  // helpers/healthNumbers.js NAMES_PEOPLE_OR_SITES.
  const PEOPLE_LISTS = new Set(["failed_sign_ins", "check_offs", "shifts_started", "shifts_closed_automatically", "shifts_left_open", "training_waiting", "training_out_of_tries",
    "lessons_failed_three", "warning_drafts_old", "signatures_waiting", "final_mails_not_sent", "never_signed_in", "no_email", "robot_trust_days_left"]);
  const TEXT = (status, text) => ({ status, bytes: Buffer.from(text, "utf8"), contentType: "text/plain; charset=utf-8", headers: { "Cache-Control": "private, no-store" }, json: text });
  function healthRoute(method, path, query, body, lang, base) {
    if ((path === "/api/health/numbers" && method === "GET") || (path === "/api/health/numbers/refresh" && method === "POST")) {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.numbers)) return a;
      const en = lang === "en" ? a.json : read("/api/health/numbers", "en");
      const label = (k) => { const n = en && Array.isArray(en.numbers) ? en.numbers.find((x) => x && x.key === k) : null; return n ? n.label : null; };
      const th = read("/api/health/thresholds", lang);
      const floorRow = th && Array.isArray(th.thresholds) ? th.thresholds.find((x) => x && x.key === "slowest_p95_ms") : null;
      const floor = floorRow && floorRow.minRequests != null ? floorRow.minRequests : 20;
      a.json = Object.assign({}, a.json, { numbers: a.json.numbers.map((n) => Object.assign({}, n, sc().beforeRound15 ? {} : { labelEn: label(n.key) || n.label },
        n.key === "slowest_p95_ms" ? { lines: Object.assign({}, n.lines || {}, { minRequests: floor }) } : {})) });
      return a;
    }
    const lm = /^\/api\/health\/numbers\/([^/]+)\/list$/.exec(path);
    if (lm && method === "GET") {
      const a = base();
      if (!sc().beforeRound15 && a && a.status === 200 && a.json && typeof a.json === "object") a.json = Object.assign({}, a.json, { people: PEOPLE_LISTS.has(decodeURIComponent(lm[1])) });
      return a;
    }
    const bm = /^\/api\/health\/numbers\/([^/]+)\/brief$/.exec(path);
    if (bm && method === "GET") {
      if (sc().noNumberBrief || sc().beforeRound15) return refuse(lang, 404, "common.notFound");
      const a = base();
      if (a && a.status === 403) return a;
      const key = decodeURIComponent(bm[1]);
      const nums = read("/api/health/numbers", "en");
      if (!nums || !Array.isArray(nums.numbers) || !nums.numbers.some((n) => n && n.key === key)) return refuse(lang, 404, "health.numberNotFound");
      sent("number-brief", { key, day: query.get("day") || null });
      if (sc().numberBriefFails) return refuse(lang, 500, "server.error");
      const text = part397 && part397.numberBrief ? part397.numberBrief(key, query.get("day") || null) : "";
      m().briefs.push({ key, text });
      return TEXT(200, text);
    }
    return null;
  }
  // helpers/discipline.js mayRescind.
  const testAccount = (id) => { const p = staffOf(id); return !!p && (p.isTestAccount === true || String(p.id) === "u-staff-10"); };
  const mayRescind = (w) => {
    const p = me();
    if (!p || !w) return false;
    const admin = p.role === "admin" || p.isSuperAdmin === true;
    const issuerOfTest = !!(w.person && testAccount(w.person.userId)) && !!(w.issuedBy && w.issuedBy.userId != null) && String(w.issuedBy.userId) === String(p.id);
    return (admin || issuerOfTest) && ["draft", "open", "closed"].indexOf(w.status) >= 0;
  };
  const withRescind = (w) => (w && typeof w === "object" && w.id != null ? Object.assign({}, w, { canRescind: mayRescind(w) }) : w);
  function disciplineRoute(method, path, query, body, lang, base) {
    const a = base();
    if (sc().noCanRescind || !a || a.status >= 300 || !a.json || typeof a.json !== "object") return a;
    if (a.json.warning) a.json = Object.assign({}, a.json, { warning: withRescind(a.json.warning) });
    if (/^\/api\/discipline\/person\/[^/]+$/.test(path) && Array.isArray(a.json.history)) a.json = Object.assign({}, a.json, { history: a.json.history.map(withRescind) });
    return a;
  }
  const usesAll = () => { const p = me(); return !!p && (p.role === "admin" || p.isSuperAdmin === true); };
  function summaryRoute(method, path, query, body, lang, base) {
    const a = base();
    if (sc().noLeftOut || !a || a.status !== 200 || !a.json || !Array.isArray(a.json.sites)) return a;
    const t = sc().testSite ? String(sc().testSite) : "";
    const had = !!t && a.json.sites.some((x) => String(x.siteId) === t);
    const inScope = !!t && (had || usesAll() || (typeof readsSite === "function" && readsSite(t)));
    a.json = Object.assign({}, a.json, { sites: t ? a.json.sites.filter((x) => String(x.siteId) !== t) : a.json.sites, leftOut: inScope ? [{ siteId: t, reason: "test" }] : [] });
    return a;
  }
  const lists = (path, lang, shape) => { const a = probe ? probe(path, lang) : null; return !!a && a.status === 200 && !!a.json && shape(a.json); };
  function featuresRoute(method, path, query, body, lang, base) {
    const a = base();
    if (sc().noSixFeatures || !a || a.status !== 200 || !a.json || typeof a.json !== "object" || !a.json.features || typeof a.json.features !== "object") return a;
    const f = Object.assign({}, a.json.features, {
      equipment: lists("/api/equipment?status=out_of_service", lang, (j) => Array.isArray(j.equipment)),
      periodic: lists("/api/periodic-work?state=overdue", lang, (j) => Array.isArray(j.items)),
      tickets: lists("/api/support/tickets?status=new", lang, (j) => Array.isArray(j) || Array.isArray(j.tickets)),
      maintenance: lists("/api/maintenance-requests/options", lang, (j) => Array.isArray(j.statuses)),
      leave: lists("/api/leave/policies", lang, (j) => Array.isArray(j.policies)),
      devices: lists("/api/users/me/trusted-devices", lang, (j) => !Array.isArray(j) && Array.isArray(j.devices)),
    }, sc().features || {});
    a.json = Object.assign({}, a.json, { features: f });
    return a;
  }

  function route(method, path, query, body, lang, base) {
    if (/^\/api\/sites(\/profile)?(\/[^/]+)?$/.test(path)) { const r = sitesRoute(method, path, query, body, lang, base); if (r) return r; }
    if (path.indexOf("/api/leave/") === 0) { const r = leaveRoute(method, path, query, body, lang, base); if (r) return r; }
    if (path.indexOf("/api/time-off") === 0) { const r = timeOffRoute(method, path, query, body, lang, base); if (r) return r; }
    if (/^\/api\/health\/numbers(\/|$)/.test(path)) { const r = healthRoute(method, path, query, body, lang, base); if (r) return r; }
    if (/^\/api\/discipline(\/|$)/.test(path) && path !== "/api/discipline/steps") return disciplineRoute(method, path, query, body, lang, base);
    if (path === "/api/reports/checklist-summary" && method === "GET") return summaryRoute(method, path, query, body, lang, base);
    if (path === "/api/users/me/permissions" && method === "GET") return featuresRoute(method, path, query, body, lang, base);
    return base();
  }

  return {
    route,
    setScene: (o) => { Object.assign(m().scene, o || {}); },
    setProbe: (fn) => { probe = fn; },
    setPart397: (x) => { part397 = x; },
    sent: () => m().sent,
    model: () => m(),
    briefs: () => m().briefs,
    reset: () => { model = null; },
  };
};
