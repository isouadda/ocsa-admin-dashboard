// Help fits the window.
//
// The Help page is the height of the window below the top bar and no taller, at 1024 and 1280 wide,
// at 660 and 900 high, at every text size, in both themes and both languages. The page itself never
// scrolls: its scroll height is the window's height. The box to type in, Add a photo and Send end
// inside the window. The conversation scrolls inside its own area, the unfinished reports list stops at
// three rows and scrolls inside itself past that, and an empty conversation's line sits in the middle
// of its area.
//
// Each theme, text size and language is one pass, signed in once as the admin. A pass reads the page
// in four states at each of the four window sizes: the one unfinished report the suite always serves,
// five of them, a report resumed with thirty messages in it, and five reports with that report resumed.
//
// Then an answer arrives with the five reports above it, which leaves the conversation the least room.
// The answer is held part way, and one more piece arrives at each window size before the page is read:
// the page still fits, and the newest words are inside the conversation, drawn without a mark. Once
// the answer is finished the page is read again at every size.
"use strict";
const stream = require("../stream");

const SIZES = [[1024, 660], [1280, 660], [1024, 900], [1280, 900]];
const TEXT_SIZES = ["standard", "large", "xlarge", "largest"];
const THEMES = ["dark", "light"];
const LANGS = ["en", "es"];

// Invented reports and an invented conversation.
const report = (i, conversationId) => ({ id: "hf-" + i, formName: "Practice report " + i, answered: i, remaining: 0, status: "draft", conversationId });
const TALK = "hf-talk";
const THIRTY = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user",
  text: "Practice message " + (i + 1) + ". The mop bucket by the east stairs needs a new wringer before the night round." }));
const FIVE = [1, 2, 3, 4, 5].map((i) => report(i));
const STATES = [
  { name: "one report", reports: null, empty: true },
  { name: "five reports", reports: FIVE, empty: true, many: true },
  { name: "thirty messages", reports: [report(9, TALK)], resume: true },
  { name: "five reports and thirty messages", reports: [report(9, TALK)].concat(FIVE), resume: true, many: true },
];
// An invented answer long enough to fill a small conversation, in five pieces: most of it first, then
// one piece for each window size, with a bold phrase cut between two of them.
const ASKED = {
  en: "How do I clean up a spill of floor cleaner?",
  es: "\u00bfC\u00f3mo limpio un derrame de limpiador de pisos?",
};
const ANSWER = {
  en: ["To clean up a spill of floor cleaner, first keep people away from it and put a wet floor sign on each side. "
    + "Put on gloves before you touch anything. Soak up the liquid with the pads from the spill kit, working from the "
    + "edges toward the middle so it does not spread. ",
  "Then write it up: open Forms and choose **Spill re", "port**. Say where it happened, what spilled and how much. ",
  "Add a photo of the spot once it is clean. ", "Press **Submit report** when every question is answered."],
  es: ["Para limpiar un derrame de limpiador de pisos, primero mantenga a las personas lejos y ponga un letrero de piso "
    + "mojado a cada lado. P\u00f3ngase guantes antes de tocar nada. Absorba el l\u00edquido con las almohadillas del kit de "
    + "derrames, desde los bordes hacia el centro para que no se extienda. ",
  "Luego inf\u00f3rmelo: abra Formularios y elija **Informe de de", "rrame**. Diga d\u00f3nde ocurri\u00f3, qu\u00e9 se derram\u00f3 y cu\u00e1nto. ",
  "Agregue una foto del lugar ya limpio. ", "Pulse **Enviar el informe** cuando todas las preguntas tengan respuesta."],
};
// The words an answer shows while it arrives: no ** anywhere, and a * at the very end held back.
const arrived = (pieces) => pieces.join("").replace(/\*\*/g, "").replace(/\*$/, "").replace(/\s+/g, " ").trim();

// One read of the page, in the window's own pixels. The send box is the row the Send button sits in,
// the conversation card holds that row, and the conversation area is the card's first child. An
// unfinished report is a row with a Resume button in it, and the list is what holds the rows.
function measure(w) {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
  const send = document.querySelector('button[aria-label="' + w.send + '"]');
  const row = send ? send.parentElement : null;
  const card = row ? row.parentElement : null;
  const area = card ? card.firstElementChild : null;
  const resumes = Array.from(document.querySelectorAll("button")).filter((b) => (b.textContent || "").trim() === w.resume);
  const rows = resumes.map((b) => b.parentElement);
  const list = rows.length ? rows[0].parentElement : null;
  const empty = area ? Array.from(area.children).find((c) => (c.textContent || "").trim() === w.empty) : null;
  // The answer is the last row that runs left to right, and its words are in the box with the padding.
  const answers = area ? Array.from(area.children).filter((c) => c.style && c.style.flexDirection === "row") : [];
  const last = answers[answers.length - 1];
  const bubble = last && last.firstElementChild
    ? Array.from(last.firstElementChild.children).find((k) => (k.getAttribute("style") || "").indexOf("padding: 8px 12px") >= 0) : null;
  return {
    inner: window.innerHeight,
    scroll: document.scrollingElement.scrollHeight,
    send: box(row),
    area: area ? Object.assign(box(area), { client: area.clientHeight, scrolls: area.scrollHeight > area.clientHeight }) : null,
    rows: rows.length,
    threeRows: rows.slice(0, 3).reduce((n, r) => n + r.getBoundingClientRect().height, 0),
    list: list ? Object.assign(box(list), { scrolls: list.scrollHeight > list.clientHeight }) : null,
    resume: box(resumes[0]),
    empty: box(empty),
    newest: box(bubble),
    words: bubble ? (bubble.innerText || "").replace(/\s+/g, " ").trim() : "",
    bold: bubble ? bubble.querySelectorAll("strong").length : 0,
  };
}

const px = (n) => Math.round(n);

async function run(ctx) {
  const { browser, origin, stubs, results, createDriver } = ctx;
  const langOnly = (process.env.AUDIT_LANG || "").trim();
  const theirs = stubs.fixtures.AGENT_DRAFTS.slice();
  const serve = (list) => stubs.fixtures.AGENT_DRAFTS.splice(0, stubs.fixtures.AGENT_DRAFTS.length, ...list);
  stubs.fixtures.AGENT_CONVERSATIONS[TALK] = THIRTY;
  let reads = 0;
  try {
    for (const theme of THEMES) for (const size of TEXT_SIZES) for (const lang of LANGS) {
      if (langOnly && lang !== langOnly) continue;
      const tag = size + "/" + theme + "/" + lang;
      process.stdout.write("run        help-fit at 1024 and 1280 by 660 and 900 in " + theme + ", text " + size + (lang === "en" ? "" : ", in " + lang) + "\n");
      const bad = { fits: [], talk: [], list: [], empty: [], newest: [] };
      const d = await createDriver({ browser, origin, stubs, viewport: "wide", theme, textSize: size, lang });
      const words = { send: d.say("Send"), resume: d.say("Resume"), empty: d.say("Tell me what happened and I will tell you what to do."),
        describe: d.say("Describe what happened") };
      // The page as it stands, read once the window has its size and the page has drawn into it.
      const read = async () => {
        await d.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        reads += 1;
        return d.page.evaluate(measure, words);
      };
      const fitsAt = (m, at) => {
        const fits = m.scroll === m.inner && m.send && m.send.bottom <= m.inner;
        if (!fits) bad.fits.push(at + ": the page is " + m.scroll + " high in a window " + m.inner + " high, and the send box ends at " + (m.send ? px(m.send.bottom) : "nowhere"));
        if (!(m.list && m.list.height <= m.threeRows + 1 && m.list.scrolls)) {
          bad.list.push(at + ": " + (m.list ? "the list is " + px(m.list.height) + " high, three rows are " + px(m.threeRows) + (m.list.scrolls ? "" : ", and it does not scroll") : "no list"));
        }
      };
      try {
        await d.signIn("admin");
        for (const st of STATES) {
          serve(st.reports || theirs);
          await d.page.setViewportSize({ width: 1280, height: 900 });
          await d.goto("help");
          if (st.resume) {
            // A page that has pushed the list out of sight cannot be resumed from, which is a page that
            // does not fit, and is counted as one.
            const name = st.reports[0].formName;
            const row = d.page.locator("div", { hasText: name }).filter({ has: d.page.getByRole("button", { name: words.resume }) }).last();
            const resumed = await row.getByRole("button", { name: words.resume }).click({ timeout: 5000 }).then(() => true, () => false);
            if (!resumed) { bad.fits.push("1280x900, " + st.name + ": the report's Resume button cannot be pressed, so the report was not resumed"); continue; }
            await d.settle(300);
          }
          for (const [w, h] of SIZES) {
            await d.page.setViewportSize({ width: w, height: h });
            await d.page.waitForTimeout(120);
            await d.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
            const m = await d.page.evaluate(measure, words);
            reads += 1;
            const at = w + "x" + h + ", " + st.name;
            const fits = m.scroll === m.inner && m.send && m.send.bottom <= m.inner;
            if (!fits) bad.fits.push(at + ": the page is " + m.scroll + " high in a window " + m.inner + " high, and the send box ends at " + (m.send ? px(m.send.bottom) : "nowhere"));
            // With no report resumed the page has room for the first report, and its Resume button has
            // to be whole inside the list and the window, where a person can press it.
            if (!st.resume && m.rows > 0) {
              const r = m.resume, l = m.list;
              if (!(r && l && r.top >= l.top - 0.5 && r.bottom <= l.bottom + 0.5 && r.bottom <= m.inner)) bad.fits.push(at + ": the first report's Resume button is out of sight");
            }
            if (st.resume && !(m.area && m.area.scrolls)) bad.talk.push(at + ": thirty messages " + (m.area ? "fit their area " + px(m.area.height) + " high without scrolling" : "have no area"));
            if (st.many && !(m.list && m.list.height <= m.threeRows + 1 && m.list.scrolls)) {
              bad.list.push(at + ": " + (m.list ? "the list is " + px(m.list.height) + " high, three rows are " + px(m.threeRows) + (m.list.scrolls ? "" : ", and it does not scroll") : "no list"));
            }
            if (st.empty) {
              const off = m.empty && m.area ? Math.abs((m.empty.top + m.empty.bottom) / 2 - (m.area.top + m.area.bottom) / 2) : null;
              if (off === null || off > 1) bad.empty.push(at + ": " + (off === null ? "no empty line" : "the line is " + px(off) + " off the middle of its area"));
            }
          }
        }

        // An answer arriving with five reports above it, and then finished.
        serve(FIVE);
        await d.page.setViewportSize({ width: 1280, height: 900 });
        await d.goto("help");
        const pieces = ANSWER[lang];
        const holds = pieces.map(() => stream.hold());
        stubs.setAgentStream({ pieces: [].concat(...pieces.map((x, i) => [x, holds[i]])) });
        try {
          await d.page.locator('textarea[aria-label="' + words.describe + '"]').fill(ASKED[lang]);
          await d.page.locator('button[aria-label="' + words.send + '"]').click({ timeout: 8000 });
          if (!(await Promise.race([holds[0].reached, d.page.waitForTimeout(8000).then(() => false)]))) {
            bad.newest.push("the answer never began to arrive");
          } else {
            for (let i = 0; i < SIZES.length; i += 1) {
              const [w, h] = SIZES[i];
              const at = w + "x" + h + ", an answer arriving";
              await d.page.setViewportSize({ width: w, height: h });
              await d.page.waitForTimeout(120);
              holds[i].release();
              await Promise.race([holds[i + 1].reached, d.page.waitForTimeout(4000)]);
              const want = arrived(pieces.slice(0, i + 2));
              await d.page.waitForFunction((x) => {
                const rows = Array.from(document.querySelectorAll("div[style*='flex-direction: row;']"));
                return rows.some((r) => (r.innerText || "").replace(/\s+/g, " ").trim().indexOf(x) >= 0);
              }, want, { timeout: 4000 }).catch(() => {});
              const m = await read();
              fitsAt(m, at);
              if (!m.newest || m.words !== want) bad.newest.push(at + ": the answer reads " + JSON.stringify(m.words.slice(-60)) + " where the words so far end " + JSON.stringify(want.slice(-60)));
              else if (!(m.area && m.newest.bottom <= m.area.bottom + 1 && m.newest.bottom >= m.area.top)) {
                bad.newest.push(at + ": the newest words end at " + px(m.newest.bottom) + ", outside the conversation, which runs from " + (m.area ? px(m.area.top) + " to " + px(m.area.bottom) : "nowhere"));
              }
            }
            holds[SIZES.length].release();
            await d.page.waitForTimeout(400);
            for (const [w, h] of SIZES) {
              await d.page.setViewportSize({ width: w, height: h });
              await d.page.waitForTimeout(120);
              const m = await read();
              const at = w + "x" + h + ", an answer finished";
              fitsAt(m, at);
              if (!m.newest || m.bold !== 2) bad.newest.push(at + ": the finished answer draws " + (m.newest ? m.bold + " bold phrases where it has 2" : "nothing"));
            }
          }
        } finally {
          holds.forEach((x) => x.release());
          stubs.setAgentStream(null);
        }
      } finally {
        await d.close();
      }
      const say = (list) => list.slice(0, 3).join("; ") + (list.length > 3 ? "; and " + (list.length - 3) + " more" : "");
      results.check("help", "help/fits-the-window/" + tag, bad.fits.length === 0, say(bad.fits));
      results.check("help", "help/conversation-scrolls-inside/" + tag, bad.talk.length === 0, say(bad.talk));
      results.check("help", "help/reports-list-stops-at-three-rows/" + tag, bad.list.length === 0, say(bad.list));
      results.check("help", "help/empty-line-in-the-middle/" + tag, bad.empty.length === 0, say(bad.empty));
      results.check("help", "help/newest-words-in-sight/" + tag, bad.newest.length === 0, say(bad.newest));
    }
  } finally {
    serve(theirs);
    delete stubs.fixtures.AGENT_CONVERSATIONS[TALK];
  }
  results.note("Help read " + reads + " times, at 1024 and 1280 by 660 and 900, at every text size, in both themes and both languages, "
    + "an answer arriving and finished among them");
}

module.exports = { run, SIZES, TEXT_SIZES, STATES };
