// Messages, tagging, announcements and My alerts, Step 181 (45db9a8), in English and in Spanish at 1280.
//
// Messages lists the general chat and every site chat GET /api/chat/channels answers above the private
// conversations, each with the unreadCount the API sent, and the side panel draws their total, summed
// over that route, on the Messages item whether the panel is open or collapsed. Opening a chat posts
// its read route, and its count and the total drop. In a site chat or the general chat the tag button
// or a typed @ opens Tag someone, which lists the people the members route answers in 44 pixel rows and
// narrows them by a search; a pick puts @Name in the text, the send carries the ids as mentions, and
// each tagged name is drawn bold. A send that fails keeps the text and says so, and a chat that does
// not load says so. Under 700 pixels the list and the conversation stack, with Back. Announcements, for
// a holder of send_announcements, lists what was sent, draws how many people an audience reaches from
// the preview route as the choice changes, sends the title, the message and the audience, and draws
// nothing while the API lists none. The bell opens a chat notice and a tag on their chat and an
// announcement on its page. My alerts, in the name menu and the phone's More menu once GET
// /api/notifications/settings answers, shows those settings and saves each change as a PATCH of its
// own. The stub answers each route the way ocsa-api's Step 179 routes do. A failed load already said
// so before this build, so that one case holds at its parent. The words are written out here by hand,
// so a wrong entry in the table turns a case red.
"use strict";

const SIDEBAR = "div[style*='position: fixed'][style*='border-right']";
const MODAL = "div[style*='z-index: 500']";

// What the screens have to say, by hand.
const WORDS = {
  en: {
    messages: "Messages", channels: "Channels", privateConvos: "Private conversations", generalChat: "General chat", siteChannel: "Site channel",
    unread: "{0} unread messages", tag: "Tag someone", typeMessage: "Type a message", send: "Send", back: "Back", close: "Close",
    notSent: "Your message did not send.", notLoaded: "Messages did not load.", yourMessages: "Your messages",
    announcements: "Announcements", newAnnouncement: "New announcement", title: "Title", message: "Message", sendTo: "Send to",
    everyone: "Everyone", oneSite: "One site's people", aRole: "A role", chosen: "Chosen people", site: "Site", role: "Role",
    reaches: "Reaches {0} people, {1} with phone alerts on.", sendAnnouncement: "Send announcement",
    writtenOnce: "Written once; each person gets it in their language.", sent: "Sent", announcementSent: "Announcement sent.",
    by: "By: {0}", forAdmins: "This page is for admins.", notDrawn: "This did not load.", lead: "Custodial Lead",
    myAlerts: "My alerts", alertsLine: "These decide what buzzes your phone in the staff app. The bell here keeps everything.",
    chatMessages: "Chat messages", every: "Every message", mentionsOnly: "Only when I'm tagged", off: "Off",
    switches: { schedule: "Schedule and time off", pickups: "Shift pickups and drops", supplies: "Supply requests", issues: "Problems reported", forms: "Forms filed" },
    notSaved: "Your settings did not save.", notifications: "Notifications", more: "More",
  },
  es: {
    messages: "Mensajes", channels: "Canales", privateConvos: "Conversaciones privadas", generalChat: "Chat general", siteChannel: "Canal del sitio",
    unread: "{0} mensajes sin leer", tag: "Etiquetar a alguien", typeMessage: "Escriba un mensaje", send: "Enviar", back: "Volver", close: "Cerrar",
    notSent: "Su mensaje no se envi\u00f3.", notLoaded: "Los mensajes no se cargaron.", yourMessages: "Sus mensajes",
    announcements: "Anuncios", newAnnouncement: "Nuevo anuncio", title: "T\u00edtulo", message: "Mensaje", sendTo: "Enviar a",
    everyone: "Todos", oneSite: "El personal de un sitio", aRole: "Un rol", chosen: "Personas elegidas", site: "Sitio", role: "Rol",
    reaches: "Llega a {0} personas, {1} con alertas en el tel\u00e9fono.", sendAnnouncement: "Enviar anuncio",
    writtenOnce: "Se escribe una vez; cada persona lo recibe en su idioma.", sent: "Enviados", announcementSent: "Anuncio enviado.",
    by: "Por: {0}", forAdmins: "Esta p\u00e1gina es para administradores.", notDrawn: "Esto no se carg\u00f3.", lead: "L\u00edder de limpieza",
    myAlerts: "Mis alertas", alertsLine: "Esto decide lo que suena en su tel\u00e9fono en la aplicaci\u00f3n del personal. La campana aqu\u00ed guarda todo.",
    chatMessages: "Mensajes del chat", every: "Cada mensaje", mentionsOnly: "Solo cuando me etiquetan", off: "Apagado",
    switches: { schedule: "Horario y tiempo libre", pickups: "Turnos libres y turnos soltados", supplies: "Pedidos de suministros", issues: "Problemas reportados", forms: "Formularios presentados" },
    notSaved: "Sus ajustes no se guardaron.", notifications: "Avisos", more: "M\u00e1s",
  },
};

// The unread counts the case gives the chats before it signs in.
// hand: the general chat 3, the first site's chat 2 and Tomasz's private chat 1, which the side panel
// adds up to 6 over everything GET /api/chat/channels lists. Opening the site's chat reads its 2, which
// leaves 4.
const UNREAD = { "ch-general": 3, "ch-1": 2, "dm-1": 1 };
const TOTAL = 6;
const AFTER_READ = 4;
// The chats above the private conversations, in the order the API lists them, each with the word
// under its name and the count it draws; then the private conversations with theirs.
const CHATS = [
  { name: "General", kind: "generalChat", unread: "3" },
  { name: "Harbor Point Center", kind: "siteChannel", unread: "2" },
  { name: "Lakeside Medical Plaza", kind: "siteChannel", unread: null },
  { name: "Riverbend Logistics Hub", kind: "siteChannel", unread: null },
];
const PRIVATE = [{ name: "Tomasz Wisniewski", unread: "1" }, { name: "Ngozi Okonkwo", unread: null }];
const SITE_CHAT = "Harbor Point Center";
// hand: whom the first site's chat may tag, Dana left out of her own list: Marcus, Priya and Oyelaran
// manage every site, Oyelaran and Elena are assigned there, the test account assigned there is left
// out, and Tomasz and Yuki have a shift open there. Six people, by name.
const MEMBERS = ["Elena Barbosa", "Marcus Ferreira", "Oyelaran Adebayo", "Priya Raghunathan", "Tomasz Wisniewski", "Yuki Tanabe"];
// hand: the three of the six whose name holds "an".
const SEARCH = "an";
const SEARCHED = ["Oyelaran Adebayo", "Priya Raghunathan", "Yuki Tanabe"];
// The two people the case tags, in the order it picks them, and what it types between them.
const TAGS = [{ id: "u-staff-7", name: "Elena Barbosa" }, { id: "u-staff-5", name: "Tomasz Wisniewski" }];
const TYPED = { en: "please check the dock door.", es: "revise la puerta del muelle, por favor." };
// What the case tries to send while the send fails.
const RETRY = { en: "Is the dock door fixed yet?", es: "\u00bfYa arreglaron la puerta del muelle?" };
// The general chat's first message, which tags Yuki, as the stub serves it.
const GENERAL_TAGGED = { text: "@Yuki Tanabe the south stairwell needs a second pass tonight.", tag: "@Yuki Tanabe" };

// hand: how many people each audience reaches and how many of them have a phone on. An audience is
// every active account that is not a test account: the 12 staff rows less the pending one, the
// inactive one and the test account, 9 people, of whom Marcus, Tomasz, Elena and Yuki have a phone on.
// Everyone: 9 and 4. The second site's people are Marcus, Tomasz and Rashid, the pending person
// assigned there left out: 3, two of them with a phone. The custodial leads are Tomasz and Yuki: 2 and
// 2. Ngozi and Yuki: 2, Yuki with a phone.
const PREVIEWS = [
  { choice: "everyone", query: "?type=all", counts: [9, 4] },
  { choice: "oneSite", site: "Lakeside Medical Plaza", query: "?type=site&siteId=s-2", counts: [3, 2] },
  { choice: "aRole", role: "lead", query: "?type=role&role=custodial_lead", counts: [2, 2] },
  { choice: "chosen", people: ["Ngozi Okonkwo", "Yuki Tanabe"], query: "?type=users&userIds=u-staff-6%2Cu-staff-9", counts: [2, 1] },
];
// The two announcements the stub lists, newest first, with what each row draws beside its title.
// hand: the first went to the third site's 3 people, one of them with a phone on; the second to
// everyone, 9 people, 4 with a phone on.
const LISTED = [
  { id: "an-2", audience: "Riverbend Logistics Hub", by: "Dana Whitlock", counts: [3, 1] },
  { id: "an-1", audience: null, by: "Oyelaran Adebayo", counts: [9, 4] },
];
// The older one as the stub holds it in each language, which the bell opens.
const AN1 = {
  en: { title: "New floor pads arrive Monday", body: "Pick yours up from the supply room at the start of your shift." },
  es: { title: "Las almohadillas nuevas llegan el lunes", body: "Recoja las suyas en el cuarto de suministros al empezar su turno." },
};
// What the case writes and sends to Ngozi and Yuki.
const WRITTEN = {
  en: { title: "Night crew meeting moved", body: "The Thursday meeting starts at 10 PM in the North Wing break room." },
  es: { title: "Cambio de la reuni\u00f3n del turno de noche", body: "La reuni\u00f3n del jueves empieza a las 10 PM en la sala de descanso del Ala norte." },
};
// The chat notice and the tag notice the bell holds, titled the way the API titles each in each
// language: one notice for three new messages in the general chat, and Marcus tagging Dana.
const CHAT_NOTICE = { en: "3 new messages in General", es: "3 mensajes nuevos en General" };
const TAGGED_NOTICE = { en: "Marcus Ferreira tagged you in Harbor Point Center", es: "Menci\u00f3n de Marcus Ferreira en Harbor Point Center" };
// Each change the case makes in My alerts, in order, and the one body each sends.
const CHANGES = [
  { press: "mentionsOnly", body: { chat: "mentions" } },
  { flip: "supplies", body: { supplies: false } },
  { flip: "forms", body: { forms: false } },
  { flip: "supplies", body: { supplies: true } },
  { press: "every", body: { chat: "all" } },
];

const fill = (s, ...v) => String(s).replace(/\{(\d+)\}/g, (m, i) => String(v[Number(i)]));
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The list of chats on Messages as the browser drew it, top to bottom: each heading, and each row with
// its name, the line under the name and the unread count it draws, or null for none. Null when the
// heading over the private conversations is not on screen.
const chatList = (d, heading) => d.page.evaluate((h) => {
  const head = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && x.offsetParent !== null && (x.textContent || "").trim() === h);
  const list = head && head.parentElement;
  if (!list) return null;
  return Array.from(list.children).map((el) => {
    if (el.tagName !== "BUTTON") return { heading: (el.textContent || "").trim() };
    const info = el.children[1];
    const lines = info ? Array.from(info.children) : [];
    const first = lines[0] ? lines[0].querySelector("span") : null;
    const second = lines[1] ? Array.from(lines[1].querySelectorAll("span")) : [];
    const pill = second.find((sp, i) => i > 0 && /^\d+$/.test((sp.textContent || "").trim()));
    return { name: first ? first.textContent.trim() : "", sub: second[0] ? second[0].textContent.trim() : "", unread: pill ? pill.textContent.trim() : null };
  });
}, heading);
const rowsOf = (list) => (list || []).filter((x) => x.name !== undefined);

// The count the side panel draws on the Messages item and the name the count carries, whether the
// panel is open or collapsed to its icons.
const panelCount = (d, label) => d.page.evaluate(([sel, l]) => {
  const sb = document.querySelector(sel);
  if (!sb) return null;
  const item = Array.from(sb.querySelectorAll("button")).find((b) => b.getAttribute("title") === l
    || Array.from(b.querySelectorAll("span")).some((sp) => sp.children.length === 0 && (sp.textContent || "").trim() === l));
  if (!item) return { item: false, collapsed: sb.getBoundingClientRect().width < 100, text: null, name: null };
  const badge = item.querySelector("span[aria-label]");
  return { item: true, collapsed: sb.getBoundingClientRect().width < 100, text: badge ? badge.textContent.trim() : null, name: badge ? badge.getAttribute("aria-label") : null };
}, [SIDEBAR, label]);
const panelSays = (p) => (!p ? "no side panel" : !p.item ? "no Messages item" : p.text === null ? "no count on Messages" : JSON.stringify(p.text) + " named " + JSON.stringify(p.name));

// Presses the row of the list whose name is this, the way a person picks a chat.
const openChat = async (d, name) => {
  const hit = await d.page.evaluate((n) => {
    const row = Array.from(document.querySelectorAll("button")).find((b) => b.offsetParent !== null && !b.closest("[data-tag-picker]") && !b.closest("[role=dialog]")
      && Array.from(b.querySelectorAll("span")).some((sp) => sp.children.length === 0 && (sp.textContent || "").trim() === n));
    if (!row) return false;
    row.click();
    return true;
  }, name);
  await d.settle(600);
  return hit;
};

// The open conversation, read off the pane that holds the message box: the words its header draws,
// the messages as drawn and what the box holds. Null with no conversation open.
const talk = (d, typeWord) => d.page.evaluate((tw) => {
  const input = Array.from(document.querySelectorAll("input")).find((i) => i.offsetParent !== null && (i.getAttribute("aria-label") === tw || i.getAttribute("placeholder") === tw));
  const pane = input && input.parentElement && input.parentElement.parentElement;
  if (!pane) return null;
  const head = pane.firstElementChild;
  const area = pane.children[1];
  return { head: head ? (head.innerText || "").replace(/\s+/g, " ").trim() : "", text: area ? (area.innerText || "") : "", value: input.value };
}, typeWord);

// Every tagged name drawn in a message: its text, how bold it is and the whole message it sits in.
const tagsDrawn = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("span"))
  .filter((sp) => sp.children.length === 0 && sp.offsetParent !== null && /^@\S/.test((sp.textContent || "").trim()) && !sp.closest("[data-tag-picker]") && !sp.closest("button"))
  .map((sp) => ({ text: sp.textContent.trim(), weight: Number(getComputedStyle(sp).fontWeight) || 0, message: (sp.parentElement.textContent || "").trim() })));

// Tag someone: its name and each row's name and height, or null when it is not open.
const picker = (d) => d.page.evaluate(() => {
  const box = document.querySelector("[data-tag-picker]");
  if (!box) return null;
  return { label: box.getAttribute("aria-label") || "", text: (box.textContent || ""),
    rows: Array.from(box.querySelectorAll("button")).filter((b) => b.querySelector("span")).map((b) => ({ name: (b.querySelector("span").textContent || "").trim(), height: Math.round(b.getBoundingClientRect().height) })) };
});
const pickRow = async (d, name) => {
  const hit = await d.page.evaluate((n) => {
    const box = document.querySelector("[data-tag-picker]");
    const row = box && Array.from(box.querySelectorAll("button")).find((b) => b.querySelector("span") && (b.querySelector("span").textContent || "").trim() === n);
    if (!row) return false;
    row.click();
    return true;
  }, name);
  await d.settle(300);
  return hit;
};
const searchPicker = async (d, value) => {
  const box = d.page.locator("[data-tag-picker] input").first();
  if ((await box.count()) === 0) return false;
  await box.fill(value, { timeout: 5000 }).catch(() => {});
  await d.settle(250);
  return true;
};

// A visible button by the name it carries for a screen reader, pressed.
const pressNamed = async (d, name, scope) => {
  const b = d.page.locator((scope ? scope + " " : "") + "button[aria-label=\"" + name + "\"]").first();
  if ((await b.count()) === 0 || !(await b.isVisible().catch(() => false))) return false;
  await b.click({ timeout: 5000 }).catch(() => {});
  await d.settle(400);
  return true;
};
const namedOnScreen = async (d, name) => {
  const b = d.page.locator("button[aria-label=\"" + name + "\"]").first();
  return (await b.count()) > 0 && (await b.isVisible().catch(() => false));
};

// The name menu: the chip in the top bar that carries the person's initials. Pressing it again closes it.
const toggleNameMenu = async (d) => {
  const hit = await d.page.evaluate((sel) => {
    const sb = document.querySelector(sel);
    const chip = Array.from(document.querySelectorAll("button")).filter((b) => !(sb && sb.contains(b)) && b.offsetParent !== null)
      .find((b) => { const sp = b.querySelector("span[style*='border-radius: 50%']"); return !!sp && /^[A-Z]{2}$/.test((sp.textContent || "").trim()); });
    if (!chip) return false;
    chip.click();
    return true;
  }, SIDEBAR);
  await d.settle(250);
  return hit;
};
// A visible button whose words are exactly these, and pressing it.
const buttonSays = (d, words) => d.page.evaluate((w0) => Array.from(document.querySelectorAll("button")).some((b) => b.offsetParent !== null && (b.textContent || "").trim() === w0), words);
const pressSays = async (d, words, scope) => {
  const hit = await d.page.evaluate(([w0, s]) => {
    const root = s ? document.querySelector(s) : document;
    const b = root && Array.from(root.querySelectorAll("button")).find((x) => x.offsetParent !== null && (x.textContent || "").trim() === w0);
    if (!b) return false;
    b.click();
    return true;
  }, [words, scope || null]);
  await d.settle(400);
  return hit;
};

// My alerts as drawn: its words, the chat choice pressed and each switch's state by its words.
const alertsWindow = (d) => d.page.evaluate((sel) => {
  const box = Array.from(document.querySelectorAll(sel)).pop();
  if (!box) return null;
  const switches = {};
  Array.from(box.querySelectorAll("label")).forEach((l) => { const i = l.querySelector("input[type=checkbox]"); if (i) switches[(l.textContent || "").trim()] = i.checked; });
  return { text: (box.textContent || "").replace(/\s+/g, " "), pressed: Array.from(box.querySelectorAll("button[aria-pressed='true']")).map((b) => (b.textContent || "").trim()), switches };
}, MODAL);
const flip = async (d, words) => {
  const hit = await d.page.evaluate(([sel, w0]) => {
    const box = Array.from(document.querySelectorAll(sel)).pop();
    const lab = box && Array.from(box.querySelectorAll("label")).find((l) => (l.textContent || "").trim() === w0 && l.querySelector("input[type=checkbox]"));
    if (!lab) return false;
    lab.querySelector("input[type=checkbox]").click();
    return true;
  }, [MODAL, words]);
  await d.settle(450);
  return hit;
};

// Each announcement drawn with its id: its title, its body when it is open, the words beside its
// title and the line under them.
const annRows = (d) => d.page.evaluate(() => Array.from(document.querySelectorAll("[data-announcement]")).map((el) => {
  const kids = Array.from(el.children);
  const meta = kids.length >= 3 ? kids[kids.length - 2] : null;
  return { id: el.getAttribute("data-announcement"), title: kids[0] ? kids[0].textContent.trim() : "", body: kids.length === 4 ? kids[1].textContent.trim() : null,
    meta: meta ? Array.from(meta.querySelectorAll("span")).map((sp) => sp.textContent.trim()) : [], reaches: kids.length ? kids[kids.length - 1].textContent.trim() : "" };
}));
// The lines in the card headed New announcement that read like the count line.
const previewLines = (d, heading, pattern) => d.page.evaluate(([h, src]) => {
  const head = Array.from(document.querySelectorAll("div")).find((x) => x.children.length === 0 && (x.textContent || "").trim() === h);
  const card = head && head.parentElement;
  if (!card) return null;
  const rx = new RegExp(src);
  return Array.from(card.querySelectorAll("div")).filter((x) => x.children.length === 0 && rx.test((x.textContent || "").trim())).map((x) => x.textContent.trim());
}, [heading, pattern]);
const leafSays = (d, words) => d.page.evaluate((w0) => Array.from(document.querySelectorAll("div")).some((x) => x.children.length === 0 && x.offsetParent !== null && (x.textContent || "").trim() === w0), words);
const tick = async (d, name) => {
  const hit = await d.page.evaluate((n) => {
    const lab = Array.from(document.querySelectorAll("label")).find((l) => l.querySelector("input[type=checkbox]") && Array.from(l.querySelectorAll("span")).some((sp) => (sp.textContent || "").trim() === n));
    if (!lab) return false;
    lab.querySelector("input[type=checkbox]").click();
    return true;
  }, name);
  await d.settle(150);
  return hit;
};
const choose = async (d, selector, label) => {
  const sel = d.page.locator(selector).first();
  if ((await sel.count()) === 0) return false;
  try { await sel.selectOption({ label }, { timeout: 5000 }); } catch (e) { return false; }
  await d.settle(200);
  return true;
};
const fillIn = async (d, selector, value) => {
  const f = d.page.locator(selector).first();
  if ((await f.count()) === 0) return false;
  await f.fill(value, { timeout: 5000 }).catch(() => {});
  return true;
};
// The page title in the top bar.
const barTitle = (d) => d.page.evaluate(() => {
  const bar = document.querySelector("div[style*='z-index: 40']");
  const t0 = bar && (bar.querySelector("[data-page-title]") || (bar.firstElementChild && bar.firstElementChild.firstElementChild));
  return t0 ? (t0.textContent || "").trim() : "";
});
// The bell's panel, opened by the bell, and a notice in it pressed by its title.
const openBell = async (d, word) => {
  const hit = await d.page.evaluate((t0) => {
    const b = Array.from(document.querySelectorAll("button")).find((x) => x.getAttribute("title") === t0 && x.offsetParent !== null);
    if (!b) return false;
    b.click();
    return true;
  }, word);
  await d.settle(500);
  return hit && (await d.page.locator("div[role=dialog][aria-label=\"" + word + "\"]").count()) > 0;
};
const tapNotice = async (d, word, title) => {
  const hit = await d.page.evaluate(([p, t0]) => {
    const panel = document.querySelector("div[role=dialog][aria-label=\"" + p + "\"]");
    const row = panel && Array.from(panel.querySelectorAll("button")).find((b) => (b.textContent || "").indexOf(t0) >= 0);
    if (!row) return false;
    row.click();
    return true;
  }, [word, title]);
  await d.settle(1000);
  return hit;
};
const hashNow = (d) => d.page.evaluate(() => window.location.hash);

async function run({ d, results, seed, stubs, lang }) {
  const w = WORDS[lang] || WORDS.en;
  const tail = "/" + lang;
  const reachesRe = "^" + esc(w.reaches).replace(esc("{0}"), "\\d+").replace(esc("{1}"), "\\d+") + "$";

  stubs.reset();
  Object.assign(stubs.state.chatUnread, UNREAD);
  await d.signOutHard();
  await d.signIn("admin");
  await d.expandSidebar();
  const adminNav = await d.visibleNavItems();

  // ---- Messages: the chats above the private ones, each with the count the API sent
  let mark = d.mark();
  await d.goto("chat");
  await d.settle(500);
  const listed = (await chatList(d, w.privateConvos)) || [];
  const served = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/chat/channels" && Array.isArray(c.json)).pop();
  const apiChats = served ? served.json.filter((c) => c.type !== "admin_dm").map((c) => c.name) : [];
  const headAt = listed.findIndex((x) => x.heading === w.privateConvos);
  const above = headAt > 0 ? listed.slice(0, headAt) : [];
  const aboveNames = rowsOf(above).map((x) => x.name);
  const wantNames = CHATS.map((c) => c.name);
  const kindsOff = rowsOf(above).filter((x, i) => CHATS[i] && x.sub !== w[CHATS[i].kind]).map((x, i) => x.name + " reads " + JSON.stringify(x.sub) + " under its name");
  results.check("page", "page/chat/lists-the-chats-above-the-private-ones" + tail,
    !!served && above.length > 0 && above[0].heading === w.channels && same(aboveNames, wantNames) && same(apiChats, wantNames) && kindsOff.length === 0,
    !served ? "Messages read no GET /api/chat/channels"
      : !aboveNames.length ? "the list draws no chat above " + JSON.stringify(w.privateConvos) + ", only " + JSON.stringify(rowsOf(listed).map((x) => x.name))
        : above[0].heading !== w.channels ? "the chats above the private ones are headed " + JSON.stringify(above[0].heading || above[0].name) + " where the heading reads " + JSON.stringify(w.channels)
          : !same(aboveNames, apiChats) ? "above the private ones the list draws " + JSON.stringify(aboveNames) + " where the API listed " + JSON.stringify(apiChats)
            : !same(apiChats, wantNames) ? "the stub listed " + JSON.stringify(apiChats) + " where the case expects " + JSON.stringify(wantNames)
              : kindsOff.join("; "));

  const wantPills = CHATS.map((c) => [c.name, c.unread]).concat(PRIVATE.map((p) => [p.name, p.unread]));
  const drawnPills = rowsOf(listed).map((x) => [x.name, x.unread]);
  results.check("page", "page/chat/draws-each-chats-unread-count" + tail, same(drawnPills, wantPills),
    "the rows draw " + JSON.stringify(drawnPills) + " where the counts the API sent are " + JSON.stringify(wantPills));

  // ---- the side panel's total, open and collapsed
  const openPanel = await panelCount(d, w.messages);
  await d.collapseSidebar();
  const shutPanel = await panelCount(d, w.messages);
  await d.expandSidebar();
  const totalName = fill(w.unread, TOTAL);
  const panelOk = (p, collapsed) => !!p && p.item && p.collapsed === collapsed && p.text === String(TOTAL) && p.name === totalName;
  results.check("page", "page/chat/side-panel-draws-the-unread-total" + tail, panelOk(openPanel, false) && panelOk(shutPanel, true),
    "open, the panel draws " + panelSays(openPanel) + "; collapsed, " + (shutPanel && !shutPanel.collapsed ? "it did not collapse" : panelSays(shutPanel))
      + "; the chats' unreadCount adds up to " + TOTAL + ", named " + JSON.stringify(totalName));

  // ---- opening a chat marks it read
  mark = d.mark();
  const openedSite = await openChat(d, SITE_CHAT);
  await d.settle(600);
  const readPost = d.callsSince(mark).find((c) => c.method === "POST" && c.path === "/api/chat/channels/ch-1/read");
  const siteRow = rowsOf(await chatList(d, w.privateConvos)).find((x) => x.name === SITE_CHAT);
  const afterRead = await panelCount(d, w.messages);
  results.check("page", "page/chat/opening-a-chat-marks-it-read" + tail,
    openedSite && !!readPost && !!siteRow && siteRow.unread === null && !!afterRead && afterRead.text === String(AFTER_READ) && afterRead.name === fill(w.unread, AFTER_READ),
    !openedSite ? "no row reads " + JSON.stringify(SITE_CHAT)
      : !readPost ? "opening " + SITE_CHAT + " sent no POST /api/chat/channels/ch-1/read"
        : !siteRow || siteRow.unread !== null ? "the chat's row still draws " + JSON.stringify(siteRow ? siteRow.unread : null)
          : "the side panel draws " + panelSays(afterRead) + " where 2 of the " + TOTAL + " were read, which leaves " + AFTER_READ);

  // ---- Tag someone, from its button: the members route, 44 pixel rows and a search
  mark = d.mark();
  const pressedTag = await pressNamed(d, w.tag);
  await d.settle(400);
  const membersCall = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/chat/channels/ch-1/members").pop();
  const shown = await picker(d);
  const answered = membersCall && membersCall.json && Array.isArray(membersCall.json.members) ? membersCall.json.members.map((m) => m.name) : [];
  const names = shown ? shown.rows.map((r) => r.name) : [];
  const short = shown ? shown.rows.filter((r) => r.height < 44).map((r) => r.name + " " + r.height) : [];
  await searchPicker(d, SEARCH);
  const narrowed = await picker(d);
  const narrowedNames = narrowed ? narrowed.rows.map((r) => r.name) : [];
  await searchPicker(d, "");
  results.check("page", "page/chat/tag-someone-lists-the-members" + tail,
    pressedTag && !!shown && shown.label === w.tag && shown.text.indexOf(w.tag) >= 0 && !!membersCall && same(names, answered) && same(answered, MEMBERS) && short.length === 0 && same(narrowedNames, SEARCHED),
    !pressedTag ? "the chat offers no button named " + JSON.stringify(w.tag)
      : !shown ? "the button opened nothing"
        : shown.label !== w.tag || shown.text.indexOf(w.tag) < 0 ? "the picker is named " + JSON.stringify(shown.label) + " where it should read " + JSON.stringify(w.tag)
          : !membersCall ? "the picker read no GET /api/chat/channels/ch-1/members"
            : !same(names, answered) ? "the picker lists " + JSON.stringify(names) + " where the members route answered " + JSON.stringify(answered)
              : !same(answered, MEMBERS) ? "the members route answered " + JSON.stringify(answered) + " where the case expects " + JSON.stringify(MEMBERS)
                : short.length ? "rows under 44 pixels: " + short.join(", ")
                  : "a search for " + JSON.stringify(SEARCH) + " leaves " + JSON.stringify(narrowedNames) + " where it should leave " + JSON.stringify(SEARCHED));
  await pressNamed(d, w.close, "[data-tag-picker]");

  // ---- a typed @ opens it too, and each pick puts @Name in the text
  const box = d.page.locator("input[aria-label=\"" + w.typeMessage + "\"]").first();
  const hasBox = (await box.count()) > 0;
  if (hasBox) {
    await box.click({ timeout: 5000 }).catch(() => {});
    await d.page.keyboard.type("@");
    await d.settle(500);
  }
  const byAt = await picker(d);
  results.check("page", "page/chat/typing-at-opens-tag-someone" + tail, hasBox && !!byAt && same(byAt.rows.map((r) => r.name), MEMBERS),
    !hasBox ? "the chat has no box named " + JSON.stringify(w.typeMessage) : !byAt ? "typing @ opened nothing" : "the picker lists " + JSON.stringify(byAt.rows.map((r) => r.name)));
  const pickedFirst = await pickRow(d, TAGS[0].name);
  if (hasBox) {
    await d.page.keyboard.press("End");
    await d.page.keyboard.type(TYPED[lang]);
    await d.settle(200);
  }
  const pressedAgain = await pressNamed(d, w.tag);
  const pickedSecond = pressedAgain ? await pickRow(d, TAGS[1].name) : false;
  const wantText = "@" + TAGS[0].name + " " + TYPED[lang] + " @" + TAGS[1].name;
  const inBox = hasBox ? await box.inputValue().catch(() => "") : "";

  // ---- the send carries the ids, and the answer's names are drawn bold
  mark = d.mark();
  const pressedSend = await pressNamed(d, w.send);
  await d.settle(600);
  const posted = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/chat/channels/ch-1/messages").pop();
  const wantBody = JSON.stringify({ text: wantText, mentions: TAGS.map((t) => t.id) });
  results.check("page", "page/chat/a-send-carries-its-mentions" + tail, !!posted && JSON.stringify(posted.body) === wantBody && posted.status === 201,
    !pickedFirst || !pickedSecond ? "the case could not pick " + (!pickedFirst ? TAGS[0].name : TAGS[1].name) + " in the picker; the box holds " + JSON.stringify(inBox)
      : !pressedSend ? "the chat offers no button named " + JSON.stringify(w.send)
        : !posted ? "the send posted nothing; the box holds " + JSON.stringify(inBox)
          : "the send carried " + JSON.stringify(posted.body) + " where it should carry " + wantBody);
  const sentTags = await tagsDrawn(d);

  // ---- a send that fails keeps the text and says so
  const fillBox = async (v) => { if (hasBox) await box.fill(v, { timeout: 5000 }).catch(() => {}); await d.settle(150); };
  await fillBox(RETRY[lang]);
  stubs.setRefusal({ method: "POST", path: /^\/api\/chat\/channels\/[^/]+\/messages$/, status: 502, once: true });
  await pressNamed(d, w.send);
  const failToast = await d.waitToast(3000);
  const kept = hasBox ? await box.inputValue().catch(() => "") : "";
  stubs.clearRefusals();
  results.check("page", "page/chat/a-failed-send-keeps-the-text" + tail, hasBox && failToast === w.notSent && kept === RETRY[lang],
    !hasBox ? "the chat has no box named " + JSON.stringify(w.typeMessage)
      : failToast !== w.notSent ? "the toast reads " + JSON.stringify(failToast) + " where it should read " + JSON.stringify(w.notSent)
      : "the box holds " + JSON.stringify(kept) + " where the text typed was " + JSON.stringify(RETRY[lang]));
  await d.waitToastGone(3600);
  await fillBox("");

  // ---- each tagged name is drawn bold: the one just sent, and the general chat's
  await openChat(d, "General");
  await d.settle(400);
  const generalTags = await tagsDrawn(d);
  const boldIn = (list, tag, msg) => list.some((x) => x.text === tag && x.weight >= 700 && x.message === msg);
  const boldMiss = [];
  TAGS.forEach((t) => { if (!boldIn(sentTags, "@" + t.name, wantText)) boldMiss.push("@" + t.name + " in the message just sent"); });
  if (!boldIn(generalTags, GENERAL_TAGGED.tag, GENERAL_TAGGED.text)) boldMiss.push(GENERAL_TAGGED.tag + " in the general chat");
  results.check("page", "page/chat/tagged-names-are-bold" + tail, boldMiss.length === 0,
    "not drawn bold in a message drawn as typed: " + boldMiss.join(", ") + "; the tagged names drawn are "
      + JSON.stringify(sentTags.concat(generalTags).map((x) => x.text + " " + x.weight)));

  // ---- a chat that does not load says so, and drops what the last one showed
  await openChat(d, "Tomasz Wisniewski");
  await d.settle(300);
  const firstTalk = await talk(d, w.typeMessage);
  stubs.setRefusal({ method: "GET", path: "/api/chat/channels/dm-2/messages", status: 500, code: "common.serverError", error: lang === "es" ? "Error del servidor" : "Server error", once: true });
  await openChat(d, "Ngozi Okonkwo");
  await d.settle(300);
  const failedTalk = await talk(d, w.typeMessage);
  stubs.clearRefusals();
  const leftOver = ["Lobby is done for the night.", "Thank you, logged."].filter((x) => failedTalk && failedTalk.text.indexOf(x) >= 0);
  results.check("page", "page/chat/a-failed-load-says-so" + tail,
    !!firstTalk && firstTalk.text.indexOf("Lobby is done for the night.") >= 0 && !!failedTalk && failedTalk.text.indexOf(w.notLoaded) >= 0 && leftOver.length === 0,
    !firstTalk || firstTalk.text.indexOf("Lobby is done for the night.") < 0 ? "Tomasz's conversation did not open with its messages"
      : !failedTalk || failedTalk.text.indexOf(w.notLoaded) < 0 ? "the refused conversation does not say " + JSON.stringify(w.notLoaded)
        : "the refused conversation still shows " + JSON.stringify(leftOver));

  // ---- My alerts, from the name menu: what the API sent, a PATCH for each change, and a refusal
  await d.goto("overview");
  const menuOpened = await toggleNameMenu(d);
  const offered = await buttonSays(d, w.myAlerts);
  let win = null;
  if (offered) { await pressSays(d, w.myAlerts); win = await alertsWindow(d); }
  else if (menuOpened) await toggleNameMenu(d);
  const inMenuWhenAnswered = menuOpened && offered && !!win;
  const wantWords = [w.myAlerts, w.alertsLine, w.chatMessages, w.every, w.mentionsOnly, w.off].concat(Object.keys(w.switches).map((k) => w.switches[k]));
  const missingWords = win ? wantWords.filter((x) => win.text.indexOf(x) < 0) : wantWords;
  const allOn = !!win && Object.keys(w.switches).every((k) => win.switches[w.switches[k]] === true);
  results.check("window", "window/my-alerts/shows-what-the-api-sent" + tail, !!win && missingWords.length === 0 && same(win.pressed, [w.every]) && allOn,
    !win ? "My alerts did not open from the name menu"
      : missingWords.length ? "the window does not say " + missingWords.map((x) => JSON.stringify(x)).join(", ")
        : !same(win.pressed, [w.every]) ? "the chat choice pressed is " + JSON.stringify(win.pressed) + " where the API sent all, " + JSON.stringify(w.every)
          : "the switches read " + JSON.stringify(win.switches) + " where the API sent every one on");

  mark = d.mark();
  const done = [];
  for (const c of CHANGES) {
    done.push(win ? (c.press ? await d.clickText(w[c.press], { inModal: true, exact: true }) : await flip(d, w.switches[c.flip])) : false);
    await d.settle(300);
  }
  const patches = d.callsSince(mark).filter((c) => c.method === "PATCH" && c.path === "/api/notifications/settings").map((c) => JSON.stringify(c.body));
  const wantPatches = CHANGES.map((c) => JSON.stringify(c.body));
  const settled = await alertsWindow(d);
  const settledOk = !!settled && same(settled.pressed, [w.every]) && settled.switches[w.switches.supplies] === true && settled.switches[w.switches.forms] === false;
  results.check("window", "window/my-alerts/each-change-sends-its-patch" + tail, done.every(Boolean) && same(patches, wantPatches) && settledOk,
    !done.every(Boolean) ? "the window has no control for " + CHANGES.filter((c, i) => !done[i]).map((c) => JSON.stringify(c.press ? w[c.press] : w.switches[c.flip])).join(", ")
      : !same(patches, wantPatches) ? "the changes sent " + JSON.stringify(patches) + " where each should send " + JSON.stringify(wantPatches)
        : "after the saves the window shows " + JSON.stringify(settled));

  stubs.setRefusal({ method: "PATCH", path: "/api/notifications/settings", status: 500, code: "common.serverError", error: lang === "es" ? "Error del servidor" : "Server error", once: true });
  const flipped = win ? await flip(d, w.switches.issues) : false;
  const refusedToast = await d.waitToast(3000);
  await d.settle(300);
  const reverted = await alertsWindow(d);
  stubs.clearRefusals();
  results.check("window", "window/my-alerts/a-refused-change-says-so" + tail, flipped && refusedToast === w.notSaved && !!reverted && reverted.switches[w.switches.issues] === true,
    !flipped ? "the window has no switch for " + JSON.stringify(w.switches.issues)
      : refusedToast !== w.notSaved ? "the toast reads " + JSON.stringify(refusedToast) + " where it should read " + JSON.stringify(w.notSaved)
        : JSON.stringify(w.switches.issues) + " is left off after the API refused the change");
  await d.waitToastGone(3600);
  await pressNamed(d, w.close, MODAL);

  // ---- Announcements: what was sent, the count line for each audience, and a send
  mark = d.mark();
  await d.goto("announcements");
  await d.settle(900);
  const listCall = d.callsSince(mark).filter((c) => c.method === "GET" && c.path === "/api/announcements").pop();
  const apiRows = listCall && listCall.json && Array.isArray(listCall.json.announcements) ? listCall.json.announcements : [];
  const drawnRows = await annRows(d);
  const listOff = [];
  LISTED.forEach((x, i) => {
    const r = drawnRows[i];
    const a = apiRows.find((y) => y.id === x.id);
    if (!r || r.id !== x.id) { listOff.push("row " + (i + 1) + " is " + (r ? r.id : "not drawn") + " where the API listed " + x.id); return; }
    const title = a && a.title ? a.title[lang] : "(not listed)";
    if (r.title !== title) listOff.push(x.id + " is titled " + JSON.stringify(r.title) + " where the API sent " + JSON.stringify(title));
    if (r.meta[0] !== (x.audience || w.everyone)) listOff.push(x.id + " names its audience " + JSON.stringify(r.meta[0]) + " where it should read " + JSON.stringify(x.audience || w.everyone));
    if (r.meta[1] !== fill(w.by, x.by)) listOff.push(x.id + " reads " + JSON.stringify(r.meta[1]) + " where it should read " + JSON.stringify(fill(w.by, x.by)));
    if (r.reaches !== fill(w.reaches, x.counts[0], x.counts[1])) listOff.push(x.id + " reads " + JSON.stringify(r.reaches) + " where it should read " + JSON.stringify(fill(w.reaches, x.counts[0], x.counts[1])));
  });
  const sentHead = await leafSays(d, w.sent);
  results.check("page", "page/announcements/lists-what-was-sent" + tail, !!listCall && sentHead && listOff.length === 0,
    !listCall ? "the page read no GET /api/announcements" : !sentHead ? "no list headed " + JSON.stringify(w.sent) : listOff.join("; "));

  const previewOff = [];
  for (const p of PREVIEWS) {
    const m0 = p.choice === "everyone" ? mark : d.mark();
    let chose = true;
    if (p.choice !== "everyone") chose = await d.clickText(w[p.choice], { exact: true });
    if (p.site) chose = chose && await choose(d, "select[aria-label=\"" + w.site + "\"]", p.site);
    if (p.role) chose = chose && await choose(d, "select[aria-label=\"" + w.role + "\"]", w[p.role]);
    if (p.people) for (const n of p.people) chose = chose && await tick(d, n);
    await d.settle(900);
    const call = d.callsSince(m0).filter((c) => c.method === "GET" && c.path === "/api/announcements/preview").pop();
    const lines = await previewLines(d, w.newAnnouncement, reachesRe);
    const wantLine = fill(w.reaches, p.counts[0], p.counts[1]);
    const label = JSON.stringify(w[p.choice]);
    if (!chose) previewOff.push(label + ": the case could not choose it");
    else if (!call) previewOff.push(label + ": no preview was read");
    else if (call.query !== p.query) previewOff.push(label + ": the preview was read with " + JSON.stringify(call.query) + " where it should be " + JSON.stringify(p.query));
    else if (!lines || lines.length !== 1 || lines[0] !== wantLine) previewOff.push(label + ": the line reads " + JSON.stringify(lines) + " where the preview answered " + JSON.stringify(call.json) + ", which reads " + JSON.stringify(wantLine));
  }
  results.check("page", "page/announcements/preview-line-reads-the-counts" + tail, previewOff.length === 0, previewOff.join("; "));

  await fillIn(d, "input[aria-label=\"" + w.title + "\"]", WRITTEN[lang].title);
  await fillIn(d, "textarea[aria-label=\"" + w.message + "\"]", WRITTEN[lang].body);
  mark = d.mark();
  const pressedAnn = await d.clickText(w.sendAnnouncement, { exact: true });
  const annToast = await d.waitToast(3000);
  await d.settle(700);
  const annPost = d.callsSince(mark).filter((c) => c.method === "POST" && c.path === "/api/announcements").pop();
  const wantAnn = JSON.stringify({ title: WRITTEN[lang].title, body: WRITTEN[lang].body, audience: { type: "users", userIds: ["u-staff-6", "u-staff-9"] } });
  const newRow = (await annRows(d))[0];
  const newWant = { title: WRITTEN[lang].title, meta: [w.chosen + " (2)", fill(w.by, "Dana Whitlock")], reaches: fill(w.reaches, 2, 1) };
  const newOk = !!newRow && newRow.title === newWant.title && newRow.meta[0] === newWant.meta[0] && newRow.meta[1] === newWant.meta[1] && newRow.reaches === newWant.reaches;
  results.check("page", "page/announcements/send-sends-what-was-written" + tail, !!annPost && JSON.stringify(annPost.body) === wantAnn && annToast === w.announcementSent && newOk,
    !pressedAnn ? "no button reads " + JSON.stringify(w.sendAnnouncement)
      : !annPost ? "the page sent no POST /api/announcements"
        : JSON.stringify(annPost.body) !== wantAnn ? "the page sent " + JSON.stringify(annPost.body) + " where it should send " + wantAnn
          : annToast !== w.announcementSent ? "the toast reads " + JSON.stringify(annToast) + " where it should read " + JSON.stringify(w.announcementSent)
            : "the list's first row reads " + JSON.stringify(newRow) + " where it should read " + JSON.stringify(newWant));
  await d.waitToastGone(3600);

  stubs.setRefusal({ method: "GET", path: /^\/api\/announcements$/, status: 404 });
  mark = d.mark();
  await d.goto("announcements");
  await d.settle(900);
  const title404 = await barTitle(d);
  const body404 = (await d.bodyText()).toLowerCase();
  const refused404 = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/announcements" && c.status === 404);
  const preview404 = d.callsSince(mark).some((c) => c.path === "/api/announcements/preview");
  stubs.clearRefusals();
  const drawn404 = [w.newAnnouncement, w.sendTo, w.sendAnnouncement, w.writtenOnce, w.notDrawn].filter((x) => body404.indexOf(x.toLowerCase()) >= 0);
  results.check("page", "page/announcements/draws-nothing-until-the-api-lists" + tail, title404 === w.announcements && refused404 && drawn404.length === 0 && !preview404,
    title404 !== w.announcements ? "the address #announcements opens " + JSON.stringify(title404)
      : !refused404 ? "the page read no GET /api/announcements"
        : drawn404.length ? "with the list refused the page still draws " + JSON.stringify(drawn404) : "with the list refused the page still read a preview");

  // ---- the bell: a chat notice and a tag open their chat, and an announcement opens on its page
  stubs.state.notifications = [
    { id: "n-chat", title: CHAT_NOTICE[lang], body: "On it after the lobby.", subjectType: "chat", subjectId: "ch-general", link: null,
      createdAt: seed.shift(0) + "T23:20:00Z", readAt: null, count: 3 },
    { id: "n-tag", title: TAGGED_NOTICE[lang], body: "@Dana Whitlock the dock door is stuck again.", subjectType: "chat_mention", subjectId: "ch-1", link: null,
      createdAt: seed.shift(0) + "T23:10:00Z", readAt: null, count: 1 },
    { id: "n-ann", title: AN1[lang].title, body: AN1[lang].body, subjectType: "announcement", subjectId: "an-1", link: null,
      createdAt: seed.shift(0) + "T23:00:00Z", readAt: null, count: 1 },
  ];
  await d.goto("overview");
  const bellOff = [];
  for (const n of [{ title: CHAT_NOTICE[lang], id: "ch-general", name: "General" }, { title: TAGGED_NOTICE[lang], id: "ch-1", name: SITE_CHAT }]) {
    mark = d.mark();
    const bell = await openBell(d, w.notifications);
    const tapped = bell && await tapNotice(d, w.notifications, n.title);
    const hash = await hashNow(d);
    const read = d.callsSince(mark).some((c) => c.method === "GET" && c.path === "/api/chat/channels/" + n.id + "/messages");
    const open = await talk(d, w.typeMessage);
    if (!bell) bellOff.push("the bell did not open");
    else if (!tapped) bellOff.push("the bell lists no notice titled " + JSON.stringify(n.title));
    else if (hash !== "#chat/" + n.id) bellOff.push(JSON.stringify(n.title) + " left the address at " + JSON.stringify(hash));
    else if (!read) bellOff.push(JSON.stringify(n.title) + " did not read its chat's messages");
    else if (!open || open.head.indexOf(n.name) !== 0) bellOff.push(JSON.stringify(n.title) + " opened a conversation headed " + JSON.stringify(open ? open.head : null));
  }
  results.check("page", "page/notices/a-chat-notice-and-a-tag-open-their-chat" + tail, bellOff.length === 0, bellOff.join("; "));

  const bellB = await openBell(d, w.notifications);
  const tappedB = bellB && await tapNotice(d, w.notifications, AN1[lang].title);
  await d.settle(400);
  const hashB = await hashNow(d);
  const openCard = (await annRows(d)).find((r) => r.id === "an-1" && r.body !== null);
  results.check("page", "page/notices/an-announcement-opens-on-its-page" + tail, tappedB && hashB === "#announcements/an-1" && !!openCard && openCard.body === AN1[lang].body && openCard.title === AN1[lang].title,
    !bellB ? "the bell did not open" : !tappedB ? "the bell lists no notice titled " + JSON.stringify(AN1[lang].title)
      : hashB !== "#announcements/an-1" ? "the announcement left the address at " + JSON.stringify(hashB)
        : "the page draws no open announcement reading " + JSON.stringify(AN1[lang].body) + (openCard ? ", only " + JSON.stringify(openCard) : ""));
  stubs.state.notifications = null;

  // ---- a phone, 390 wide: the list and a conversation stack, with Back, and My alerts under More
  await d.page.setViewportSize({ width: 390, height: 844 });
  await d.settle(500);
  await d.goto("chat");
  await d.settle(500);
  const startList = !!(await chatList(d, w.privateConvos));
  const startTalk = await d.has(w.yourMessages);
  const pickedOnPhone = await openChat(d, SITE_CHAT);
  const midList = !!(await chatList(d, w.privateConvos));
  const midTalk = await talk(d, w.typeMessage);
  const midBack = await namedOnScreen(d, w.back);
  const backed = midBack ? await pressNamed(d, w.back) : false;
  const endList = !!(await chatList(d, w.privateConvos));
  const endTalk = await talk(d, w.typeMessage);
  results.check("page", "page/chat/stacks-on-a-phone-with-back" + tail,
    startList && !startTalk && pickedOnPhone && !midList && !!midTalk && midTalk.head.indexOf(SITE_CHAT) >= 0 && midBack && backed && endList && !endTalk,
    !startList ? "at 390 the page opens without the list of chats"
      : startTalk ? "at 390 the list shares the screen with " + JSON.stringify(w.yourMessages)
        : !pickedOnPhone ? "no row reads " + JSON.stringify(SITE_CHAT)
          : midList ? "with a conversation open the list is still on screen"
            : !midTalk || midTalk.head.indexOf(SITE_CHAT) < 0 ? "the conversation open is headed " + JSON.stringify(midTalk ? midTalk.head : null)
              : !midBack ? "the conversation offers no button named " + JSON.stringify(w.back)
                : "after " + JSON.stringify(w.back) + " the list is " + (endList ? "back" : "gone") + " and the conversation " + (endTalk ? "still open" : "closed"));

  const moreOpened = await d.page.evaluate((t0) => {
    const b = Array.from(document.querySelectorAll("button")).find((x) => x.getAttribute("title") === t0 && x.offsetParent !== null);
    if (!b) return false;
    b.click();
    return true;
  }, w.more);
  await d.settle(300);
  const inMore = await d.page.evaluate((w0) => { const m = document.querySelector("[role='menu']"); return !!m && Array.from(m.querySelectorAll("button")).some((b) => (b.textContent || "").trim() === w0); }, w.myAlerts);
  if (inMore) await pressSays(d, w.myAlerts, "[role='menu']");
  const phoneWin = inMore ? await alertsWindow(d) : null;
  results.check("window", "window/my-alerts/in-the-phone-more-menu" + tail, moreOpened && inMore && !!phoneWin && phoneWin.text.indexOf(w.alertsLine) >= 0,
    !moreOpened ? "the phone bar has no " + JSON.stringify(w.more) + " button" : !inMore ? "the More menu holds no " + JSON.stringify(w.myAlerts) : "the row opened no My alerts window");
  if (phoneWin) await pressNamed(d, w.close, MODAL);
  if (await d.moreMenuOpen()) await d.closeMenus();
  await d.page.setViewportSize({ width: 1280, height: 900 });
  await d.settle(500);

  // ---- a supervisor on the role's defaults, whom GET /api/notifications/settings does not answer
  stubs.setRefusal({ method: "GET", path: "/api/notifications/settings", status: 404 });
  await d.signOutHard();
  await d.signIn("supervisor");
  await d.expandSidebar();
  const supNav = await d.visibleNavItems();
  const supMenu = await toggleNameMenu(d);
  const supOffered = await buttonSays(d, w.myAlerts);
  if (supMenu) await toggleNameMenu(d);
  stubs.clearRefusals();
  mark = d.mark();
  await d.goto("announcements");
  await d.settle(600);
  const supTold = (await d.bodyText()).indexOf(w.forAdmins) >= 0;
  const supReads = d.callsSince(mark).filter((c) => c.path.indexOf("/api/announcements") === 0).map((c) => c.method + " " + c.path);

  // ---- a supervisor holding send_announcements by an override
  stubs.state.overrides["u-sup-1"] = { send_announcements: true };
  await d.signOutHard();
  await d.signIn("supervisor");
  await d.expandSidebar();
  const holderNav = await d.visibleNavItems();
  await d.goto("announcements");
  await d.settle(700);
  const holderForm = (await d.bodyText()).toLowerCase().indexOf(w.newAnnouncement.toLowerCase()) >= 0;
  results.check("page", "page/announcements/for-holders-of-send-announcements" + tail,
    adminNav.indexOf(w.announcements) >= 0 && supNav.indexOf(w.announcements) < 0 && supTold && supReads.length === 0 && holderNav.indexOf(w.announcements) >= 0 && holderForm,
    adminNav.indexOf(w.announcements) < 0 ? "an admin, who holds it by default, finds no " + JSON.stringify(w.announcements) + " in the side panel"
      : supNav.indexOf(w.announcements) >= 0 ? "a supervisor on the role's defaults finds " + JSON.stringify(w.announcements) + " in the side panel"
        : !supTold ? "at #announcements a supervisor on the role's defaults is not told " + JSON.stringify(w.forAdmins)
          : supReads.length ? "the page read " + supReads.join(", ") + " for a supervisor who does not hold it"
            : holderNav.indexOf(w.announcements) < 0 ? "a supervisor who holds it by an override finds no " + JSON.stringify(w.announcements) + " in the side panel"
              : "a supervisor who holds it by an override does not find " + JSON.stringify(w.newAnnouncement) + " on the page");
  results.check("window", "window/my-alerts/in-the-name-menu-once-the-api-answers" + tail, inMenuWhenAnswered && supMenu && !supOffered,
    !menuOpened ? "the name menu did not open" : !offered ? "the name menu offers no " + JSON.stringify(w.myAlerts) + " after the settings route answered"
      : !win ? JSON.stringify(w.myAlerts) + " opened no window"
        : !supMenu ? "the supervisor's name menu did not open" : "the name menu offers " + JSON.stringify(w.myAlerts) + " while the settings route answers 404");

  stubs.reset();
  results.note("Messages, tagging, announcements and My alerts in " + lang + ": the chats and their unread counts, the side panel's total, Tag someone, a send's mentions, the preview line, a send, the bell, the phone and each PATCH");
}

module.exports = { run };
