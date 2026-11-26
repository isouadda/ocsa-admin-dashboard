// What the dashboard's part 420 (Round 15) needs of the stub: the routes it calls answered with the shapes the brief
// names for the API's Round 23 (part 419), and the API's words in English and Spanish as stand-ins. audit/stubs.js lays
// it over the part413 stub and every layer under it. Every answer it adds or changes is given only under the scene
// round23, which the part420 suite and the guide's pictures arm, so the older suites read the stub as they always have.
//
//   Section 1, every people dropdown is the searchable picker (routes/jotform.js):
//     GET   /api/jotform/users-for-linking     the active people, each { id, first_name, last_name, email, role,
//                                              employee_id, badge_number }, by last name; two of them share a first
//                                              and last name apart from a suffix (sameName)
//     PATCH /api/jotform/submissions/:id/user  { user_id } -> { success, aliases_recorded }; the submission's detail
//                                              and the inbox's row then read the person linked
//     POST  /api/jotform/user-aliases          kept in sent(), then answered as the layers under it answer
//
//   Section 2, Link to Record without an id (routes/jotform.js):
//     POST  /api/jotform/submissions/:id/link  { entity_type, entity_id } -> { success }; 404 "Target entity not found"
//                                              for a record named in the scene removed (taken away after the list
//                                              was read); the submission then reads linked_entity_type and
//                                              linked_entity_id
//     DELETE /api/jotform/submissions/:id/link the link taken off
//     The lists the window reads (documents, training, onboarding, inspections, issues, assigned tasks, the
//     schedule's calendar, pickups) are answered by the layers under this one, as they always were.
//
//   Section 3, the OCSA ID (routes/users.js, helpers/ocsaId.js):
//     POST  /api/users                         with no employeeId (or an empty one) the next OCSA ID is given; a typed
//                                              one somebody holds is refused 409 users.employeeIdTaken in the API's
//                                              words; the answer carries employeeId, top level and on user
//     POST  /api/users/:id/approve             gives a person with none the next OCSA ID, answered as employeeId
//     POST  /api/users/:id/employment/return and /rehire   the same
//     PATCH /api/users/:id                     { employeeId } kept on the person; a number another person holds refused
//                                              409 users.employeeIdTakenByOther. An empty or null employeeId reads as
//                                              "give me the next": an active staff account keeps the one it holds, or is
//                                              given the next when it holds none, and only an inactive, test or client
//                                              account is cleared (ocsa-api main be30fb1, as the owner read it)
//     Numbers are given from OCSA-0151 up and never given twice.
//   Scenes: round23 (everything above), sameName (false leaves the two who share a name out), removed (the ids of records
//   taken away after the list was read), noIdFor (the people who hold no OCSA ID yet).
//
// Every value is invented: the people, their numbers and badges.
"use strict";

module.exports = (ctx) => {
  const { state, clone } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], linkedUser: {}, linkedRecord: {}, next: 151 };
    return model;
  };
  const sc = () => m().scene;
  const sent = (what, body) => { m().sent.push({ what, body: clone(body === undefined ? null : body) }); };

  // Two active people with one first and last name, one of them Jr, each with an OCSA ID and a badge of their own.
  const SAME_NAME = [
    { id: "u-same-1", first_name: "Alder", last_name: "Quillfeather", email: "alder.q1@example.invalid", role: "custodial_laborer", employee_id: "OCSA-0311", badge_number: "4471", status: "active" },
    { id: "u-same-2", first_name: "Alder", last_name: "Quillfeather Jr", email: "alder.q2@example.invalid", role: "custodial_laborer", employee_id: "OCSA-0368", badge_number: "4519", status: "active" },
  ];
  const linkable = () => (state.staff || []).filter((s) => s && s.status === "active" && s.role !== "client_contact")
    .map((s) => ({ id: s.id, first_name: s.first_name || s.firstName || "", last_name: s.last_name || s.lastName || "", email: s.email || null, role: s.role, employee_id: s.employee_id || s.employeeId || null, badge_number: s.badge_number || s.badgeNumber || null }))
    .concat(sc().sameName === false ? [] : SAME_NAME.map((p) => clone(p)))
    .sort((a, b) => (a.last_name + " " + a.first_name).localeCompare(b.last_name + " " + b.first_name));
  const personById = (id) => linkable().find((p) => String(p.id) === String(id)) || null;

  // The OCSA IDs: who holds a number, and the next number to give.
  const idOf = (u) => String((u && (u.employee_id || u.employeeId)) || "").trim();
  const holder = (num, except) => (state.staff || []).find((u) => u && u.id !== except && idOf(u).toLowerCase() === String(num).trim().toLowerCase()) || null;
  const nextId = () => { let n; do { n = "OCSA-" + String(m().next).padStart(4, "0"); m().next += 1; } while (holder(n)); return n; };
  const keep = (u, num) => { u.employee_id = num; u.employeeId = num; };
  const TAKEN = (lang) => ({ status: 409, json: { error: T(lang, "That OCSA ID is already given to someone else.", "Ese ID de OCSA ya est\u00e1 asignado a otra persona."), code: "users.employeeIdTaken" } });
  const TAKEN_BY_OTHER = (lang) => ({ status: 409, json: { error: T(lang, "Another person already holds that OCSA ID.", "Otra persona ya tiene ese ID de OCSA."), code: "users.employeeIdTakenByOther" } });
  const staffOf = (id) => (state.staff || []).find((u) => u && u.id === id) || null;

  // A submission's row as the reads answer it once someone has linked it here.
  const withLinks = (row) => {
    if (!row || typeof row !== "object") return row;
    let out = row;
    if (Object.prototype.hasOwnProperty.call(m().linkedUser, row.id)) {
      const uid = m().linkedUser[row.id];
      const p = uid ? personById(uid) : null;
      out = Object.assign({}, out, { user_id: p ? p.id : null, first_name: p ? p.first_name : null, last_name: p ? p.last_name : null, user_employee_id: p ? p.employee_id : null });
    }
    if (Object.prototype.hasOwnProperty.call(m().linkedRecord, row.id)) {
      const r = m().linkedRecord[row.id];
      out = Object.assign({}, out, { linked_entity_type: r ? r.entity_type : null, linked_entity_id: r ? r.entity_id : null, linked_at: r ? "2026-03-18T01:30:00.000Z" : null });
    }
    return out;
  };

  function route(method, path, query, body, said, base) {
    if (!sc().round23) return base();
    const lang = said;
    const b = body || {};
    // The scene noIdFor names people who hold no OCSA ID yet, for the approve and the rehire to give one.
    if (sc().noIdFor && !m().cleared) { m().cleared = true; sc().noIdFor.forEach((x) => { const u = staffOf(x); if (u) keep(u, null); }); }

    if (path === "/api/jotform/users-for-linking" && method === "GET") return { status: 200, json: linkable() };

    const userLink = /^\/api\/jotform\/submissions\/([^/]+)\/user$/.exec(path);
    if (userLink && method === "PATCH") {
      const id = decodeURIComponent(userLink[1]);
      sent("linkUser", { id, body: b });
      if (b.user_id && !personById(b.user_id)) return { status: 404, json: { error: T(lang, "User not found", "No se encontró el usuario"), code: "common.userNotFound" } };
      m().linkedUser[id] = b.user_id || null;
      return { status: 200, json: { success: true, aliases_recorded: b.user_id ? { name: "added", email: "skipped" } : null } };
    }
    if (path === "/api/jotform/user-aliases" && method === "POST") sent("alias", b);

    if (path === "/api/users" && method === "POST") {
      const typed = String(b.employeeId == null ? "" : b.employeeId).trim();
      sent("create", b);
      if (typed && holder(typed)) return TAKEN(lang);
      const a = base();
      if (!a || a.status !== 201 || !a.json || !a.json.user) return a;
      const num = typed || nextId();
      const u = staffOf(a.json.user.id);
      if (u) keep(u, num);
      return { status: 201, json: Object.assign({}, a.json, { employeeId: num, user: Object.assign({}, a.json.user, { employeeId: num, employee_id: num }) }) };
    }
    const gives = /^\/api\/users\/([^/]+)\/(approve|employment\/return|employment\/rehire)$/.exec(path);
    if (gives && method === "POST") {
      const u = staffOf(decodeURIComponent(gives[1]));
      const a = base();
      if (!a || a.status >= 300 || !u) return a;
      sent(gives[2], { id: u.id });
      if (!idOf(u)) keep(u, nextId());
      return Object.assign({}, a, { json: Object.assign({}, a.json || {}, { employeeId: idOf(u) }) });
    }
    const one = /^\/api\/users\/([^/]+)$/.exec(path);
    if (one && (method === "PATCH" || method === "PUT") && Object.prototype.hasOwnProperty.call(b, "employeeId")) {
      const u = staffOf(decodeURIComponent(one[1]));
      sent("patch", { id: u ? u.id : one[1], body: b });
      const typed = String(b.employeeId == null ? "" : b.employeeId).trim();
      if (u && typed && holder(typed, u.id)) return TAKEN_BY_OTHER(lang);
      const a = base();
      if (a && a.status < 300 && u) {
        const staffActive = u.status === "active" && u.role !== "client_contact" && !u.isTestAccount && !u.is_test_account;
        keep(u, typed || (staffActive ? (idOf(u) || nextId()) : null));
      }
      return a;
    }

    const recordLink = /^\/api\/jotform\/submissions\/([^/]+)\/link$/.exec(path);
    if (recordLink && method === "POST") {
      const id = decodeURIComponent(recordLink[1]);
      sent("linkRecord", { id, body: b });
      if (!b.entity_type || !b.entity_id) return { status: 400, json: { error: T(lang, "entity_type and entity_id are required", "Se requieren entity_type y entity_id") } };
      if ((sc().removed || []).indexOf(String(b.entity_id)) >= 0) return { status: 404, json: { error: "Target entity not found" } };
      m().linkedRecord[id] = { entity_type: b.entity_type, entity_id: String(b.entity_id) };
      return { status: 200, json: { success: true } };
    }
    if (recordLink && method === "DELETE") {
      m().linkedRecord[decodeURIComponent(recordLink[1])] = null;
      return { status: 200, json: { success: true } };
    }

    const a = base();
    if (!a || a.status !== 200 || !a.json) return a;
    if (path === "/api/jotform/submissions" && method === "GET" && Array.isArray(a.json.submissions)) {
      a.json = Object.assign({}, a.json, { submissions: a.json.submissions.map(withLinks) });
    }
    if (/^\/api\/jotform\/submissions\/[^/]+$/.test(path) && method === "GET" && a.json.meta) {
      a.json = Object.assign({}, a.json, { meta: withLinks(a.json.meta) });
    }
    return a;
  }

  return {
    route,
    setScene: (o) => { m().scene = Object.assign({}, o || {}); },
    sent: () => clone(m().sent),
    model: () => m(),
    sameName: () => clone(SAME_NAME),
    reset: () => { model = null; },
  };
};
