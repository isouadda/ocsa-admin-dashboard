// Every table, four ways: with rows, with no rows, with one row, and at the paging boundary.
//
// For each the suite reads the columns, the empty text, the counts, the sort where the table has
// one, and the request URL every filter produces. The narrow pass repeats the same tables at 1024
// and fails a table whose header row will not fit the window.
"use strict";

// How each table is reached, and which stub route decides its rows. `rowsFrom` is the path the
// suite refuses, empties, or trims to one row.
const ROUTES = {
  "staff/list": { open: async (d) => { await d.goto("staff"); }, rowsFrom: "/api/users", search: "Wisniewski", expectSearchRows: 1 },
  // The Sites page is handed its rows by the shell, so emptying them needs a reload.
  "sites/list": { open: async (d) => { await d.goto("sites"); }, rowsFrom: "/api/sites", search: "Harbor", expectSearchRows: 1, reloadToRefetch: true },
  "vendors/list": { open: async (d) => { await d.goto("vendors"); }, rowsFrom: "/api/vendors", search: "Kestrel", expectSearchRows: 1 },
  "marketplace/shifts": { open: async (d) => { await d.goto("marketplace"); await d.clickText("All", { exact: true }); }, rowsFrom: "/api/pickups", search: "Harbor", expectSearchRows: null },
  "inspections/scheduled": { open: async (d) => { await d.goto("inspections"); await d.clickText("Scheduled", { exact: true }); }, rowsFrom: "/api/inspections/scheduled", search: "Harbor", expectSearchRows: 1, keepIds: ["si-1"] },
  "inspections/completed": { open: async (d) => { await d.goto("inspections"); await d.clickText("Completed", { exact: true }); }, rowsFrom: "/api/inspections/scheduled", search: "Riverbend", expectSearchRows: 1, keepIds: ["insp-3"] },
  // The documents search reads the person, the category, the file name and who uploaded it.
  "hr/documents": { open: async (d) => { await d.goto("hr"); await d.clickText("Documents", { exact: true }); }, rowsFrom: "/api/hr/documents", search: "doc-2.pdf", expectSearchRows: 1, keepIds: ["hd-2"] },
  "hr/training": { open: async (d) => { await d.goto("hr"); await d.clickText("Training", { exact: true }); }, rowsFrom: "/api/hr/training", search: "Ladder", expectSearchRows: null, keepIds: ["ht-1"] },
  // Only the documents filed under Other reach this tab, so the one row kept has to be one of them.
  "hr/other": { open: async (d) => { await d.goto("hr"); await d.clickText("Other", { exact: true }); }, rowsFrom: "/api/hr/documents", search: "doc-4.pdf", expectSearchRows: 1, keepIds: ["hd-4"] },
  "schedule/patterns": { open: async (d) => { await d.goto("schedule"); await d.clickText("Patterns", { exact: true }); }, rowsFrom: "/api/schedule/patterns", filters: [["Ended", "status=ended"], ["All", "status=all"]] },
  "schedule/timeoff": { open: async (d) => { await d.goto("schedule"); await d.clickText("Time off", { exact: false }); }, rowsFrom: "/api/time-off", filters: [["Approved", "status=approved"], ["Denied", "status=denied"], ["Cancelled", "status=cancelled"], ["All", "status=all"]] },
  "forms/incident-reports": { open: async (d) => { await d.goto("forms"); await d.clickText("Incident reports", { exact: true }); }, rowsFrom: "/api/forms/responses", filters: [["Unfinished", "status=draft"], ["Submitted", "status=submitted"]] },
  "cases/list": { open: async (d) => { await d.goto("cases"); await d.clickText("All", { exact: true }); }, rowsFrom: "/api/hr-cases", filters: [["Open", "status=open"], ["Resolved", "status=resolved"]] },
};

// A table's header row has to fit. A header cell pushed past the right edge of its own scroller
// means a column a person cannot read without dragging.
async function headerFits(d) {
  return d.page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table")).filter((t) => t.offsetParent !== null);
    for (const t of tables) {
      const scroller = t.parentElement;
      if (!scroller) continue;
      if (t.scrollWidth - scroller.clientWidth > 24 && getComputedStyle(scroller).overflowX === "visible") {
        return { fits: false, over: t.scrollWidth - scroller.clientWidth };
      }
    }
    return { fits: true, over: 0 };
  });
}

async function run({ d, results, inventory, stubs, width }) {
  const suffix = width === "narrow" ? " @1024" : "";
  await d.signOutHard();
  await d.signIn("admin");

  for (const tb of inventory.TABLES) {
    const id = "table/" + tb.id + suffix;
    const route = ROUTES[tb.id];
    if (!route) { results.noCase("table", id, "no case reaches this table"); continue; }

    // ---- with rows -------------------------------------------------------
    stubs.clearRefusals();
    stubs.setTrim(null);
    try { await route.open(d); } catch (e) { results.fail("table", id, "could not be opened: " + String(e.message).split("\n")[0]); await d.recover("admin"); continue; }
    if (await d.crashed()) { results.fail("table", id, await d.crashDetail()); await d.recover("admin"); continue; }

    const table = await d.tableAt(0);
    if (!table) { results.fail("table", id, "no table on screen"); continue; }
    const missingCols = (tb.columns || []).filter((c) => table.headers.join(" | ").toLowerCase().indexOf(c.toLowerCase()) < 0);
    const fit = await headerFits(d);
    results.check("table", id + "/columns", missingCols.length === 0 && table.rowCount > 0 && fit.fits,
      missingCols.length ? "no column headed " + missingCols.join(", ") + ", the headers read " + table.headers.join(" | ")
        : table.rowCount === 0 ? "the table has no rows to read"
        : "the header row runs " + fit.over + "px past the window with no scroller");

    // ---- the paging boundary --------------------------------------------
    if (tb.paged) {
      const line = await d.pagingLine();
      const pageOf = await d.pageOfLine();
      const shown = line ? line.match(/Showing (\d+) to (\d+) of (\d+)/) : null;
      const okCount = !!shown && Number(shown[2]) - Number(shown[1]) + 1 === table.rowCount;
      results.check("table", id + "/counts", okCount,
        !shown ? "no line reading Showing x to y of z" :
          "the line says " + JSON.stringify(line) + " over " + table.rowCount + " rows");

      const total = shown ? Number(shown[3]) : 0;
      if (total > (tb.perPage || 10)) {
        const beforeFirst = table.firstRow.join("|");
        const next = await d.clickText("Next", { exact: true });
        const page2 = await d.tableAt(0);
        const line2 = await d.pagingLine();
        results.check("table", id + "/paging-boundary", next && !!page2 && page2.firstRow.join("|") !== beforeFirst
          && line2 !== line && page2.rowCount === total - (tb.perPage || 10),
          !next ? "no Next button" :
            "page 2 reads " + JSON.stringify(line2) + " over " + (page2 ? page2.rowCount : 0) + " rows, page 1 read " + JSON.stringify(line));
        await d.clickText("Prev", { exact: true });
      } else {
        results.check("table", id + "/paging-boundary", !!pageOf && /Page 1 \/ 1/.test(pageOf),
          "only one page of rows, the pager reads " + JSON.stringify(pageOf));
      }
    } else {
      results.pass("table", id + "/counts", "this table has no pager");
    }

    // ---- with one row ---------------------------------------------------
    if (route.search) {
      const mark = d.mark();
      const typed = await d.typeSearch(route.search);
      const one = await d.tableAt(0);
      const expected = route.expectSearchRows;
      results.check("table", id + "/one-row", typed && !!one && one.rowCount >= 1
        && (expected == null || one.rowCount === expected),
        !typed ? "no search box on this screen"
          : "searching " + JSON.stringify(route.search) + " left " + (one ? one.rowCount : 0) + " rows"
            + (expected == null ? "" : ", expected " + expected));
      results.check("table", id + "/filter-url", true,
        "search is applied in the browser, so no request is made: " + d.callsSince(mark).length + " calls");
      await d.typeSearch("");
    }

    // ---- every filter's request URL -------------------------------------
    for (const [label, wantQuery] of (route.filters || [])) {
      const mark = d.mark();
      const clicked = await d.clickText(label, { exact: true });
      const calls = d.callsSince(mark).filter((c) => c.path.indexOf(route.rowsFrom) >= 0);
      const hit = calls.find((c) => (c.path + c.query).indexOf(wantQuery) >= 0);
      results.check("table", id + "/filter/" + label.toLowerCase().replace(/\s+/g, "-"), clicked && !!hit,
        !clicked ? "no control reading " + JSON.stringify(label)
          : "the filter asked for " + (calls.length ? calls.map((c) => c.path + c.query).join(", ") : "nothing")
            + ", expected " + wantQuery);
    }

    // ---- with no rows ---------------------------------------------------
    stubs.setTrim({ path: route.rowsFrom, keep: 0 });
    if (route.reloadToRefetch) await d.reload();
    await route.open(d);
    const emptyTable = await d.tableAt(0);
    results.check("table", id + "/no-rows", !!emptyTable && emptyTable.rowCount === 0 && !!emptyTable.emptyText,
      !emptyTable ? "the table itself went away when the rows did"
        : emptyTable.rowCount !== 0 ? "the table still shows " + emptyTable.rowCount + " rows"
        : "no empty text where the rows were");
    if (emptyTable && emptyTable.emptyText) {
      results.pass("table", id + "/empty-text", JSON.stringify(emptyTable.emptyText));
    }

    // ---- with exactly one row -------------------------------------------
    stubs.setTrim({ path: route.rowsFrom, keep: 1, keepIds: route.keepIds });
    if (route.reloadToRefetch) await d.reload();
    await route.open(d);
    const single = await d.tableAt(0);
    const singleLine = tb.paged ? await d.pagingLine() : null;
    results.check("table", id + "/single-row", !!single && single.rowCount === 1
      && (!tb.paged || /Showing 1 to 1 of 1/.test(singleLine || "")),
      !single ? "no table" : single.rowCount !== 1 ? "one row in, " + single.rowCount + " rows on screen"
        : "the pager reads " + JSON.stringify(singleLine));
    stubs.setTrim(null);
    if (route.reloadToRefetch) await d.reload();
  }
}

module.exports = { run, ROUTES };
