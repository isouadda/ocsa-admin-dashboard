# audit

One command walks every page, every view, every window, every table, every report, every export and
every decision in this dashboard, signed in as four kinds of person.

```
npm run audit
```

It builds the production bundle, serves it, and drives it in a headless browser at 1280 by 900, then
repeats the pages, views and tables at 1024 to catch a table that will not fit. Nothing in `src/`
is touched and nothing leaves the machine.

**Every dashboard build from now on runs `npm run audit` and pastes the table.**

## What comes out

```
pages covered       <n> of <n>
views covered       <n> of <n>
windows covered     <n> of <n>
tables covered      <n> of <n>
reports checked     <n> of <n>
exports checked     <n> of <n>
decisions exercised <n> of <n>
refusals shown      <n> of <n>
known failures      <n>
FAILURES            <n>
```

Any failure exits non-zero.

## Why it can be trusted

**Coverage is proven, not claimed.** `audit/discover.js` reads `PAGE_IDS`, `pageLabels` and every
`<Mdl` site straight out of `src/App.js` at run time. `audit/cases/coverage.js` compares that against
`audit/inventory.js` and prints `NO CASE` for anything the app has and the suite does not drive. Add
a page to `src/App.js` and the next run fails until it has a case.

**The numbers are checked against arithmetic done by hand.** `audit/seed.js` carries the whole seeded
world, and beside every group of rows a comment works out the total by hand. `audit/cases/reports.js`
compares what the screen shows against that figure and prints both numbers on a mismatch.

**Exports are parsed, not glanced at.** Each CSV is parsed with quoting respected, its header is
compared column by column, its row count is compared with the seed, and a row with a different number
of cells than the header fails. A print export is caught in the window the app opens for it and its
tables are read out of the HTML.

**Refusals are shown word for word.** Each refusal the API can answer with is armed one at a time,
and the case checks that the exact words reach the screen and that nothing closed underneath them.

**Every call says its language.** The stub keeps the `Accept-Language` each call sent beside the
call, and every call that sent none, or sent a language other than the one its screen is drawn in,
in a list no case can reset. The run fails on that list once every suite is done.

## How to run less of it

```
AUDIT_ONLY=pages,views npm run audit     # one or more suites
AUDIT_FORCE_BUILD=1 npm run audit        # rebuild even when the bundle looks fresh
AUDIT_CHROMIUM=/path/to/chrome npm run audit
```

The suites are `pages`, `views`, `windows`, `tables`, `refusals`, `reports`, `exports`, `decisions`,
`permissions`, `notices`, `report-actions` and `house-style`.

## Known failures

`audit/known.json` holds the failures the app has today that the audit build does not fix, because
nothing in `src/` changes. Each entry says what the app shows, one line on why, and the file and line.

- A known failure **prints on every run and does not fail the run.**
- A known failure that **starts passing fails the run** until its entry comes off the list, so a fix
  is never merged without somebody noticing.
- A known entry that **no case exercises** fails the run too, so a renamed or deleted case cannot
  leave a stale entry behind.

An entry matches a case id exactly through `case`, or by a regular expression through `match` when
one finding shows up under several case ids.

## The browser

One devDependency, `playwright-core` pinned to `1.56.0`. It downloads no browser on install, so a
Vercel build is untouched by it. It finds Chromium through `PLAYWRIGHT_BROWSERS_PATH` when that is
set, which is what CI images already do. On a machine with no browser:

```
npx playwright@1.56.0 install chromium
```

or point the audit at one you already have with `AUDIT_CHROMIUM`.

## The fixed clock

Every page sees **9:30 PM America/New_York on 2026-03-17**, which is **1:30 AM on 2026-03-18 in UTC**.
That gap is deliberate: a date read as UTC midnight shows the wrong day, and a time formatted through
UTC shows the wrong hour. A session that started at `22:05Z` has to read `6:05 PM`.

## Files

| file | what it holds |
| --- | --- |
| `run.js` | the one process: build, serve, drive, print the table, exit non-zero on any failure |
| `seed.js` | the seeded world, every value invented, every report total worked out by hand |
| `stubs.js` | every API call answered, and nowhere else |
| `inventory.js` | the declared spine: pages, views, windows, tables, reports, exports, decisions, refusals |
| `discover.js` | reads the app's own lists out of `src/App.js` so coverage is proven |
| `known.json` | failures the app has today, each printing on every run |
| `lib/build.js` | runs `npm run build`, reusing a bundle that is already fresh |
| `lib/serve.js` | a dependency-free static server with the single-page fallback |
| `lib/browser.js` | launches Chromium, with fallbacks and a clear message when it cannot |
| `lib/driver.js` | the object every case drives the app through |
| `lib/results.js` | pass, fail, known failure, `NO CASE` |
| `lib/table.js` | the table, and the gate |
| `cases/*.js` | one file per suite |

Every fixture value in here is invented. No real person, site, phone number or email appears
anywhere, and the suite never reads the live API.
