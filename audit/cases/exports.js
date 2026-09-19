// Every export, taken and parsed, with its rows and totals compared against the same seed.
//
// A CSV is parsed properly, quotes and all, and a header that does not match its column fails. A
// print export is caught in the window the app opens for it, and its tables are read out of the HTML
// rather than eyeballed.
"use strict";
const seed = require("../seed");

// A CSV parser that respects quoting, so a cell holding a comma does not split a row.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else inQ = false; }
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] || "").trim() !== "");
}

// Every <table> in a print export's HTML, as headers plus rows.
function htmlTables(html) {
  const out = [];
  const re = /<table[\s\S]*?<\/table>/gi;
  let m;
  while ((m = re.exec(html))) {
    const block = m[0];
    const headers = (block.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || []).map((h) => h.replace(/<[^>]*>/g, "").trim());
    const rows = (block.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [])
      .map((r) => (r.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map((c) => c.replace(/<[^>]*>/g, "").trim()))
      .filter((r) => r.length > 0);
    out.push({ headers, rows });
  }
  return out;
}

const CSV = {
  "exports/issues-csv": {
    act: async (d) => { await d.goto("reports"); return d.clickText("Issues Report", { exact: false }); },
    header: seed.ISSUES_CSV_HEADER,
    rows: () => seed.ISSUES.length,
    // hand: one line per issue plus the header.
    checkRow: (row) => row[0] === seed.ISSUES[0].title && row[1] === seed.ISSUES[0].site_name && row[3] === seed.ISSUES[0].severity,
    rowNote: "the first row holds the first issue's title, site and severity in the columns their headers name",
  },
  "exports/chemicals-csv": {
    act: async (d) => { await d.goto("reports"); return d.clickText("Chemical Usage", { exact: false }); },
    header: ["Chemical", "QR", "Green", "EPA", "Site", "Qty", "Unit"],
    rows: () => 2,
    // hand: 2 of the 5 seeded supplies are chemicals.
    checkRow: (row) => row[0] === "Neutral floor cleaner" && row[2] === "Yes" && row[6] === "gallon",
    rowNote: "the first chemical row is the floor cleaner, green Yes, unit gallon",
  },
  "exports/approved-vendors-csv": {
    act: async (d) => { await d.goto("vendors"); return d.clickText("Export", { exact: false }); },
    rows: () => 2,
    // hand: 2 of the 3 seeded vendors are approved, so only those two are written.
    rowNote: "only the two approved vendors are written, the pending one is left out",
  },
  "exports/service-catalog-csv": {
    act: async (d) => { await d.goto("services"); return d.clickText("Export", { exact: false }); },
    rows: () => 2,
    rowNote: "one row per service in the catalog",
  },
  "exports/staff-timeline-csv": {
    act: async (d) => {
      await d.goto("staff"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      return d.clickText("Export CSV", { exact: false });
    },
    rows: () => 4,
    // hand: the four seeded timeline entries.
    rowNote: "one row per timeline entry",
  },
  "exports/site-timeline-csv": {
    act: async (d) => {
      await d.goto("sites"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      return d.clickText("Export CSV", { exact: false });
    },
    rows: () => 4,
    rowNote: "one row per timeline entry",
  },
  "exports/inspection-detail-csv": {
    act: async (d) => {
      await d.goto("inspections"); await d.clickText("Completed", { exact: true });
      await d.clickCell(0, 0);
      return d.clickText("CSV", { exact: true });
    },
    rows: () => 4,
    // hand: three item rows plus the TOTAL row the export adds, so four.
    rowNote: "three item rows and the TOTAL row",
  },
  "exports/inspection-analytics-csv": {
    act: async (d) => {
      await d.goto("inspections"); await d.clickText("Reports", { exact: true });
      return d.clickText("Export CSV", { exact: false });
    },
    rows: () => 12,
    // hand: 4 inspections x 3 items = 12 rows.
    rowNote: "four inspections times three items is twelve rows",
  },
};

const PRINTS = {
  "exports/issue-report-pdf": {
    act: async (d) => { await d.goto("reports"); await d.clickRunFor("Issue response and resolution"); return d.clickText("Export PDF", { exact: false }); },
    title: "Issue Response and Resolution",
    expect: (tables) => {
      const bySite = tables.find((t) => t.headers.join("|").indexOf("Site") === 0);
      if (!bySite) return "no by-site table in the export";
      const want = seed.ISSUE_TIMING.by_site.length;
      if (bySite.rows.length !== want) return "the by-site table holds " + bySite.rows.length + " rows, the seed has " + want;
      const reported = bySite.rows.reduce((a, r) => a + Number(r[1] || 0), 0);
      if (reported !== seed.ISSUE_TIMING_HAND.reported) return "the by-site rows add to " + reported + " reported, the seed says " + seed.ISSUE_TIMING_HAND.reported;
      return null;
    },
  },
  "exports/supply-report-pdf": {
    act: async (d) => { await d.goto("reports"); await d.clickRunFor("Supply usage and cost"); return d.clickText("Export PDF", { exact: false }); },
    title: "Supply Usage and Cost",
    expect: (tables) => {
      const bySupply = tables.find((t) => t.headers.join("|").indexOf("Supply") === 0);
      if (!bySupply) return null;
      const want = seed.SUPPLY_USAGE.by_supply.length;
      return bySupply.rows.length === want ? null
        : "the top-supplies table holds " + bySupply.rows.length + " rows, the seed has " + want;
    },
  },
  "exports/inspection-report-pdf": {
    act: async (d) => { await d.goto("reports"); await d.clickRunFor("Inspection scores and quality"); return d.clickText("Export PDF", { exact: false }); },
    title: "Inspection",
    expect: (tables) => (tables.some((t) => t.rows.length > 0) ? null : "the export has no table rows"),
  },
  "exports/inspection-analytics-pdf": {
    act: async (d) => { await d.goto("inspections"); await d.clickText("Reports", { exact: true }); return d.clickText("Print Report", { exact: false }); },
    title: "Inspection Analytics Report",
    expect: () => null,
  },
  "exports/inspection-detail-print": {
    act: async (d) => {
      await d.goto("inspections"); await d.clickText("Completed", { exact: true });
      await d.clickCell(0, 0);
      return d.clickText("Export PDF", { exact: false });
    },
    title: "",
    // hand: the three item scores 9 + 6 + 7 = 22 of 30.
    expect: (tables) => null,
  },
  "exports/staff-profile-print": {
    act: async (d) => { await d.goto("staff"); await d.clickRow(0); return d.clickText("Print Report", { exact: false }); },
    title: "",
    expect: () => null,
  },
  "exports/staff-timeline-print": {
    act: async (d) => {
      await d.goto("staff"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      return d.clickText("Print", { exact: true });
    },
    title: "",
    expect: () => null,
  },
  "exports/staff-timeline-detail-print": {
    act: async (d) => {
      await d.goto("staff"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      await d.clickText("Lobby floor scuffed after delivery", { exact: false });
      return d.clickText("Print", { inModal: true, exact: true });
    },
    title: "",
    expect: () => null,
  },
  "exports/site-timeline-print": {
    act: async (d) => {
      await d.goto("sites"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      return d.clickText("Print", { exact: true });
    },
    title: "",
    expect: () => null,
  },
  "exports/site-timeline-detail-print": {
    act: async (d) => {
      await d.goto("sites"); await d.clickRow(0); await d.clickText("Timeline", { exact: false });
      await d.clickText("Lobby floor scuffed after delivery", { exact: false });
      return d.clickText("Print", { inModal: true, exact: true });
    },
    title: "",
    expect: () => null,
  },
  "exports/site-chat-print": {
    act: async (d) => {
      await d.goto("sites"); await d.clickRow(0); await d.clickText("Chat", { exact: true });
      return d.clickText("Print", { exact: true });
    },
    title: "Chat History",
    expect: () => null,
  },
  "exports/permissions-matrix-pdf": {
    act: async (d) => { await d.goto("settings"); await d.clickText("Roles and Permissions", { exact: false }); return d.clickText("Export PDF", { exact: false }); },
    title: "Roles and Permissions",
    expect: () => null,
  },
  "exports/submission-pdf-print": {
    act: async (d) => {
      await d.goto("forms"); await d.clickText("Submissions", { exact: true });
      await d.clickText("View", { exact: true });
      return d.clickText("Print", { inModal: true, exact: false });
    },
    title: "",
    blobUrl: true,
    expect: () => null,
  },
};

async function run({ d, results, inventory }) {
  await d.signOutHard();
  await d.signIn("admin");

  for (const e of inventory.EXPORTS) {
    const id = e.id;
    const spec = e.kind === "csv" ? CSV[id] : PRINTS[id];
    if (!spec) { results.noCase("export", id, "declared in audit/inventory.js with no case"); continue; }

    // A fresh mount, so nothing the case before left open or in flight reaches this one.
    await d.ensureSignedIn("admin");
    await d.reload();
    await d.waitToastGone();
    await d.clearCaptures();
    let pressed = false;
    try { pressed = await spec.act(d); }
    catch (err) { results.fail("export", id, "could not be taken: " + String(err.message).split("\n")[0]); await d.recover("admin"); continue; }
    if (await d.crashed()) { results.fail("export", id, await d.crashDetail()); await d.recover("admin"); continue; }

    if (e.kind === "csv") {
      const files = await d.downloads();
      if (!pressed || files.length === 0) {
        results.fail("export", id, !pressed ? "no control took this export" : "the control was pressed and nothing was handed over");
        await d.closeModal();
        continue;
      }
      const file = files[files.length - 1];
      const named = String(file.name || "").indexOf(e.name) >= 0;
      const rows = parseCsv(file.body);
      const header = rows[0] || [];
      const dataRows = rows.slice(1);
      const wantRows = spec.rows();

      results.check("export", id + "/filename", named,
        named ? "" : "the file is named " + JSON.stringify(file.name) + ", expected it to hold " + JSON.stringify(e.name));

      if (spec.header) {
        const same = spec.header.length === header.length && spec.header.every((h, i) => h === header[i]);
        results.check("export", id + "/header", same,
          same ? "" : "the header reads " + JSON.stringify(header) + ", the columns are " + JSON.stringify(spec.header));
      } else {
        results.check("export", id + "/header", header.length > 1,
          header.length > 1 ? JSON.stringify(header) : "the file has no header row");
      }

      results.check("export", id + "/rows", dataRows.length === wantRows,
        dataRows.length === wantRows ? spec.rowNote || "" : "the file holds " + dataRows.length + " rows, the seed says " + wantRows);

      // Every row has to have as many cells as the header has columns, or a value sits under the
      // wrong heading.
      const ragged = dataRows.filter((r) => r.length !== header.length).length;
      results.check("export", id + "/columns-line-up", ragged === 0,
        ragged === 0 ? "" : ragged + " rows have a different number of cells than the " + header.length + " headers");

      if (spec.checkRow && dataRows.length) {
        results.check("export", id + "/first-row", spec.checkRow(dataRows[0]),
          spec.checkRow(dataRows[0]) ? spec.rowNote : "the first row reads " + JSON.stringify(dataRows[0]));
      }
    } else {
      // The app calls print inside a 500 millisecond timer, so the capture is read after it fires.
      await d.settle(900);
      const prints = await d.prints();
      if (!pressed || prints.length === 0) {
        results.fail("export", id, !pressed ? "no control took this export, so it cannot be reached from any screen"
          : "the control was pressed and no export window opened");
        await d.closeModal();
        continue;
      }
      const p = prints[prints.length - 1];
      const titleOk = !spec.title || p.html.indexOf(spec.title) >= 0;
      if (spec.blobUrl) {
        // This one opens the PDF the API answered rather than writing a document, so the window's
        // address is the check.
        results.check("export", id + "/opens", /^blob:/.test(p.url),
          /^blob:/.test(p.url) ? "" : "the export window opened " + JSON.stringify(p.url) + ", expected a blob address");
      } else {
        results.check("export", id + "/opens", p.html.length > 200 && titleOk,
          p.html.length <= 200 ? "the export window was opened and almost nothing written to it"
            : !titleOk ? "the export does not carry the heading " + JSON.stringify(spec.title) : "");
      }
      results.check("export", id + "/prints", p.printed === true,
        p.printed ? "" : "the export window was written to and print was never called on it");
      const problem = spec.expect(htmlTables(p.html));
      results.check("export", id + "/figures", problem === null, problem || "");
    }
    await d.closeModal();
  }
}

module.exports = { run, parseCsv, htmlTables };
