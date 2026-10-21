// What the API's Round 6 (part 365) built for the dashboard's earlier "Waiting on the API", for part 368,
// laid inside audit/part368-stub.js over every other layer:
//
//   paging    GET /api/hr-cases, /api/discipline, /api/hr/training, /api/hr/documents, /api/signatures,
//             /api/issues, /api/inspections/scheduled and /api/supplies/requests answer a call that
//             carries cursor a page at a time, as helpers/paging.js does: the list under its key with
//             nextCursor beside it, null on the last page, newest first; limit 50 by default and 200 at
//             most; 400 paging.badLimit and paging.badCursor with keys. A call with neither cursor nor
//             limit is answered as before by the layers under this one. Every filter the route reads
//             holds on each page; /api/issues reads status here, which the layers under it do not.
//             The scene listsMany makes each list longer than one page with older copies of its rows.
//
//   since     an office write that sends updatedAt (helpers/changedSince.js, API-101): once a case sets a
//             change made since on a path, a write there whose updatedAt is not the record's now answers
//             409 common.changedSince with current, the record as it is now, and writes nothing; the same
//             write with current's updatedAt goes through. GET /api/users/:id answers the person with
//             updatedAt, the one read of a person that carries it.
//
// The cursor here is base64url of [list, offset], as opaque to the screen as the API's own.
"use strict";

module.exports = (ctx) => {
  const { ok, seed } = ctx;
  const STAMP = "2026-03-17T12:00:00.000Z";
  const T = (lang, en, es) => (lang === "es" ? es : en);
  const bad = (status, code, error, extra) => ({ status, json: Object.assign({ error, code }, extra || {}) });

  // Each paged list: its key in the paged answer, where the rows are in the old answer, the date it sorts
  // by (newest first, id last), and the filters this layer applies itself.
  const LISTS = {
    "/api/hr-cases": { name: "hr_cases", key: "cases", rows: (j) => j && j.cases, at: (r) => r.createdAt },
    "/api/discipline": { name: "discipline", key: "warnings", rows: (j) => j && j.warnings, at: null, keep: (j) => ({ counts: j.counts }) },
    "/api/hr/training": { name: "training", key: "records", rows: (j) => j, at: null },
    // The documents keep the order the layers under this one answer, as the unpaged answer does, so the
    // pages hold the rows the older cases open on the table's first page.
    "/api/hr/documents": { name: "documents", key: "documents", rows: (j) => j, at: null },
    "/api/signatures": { name: "signatures", key: "requests", rows: (j) => j && j.requests, at: (r) => r.requestedAt },
    "/api/issues": { name: "issues", key: "issues", rows: (j) => j, at: (r) => r.reported_at || r.created_at, status: true },
    "/api/inspections/scheduled": { name: "inspections", key: "inspections", rows: (j) => j, at: (r) => r.scheduled_date },
    "/api/supplies/requests": { name: "supply_requests", key: "requests", rows: (j) => j, at: (r) => r.created_at || r.requested_at },
  };
  const DEFAULT_LIMIT = 50;
  const MAX_LIMIT = 200;
  const MANY = 70;

  let many = false;
  // A change made since, by path: { current, refused }.
  let since = {};
  const stampOf = (r) => (r && (r.updatedAt || r.updated_at)) || null;
  function sinceRoute(method, path, query, body, lang, base) {
    const one = /^\/api\/users\/([^/]+)$/.exec(path);
    if (one && method === "GET") {
      const a = base();
      if (a && a.status === 200 && a.json && a.json.user) return a;
      const id = decodeURIComponent(one[1]);
      const prof = ctx.userProfile ? ctx.userProfile(id) : null;
      if (!prof || !prof.user) return a;
      return ok({ user: Object.assign(JSON.parse(JSON.stringify(prof.user)), { updatedAt: STAMP }) });
    }
    const s0 = since[path];
    if (s0 && (method === "PATCH" || method === "PUT") && body && body.updatedAt !== undefined && String(body.updatedAt) !== String(stampOf(s0.current))) {
      s0.refused += 1;
      return bad(409, "common.changedSince", T(lang, "Someone else changed this since you opened it. Nothing was saved. Check what it says now and save again.",
        "Otra persona cambi\u00f3 esto desde que lo abri\u00f3. No se guard\u00f3 nada. Revise lo que dice ahora y vuelva a guardar."), { current: s0.current });
    }
    return null;
  }
  const encode = (list, offset) => Buffer.from(JSON.stringify([list, offset])).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const decode = (list, c) => {
    try {
      const v = JSON.parse(Buffer.from(String(c).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      return Array.isArray(v) && v[0] === list && Number.isInteger(v[1]) && v[1] >= 0 ? v[1] : null;
    } catch (e) { return null; }
  };
  // A date a number of days before another, kept in the shape it came in (a day or an instant).
  const daysBefore = (v, n) => {
    if (!v) return v;
    const s = String(v);
    const t = Date.parse(s.length === 10 ? s + "T12:00:00Z" : s);
    if (!Number.isFinite(t)) return v;
    const out = new Date(t - n * 86400000).toISOString();
    return s.length === 10 ? out.slice(0, 10) : out;
  };
  const DATE_KEYS = ["createdAt", "created_at", "requestedAt", "reported_at", "scheduled_date", "uploaded_at", "actionDate", "action_date", "incidentDate", "issuedAt", "completed_date", "updatedAt", "updated_at"];
  // Older copies of a list's rows, each with its own id, so the list runs past one page.
  function padded(rows) {
    if (!many || !rows.length || rows.length >= MANY) return rows;
    const out = rows.slice();
    for (let i = 0; out.length < MANY; i += 1) {
      const from = rows[i % rows.length];
      const copy = JSON.parse(JSON.stringify(from));
      copy.id = String(from.id) + "-p" + (i + 1);
      DATE_KEYS.forEach((k) => { if (copy[k]) copy[k] = daysBefore(copy[k], 400 + i); });
      out.push(copy);
    }
    return out;
  }

  function pagingRoute(method, path, query, lang, base) {
    const L = LISTS[path];
    if (!L || method !== "GET" || !query.has("cursor")) return null;
    const keys = [];
    let limit = DEFAULT_LIMIT;
    if (query.has("limit")) {
      const n = Number(query.get("limit"));
      if (!Number.isInteger(n) || n < 1) keys.push("limit");
      else limit = Math.min(n, MAX_LIMIT);
    }
    if (keys.length) return bad(400, "paging.badLimit", T(lang, "The page size (limit) must be a whole number greater than zero.", "El tama\u00f1o de p\u00e1gina (limit) debe ser un n\u00famero entero mayor que cero."), { keys });
    const c = String(query.get("cursor") || "");
    const offset = c === "" ? 0 : decode(L.name, c);
    if (offset === null) return bad(400, "paging.badCursor", T(lang, "This page marker is not valid for this list. Load the list again from its first page.", "Este marcador de p\u00e1gina no es v\u00e1lido para esta lista. Cargue la lista de nuevo desde la primera p\u00e1gina."), { keys: ["cursor"] });
    const a = base();
    if (!a || a.status !== 200) return a;
    let rows = L.rows(a.json);
    if (!Array.isArray(rows)) return a;
    if (L.status && query.get("status")) rows = rows.filter((r) => r.status === query.get("status"));
    rows = padded(rows);
    if (L.at) rows = rows.slice().sort((x, y) => String(L.at(y) || "").localeCompare(String(L.at(x) || "")) || String(y.id).localeCompare(String(x.id)));
    const page = rows.slice(offset, offset + limit);
    const next = offset + limit < rows.length ? encode(L.name, offset + limit) : null;
    const out = Object.assign({}, L.keep ? L.keep(a.json) : {}, { [L.key]: page, nextCursor: next });
    if (path === "/api/discipline") out.limit = limit;
    return ok(out);
  }

  return {
    route(method, path, query, body, lang, base) {
      return sinceRoute(method, path, query, body, lang, base) || pagingRoute(method, path, query, lang, base);
    },
    setScene(o) {
      if (o && o.listsMany !== undefined) many = !!o.listsMany;
      if (o && o.since === null) since = {};
      if (o && o.since) Object.keys(o.since).forEach((p) => { since[p] = { current: o.since[p], refused: 0 }; });
    },
    sinceRefused: (p) => (since[p] ? since[p].refused : 0),
    stamp: STAMP,
    reset() { many = false; since = {}; },
  };
};
