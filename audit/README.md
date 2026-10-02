# audit

One command walks every page, every view, every window, every table, every report, every export and
every decision in this dashboard, signed in as four kinds of person.

```
npm run audit
```

It builds the production bundle, serves it, and drives it in a headless browser at 1280 by 900, then
repeats the pages, views and tables at 1024 to catch a table that will not fit, and the pages once
more on a phone, 390 by 844, to catch a page that will not fit a hand. Nothing in `src/` is touched
and nothing leaves the machine.

**Every dashboard build from now on runs `npm run audit` and pastes the table.** While the owner has
the full run paused, every build runs the smoke check below instead, beside `npm run build` and
`npm run guide-check`, and all three pass before a pull request opens (`CLAUDE.md`).

## The smoke check

```
npm run smoke
```

`smoke.js` is the quick check, in under three minutes, built from this folder's own parts: the stub,
the static server, the browser and the driver. It serves the `build/` already made and stops at once,
with one failed line, when anything in `src`, `public` or `package.json` is newer than that build.
Then it checks, one line a check:

- at 1280 in English and in Spanish and at 390 in English, an admin signs in, the Spanish pass through
  the code screen of the second sign-in step, which the smoke check arms the stub to ask for;
- every side panel item opens with no page error, no crash and no sideways scroll;
- Reports opens one card of each group, a filed form opens, Customer links opens, and Help answers;
- at 1280 in English a supervisor sees only the admin items the seed gives them, and every item they
  see opens the same way.

A check that leaves the app behind its error boundary is reloaded and signed back in, so the checks
after it still run. Any failure, or a run of three minutes or more, exits non-zero. It finds the side
panel's items by `data-nav-item` and Reports' groups by `data-report-group`.

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

**A new person's PIN is shown once, and an admin's account is an admin holder's to change.** The
`staff-pins` suite adds a person on Staff Management and holds the window the save opens, Step 181's
Temporary PIN: the person's name, the PIN masked, Show drawing the PIN the API answered and Hide
masking it again, Copy putting it on a clipboard kept on the page, and Send activation invite posting
to the person's invite route. It resets a custodial lead's PIN through a masked number box and holds
the toast to the person's name. As an admin without `manage_admins`, which no admin holds by default,
it reads the list's pencils, on every row but an admin's, and another admin's profile, which offers no
Reset PIN, no reset link, no Deactivate and no Edit. It saves a profile with an employee ID somebody
else holds, has the API refuse it with `users.employeeIdTakenByOther`, and holds the line under the
field to the table's words. Both languages, at 1024.

**A day the API sends is the day it names, and today is March 17.** Since Step 181 one parser reads a
DATE the API sends from its first ten characters, and toISO builds a day from the clock's local parts,
so at 9:30 PM in New York, which is already March 18 in UTC, no day reads as the evening before and no
today reads as tomorrow. The `dates` suite reads, in both languages, each card's due date on Assigned
Tasks and the day and time in its window, a site's Contract Dates, its assigned task's due date and its
upcoming shifts, each vendor's Reviewed line, an evaluation and the approved vendor list's Last Review
Date, a person's hire date on their HR folder and the folder's training and onboarding lines, which
carry the day and no clock, a Jotform filing's Expiry on its row and in its window, a certification's
expiry on Staff Management, the issue report's weekly buckets on its two trend charts and on its print,
and the months under Shift Pickup's Monthly Totals, and holds each to the day the API sent, written out
by hand. It holds every today to March 17: Live Operations' day, the week's today column on Schedule,
the day Schedule Shift opens on, the next 30 days Convert Callout reads, the last 30 days on Shift
Pickup and on the issue report, and the day in the names of a person's and a site's timeline files, the
approved vendor list and the service catalog. The stub sends a site's assigned task with its due date,
a folder's training and onboarding days at midnight UTC the way `routes/hr.js` sends them, and the
months of Monthly Totals as the DATE the API's driver sends, midnight UTC of each month's first day.

**Every control a finger presses is 44 by 44 on a phone.** Since Step 181 every button is at least 44
by 44 and every select, text area and text input at least 44 tall, through one rule in the stylesheet
and minHeight in the primitives; every close X is 44 by 44 and named Close; the floor plan's View, the
file on a record, a vendor's website and Open in Jotform are 44 tall; a checkbox that stood in a div
sits inside a 44 by 44 label; and under 700 pixels Schedule's week is a stacked list of days whose
chips are buttons. The `forty-four` suite reads every page an admin opens at 390 by 844, in English
and in Spanish, and holds every button on it to 44 by 44 and every input, select and text area to 44
tall, with half a pixel for rounding. It holds the four links to 44 by 44, the X of fifteen windows,
opened the way the `windows` suite opens them, to 44 by 44 and to Close in the screen's language, and
the six checkboxes to a label 44 by 44. It holds Schedule's week to seven blocks, Monday to Sunday in
order, one under the other and inside the screen, and each of the twelve chips the stub puts in the
week, four shifts, four starts, an open shift, a drop request, a claim and an inspection, to a button
44 by 44 in its day. The stub's first vendor has a website, each Jotform submission its address on
Jotform, and a resolved task's record the photo taken when it was resolved, the way the API answers
them. What the build left as it was is not held: the month view's day cells, the week grid's empty
day cell and the two stacked move arrows on Dropdown Options.

**A control shows for whoever holds what guards it.** Since Step 181 the shell reads the person's own
capabilities from `GET /api/users/me/permissions` once after sign-in, and gates every control the API
guards with a capability on that capability. The stub answers the route the way `routes/users.js`
does, from the role's defaults and the overrides it holds on the account. The `capabilities` suite
holds the sign-in to one read of that route and none of the per-person one, then signs in a
supervisor holding `manage_sites` by override, who is offered Add Site, Edit Details and Deactivate,
and one on the role's defaults, who is offered none; an admin denied `manage_supplies`, who finds no
Add Supply and a card that opens nothing, and one on the defaults, who finds both. On Roles and
Permissions it holds the line an admin's account carries, the line one's own account carries, and
the manage_admins row, which only a holder can grant, each with nothing to press. Both languages.

**An answer can be rated, and names its sources.** Since Step 185 an answer that carries its id, from
done or from the conversation, is followed by Was this helpful? with Yes and No. The stub stores an
answer with its id and the names of what it cited, and answers `POST /api/agent/messages/:id/feedback`
the way `routes/agent.js` does. The `help-rating` suite asks two questions in each language: the first
answer's line names its two sources by the names the API sent, and Yes posts `{ helpful: true }`; the
second answer's No opens What was missing?, and Send posts `{ helpful: false, note }`. Each draws the
thanks line. It then resumes a report whose conversation holds an answer rated No with a note, and
holds the buttons and the line under them to the stored rating.

**Help insights reads what the API counted, with every filter on the address.** Since Step 185 a page
for whoever holds `view_help_insights` reads `GET /api/help-insights/summary`, `/misses` and `/people`,
and a person's own questions from `/people/:id`. The stub holds seven answers Help gave and counts every
figure from them through the filters the address names, the way `routes/helpInsights.js` counts, with
the totals worked out by hand beside the rows. The `help-insights` suite holds a supervisor, who is not
named, to no side panel item and no read behind the address; an admin, who is, to the item, the three
reads with the last 30 days on the address, every tile and table to what the routes answered, a
person's questions under the line Opening this is recorded, and each filter, site, role, app and
language, on the address of all three. The case that holds All languages to every language is a known
failure: the filter and the language every call names are one parameter, `locale=`, which the API
reads as both.

**A code the API writes is drawn as a word.** The `codes` suite reads, in both languages, the Jotform
sync log, where each sync's type and status, one of every type and status the API writes, `partial`
included, is the table's word, and the unresolved failures, where each stage is; a weekly pattern's
change, whose answer lists the dates kept and skipped with a reason and a code each, drawn as the
table's word for the reason; the Started Shift window, which draws the person's role as the
`staff_roles` list's shown label; and a document whose file the API refuses with a JSON error, where
the toast carries the error the API wrote. Every word is written out in the suite by hand.

**Four leftovers.** The `leftovers` suite reads, in both languages, Staff Management's list, where
the one row the stub sends with `isTestAccount` carries the Test account mark and no other row does;
Supplies, where every card's QR image is a data URL of the PNG `GET /api/supplies/:id/qr.png`
answered, one read per supply and none of the outside QR service; HR Compliance, where Certifications
expiring soon counts 2 and Expired certifications counts 1, worked out by hand from the stub's
`expiringCerts` and `expiredCerts`, each listed with its expiry; and the bell, where a notice whose
link is `#forms/reports/ir-1` opens Forms on that report, in the same tab, with the report read.

**A manager corrects the Spanish where the English is edited.** Since Step 185 Edit Task on a site's
checklist and Edit Value on Dropdown Options read the Spanish the portal draws, with `locale=es`, and
show it under Shown in Spanish as; a changed field is saved after the English through its own
translations route as `{ locale, field, text }`, which the stub answers the way `routes/sites.js` and
`routes/lookups.js` do, and the toast says the wording is saved. The `corrections` suite reads, in both
languages, the item's Spanish name and instructions and the value's Spanish label as the stub serves
them, changes one field in each and holds the calls to one English save and one correction, in that
order, and the toast to the table's words. It then renames an inspection template and holds the
`PUT` to the name typed and the description the card already had, which the route writes as well.

**A read that fails says so where its rows would be, with Try again.** Since 6a68c11 a list, a card or a
window whose read fails draws one line in its place, This did not load. or the words the place has for
it, with Try again, through one primitive, LoadFailed. The `load-failed` suite refuses each read the build
lists, one at a time, with the API's own server error, `common.serverError`: the Dashboard's figures,
Started today and Inspection scores by site, Staff Management, a site's Timeline and Chat, the Issue
Tracker, Messages' conversations and one conversation, the Reports library and its three run views,
Vendors, Services, Schedule's calendar, Shift Pickup's list and analytics, Inspections' templates, lists
and analytics, Settings' Company and Dropdown Options, HR Compliance, a person's folder, and the Jotform
Inbox, Forms, PDF access log and submission window. It holds the place to the line and to Try again, lets
the read through, presses Try again and holds the place to the rows the stub served, with the line gone.
Staff Management refused with `access.insufficientPermissions` says This page is for admins. with nothing
to press, and the folder offers Back beside Try again. It holds a chip on the Issue Tracker whose state
has no rows to No issues in this state., Schedule's week with nobody matching the search to No staff to
show for this filter., and a Refresh on Schedule and on Shift Pickup, while the stub holds the read open,
to the week and the list still drawn with no Loading line. Both languages, every word written out by hand.

**An admin voids a filed report with a reason, and a filing says where it came from.** Since Step 179
a report's payload carries `canVoid` and `canResend`, and the stub answers `POST
/api/forms/responses/:id/void` the way `routes/forms.js` does: each refusal in the API's code and
words, the reason kept, and the report read as void after, by its read, the list and every flag, until
a reset. `setFiledSources` gives the seed's filings the source the API stores and the admin a
complaint log of their own. The `void` suite reads, in both languages, the line under each form's name
on Filed forms, held to the word for the source the list sent; the admin's status switch, which gains
Void once `?status=void&limit=1` answers 200, and the supervisor's, which does not; Void on a payload
with `canVoid` and none without it; the window that asks why, a refusal drawn in the API's words, the
body `{ reason }` and the report reading Void after and on a later read from the Void switch; Send
again on `canResend` and none on the admin's own filing; and a photo whose thumbnail the API refuses,
whose square reads Photo could not be loaded. Every word is written out in the suite by hand.

**Messages counts what is unread, and a tag, an announcement and a phone alert go where the API says.**
Since Step 181 Messages lists the general chat and every site chat `GET /api/chat/channels` answers
above the private conversations, and the side panel draws their total, summed over that route. The stub
answers the Step 179 routes the way ocsa-api does: the chats with `unreadCount`, read from counts a case
sets and put back to 0 when a chat is read, the read route, the members route, a send that checks its
`mentions`, the announcements list, the preview's counts, the send, and `GET` and `PATCH
/api/notifications/settings`. The `messages` suite reads, in both languages, each chat's count and the
total on the side panel open and collapsed, and sees a chat's read route posted and the total drop when
it opens. It opens Tag someone from its button and from a typed @, holds its rows to the members route
and a search, holds a send to `{ text, mentions }` written out by hand and each tagged name to bold, sees
a failed send keep the text and a failed load say so, and stacks the list and a conversation at 390 with
Back. On Announcements it reads what was sent, holds the line under the audience to the preview's counts
for everyone, a site, a role and chosen people, worked out by hand, holds a send to its body, and sees a
refused list draw nothing; a supervisor finds the page only when holding `send_announcements` by an
override. The bell opens a chat notice and a tag on their chat and an announcement on its page. My
alerts, from the name menu and the phone's More menu, shows the settings the API sent, sends each change
as a PATCH of its own, held to a body written out by hand, and says so when a change is refused.

**A service category is a plain word, or the list's own label.** Since Step 181 a service category is
one of six plain words, Cleaning, Quality checks, Management, Green cleaning, Safety, and Staff and
training, keyed by the codes the API stores, and a page that reads the `cims_categories` list draws the
list's shown label for a code the list holds. The `categories` suite reads, in both languages, every
place a category is drawn twice: with the list as the stub serves it, and with SD left off it, which
`setListGap` does. On the Service Catalog that is each card's badge and line, a service's window, Edit
Service's list, which offers the words and sends the code, and the export, which writes the English
word; on Inspections, the pills on a template's items and on an inspection's items and its printed
report, the Reports tab's breakdown and lowest items and their printed page, and the two files, which
write the list's English label or the English word; on Staff Management and Sites, a task's Record
Detail window and printed page, whose row reads Service category. The stub answers the detail route for
a task with the task's row, the way `routes/users.js` does, and for a service with found false, so Staff
Management's window draws a created service's metadata, whose category line is held too; `setTimeline`
hands a person's timeline those two entries. The suite also holds the issue reports on Reports, saved
under the framework's old category, to the heading Issues, a new report's Category to empty with its
example, and every screen, page and file it read to carry the framework's name nowhere.

**The Form builder is found by whoever the permissions route names.** Since Step 187 a page for a
holder of `build_forms` lists every form the API holds as versions, `GET /api/form-builder/forms`,
which the stub answers the way `routes/formBuilder.js` does at ocsa-api 94dbe27: four forms, one
published from the code, one published from the builder with a draft open, one retired and one a
draft never published, each with its versions and who published them. The `form-builder` suite holds
a supervisor on the role's defaults, and an admin whose permissions route does not answer, to no side
panel item and no read behind the address; an admin, and a supervisor holding the capability by
override, to the item and one read of the list; every row to the list the API answered, the title in
the screen's language, the version, the status, the source and Edit; a row's Version history to its
versions newest first, with when and who in the screen's language written out by hand; Retire form,
for an admin alone, to the question, the reason sent and the row read again as retired; Edit and New
form to the draft opened or started and kept in the hash; a list that does not load, and an empty one,
to their lines; and the capability's name on Roles and Permissions. Both languages.

**The builder draws what the API answered.** A form's Edit opens the builder on the draft the API
holds, `GET /api/form-builder/drafts/:id`, and the stub answers every route it calls the way
`routes/formBuilder.js` does: the read with its preview in the language the address names, a turn from
what the draft's script holds next, the sample PDF, who gets the filled report, publish and discard,
each refusal in the API's words. The `builder` suite has the draft's read refused and holds the page to
This did not load. with Back and Try again; opens the floor buffer sign-out's draft and holds the
header, the stored turns with their times, the problems and the Staff app's questions to the read;
sends a turn, held open, and sees Send off and The builder is working...; holds the conversation, the
preview and the problems to the answer, and Publish off while a problem is left; has the next turn
refused and holds the API's words under the person's line, with the words back in the box; switches
the preview to the other language and holds its questions to the read with that `locale=`; presses Try
it, answers the governing question and sees the governed one appear, with no route reached; reads the
sample in its frame with Download PDF; and discards the draft after its question. On the complaint
log's draft it changes the delivery and holds the `PATCH` to the whole list, then publishes as an admin
and reads Published as version 3. with the form's title; a supervisor holding `build_forms` reads Only
an admin can publish. Both languages.

**Nothing is deleted, and every screen that removes something says so.** Since Step 179 the API keeps
every row a person removes and marks it, a status of cancelled, is_active false or a removed_at stamp,
and every list leaves it out; the stub answers each of those routes the same way and keeps the row,
marked, until a reset. The `removals` suite, in both languages, finds a site's profile offering
Deactivate alone, which asks the table's question and opens no window, and presses every remove Step
181 renamed, each found by the row it sits in: a site's floor plan and supply, Cancel shift on the Edit
Scheduled Shift window, an inspection template and one of its line items, a scheduled inspection's X,
the custom report, a Dropdown Options value and list, a site's value, a Jotform alias, a document on
Documents, on Other and in a person's folder, a training record and an onboarding step. It holds each
button, question and toast to the table's words written out by hand, the one call the page sent to the
call the API keeps the row on, the row leaving the list the page reads again, and the stub still
holding the row, marked. The Dropdown Options editor lists every list and value, on or off, so for
those it holds the call and the mark. A completed inspection offers View alone, and no question or
screen the suite read says the change cannot be undone, nor does any question the app asks through
`window.confirm`, read out of `src/App.js` with the table's Spanish for each.

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

**What a lead sees from October 1 is in words.** The `before-training` suite reads, in both languages,
Schedule's Month view with one shift started on one day and two on another, served by the stub, and
holds the two cells to "1 started" and "2 started" and their Spanish, written out by hand; the Issues
page served no issue at all, which has to say so in one line, and served the seed's rows, which must
not; Live Ops' Refresh, whose icon path has to be the circular arrow the Dashboard's Refresh draws and
never the plus; and Settings, Who gets told, which names the complaint log by its title in the
screen's language beside its code. The `staff-cases` suite reads the Badge column after each name and
the badge number on the profile window, held to what GET /api/users and the profile sent, in both
languages.

**The dashboard fits a phone.** Under 700 pixels the shell is a phone shell: the side panel is a
drawer behind the menu button at the left of the top bar, and the bar holds that button, the page
title on one line and one More button, whose menu holds what the wider bar shows, language, text size,
notifications, light and dark, and sign out. The `pages` suite runs once more at 390 by 844, in light
at Standard in English, as the admin and as the supervisor, so the run time stays bounded, and reads
the shell and every page's first render: the body scrolls no wider than the screen, no button, input,
select, text area or link is under 44 by 44, the bar holds its three things and nothing else that can
be pressed, the drawer opens from the menu button and closes on Escape, on a pick and on its backdrop,
and the More menu holds its five items and closes on Escape. Windows at 390 and the Spanish pass at
390 wait for a later step: the training window and its list are the two read on a phone today, by the
`training` suite. At every width the suite runs, the page title draws on one line and the side panel
is collapsed whenever the page's own width is under 1,100, read before anything has touched it and
again on every page.

**Four small things beside the phone.** The `small-things` suite reads, in English at 1280 and 1024
and in Spanish at 1024, Schedule's Refresh, whose icon path has to be the circular arrow the
Dashboard's Refresh draws and never the plus; the Staff page's table, which fits its box at 1280 in
English and at 1024 scrolls inside its own card while the page never scrolls sideways, with the
table's width against its box noted on every pass; + Add Training's Administered By example, held to
"e.g. Site supervisor" and its Spanish written out by hand, with no person's first name in it; and
the Dropdown Options editor, which names every list the stub served by its label and prints no
list's slug.

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

**A customer link is made, switched and printed, and a customer's filing is read.** Since Step 169 an
administrator, anyone holding `manage_settings`, makes the links customers open from a QR code posted
in the building, for the two forms the API accepts. The stub serves three links, one live, one switched
off and one unused past its clock, and two filings a customer made through a link, with no account:
`userId` null and the customer's name and role where an account's name goes. The `customer-links`
suite opens the window from Filed forms, reads every row's title in the screen's language, its site,
its state word and its counts, makes a link and reads the request, asks for the pair again and sees
the link that exists open instead, turns one off and on, reads a refused switch under its row in the
API's own words, opens the QR screen, copies the address into a clipboard kept on the page, prints
the sheet and reads what the window was given: the logo, the site, the form's title in both
languages, the image at 512 and the scan line in both languages. A supervisor is offered no button.
It then reads the customer's filing in Filed forms: Customer in the filed-by column, the customer's
name and role in the header, the customer's signature drawn above its line, a number box that sends
a number, and the survey's section averages and overall. Each in English and in Spanish, and the
window once more at 390 wide. The `start-form` suite signs a customer's acknowledgement on a form
filled at a desk: Name, Role and the pad, Save signature sending the four keys, the drawing and the
line drawn after, Clear and a second signature, every refusal under the card in the API's words, and
a save that carries nothing for it.

**A form is offered in the apps the catalog names.** Since Step 186 `GET /api/forms` says which apps
offer each form, `apps`, and with `?app=` lists only the forms offered in that app; with no app it lists
every form. The stub answers it that way, each form with the apps the API's definitions carry, in the
language the address names, and a form made with the builder joins the catalog once a case publishes
it, the way the builder's publish makes a version the one every app offers. The `catalog` suite
publishes two: OCSA-FRM-037, offered in the dashboard and to customers, and OCSA-FRM-038, offered in
the staff app alone, with one report filed on it. It holds Filed forms' Form filter to every form the
catalog read with no app holds, in the screen's language, each builder form by its title there, and
choosing 038 to its report; Start a form to `GET /api/forms?app=dashboard`, whose picker lists the
complaint log and 037 and leaves 038 out; Customer links to `GET /api/forms?app=customer`, whose Form
select offers 037 beside the two customer forms, and a link made for 037 to what New link sends, the
QR screen and the new row; and the report's window to Version 1, the version it was filed on. Both
languages.

**A report about a person is in their folder, and a person is picked by name.** Since Step 186 a form
may name one person question as `aboutPerson`, with an HR folder category, and
`GET /api/hr/employee-folder/:user_id` sends every filed report of it that names the person, submitted
or void, as an item with `source: "form"`, its title in both languages, the category, the day filed, who
filed it and its status. A person answer is stored as `{ userId, name }`, the name read off the account.
The stub answers the folder, the start, save and send of a builder form's draft, the review, the PDF and
`POST /api/forms/responses/:id/void` the way `routes/hr.js` and `routes/forms.js` do, each refusal in
the API's words. The `folder-reports` suite publishes OCSA-FRM-039, a follow-up talk about an employee
filed under HR - Ongoing / Annual, with one report filed by the supervisor about Tomasz Wisniewski at
9:10 PM in New York on March 16. It reads that report in his HR Records folder under its category, with
FRM, the title in the screen's language, Filed form, Filed by and the day, and in the Filed forms card
of his HR Files tab on Staff Management, with the day it was filed in New York; opens it from each row;
downloads its PDF from each; voids it from the card's window and reads the Void badge on both rows and
the folder row's status as the table's word. It then starts the form from Filed forms, searches the
person question by name, picks, changes, and holds the save to `{ id, name }` of the person picked last
and the review step and the filed report's window to that name. Both languages.

## How to run less of it

```
AUDIT_ONLY=pages,views npm run audit     # one or more suites
AUDIT_LANG=es npm run audit              # only the passes drawn in that language
AUDIT_FORCE_BUILD=1 npm run audit        # rebuild even when the bundle looks fresh
AUDIT_CHROMIUM=/path/to/chrome npm run audit
```

Every pass prints how long it took under its `run` line, so a pass that grows is seen to grow.

The suites are `pages`, `views`, `windows`, `tables`, `refusals`, `reports`, `exports`, `decisions`,
`permissions`, `notices`, `report-actions`, `language`, `help-fit`, `help-stream`, `checklist`,
`forms-menu`, `hr-roles`, `staff-cases`, `settings`, `questions`, `zone-chips`, `prints`, `report-screens`,
`training`, `pickers`, `before-training`, `small-things`, `customer-links`, `staff-pins`, `capabilities`, `leftovers`, `codes`, `help-insights`, `help-rating`, `corrections`, `load-failed`, `dates`, `void`, `messages`, `catalog`, `folder-reports`, `categories`, `forty-four`, `form-builder`, `builder`, `removals` and `house-style`.

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

**Every key has its Spanish.** Since Step 185's guide list, `house-style` reads every key `src/App.js`
hands `tr` or `trn` as written and fails the run on each one the table holds no Spanish for, named with
its line. Such a key reads in English on a Spanish screen, and nothing on the screen marks it. A key
built as the page runs is the finder's to count. The same suite holds the table to the CSV and every
file under `src/` to plain ASCII, the guide list's other two promises.

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
| `smoke.js` | `npm run smoke`, the quick check on every build, against the `build/` already made |
| `seed.js` | the seeded world, every value invented, every report total worked out by hand |
| `stubs.js` | every API call answered, and nowhere else |
| `stream.js` | Help's streaming route, written for the browser a piece at a time |
| `inventory.js` | the declared spine: pages, views, windows, tables, reports, exports, decisions, refusals |
| `discover.js` | reads the app's own lists out of `src/App.js` so coverage is proven |
| `known.json` | failures the app has today, each printing on every run |
| `lib/build.js` | runs `npm run build`, reusing a bundle that is already fresh, and says whether it is |
| `lib/serve.js` | a dependency-free static server with the single-page fallback |
| `lib/browser.js` | launches Chromium, with fallbacks and a clear message when it cannot |
| `lib/driver.js` | the object every case drives the app through |
| `lib/results.js` | pass, fail, known failure, `NO CASE` |
| `lib/table.js` | the table, and the gate |
| `cases/*.js` | one file per suite |

Every fixture value in here is invented. No real person, site, phone number or email appears
anywhere, and the suite never reads the live API.
