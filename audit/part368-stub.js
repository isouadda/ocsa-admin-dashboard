// What the API's Rounds 5 and 6 answer (parts 363 and 365, ocsa-api main ca4aafa), for the dashboard's
// part 368. audit/stubs.js lays it over every other layer, and it answers each route the way the API's
// code at ca4aafa does:
//
//   Maintenance requests (routes/maintenance.js, helpers/maintenanceRequests.js), on in every run, since
//   the API's main answers them:
//   GET, POST /api/sites/:siteId/maintenance-contacts, PATCH .../:contactId
//                                       a site's contacts, active first, primary first, then by name;
//                                       ?includeInactive=true lists the turned off ones too; changed by
//                                       manage_sites only, a PATCH writing only the keys it carries
//   GET /api/maintenance-requests/options, /summary, /from-issue/:issueId, the list, one request
//   POST /api/maintenance-requests      JSON, or multipart with the photos under photos; every check
//                                       before anything is written (maintenance.badDetails with keys,
//                                       409 maintenance.noContact, 409 maintenance.issueAlreadySent,
//                                       400 maintenance.photoLimit), MR-<year>-<number>, the email to the
//                                       contacts for the building and those covering the whole site
//   POST /api/maintenance-requests/:id/log, /follow-up, /resend, GET .../photos/:photoId
//   GET /api/issues/:id                 maintenanceRequests, the requests the issue was sent as
//   GET and PATCH /api/settings         maintenance_response_days, 1 to 30 (settings.maintenanceDaysWhole),
//                                       and checklistDayStartsAt, 04:00, on the read (the API's part 363)
//
// Every value is invented. The words are the API's helpers/words.js English and Spanish.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone, person, effectiveMap, PNG_BYTES, userProfile } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const me = () => person();
  // A capability as the API reads it: the super admin holds every one, an override the run set wins, and
  // a key the stub's table does not carry falls back to the role's default (middleware/capabilities.js).
  const OWN_DEFAULTS = {
    file_maintenance_requests: { admin: true, supervisor: true },
    manage_leave_balances: { admin: true },
  };
  const can = (key) => {
    const p = me();
    if (!p) return false;
    const off = (m().off || {})[p.id] || [];
    if (off.indexOf(key) >= 0) return false;
    if (p.isSuperAdmin) return true;
    const overrides = (state.overrides || {})[p.id] || {};
    if (Object.prototype.hasOwnProperty.call(overrides, key)) return !!overrides[key];
    if (OWN_DEFAULTS[key]) return !!OWN_DEFAULTS[key][p.role];
    const map = effectiveMap(p, overrides);
    if (Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
    return p.role === "admin";
  };
  // The sites a person may read: an admin every one, a supervisor the sites they supervise.
  const readsSite = (siteId) => {
    const p = me();
    if (!p) return false;
    if (p.role === "admin" || p.isSuperAdmin) return true;
    const s0 = (state.sites || seed.SITES).find((x) => String(x.id) === String(siteId));
    return !!(s0 && s0.supervisor_id === p.id);
  };
  const siteOf = (id) => (state.sites || seed.SITES).find((x) => String(x.id) === String(id)) || null;
  const nameOfPerson = (id) => {
    const all = Object.keys(seed.PEOPLE).map((k) => seed.PEOPLE[k]);
    const p = all.find((x) => x.id === id);
    if (p) return p.firstName + " " + p.lastName;
    const st = (seed.STAFF || []).find((x) => x.id === id);
    return st ? st.name : null;
  };

  // ---- the words ----------------------------------------------------------------------------------
  const W = {
    "maintenance.badDetails": ["Some details are missing or not valid.", "Faltan algunos datos o no son v\u00e1lidos."],
    "maintenance.badFilter": ["A filter is not valid.", "Un filtro no es v\u00e1lido."],
    "maintenance.notFound": ["Maintenance request not found", "No se encontr\u00f3 la solicitud de mantenimiento"],
    "maintenance.contactNotFound": ["Maintenance contact not found", "No se encontr\u00f3 el contacto de mantenimiento"],
    "maintenance.noContact": ["This site has no active maintenance contact. Add one before sending a request.", "Este sitio no tiene un contacto de mantenimiento activo. Agregue uno antes de enviar una solicitud."],
    "maintenance.issueAlreadySent": ["This issue was already sent to the building as {reference}.", "Este problema ya se envi\u00f3 al edificio como {reference}."],
    "maintenance.requestDone": ["This request is closed or cancelled.", "Esta solicitud est\u00e1 cerrada o cancelada."],
    "maintenance.followUpSentToday": ["A follow-up on this request already went today.", "Ya se envi\u00f3 hoy un seguimiento de esta solicitud."],
    "maintenance.alreadySent": ["The email for this request already went. Send a follow-up to write again.", "El correo de esta solicitud ya se envi\u00f3. Env\u00ede un seguimiento para escribir de nuevo."],
    "maintenance.photoLimit": ["A maintenance request takes {max} photos at most.", "Una solicitud de mantenimiento acepta como m\u00e1ximo {max} fotos."],
    "maintenance.emailNotSent": ["The request is saved, and its email did not go. Send it again from the request.", "La solicitud se guard\u00f3 y su correo no se envi\u00f3. Env\u00edelo de nuevo desde la solicitud."],
    "forms.photoNoFile": ["Choose a photo to add.", "Elija una foto para agregar."],
    "forms.photoNotFound": ["Photo not found", "No se encontr\u00f3 la foto"],
    "issues.notFound": ["Issue not found", "No se encontr\u00f3 el problema"],
    "sites.notFound": ["Site not found", "No se encontr\u00f3 el sitio"],
    "access.noSiteAccess": ["You do not have access to this site", "No tiene acceso a este sitio"],
    "settings.maintenanceDaysWhole": ["The days before a maintenance request reminds its filer are a whole number from 1 to 30.", "Los d\u00edas antes de que una solicitud de mantenimiento le recuerde a quien la envi\u00f3 son un n\u00famero entero del 1 al 30."],
    "access.insufficientPermissions": ["You do not have permission to do this.", "No tiene permiso para hacer esto."],
  };
  const say = (lang, key, vars) => {
    let s0 = T(lang, W[key][0], W[key][1]);
    Object.keys(vars || {}).forEach((k) => { s0 = s0.split("{" + k + "}").join(String(vars[k])); });
    return s0;
  };
  const refuse = (lang, status, key, vars, extra) => bad(status, key, say(lang, key, vars), extra);
  const noCap = (lang, key) => bad(403, "access.insufficientPermissions", say(lang, "access.insufficientPermissions"), { capability: key });
  const NAMES = {
    category: { plumbing: ["Plumbing", "Plomer\u00eda"], electrical: ["Electrical", "El\u00e9ctrico"], lighting: ["Lighting", "Iluminaci\u00f3n"], hvac: ["HVAC", "Calefacci\u00f3n y aire acondicionado"], doors_locks: ["Doors and locks", "Puertas y cerraduras"], leak_water: ["Leak or water", "Fuga o agua"], pests: ["Pests", "Plagas"], elevator: ["Elevator", "Ascensor"], safety: ["Safety", "Seguridad"], other: ["Other", "Otro"] },
    urgency: { routine: ["Routine", "De rutina"], soon: ["Soon", "Pronto"], urgent_safety: ["Urgent, safety", "Urgente, seguridad"] },
    status: { sent: ["Sent", "Enviada"], acknowledged: ["Acknowledged", "Recibida por el edificio"], scheduled: ["Scheduled", "Programada"], fixed: ["Fixed", "Reparada"], closed: ["Closed", "Cerrada"], cancelled: ["Cancelled", "Cancelada"] },
    channel: { phone: ["By phone", "Por tel\u00e9fono"], email: ["By email", "Por correo"], in_person: ["In person", "En persona"] },
    logKind: { response: ["Response received", "Respuesta recibida"], note: ["Note", "Nota"], status: ["Status change", "Cambio de estado"], scheduled: ["Scheduled date", "Fecha programada"], photo: ["Photos", "Fotos"], email: ["Email", "Correo"] },
  };
  const nameIn = (group, key, lang) => (NAMES[group][key] ? T(lang, NAMES[group][key][0], NAMES[group][key][1]) : null);
  const CATEGORIES = Object.keys(NAMES.category);
  const URGENCIES = Object.keys(NAMES.urgency);
  const STATUSES = Object.keys(NAMES.status);
  const MOVES_TO = ["acknowledged", "scheduled", "fixed", "closed", "cancelled"];
  const DONE = ["closed", "cancelled"];
  const RESPONDED = ["acknowledged", "scheduled", "fixed", "closed"];
  const CHANNELS = Object.keys(NAMES.channel);
  const WRITABLE = ["response", "note", "status", "scheduled", "photo"];
  const MAX_PHOTOS = 6;

  // ---- the days -----------------------------------------------------------------------------------
  const TODAY = seed.TODAY;
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const weekday = (day) => new Date(day + "T12:00:00Z").getUTCDay();
  const addWorkingDays = (day, n) => { let d = day; let left = n; while (left > 0) { d = addDays(d, 1); const w = weekday(d); if (w !== 0 && w !== 6) left -= 1; } return d; };
  // A moment on a company day, at an hour of the office's clock (New York is UTC-4 in March 2026).
  const at = (day, hm) => new Date(day + "T" + (hm || "10:00") + ":00-04:00").toISOString();
  const dayOf = (iso) => { const t0 = Date.parse(iso) - 4 * 3600000; return new Date(t0).toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);

  // ---- the model ----------------------------------------------------------------------------------
  const ADMIN = seed.PEOPLE.admin.id;
  const SUP = seed.PEOPLE.supervisor.id;
  const S = seed.SITES;
  function fresh() {
    const contact = (id, siteId, name, company, email, phone, building, primary, active) => ({ id, siteId, name, company, email, phone, building, isPrimary: primary, isActive: active, createdAt: at(addDays(TODAY, -120), "09:00"), updatedAt: at(addDays(TODAY, -120), "09:00") });
    const contacts = [
      contact("mc-1", S[0].id, "Facilities desk", "Property management office", "facilities.desk@example.invalid", "2155550190", "North Wing", true, true),
      contact("mc-2", S[0].id, "Day porter lead", null, "porter.lead@example.invalid", null, null, false, true),
      contact("mc-3", S[0].id, "South Wing engineer", "Property management office", "south.engineer@example.invalid", "2155550191", "South Wing", false, false),
      contact("mc-4", S[1].id, "Clinic maintenance", "Plaza building services", "clinic.maint@example.invalid", "2155550192", null, true, true),
    ];
    const pick = (siteId, building) => recipientsOf(contacts.filter((c) => c.siteId === siteId), building);
    const requests = [];
    const log = [];
    const photos = [];
    let n = 0;
    const add = (o) => {
      n += 1;
      const r = Object.assign({ id: "mr-" + n, reference: "MR-2026-" + String(n).padStart(4, "0"), building: null, floor: null, area: null, issueId: null, firstResponseAt: null, scheduledFor: null, fixedAt: null, closedAt: null, cancelledAt: null, filedBy: ADMIN }, o);
      r.recipients = pick(r.siteId, r.building);
      requests.push(r);
      log.push({ id: "ml-" + r.id + "-mail", requestId: r.id, kind: "email", createdAt: r.filedAt, createdBy: r.filedBy, details: { which: "filed", status: o.mailFailed ? "failed" : "sent", to: r.recipients.map((c) => c.email), cc: "office@example.invalid", photoCount: o.photoCount || 0 } });
      delete r.mailFailed; delete r.photoCount;
      return r;
    };
    const r1 = add({ siteId: S[0].id, building: "North Wing", floor: "2", area: "Restroom 2B", category: "leak_water", urgency: "urgent_safety", description: "Water is leaking under the second sink in restroom 2B and pooling by the door.", status: "sent", filedAt: at(addDays(TODAY, -5), "08:40"), photoCount: 1 });
    photos.push({ id: "mp-1", requestId: r1.id, logId: null, name: "leak-2b.jpg", contentType: "image/png", size: PNG_BYTES.length, createdAt: r1.filedAt });
    const r2 = add({ siteId: S[0].id, building: "South Wing", floor: "1", area: "South corridor", category: "lighting", urgency: "routine", description: "Three ceiling lights are out in the south corridor.", status: "acknowledged", filedAt: at(addDays(TODAY, -9), "14:10"), filedBy: SUP, firstResponseAt: at(addDays(TODAY, -8), "10:05") });
    log.push({ id: "ml-2a", requestId: r2.id, kind: "response", channel: "phone", body: "They will send an electrician this week.", occurredAt: at(addDays(TODAY, -8), "10:05"), createdAt: at(addDays(TODAY, -8), "10:07"), createdBy: SUP });
    log.push({ id: "ml-2b", requestId: r2.id, kind: "status", fromStatus: "sent", toStatus: "acknowledged", createdAt: at(addDays(TODAY, -8), "10:08"), createdBy: SUP });
    const r3 = add({ siteId: S[1].id, building: null, floor: "1", area: "Clinic side door", category: "doors_locks", urgency: "soon", description: "The side door does not latch, so it stays open at night.", status: "scheduled", filedAt: at(addDays(TODAY, -3), "09:15"), firstResponseAt: at(addDays(TODAY, -2), "11:00"), scheduledFor: addDays(TODAY, 2) });
    log.push({ id: "ml-3a", requestId: r3.id, kind: "status", fromStatus: "sent", toStatus: "scheduled", scheduledFor: addDays(TODAY, 2), body: "The locksmith comes Thursday morning.", createdAt: at(addDays(TODAY, -2), "11:00"), createdBy: ADMIN });
    const r4 = add({ siteId: S[0].id, building: "North Wing", floor: "3", area: "Office suite", category: "hvac", urgency: "routine", description: "The office suite is too warm in the afternoon.", status: "fixed", filedAt: at(addDays(TODAY, -40), "13:00"), firstResponseAt: at(addDays(TODAY, -39), "09:00"), fixedAt: at(addDays(TODAY, -35), "15:30") });
    log.push({ id: "ml-4a", requestId: r4.id, kind: "status", fromStatus: "acknowledged", toStatus: "fixed", createdAt: at(addDays(TODAY, -35), "15:30"), createdBy: ADMIN });
    add({ siteId: S[1].id, area: "Staff restroom", category: "plumbing", urgency: "soon", description: "The staff restroom toilet runs all night.", status: "closed", filedAt: at(addDays(TODAY, -60), "10:20"), firstResponseAt: at(addDays(TODAY, -59), "09:30"), fixedAt: at(addDays(TODAY, -55), "12:00"), closedAt: at(addDays(TODAY, -54), "09:00") });
    add({ siteId: S[0].id, building: "South Wing", area: "Loading entrance", category: "pests", urgency: "routine", description: "Signs of mice by the loading entrance.", status: "cancelled", filedAt: at(addDays(TODAY, -20), "16:45"), cancelledAt: at(addDays(TODAY, -19), "08:00") });
    add({ siteId: S[0].id, building: "North Wing", floor: "1", area: "Lobby", category: "electrical", urgency: "soon", description: "The lobby outlet by the front desk sparks when used.", status: "sent", filedAt: at(TODAY, "18:20"), mailFailed: true });
    return { contacts, requests, log, photos, counter: n, contactSeq: contacts.length, logSeq: 0, photoSeq: photos.length, followUps: {}, sent: [], emailFails: false, off: {}, responseDays: 2, oldToken: false, renewRefuse: false, renewed: [], announcements: {}, repeats: [], categoryNewOnly: false };
  }
  const m = () => state.m368 || (state.m368 = fresh());

  function recipientsOf(contacts, building) {
    const same = (a, b) => { const k = (s0) => String(s0 || "").replace(/\s+/g, " ").trim().toLowerCase(); return k(a) !== "" && k(a) === k(b); };
    const active = contacts.filter((c) => c.isActive).sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || a.name.localeCompare(b.name));
    let picked = active;
    if (building && active.some((c) => same(c.building, building))) picked = active.filter((c) => same(c.building, building) || !String(c.building || "").trim());
    const seen = new Set();
    const out = [];
    picked.forEach((c) => { const e = c.email.toLowerCase(); if (seen.has(e)) return; seen.add(e); out.push({ contactId: c.id, name: c.name, company: c.company || null, email: e }); });
    return out;
  }
  const contactsAt = (siteId, all) => m().contacts.filter((c) => c.siteId === String(siteId) && (all || c.isActive))
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0) || (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id.localeCompare(b.id));

  function requestView(r, lang) {
    const filedDay = dayOf(r.filedAt);
    const due = r.status === "sent" && !r.firstResponseAt ? addWorkingDays(filedDay, m().responseDays) : null;
    const s0 = siteOf(r.siteId) || {};
    return {
      id: r.id, reference: r.reference, siteId: r.siteId, siteName: s0.name || null, building: r.building, floor: r.floor, area: r.area,
      category: r.category, categoryName: nameIn("category", r.category, lang), urgency: r.urgency, urgencyName: nameIn("urgency", r.urgency, lang),
      status: r.status, statusName: nameIn("status", r.status, lang), description: r.description, issueId: r.issueId,
      filedAt: r.filedAt, filedBy: { id: r.filedBy, name: nameOfPerson(r.filedBy) }, firstResponseAt: r.firstResponseAt, scheduledFor: r.scheduledFor,
      fixedAt: r.fixedAt, closedAt: r.closedAt, cancelledAt: r.cancelledAt, ageDays: Math.max(0, daysBetween(filedDay, TODAY)),
      responseDueOn: due, noResponse: !!due && TODAY > due, photoCount: m().photos.filter((p) => p.requestId === r.id).length,
    };
  }
  const photoView = (p) => ({ id: p.id, name: p.name, contentType: p.contentType, size: p.size, inEmail: !p.logId, logId: p.logId, createdAt: p.createdAt });
  function detailView(r, lang) {
    const v = requestView(r, lang);
    const log = m().log.filter((l) => l.requestId === r.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const photos = m().photos.filter((p) => p.requestId === r.id);
    const filed = log.filter((l) => l.kind === "email" && l.details.which === "filed");
    const last = filed[filed.length - 1] || null;
    const follow = log.filter((l) => l.kind === "email" && l.details.which === "followUp" && l.details.status === "sent");
    const done = DONE.indexOf(r.status) >= 0;
    const emailStatus = last ? last.details.status : "notSent";
    return Object.assign(v, {
      recipients: r.recipients,
      email: { status: emailStatus, at: last ? last.createdAt : null, to: last ? last.details.to : [], cc: last ? last.details.cc : null },
      followUpCount: follow.length,
      lastFollowUpAt: follow.length ? follow[follow.length - 1].createdAt : null,
      photos: photos.map(photoView),
      log: log.map((l) => ({
        id: l.id, kind: l.kind, kindName: nameIn("logKind", l.kind, lang), channel: l.channel || null, channelName: l.channel ? nameIn("channel", l.channel, lang) : null,
        body: l.body || null, fromStatus: l.fromStatus || null, toStatus: l.toStatus || null, toStatusName: l.toStatus ? nameIn("status", l.toStatus, lang) : null,
        scheduledFor: l.scheduledFor || null, occurredAt: l.occurredAt || l.createdAt, createdAt: l.createdAt, createdBy: l.createdBy ? { id: l.createdBy, name: nameOfPerson(l.createdBy) } : null,
        photos: photos.filter((p) => p.logId === l.id).map(photoView),
        email: l.kind === "email" ? { which: l.details.which, status: l.details.status, to: l.details.to, cc: l.details.cc, photoCount: l.details.photoCount || 0 } : null,
      })),
      allowedStatuses: done ? [] : MOVES_TO.filter((s0) => s0 !== r.status),
      canFollowUp: !done,
      canResend: !done && emailStatus !== "sent",
    });
  }

  // A multipart body as the browser sends it: its text fields by name and every file under photos.
  function multipart(raw) {
    const out = { fields: {}, files: [] };
    String(raw || "").split(/-{2,}[^\r\n]*\r\n/).forEach((part) => {
      const name = /name="([^"]+)"/.exec(part);
      if (!name) return;
      const fileName = /filename="([^"]*)"/.exec(part);
      const type = /Content-Type:\s*([^\r\n]+)/i.exec(part);
      const value = part.split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\r\n$/, "");
      if (fileName) out.files.push({ field: name[1], name: fileName[1], type: type ? type[1].trim() : "", size: value.length });
      else out.fields[name[1]] = value;
    });
    return out;
  }
  const bodyOf = (body) => {
    if (typeof body === "string") { const mp = multipart(body); return { b: mp.fields, files: mp.files.filter((f) => f.field === "photos"), multipart: true }; }
    return { b: body || {}, files: [], multipart: false };
  };
  const text = (v, max, need) => {
    if (v === undefined || v === null) return need ? { bad: true } : { value: null };
    if (typeof v !== "string") return { bad: true };
    const s0 = v.trim();
    if (!s0) return need ? { bad: true } : { value: null };
    return s0.length > max ? { bad: true } : { value: s0 };
  };
  const realDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00Z")) && new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;
  const emailOk = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  function readContact(b, partial) {
    const keys = [];
    const value = {};
    const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
    if (!partial || has("name")) { const r = text(b.name, 200, true); if (r.bad) keys.push("name"); else value.name = r.value; }
    if (!partial || has("email")) { if (!emailOk(b.email)) keys.push("email"); else value.email = b.email.trim().toLowerCase(); }
    [["company", 200], ["phone", 40], ["building", 200]].forEach(([k, max]) => { if (!partial || has(k)) { const r = text(b[k], max, false); if (r.bad) keys.push(k); else value[k] = r.value; } });
    ["isPrimary", "isActive"].forEach((k) => {
      if (has(k)) { if (b[k] === true || b[k] === false) value[k] = b[k]; else keys.push(k); }
      else if (!partial) value[k] = k === "isActive";
    });
    return keys.length ? { keys } : { value };
  }

  // The list's filters, as readFilters reads them; null for a site the reader may not read.
  function filtered(query, withStatus) {
    const keys = [];
    let rows = m().requests.filter((r) => readsSite(r.siteId));
    const siteId = (query.get("siteId") || "").trim();
    if (siteId) { if (!siteOf(siteId)) keys.push("siteId"); else if (!readsSite(siteId)) return { noSite: true }; else rows = rows.filter((r) => r.siteId === siteId); }
    const lists = [["category", CATEGORIES], ["urgency", URGENCIES]];
    if (withStatus) lists.unshift(["status", STATUSES]);
    lists.forEach(([k, allowed]) => {
      const v = query.get(k);
      if (!v) return;
      const list = v.split(",").map((x) => x.trim()).filter(Boolean);
      if (!list.length || !list.every((x) => allowed.indexOf(x) >= 0)) { keys.push(k); return; }
      rows = rows.filter((r) => list.indexOf(r[k]) >= 0);
    });
    const issueId = (query.get("issueId") || "").trim();
    if (issueId) rows = rows.filter((r) => r.issueId === issueId);
    const int = (k) => { const v = query.get(k); if (v === null || v === "") return { value: null }; if (!/^\d+$/.test(v) || Number(v) > 3650) return { bad: true }; return { value: Number(v) }; };
    const minAge = int("minAgeDays"); const maxAge = int("maxAgeDays");
    if (minAge.bad) keys.push("minAgeDays");
    if (maxAge.bad) keys.push("maxAgeDays");
    if (!minAge.bad && !maxAge.bad && minAge.value !== null && maxAge.value !== null && minAge.value > maxAge.value) keys.push("maxAgeDays");
    if (!minAge.bad && minAge.value !== null) rows = rows.filter((r) => daysBetween(dayOf(r.filedAt), TODAY) >= minAge.value);
    if (!maxAge.bad && maxAge.value !== null) rows = rows.filter((r) => daysBetween(dayOf(r.filedAt), TODAY) <= maxAge.value);
    return keys.length ? { keys } : { rows };
  }
  const cursorOf = (r) => Buffer.from(JSON.stringify([r.filedAt, r.id]), "utf8").toString("base64url");
  const order = (a, b) => b.filedAt.localeCompare(a.filedAt) || b.id.localeCompare(a.id, undefined, { numeric: true });

  // The email of a filing or a follow-up: the log's email entry, unless it is a follow-up again that day.
  function mail(r, which, to) {
    const fails = m().emailFails;
    const entry = { id: "ml-" + (++m().logSeq) + "-mail", requestId: r.id, kind: "email", createdAt: new Date(Date.parse(seed.NOW_ISO) + m().logSeq * 1000).toISOString(), createdBy: me().id, details: { which, status: fails ? "failed" : "sent", to: to.map((c) => c.email), cc: "office@example.invalid", photoCount: m().photos.filter((p) => p.requestId === r.id && !p.logId).length } };
    m().log.push(entry);
    m().sent.push({ which, reference: r.reference, to: entry.details.to, status: entry.details.status });
    return { status: entry.details.status, sentMessageId: fails ? null : "sm-" + m().logSeq, to: entry.details.to, cc: entry.details.cc, at: entry.createdAt };
  }
  const warningOf = (email, lang) => (email.status === "sent" ? {} : { warning: { code: "maintenance.emailNotSent", message: say(lang, "maintenance.emailNotSent") } });
  const issuesNow = () => state.issues || seed.ISSUES;

  function maintenanceRoute(method, path, query, body, lang, base) {
    // ---- contacts ----
    const ct = /^\/api\/sites\/([^/]+)\/maintenance-contacts(?:\/([^/]+))?$/.exec(path);
    if (ct) {
      const siteId = decodeURIComponent(ct[1]);
      if (!siteOf(siteId)) return refuse(lang, 404, "sites.notFound");
      if (!ct[2] && method === "GET") {
        if (!can("manage_sites") && !can("file_maintenance_requests")) return noCap(lang, "file_maintenance_requests");
        if (!can("manage_sites") && !readsSite(siteId)) return refuse(lang, 403, "access.noSiteAccess");
        return ok({ contacts: clone(contactsAt(siteId, query.get("includeInactive") === "true")) });
      }
      if (!can("manage_sites")) return noCap(lang, "manage_sites");
      const b = body && typeof body === "object" ? body : {};
      if (!ct[2] && method === "POST") {
        const r = readContact(b, false);
        if (r.keys) return refuse(lang, 400, "maintenance.badDetails", null, { keys: r.keys });
        const c = Object.assign({ id: "mc-" + (++m().contactSeq), siteId, createdAt: seed.NOW_ISO, updatedAt: seed.NOW_ISO }, r.value);
        m().contacts.push(c);
        m().sent.push({ contact: "added", body: clone(b) });
        return { status: 201, json: { contact: clone(c) } };
      }
      if (ct[2] && method === "PATCH") {
        const r = readContact(b, true);
        if (r.keys) return refuse(lang, 400, "maintenance.badDetails", null, { keys: r.keys });
        const c = m().contacts.find((x) => x.id === decodeURIComponent(ct[2]) && x.siteId === siteId);
        if (!c) return refuse(lang, 404, "maintenance.contactNotFound");
        Object.assign(c, r.value, { updatedAt: seed.NOW_ISO });
        m().sent.push({ contact: c.id, body: clone(b) });
        return ok({ contact: clone(c) });
      }
      return null;
    }
    if (!/^\/api\/maintenance-requests(\/|$)/.test(path)) return null;
    if (!can("file_maintenance_requests")) return noCap(lang, "file_maintenance_requests");
    if (path === "/api/maintenance-requests/options" && method === "GET") {
      const named = (group, keys) => keys.map((k) => ({ key: k, name: nameIn(group, k, lang) }));
      return ok({ categories: named("category", CATEGORIES), urgencies: named("urgency", URGENCIES), statuses: named("status", STATUSES), channels: named("channel", CHANNELS), logKinds: named("logKind", WRITABLE), maxPhotos: MAX_PHOTOS, responseDays: m().responseDays });
    }
    if (path === "/api/maintenance-requests/summary" && method === "GET") {
      const f = filtered(query, false);
      if (f.noSite) return refuse(lang, 403, "access.noSiteAccess");
      if (f.keys) return refuse(lang, 400, "maintenance.badFilter", null, { keys: f.keys });
      const counts = {}; STATUSES.forEach((s0) => { counts[s0] = 0; });
      f.rows.forEach((r) => { counts[r.status] += 1; });
      const fixed = f.rows.filter((r) => r.fixedAt).map((r) => (Date.parse(r.fixedAt) - Date.parse(r.filedAt)) / 86400000).sort((a, b) => a - b);
      const median = fixed.length ? (fixed.length % 2 ? fixed[(fixed.length - 1) / 2] : (fixed[fixed.length / 2 - 1] + fixed[fixed.length / 2]) / 2) : null;
      return ok({ counts, total: f.rows.length, fixed: { count: fixed.length, medianDays: median === null ? null : Math.round(median * 10) / 10 } });
    }
    const fi = /^\/api\/maintenance-requests\/from-issue\/([^/]+)$/.exec(path);
    if (fi && method === "GET") {
      const iss = issuesNow().find((x) => x.id === decodeURIComponent(fi[1]));
      if (!iss || !readsSite(iss.site_id)) return refuse(lang, 404, "issues.notFound");
      const held = m().requests.filter((r) => r.issueId === iss.id && r.status !== "cancelled").sort(order)[0] || null;
      const photos = (m().issuePhotos || {})[iss.id] || [];
      return ok({
        prefill: { issueId: iss.id, siteId: iss.site_id, siteName: (siteOf(iss.site_id) || {}).name || null, building: null, floor: null, area: iss.zone || null, category: null, urgency: null, description: [iss.title, iss.description].filter(Boolean).join("\n\n") },
        issuePhotos: clone(photos), contacts: clone(contactsAt(iss.site_id, false)),
        existing: held ? { id: held.id, reference: held.reference, status: held.status, statusName: nameIn("status", held.status, lang) } : null,
      });
    }
    if (path === "/api/maintenance-requests" && method === "GET") {
      const f = filtered(query, true);
      if (f.noSite) return refuse(lang, 403, "access.noSiteAccess");
      const keys = f.keys ? f.keys.slice() : [];
      const lim = query.get("limit");
      if (lim !== null && lim !== "" && (!/^\d+$/.test(lim) || Number(lim) < 1 || Number(lim) > 100)) keys.push("limit");
      const limit = lim ? Number(lim) : 50;
      let rows = f.rows ? f.rows.slice().sort(order) : [];
      const raw = (query.get("cursor") || "").trim();
      if (raw) {
        let c = null;
        try { c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")); } catch (e) { c = null; }
        if (!Array.isArray(c) || c.length !== 2) keys.push("cursor");
        else rows = rows.filter((r) => r.filedAt < c[0] || (r.filedAt === c[0] && r.id.localeCompare(c[1], undefined, { numeric: true }) < 0));
      }
      if (keys.length) return refuse(lang, 400, "maintenance.badFilter", null, { keys });
      const page = rows.slice(0, limit);
      return ok({ requests: page.map((r) => requestView(r, lang)), nextCursor: rows.length > limit ? cursorOf(page[page.length - 1]) : null });
    }
    if (path === "/api/maintenance-requests" && method === "POST") {
      const { b, files } = bodyOf(body);
      const keys = [];
      const v = {};
      ["building", "floor", "area"].forEach((k) => { const r = text(b[k], k === "floor" ? 100 : 200, false); if (r.bad) keys.push(k); else v[k] = r.value; });
      if (CATEGORIES.indexOf(b.category) < 0) keys.push("category"); else v.category = b.category;
      if (URGENCIES.indexOf(b.urgency) < 0) keys.push("urgency"); else v.urgency = b.urgency;
      const d = text(b.description, 4000, true); if (d.bad) keys.push("description"); else v.description = d.value;
      const issueId = b.issueId ? String(b.issueId) : null;
      const photoIds = Array.isArray(b.issuePhotoIds) ? b.issuePhotoIds.map(String) : typeof b.issuePhotoIds === "string" && b.issuePhotoIds ? b.issuePhotoIds.split(",").map((x) => x.trim()).filter(Boolean) : [];
      if (photoIds.length && !issueId) keys.push("issuePhotoIds");
      if (keys.length) return refuse(lang, 400, "maintenance.badDetails", null, { keys });
      let siteId = b.siteId ? String(b.siteId) : null;
      let iss = null;
      if (issueId) {
        iss = issuesNow().find((x) => x.id === issueId);
        if (!iss) return refuse(lang, 404, "issues.notFound");
        if (siteId && siteId !== iss.site_id) return refuse(lang, 400, "maintenance.badDetails", null, { keys: ["issueId"] });
        siteId = iss.site_id;
      }
      if (!siteId) return refuse(lang, 400, "maintenance.badDetails", null, { keys: ["siteId"] });
      if (!siteOf(siteId)) return refuse(lang, 404, "sites.notFound");
      if (!readsSite(siteId)) return refuse(lang, 403, "access.noSiteAccess");
      if (iss) {
        const held = m().requests.filter((r) => r.issueId === iss.id && r.status !== "cancelled")[0];
        if (held) return refuse(lang, 409, "maintenance.issueAlreadySent", { reference: held.reference }, { requestId: held.id, reference: held.reference });
      }
      const to = recipientsOf(m().contacts.filter((c) => c.siteId === siteId), v.building);
      if (!to.length) return refuse(lang, 409, "maintenance.noContact", null, { siteId });
      const known = (m().issuePhotos || {})[issueId] || [];
      if (photoIds.some((pid) => !known.some((p) => p.id === pid))) return refuse(lang, 400, "maintenance.badDetails", null, { keys: ["issuePhotoIds"] });
      if (files.length + photoIds.length > MAX_PHOTOS) return refuse(lang, 400, "maintenance.photoLimit", { max: MAX_PHOTOS }, { max: MAX_PHOTOS });
      m().counter += 1;
      const r = Object.assign({ id: "mr-" + m().counter, reference: "MR-2026-" + String(m().counter).padStart(4, "0"), siteId, issueId: iss ? iss.id : null, status: "sent", recipients: to, filedBy: me().id, filedAt: seed.NOW_ISO, firstResponseAt: null, scheduledFor: null, fixedAt: null, closedAt: null, cancelledAt: null }, v);
      m().requests.push(r);
      files.concat(photoIds.map((pid) => ({ name: "issue-photo.jpg", fromIssue: pid }))).forEach((f) => { m().photos.push({ id: "mp-" + (++m().photoSeq), requestId: r.id, logId: null, name: f.name || "photo.jpg", contentType: "image/jpeg", size: f.size || 100, createdAt: seed.NOW_ISO }); });
      m().sent.push({ filed: r.reference, body: clone(b), files: files.length, multipart: typeof body === "string" });
      const email = mail(r, "filed", to);
      return { status: 201, json: Object.assign({ request: detailView(r, lang), email }, warningOf(email, lang)) };
    }
    const one = /^\/api\/maintenance-requests\/([^/]+)(?:\/(log|follow-up|resend|photos\/([^/]+)))?$/.exec(path);
    if (!one) return null;
    const r = m().requests.find((x) => x.id === decodeURIComponent(one[1]));
    if (!r || !readsSite(r.siteId)) return refuse(lang, 404, "maintenance.notFound");
    if (!one[2] && method === "GET") return ok({ request: detailView(r, lang) });
    if (one[3] && method === "GET") {
      const p = m().photos.find((x) => x.id === decodeURIComponent(one[3]) && x.requestId === r.id);
      if (!p) return refuse(lang, 404, "forms.photoNotFound");
      return { status: 200, bytes: PNG_BYTES, contentType: "image/png", headers: { "Cache-Control": "private, no-store" } };
    }
    if (one[2] === "log" && method === "POST") {
      const { b, files } = bodyOf(body);
      const kind = b.kind;
      if (WRITABLE.indexOf(kind) < 0) return refuse(lang, 400, "maintenance.badDetails", null, { keys: ["kind"] });
      const keys = [];
      const v = { kind };
      const t0 = text(b.body, 4000, kind === "note"); if (t0.bad) keys.push("body"); else v.body = t0.value;
      if (kind === "response") { if (CHANNELS.indexOf(b.channel) < 0) keys.push("channel"); else v.channel = b.channel; }
      if (kind === "status") { if (MOVES_TO.indexOf(b.status) < 0) keys.push("status"); else v.status = b.status; }
      if (kind === "scheduled" || (kind === "status" && b.scheduledFor)) { if (!realDay(b.scheduledFor) || (kind === "status" && b.status !== "scheduled")) keys.push("scheduledFor"); else v.scheduledFor = b.scheduledFor; }
      if (keys.length) return refuse(lang, 400, "maintenance.badDetails", null, { keys });
      if ((kind === "status" || kind === "scheduled") && DONE.indexOf(r.status) >= 0) return refuse(lang, 409, "maintenance.requestDone", null, { status: r.status });
      if (kind === "photo") {
        if (!files.length) return refuse(lang, 400, "forms.photoNoFile");
        if (files.length > MAX_PHOTOS) return refuse(lang, 400, "maintenance.photoLimit", { max: MAX_PHOTOS }, { max: MAX_PHOTOS });
      }
      if (kind === "status" && r.status === v.status) {
        if (!v.scheduledFor) { m().sent.push({ log: r.reference, body: clone(b), unchanged: true }); return ok({ entry: null, unchanged: true, request: detailView(r, lang) }); }
        v.kind = "scheduled";
      }
      const entry = { id: "ml-" + (++m().logSeq), requestId: r.id, kind: v.kind, channel: v.channel || null, body: v.body || null, createdAt: new Date(Date.parse(seed.NOW_ISO) + m().logSeq * 1000).toISOString(), createdBy: me().id, details: {} };
      if (v.kind === "status") {
        entry.fromStatus = r.status; entry.toStatus = v.status;
        r.status = v.status;
        if (v.status === "fixed") r.fixedAt = entry.createdAt; else if (v.status === "acknowledged" || v.status === "scheduled") r.fixedAt = null;
        if (v.status === "closed") r.closedAt = entry.createdAt;
        if (v.status === "cancelled") r.cancelledAt = entry.createdAt;
        if (RESPONDED.indexOf(v.status) >= 0 && !r.firstResponseAt) r.firstResponseAt = entry.createdAt;
      }
      if (v.scheduledFor) { entry.scheduledFor = v.scheduledFor; r.scheduledFor = v.scheduledFor; if (!r.firstResponseAt) r.firstResponseAt = entry.createdAt; }
      if (v.kind === "response" && !r.firstResponseAt) r.firstResponseAt = entry.createdAt;
      m().log.push(entry);
      files.forEach((f) => { m().photos.push({ id: "mp-" + (++m().photoSeq), requestId: r.id, logId: entry.id, name: f.name || "photo.jpg", contentType: "image/jpeg", size: f.size || 100, createdAt: entry.createdAt }); });
      m().sent.push({ log: r.reference, body: clone(b), files: files.length, multipart: typeof body === "string" });
      const request = detailView(r, lang);
      return { status: 201, json: { entry: request.log.find((e) => e.id === entry.id) || null, unchanged: false, request } };
    }
    if ((one[2] === "follow-up" || one[2] === "resend") && method === "POST") {
      if (DONE.indexOf(r.status) >= 0) return refuse(lang, 409, "maintenance.requestDone", null, { status: r.status });
      const which = one[2] === "follow-up" ? "followUp" : "filed";
      if (which === "filed" && detailView(r, lang).email.status === "sent") return refuse(lang, 409, "maintenance.alreadySent");
      const to = recipientsOf(m().contacts.filter((c) => c.siteId === r.siteId && r.recipients.some((x) => x.contactId === c.id)), null);
      const list = to.length ? to : recipientsOf(m().contacts.filter((c) => c.siteId === r.siteId), r.building);
      if (!list.length) return refuse(lang, 409, "maintenance.noContact", null, { siteId: r.siteId });
      if (which === "followUp") {
        const k = r.id + ":" + TODAY;
        if (m().followUps[k]) return refuse(lang, 409, "maintenance.followUpSentToday");
        m().followUps[k] = true;
      }
      const email = mail(r, which, list);
      return ok(Object.assign({ request: detailView(r, lang), email }, warningOf(email, lang)));
    }
    return null;
  }

  // GET /api/issues/:id carries maintenanceRequests (routes/issues.js, linksForIssue), and the settings
  // carry maintenance_response_days.
  function besideRoute(method, path, query, body, lang, base) {
    // This person's own capabilities name the two part 365 added, as middleware/capabilities.js does.
    if (path === "/api/users/me/permissions" && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.capabilities && typeof a.json.capabilities === "object") a.json = Object.assign({}, a.json, { capabilities: Object.assign({}, a.json.capabilities, { file_maintenance_requests: can("file_maintenance_requests"), manage_leave_balances: can("manage_leave_balances") }) });
      return a;
    }
    const iss = /^\/api\/issues\/([^/]+)$/.exec(path);
    if (iss && method === "GET" && iss[1] !== "requests") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.issue) {
        const id = decodeURIComponent(iss[1]);
        a.json = Object.assign({}, a.json, { issue: Object.assign({}, a.json.issue, { maintenanceRequests: m().requests.filter((r) => r.issueId === id).sort(order).map((r) => ({ id: r.id, reference: r.reference, status: r.status, statusName: nameIn("status", r.status, lang), filedAt: r.filedAt })) }) });
      }
      return a;
    }
    if (path === "/api/settings" && method === "GET") {
      const a = base();
      // checklistDayStartsAt is on every answer since the API's part 363 (04:00 unless the owner sets
      // another); the checklist layer under this one answers a case's own.
      if (a && a.status === 200 && a.json && typeof a.json === "object") a.json = Object.assign({ checklistDayStartsAt: "04:00", updated_at: round6.stamp }, a.json, { maintenance_response_days: m().responseDays });
      return a;
    }
    if (path === "/api/settings" && (method === "PATCH" || method === "PUT")) {
      const b = body && typeof body === "object" ? body : {};
      if (Object.prototype.hasOwnProperty.call(b, "maintenance_response_days")) {
        const n = Number(b.maintenance_response_days);
        if (!Number.isInteger(n) || n < 1 || n > 30) return refuse(lang, 400, "settings.maintenanceDaysWhole", null, { keys: ["maintenance_response_days"] });
        m().responseDays = n;
        m().sent.push({ settings: n });
      }
      const a = base();
      if (a && a.status === 200 && a.json && typeof a.json === "object") a.json = Object.assign({}, a.json, { maintenance_response_days: m().responseDays });
      return a;
    }
    // The session renewed (the API's part 363, routes/auth.js POST /api/auth/renew), once a case dates
    // the session with oldToken: sign-in answers a token made two hours ago, shaped as the API's are,
    // and a renewal answers one made now, or 401 auth.tokenExpired once a case sets renewRefuse.
    const x = m();
    if (path === "/api/auth/login" && method === "POST" && x.oldToken) {
      const a = base();
      if (a && a.status === 200 && a.json && typeof a.json.token === "string") a.json = Object.assign({}, a.json, { token: madeToken(-2 * 3600) });
      return a;
    }
    if (path === "/api/auth/renew" && method === "POST") {
      if (x.renewRefuse) return bad(401, "auth.tokenExpired", T(lang, "Token expired", "Su sesi\u00f3n venci\u00f3"));
      const tok = madeToken(0);
      x.renewed.push(tok);
      return ok({ token: tok });
    }
    return null;
  }
  // A token shaped as the API makes one (a header, a payload with userId, role, tv, iat and exp, and a
  // signature), made seconds from the run's now; the stub reads no token, only that one was sent.
  const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  let tokenSeq = 0;
  const madeToken = (offset) => {
    const iat = Math.floor(Date.parse(seed.NOW_ISO) / 1000) + offset;
    tokenSeq += 1;
    const p = me() || {};
    return b64url({ alg: "HS256", typ: "JWT" }) + "." + b64url({ userId: p.id || "u", role: p.role || "admin", tv: 0, iat, exp: iat + 12 * 3600, n: tokenSeq }) + ".audit-signature-" + tokenSeq;
  };

  const round6 = require("./part368-round6")({ seed, state, ok, clone, person, can, userProfile });
  // Leave balances, in audit/part368-leave.js.
  const leave = require("./part368-leave")({ seed, state, ok, clone, person, can, readsSite });

  // Round 6 beside the rest (the API's part 365): an announcement's clientId (API-108), answered once and
  // a repeat from the same sender with the first announcement, nothing sent again.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function round6Route(method, path, query, body, lang, base) {
    const x = m();
    if (path === "/api/announcements" && method === "POST" && body && body.clientId !== undefined) {
      const p = me() || {};
      if (typeof body.clientId !== "string" || !UUID.test(body.clientId)) return bad(400, "announcements.clientIdInvalid", T(lang, "clientId must be the id this screen made for this announcement", "clientId debe ser el identificador que esta pantalla cre\u00f3 para este anuncio"), { keys: ["clientId"] });
      const was = x.announcements[body.clientId];
      if (was && was.by === p.id) { x.repeats.push(body.clientId); return ok(was.json); }
      if (was) return bad(400, "announcements.clientIdInvalid", T(lang, "clientId must be the id this screen made for this announcement", "clientId debe ser el identificador que esta pantalla cre\u00f3 para este anuncio"), { keys: ["clientId"] });
      const a = base();
      if (a && (a.status === 200 || a.status === 201) && a.json) x.announcements[body.clientId] = { by: p.id, json: a.json };
      return a;
    }
    return null;
  }
  // The service category (API-99): every answer that carries the column carries it as serviceCategory
  // beside the key it had before, as helpers/serviceCategory.js answered does; once a case sets
  // categoryNewOnly, under serviceCategory alone, as the API will answer once the old keys are dropped.
  const OLD_CATEGORY = ["cims_category", "item_cims_category", "cimsCategory"];
  const OLD_CATEGORY_RE = /"(cims_category|item_cims_category|cimsCategory)"/;
  function withCategory(v, newOnly, depth) {
    if (depth > 10 || !v || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map((y) => withCategory(y, newOnly, depth + 1));
    const oldKey = OLD_CATEGORY.find((k) => Object.prototype.hasOwnProperty.call(v, k));
    const out = {};
    Object.keys(v).forEach((k) => {
      if (newOnly && OLD_CATEGORY.indexOf(k) >= 0) return;
      out[k] = withCategory(v[k], newOnly, depth + 1);
      if (k === oldKey && !Object.prototype.hasOwnProperty.call(v, "serviceCategory")) out.serviceCategory = v[k];
    });
    if (newOnly && oldKey && out.serviceCategory === undefined) out.serviceCategory = v[oldKey];
    return out;
  }

  function route(method, path, query, body, lang, base) {
    const a = routeOf(method, path, query, body, lang, base);
    if (method === "GET" && a && a.json && typeof a.json === "object" && OLD_CATEGORY_RE.test(JSON.stringify(a.json))) {
      return Object.assign({}, a, { json: withCategory(a.json, !!m().categoryNewOnly, 0) });
    }
    return a;
  }
  // Round 6's paging and saves that see a change made since, in audit/part368-round6.js.
  function routeOf(method, path, query, body, lang, base) {
    const r6p = round6.route(method, path, query, body, lang, base);
    if (r6p) return r6p;
    const lv = leave.route(method, path, query, body, lang, base);
    if (lv) return lv;
    const out = maintenanceRoute(method, path, query, body, lang, base);
    if (out) return out;
    const r6 = round6Route(method, path, query, body, lang, base);
    if (r6) return r6;
    const beside = besideRoute(method, path, query, body, lang, base);
    if (beside) return beside;
    return base();
  }

  // The scenes a case sets: emailFails makes the next emails fail; many adds 60 older requests at the
  // first site, so the list pages; off takes a capability away from a person; issuePhotos gives an issue
  // its photos, as GET /api/maintenance-requests/from-issue answers them.
  function setScene(o) {
    leave.setScene(o);
    round6.setScene(o);
    const x = m();
    if (o.emailFails !== undefined) x.emailFails = !!o.emailFails;
    if (o.off) x.off = Object.assign({}, x.off, o.off);
    if (o.issuePhotos) x.issuePhotos = Object.assign({}, x.issuePhotos || {}, o.issuePhotos);
    if (o.noContactsAt) x.contacts = x.contacts.filter((c) => c.siteId !== o.noContactsAt);
    if (o.oldToken !== undefined) x.oldToken = !!o.oldToken;
    if (o.categoryNewOnly !== undefined) x.categoryNewOnly = !!o.categoryNewOnly;
    if (o.renewRefuse !== undefined) x.renewRefuse = !!o.renewRefuse;
    if (o.many) {
      for (let i = 0; i < 60; i += 1) {
        x.counter += 1;
        const day = addDays(TODAY, -(10 + i));
        x.requests.push({ id: "mr-" + x.counter, reference: "MR-2026-" + String(x.counter).padStart(4, "0"), siteId: S[0].id, building: i % 2 ? "North Wing" : "South Wing", floor: String(1 + (i % 3)), area: "Room " + (100 + i), issueId: null, category: CATEGORIES[i % CATEGORIES.length], urgency: URGENCIES[i % URGENCIES.length], description: "Older request number " + (i + 1) + " for the paging check.", status: i % 3 ? "closed" : "fixed", recipients: recipientsOf(x.contacts.filter((c) => c.siteId === S[0].id), null), filedBy: ADMIN, filedAt: at(day, "11:00"), firstResponseAt: at(addDays(day, 1), "09:00"), scheduledFor: null, fixedAt: at(addDays(day, 3), "10:00"), closedAt: i % 3 ? at(addDays(day, 4), "10:00") : null, cancelledAt: null });
      }
    }
  }

  return {
    route,
    setScene,
    sent: () => (state.m368 ? state.m368.sent : []).concat(leave.sent()),
    model: () => m(),
    sinceRefused: (p) => round6.sinceRefused(p),
    leaveModel: () => leave.model(),
    reset: () => { state.m368 = null; leave.reset(); round6.reset(); },
  };
};
