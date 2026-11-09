// Pictures behind links that run out (part 372, section 2): since the API's Round 7 (helpers/photoLinks.js,
// finding API-119) a photo in a JSON answer is a signed storage link that works for 60 minutes from the read
// that handed it out. Once a run arms it with setPictures372, audit/stubs.js lays this over every other layer:
//
//   the answers   GET /api/users carries a photo for three people, GET /api/users/profile/:id for the same
//                 three, and GET /api/issues/i-1 and /api/issues/i-1/photos two photos, each signed at the
//                 read: https://storage.example.invalid/storage/v1/object/sign/<bucket>/<path>?token=, the
//                 token naming the path and the instant it runs out, an hour after the stub's clock at
//                 the read. A read named in the scene expireNext ({ "<read>": n }) hands out links that have
//                 already run out, n times, as an answer read an hour ago does: profile:<id>, staff-list,
//                 issue:i-1 (the issue's read) and issue-photos:i-1 (its photos' own read).
//   the pictures  picture(url) answers a link the way storage does: the bytes while it lasts, and 400
//                 InvalidJWT once the stub's clock is past its time. audit/lib/driver.js routes the stub's
//                 storage host here in every run; a link with no token of this layer's, as the older
//                 layers write one, is answered with the bytes. The clock moves only when a case moves
//                 it, advance(minutes), so a list read again an hour later gets fresh links.
//   a ticket      the support ticket tk-1 carries screenshotUrl /api/support/tickets/tk-1/screenshot, which
//                 the API answers behind the token (routes/support.js), and that route answers the bytes.
//
// Every picture is the audit's own fixture photo; every value is invented.
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = (ctx) => {
  const { seed, ok } = ctx;
  const PHOTO = fs.readFileSync(path.join(__dirname, "fixtures", "photo.jpg"));
  const HOST = "https://storage.example.invalid/storage/v1/object/sign/";
  const PEOPLE = ["u-staff-5", "u-staff-6", "u-staff-7"];
  const ISSUE = "i-1";
  const ISSUE_PHOTOS = [{ id: "ip-1", stored: "issue-photos/i-1/lobby-floor.jpg" }, { id: "ip-2", stored: "issue-photos/i-1/lobby-floor-close.jpg" }];
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = (s) => { try { return JSON.parse(Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); } catch (e) { return null; } };

  let on = false;
  let model = null;
  const m = () => {
    if (!model) model = { now: Date.parse(seed.NOW_ISO), expireNext: {}, reads: {}, served: [], signed: 0 };
    return model;
  };
  // One read's signer: links an hour from now, or already run out when the scene says this read is old.
  function signerFor(read) {
    const x = m();
    x.reads[read] = (x.reads[read] || 0) + 1;
    const old = (x.expireNext[read] || 0) > 0;
    if (old) x.expireNext[read] -= 1;
    const exp = old ? x.now - 60000 : x.now + 3600000;
    return (stored) => { x.signed += 1; return HOST + stored + "?token=" + b64({ p: stored, exp, n: x.signed }); };
  }
  const personPhoto = (id) => "profile-photos/" + id + "/face.jpg";

  function route(method, p, query, body, lang, base) {
    if (!on || method !== "GET") return base();
    if (p === "/api/users") {
      const a = base();
      if (!a || a.status !== 200 || !Array.isArray(a.json)) return a;
      const sign = signerFor("staff-list");
      a.json = a.json.map((r) => (r && PEOPLE.indexOf(r.id) >= 0 ? Object.assign({}, r, { profilePhotoUrl: sign(personPhoto(r.id)) }) : r));
      return a;
    }
    const prof = /^\/api\/users\/profile\/([^/]+)$/.exec(p);
    if (prof && PEOPLE.indexOf(prof[1]) >= 0) {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !a.json.user) return a;
      const sign = signerFor("profile:" + prof[1]);
      a.json = Object.assign({}, a.json, { user: Object.assign({}, a.json.user, { profilePhotoUrl: sign(personPhoto(prof[1])) }) });
      return a;
    }
    if (p === "/api/issues/" + ISSUE) {
      const a = base();
      if (!a || a.status !== 200 || !a.json || !a.json.issue) return a;
      const sign = signerFor("issue:" + ISSUE);
      a.json = Object.assign({}, a.json, { issue: Object.assign({}, a.json.issue, { photos: ISSUE_PHOTOS.map((x) => ({ id: x.id, url: sign(x.stored) })) }) });
      return a;
    }
    if (p === "/api/issues/" + ISSUE + "/photos") {
      const sign = signerFor("issue-photos:" + ISSUE);
      return ok(ISSUE_PHOTOS.map((x) => ({ id: x.id, photo_url: sign(x.stored) })));
    }
    if (p === "/api/support/tickets/tk-1/screenshot") {
      m().served.push({ url: p, ok: true });
      return { status: 200, bytes: PHOTO, contentType: "image/jpeg", json: null };
    }
    if (p === "/api/support/tickets") {
      const a = base();
      const add = (r) => (r && r.id === "tk-1" ? Object.assign({}, r, { screenshotPath: "support-screenshots/tk-1.png", screenshotUrl: "/api/support/tickets/tk-1/screenshot" }) : r);
      if (a && a.status === 200 && a.json && Array.isArray(a.json.tickets)) a.json = Object.assign({}, a.json, { tickets: a.json.tickets.map(add) });
      else if (a && a.status === 200 && Array.isArray(a.json)) a.json = a.json.map(add);
      return a;
    }
    return base();
  }

  // A storage link, answered the way storage answers it: the bytes while it lasts, else 400 InvalidJWT. A link
  // with no token of this layer's, as the older layers of the stub write a photo's address, gets the bytes.
  function picture(url) {
    const u = new URL(url);
    const t = unb64(u.searchParams.get("token"));
    if (!t || t.exp === undefined) return { status: 200, contentType: "image/jpeg", body: PHOTO };
    const live = !!t && Number(t.exp) > m().now;
    m().served.push({ url, ok: live });
    if (live) return { status: 200, contentType: "image/jpeg", body: PHOTO };
    return { status: 400, contentType: "application/json", body: JSON.stringify({ statusCode: "400", error: "InvalidJWT", message: "\"exp\" claim timestamp check failed" }) };
  }

  return {
    route,
    picture,
    set(o) {
      if (o === false) { on = false; return; }
      on = true;
      const x = m();
      if (o && o.expireNext) Object.keys(o.expireNext).forEach((k) => { x.expireNext[k] = Number(o.expireNext[k]) || 0; });
    },
    advance(minutes) { m().now += Math.round(Number(minutes) * 60000); },
    model: () => m(),
    // When a link a picture asked for runs out, read off its token, or null.
    expiresAt: (url) => { try { const t = unb64(new URL(url).searchParams.get("token")); return t ? Number(t.exp) : null; } catch (e) { return null; } },
    reset() { on = false; model = null; },
  };
};
