// Leave balances (part 368), answered the way the API's part 365 does at ocsa-api ca4aafa: routes/leave.js,
// helpers/leaveBalances.js and the time off routes' leave and rescind (routes/timeOff.js). audit/part368-stub.js
// calls it ahead of every other layer, in every run, since the API's main answers these routes.
//
//   GET /api/leave/kinds, /policies, /policies/:id, /sites, /balances (format=csv too),
//   /missing-hire-dates, /hours-files, /people/:userId, /people/:userId/entries
//   POST and PATCH /api/leave/policies, POST /api/leave/sites/:siteId/policy,
//   POST /api/leave/people/:userId/policy, POST /api/leave/people/:userId/adjustments (a clientId again
//   answers 200 with the first), POST /api/leave/hours-files (the whole file checked first)
//   GET /api/time-off/:id, approve and deny     leave on the answer, the usage posted on an approval
//   POST /api/time-off/:id/rescind             approved to cancelled, the usage given back
//
// Every value is invented. The words are the API's helpers/words.js English and Spanish.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person, can, readsSite } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const TODAY = seed.TODAY;
  const YEAR = Number(TODAY.slice(0, 4));
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
  const realDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;
  const yearsBetween = (a, b) => { let y = Number(b.slice(0, 4)) - Number(a.slice(0, 4)); if (b.slice(5) < a.slice(5)) y -= 1; return Math.max(0, y); };

  // ---- words ----------------------------------------------------------------------------------------
  const W = {
    "leave.badDetails": ["Some details are missing or not valid", "Faltan algunos datos o no son v\u00e1lidos"],
    "leave.badFilter": ["Some filters are not valid", "Algunos filtros no son v\u00e1lidos"],
    "leave.policyNotFound": ["Leave policy not found", "No se encontr\u00f3 la pol\u00edtica de permisos"],
    "leave.personNotFound": ["Person not found", "No se encontr\u00f3 a la persona"],
    "leave.siteNotFound": ["Site not found", "No se encontr\u00f3 el sitio"],
    "leave.reasonRequired": ["Say why the balance changes.", "Indique por qu\u00e9 cambia el saldo."],
    "leave.hoursFileInvalid": ["Some lines of the hours file do not read. Nothing was posted.", "Algunas l\u00edneas del archivo de horas no se pueden leer. No se registr\u00f3 nada."],
    "leave.hoursFile.personUnknown": ["No one has the badge number or employee ID {person}.", "Nadie tiene el n\u00famero de credencial o el ID de empleado {person}."],
    "leave.hoursFile.badHeader": ["The first line names the columns: person, period_start, period_end and hours (or person, period and hours).", "La primera l\u00ednea nombra las columnas: person, period_start, period_end y hours (o person, period y hours)."],
    "leave.hoursFile.badPeriod": ["The period needs a first and a last day, YYYY-MM-DD, the first on or before the last.", "El per\u00edodo necesita un primer y un \u00faltimo d\u00eda, AAAA-MM-DD, el primero igual o anterior al \u00faltimo."],
    "leave.hoursFile.badHours": ["Hours are a number from 0 to {max}.", "Las horas son un n\u00famero de 0 a {max}."],
    "leave.warning.belowZero": ["This would take the {kind} balance below zero: {hours} hours left after it.", "Esto dejar\u00eda el saldo de {kind} por debajo de cero: quedar\u00edan {hours} horas."],
    "leave.warning.inWaitingPeriod": ["This falls in the waiting period: {kind} can be used from {date}.", "Esto cae en el per\u00edodo de espera: {kind} se puede usar a partir del {date}."],
    "leave.note.noHireDate": ["No hire date is on file, so a grant that depends on it does not post.", "No hay fecha de contrataci\u00f3n registrada, as\u00ed que no se registra ninguna asignaci\u00f3n que dependa de ella."],
    "leave.note.hoursPostedThrough": ["Hours worked have posted through {date}.", "Las horas trabajadas se registraron hasta el {date}."],
    "leave.note.hoursNotPosted": ["Hours worked post from the payroll system's hours file. None has been taken for this person yet, so these hours have not posted.", "Las horas trabajadas se registran desde el archivo de horas del sistema de n\u00f3mina. A\u00fan no se ha cargado ninguno para esta persona, as\u00ed que estas horas no se han registrado."],
    "timeOff.onlyApprovedRescinded": ["Only an approved request can be taken back.", "Solo se puede retirar una solicitud aprobada."],
    "timeOff.decideOwn": ["Someone else has to decide your own request", "Otra persona tiene que decidir su propia solicitud"],
    "access.insufficientPermissions": ["You do not have permission to do this.", "No tiene permiso para hacer esto."],
  };
  const say = (lang, key, vars) => { let s0 = T(lang, W[key][0], W[key][1]); Object.keys(vars || {}).forEach((k) => { s0 = s0.split("{" + k + "}").join(String(vars[k])); }); return s0; };
  const refuse = (lang, status, key, vars, extra) => bad(status, key, say(lang, key, vars), extra);
  const noCap = (lang, key) => bad(403, "access.insufficientPermissions", say(lang, "access.insufficientPermissions"), { capability: key });
  const KIND_NAMES = { paid_sick: ["Paid sick leave", "Permiso por enfermedad pagado"], pto: ["PTO (paid time off)", "PTO (tiempo libre pagado)"], unpaid: ["Unpaid time off", "Tiempo libre sin goce de sueldo"], bereavement_personal: ["Bereavement and personal", "Duelo y asuntos personales"], jury_duty: ["Jury duty", "Servicio de jurado"], military: ["Military leave", "Permiso militar"] };
  const TYPE_NAMES = { grant: ["Grant", "Asignaci\u00f3n"], accrual: ["Hours worked", "Horas trabajadas"], usage: ["Time off taken", "Tiempo libre tomado"], reversal: ["Time off given back", "Tiempo libre devuelto"], expiry: ["Expired at the year's end", "Venci\u00f3 al final del a\u00f1o"], policy_change: ["Policy changed", "Cambio de pol\u00edtica"], adjustment: ["Adjustment by HR", "Ajuste de RR. HH."] };
  const MONTHS = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"] };
  const dayWords = (day, lang) => { const m = MONTHS[lang === "es" ? "es" : "en"][Number(day.slice(5, 7)) - 1]; const d = Number(day.slice(8)); return lang === "es" ? d + " " + m + " " + day.slice(0, 4) : m + " " + d + ", " + day.slice(0, 4); };
  const kindName = (k, lang, policies) => { if (KIND_NAMES[k]) return T(lang, KIND_NAMES[k][0], KIND_NAMES[k][1]); for (const p of policies || []) { const r = p.rules.find((x) => x.kind === k && x.kindName); if (r) return r.kindName; } return k; };
  const HANDBOOK = "Employee handbook (OCSA-HR-002)";
  const policyName = (p, lang) => (p && p.builtIn && p.code === "handbook" && p.name === HANDBOOK ? T(lang, HANDBOOK, "Manual del empleado (OCSA-HR-002)") : p ? p.name : null);
  const amountText = (rule, n, lang) => { const one = Number(n) === 1; const v = String(r2(n)); return rule.unit === "days" ? T(lang, v + (one ? " day" : " days"), v + (one ? " d\u00eda" : " d\u00edas")) : T(lang, v + (one ? " hour" : " hours"), v + (one ? " hora" : " horas")); };
  const SUMMARY = {
    january_1: ["{amount} on January 1 each year", "{amount} el 1 de enero de cada a\u00f1o"], anniversary: ["{amount} on each anniversary of the hire date", "{amount} en cada aniversario de la fecha de contrataci\u00f3n"],
    on_hire: ["{amount} on the hire date", "{amount} en la fecha de contrataci\u00f3n"], monthly: ["{amount} on the first of each month", "{amount} el primero de cada mes"],
    per_hours_worked: ["{amount} for every {per} hours worked, from the payroll system's hours file", "{amount} por cada {per} horas trabajadas, seg\u00fan el archivo de horas del sistema de n\u00f3mina"],
    manual: ["Given by HR", "Lo asigna RR. HH."], untracked: ["No balance is kept", "No se lleva saldo"],
  };
  function summaryOf(p, lang, policies) {
    return p.rules.map((r) => {
      const fill = (s0) => s0.split("{amount}").join(amountText(r, r.amount, lang)).split("{per}").join(String(r2(r.perHoursWorked || 0)));
      const parts = [fill(T(lang, SUMMARY[r.method][0], SUMMARY[r.method][1]))];
      const tracked = r.method !== "untracked";
      if (tracked && r.method !== "manual") {
        if (r.alsoOnHire) parts.push(T(lang, "a new hire gets " + amountText(r, r.amount, lang) + " on the hire date", "una persona nueva recibe " + amountText(r, r.amount, lang) + " en su fecha de contrataci\u00f3n"));
        if (r.tiers.length) parts.push(T(lang, "with years of service: ", "seg\u00fan los a\u00f1os de servicio: ") + r.tiers.map((x) => T(lang, amountText(r, x.amount, lang) + " from " + x.years + " years", amountText(r, x.amount, lang) + " desde los " + x.years + " a\u00f1os")).join(", "));
      }
      if (tracked) {
        if (r.waitingDays > 0) parts.push(T(lang, "usable " + r.waitingDays + " days after the hire date", "se puede usar " + r.waitingDays + " d\u00edas despu\u00e9s de la fecha de contrataci\u00f3n"));
        if (r.carryoverCap === 0) parts.push(T(lang, "nothing carries over to the next year", "nada pasa al a\u00f1o siguiente"));
        else if (r.carryoverCap !== null) parts.push(T(lang, "up to " + amountText(r, r.carryoverCap, lang) + " carries over to the next year", "pasa al a\u00f1o siguiente hasta " + amountText(r, r.carryoverCap, lang)));
        if (r.maxBalance !== null) parts.push(T(lang, "the balance never goes above " + amountText(r, r.maxBalance, lang), "el saldo nunca supera " + amountText(r, r.maxBalance, lang)));
      }
      return { kind: r.kind, kindName: kindName(r.kind, lang, policies), text: parts.join("; ") + ".", note: r.note || null };
    });
  }
  const HOLIDAYS = [{ date: YEAR + "-01-01", en: "New Year's Day", es: "A\u00f1o Nuevo" }, { date: YEAR + "-05-25", en: "Memorial Day", es: "D\u00eda de los Ca\u00eddos" }, { date: YEAR + "-07-04", en: "Independence Day", es: "D\u00eda de la Independencia" }, { date: YEAR + "-11-26", en: "Thanksgiving Day", es: "D\u00eda de Acci\u00f3n de Gracias" }, { date: YEAR + "-12-25", en: "Christmas Day", es: "Navidad" }];
  function policyView(p, lang, policies) {
    const holidays = p.holidaysSource === "own" ? { source: "own", days: p.holidays.map((h) => ({ date: h.date, name: h.name })) } : { source: "handbook", days: HOLIDAYS.map((h) => ({ date: h.date, name: T(lang, h.en, h.es) })) };
    return {
      id: p.id, code: p.code, name: policyName(p, lang), builtIn: p.builtIn, isDefault: p.isDefault, description: p.description, note: p.note, grantsFrom: p.grantsFrom, holidays,
      rules: p.rules.map((r) => Object.assign({ kindName: kindName(r.kind, lang, policies) }, clone(r))),
      summary: { lines: summaryOf(p, lang, policies), holidays: p.holidaysSource === "own" ? T(lang, "Paid holidays: " + p.holidays.length + " days this policy names.", "D\u00edas feriados pagados: " + p.holidays.length + " d\u00edas que indica esta pol\u00edtica.") : T(lang, "Paid holidays: the company's holidays, as the handbook lists them.", "D\u00edas feriados pagados: los feriados de la empresa, como los indica el manual.") },
      createdAt: p.createdAt, updatedAt: p.updatedAt,
    };
  }

  // ---- the model -------------------------------------------------------------------------------------
  const ADMIN = seed.PEOPLE.admin.id;
  const S = seed.SITES;
  const rule = (o) => Object.assign({ kind: "paid_sick", kindName: null, unit: "hours", amount: 40, hoursPerDay: 8, method: "january_1", alsoOnHire: false, perHoursWorked: null, tiers: [], waitingDays: 0, carryoverCap: null, maxBalance: null, note: null }, o);
  // Each person's primary site and the hire date the leave layer reads: u-staff-8 joined this year, so its
  // paid sick hours wait 90 days; u-staff-10 has none on file.
  const SITE_OF = { "u-sup-1": S[0].id, "u-cap-1": S[2].id, "u-staff-5": S[0].id, "u-staff-6": S[0].id, "u-staff-7": S[1].id, "u-staff-8": S[2].id, "u-staff-9": S[1].id, "u-staff-10": S[2].id, "u-staff-11": S[0].id };
  const HIRE = { "u-staff-8": addDays(TODAY, -40), "u-staff-10": null };
  function fresh() {
    const policies = [
      { id: "lp-1", code: "handbook", name: HANDBOOK, builtIn: true, isDefault: true, description: null, note: null, grantsFrom: YEAR + "-01-01", holidaysSource: "handbook", holidays: [], createdAt: seed.NOW_ISO, updatedAt: seed.NOW_ISO,
        rules: [rule({ kind: "paid_sick", amount: 40, method: "january_1", alsoOnHire: true, waitingDays: 90, carryoverCap: 0 })] },
      { id: "lp-2", code: null, name: "Clinic service agreement", builtIn: false, isDefault: false, description: "The leave the clinic's service agreement gives.", note: null, grantsFrom: YEAR + "-01-01", holidaysSource: "own", holidays: [{ date: YEAR + "-01-01", name: "New Year's Day" }, { date: YEAR + "-07-04", name: "Independence Day" }, { date: YEAR + "-12-25", name: "Christmas Day" }], createdAt: seed.NOW_ISO, updatedAt: seed.NOW_ISO,
        rules: [rule({ kind: "paid_sick", amount: 1, method: "per_hours_worked", perHoursWorked: 30, maxBalance: 40 }), rule({ kind: "pto", unit: "days", amount: 5, method: "anniversary", tiers: [{ years: 3, amount: 10 }], carryoverCap: 5, maxBalance: 15 })] },
    ];
    const assignments = [
      { id: "la-1", policyId: "lp-2", userId: null, siteId: S[1].id, effectiveFrom: YEAR + "-01-01", note: "The clinic's agreement.", createdBy: ADMIN, createdAt: YEAR + "-01-02T14:00:00Z" },
    ];
    const people = seed.STAFF.filter((p) => p.role !== "client_contact").map((p) => ({ id: p.id, firstName: p.first_name, lastName: p.last_name, role: p.role, status: p.status, employeeId: p.employee_id, badge: p.badge_number, hireDate: Object.prototype.hasOwnProperty.call(HIRE, p.id) ? HIRE[p.id] : p.hire_date || null, siteId: SITE_OF[p.id] || null }));
    const ledger = [];
    let n = 0;
    const post = (o) => { n += 1; ledger.push(Object.assign({ id: "ll-" + n, kind: "paid_sick", type: "grant", hours: 0, effectiveOn: YEAR + "-01-01", policyId: "lp-1", timeOffRequestId: null, hoursFileId: null, periodStart: null, periodEnd: null, hoursWorked: null, reason: null, detail: {}, createdBy: null, createdAt: YEAR + "-01-01T12:05:00Z", postKey: null }, o)); };
    people.filter((p) => p.status === "active" && SITE_OF[p.id] !== S[1].id && p.id !== "u-staff-8" && p.hireDate).forEach((p) => post({ userId: p.id, hours: 40 }));
    post({ userId: "u-staff-8", hours: 40, effectiveOn: HIRE["u-staff-8"], createdAt: HIRE["u-staff-8"] + "T12:05:00Z", detail: { onHire: true } });
    post({ userId: "u-staff-6", type: "usage", hours: -32, effectiveOn: addDays(TODAY, -30), timeOffRequestId: "to-367", createdBy: ADMIN, createdAt: addDays(TODAY, -35) + "T15:00:00Z", postKey: "usage:to-367" });
    post({ userId: "u-staff-5", type: "usage", hours: -8, effectiveOn: addDays(TODAY, 6), timeOffRequestId: "to-369", createdBy: ADMIN, createdAt: addDays(TODAY, -2) + "T15:00:00Z", postKey: "usage:to-369" });
    post({ userId: "u-staff-7", kind: "paid_sick", type: "accrual", hours: 4, effectiveOn: YEAR + "-02-28", policyId: "lp-2", hoursFileId: "hf-1", periodStart: YEAR + "-02-01", periodEnd: YEAR + "-02-28", hoursWorked: 120, createdBy: ADMIN, createdAt: YEAR + "-03-02T15:00:00Z" });
    post({ userId: "u-staff-7", kind: "pto", type: "grant", hours: 40, effectiveOn: addDays(TODAY, -60), policyId: "lp-2", detail: { yearsOfService: 0 } });
    post({ userId: "u-staff-9", kind: "pto", type: "grant", hours: 40, effectiveOn: addDays(TODAY, -40), policyId: "lp-2" });
    post({ userId: "u-staff-9", kind: "paid_sick", type: "adjustment", hours: 6, effectiveOn: addDays(TODAY, -10), policyId: "lp-2", reason: "Hours carried from the old system", createdBy: ADMIN, createdAt: addDays(TODAY, -10) + "T16:00:00Z" });
    const files = [{ id: "hf-1", fileName: "hours-february.csv", sha256: "a".repeat(64), lineCount: 2, postedCount: 1, skippedCount: 1, firstPeriodStart: YEAR + "-02-01", lastPeriodEnd: YEAR + "-02-28", uploadedBy: ADMIN, uploadedAt: YEAR + "-03-02T15:00:00Z" }];
    const requests = [
      { id: "to-368", userId: "u-staff-6", leaveType: "paid_sick", startsOn: addDays(TODAY, 3), endsOn: addDays(TODAY, 4), partDay: false, hours: 16, status: "requested", reason: "A medical appointment and the day after.", createdAt: addDays(TODAY, -1) + "T13:00:00Z" },
      { id: "to-369", userId: "u-staff-5", leaveType: "paid_sick", startsOn: addDays(TODAY, 6), endsOn: addDays(TODAY, 6), partDay: false, hours: 8, status: "approved", reason: "", createdAt: addDays(TODAY, -4) + "T09:00:00Z", decidedBy: ADMIN, decidedAt: addDays(TODAY, -2) + "T15:00:00Z", decisionNote: null },
      { id: "to-370", userId: "u-staff-8", leaveType: "paid_sick", startsOn: addDays(TODAY, 2), endsOn: addDays(TODAY, 2), partDay: false, hours: 8, status: "requested", reason: "", createdAt: addDays(TODAY, -1) + "T08:00:00Z" },
      { id: "to-371", userId: seed.PEOPLE.admin.id, leaveType: "paid_sick", startsOn: addDays(TODAY, 8), endsOn: addDays(TODAY, 8), partDay: false, hours: 8, status: "approved", reason: "", createdAt: addDays(TODAY, -6) + "T09:00:00Z", decidedBy: seed.PEOPLE.superAdmin.id, decidedAt: addDays(TODAY, -5) + "T15:00:00Z", decisionNote: null },
    ];
    return { policies, assignments, people, ledger, files, requests, seq: n, polSeq: 2, asgSeq: 1, fileSeq: 1, sent: [] };
  }
  const L = () => state.l368 || (state.l368 = fresh());
  const nameOf = (id) => { const p = L().people.find((x) => x.id === id); return p ? (p.firstName + " " + p.lastName).trim() : null; };
  const siteName = (id) => ((state.sites || S).find((x) => x.id === id) || {}).name || null;
  const byId = (id) => L().policies.find((p) => p.id === id) || null;
  const def = () => L().policies.find((p) => p.isDefault);
  const latest = (rows, day) => rows.filter((r) => r.effectiveFrom <= day).sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : a.effectiveFrom > b.effectiveFrom ? -1 : (a.createdAt < b.createdAt ? 1 : -1)))[0] || null;
  function policyOn(p, day) {
    const own = latest(L().assignments.filter((a) => a.userId === p.id), day);
    if (own && own.policyId && byId(own.policyId)) return { policy: byId(own.policyId), source: "person", since: own.effectiveFrom };
    const site = p.siteId ? latest(L().assignments.filter((a) => a.siteId === p.siteId), day) : null;
    if (site && site.policyId && byId(site.policyId)) return { policy: byId(site.policyId), source: "site", since: own && own.effectiveFrom > site.effectiveFrom ? own.effectiveFrom : site.effectiveFrom };
    return { policy: def(), source: "default", since: own ? own.effectiveFrom : null };
  }
  const policyRef = (pol, lang) => (pol && pol.policy ? { id: pol.policy.id, name: policyName(pol.policy, lang), source: pol.source, since: pol.since || null } : null);
  const head = (p) => ({ userId: p.id, name: (p.firstName + " " + p.lastName).trim(), role: p.role, status: p.status, hireDate: p.hireDate, site: p.siteId ? { id: p.siteId, name: siteName(p.siteId) } : null });
  const tracked = (r) => !!r && r.method !== "untracked";
  const grantNeedsHire = (r) => r.tiers.length > 0 || r.method === "anniversary" || r.method === "on_hire" || r.alsoOnHire;
  function balancesOf(p, year, lang) {
    const pol = policyOn(p, year < YEAR ? year + "-12-31" : TODAY);
    const rules = pol.policy ? pol.policy.rules : [];
    const rows = L().ledger.filter((l) => l.userId === p.id && l.kind);
    const kinds = rules.filter(tracked).map((r) => r.kind);
    Array.from(new Set(rows.map((l) => l.kind))).sort().forEach((k) => { if (kinds.indexOf(k) < 0) kinds.push(k); });
    const y0 = year + "-01-01"; const y1 = year + "-12-31";
    return kinds.map((kind) => {
      const r = rules.find((x) => x.kind === kind) || null;
      const mine = rows.filter((l) => l.kind === kind);
      const sum = (f) => r2(mine.filter(f).reduce((a, l) => a + Number(l.hours), 0));
      const inYear = (l) => l.effectiveOn >= y0 && l.effectiveOn <= y1;
      const balance = sum((l) => l.effectiveOn <= y1);
      const through = mine.filter((l) => l.type === "accrual").map((l) => l.periodEnd).sort().pop() || null;
      const notes = [];
      if (r && r.method === "per_hours_worked") notes.push(through ? { code: "leave.note.hoursPostedThrough", message: say(lang, "leave.note.hoursPostedThrough", { date: dayWords(through, lang) }) } : { code: "leave.note.hoursNotPosted", message: say(lang, "leave.note.hoursNotPosted") });
      if (r && tracked(r) && grantNeedsHire(r) && !p.hireDate) notes.push({ code: "leave.note.noHireDate", message: say(lang, "leave.note.noHireDate") });
      const unit = r ? r.unit : "hours";
      return { kind, kindName: kindName(kind, lang, L().policies), unit, hoursPerDay: r ? r.hoursPerDay : null, tracked: tracked(r), method: r ? r.method : null,
        startHours: sum((l) => l.effectiveOn < y0), grantedHours: sum((l) => inYear(l) && (l.type === "grant" || l.type === "accrual")), usedHours: r2(-sum((l) => inYear(l) && l.type === "usage")),
        givenBackHours: sum((l) => inYear(l) && l.type === "reversal"), expiredHours: r2(-sum((l) => inYear(l) && l.type === "expiry")), adjustedHours: sum((l) => inYear(l) && l.type === "adjustment"),
        balanceHours: balance, balanceDays: unit === "days" && r && r.hoursPerDay ? r2(balance / r.hoursPerDay) : null,
        usableFrom: r && r.waitingDays > 0 && p.hireDate ? addDays(p.hireDate, r.waitingDays) : null, hoursPostedThrough: r && r.method === "per_hours_worked" ? through : null, notes };
    });
  }
  const entryView = (l, lang) => {
    const f = l.hoursFileId ? L().files.find((x) => x.id === l.hoursFileId) : null;
    const p = l.policyId ? byId(l.policyId) : null;
    return { id: l.id, userId: l.userId, kind: l.kind, kindName: l.kind ? kindName(l.kind, lang, L().policies) : null, type: l.type, typeName: T(lang, TYPE_NAMES[l.type][0], TYPE_NAMES[l.type][1]), hours: r2(l.hours), effectiveOn: l.effectiveOn,
      policy: p ? { id: p.id, name: policyName(p, lang) } : null, timeOffRequestId: l.timeOffRequestId, hoursFile: f ? { id: f.id, fileName: f.fileName } : null, periodStart: l.periodStart, periodEnd: l.periodEnd, hoursWorked: l.hoursWorked,
      reason: l.reason, detail: l.detail || {}, createdBy: l.createdBy ? { id: l.createdBy, name: nameOf(l.createdBy) || (seed.PEOPLE.superAdmin.id === l.createdBy ? "Oyelaran Adebayo" : null) } : null, createdAt: l.createdAt };
  };
  const fileView = (f) => Object.assign(clone(f), { uploadedBy: f.uploadedBy ? { id: f.uploadedBy, name: nameOf(f.uploadedBy) } : null });
  const asgView = (a, lang) => ({ id: a.id, policyId: a.policyId, policyName: a.policyId ? policyName(byId(a.policyId), lang) : null, userId: a.userId, siteId: a.siteId, effectiveFrom: a.effectiveFrom, note: a.note, setBy: a.createdBy ? { id: a.createdBy, name: nameOf(a.createdBy) } : null, createdAt: a.createdAt });
  const cursorOf = (parts) => Buffer.from(JSON.stringify(parts.map(String)), "utf8").toString("base64url");
  const readCursor = (raw, n) => { const t0 = String(raw || "").trim(); if (!t0) return { value: null }; try { const p = JSON.parse(Buffer.from(t0, "base64url").toString("utf8")); if (Array.isArray(p) && p.length === n) return { value: p }; } catch (e) { /* not ours */ } return { bad: true }; };
  const limitOf = (v) => { const t0 = String(v || "").trim(); if (!t0) return { value: 50 }; const n0 = Number(t0); return !Number.isInteger(n0) || n0 < 1 ? { bad: true } : { value: Math.min(n0, 200) }; };
  const sortKey = (p) => [p.lastName.toLowerCase(), p.firstName.toLowerCase(), p.id];
  const after = (a, c) => { const k = sortKey(a); for (let i = 0; i < 3; i += 1) { if (k[i] > c[i]) return true; if (k[i] < c[i]) return false; } return false; };
  const mayReadAll = () => can("read_hr_records") || can("manage_leave_balances");
  const me = () => person();

  // ---- the routes ------------------------------------------------------------------------------------
  function leaveRoute(method, path, query, body, lang) {
    const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
    if (path === "/api/leave/kinds" && method === "GET") {
      const out = Object.keys(KIND_NAMES).map((k) => ({ key: k, name: kindName(k, lang), fromTimeOff: true }));
      L().policies.forEach((p) => p.rules.forEach((r) => { if (!out.some((x) => x.key === r.kind)) out.push({ key: r.kind, name: r.kindName || r.kind, fromTimeOff: false }); }));
      return ok({ kinds: out });
    }
    if (path === "/api/leave/policies" && method === "GET") {
      if (!mayReadAll()) return noCap(lang, "read_hr_records");
      return ok({ policies: L().policies.slice().sort((a, c) => (c.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.name.toLowerCase().localeCompare(c.name.toLowerCase())).map((p) => Object.assign(policyView(p, lang, L().policies), {
        followers: { sites: (state.sites || S).filter((s0) => { if (s0.status !== "active") return false; const a = latest(L().assignments.filter((x) => x.siteId === s0.id), TODAY); return (a && a.policyId ? a.policyId : def().id) === p.id; }).length,
          people: L().people.filter((x) => x.status === "active" && policyOn(x, TODAY).policy === p).length } })) });
    }
    if (path === "/api/leave/policies" && method === "POST") {
      if (!can("manage_leave_balances")) return noCap(lang, "manage_leave_balances");
      const read = readPolicy(b, true);
      if (read.keys) return refuse(lang, 400, "leave.badDetails", null, { keys: read.keys });
      const p = Object.assign({ id: "lp-" + (++L().polSeq), code: null, builtIn: false, isDefault: false, description: null, note: null, grantsFrom: TODAY, holidaysSource: "handbook", holidays: [], createdAt: seed.NOW_ISO, updatedAt: seed.NOW_ISO, rules: [] }, read.value);
      L().policies.push(p);
      L().sent.push({ policy: "created", body: clone(b) });
      return { status: 201, json: { policy: policyView(p, lang, L().policies) } };
    }
    const pol = /^\/api\/leave\/policies\/([^/]+)$/.exec(path);
    if (pol) {
      const p = byId(decodeURIComponent(pol[1]));
      if (method === "GET") {
        if (!mayReadAll()) return noCap(lang, "read_hr_records");
        if (!p) return refuse(lang, 404, "leave.policyNotFound");
        const lim = limitOf(query.get("limit")); const cur = readCursor(query.get("cursor"), 3);
        if (lim.bad || cur.bad) return refuse(lang, 400, "leave.badFilter", null, { keys: [lim.bad ? "limit" : "cursor"] });
        const sites = (state.sites || S).filter((s0) => s0.status === "active").map((s0) => { const a = latest(L().assignments.filter((x) => x.siteId === s0.id), TODAY); const id = a && a.policyId ? a.policyId : def().id; return { siteId: s0.id, siteName: s0.name, source: a && a.policyId ? "site" : "default", since: a ? a.effectiveFrom : null, id }; }).filter((x) => x.id === p.id).map((x) => ({ siteId: x.siteId, siteName: x.siteName, source: x.source, since: x.since }));
        let people = L().people.filter((x) => x.status === "active" && policyOn(x, TODAY).policy === p).sort((a, c) => sortKey(a).join("|").localeCompare(sortKey(c).join("|")));
        if (cur.value) people = people.filter((x) => after(x, cur.value));
        const page = people.slice(0, lim.value);
        return ok({ policy: policyView(p, lang, L().policies), sites, people: page.map((x) => ({ person: head(x), policy: policyRef(policyOn(x, TODAY), lang) })), nextCursor: people.length > lim.value ? cursorOf(sortKey(page[page.length - 1])) : null });
      }
      if (method === "PATCH") {
        if (!can("manage_leave_balances")) return noCap(lang, "manage_leave_balances");
        if (!p) return refuse(lang, 404, "leave.policyNotFound");
        const read = readPolicy(b, false);
        if (read.keys) return refuse(lang, 400, "leave.badDetails", null, { keys: read.keys });
        Object.assign(p, read.value, { updatedAt: seed.NOW_ISO });
        L().sent.push({ policy: p.id, body: clone(b) });
        return ok({ policy: policyView(p, lang, L().policies) });
      }
    }
    if (path === "/api/leave/sites" && method === "GET") {
      if (!mayReadAll()) return noCap(lang, "read_hr_records");
      return ok({ sites: (state.sites || S).filter((s0) => s0.status === "active").sort((a, c) => a.name.localeCompare(c.name)).map((s0) => siteView(s0, lang)) });
    }
    const sp = /^\/api\/leave\/sites\/([^/]+)\/policy$/.exec(path);
    if (sp && method === "POST") {
      if (!can("manage_leave_balances")) return noCap(lang, "manage_leave_balances");
      const s0 = (state.sites || S).find((x) => x.id === decodeURIComponent(sp[1]));
      if (!s0) return refuse(lang, 404, "leave.siteNotFound");
      const read = readAssignment(b);
      if (read.keys) return refuse(lang, 400, "leave.badDetails", null, { keys: read.keys });
      L().assignments.push(Object.assign({ id: "la-" + (++L().asgSeq), userId: null, siteId: s0.id, createdBy: me().id, createdAt: seed.NOW_ISO }, read.value));
      L().sent.push({ sitePolicy: s0.id, body: clone(b) });
      return { status: 201, json: { site: siteView(s0, lang) } };
    }
    if (path === "/api/leave/balances" && method === "GET") {
      if (!mayReadAll()) return noCap(lang, "read_hr_records");
      const keys = [];
      const year = query.get("year") ? Number(query.get("year")) : YEAR;
      if (!Number.isInteger(year) || year < 2000 || year > YEAR + 1) keys.push("year");
      const status = query.get("status") || "active";
      const lim = limitOf(query.get("limit")); if (lim.bad) keys.push("limit");
      const cur = readCursor(query.get("cursor"), 3); if (cur.bad) keys.push("cursor");
      if (keys.length) return refuse(lang, 400, "leave.badFilter", null, { keys });
      const asOf = year < YEAR ? year + "-12-31" : TODAY;
      let people = L().people.filter((x) => status === "all" || x.status === status);
      if (query.get("role")) people = people.filter((x) => x.role === query.get("role"));
      if (query.get("siteId")) people = people.filter((x) => x.siteId === query.get("siteId"));
      if (query.get("policyId")) people = people.filter((x) => (policyOn(x, asOf).policy || {}).id === query.get("policyId"));
      if (query.get("q")) people = people.filter((x) => (x.firstName + " " + x.lastName).toLowerCase().indexOf(query.get("q").toLowerCase()) >= 0);
      people.sort((a, c) => sortKey(a).join("|").localeCompare(sortKey(c).join("|")));
      if (query.get("format") === "csv") {
        const lines = [["user_id", "name", "employee_id", "role", "status", "hire_date", "site", "policy", "policy_source", "kind", "unit", "start_hours", "granted_hours", "used_hours", "given_back_hours", "expired_hours", "adjusted_hours", "balance_hours", "balance_days"].join(",")];
        people.forEach((x) => { const pr = policyRef(policyOn(x, asOf), lang); balancesOf(x, year, lang).forEach((bl) => lines.push([x.id, x.firstName + " " + x.lastName, x.employeeId || "", x.role, x.status, x.hireDate || "", siteName(x.siteId) || "", pr ? pr.name : "", pr ? pr.source : "", bl.kind, bl.unit, bl.startHours, bl.grantedHours, bl.usedHours, bl.givenBackHours, bl.expiredHours, bl.adjustedHours, bl.balanceHours, bl.balanceDays === null ? "" : bl.balanceDays].map((v) => "\"" + String(v).replace(/"/g, "\"\"") + "\"").join(","))); });
        L().sent.push({ csv: query.toString() });
        return { status: 200, bytes: Buffer.from("\ufeff" + lines.join("\r\n") + "\r\n", "utf8"), contentType: "text/csv; charset=utf-8", headers: { "Content-Disposition": "attachment; filename=\"leave-balances-" + year + ".csv\"", "Access-Control-Expose-Headers": "Content-Disposition" } };
      }
      if (cur.value) people = people.filter((x) => after(x, cur.value));
      const page = people.slice(0, lim.value);
      const files = L().files;
      return ok({ year, asOf, people: page.map((x) => ({ person: head(x), policy: policyRef(policyOn(x, asOf), lang), balances: balancesOf(x, year, lang) })), nextCursor: people.length > lim.value ? cursorOf(sortKey(page[page.length - 1])) : null,
        hoursFiles: { taken: files.length, lastUploadedAt: files.length ? files[files.length - 1].uploadedAt : null, lastPeriodEnd: files.map((f) => f.lastPeriodEnd).sort().pop() || null } });
    }
    if (path === "/api/leave/missing-hire-dates" && method === "GET") {
      if (!mayReadAll()) return noCap(lang, "read_hr_records");
      const people = L().people.filter((x) => x.status === "active" && !x.hireDate).sort((a, c) => sortKey(a).join("|").localeCompare(sortKey(c).join("|")));
      return ok({ people: people.map((x) => { const pol0 = policyOn(x, TODAY); return { person: head(x), policy: policyRef(pol0, lang), kindsAffected: (pol0.policy ? pol0.policy.rules : []).filter((r) => tracked(r) && (grantNeedsHire(r) || r.waitingDays > 0)).map((r) => ({ kind: r.kind, kindName: kindName(r.kind, lang, L().policies) })) }; }), nextCursor: null });
    }
    if (path === "/api/leave/hours-files" && method === "GET") {
      if (!mayReadAll()) return noCap(lang, "read_hr_records");
      return ok({ files: L().files.slice().reverse().map(fileView), nextCursor: null });
    }
    if (path === "/api/leave/hours-files" && method === "POST") {
      if (!can("manage_leave_balances")) return noCap(lang, "manage_leave_balances");
      const keys = [];
      if (typeof b.fileName !== "string" || !b.fileName.trim()) keys.push("fileName");
      if (typeof b.csv !== "string" || !b.csv.trim()) keys.push("csv");
      if (keys.length) return refuse(lang, 400, "leave.badDetails", null, { keys });
      return takeFile(b, lang);
    }
    const pp = /^\/api\/leave\/people\/([^/]+)(\/entries|\/policy|\/adjustments)?$/.exec(path);
    if (pp) {
      const p = L().people.find((x) => x.id === decodeURIComponent(pp[1]));
      const own = !!p && p.id === me().id;
      const tail = pp[2] || "";
      if ((tail === "" || tail === "/entries") && method === "GET") {
        if (!own && !mayReadAll()) return noCap(lang, "read_hr_records");
        if (!p) return refuse(lang, 404, "leave.personNotFound");
        const year = query.get("year") ? Number(query.get("year")) : YEAR;
        if (tail === "") {
          const asOf = year < YEAR ? year + "-12-31" : TODAY;
          const pol0 = policyOn(p, asOf);
          const pv = pol0.policy ? policyView(pol0.policy, lang, L().policies) : null;
          const hist = L().assignments.filter((a) => a.userId === p.id).map((a) => Object.assign({ scope: "person" }, asgView(a, lang))).concat(p.siteId ? L().assignments.filter((a) => a.siteId === p.siteId).map((a) => Object.assign({ scope: "site" }, asgView(a, lang))) : []);
          return ok({ person: head(p), year, asOf, policy: policyRef(pol0, lang), summary: pv ? { lines: pv.summary.lines, holidays: pv.summary.holidays, holidayDays: pv.holidays.days } : null, balances: balancesOf(p, year, lang),
            policyHistory: hist.sort((a, c) => (a.effectiveFrom < c.effectiveFrom ? 1 : -1)).map((h) => ({ id: h.id, scope: h.scope, policyId: h.policyId, policyName: h.policyName, effectiveFrom: h.effectiveFrom, note: h.note, setBy: h.setBy, createdAt: h.createdAt })) });
        }
        let rows = L().ledger.filter((l) => l.userId === p.id && (!query.get("year") || l.effectiveOn.slice(0, 4) === String(year)) && (!query.get("kind") || l.kind === query.get("kind")));
        rows.sort((a, c) => (a.effectiveOn !== c.effectiveOn ? (a.effectiveOn < c.effectiveOn ? 1 : -1) : (a.createdAt < c.createdAt ? 1 : a.createdAt > c.createdAt ? -1 : c.id.localeCompare(a.id, undefined, { numeric: true }))));
        const lim = limitOf(query.get("limit")); const cur = readCursor(query.get("cursor"), 3);
        if (lim.bad || cur.bad) return refuse(lang, 400, "leave.badFilter", null, { keys: [lim.bad ? "limit" : "cursor"] });
        if (cur.value) { const at = rows.findIndex((l) => l.id === cur.value[2]); rows = at >= 0 ? rows.slice(at + 1) : rows; }
        const page = rows.slice(0, lim.value);
        return ok({ entries: page.map((l) => entryView(l, lang)), nextCursor: rows.length > lim.value ? cursorOf([page[page.length - 1].effectiveOn, page[page.length - 1].createdAt, page[page.length - 1].id]) : null });
      }
      if (tail === "/policy" && method === "POST") {
        if (!can("manage_leave_balances")) return noCap(lang, "manage_leave_balances");
        if (!p) return refuse(lang, 404, "leave.personNotFound");
        const read = readAssignment(b);
        if (read.keys) return refuse(lang, 400, "leave.badDetails", null, { keys: read.keys });
        const a = Object.assign({ id: "la-" + (++L().asgSeq), userId: p.id, siteId: null, createdBy: me().id, createdAt: seed.NOW_ISO }, read.value);
        L().assignments.push(a);
        L().seq += 1;
        const entry = { id: "ll-" + L().seq, userId: p.id, kind: null, type: "policy_change", hours: 0, effectiveOn: a.effectiveFrom, policyId: a.policyId, timeOffRequestId: null, hoursFileId: null, periodStart: null, periodEnd: null, hoursWorked: null, reason: a.note, detail: {}, createdBy: me().id, createdAt: seed.NOW_ISO };
        L().ledger.push(entry);
        L().sent.push({ personPolicy: p.id, body: clone(b) });
        return { status: 201, json: { assignment: asgView(a, lang), entry: entryView(entry, lang), policy: policyRef(policyOn(p, TODAY), lang) } };
      }
      if (tail === "/adjustments" && method === "POST") {
        if (!can("manage_leave_balances")) return noCap(lang, "manage_leave_balances");
        if (!p) return refuse(lang, 404, "leave.personNotFound");
        const keys = [];
        const kinds = Object.keys(KIND_NAMES).concat(...L().policies.map((x) => x.rules.map((r) => r.kind)));
        if (kinds.indexOf(String(b.kind || "")) < 0) keys.push("kind");
        const hours = typeof b.hours === "number" ? b.hours : Number(b.hours);
        if (!Number.isFinite(hours) || hours === 0 || Math.abs(hours) > 9999 || Math.abs(hours * 100 - Math.round(hours * 100)) > 1e-6) keys.push("hours");
        const reason = typeof b.reason === "string" ? b.reason.trim() : "";
        const clientId = b.clientId === undefined || b.clientId === null ? null : String(b.clientId);
        if (clientId !== null && !/^[A-Za-z0-9_-]{8,64}$/.test(clientId)) keys.push("clientId");
        if (keys.length) return refuse(lang, 400, "leave.badDetails", null, { keys: reason ? keys : keys.concat(["reason"]) });
        if (!reason) return refuse(lang, 400, "leave.reasonRequired", null, { keys: ["reason"] });
        const key = clientId ? "adjustment:" + p.id + ":" + clientId : null;
        let entry = key ? L().ledger.find((l) => l.postKey === key) : null;
        const replay = !!entry;
        if (!entry) {
          L().seq += 1;
          entry = { id: "ll-" + L().seq, userId: p.id, kind: b.kind, type: "adjustment", hours: r2(hours), effectiveOn: TODAY, policyId: (policyOn(p, TODAY).policy || {}).id || null, timeOffRequestId: null, hoursFileId: null, periodStart: null, periodEnd: null, hoursWorked: null, reason, detail: {}, createdBy: me().id, createdAt: new Date(Date.parse(seed.NOW_ISO) + L().seq * 1000).toISOString(), postKey: key };
          L().ledger.push(entry);
        }
        L().sent.push({ adjustment: p.id, body: clone(b), replay });
        return { status: replay ? 200 : 201, json: { entry: entryView(entry, lang), balance: balancesOf(p, YEAR, lang).find((x) => x.kind === entry.kind) || null } };
      }
    }
    return null;
  }
  function siteView(s0, lang) {
    const a = latest(L().assignments.filter((x) => x.siteId === s0.id), TODAY);
    const p = a && a.policyId ? byId(a.policyId) : def();
    return { siteId: s0.id, siteName: s0.name, policy: p ? { id: p.id, name: policyName(p, lang) } : null, source: a && a.policyId ? "site" : "default", since: a ? a.effectiveFrom : null,
      history: L().assignments.filter((x) => x.siteId === s0.id).map((x) => asgView(x, lang)) };
  }
  function readAssignment(b) {
    const keys = [];
    let policyId = null;
    if (b.policyId !== null) { if (!byId(String(b.policyId || ""))) keys.push("policyId"); else policyId = String(b.policyId); }
    if (!realDay(String(b.effectiveFrom || "")) || b.effectiveFrom > addDays(TODAY, 366)) keys.push("effectiveFrom");
    if (b.note !== undefined && b.note !== null && (typeof b.note !== "string" || b.note.length > 1000)) keys.push("note");
    return keys.length ? { keys } : { value: { policyId, effectiveFrom: b.effectiveFrom, note: typeof b.note === "string" ? b.note.trim() || null : null } };
  }
  const METHODS = ["january_1", "anniversary", "on_hire", "monthly", "per_hours_worked", "manual", "untracked"];
  function readPolicy(b, creating) {
    const keys = [];
    const value = {};
    if (b.name !== undefined || creating) { if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 120) keys.push("name"); else value.name = b.name.trim(); }
    ["description", "note"].forEach((k) => { if (b[k] !== undefined) { if (b[k] !== null && typeof b[k] !== "string") keys.push(k); else value[k] = b[k] ? b[k].trim() || null : null; } });
    if (b.grantsFrom !== undefined) { if (!realDay(b.grantsFrom)) keys.push("grantsFrom"); else value.grantsFrom = b.grantsFrom; }
    if (b.holidays !== undefined) {
      const h = b.holidays;
      if (!h || ["handbook", "own"].indexOf(h.source) < 0) keys.push("holidays");
      else if (h.source === "own") { const days = Array.isArray(h.days) ? h.days : []; days.forEach((d, j) => { if (!d || !realDay(d.date) || !String(d.name || "").trim()) keys.push("holidays.days[" + j + "]"); }); value.holidaysSource = "own"; value.holidays = days.map((d) => ({ date: d.date, name: String(d.name || "").trim() })); }
      else { value.holidaysSource = "handbook"; value.holidays = []; }
    }
    if (b.rules !== undefined || creating) {
      if (!Array.isArray(b.rules)) keys.push("rules");
      else {
        const seen = new Set();
        value.rules = [];
        b.rules.forEach((r, i) => {
          const at = (k) => "rules[" + i + "]." + k;
          if (!r || typeof r !== "object") { keys.push("rules[" + i + "]"); return; }
          if (!/^[a-z][a-z0-9_]{1,39}$/.test(String(r.kind || "")) || seen.has(r.kind)) keys.push(at("kind"));
          seen.add(r.kind);
          if (!KIND_NAMES[r.kind] && !String(r.kindName || "").trim()) keys.push(at("kindName"));
          if (METHODS.indexOf(r.method) < 0) keys.push(at("method"));
          const noAmount = r.method === "manual" || r.method === "untracked";
          if (!noAmount && !(Number(r.amount) >= 0 && r.amount !== null && r.amount !== "")) keys.push(at("amount"));
          if (r.method === "per_hours_worked" && !(Number(r.perHoursWorked) > 0)) keys.push(at("perHoursWorked"));
          if (r.alsoOnHire && r.method !== "january_1" && r.method !== "anniversary") keys.push(at("alsoOnHire"));
          (r.tiers || []).forEach((x, j) => { if (!(Number.isInteger(Number(x.years)) && Number(x.years) >= 1) || !(Number(x.amount) >= 0) || x.amount === null) keys.push(at("tiers[" + j + "]")); });
          value.rules.push(rule({ kind: r.kind, kindName: KIND_NAMES[r.kind] ? null : String(r.kindName || "").trim(), unit: r.unit || "hours", amount: Number(r.amount) || 0, hoursPerDay: Number(r.hoursPerDay) || 8, method: r.method, alsoOnHire: !!r.alsoOnHire, perHoursWorked: r.method === "per_hours_worked" ? Number(r.perHoursWorked) : null, tiers: (r.tiers || []).map((x) => ({ years: Number(x.years), amount: Number(x.amount) })), waitingDays: Number(r.waitingDays) || 0, carryoverCap: r.carryoverCap === null || r.carryoverCap === undefined ? null : Number(r.carryoverCap), maxBalance: r.maxBalance === null || r.maxBalance === undefined ? null : Number(r.maxBalance), note: r.note || null }));
        });
      }
    }
    return keys.length ? { keys } : { value };
  }
  function takeFile(b, lang) {
    const rows = String(b.csv).replace(/^\ufeff/, "").split(/\r?\n/).map((l, i) => ({ line: i + 1, cells: l.split(",").map((c) => c.trim()) })).filter((r) => r.cells.some((c) => c));
    const headRow = rows[0] ? rows[0].cells.map((c) => c.toLowerCase()) : [];
    const pc = headRow.indexOf("person"), hc = headRow.indexOf("hours"), sc = headRow.indexOf("period_start"), ec = headRow.indexOf("period_end");
    if (pc < 0 || hc < 0 || sc < 0 || ec < 0) return refuse(lang, 400, "leave.hoursFileInvalid", null, { lines: [{ line: 1, code: "leave.hoursFile.badHeader", message: say(lang, "leave.hoursFile.badHeader"), keys: ["header"] }] });
    const lines = []; const problems = [];
    rows.slice(1).forEach((r) => {
      const who = r.cells[pc] || "";
      const p = L().people.find((x) => String(x.badge || "") === who || String(x.employeeId || "").toLowerCase() === who.toLowerCase());
      if (!realDay(r.cells[sc]) || !realDay(r.cells[ec]) || r.cells[sc] > r.cells[ec]) { problems.push({ line: r.line, code: "leave.hoursFile.badPeriod", message: say(lang, "leave.hoursFile.badPeriod"), keys: ["period"] }); return; }
      if (!p) { problems.push({ line: r.line, code: "leave.hoursFile.personUnknown", message: say(lang, "leave.hoursFile.personUnknown", { person: who }), keys: ["person"] }); return; }
      lines.push({ line: r.line, person: who, userId: p.id, name: (p.firstName + " " + p.lastName).trim(), periodStart: r.cells[sc], periodEnd: r.cells[ec], hoursWorked: Number(r.cells[hc]), outcome: "noHoursRule", entries: [] });
    });
    if (problems.length) { L().sent.push({ hoursFile: b.fileName, refused: problems.length }); return refuse(lang, 400, "leave.hoursFileInvalid", null, { lines: problems }); }
    const sha = "f" + String(b.csv).trim().length + ":" + String(b.csv).trim().slice(0, 40);
    const taken = L().files.find((f) => f.sha256 === sha);
    if (taken) return ok({ duplicate: true, file: fileView(taken), lines: [] });
    const fileId = "hf-" + (++L().fileSeq);
    lines.forEach((l) => {
      const p = L().people.find((x) => x.id === l.userId);
      const pol0 = policyOn(p, l.periodEnd);
      const rules = pol0.policy ? pol0.policy.rules.filter((r) => r.method === "per_hours_worked") : [];
      rules.forEach((r) => {
        if (L().ledger.some((x) => x.userId === p.id && x.kind === r.kind && x.type === "accrual" && x.periodStart <= l.periodEnd && x.periodEnd >= l.periodStart)) { if (l.outcome !== "posted") l.outcome = "alreadyPosted"; return; }
        L().seq += 1;
        const hours = r2((l.hoursWorked / r.perHoursWorked) * r.amount);
        L().ledger.push({ id: "ll-" + L().seq, userId: p.id, kind: r.kind, type: "accrual", hours, effectiveOn: l.periodEnd, policyId: pol0.policy.id, timeOffRequestId: null, hoursFileId: fileId, periodStart: l.periodStart, periodEnd: l.periodEnd, hoursWorked: l.hoursWorked, reason: null, detail: {}, createdBy: me().id, createdAt: seed.NOW_ISO });
        l.outcome = "posted"; l.entries.push({ id: "ll-" + L().seq, kind: r.kind, hours });
      });
    });
    const posted = lines.filter((l) => l.outcome === "posted").length;
    const f = { id: fileId, fileName: b.fileName, sha256: sha, lineCount: lines.length, postedCount: posted, skippedCount: lines.length - posted, firstPeriodStart: lines.map((l) => l.periodStart).sort()[0] || null, lastPeriodEnd: lines.map((l) => l.periodEnd).sort().pop() || null, uploadedBy: me().id, uploadedAt: seed.NOW_ISO };
    L().files.push(f);
    L().sent.push({ hoursFile: b.fileName, posted });
    return { status: 201, json: { duplicate: false, file: fileView(f), lines } };
  }

  // ---- time off: leave on the read and the decisions, and the rescind -----------------------------------
  function requestLeave(r, lang) {
    const p = L().people.find((x) => x.id === r.userId);
    if (!p) return null;
    const pol0 = policyOn(p, r.startsOn);
    const ru = pol0.policy ? pol0.policy.rules.find((x) => x.kind === r.leaveType) : null;
    const isTracked = tracked(ru);
    const usage = L().ledger.find((l) => l.postKey === "usage:" + r.id);
    const givenBack = !!L().ledger.find((l) => l.postKey === "reversal:" + r.id);
    const hours = usage ? r2(-usage.hours) : Number(r.hours || 0);
    const balance = isTracked || usage ? r2(L().ledger.filter((l) => l.userId === p.id && l.kind === r.leaveType).reduce((a, l) => a + Number(l.hours), 0)) : null;
    const pending = r.status === "requested";
    const would = balance === null ? null : pending && isTracked ? r2(balance - hours) : balance;
    const usableFrom = isTracked && ru.waitingDays > 0 && p.hireDate ? addDays(p.hireDate, ru.waitingDays) : null;
    const kn = kindName(r.leaveType, lang, L().policies);
    const warnings = [];
    if (pending && isTracked) {
      if (would < 0) warnings.push({ code: "leave.warning.belowZero", message: say(lang, "leave.warning.belowZero", { kind: kn, hours: would }) });
      if (usableFrom && r.startsOn < usableFrom) warnings.push({ code: "leave.warning.inWaitingPeriod", message: say(lang, "leave.warning.inWaitingPeriod", { kind: kn, date: dayWords(usableFrom, lang) }) });
    }
    return { kind: r.leaveType, kindName: kn, tracked: isTracked, policy: policyRef(pol0, lang), balanceHours: balance, requestHours: hours, hoursFrom: "request", days: null, wouldLeaveHours: would, taken: !!usage && !givenBack, givenBack, usableFrom, warnings };
  }
  const requestView = (r, lang) => Object.assign({ userName: nameOf(r.userId), leaveTypeLabel: kindName(r.leaveType, lang, L().policies), startTime: null, endTime: null, decidedByName: r.decidedBy ? nameOf(r.decidedBy) || "Oyelaran Adebayo" : null, decidedAt: null, decisionNote: null, cancelledAt: null, shifts: [] }, clone(r));
  function timeOffRoute(method, path, query, body, lang, base) {
    if (path === "/api/time-off" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && Array.isArray(a.json.requests)) {
        const status = query.get("status") || "requested";
        const userId = query.get("userId") || "";
        const mine = L().requests.filter((r) => (status === "all" || r.status === status) && (!userId || r.userId === userId)).map((r) => requestView(r, lang));
        a.json = Object.assign({}, a.json, { requests: mine.concat(a.json.requests), total: (a.json.total || a.json.requests.length) + mine.length });
      }
      return a;
    }
    const m = /^\/api\/time-off\/([^/]+)(\/approve|\/deny|\/rescind)?$/.exec(path);
    if (!m) return null;
    const r = L().requests.find((x) => x.id === decodeURIComponent(m[1]));
    if (!r) return null;
    const tail = m[2] || "";
    if (!tail && method === "GET") return ok({ request: requestView(r, lang), affectedShifts: [], leave: requestLeave(r, lang) });
    if ((tail === "/approve" || tail === "/deny") && method === "POST") {
      if (r.userId === me().id) return refuse(lang, 403, "timeOff.decideOwn");
      if (r.status !== "requested") return { status: 409, json: { error: T(lang, "Someone else decided this already", "Otra persona ya decidi\u00f3 esto"), code: "already_decided" } };
      Object.assign(r, { status: tail === "/deny" ? "denied" : "approved", decidedBy: me().id, decidedAt: seed.NOW_ISO, decisionNote: (body && body.note) || null });
      if (tail === "/approve") {
        const p = L().people.find((x) => x.id === r.userId);
        const ru = p ? (policyOn(p, r.startsOn).policy || { rules: [] }).rules.find((x) => x.kind === r.leaveType) : null;
        if (tracked(ru)) { L().seq += 1; L().ledger.push({ id: "ll-" + L().seq, userId: r.userId, kind: r.leaveType, type: "usage", hours: -Number(r.hours || 0), effectiveOn: r.startsOn, policyId: null, timeOffRequestId: r.id, hoursFileId: null, periodStart: null, periodEnd: null, hoursWorked: null, reason: null, detail: {}, createdBy: me().id, createdAt: seed.NOW_ISO, postKey: "usage:" + r.id }); }
      }
      L().sent.push({ decided: r.id, kind: tail.slice(1), body: clone(body || {}) });
      return ok({ request: requestView(r, lang), affectedShifts: [], shifts: [], leave: requestLeave(r, lang) });
    }
    if (tail === "/rescind" && method === "POST") {
      if (!can("approve_time_off")) return noCap(lang, "approve_time_off");
      if (r.userId === me().id) return refuse(lang, 403, "timeOff.decideOwn");
      if (r.status !== "approved") return refuse(lang, 409, "timeOff.onlyApprovedRescinded", null, { status: r.status });
      Object.assign(r, { status: "cancelled", cancelledAt: seed.NOW_ISO });
      const usage = L().ledger.find((l) => l.postKey === "usage:" + r.id);
      if (usage && !L().ledger.find((l) => l.postKey === "reversal:" + r.id)) { L().seq += 1; L().ledger.push({ id: "ll-" + L().seq, userId: r.userId, kind: usage.kind, type: "reversal", hours: -Number(usage.hours), effectiveOn: usage.effectiveOn, policyId: usage.policyId, timeOffRequestId: r.id, hoursFileId: null, periodStart: null, periodEnd: null, hoursWorked: null, reason: null, detail: { usageId: usage.id }, createdBy: me().id, createdAt: seed.NOW_ISO, postKey: "reversal:" + r.id }); }
      L().sent.push({ rescinded: r.id });
      return ok({ request: requestView(r, lang), leave: requestLeave(r, lang) });
    }
    return null;
  }

  // A scene a case sets: many adds 55 active people at the first site, so the balances list pages.
  function setScene(o) {
    if (o.leaveMany) {
      for (let i = 0; i < 55; i += 1) L().people.push({ id: "u-lv-" + (i + 1), firstName: "Person" + String(i + 1).padStart(2, "0"), lastName: "Zz" + String(i + 1).padStart(2, "0"), role: "custodial_laborer", status: "active", employeeId: "EMP-9" + String(i).padStart(3, "0"), badge: String(9000 + i), hireDate: "2025-01-15", siteId: S[0].id });
    }
  }

  function route(method, path, query, body, lang, base) {
    if (path.indexOf("/api/leave/") === 0) return leaveRoute(method, path, query, body, lang);
    if (path.indexOf("/api/time-off") === 0) return timeOffRoute(method, path, query, body, lang, base);
    return null;
  }
  return { route, setScene, sent: () => (state.l368 ? state.l368.sent : []), model: () => L(), reset: () => { state.l368 = null; } };
};
