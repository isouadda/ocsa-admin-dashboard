// What the API's Round 8 answers for the dashboard (ocsa-api part 371, main c5b88ff), for the dashboard's
// part 372. audit/stubs.js lays it over every other layer, part 368's among them, in every run, since the
// API's main answers it. Each route is answered the way the API's code at c5b88ff answers it:
//
//   GET /api/schedule/calendar          each scheduled shift carries updated_at (routes/schedule.js, B2), which
//                                       PATCH /api/schedule/:id takes back as updatedAt; a save moves it. A
//                                       change made since is part 368's since scene on /api/schedule/:id.
//   GET /api/users/profile/:id, /api/users
//                                       the profile's user and each row carry updatedAt (routes/users.js, B3),
//                                       the value GET /api/users/:id answers (audit/part368-round6.js)
//   POST /api/hr-cases/:id/updates      201 { update, updatedAt } (routes/hr-cases.js, B4): the case's
//                                       updated_at as the entry's own stamp moved it. The case's next GET
//                                       and PATCH answer the same stamp, and a PATCH that sends an older
//                                       one is 409 common.changedSince with current, as helpers/
//                                       changedSince.js answers it, nothing written.
//   GET /api/users/timeline/:id, /api/sites/timeline/:id with cursor
//                                       a page at a time (B7): { entries, limit, nextCursor }, newest first,
//                                       then id; category, startDate and endDate held on every page; 50 by
//                                       default and 200 at most; 400 paging.badCursor and paging.badLimit
//                                       with keys. Without cursor the layers under this one answer as before.
//                                       The scene timelineMany gives both timelines 70 entries.
//   POST /api/pickups/:id/approve-drop-and-assign { user_id }
//                                       DASH-35 (routes/pickups.js, B10): 400 pickups.staffRequired with no
//                                       user_id, 404 shifts.notFound, 400 pickups.onlyRequestedApprove for a
//                                       request no longer requested, 400 pickups.assignToDropper keys
//                                       ["user_id"] for the person who asked to drop it or who holds it, each
//                                       writing nothing; else the drop approved and the shift given in one
//                                       step, answered as the assign answers (the open shift with site_name
//                                       and claimed_by_name).
//
//   GET /api/report-engine/definitions  each row as the table holds it (SELECT *), created_by among them: a
//                                       saved report made by the admin, unless the scene reportBy names
//                                       someone else. The stub under this one already refuses a removal by
//                                       anyone but an admin or the report's maker; its rows lacked the maker.
//   Discipline (section 4), once a case arms the scene discipline: the routes as routes/discipline.js answers
//                                       them at c5b88ff for Ngozi Okonkwo (u-staff-6), who has a written
//                                       warning drafted and a verbal one issued. GET /api/discipline pages
//                                       the list in the summary's shape (no description); GET
//                                       /api/discipline/person/:userId answers her history whole; GET
//                                       /api/discipline/:id answers 404, since main has no such route (the
//                                       scene's byId answers it as a route would); personFails refuses the
//                                       person read; POST, PUT and /:id/issue keep what they are sent.
//
// B1 (the summary's counted) is audit/checklist-stub.js, B5 and B6 (counts.pending, order=attention) are
// audit/part368-round6.js, and B8 and B9 (effectiveOn, dryRun) are audit/part368-leave.js, each beside the
// answer it adds to. Every value is invented; the words are the API's helpers/words.js English and Spanish.
"use strict";

module.exports = (ctx) => {
  const { seed, state, ok, clone } = ctx;
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });
  const STAMP = "2026-03-17T12:00:00.000Z";
  let seq = 0;
  // A stamp later than every seeded one, one second apart, as each write moves updated_at.
  const nextStamp = () => { seq += 1; return new Date(Date.parse(seed.NOW_ISO) + seq * 1000).toISOString(); };

  let model = null;
  const m = () => {
    if (!model) model = { shiftStamp: {}, caseStamp: {}, caseRead: {}, sent: [], timelineMany: false, reportBy: null, discipline: null };
    return model;
  };

  // ---- B2, the schedule's updated time ------------------------------------------------------------------
  function scheduleRoute(method, path, query, body, lang, base) {
    if (path === "/api/schedule/calendar" && method === "GET") {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.scheduled_shifts)) return a;
      a.json = Object.assign({}, a.json, { scheduled_shifts: a.json.scheduled_shifts.map((x) => {
        const out = Object.assign({}, x, { updated_at: m().shiftStamp[x.id] || STAMP });
        delete out.updatedAt;
        return out;
      }) });
      return a;
    }
    const one = /^\/api\/schedule\/([^/]+)$/.exec(path);
    if (one && method === "PATCH" && !/^(calendar|patterns|bulk)$/.test(one[1])) {
      m().sent.push({ schedule: one[1], body: clone(body || {}) });
      const a = base();
      if (a && a.status === 200) {
        m().shiftStamp[one[1]] = nextStamp();
        const row = (state.schedule || []).find((s0) => s0.id === one[1]);
        if (row) delete row.updatedAt;
      }
      return a;
    }
    return null;
  }

  // ---- B3, a person's updated time on the profile and the list -------------------------------------------
  function peopleRoute(method, path, query, body, lang, base) {
    if (method !== "GET") return null;
    if (/^\/api\/users\/profile\/[^/]+$/.test(path) && path !== "/api/users/profile/me") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.user && typeof a.json.user === "object" && !a.json.user.updatedAt) a.json = Object.assign({}, a.json, { user: Object.assign({}, a.json.user, { updatedAt: STAMP }) });
      return a;
    }
    if (path === "/api/users") {
      const a = base();
      if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map((x) => (x && typeof x === "object" && !x.updatedAt ? Object.assign({}, x, { updatedAt: STAMP }) : x));
      return a;
    }
    return null;
  }

  // ---- B4, a case log entry's answer ------------------------------------------------------------------------
  function caseRoute(method, path, query, body, lang, base) {
    const entry = /^\/api\/hr-cases\/([^/]+)\/updates$/.exec(path);
    if (entry && method === "POST") {
      const a = base();
      if (a && a.status === 201 && a.json) {
        const at = nextStamp();
        m().caseStamp[entry[1]] = at;
        a.json = Object.assign({}, a.json, { updatedAt: at });
      }
      return a;
    }
    const one = /^\/api\/hr-cases\/([^/]+)$/.exec(path);
    if (!one || one[1] === "queue-count") return null;
    const id = one[1];
    const held = m().caseStamp[id];
    if (method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && typeof a.json === "object") {
        if (held) a.json = Object.assign({}, a.json, { updatedAt: held });
        m().caseRead[id] = clone(a.json);
      }
      return a;
    }
    if (method === "PATCH" && held) {
      if (body && body.updatedAt !== undefined && body.updatedAt !== null && body.updatedAt !== "" && String(body.updatedAt) !== String(held)) {
        m().sent.push({ caseRefused: id, body: clone(body) });
        const current = Object.assign({}, m().caseRead[id] || {}, { updatedAt: held });
        return bad(409, "common.changedSince", T(lang, "Someone else changed this since you opened it. Nothing was saved. Check what it says now and save again.",
          "Otra persona cambió esto desde que lo abrió. No se guardó nada. Revise lo que dice ahora y vuelva a guardar."), { current });
      }
      const a = base();
      if (a && a.status === 200 && a.json && typeof a.json === "object") {
        const at = nextStamp();
        m().caseStamp[id] = at;
        a.json = Object.assign({}, a.json, { updatedAt: at });
      }
      return a;
    }
    return null;
  }

  // ---- B7, the timelines a page at a time ------------------------------------------------------------------
  const encode = (list, v) => Buffer.from(JSON.stringify([list, v])).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const decode = (list, c) => {
    try {
      const v = JSON.parse(Buffer.from(String(c).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      return Array.isArray(v) && v[0] === list && Number.isInteger(v[1]) && v[1] >= 0 ? v[1] : null;
    } catch (e) { return null; }
  };
  // Older copies of a timeline's entries, a day apart, so the timeline runs past one page.
  function many(rows) {
    if (!m().timelineMany || !rows.length) return rows;
    const out = rows.slice();
    for (let i = 0; out.length < 70; i += 1) {
      const from = rows[i % rows.length];
      const copy = clone(from);
      copy.id = String(from.id) + "-p" + (i + 1);
      copy.createdAt = new Date(Date.parse(from.createdAt) - (20 + i) * 86400000).toISOString();
      out.push(copy);
    }
    return out;
  }
  function timelineRoute(method, path, query, body, lang, base) {
    const who = /^\/api\/users\/timeline\/[^/]+$/.test(path) ? "user-timeline" : /^\/api\/sites\/timeline\/[^/]+$/.test(path) ? "site-timeline" : null;
    if (!who || method !== "GET" || !query.has("cursor")) return null;
    const keys = [];
    let limit = 50;
    if (query.has("limit")) { const n = Number(query.get("limit")); if (!Number.isInteger(n) || n < 1) keys.push("limit"); else limit = Math.min(n, 200); }
    if (keys.length) return bad(400, "paging.badLimit", T(lang, "The page size (limit) must be a whole number greater than zero.", "El tamaño de página (limit) debe ser un número entero mayor que cero."), { keys });
    const c = String(query.get("cursor") || "");
    const offset = c === "" ? 0 : decode(who, c);
    if (offset === null) return bad(400, "paging.badCursor", T(lang, "This page marker is not valid for this list. Load the list again from its first page.", "Este marcador de página no es válido para esta lista. Cargue la lista de nuevo desde la primera página."), { keys: ["cursor"] });
    const a = base();
    if (!a || a.status !== 200 || !a.json || !Array.isArray(a.json.entries)) return a;
    const from = query.get("startDate") || "", to = query.get("endDate") || "";
    let rows = many(a.json.entries).filter((r) => (!from || String(r.createdAt).slice(0, 10) >= from) && (!to || String(r.createdAt).slice(0, 10) <= to));
    rows = rows.slice().sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)) || String(y.id).localeCompare(String(x.id)));
    const page = rows.slice(offset, offset + limit);
    m().sent.push({ timeline: who, query: String(query) });
    return ok({ entries: page, limit, nextCursor: offset + limit < rows.length ? encode(who, offset + limit) : null });
  }

  // ---- B10, DASH-35: approve the drop and assign it in one step ----------------------------------------------
  const PEOPLE = () => Object.keys(seed.PEOPLE).map((k) => seed.PEOPLE[k]).map((p) => ({ id: p.id, name: p.firstName + " " + p.lastName })).concat((seed.STAFF || []).map((p) => ({ id: p.id, name: p.name })));
  function pickupRoute(method, path, query, body, lang, base) {
    const hit = /^\/api\/pickups\/([^/]+)\/approve-drop-and-assign$/.exec(path);
    if (!hit || method !== "POST") return null;
    const b = body && typeof body === "object" ? body : {};
    m().sent.push({ approveDropAndAssign: hit[1], body: clone(b) });
    const userId = typeof b.user_id === "string" ? b.user_id.trim() : "";
    const who = PEOPLE().find((p) => p.id === userId);
    if (!userId || !who) return bad(400, "pickups.staffRequired", T(lang, "Staff member is required", "Elija a la persona"));
    const row = (state.pickups || []).find((p) => p.id === hit[1]);
    if (!row) return bad(404, "shifts.notFound", T(lang, "Shift not found", "No se encontró el turno"));
    if (row.status !== "requested") return bad(400, "pickups.onlyRequestedApprove", T(lang, "Only requested drops can be approved", "Solo se pueden aprobar las solicitudes pendientes"));
    if (userId === row.original_user_id || userId === row.assigned_to) return bad(400, "pickups.assignToDropper", T(lang, "This person asked to drop this shift. Deny the drop request to keep them on it.", "Esta persona pidió dejar este turno. Deniegue la solicitud para que lo conserve."), { keys: ["user_id"] });
    Object.assign(row, { status: "approved", claimed_by: userId, claimed_by_name: who.name, assigned_to: null, assigned_to_name: null });
    return ok(clone(row));
  }

  // ---- Reports: who made a saved report ---------------------------------------------------------------------
  // The stored rows carry created_by, as the table does: a saved report the admin made, unless the scene
  // reportBy names someone else. The layers under this one answer the list and refuse a removal by anyone
  // but an admin or the report's maker, as routes/report-engine.js does.
  function reportRoute(method, path, query, body, lang, base) {
    if (!/^\/api\/report-engine\/definitions(\/[^/]+)?$/.test(path) || !ctx.reportRows) return null;
    ctx.reportRows().forEach((r) => { if (r && !r.is_system && !r.created_by) r.created_by = m().reportBy || seed.PEOPLE.admin.id; });
    if (method === "DELETE") m().sent.push({ reportDeactivate: path.split("/").pop() });
    return base();
  }

  // ---- Section 4: the discipline routes, as API main answers them ------------------------------------------
  const WARNED = "u-staff-6";
  const NAME = "Ngozi Okonkwo";
  const disc = () => {
    const x = m();
    if (!x.discipline.rows) x.discipline.rows = [
      { id: "dd-1", type: "written_warning", category: "attendance", incidentDate: seed.shift(-3), actionDate: null, status: "draft", issuedAt: null, issuedBy: null,
        description: "Missed two shifts in one week without calling in.", policyRef: "Handbook 4.2", expectations: "Call the supervisor before a shift you cannot work.", expectedBy: null,
        followsProtectedActivity: false, controllerDiscussedOn: null, language: "en", updatedAt: seed.shift(-2) + "T15:10:00Z" },
      { id: "dd-2", type: "verbal_warning", category: "attendance", incidentDate: seed.shift(-40), actionDate: seed.shift(-40), status: "open", issuedAt: seed.shift(-40) + "T14:00:00Z",
        issuedBy: { userId: seed.PEOPLE.admin.id, name: seed.PEOPLE.admin.firstName + " " + seed.PEOPLE.admin.lastName }, description: "Late twice.", language: "en" },
    ];
    return x.discipline;
  };
  const SUMMARY = ["id", "type", "category", "incidentDate", "actionDate", "status", "issuedAt", "issuedBy"];
  const summaryOf = (r) => Object.assign({ person: { userId: WARNED, name: NAME } }, ...SUMMARY.map((k) => ({ [k]: r[k] === undefined ? null : r[k] })), { delivered: null, signed: false, declinedToSign: false, caseId: null, signature: null });
  const fullOf = (r) => Object.assign(summaryOf(r), clone(r));
  function disciplineRoute(method, path, query, body, lang, base) {
    if (!m().discipline || !/^\/api\/discipline(\/|$)/.test(path) || path === "/api/discipline/steps") return null;
    const D = disc();
    if (path === "/api/discipline" && method === "GET") {
      const rows = D.rows.map(summaryOf);
      const byType = {}; rows.forEach((r) => { if (r.status !== "draft") byType[r.type] = (byType[r.type] || 0) + 1; });
      return ok({ warnings: rows, counts: { byType, total: rows.filter((r) => r.status !== "draft").length }, nextCursor: null, limit: 50 });
    }
    if (path === "/api/discipline/person/" + WARNED && method === "GET") {
      m().sent.push({ disciplinePerson: WARNED });
      if (D.personFails) return bad(500, "common.serverError", T(lang, "Something went wrong.", "Algo sali\u00f3 mal."));
      return ok({ person: { userId: WARNED, name: NAME, role: "custodial_laborer", status: "active", sites: [], language: "en", hasEmail: true },
        history: D.rows.map(fullOf), last12Months: { since: seed.shift(-365), byType: { verbal_warning: 1 } }, notOnRecord: [], highestStep: "verbal_warning", suggestedNext: "written_warning" });
    }
    if (path === "/api/discipline" && method === "POST") {
      D.seq = (D.seq || 0) + 1;
      const r = Object.assign({ id: "dd-new-" + D.seq, status: "draft" }, clone(body || {}));
      D.rows.unshift(r); m().sent.push({ disciplinePost: clone(body || {}) });
      return { status: 201, json: { warning: fullOf(r) } };
    }
    const one = /^\/api\/discipline\/([^/]+)(\/issue)?$/.exec(path);
    if (one) {
      const r = D.rows.find((x) => x.id === one[1]);
      if (method === "GET" && !one[2]) {
        m().sent.push({ disciplineById: one[1] });
        if (!D.byId || !r) return bad(404, "common.notFound", T(lang, "Not found", "No encontrado"));
        return ok({ warning: fullOf(r) });
      }
      if (method === "PUT" && !one[2] && r) { Object.assign(r, clone(body || {})); m().sent.push({ disciplinePut: one[1], body: clone(body || {}) }); return ok({ warning: fullOf(r) }); }
      if (method === "POST" && one[2] && r) { r.status = "open"; r.issuedAt = seed.NOW_ISO; m().sent.push({ disciplineIssue: one[1] }); return ok({ warning: fullOf(r) }); }
    }
    return null;
  }

  return {
    route(method, path, query, body, lang, base) {
      return scheduleRoute(method, path, query, body, lang, base) || peopleRoute(method, path, query, body, lang, base)
        || caseRoute(method, path, query, body, lang, base) || timelineRoute(method, path, query, body, lang, base)
        || pickupRoute(method, path, query, body, lang, base) || reportRoute(method, path, query, body, lang, base)
        || disciplineRoute(method, path, query, body, lang, base) || base();
    },
    setScene(o) {
      if (o && o.timelineMany !== undefined) m().timelineMany = !!o.timelineMany;
      if (o && o.reportBy !== undefined) m().reportBy = o.reportBy || null;
      if (o && o.discipline !== undefined) m().discipline = o.discipline ? Object.assign(m().discipline || {}, o.discipline) : null;
    },
    sent: () => m().sent.slice(),
    model: () => m(),
    stamp: STAMP,
    reset() { model = null; seq = 0; },
  };
};
