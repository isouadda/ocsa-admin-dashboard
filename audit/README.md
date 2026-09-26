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
in a list no case can reset. A signed-in call also names its language once on the address, as
`locale=en` or `locale=es`, which the API reads ahead of the language on the person's account; the
stub turns away one that names none, two, or another language, and keeps it in the same kind of
list. The run fails on both lists once every suite is done. The language on the address is taken
off the query a case reads, so a route is held to exactly what it has always asked for.

**What the API says in that language goes where it belongs.** The stub answers a checklist item with
`display` and a pick list choice with `displayLabel`, in the language the call asked for, the way the
API does. The `language` suite reads them in Spanish, where they are different words from the
English they were saved in: a screen that only shows an item or a choice draws them, and a screen
that edits one shows the English and sends the English. It opens a filed report the same way and
holds each question and answer to the text the API sent, exactly; the stub's answer carries a bar,
where the word table would cut it if the text went through it.

**Help fits the window.** The `help-fit` suite reads the Help page at 1024 and 1280 wide and 660 and
900 high, at every text size, in both themes and both languages: with the one unfinished report the
suite serves, with five, with a report resumed that holds thirty messages, with both, and with five
while an answer arrives and once it is finished. The page is never taller than the window, the send
box ends inside it, the thirty messages scroll inside the conversation, the reports list stops at three
rows and scrolls inside itself, an empty conversation's line sits in the middle of its area, and the
newest words of an answer that is arriving are inside the conversation, with no mark in them.

**Help's answer appears as it is written.** The `help-stream` suite asks Help questions in both
languages and has the answer written the way `POST /api/agent/message/stream` writes it: meta, the
text in pieces that cut a word or a bold phrase in two, a reset, done, an error in its place, or a
connection that drops part way. `route.fulfill` sends a body whole, so the stub answers the streaming
route with a 307 to `audit/stream.js`, a small local server that writes each event with a pause before
it, holds an answer part way until the journey has read the page, and destroys the socket for a drop.
The conversation reads the stored answer back, once it is stored. The line under an answer names a
guide or a general reference in the owner's words and a company document by its code, and the suite
holds it to that line written out by hand in each language.

**The checklist editor keeps every item.** Since Step 124 a site's checklist read answers only today's
items of the caller's open shift unless it is told otherwise. The stub answers it the same way, with a
shift open at a site for whoever a case says. The `checklist` suite opens the Night shift at the first
site for an admin and for a supervisor and reads Service Details, which has to draw every item, and
every checklist read any suite makes has to send `day=all&shift=`. The `forms-menu` suite holds the
sidebar's Forms to the test the Forms page opens by.

**A role on HR Records is a word.** The stub answers the Employees grid and a person's folder in the
shapes the page has read since Session 22, so the grid draws a card for each person. The `hr-roles`
suite reads every card, the first person's folder and the Staff Summary on Compliance, in English and
in Spanish, and holds each role to the word the table has for it. The role labels are read out of
`src/App.js`, so the check follows the app, and the role's own code is never an answer. The stub
carries the `training_types` and `onboarding_categories` lookups with Spanish, and the same suite
holds the Training table's Type column and the Onboarding checklist's headings to the word each
lookup the page was served gives the code. On Shift Pickup it reads the role of whoever claimed a
shift and the role under each name on the Staff Reliability tab, which the stub answers the way the
API does, and holds each to the `staff_roles` list's shown label; then it reads both again with a
role left off the list the page is served, which `setListGap` does, and holds that role to the
table's word for it. It reads every shift's status, reason and service on the same list: the status
is the table's word for the code, the reason the `shift_origins` list's shown label, and the service
the `service_categories` list's shown label for what the shift saved, a code from Schedule or a
label from Shift Pickup. The stub carries both lists since Step 143, with Spanish. It then opens
Post Open Shift and Schedule Shift and holds their Reason and Service Category lists to the shown
labels, each sending what it has always sent.

**A role on Staff Management is a word, a save sends what it always sent, and what a person typed
into a case is drawn as typed.** The `staff-cases`
suite reads the Status, Role and Employment columns of every person on the list's first page and the
first person's banner, in English and in Spanish at 1024, and holds each to the word the table, or
the pick list the page was served, has for it; the role's own code is never an answer. It reads the
first person's onboarding steps on the HR Files tab and holds each to what the API sent: a step the
API says is done carries its tick and the day it was done, and no other step does. It then adds
a person, edits one from the list, edits a profile, assigns a site, adds a certification,
deactivates a person and resets a PIN, choosing every value it can from its list, and holds each
body the page sends to one written out by hand, the same in both languages. It reads Cases the same
way: every row of the list for its status, its response and who holds it, and every case's window
for its log's roles and actions, and for the summary, the resolution notes and every name, which are
held to the text the API sent, exactly.

**Settings saves what it saves in English.** The stub answers the Dropdown Options lists and the
company's settings in the API's shapes and puts the settings back on a reset. The `settings` suite
reads every value of the first list, in English and in Spanish at 1024: the English it was saved in,
and in Spanish the words the API sends for it on the line under that. It then saves the company's
settings with the time zone and the pay period's first day chosen by the words the lists show,
adds, edits and turns off a list and a value, moves a value and deletes one after the table's
question, and adds and edits a site's value with its type chosen by its word, and holds each body
the page sends to one written
out by hand, the same in both languages. The stub sends the API's own capabilities, kinds of report
and forms, which the API names in English only, and one capability code the dashboard does not
know. The suite reads every capability and group on Roles and Permissions for one person and every
kind of report and form on Who gets told, and holds each to the table's word for its code, and the
unknown code to the name the API sends. It reads each role in the person picker, under the person's
name and beside each name on Who gets told. It then allows a capability for the person and saves it,
and on Who gets told adds a person chosen by the name and role word the list shows, adds an outside
address, turns email on, sends a form's report as a PDF and removes a person after the table's
question, each held to a body written out by hand.

**A question is in the language of the screen.** The `questions` suite presses each button on
Schedule and Shift Pickup that asks before it changes something, reads the browser's question box
and answers No, and holds the question to the table's words in English and in Spanish. It reads the
word a custom date range puts between its two dates the same way. The `zone-chips` suite reads the
zone chips on the first site's General Info: a zone a task at the site carries draws the task's
display, one no task carries draws the zones lookup's shown label, and one neither carries is drawn
as it was typed. It takes the words from what the stub answered the page, in the language asked for.

**A printed page is in the language of the screen.** A print is a page the dashboard builds as a
string of HTML, writes into a new window and prints. The `prints` suite opens each one on a page taken
as done the way a person does, reads the text between the tags of what the window was given, and in
Spanish holds it to the same English check the screens get.

**A chart is in the language of the screen.** The page reader leaves SVG out, and a chart's axis
labels, legend and donut words are SVG. The `report-screens` suite runs each saved report as an admin
and as a supervisor, reads its screen, then reads every chart's SVG text and legend and points at each
bar and trend to read the tooltip a person sees. In Spanish all of it is held to the English check. It
also saves a new report, an edited one and a copy in each language, and holds each body the editor
sends to one written out by hand: the report editor saves the codes and the English it always has.

**A room is logged once.** The `training` suite drives HR Records' Log training for several people as
a supervisor, the way the API lets one in: the staff list the shell reads is refused to a supervisor,
so the window lists everyone active and a site's active people from the HR routes a supervisor may
call, and the stub's training routes answer the way `routes/hr.js` does. The stub refuses a supervisor
the whole set of pick lists too, the way `routes/lookups.js` gates `GET /api/lookups/all`, and answers
`GET /api/lookups` with the active lists, so the suite sees the shell fall back to it: the window
offers every active training type, and + Add Training offers everyone active. The suite logs three people
and holds each of the three creates to a body written out by hand, presses Save again and sees nobody
sent twice, has the API refuse one person of three and sees the other two saved, the refused one named
in the API's own words and Try again send only that one, and opens the window at 11:30 PM in
Philadelphia to see that evening's day sent. It picks a training on the Training tab and holds the
list of who has no record of it to the active people worked out by hand, all sites and one site, and
sees a person logged from the window leave the list. It prints a session's attendance sheet from the
window and from the list, holds its people to everyone logged for that name and day and its words to
the table, and blocks pop-ups to see both say so. Each in English and in Spanish, and each was
broken on purpose once and seen to fail. It reads the window and that list again on a phone, 390 wide,
at every text size: nothing in either runs off the side and every control is at least 44 by 44.

**Every staff picker fills for a supervisor.** The staff list the shell reads, `GET /api/users`, is an
admin's (`manage_staff`), and the stub refuses it to anyone without that capability, the way
`routes/users.js` does, so a supervisor's people come the way the dashboard reads them since Step 146:
from `GET /api/hr/employees-summary`, through one helper, `loadPeople`. The `pickers` suite signs in as
the supervisor, checks that the stub itself made the refusal and that the shell read the summary after
it, then opens Assigned Tasks' Create Task, Schedule's Schedule Shift with and without a site picked, an
open pickup's window on Schedule, HR Records' Documents tab and its + Add Document, Inspections' Schedule
Inspection and an inspection's window on Schedule, and holds each picker to the seed's active people: a
task created for a person sends that person's id, the filter reads a person's records by their id, a
document is sent to their id, and an inspection sends its supervisor's id. The stub answers the document
upload the way `routes/jotform.js` does. It reads the same pickers as an admin, whose list the stub
answers, and notes what each offers. Both languages, at 1024.

## How to run less of it

```
AUDIT_ONLY=pages,views npm run audit     # one or more suites
AUDIT_LANG=es npm run audit              # only the passes drawn in that language
AUDIT_FORCE_BUILD=1 npm run audit        # rebuild even when the bundle looks fresh
AUDIT_CHROMIUM=/path/to/chrome npm run audit
```

The suites are `pages`, `views`, `windows`, `tables`, `refusals`, `reports`, `exports`, `decisions`,
`permissions`, `notices`, `report-actions`, `language`, `help-fit`, `help-stream`, `checklist`,
`forms-menu`, `hr-roles`, `staff-cases`, `settings`, `questions`, `zone-chips`, `prints`, `report-screens`,
`training`, `pickers` and `house-style`.

## How much is left in English

```
node audit/count.js
```

It counts, page by page, the strings the finder in `audit/lib/strings.js` finds that do not go through
`tr` or `trn`, in the component the render switch draws for the page and in everything that component
reaches, beside the part `audit/spanish-todo.json` gives the page. A page the file no longer lists is
done, and a count there is English left on a page taken as finished. Since Step 143 the file lists no
page: every page and every printed page reads 0, and the count is the guard that keeps it so, since
`house-style` fails the run on the first place a page taken as done draws without the table.

The finder reads printed pages too: in a function that builds a page as HTML and opens it in a window,
the text between the tags of every string is a place, the way a line a toast says is one. The count
names each print it finds after the parts, by the component and function that build it, the line it
starts on and the page that prints it. `house-style` holds the finder to a plain count of the pages
`src/App.js` opens, and fails the run when a page taken as done has any English the finder can find,
a printed page included. A page still listed in `audit/spanish-todo.json` names the printed pages the
finder counts English on, and `house-style` fails the run when the list and the count part, so the
part that takes a page takes its prints with it.

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
| `stream.js` | Help's streaming route, written for the browser a piece at a time |
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
