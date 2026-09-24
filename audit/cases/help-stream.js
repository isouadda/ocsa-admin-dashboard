// Help's answer appears as it is written.
//
// POST /api/agent/message/stream takes the same body, query and headers as POST /api/agent/message.
// It writes meta { conversationId, requestId }, the answer in pieces as delta { text } that may cut a
// word or a bold phrase in two, reset {} to take back what was drawn since meta or the last reset,
// and done, which is the whole answer's response body, key for key, or error { error, status } in its
// place. A refusal before the stream opens is JSON, as it always was. audit/stream.js writes the
// stream for the browser, with a pause or a hold before a piece, so a journey can read the page part
// way through an answer however slow the machine is, and can drop the connection part way.
//
// Every journey runs in English and in Spanish, as help-stream/<journey>/<language>. The answers,
// the refusal and the documents are invented.
"use strict";
const stream = require("../stream");

const ROUTE = "/api/agent/message/stream";
const WHOLE_ROUTE = "/api/agent/message";

// One answer in twelve pieces, a bold phrase cut in the middle of a word and another bold phrase cut
// between its two stars, so the eleventh piece ends on a lone *. Spanish is written in escapes.
const SAY = {
  en: {
    question: "What do I do about a spill in the lobby?",
    pieces: ["To report a spill, ", "open **Rep", "orts** and ", "choose **Spill ", "report**. ", "Write where it ",
      "happened and ", "what was used ", "to clean it. ", "Add a photo ", "if you have one, then press *", "*Save**."],
    bold: ["Reports", "Spill report", "Save"],
    steps: "1. Open **Forms**.\n2. Choose **Safety Incident Report**.\n3. Answer each question.",
    stepsBold: ["Forms", "Safety Incident Report"],
    first: "A first try at the answer. ",
    again: "The answer, written again.",
    busy: "Help is busy right now. Ask again in a minute.",
    follow: "And after that?",
  },
  es: {
    question: "\u00bfQu\u00e9 hago con un derrame en el vest\u00edbulo?",
    pieces: ["Para informar un derrame, ", "abra **Infor", "mes** y ", "elija **Derrame ", "de producto**. ", "Escriba d\u00f3nde ",
      "ocurri\u00f3 y ", "qu\u00e9 se us\u00f3 ", "para limpiarlo. ", "Agregue una foto ", "si la tiene y pulse *", "*Guardar**."],
    bold: ["Informes", "Derrame de producto", "Guardar"],
    steps: "1. Abra **Formularios**.\n2. Elija **Informe de incidente de seguridad**.\n3. Conteste cada pregunta.",
    stepsBold: ["Formularios", "Informe de incidente de seguridad"],
    first: "Un primer intento de respuesta. ",
    again: "La respuesta, escrita de nuevo.",
    busy: "Ayuda est\u00e1 ocupada ahora. Pregunte de nuevo en un minuto.",
    follow: "\u00bfY despu\u00e9s?",
  },
};
const DOC = "DOC-PRACTICE-7";
// The report the answer continues is the one unfinished report the stub always serves.
const CONTINUED = { id: "ad-1", formName: "Safety Incident Report", answered: 3, remaining: 2, status: "draft" };
// A photo as small as a photo can be, one pixel.
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const plain = (s) => String(s).replace(/\*\*/g, "");
const flat = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// True once p settles, false when ms pass first.
const within = (p, ms) => Promise.race([Promise.resolve(p).then(() => true), wait(ms).then(() => false)]);

// The conversation as a person reads it. The send box is the row the Send button sits in, the card
// holds that row, and the conversation is the card's first child. Each message is a row; the answer's
// rows run left to right and the question's right to left. A bubble is the box with the words in it,
// and the lines under it are the rest of the row.
function readTalk(w) {
  const send = document.querySelector('button[aria-label="' + w.send + '"]');
  const area = send && send.parentElement && send.parentElement.parentElement ? send.parentElement.parentElement.firstElementChild : null;
  if (!area) return null;
  const rows = Array.from(area.children).filter((c) => c.style && (c.style.flexDirection === "row" || c.style.flexDirection === "row-reverse"));
  const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
  const live = Array.from(box.querySelectorAll("[aria-live], [role=status], [role=alert], [role=log]"));
  return {
    rows: rows.map((r) => {
      const col = r.firstElementChild;
      const kids = col ? Array.from(col.children) : [];
      const bubble = kids.find((k) => (k.getAttribute("style") || "").indexOf("padding: 8px 12px") >= 0) || null;
      return {
        me: r.style.flexDirection === "row-reverse",
        words: bubble ? bubble.innerText : "",
        bold: bubble ? Array.from(bubble.querySelectorAll("strong")).map((s) => s.textContent) : [],
        steps: bubble ? Array.from(bubble.querySelectorAll("span")).map((s) => s.textContent.trim()).filter((s) => /^\d+\.$/.test(s)) : [],
        border: bubble ? getComputedStyle(bubble).borderTopColor : "",
        lines: kids.filter((k) => k !== bubble).map((k) => k.innerText),
        buttons: Array.from(r.querySelectorAll("button")).map((b) => b.innerText.trim()),
      };
    }),
    live: live.map((el) => ({ text: el.textContent, holdsTalk: el.contains(area) })),
    talkIsLive: !!area.closest("[aria-live]"),
    page: box.innerText,
  };
}

async function run({ d, results, stubs, lang }) {
  const w = SAY[lang] || SAY.en;
  const label = { send: d.say("Send"), describe: d.say("Describe what happened") };
  const say = {
    notSent: d.say("Not sent."), retry: d.say("Retry"), tryAgain: d.say("Try again"),
    dropped: d.say("The connection dropped. Your answer is saved."),
    inProgress: d.say("Report in progress"), unfinished: d.say("Unfinished reports"),
    degraded: d.say("Working from the written procedure only right now."),
    basedOn: d.say("Based on {0}").replace("{0}", DOC),
    answered: d.say("{0} of {1} answered").replace("{0}", String(CONTINUED.answered)).replace("{1}", String(CONTINUED.answered + CONTINUED.remaining)),
  };
  const whole = flat(plain(w.pieces.join("")));
  const check = (journey, ok, detail) => results.check("help", "help-stream/" + journey + "/" + lang, ok, detail);
  const talk = () => d.page.evaluate(readTalk, label);
  const answers = (t) => (t ? t.rows.filter((r) => !r.me) : []);
  const lastAnswer = (t) => answers(t).slice(-1)[0] || null;
  const lastQuestion = (t) => (t ? t.rows.filter((r) => r.me).slice(-1)[0] || null : null);
  // Reads the conversation until test holds or ms pass, and hands back the last read either way.
  const until = async (test, ms) => {
    const end = Date.now() + (ms || 5000);
    for (;;) {
      const t = await talk().catch(() => null);
      if (t && test(t)) return { ok: true, t };
      if (Date.now() > end) return { ok: false, t };
      await wait(40);
    }
  };
  const ask = async (text) => {
    await d.page.locator('textarea[aria-label="' + label.describe + '"]').fill(text);
    await d.page.locator('button[aria-label="' + label.send + '"]').click({ timeout: 8000 });
  };
  const streamCalls = (mark) => d.callsSince(mark).filter((c) => c.method === "POST" && c.path === ROUTE);
  const wholeCalls = (mark) => d.callsSince(mark).filter((c) => c.method === "POST" && c.path === WHOLE_ROUTE);
  // What a journey says when the page never asked the streaming route.
  const notStreamed = (mark) => wholeCalls(mark).length
    ? "the page sent the question to POST " + WHOLE_ROUTE + " and waited for the whole answer; it never asked " + ROUTE
    : "the page never asked " + ROUTE;
  const metaOf = (call) => ((call && Array.isArray(call.json) ? call.json : []).find((e) => e.event === "meta") || {}).data || {};
  // A fresh page, with nothing armed and nothing held.
  const fresh = async (holds) => {
    (holds || []).forEach((h) => h.release());
    stubs.setAgentStream(null);
    stubs.clearRefusals();
    await d.goto("help");
  };
  const shown = (t) => JSON.stringify(t ? t.rows.map((r) => (r.me ? "Q: " : "A: ") + flat(r.words) + (r.lines.length ? " | " + r.lines.map(flat).join(" | ") : "")) : null);

  await d.signIn("admin");
  await d.goto("help");

  // ---- the question goes to the streaming route, with what it has always carried ----------------
  {
    const mark = d.mark();
    let why = "";
    await d.contentBox().locator('input[type="file"]').setInputFiles({ name: "practice.png", mimeType: "image/png", buffer: PIXEL });
    const uploaded = await (async () => {
      const end = Date.now() + 8000;
      while (Date.now() < end) {
        if (d.callsSince(mark).some((c) => c.path === "/api/uploads")) return true;
        await wait(60);
      }
      return false;
    })();
    await wait(300);
    await ask(w.question);
    const first = await until((t) => !!lastAnswer(t) && lastAnswer(t).bold.length === 0 && flat(lastAnswer(t).words).indexOf("dashboard shows") >= 0, 8000);
    const upload = d.callsSince(mark).find((c) => c.path === "/api/uploads");
    const path0 = upload && upload.json ? upload.json.path : null;
    await ask(w.follow);
    await until((t) => answers(t).length >= 2 && flat(lastAnswer(t).words).indexOf("dashboard shows") >= 0, 8000);
    const calls = streamCalls(mark);
    const [one, two] = calls;
    const bodyIs = (c, want) => !!c && JSON.stringify(c.body) === JSON.stringify(want);
    const sentAs = (c) => !!c && c.query === "" && c.headers["content-type"] === "application/json"
      && c.headers.authorization === "Bearer audit-token-admin" && c.language === lang;
    const id0 = metaOf(one).conversationId;
    if (!uploaded || !path0) why = "the photo was not uploaded, so the question could not carry it";
    else if (!one) why = notStreamed(mark);
    else if (wholeCalls(mark).length) why = "the page also sent a question to POST " + WHOLE_ROUTE;
    else if (!bodyIs(one, { text: w.question, app: "dashboard", photoPaths: [path0] })) why = "the first question sent " + JSON.stringify(one.body);
    else if (!sentAs(one)) why = "the first question was sent with the query " + JSON.stringify(one.query) + " and the headers "
      + JSON.stringify({ "content-type": one.headers["content-type"], authorization: one.headers.authorization, "accept-language": one.language });
    else if (!two || !bodyIs(two, { text: w.follow, app: "dashboard", conversationId: id0 })) why = "the next question sent " + JSON.stringify(two ? two.body : null) + ", which is not the conversation " + JSON.stringify(id0);
    else if (!sentAs(two)) why = "the next question was sent without the headers the page has always sent";
    else if (!first.ok) why = "the answer did not arrive: " + shown(first.t);
    check("the-question-goes-to-the-streaming-route", !why, why);
    await fresh();
  }

  // ---- the first words come long before the last ----------------------------------------------------
  {
    const mark = d.mark();
    const s = { pieces: w.pieces, pause: 400, log: { wrote: [] } };
    stubs.setAgentStream(s);
    await d.page.evaluate((o) => {
      const t = window.__helpTiming = { sent: null, first: null, finished: null };
      const send = document.querySelector('button[aria-label="' + o.send + '"]');
      const area = send.parentElement.parentElement.firstElementChild;
      const look = () => {
        if (t.sent === null) return;
        const now = performance.now();
        const said = Array.from(area.children).filter((c) => c.style && c.style.flexDirection === "row").map((c) => c.innerText).join(" ").replace(/\s+/g, " ");
        if (t.first === null && said.indexOf(o.first) >= 0) t.first = Math.round(now - t.sent);
        const bold = Array.from(area.querySelectorAll("strong")).map((b) => b.textContent);
        if (t.finished === null && bold.indexOf(o.lastBold) >= 0 && said.indexOf(o.whole) >= 0) t.finished = Math.round(now - t.sent);
      };
      new MutationObserver(look).observe(area, { subtree: true, childList: true, characterData: true });
      document.addEventListener("click", (e) => {
        if (t.sent === null && e.target.closest && e.target.closest('button[aria-label="' + o.send + '"]')) t.sent = performance.now();
      }, true);
    }, { send: label.send, first: flat(w.pieces[0]), lastBold: w.bold[w.bold.length - 1], whole });
    await ask(w.question);
    const end = Date.now() + 15000;
    let at = null;
    while (Date.now() < end) {
      at = await d.page.evaluate(() => window.__helpTiming);
      if (at && at.finished !== null) break;
      await wait(100);
    }
    const streamed = streamCalls(mark).length > 0;
    const ok = streamed && at && at.first !== null && at.finished !== null && at.first + 2000 <= at.finished;
    check("the-first-words-come-before-the-last", ok,
      !streamed ? notStreamed(mark) + (at && at.finished !== null ? ", and the whole answer appeared at once, " + at.finished + " ms after Send" : "")
        : !at || at.finished === null ? "the finished answer never appeared: " + shown(await talk())
          : "the first words appeared " + at.first + " ms after Send and the finished answer " + at.finished + " ms after it");
    results.note("Help, " + lang + ", twelve pieces 400 ms apart: the first words " + (at && at.first !== null ? at.first + " ms" : "never")
      + " after Send, the finished answer " + (at && at.finished !== null ? at.finished + " ms" : "never")
      + (streamed ? ", read from " + ROUTE : ", read whole from " + WHOLE_ROUTE));
    await fresh();
  }

  // ---- no formatting mark while the answer arrives; the finished answer draws its bold -------------
  {
    const mark = d.mark();
    const h1 = stream.hold(), h2 = stream.hold();
    const pieces = w.pieces.slice(0, 2).concat([h1], w.pieces.slice(2, 11), [h2], w.pieces.slice(11));
    stubs.setAgentStream({ pieces });
    await ask(w.question);
    const moments = [];
    let why = "";
    const upTo = (n) => flat(plain(w.pieces.slice(0, n).join("")).replace(/\*$/, ""));
    if (!(await within(h1.reached, 6000))) why = notStreamed(mark);
    else {
      const one = await until((t) => !!lastAnswer(t) && flat(lastAnswer(t).words) === upTo(2), 4000);
      moments.push(one.t ? lastAnswer(one.t) : null);
      h1.release();
      if (!(await within(h2.reached, 4000))) why = "the answer stopped after its second piece";
      else {
        const two = await until((t) => !!lastAnswer(t) && flat(lastAnswer(t).words) === upTo(11), 4000);
        moments.push(two.t ? lastAnswer(two.t) : null);
        h2.release();
        const three = await until((t) => !!lastAnswer(t) && lastAnswer(t).bold.length === w.bold.length, 5000);
        moments.push(three.t ? lastAnswer(three.t) : null);
        const [m1, m2, m3] = moments;
        if (!one.ok) why = "with the bold phrase cut in two the answer read " + JSON.stringify(m1 && m1.words) + " where the plain words so far are " + JSON.stringify(upTo(2));
        else if (!two.ok) why = "with a lone * at the end the answer read " + JSON.stringify(m2 && m2.words) + " where the plain words so far are " + JSON.stringify(upTo(11));
        else if (!three.ok || JSON.stringify(m3.bold) !== JSON.stringify(w.bold) || flat(m3.words) !== whole) {
          why = "the finished answer read " + JSON.stringify(m3 && m3.words) + " with " + JSON.stringify(m3 && m3.bold) + " in bold";
        }
      }
    }
    moments.forEach((m, i) => {
      if (!m) return;
      results.note("Help, " + lang + ", " + ["with the bold phrase cut in two", "with a lone * at the end of a piece", "finished"][i] + ": "
        + JSON.stringify(flat(m.words)) + (m.bold.length ? ", in bold " + JSON.stringify(m.bold) : ", nothing in bold"));
    });
    check("marks-never-show-while-arriving", !why, why);
    await fresh([h1, h2]);
  }

  // ---- a reset takes back what was drawn -----------------------------------------------------------
  {
    const mark = d.mark();
    const h1 = stream.hold(), h2 = stream.hold();
    stubs.setAgentStream({ pieces: [w.first, h1, stream.RESET, w.again, h2] });
    await ask(w.question);
    let why = "";
    if (!(await within(h1.reached, 6000))) why = notStreamed(mark);
    else {
      const before = await until((t) => !!lastAnswer(t) && flat(lastAnswer(t).words) === flat(w.first), 4000);
      h1.release();
      await within(h2.reached, 4000);
      const after = await until((t) => !!lastAnswer(t) && flat(lastAnswer(t).words) === flat(w.again), 4000);
      h2.release();
      const done = await until((t) => !!lastAnswer(t) && flat(lastAnswer(t).words) === flat(w.again)
        && t.rows.every((r) => flat(r.words).indexOf(flat(w.first)) < 0), 4000);
      if (!before.ok) why = "before the reset the answer read " + shown(before.t);
      else if (!after.ok) why = "after the reset the answer read " + shown(after.t) + " where it should read " + JSON.stringify(flat(w.again)) + " alone";
      else if (!done.ok) why = "the finished answer read " + shown(done.t);
    }
    check("a-reset-clears-what-was-drawn", !why, why);
    await fresh([h1, h2]);
  }

  // ---- done is handled as the whole answer always was, key by key ---------------------------------
  {
    const mark = d.mark();
    stubs.setAgentStream({ pieces: [w.steps.slice(0, 9), w.steps.slice(9, 30), w.steps.slice(30)],
      done: { citedDocs: [DOC], degraded: true, noProcedure: true, formResponse: CONTINUED } });
    await ask(w.question);
    const fin = await until((t) => !!lastAnswer(t) && lastAnswer(t).bold.length === w.stepsBold.length, 8000);
    const a = fin.t ? lastAnswer(fin.t) : null;
    // A card's label is drawn in capitals, so the page is read without case.
    const page = fin.t ? fin.t.page.toLowerCase() : "";
    const composer = await d.page.locator('textarea[aria-label="' + label.describe + '"]').inputValue().catch(() => null);
    const one = streamCalls(mark)[0];
    const id0 = metaOf(one).conversationId;
    let why = "";
    if (!one) why = notStreamed(mark);
    else if (!fin.ok) why = "the finished answer never drew its bold: " + shown(fin.t);
    else if (JSON.stringify(a.steps) !== JSON.stringify(["1.", "2.", "3."])) why = "the reply's steps drew as " + JSON.stringify(a.steps);
    else if (JSON.stringify(a.bold) !== JSON.stringify(w.stepsBold)) why = "the reply's bold drew as " + JSON.stringify(a.bold);
    else if (a.lines.map(flat).indexOf(say.basedOn) < 0) why = "the documents it cites are not named under it: " + JSON.stringify(a.lines);
    else if (a.lines.map(flat).indexOf(say.degraded) < 0) why = "degraded is not said under it: " + JSON.stringify(a.lines);
    else if (a.border !== "rgb(231, 176, 23)") why = "noProcedure did not draw the answer in gold; its border is " + a.border;
    else if (page.indexOf(say.inProgress.toLowerCase()) < 0 || page.indexOf(CONTINUED.formName.toLowerCase()) < 0 || page.indexOf(say.answered.toLowerCase()) < 0) {
      why = "the report it continues is not in progress with " + JSON.stringify(say.answered) + ": " + JSON.stringify(flat(page).slice(0, 240));
    } else if (page.indexOf(say.unfinished.toLowerCase()) >= 0) why = "the report in progress is still listed among the unfinished reports";
    else if (composer !== "") why = "the box to type in still holds " + JSON.stringify(composer);
    if (!why) {
      const before = d.mark();
      await ask(w.follow);
      await until((t) => answers(t).length >= 2 && flat(lastAnswer(t).words).indexOf("dashboard shows") >= 0, 8000);
      const next = streamCalls(before)[0];
      if (!next || !next.body || next.body.conversationId !== id0) why = "the next question carried " + JSON.stringify(next && next.body) + " where the conversation is " + JSON.stringify(id0);
    }
    check("done-is-read-key-for-key", !why, why);
    await fresh();
  }

  // ---- a refusal before the stream opens reads as it always has ------------------------------------
  {
    const mark = d.mark();
    stubs.setRefusal({ method: "POST", path: ROUTE, status: 429, error: w.busy, once: true });
    await ask(w.question);
    const want = flat(say.notSent + " " + w.busy + " " + say.retry);
    const refused = await until((t) => !!lastQuestion(t) && lastQuestion(t).lines.map(flat).indexOf(want) >= 0, 6000);
    let why = "";
    if (!streamCalls(mark).length) why = notStreamed(mark);
    else if (!refused.ok) why = "the question reads " + shown(refused.t) + " where it should read " + JSON.stringify(want);
    else if (answers(refused.t).length) why = "an answer was drawn beside the refusal: " + shown(refused.t);
    else {
      // Retry sends the same question again, to the same route.
      const again = d.mark();
      await d.page.locator("button", { hasText: say.retry }).last().click({ timeout: 5000 });
      const answered = await until((t) => answers(t).length === 1 && flat(lastAnswer(t).words).indexOf("dashboard shows") >= 0, 8000);
      const re = streamCalls(again)[0];
      if (!re || !re.body || re.body.text !== w.question) why = "Retry sent " + JSON.stringify(re ? re.body : null);
      else if (!answered.ok || lastQuestion(answered.t).lines.length) why = "after Retry the conversation reads " + shown(answered.t);
    }
    // A session that has ended is refused before the stream opens too, and signs the person out.
    if (!why) {
      await fresh();
      stubs.setRefusal({ method: "POST", path: ROUTE, status: 401, error: "Invalid token", once: true });
      await ask(w.question);
      let out = false;
      for (let i = 0; i < 60 && !out; i += 1) { await wait(100); out = await d.signedOut(); }
      if (!out) why = "a 401 before the stream opens left the person signed in";
      await d.ensureSignedIn("admin");
    }
    check("a-refusal-before-the-stream-reads-as-today", !why, why);
    await fresh();
  }

  // ---- an error event reads as a refusal with the same status --------------------------------------
  {
    const mark = d.mark();
    const h = stream.hold();
    stubs.setAgentStream({ pieces: [w.first, h], error: { error: w.busy, status: 429 } });
    await ask(w.question);
    const want = flat(say.notSent + " " + w.busy + " " + say.retry);
    let why = "";
    if (!(await within(h.reached, 6000))) why = notStreamed(mark);
    else {
      const drawn = await until((t) => !!lastAnswer(t) && flat(lastAnswer(t).words) === flat(w.first), 4000);
      h.release();
      const refused = await until((t) => !!lastQuestion(t) && lastQuestion(t).lines.map(flat).indexOf(want) >= 0 && answers(t).length === 0, 5000);
      if (!drawn.ok) why = "the words before the error were not drawn: " + shown(drawn.t);
      else if (!refused.ok) why = "after the error the conversation reads " + shown(refused.t) + " where the question should read " + JSON.stringify(want) + " with no answer beside it";
    }
    check("an-error-event-reads-as-a-refusal", !why, why);
    await fresh([h]);
  }

  // ---- a dropped connection reads the stored answer back -------------------------------------------
  const dropped = async (reads) => {
    const mark = d.mark();
    stubs.setAgentStream({ pieces: w.pieces.slice(0, 2), drop: true, storedAfterReads: reads,
      done: { reply: w.pieces.join(""), citedDocs: [DOC] } });
    await ask(w.question);
    const partial = flat(plain(w.pieces.slice(0, 2).join("")));
    const one = streamCalls(mark)[0];
    const id0 = metaOf(one).conversationId;
    const hasLine = (a) => !!a && a.lines.map(flat).some((l) => l.indexOf(say.dropped) === 0);
    const hasTry = (a) => !!a && a.buttons.indexOf(say.tryAgain) >= 0;
    const stored = (a) => !!a && JSON.stringify(a.bold) === JSON.stringify(w.bold) && flat(a.words) === whole;
    return { mark, one, id0, partial, hasLine, hasTry, stored };
  };
  {
    const r = await dropped(0);
    const back = await until((t) => r.stored(lastAnswer(t)) && r.hasLine(lastAnswer(t)), 8000);
    const a = back.t ? lastAnswer(back.t) : null;
    const reads = d.callsSince(r.mark).filter((c) => c.method === "GET" && c.path === "/api/agent/conversations/" + encodeURIComponent(r.id0 || ""));
    let why = "";
    if (!r.one) why = notStreamed(r.mark);
    else if (!back.ok) why = "after the connection dropped the conversation reads " + shown(back.t);
    else if (reads.length !== 1) why = "the conversation " + JSON.stringify(r.id0) + " was read back " + reads.length + " times";
    else if (r.hasTry(a)) why = "Try again is offered beside an answer that is already there";
    else if (a.lines.map(flat).indexOf(say.basedOn) < 0) why = "the stored answer lost the documents it cites: " + JSON.stringify(a.lines);
    check("a-dropped-connection-reads-the-answer-back", !why, why);
    await fresh();
  }
  {
    const r = await dropped(1);
    let why = "";
    const waiting = await until((t) => { const a = lastAnswer(t); return !!a && r.hasLine(a) && r.hasTry(a) && flat(a.words) === r.partial; }, 8000);
    if (!r.one) why = notStreamed(r.mark);
    else if (!waiting.ok) why = "with the answer not stored yet the conversation reads " + shown(waiting.t);
    else {
      await d.page.locator("button", { hasText: say.tryAgain }).last().click({ timeout: 5000 });
      const back = await until((t) => r.stored(lastAnswer(t)) && !r.hasTry(lastAnswer(t)), 6000);
      const reads = d.callsSince(r.mark).filter((c) => c.method === "GET" && c.path === "/api/agent/conversations/" + encodeURIComponent(r.id0 || ""));
      if (!back.ok) why = "after Try again the conversation reads " + shown(back.t);
      else if (reads.length !== 2) why = "the conversation was read back " + reads.length + " times, where Try again makes it two";
      else {
        const before = d.mark();
        await ask(w.follow);
        await until((t) => answers(t).length >= 2 && flat(lastAnswer(t).words).indexOf("dashboard shows") >= 0, 8000);
        const next = streamCalls(before)[0];
        if (!next || !next.body || next.body.conversationId !== r.id0) why = "the next question carried " + JSON.stringify(next && next.body) + " where the conversation is " + JSON.stringify(r.id0);
      }
    }
    check("try-again-reads-it-back-again", !why, why);
    await fresh();
  }

  // ---- a screen reader hears the finished answer once ----------------------------------------------
  {
    const mark = d.mark();
    const h = stream.hold();
    stubs.setAgentStream({ pieces: w.pieces.slice(0, 5).concat([h], w.pieces.slice(5)) });
    const before = await talk();
    const regions = before ? before.live.length : 0;
    let why = "";
    if (regions === 1) {
      await d.page.evaluate(() => {
        const box = document.querySelector("div[style*='padding: 16px 24px 30px']") || document.body;
        const el = box.querySelector("[aria-live], [role=status], [role=alert], [role=log]");
        const heard = window.__helpHeard = [];
        new MutationObserver(() => {
          const v = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (v && heard[heard.length - 1] !== v) heard.push(v);
        }).observe(el, { subtree: true, childList: true, characterData: true });
      });
    }
    await ask(w.question);
    if (!(await within(h.reached, 6000))) why = notStreamed(mark);
    else if (regions !== 1) why = "the page has " + regions + " live regions where it should have one";
    else {
      const mid = await until((t) => !!lastAnswer(t) && flat(lastAnswer(t).words).length > 0, 4000);
      h.release();
      const fin = await until((t) => !!lastAnswer(t) && lastAnswer(t).bold.length === w.bold.length, 6000);
      await wait(400);
      const heard = await d.page.evaluate(() => window.__helpHeard || []);
      const quiet = mid.t && mid.t.live.length === 1 && flat(mid.t.live[0].text) === "";
      if (!mid.ok || !quiet) why = "while the answer arrived the live region said " + JSON.stringify(mid.t && mid.t.live.map((x) => flat(x.text)));
      else if (mid.t.talkIsLive || mid.t.live[0].holdsTalk) why = "the conversation itself is live, so every piece is read out as it lands";
      else if (!fin.ok) why = "the finished answer never appeared: " + shown(fin.t);
      else if (heard.length !== 1 || heard[0] !== whole) why = "the live region said " + JSON.stringify(heard) + " where it should say the finished answer once: " + JSON.stringify(whole);
    }
    check("a-screen-reader-hears-the-answer-once", !why, why);
    await fresh([h]);
  }
}

module.exports = { run, SAY };
