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
"use strict";

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
      const bad = { fits: [], talk: [], list: [], empty: [] };
      const d = await createDriver({ browser, origin, stubs, viewport: "wide", theme, textSize: size, lang });
      const words = { send: d.say("Send"), resume: d.say("Resume"), empty: d.say("Tell me what happened and I will tell you what to do.") };
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
      } finally {
        await d.close();
      }
      const say = (list) => list.slice(0, 3).join("; ") + (list.length > 3 ? "; and " + (list.length - 3) + " more" : "");
      results.check("help", "help/fits-the-window/" + tag, bad.fits.length === 0, say(bad.fits));
      results.check("help", "help/conversation-scrolls-inside/" + tag, bad.talk.length === 0, say(bad.talk));
      results.check("help", "help/reports-list-stops-at-three-rows/" + tag, bad.list.length === 0, say(bad.list));
      results.check("help", "help/empty-line-in-the-middle/" + tag, bad.empty.length === 0, say(bad.empty));
    }
  } finally {
    serve(theirs);
    delete stubs.fixtures.AGENT_CONVERSATIONS[TALK];
  }
  results.note("Help read " + reads + " times, at 1024 and 1280 by 660 and 900, at every text size, in both themes and both languages");
}

module.exports = { run, SIZES, TEXT_SIZES, STATES };
