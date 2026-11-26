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
// Every value is invented: the people, their numbers and badges.
"use strict";

module.exports = (ctx) => {
  const { state, clone } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);

  let model = null;
  const m = () => {
    if (!model) model = { scene: {}, sent: [], linkedUser: {} };
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

  // A submission's row as the reads answer it once someone has linked it here.
  const withLinks = (row) => {
    if (!row || typeof row !== "object" || !Object.prototype.hasOwnProperty.call(m().linkedUser, row.id)) return row;
    const uid = m().linkedUser[row.id];
    const p = uid ? personById(uid) : null;
    return Object.assign({}, row, { user_id: p ? p.id : null, first_name: p ? p.first_name : null, last_name: p ? p.last_name : null, user_employee_id: p ? p.employee_id : null });
  };

  function route(method, path, query, body, said, base) {
    if (!sc().round23) return base();
    const lang = said;
    const b = body || {};

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
