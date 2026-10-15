# The October audit: ocsa-admin-dashboard (part 343, Oct 15, 2026)

Read from `main` at 36d47f3 (Merge #101) with AUDIT_CONTRACT.md revised Oct 15, 2026. This round finds and proves
problems; nothing under `src/`, `public/` or `guide/` changed. Each finding below says when it must be fixed, who meets it
first, what happens, where, the proof, the fix size, whether another repository is needed and whether it was already
known. A proof named `october/...` is a case in `audit/cases/october.js` that fails today and is listed in
`audit/known.json`, so the fix round turns each one green; `house-style/...` is an existing case.

Every claim was read in the code; one that rests on how the API answers, which this session could not call, is marked
(inferred). No person, site, phone, email or secret value is written here; staff are named by seed id (u-staff-5).

## Summary

| When | Findings |
|---|---|
| Now | 19 |
| Before 100 | 53 |
| Later | 26 |
| All | 98 |

| Class | Now | Before 100 | Later | All |
|---|---|---|---|---|
| growth | 0 | 10 | 1 | 11 |
| notice | 0 | 5 | 6 | 11 |
| together | 5 | 5 | 1 | 11 |
| access | 2 | 4 | 2 | 8 |
| silent | 2 | 4 | 1 | 7 |
| time | 2 | 3 | 1 | 6 |
| harness | 0 | 3 | 2 | 5 |
| phone | 1 | 2 | 2 | 5 |
| sign-in | 0 | 4 | 1 | 5 |
| picker | 0 | 3 | 1 | 4 |
| guide | 1 | 1 | 1 | 3 |
| link | 1 | 0 | 2 | 3 |
| pay | 1 | 1 | 1 | 3 |
| words | 1 | 2 | 0 | 3 |
| dependency | 0 | 1 | 1 | 2 |
| deploy | 0 | 2 | 0 | 2 |
| input | 1 | 1 | 0 | 2 |
| process | 0 | 1 | 1 | 2 |
| duplication | 0 | 0 | 1 | 1 |
| other | 0 | 0 | 1 | 1 |
| reference | 1 | 0 | 0 | 1 |
| secrets | 1 | 0 | 0 | 1 |
| stub | 0 | 1 | 0 | 1 |

| Who hits it first | Findings |
|---|---|
| 1, field staff on a phone | 1 |
| 2, supervisors in the field | 27 |
| 3, the office on the dashboard | 44 |
| 4, admins and the owner | 10 |
| 5, nobody yet (latent) | 16 |

The ten that matter most:

1. DASH-01: text a person types in the staff app runs as script when a supervisor or admin prints a timeline, in a
   window on the dashboard's own origin where the session token is kept. Proven by two october cases.
2. DASH-02: a supervisor reads, prints and is offered an edit box for every hourly rate in Staff Management.
3. DASH-03: the profile's Save sends the whole form, so a supervisor's save sends an empty hourly rate, which
   erases the rate or refuses the save; proven with one Save that changed nothing.
4. DASH-19: the legacy Supabase public key and the project address sit in this repository's public history as well
   as the staff app's.
5. DASH-06 and DASH-07: contract 1 keeps Waiting for signatures and clearance dates with
   supervisors, and the dashboard keeps both behind HR Records, which they lost on Oct 13.
6. DASH-11 and DASH-05: a double press schedules a shift twice (proven) and makes tasks twice.
7. DASH-04: a written warning can be issued with a step other than the one on screen.
8. DASH-09 and DASH-10: on a weak signal a request spins forever and a window cannot be closed, and one
   failed read at sign-in leaves every picker empty for the session.
9. DASH-25: six notice types API #146 added open the staff app in a new tab, or nothing; proven for all six
   as the admin and as the contract 1 supervisor.
10. DASH-68 and DASH-70: the full audit drove the API as it stood in mid-September, and no pull request
    runs a build, the smoke check or a security check.

What held up: every call leaves through one wrapper (one `fetch(` in src/), no token goes into an address, nothing in
src/ talks to Supabase, the bundle holds no key, src/ is plain ASCII and the banned certification acronym reaches no screen, every people dropdown a
supervisor reaches is searchable, weeks across Sunday Nov 1 are built by calendar steps, the bell and the toast open
every notice the same way, push permission is asked only from a press, and pay never reaches a supervisor through a
labor, payroll or ADP screen (the dashboard calls none of those routes).

## Every finding in one line

| ID | When | Class | Who | Finding |
|---|---|---|---|---|
| DASH-01 | Now | input | 2 | Print windows run what a person typed: an issue title becomes markup in a window on the dashboard's own origin |
| DASH-02 | Now | pay | 2 | Staff Management shows a supervisor the Hourly Rate on the profile, in Print Report and in both edit windows |
| DASH-03 | Now | together | 2 | The profile editor sends the whole form, so a supervisor's save sends hourlyRate "" with every other field |
| DASH-04 | Now | together | 2 | A written warning's draft is built from a list row, saved whole, and Issue sends none of the edits made since the last save |
| DASH-05 | Now | together | 2 | Create Assigned Task, Add Task, Assign Issue as Task and Reassign send twice on a double press |
| DASH-06 | Now | access | 2 | A supervisor cannot open Waiting for signatures, and every signature notice tells them it is for admins |
| DASH-07 | Now | access | 2 | A supervisor cannot record or correct a clearance date, and the school-site refusal sends them to an admin-only page |
| DASH-08 | Now | phone | 2 | Five tall windows cannot be scrolled, so Save can sit below the screen |
| DASH-09 | Now | silent | 2 | No call has a deadline: a request that never answers spins forever, and 21 windows cannot be closed while it hangs |
| DASH-10 | Now | silent | 2 | Sites, people and pick lists load once at sign-in; one failure leaves every picker empty for the session |
| DASH-11 | Now | together | 3 | A double press on Schedule Shift schedules the shift twice |
| DASH-12 | Now | together | 3 | Edit Supply writes back the stock count it opened with |
| DASH-13 | Now | time | 3 | A site's Last Inspection reads the day before |
| DASH-14 | Now | time | 3 | A warning added from an old filing takes the UTC day of the filing, tomorrow for an evening filing |
| DASH-15 | Now | link | 3 | The staff app address defaults to the Vercel address |
| DASH-16 | Now | words | 3 | The word table and the translator's CSV disagree: 22 pairs missing and 40 extra, all from 40 CSV rows that keep the context after the bar |
| DASH-17 | Now | reference | 3 | The Not tracked explainer still reads Its task list is kept as the record of the work. |
| DASH-18 | Now | guide | 3 | Help cannot answer how to delete a report: the guide has no delete words and no template case |
| DASH-19 | Now | secrets | 4 | The legacy Supabase public key (anon JWT) and the project address are in this repository's public git history |
| DASH-20 | Before 100 | access | 2 | While capabilities load, or when both permission reads fail, a supervisor gets HR Records and loses Cases |
| DASH-21 | Before 100 | access | 2 | Employment Type is offered to a supervisor in both edit windows, and the profile save always sends it |
| DASH-22 | Before 100 | pay | 2 | Record Detail draws every field the API sends, pay included if it is ever sent |
| DASH-23 | Before 100 | sign-in | 2 | A token that expires mid-edit loses everything typed, even with no Save pressed |
| DASH-24 | Before 100 | phone | 2 | A tap on a window's backdrop closes it without asking, typed text and all |
| DASH-25 | Before 100 | notice | 2 | Six notice types API #146 added open the staff app in a new tab from the bell, and the front page from an alert |
| DASH-26 | Before 100 | access | 2 | Discipline offers no Issue a warning; a supervisor can warn only from inside a case |
| DASH-27 | Before 100 | notice | 2 | After signing in from an alert, the item can be refused |
| DASH-28 | Before 100 | picker | 2 | The supervisor fallback in loadPeople can no longer fill anything |
| DASH-29 | Before 100 | guide | 2 | 19 guide entries send supervisors through HR Records, which they lost on Oct 13 |
| DASH-30 | Before 100 | access | 2 | Every profile a supervisor opens shows the API's refusal under Employment |
| DASH-31 | Before 100 | words | 2 | A network failure shows the browser's English (Failed to fetch, Load failed), on Spanish screens too |
| DASH-32 | Before 100 | phone | 2 | 390 wide at the Largest text size is never tested; it leaves a 260 px page and cards run off the side |
| DASH-33 | Before 100 | together | 3 | Edit Scheduled Shift sends nine fields from the calendar row, blanking a service category and reverting status |
| DASH-34 | Before 100 | together | 3 | Time off Approve works before the window has read the request, and then approves with no shift actions |
| DASH-35 | Before 100 | together | 3 | Shift Pickup: shift edit sends ten fields from a list row; Convert and Post Open Shift send twice; approve-drop and assign are two calls |
| DASH-36 | Before 100 | together | 3 | HR document, training, onboarding step and certification windows duplicate on a double press, and Training PUTs the whole list row |
| DASH-37 | Before 100 | together | 3 | No window sends a version: every save is last write wins, silently |
| DASH-38 | Before 100 | time | 3 | Every range is sent as two days with the end inclusive; a route that reads the end as UTC midnight drops the last day |
| DASH-39 | Before 100 | growth | 3 | Log training's duplicate check reads every training record, a list that can be cut at 1,000 |
| DASH-40 | Before 100 | silent | 3 | An HR document saves while its link to the Jotform submission fails, and the toast says Document added |
| DASH-41 | Before 100 | notice | 3 | A session that ends by itself keeps the computer's alerts, so the next person on a shared computer can see them |
| DASH-42 | Before 100 | time | 3 | Every today is the browser's day; the company clock is read only by four signature stamps |
| DASH-43 | Before 100 | time | 3 | A case log's When it happened is typed and stored on the laptop's clock |
| DASH-44 | Before 100 | picker | 3 | A site's own staff list is offered first with no status check |
| DASH-45 | Before 100 | input | 3 | CSV exports built in the browser carry no guard against a cell read as a formula |
| DASH-46 | Before 100 | notice | 3 | Shift drop and claim notices open this week's Schedule with nothing open |
| DASH-47 | Before 100 | sign-in | 3 | A tapped alert asks for sign-in when the session was not remembered or has ended |
| DASH-48 | Before 100 | silent | 3 | One error boundary at the root: a bad widget blanks the whole dashboard, shows a stack trace, and Reload walks back into it |
| DASH-49 | Before 100 | silent | 3 | No error tracking of any kind |
| DASH-50 | Before 100 | silent | 3 | Sites, Cases, Live Operations and HR Records' Documents, Training and Onboarding say nothing here, or keep the last list, when the API is down |
| DASH-51 | Before 100 | sign-in | 3 | Six calls go around the helpers and skip all or part of the session handling |
| DASH-52 | Before 100 | growth | 3 | Issues loads and draws every issue ever, and its export stops wherever the reply is cut |
| DASH-53 | Before 100 | growth | 3 | Schedule reads every shift of the range in one reply, three calls every 45 seconds, in a hidden tab too |
| DASH-54 | Before 100 | growth | 3 | Shift Pickup counts from whole lists and polls four to eight calls every 45 seconds |
| DASH-55 | Before 100 | growth | 3 | Messages reads a channel's whole history every 12 seconds |
| DASH-56 | Before 100 | growth | 3 | Inspections and HR documents and training load whole lists |
| DASH-57 | Before 100 | growth | 3 | Supplies fetches one QR image per supply, one after another, on every visit |
| DASH-58 | Before 100 | growth | 3 | Sign-in downloads whole lists only to decide which side panel items to show, and five page timers keep polling in hidden tabs |
| DASH-59 | Before 100 | growth | 3 | The Unfinished forms count stops at 50 and Time off shows at most 200, with nothing saying so |
| DASH-60 | Before 100 | words | 3 | A written warning is advertencia in 20 keys and amonestacion in 2, and the API's step labels disagree with the table's |
| DASH-61 | Before 100 | sign-in | 4 | Reset PIN takes any four characters, letters and 1111 included |
| DASH-62 | Before 100 | deploy | 4 | No vercel.json: no security headers, no Content-Security-Policy, caching left to the preset, and source maps shipped |
| DASH-63 | Before 100 | notice | 4 | Support ticket notices open only Tickets from the bell and the front page from an alert, and no address opens one ticket |
| DASH-64 | Before 100 | growth | 4 | The management review asks for each former employee's history one call at a time, with no cap |
| DASH-65 | Before 100 | picker | 4 | Three people dropdowns are plain selects with no search, one listing people who left unmarked |
| DASH-66 | Before 100 | deploy | 5 | A build without REACT_APP_API_URL talks to live data: a preview, or npm start on a laptop |
| DASH-67 | Before 100 | dependency | 5 | npm audit --omit=dev reports 99 (63 high, 33 moderate, 3 low), every one through react-scripts; nothing in the shipped bundle |
| DASH-68 | Before 100 | harness | 5 | The full suite never arms Steps 247 to 341, so it drives the API as it stood in mid-September |
| DASH-69 | Before 100 | stub | 5 | The stub lagged the API as built in 21 places; 10 are corrected this round and 11 remain for the fix round |
| DASH-70 | Before 100 | process | 5 | No pull request runs a build, the smoke check, the audit or a security check |
| DASH-71 | Before 100 | harness | 5 | Ten pages, eleven pages' views and 43 windows have no case in the full audit; 22 of the windows are driven by nothing at all |
| DASH-72 | Before 100 | harness | 5 | The harness never simulates a network failure, a request that never answers, or a 401 while a window holds typed text, and never reads a window's bottom at 390 |
| DASH-73 | Later | sign-in | 1 | A lead or laborer at the dashboard sign-in is told Admin access required, and the token the API issued is dropped without a sign-out |
| DASH-74 | Later | notice | 2 | An announcement alert opened in a new window shows a supervisor This page is for admins.; the bell opens it read-only |
| DASH-75 | Later | notice | 2 | inspection_unfinished may name a walk the Inspections page cannot read |
| DASH-76 | Later | access | 2 | Smaller access items: Overview offers a supervisor Pending with nothing to press; #owner renders for anyone (the API refuses); Tickets opens for a supervisor the support contact names; Monthly Value of a site's contract shows to every supervisor |
| DASH-77 | Later | phone | 2 | Smaller phone items: the month view at 390; 108 places at 7 to 9 px; the largest size is 150%; controls under 44 px above 700 px |
| DASH-78 | Later | notice | 3 | training_expiring opens the person from the bell and Gaps from an alert |
| DASH-79 | Later | growth | 3 | Smaller growth items: staff and pickers load the whole people list; Tickets, Cases, Help insights and Assigned tasks load whole lists; 33 of 44 tables draw every row; record prints fetch one item or image per row |
| DASH-80 | Later | notice | 3 | A tapped alert never marks its notice read, so the bell's count stays up |
| DASH-81 | Later | notice | 3 | A notice of a type the dashboard does not know, with no link, closes the bell and says nothing |
| DASH-82 | Later | picker | 3 | Smaller picker items: assignee lists may offer client contacts and admins; a record held by someone off the list shows the placeholder; Discipline cannot filter by a person who left |
| DASH-83 | Later | time | 3 | Smaller time items: inspection rows dated by the UTC day of completed_at; expiry countdowns one day long across Nov 1; a month cell to week by milliseconds; prints in the laptop's zone with no zone named; today and yesterday by 24-hour periods; Live Operations keeps yesterday's board after midnight |
| DASH-84 | Later | silent | 3 | Smaller silent items: marking notices and conversations read fails quietly; a case log re-read fails quietly; an empty 2xx body would throw after the work is done; Staff Management's own refusal line can never show |
| DASH-85 | Later | guide | 3 | Other guide drift: the drop request entry says Approve where the button is Approve Drop and misses Reassign; Find training misses Time and Matrix; Periodic work does not say reference sites are left out; three Who lines say admins for Reset PIN, Assign and Unlock; 145 bold names carry no Spanish |
| DASH-86 | Later | pay | 4 | Labor cost per square foot by site is one person's pay wherever one person works a site |
| DASH-87 | Later | together | 4 | Smaller edit-window items: Jotform Edit Form nulls three settings and sets has_original_pdf; the pencil splits names at the first space; Rehire before its read restores no site; a clearance renew sends documentId null; Edit Value lets the stored code change; a training requirement save resets serviceLine |
| DASH-88 | Later | access | 4 | The Roles and permissions reference tells an admin the opposite of contract 1 |
| DASH-89 | Later | other | 4 | A deactivated report cannot be brought back, and two raw category spellings can give two groups with the same heading |
| DASH-90 | Later | dependency | 5 | Workflows pin actions by tag, and audit/count.js uses @babel/parser without declaring it |
| DASH-91 | Later | phone | 5 | An existing push subscription is reused after the API's key changes, and a push with no title shows nothing |
| DASH-92 | Later | link | 5 | A dashboard link on another origin (an alias, a preview) opens a new tab |
| DASH-93 | Later | process | 5 | An email address is written in source in a public repository |
| DASH-94 | Later | duplication | 5 | Helpers written more than once: dates, HTML escaping, image-address tests and print bodies |
| DASH-95 | Later | link | 5 | The production API host is written in two places: the dashboard's fallback and the guide sync script |
| DASH-96 | Later | harness | 5 | The source finder calls 83 strings English on pages taken as done, and its count of printed pages runs 2 under a plain count; neither is English a person reads |
| DASH-97 | Later | harness | 5 | Smaller harness items: inventory.js names windows by stale lines; the seed cites the sign-in gate at App.js:367 (it is 927); the stub's range filters are kinder than the API's; no staff persona |
| DASH-98 | Later | notice | 5 | Ids reach the hash raw from the bell and encoded from an alert |

## Now: this week, before more people are added

### DASH-01. Print windows run what a person typed: an issue title becomes markup in a window on the dashboard's own origin

- When: Now. Class: input. Checklist: 5.8, 5.11, part 20. Who hits it first: 2, supervisors in the field.
- What happens: Seven print builders concatenate text from the API (issue titles, descriptions, notes, names, captions, every field of a timeline record) into HTML with no escaping and write it with document.write into a window opened on the dashboard's origin. Text typed in the staff app such as an image tag with an onerror handler runs when a supervisor or admin prints a person's or a site's timeline or a Record Detail. The session token sits in localStorage on that origin (ocsa_auth), so the script can read it and act as that admin. There is no Content-Security-Policy to stop it. The other print builders escape through esc, keptEsc or escHtml.
- Where: src/App.js:2201-2252 (Record Detail print), 2256-2271 (timeline print), 2300-2323 (profile print), 3400, 3496-3543, 3550-3598 (Sites timeline and Record Detail), 14626 (Inspections print); token at src/App.js:150-155
- Proof: october/prints/staff-timeline-escapes-what-staff-typed and october/prints/staff-record-detail-escapes-what-staff-typed: the print HTML holds the typed tag as a tag
- Fix size: S (run every value through the existing escHtml, src/App.js:19992). Needs another repository: no; a CSP header (DASH vercel.json) is the second line. Already known: new.

### DASH-02. Staff Management shows a supervisor the Hourly Rate on the profile, in Print Report and in both edit windows

- When: Now. Class: pay. Checklist: part 4, contract 2.1. Who hits it first: 2, supervisors in the field.
- What happens: A supervisor opens a person ranked below them. The card reads Hourly Rate (the figure while the API sends it, Not set once it does not), Print Report prints the line, and the profile's Edit and the list pencil both offer an Hourly Rate box. None of the four is gated by manage_employment, which holds every pay figure; the role field and hire date beside them are.
- Where: src/App.js:2543 (card), 2298 (print), 2499 (Print Report button), 2569 and 2793 (inputs); compare the gated role field at 2567 and 2790
- Proof: october/supervisor/profile-shows-no-hourly-rate, october/supervisor/print-report-prints-no-hourly-rate
- Fix size: S. Needs another repository: ocsa-api: confirm GET /api/users/profile/:id sends no hourlyRate to a caller without manage_employment (the stub now strips it under setApiAsBuilt). Already known: new.

### DASH-03. The profile editor sends the whole form, so a supervisor's save sends hourlyRate "" with every other field

- When: Now. Class: together. Checklist: part 5, contract 2.2. Who hits it first: 2, supervisors in the field.
- What happens: saveProfileInfo PATCHes all 19 loaded fields; it drops only an unchanged language, an unchanged hire date and, for a non-holder, the role. With the API leaving the rate out of a supervisor's read, the box loads "" and every save sends hourlyRate "": the API either writes the rate as null (contract 4 says it does for an admin) or refuses the whole save, so a supervisor cannot fix a phone number. Between two office users the second save writes back the first one's stale copy of every field. The list pencil was made diff-only in #101; this editor was not.
- Where: src/App.js:2413-2422 (save), 2533 (load), 2569 (box)
- Proof: october/supervisor/profile-edit-offers-and-sends-no-hourly-rate: one Save with nothing changed sends 16 fields, hourlyRate "" among them
- Fix size: S (diff against the opened values, as submitEdit does at 2386-2395). Needs another repository: ocsa-api: treat an empty hourlyRate as no change and refuse or drop pay keys from a non-holder. Already known: contract 4 (admin side); supervisor side new.

### DASH-04. A written warning's draft is built from a list row, saved whole, and Issue sends none of the edits made since the last save

- When: Now. Class: together. Checklist: part 5, 5.5. Who hits it first: 2, supervisors in the field.
- What happens: WarningWindow never reads the warning; draftOf builds the form from the Discipline list row, Save as draft PUTs every draft field, type, category, dates, description, policy, expectations, suspension, protected activity and language (any the row lacks go as null), and Issue posts with no draft fields. A supervisor who saves a verbal warning, changes the Step to written and presses Issue sees the written signature boxes and leaves a verbal warning on the record (inferred: the API issues the stored type).
- Where: src/App.js:23156-23229 (draftOf 23159-23173, the body 23207-23213, PUT 23214-23215, Issue 23221-23227)
- Proof: reproduction in the edit-window appendix; the stub has no /api/discipline list or PUT route to drive it (Stub drift)
- Fix size: M. Needs another repository: no. Already known: new.

### DASH-05. Create Assigned Task, Add Task, Assign Issue as Task and Reassign send twice on a double press

- When: Now. Class: together. Checklist: part 5, 5.16. Who hits it first: 2, supervisors in the field.
- What happens: None of the four has a busy flag or a disabled button. A double press makes two tasks for one job, each with its own task_assigned notice to the person (inferred), and a second reassignment notice.
- Where: src/App.js:11825 (button 11905), 3423 (4022), 4640 (4721), 11824 (11890)
- Proof: read; the same shape is proven on Schedule Shift by october/double-press/schedule-shift-sends-once
- Fix size: S each. Needs another repository: ocsa-api backstop: an idempotency key. Already known: new.

### DASH-06. A supervisor cannot open Waiting for signatures, and every signature notice tells them it is for admins

- When: Now. Class: access. Checklist: part 4, contract 1. Who hits it first: 2, supervisors in the field.
- What happens: Contract 1 keeps Waiting for signatures with supervisors. It is only a tab of HR Records, which closes once the API answers read_hr_records false (API #146 does), and only #hr/training is let through. signature_disputed, signature_declined and signature_overdue open #hr/signatures/<id>, and the bell says That one is for admins. A supervisor who sent PPE, property or a warning to a phone never learns it was sent back.
- Where: src/App.js:619, 665, 1269-1271, 24686, 8412; public/sw.js:56
- Proof: october/supervisor/waiting-for-signatures-opens: #hr/signatures draws This page is for admins.
- Fix size: M (let #hr/signatures through the way #hr/training is, or give it its own item). Needs another repository: ocsa-api: confirm GET /api/signatures answers a supervisor for what they sent. Already known: new.

### DASH-07. A supervisor cannot record or correct a clearance date, and the school-site refusal sends them to an admin-only page

- When: Now. Class: access. Checklist: part 4, contract 1. Who hits it first: 2, supervisors in the field.
- What happens: Contract 1 keeps clearance status and dates with supervisors. Every Clearances row and the Open the clearances button on the school-site refusal go to #hr/<id>/clearances, which reads This page is for admins.; Add or renew and Correct a date live only in the HR folder. The window also reads GET /api/hr/documents for its file picker, which is read_hr_records'.
- Where: src/App.js:22632, 22865, 22914, 22648, 22760-22790, 23719
- Proof: october/supervisor/clearance-row-opens-its-dates
- Fix size: M. Needs another repository: ocsa-api: which routes answer a supervisor for clearance dates. Already known: new.

### DASH-08. Five tall windows cannot be scrolled, so Save can sit below the screen

- When: Now. Class: phone. Checklist: part 15, 5.16. Who hits it first: 2, supervisors in the field.
- What happens: Mdl gives a tall window the screen's height with overflow hidden. Workspace post, Issue PPE, Equipment, the Warning window and Issue property draw no scroller of their own, so once their content is taller than the screen (a phone, or a laptop at the Largest size) the bottom with Save and Cancel cannot be reached by finger or wheel. The audit's own clicks scroll from script, which is why no earlier run saw it.
- Where: src/App.js:405 (Mdl); 5645-5659, 10749-10783, 10908-10931, 23262-23369, 28297-28329
- Proof: october/phone/tall-window-reaches-its-last-button/390-standard and /1024-largest: Add equipment's Save sits 71 px and 33 px below the window's bottom, with no scroller, before and after the wheel
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-09. No call has a deadline: a request that never answers spins forever, and 21 windows cannot be closed while it hangs

- When: Now. Class: silent. Checklist: part 10, part 11, 5.16. Who hits it first: 2, supervisors in the field.
- What happens: apiRequest has no AbortController or timeout. Every Loading stays forever on a stalled request, and windows that refuse to close while busy (Warning, Issue PPE, Equipment, Property and 17 more) keep Save disabled and the X dead until a reload, which loses the text. Polls with no in-flight guard pile up behind a hung call.
- Where: src/App.js:20-22 (apiRequest); grep "if (!busy) onClose()" gives 21
- Proof: read; the harness never simulates a request that does not answer (setDelay is finite)
- Fix size: S (one deadline in apiRequest) to M (words and retry on each screen). Needs another repository: no. Already known: new.

### DASH-10. Sites, people and pick lists load once at sign-in; one failure leaves every picker empty for the session

- When: Now. Class: silent. Checklist: part 10. Who hits it first: 2, supervisors in the field.
- What happens: loadSites, loadStaff and loadLookups catch with a console line and run once per token. A failed read at sign-in, or a 500 during an API deploy, leaves the Sites page at No sites found. and every site, people and pick list empty on every page until a full reload (sites come back after a save on Sites, people after a save on Staff). The side panel probes turn items off the same way.
- Where: src/App.js:697-710, 721-742
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-11. A double press on Schedule Shift schedules the shift twice

- When: Now. Class: together. Checklist: part 5, 5.16. Who hits it first: 3, the office on the dashboard.
- What happens: submitCreate has no guard and the button is never disabled. Two POST /api/schedule go out, so the person holds the same shift twice and is told twice (inferred); For X weeks doubles every week.
- Where: src/App.js:13087-13124, button 13374
- Proof: october/double-press/schedule-shift-sends-once: a double press sent 2 shifts
- Fix size: S. Needs another repository: ocsa-api backstop: a unique key on person, day and start, or an idempotency key. Already known: new.

### DASH-12. Edit Supply writes back the stock count it opened with

- When: Now. Class: together. Checklist: part 5, 5.5. Who hits it first: 3, the office on the dashboard.
- What happens: The window loads the list row and PATCHes the whole object, current_stock included. A rename or a price fix undoes usage logged from the staff app since the list loaded (inferred), and a row with no low_threshold saves 0, so the low-stock alert never fires. No double-press guard.
- Where: src/App.js:5092 (load), 5067 (PATCH), 5112 (button)
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: a stock change as an adjustment. Already known: new.

### DASH-13. A site's Last Inspection reads the day before

- When: Now. Class: time. Checklist: part 12, 5.7. Who hits it first: 3, the office on the dashboard.
- What happens: last_inspection is a day; fd() parses it as UTC midnight and draws it in the browser's zone, the evening before.
- Where: src/App.js:3791 (fd at 318)
- Proof: october/time/site-last-inspection-is-the-day-sent: the API sent 2026-03-10 and the site reads Mar 9
- Fix size: S (fdDay). Needs another repository: no. Already known: new.

### DASH-14. A warning added from an old filing takes the UTC day of the filing, tomorrow for an evening filing

- When: Now. Class: time. Checklist: part 12, contract 2.9. Who hits it first: 3, the office on the dashboard.
- What happens: The row shows the filing on the browser's day, and Add to the record opens with Date given set to the first ten characters of submittedAt, a UTC day. A form filed after 8 PM Eastern opens a day late and Save writes that day into the disciplinary record.
- Where: src/App.js:23376 (prefill), 23464 (row)
- Proof: node reproduction with the app's expressions (Appendix: time)
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-15. The staff app address defaults to the Vercel address

- When: Now. Class: link. Checklist: part 6, 5.10, contract 2.6. Who hits it first: 3, the office on the dashboard.
- What happens: clientConfig.portal.url falls back to https://ocsa-staff-portal.vercel.app when REACT_APP_PORTAL_URL is unset. Help reads the staff app's pictures from it, which work today only through the old address's redirect. It is the only staff app origin in src/; everything else that reaches the staff app is built by the API.
- Where: src/clientConfig.js:29; src/App.js:7014-7021, 7059-7060, 7663-7664
- Proof: october/links/no-vercel-address-in-the-build
- Fix size: S (default to https://staff.ocsaco.com). Needs another repository: no; the chat confirms the Vercel variable. Already known: contract 2.6 rule; new as a line.

### DASH-16. The word table and the translator's CSV disagree: 22 pairs missing and 40 extra, all from 40 CSV rows that keep the context after the bar

- When: Now. Class: words. Checklist: part 7, contract 4. Who hits it first: 3, the office on the dashboard.
- What happens: 40 rows of translation/dashboard_words.csv write the English with its |context on (Valid until|quote); the comparer and the other 609 context keys write it without. Each of the 40 is extra, and 22 of them leave their pair with no row at all. The Spanish agrees in all 40, and no pair differs. The fix is to cut the context from those 40 cells.
- Where: translation/dashboard_words.csv:2820-3698 (the 40 rows are listed in Appendix: words); audit/lib/words.js:111-128
- Proof: house-style/the-table-and-the-csv-agree (see the suite table)
- Fix size: S. Needs another repository: no. Already known: contract 4 (22 and 40, confirmed exactly).

### DASH-17. The Not tracked explainer still reads Its task list is kept as the record of the work.

- When: Now. Class: reference. Checklist: part 18, contract 4. Who hits it first: 3, the office on the dashboard.
- What happens: Live Operations draws the sentence under every reference site.
- Where: src/App.js:4131; src/words.js:4936; translation/dashboard_words.csv:4707
- Proof: read
- Fix size: S. Needs another repository: no. Already known: contract 4.

### DASH-18. Help cannot answer how to delete a report: the guide has no delete words and no template case

- When: Now. Class: guide. Checklist: part 7, contract 4 (ticket Oct 14). Who hits it first: 3, the office on the dashboard.
- What happens: Nothing on Reports can be deleted. A custom report has Run, Duplicate, Edit and Deactivate (a DELETE that only marks it); the built-in templates have Run and Duplicate only; a deactivated report cannot be brought back from the page. The entry Run a report says Deactivate exists but not that it shows only on a Custom report, nor how a template is changed (Duplicate), and its words line has no delete, remove or borrar.
- Where: src/App.js:11624-11634 (buttons), 11476-11480 (Deactivate); guide/APP-DASHBOARD.md:417-427 (Last checked 2026-09-28)
- Proof: read
- Fix size: S (a new entry at the end: Remove a report you no longer need). Needs another repository: no. Already known: contract 4.

### DASH-19. The legacy Supabase public key (anon JWT) and the project address are in this repository's public git history

- When: Now. Class: secrets. Checklist: part 9, 5.11. Who hits it first: 4, admins and the owner.
- What happens: Commit 3ae72f5 (2026-03-26) added a SUPA_URL and an anon JWT (HS256, role anon, issuer supabase, expires 2036) to src/App.js for uploads straight to the task-media bucket; bf6dd5e (2026-03-31) removed them. The repository is public, so the key is readable by anyone. Contract 4 records the same key in the staff app's history; it is in this one too. With the public buckets still open to uploads (contract 4), the key lets anyone upload. Nothing in src/ uses Supabase today.
- Where: git history: 3ae72f5 and bf6dd5e, src/App.js (value not repeated)
- Proof: battery line 8 over every branch and pull request ref: 2 lines (the add and the removal)
- Fix size: M (move to the new publishable and secret keys; history cannot be cleaned on forks). Needs another repository: Supabase and ocsa-api (the API's service key shares the signing secret; contract 4). Already known: contract 4 for the staff app; new for this repository.

## Before 100: before about 100 users or more sites

### DASH-20. While capabilities load, or when both permission reads fail, a supervisor gets HR Records and loses Cases

- When: Before 100. Class: access. Checklist: part 4. Who hits it first: 2, supervisors in the field.
- What happens: hrRecordsOn is true until the API names read_hr_records false, and casesOn false until it names manage_cases true. If GET /api/users/me/permissions fails and the per-person fallback is refused, the supervisor keeps HR Records with all seven tabs, Jotform paperwork and Add Document (each refused by the API) and has no Cases. A #hr deep link fires its reads in the gap.
- Where: src/App.js:618-619, 711-721
- Proof: read
- Fix size: S (treat unnamed as closed for a non-admin). Needs another repository: no. Already known: new.

### DASH-21. Employment Type is offered to a supervisor in both edit windows, and the profile save always sends it

- When: Before 100. Class: access. Checklist: part 4, contract 1. Who hits it first: 2, supervisors in the field.
- What happens: The select has no canEmploy gate, unlike the role and hire date beside it. Contract 1 puts employment changes under manage_employment without naming the type; if the API guards it, every supervisor save that carries it is refused or dropped (inferred).
- Where: src/App.js:2568, 2791, 2418
- Proof: read; october/supervisor/profile-edit-offers-and-sends-no-hourly-rate shows employmentType in the body
- Fix size: S. Needs another repository: ocsa-api: which capability guards employmentType. Already known: new.

### DASH-22. Record Detail draws every field the API sends, pay included if it is ever sent

- When: Before 100. Class: pay. Checklist: part 4, contract 2.1. Who hits it first: 2, supervisors in the field.
- What happens: Staff Management and Sites timelines open Record Detail, which lists every key of the record and of the entry's metadata (minus id and *_hash) through a generic word table, and prints them. Nothing filters pay keys (inferred whether the API ever sends them there).
- Where: src/App.js:2674, 2681, 2201-2230, 3955
- Proof: read
- Fix size: S (an allow list). Needs another repository: ocsa-api: confirm timeline-detail never carries pay to a non-holder. Already known: new.

### DASH-23. A token that expires mid-edit loses everything typed, even with no Save pressed

- When: Before 100. Class: sign-in. Checklist: part 11, 5.16. Who hits it first: 2, supervisors in the field.
- What happens: Any 401 (the shell's 60 second poll included) fires ocsa-session-expired; signOut clears the token and the shell draws the sign-in card in place of the whole tree, unmounting every open window. After sign-in the page comes back with the window empty; no call is retried and no draft is kept in the browser.
- Where: src/App.js:34-42, 788-794, 859-860, 975
- Proof: read; audit/cases/refusals.js:446 holds this as intended
- Fix size: M to L. Needs another repository: ocsa-api: token lifetime and a renew route. Already known: contract 5.16.

### DASH-24. A tap on a window's backdrop closes it without asking, typed text and all

- When: Before 100. Class: phone. Checklist: part 15. Who hits it first: 2, supervisors in the field.
- What happens: Mdl closes on a backdrop click; on a phone the window sits 16 px from each edge. Only the form fill window and the lesson editor ask first; 110 windows use Mdl.
- Where: src/App.js:405, 254
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-25. Six notice types API #146 added open the staff app in a new tab from the bell, and the front page from an alert

- When: Before 100. Class: notice. Checklist: part 6, contract 2.6. Who hits it first: 2, supervisors in the field.
- What happens: task_assigned, training_assigned, training_session, site_assigned, workspace_member and document_to_sign have no place in noticePlace or the service worker's placeOf. The bell follows the link (a staff app link opens another origin with its own sign-in; no link does nothing) and a tapped alert opens the Overview. #sites/<id> and #workspace/<id> already open those records.
- Where: src/App.js:8386-8420, 8432-8434; public/sw.js:44-63
- Proof: october/notices/<type>/admin, /supervisor146 and /alert-opens-where-the-bell-does for the six types (18 cases)
- Fix size: M. Needs another repository: ocsa-api: each type's link and subjectId; the owner says which app opens a training or a document to sign (contract 2.13). Already known: new.

### DASH-26. Discipline offers no Issue a warning; a supervisor can warn only from inside a case

- When: Before 100. Class: access. Checklist: part 4, contract 1. Who hits it first: 2, supervisors in the field.
- What happens: Issue a warning lives in the HR folder, which read_hr_records closes; the Discipline page lists and opens warnings only. Issue company property has no door outside the folder at all.
- Where: src/App.js:23437, 23720, 23860-23920 (warnings); 23722 (property)
- Proof: october/supervisor/discipline-can-issue-a-warning
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-27. After signing in from an alert, the item can be refused

- When: Before 100. Class: notice. Checklist: part 6. Who hits it first: 2, supervisors in the field.
- What happens: The held open runs the moment the token is set, before the permissions read and the page probes answer, so Cases (for a supervisor), Forms and Equipment are refused and the notice is dropped (inferred; no reproduction).
- Where: src/App.js:823-830 against 618, 662, 681, 711-742
- Proof: read
- Fix size: S (hold the open until caps and the probes have answered). Needs another repository: no. Already known: new.

### DASH-28. The supervisor fallback in loadPeople can no longer fill anything

- When: Before 100. Class: picker. Checklist: part 8. Who hits it first: 2, supervisors in the field.
- What happens: Since API #146 the HR employees summary it falls back to is read_hr_records'. A supervisor whose manage_staff is denied by an override gets 403 from both, and about 25 pickers read No one is on this list. The comments still say the fallback fills a supervisor's pickers.
- Where: src/App.js:698-700, 25169-25180, 24515-24518
- Proof: read; the stub refuses the summary to supervisor146 (access.insufficientPermissions)
- Fix size: S. Needs another repository: ocsa-api: the supervisor's people source. Already known: new.

### DASH-29. 19 guide entries send supervisors through HR Records, which they lost on Oct 13

- When: Before 100. Class: guide. Checklist: part 7. Who hits it first: 2, supervisors in the field.
- What happens: Each says supervisors can do the task and starts in HR Records: training records, onboarding, gaps, sessions, certificates, documents to sign, clearances (2), warnings (2), PPE, property, send to sign, Waiting for signatures, signed pages, certifications and Open HR file. Help gives a supervisor steps to a page that says it is for admins. Find a page still says supervisors see no Staff Management or Cases.
- Where: guide/APP-DASHBOARD.md:191, 202, 506, 521, 532, 2023, 2079, 2095, 2107, 1127, 1139, 1378, 1393, 1705, 2121, 2202, 2214, 2356, 154, 2300, 47 (Appendix: guide)
- Proof: read against src/App.js:619, 665, 1004, 1269, 24707
- Fix size: M. Needs another repository: no. Already known: new.

### DASH-30. Every profile a supervisor opens shows the API's refusal under Employment

- When: Before 100. Class: access. Checklist: part 4. Who hits it first: 2, supervisors in the field.
- What happens: Staff Management reads GET /api/users/:id/employment for everyone; contract 1 puts the employment history card under read_hr_records, so the card reads Insufficient permissions on every person.
- Where: src/App.js:2064, 2137, 2149, 2524-2528
- Proof: october/supervisor/profile-reads-no-refusal
- Fix size: S (read it only for canOpenHr or canEmploy). Needs another repository: no. Already known: new.

### DASH-31. A network failure shows the browser's English (Failed to fetch, Load failed), on Spanish screens too

- When: Before 100. Class: words. Checklist: part 10. Who hits it first: 2, supervisors in the field.
- What happens: apiRequest lets the TypeError through and about 215 places show e.message, the sign-in card included. Error toasts last 3 seconds with no live region.
- Where: src/App.js:20-22, 598, 392; 182 showToast(e.message calls
- Proof: read; the harness never simulates a network failure
- Fix size: S (one translated line in apiRequest; Messages at 6445 is the model). Needs another repository: no. Already known: new.

### DASH-32. 390 wide at the Largest text size is never tested; it leaves a 260 px page and cards run off the side

- When: Before 100. Class: phone. Checklist: part 15. Who hits it first: 2, supervisors in the field.
- What happens: Text size is CSS zoom, so Largest on a 390 phone is a 260 px page. Cards with minWidth 260 to 320 (Company settings, an Inspections panel, a select) overflow. The audit runs 390 at Standard in English only.
- Where: src/App.js:255-260, 525-529, 16529, 16559, 16613, 15017, 16890; audit/run.js:20-29
- Proof: read (inferred from widths)
- Fix size: M. Needs another repository: no. Already known: new.

### DASH-33. Edit Scheduled Shift sends nine fields from the calendar row, blanking a service category and reverting status

- When: Before 100. Class: together. Checklist: part 5. Who hits it first: 3, the office on the dashboard.
- What happens: service_category goes as "" when the calendar row lacks it (the stub's rows do), and status is written back from the copy the calendar read.
- Where: src/App.js:13127-13136, button 13415
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-34. Time off Approve works before the window has read the request, and then approves with no shift actions

- When: Before 100. Class: together. Checklist: part 5, contract 2.7. Who hits it first: 3, the office on the dashboard.
- What happens: decide sends shift choices only from affected, which is null until GET /api/time-off/:id answers, so an early Approve leaves the person on the shifts the time off covers (inferred: the API's default for no actions).
- Where: src/App.js:12694, 12701-12708, 12769-12770
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-35. Shift Pickup: shift edit sends ten fields from a list row; Convert and Post Open Shift send twice; approve-drop and assign are two calls

- When: Before 100. Class: together. Checklist: part 5, contract 2.7. Who hits it first: 3, the office on the dashboard.
- What happens: A refused assign leaves the drop approved and the shift open.
- Where: src/App.js:14183, 14210, 14122, 13661, 13652, 14102, 13476-13479
- Proof: read
- Fix size: S each. Needs another repository: ocsa-api: one route for approve and assign. Already known: new.

### DASH-36. HR document, training, onboarding step and certification windows duplicate on a double press, and Training PUTs the whole list row

- When: Before 100. Class: together. Checklist: part 5. Who hits it first: 3, the office on the dashboard.
- What happens: A double press uploads a document twice or counts a training twice in compliance; the training edit sends the list row as the PUT body.
- Where: src/App.js:24617-24624 (button 25043), 24653-24654 (25074), 24674 (25092), 23518 (23540), 24835
- Proof: read
- Fix size: S each. Needs another repository: no. Already known: new.

### DASH-37. No window sends a version: every save is last write wins, silently

- When: Before 100. Class: together. Checklist: part 5, 5.5. Who hits it first: 3, the office on the dashboard.
- What happens: 28 windows send the whole form, about 20 of them from a list row they never re-read; no window sends updated_at, a version or If-Match. The API refuses a stale state on six routes only.
- Where: Appendix: edit windows (grep for if-match, expectedVersion finds nothing)
- Proof: read
- Fix size: M. Needs another repository: ocsa-api: compare updated_at and answer 409. Already known: new.

### DASH-38. Every range is sent as two days with the end inclusive; a route that reads the end as UTC midnight drops the last day

- When: Before 100. Class: time. Checklist: part 12, contract 4. Who hits it first: 3, the office on the dashboard.
- What happens: No call adds a day or a time. Contract 4 records timesheets reading end_date as midnight UTC; any route that compares a timestamp the same way drops the last day and the evening before it, so every preset that ends today loses today (inferred for each route other than timesheets).
- Where: src/App.js:8785, 9019, 9308, 11418-11420, 14467, 26447 and the routes in Appendix: time
- Proof: node reproduction; contract 4
- Fix size: M in ocsa-api (one date-range parser on America/New_York, end exclusive). Needs another repository: ocsa-api. Already known: contract 4 for timesheets; new for the other routes.

### DASH-39. Log training's duplicate check reads every training record, a list that can be cut at 1,000

- When: Before 100. Class: growth. Checklist: part 13, 5.9. Who hits it first: 3, the office on the dashboard.
- What happens: Past a cut the people beyond it are not found, and a second Save writes their records again.
- Where: src/App.js:25313-25330, 24559
- Proof: read (inferred: the API's list has no page size)
- Fix size: M. Needs another repository: ocsa-api: filter on the server, and a unique key on person, training and day. Already known: new.

### DASH-40. An HR document saves while its link to the Jotform submission fails, and the toast says Document added

- When: Before 100. Class: silent. Checklist: part 10, 5.6. Who hits it first: 3, the office on the dashboard.
- What happens: The link call is wrapped in a catch that writes a console line.
- Where: src/App.js:24631-24639
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-41. A session that ends by itself keeps the computer's alerts, so the next person on a shared computer can see them

- When: Before 100. Class: notice. Checklist: part 6, 5.16. Who hits it first: 3, the office on the dashboard.
- What happens: Only the Sign Out control deletes the push subscription; an expired or ended session does not. The next sign-in moves the subscription inside an empty catch, so a failure leaves the new person on the old person's alerts.
- Where: src/App.js:859-868, 832, 6814-6821
- Proof: read
- Fix size: S. Needs another repository: ocsa-api could stop pushing to a revoked session. Already known: new.

### DASH-42. Every today is the browser's day; the company clock is read only by four signature stamps

- When: Before 100. Class: time. Checklist: part 12, contract 2.9. Who hits it first: 3, the office on the dashboard.
- What happens: toISO(new Date()) and todayISO() drive report presets, Live Operations' day, late and due marks and every new record's default date. A laptop set to UTC reads tomorrow after 8 PM Eastern; one set to Pacific reads yesterday before 3 AM.
- Where: src/App.js:445, 12384, 447-455 and Appendix: time; clientConfig.company.timeZone is read at 18333, 19067, 19170, 19491 only
- Proof: october/time/log-training-day-is-the-company-day/utc (and /new-york passes)
- Fix size: M (one companyToday on Intl.DateTimeFormat). Needs another repository: no. Already known: contract 2.9 rule; new.

### DASH-43. A case log's When it happened is typed and stored on the laptop's clock

- When: Before 100. Class: time. Checklist: part 12. Who hits it first: 3, the office on the dashboard.
- What happens: 10:00 typed on a Pacific laptop is stored as 1:00 PM Eastern.
- Where: src/App.js:24024, 24136-24139
- Proof: node reproduction
- Fix size: M. Needs another repository: no. Already known: new.

### DASH-44. A site's own staff list is offered first with no status check

- When: Before 100. Class: picker. Checklist: part 8, contract 2.7. Who hits it first: 3, the office on the dashboard.
- What happens: Shift Pickup's reassign and PPE at a site list the site's staff unfiltered, so a person who left but keeps the site assignment is offered (inferred).
- Where: src/App.js:13562-13586, 3826, 10759
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: end site assignments with employment. Already known: related to contract 2.7.

### DASH-45. CSV exports built in the browser carry no guard against a cell read as a formula

- When: Before 100. Class: input. Checklist: 5.8, part 20. Who hits it first: 3, the office on the dashboard.
- What happens: dlCSV and the two timeline exports quote cells but leave a leading =, +, - or @ alone, so a title or name typed in the staff app opens as a formula in a spreadsheet.
- Where: src/App.js:193-196, 2177, 3520 (12 exports)
- Proof: read
- Fix size: S. Needs another repository: no (the API's own CSVs: API audit). Already known: new.

### DASH-46. Shift drop and claim notices open this week's Schedule with nothing open

- When: Before 100. Class: notice. Checklist: part 6. Who hits it first: 3, the office on the dashboard.
- What happens: The request is decided in the shift's own week or on Shift Pickup; a drop for next week shows nothing until the person pages forward.
- Where: src/App.js:8418; public/sw.js:61
- Proof: october/notices/shift_drop and shift_claim, admin and supervisor146
- Fix size: M (an address that opens one pickup). Needs another repository: ocsa-api: confirm subjectId is the pickup id. Already known: new.

### DASH-47. A tapped alert asks for sign-in when the session was not remembered or has ended

- When: Before 100. Class: sign-in. Checklist: part 6, contract 2.6. Who hits it first: 3, the office on the dashboard.
- What happens: With Remember this device off the session lives in sessionStorage, which a new window does not share, so every alert tapped with no dashboard window open draws the sign-in card. The place survives sign-in.
- Where: src/App.js:149-154, 1425, 859-860; public/sw.js:84
- Proof: read
- Fix size: M (decide with the owner what never asks for sign-in means for an unremembered session). Needs another repository: ocsa-api: token lifetime. Already known: new.

### DASH-48. One error boundary at the root: a bad widget blanks the whole dashboard, shows a stack trace, and Reload walks back into it

- When: Before 100. Class: silent. Checklist: part 10, 5.6. Who hits it first: 3, the office on the dashboard.
- What happens: The page lives in the hash, so Reload reopens the page whose data crashed it. The stack and component stack are drawn to every role.
- Where: src/index.js:17-50
- Proof: read
- Fix size: M (a boundary around the page area, keyed by page, with Back to Dashboard). Needs another repository: no. Already known: new.

### DASH-49. No error tracking of any kind

- When: Before 100. Class: silent. Checklist: part 10, 5.6. Who hits it first: 3, the office on the dashboard.
- What happens: No window.onerror, no unhandledrejection handler, nothing posted anywhere; a broken screen is known only if someone reports it. Railway has no error-tracking variable either (contract 4).
- Where: src/index.js:28 (console only); grep for Sentry, onerror, unhandledrejection finds nothing
- Proof: read
- Fix size: M. Needs another repository: ocsa-api (a client-errors route) or a Sentry DSN in Vercel. Already known: contract 4 notes the API side.

### DASH-50. Sites, Cases, Live Operations and HR Records' Documents, Training and Onboarding say nothing here, or keep the last list, when the API is down

- When: Before 100. Class: silent. Checklist: part 10. Who hits it first: 3, the office on the dashboard.
- What happens: The LoadFailed line with Try again is drawn in about 90 places; these main pages have none, so an outage reads as an empty list or the previous person's documents under a new name.
- Where: src/App.js:4095, 24252-24257, 24383, 4112-4128, 24558-24560, 22646, 1566-1571
- Proof: read (Appendix: down, slow and 500 by page)
- Fix size: M. Needs another repository: no. Already known: new.

### DASH-51. Six calls go around the helpers and skip all or part of the session handling

- When: Before 100. Class: sign-in. Checklist: part 11. Who hits it first: 3, the office on the dashboard.
- What happens: A dead token on a Jotform PDF or an employee document reads PDF fetch failed (401) and the session goes on.
- Where: src/App.js:23592, 23619, 24573, 24616 (no sessionRefusal); 21423, 21596 (401 only)
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-52. Issues loads and draws every issue ever, and its export stops wherever the reply is cut

- When: Before 100. Class: growth. Checklist: part 13, 5.9. Who hits it first: 3, the office on the dashboard.
- What happens: GET /api/issues has no range, limit or cursor; every issue is a card, and status tabs filter in the browser. Nothing reads a total, so a reply cut at 1,000 rows is drawn as complete (inferred).
- Where: src/App.js:4571, 4618, 4650, 11469
- Proof: read
- Fix size: M. Needs another repository: ocsa-api: filters, limit, cursor and a count. Already known: new.

### DASH-53. Schedule reads every shift of the range in one reply, three calls every 45 seconds, in a hidden tab too

- When: Before 100. Class: growth. Checklist: part 13. Who hits it first: 3, the office on the dashboard.
- What happens: A month view passes 1,000 shifts at about 45 staff (inferred); every cell filters the whole list.
- Where: src/App.js:12951, 12975-12979, 12992, 12996-13007
- Proof: read
- Fix size: M to L. Needs another repository: ocsa-api: a cap with a more flag or a count. Already known: new.

### DASH-54. Shift Pickup counts from whole lists and polls four to eight calls every 45 seconds

- When: Before 100. Class: growth. Checklist: part 13. Who hits it first: 3, the office on the dashboard.
- What happens: Requested pickups have no range and only their length is used; the convert window loads every shift for 30 days into one list.
- Where: src/App.js:13605-13622, 13634, 13691, 14121
- Proof: read
- Fix size: M. Needs another repository: ocsa-api: counts. Already known: new.

### DASH-55. Messages reads a channel's whole history every 12 seconds

- When: Before 100. Class: growth. Checklist: part 13. Who hits it first: 3, the office on the dashboard.
- What happens: No limit or cursor; the timer runs in a hidden tab.
- Where: src/App.js:6420, 6425, 778
- Proof: read
- Fix size: M. Needs another repository: ocsa-api: limit and cursor on messages. Already known: new.

### DASH-56. Inspections and HR documents and training load whole lists

- When: Before 100. Class: growth. Checklist: part 13. Who hits it first: 3, the office on the dashboard.
- What happens: /api/inspections/scheduled is read all-time; /api/hr/documents and /api/hr/training load everyone when no person is picked; tabs and paging are in the browser.
- Where: src/App.js:14454, 14457, 24558-24559, 24792, 24837, 25022
- Proof: read
- Fix size: M. Needs another repository: ocsa-api: range and cursor. Already known: new.

### DASH-57. Supplies fetches one QR image per supply, one after another, on every visit

- When: Before 100. Class: growth. Checklist: part 13. Who hits it first: 3, the office on the dashboard.
- What happens: The cache lives in the component, so every visit repeats the loop.
- Where: src/App.js:5019-5035, 4997
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-58. Sign-in downloads whole lists only to decide which side panel items to show, and five page timers keep polling in hidden tabs

- When: Before 100. Class: growth. Checklist: part 13. Who hits it first: 3, the office on the dashboard.
- What happens: /api/clearances, /api/discipline (every warning), /api/workspace/projects and /api/library load whole to set a boolean; /api/reports/overview is read on every page change. Overview, Live Operations, Messages, Schedule and Shift Pickup poll whether the tab is seen or not.
- Where: src/App.js:725-743, 1570, 4115, 6425, 12992, 13634
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: the feature list in the permissions answer. Already known: new.

### DASH-59. The Unfinished forms count stops at 50 and Time off shows at most 200, with nothing saying so

- When: Before 100. Class: growth. Checklist: part 13. Who hits it first: 3, the office on the dashboard.
- What happens: The count is the first page's length.
- Where: src/App.js:20759, 20770-20774, 12584-12585, 12900
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: a count. Already known: contract 4 (unfinished forms); new.

### DASH-60. A written warning is advertencia in 20 keys and amonestacion in 2, and the API's step labels disagree with the table's

- When: Before 100. Class: words. Checklist: part 7, contract 4. Who hits it first: 3, the office on the dashboard.
- What happens: The evidence pack's table is headed Amonestaciones over rows reading Advertencia; on a Spanish screen the window is headed Emitir una advertencia while its Step picker offers the API's Amonestacion verbal, and Termination reads Terminacion del empleo from the API and Despido from the table. HR-018's approved term decides.
- Where: src/words.js:3181-3185, 3870-3871; src/App.js:11322, 23142
- Proof: read (Appendix: words)
- Fix size: S. Needs another repository: ocsa-api: helpers/discipline.js labels. Already known: contract 4.

### DASH-61. Reset PIN takes any four characters, letters and 1111 included

- When: Before 100. Class: sign-in. Checklist: part 18, contract 4. Who hits it first: 4, admins and the owner.
- What happens: The window checks only the length; the input is not held to digits and no weak-PIN rule runs. The API decides; Choose your PIN holds the person's own PIN to digits.
- Where: src/App.js:2331, 2714 (compare 1346-1349)
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: the weak-PIN rule (contract 4). Already known: contract 4.

### DASH-62. No vercel.json: no security headers, no Content-Security-Policy, caching left to the preset, and source maps shipped

- When: Before 100. Class: deploy. Checklist: part 14. Who hits it first: 4, admins and the owner.
- What happens: The build ships main.<hash>.js.map with every source file inside (7 MB), and nothing sets HSTS, nosniff, frame-ancestors or a CSP, which is the second line against DASH-01. The proposed file is Appendix: vercel.json.
- Where: no vercel.json; build/static/js/main.*.js.map; public/index.html
- Proof: read; ls build/static/js
- Fix size: S. Needs another repository: Vercel settings (the chat checks the live headers). Already known: contract 4 (no vercel.json).

### DASH-63. Support ticket notices open only Tickets from the bell and the front page from an alert, and no address opens one ticket

- When: Before 100. Class: notice. Checklist: part 6. Who hits it first: 4, admins and the owner.
- What happens: support_ticket and support_ticket_new are written on live and have no place; the bell follows the link and TicketsPage takes no route.
- Where: src/App.js:8386-8420, 1285, 7225; public/sw.js:62
- Proof: october/notices/support_ticket(_new)/alert-opens-where-the-bell-does
- Fix size: S to M. Needs another repository: ocsa-api: subjectId for these types. Already known: new.

### DASH-64. The management review asks for each former employee's history one call at a time, with no cap

- When: Before 100. Class: growth. Checklist: part 13. Who hits it first: 4, admins and the owner.
- What happens: Turnover grows the list forever; filings are read back to the beginning 200 at a time.
- Where: src/App.js:11230-11233, 11160-11170
- Proof: read
- Fix size: S to M. Needs another repository: ocsa-api: a batch or summary route. Already known: new.

### DASH-65. Three people dropdowns are plain selects with no search, one listing people who left unmarked

- When: Before 100. Class: picker. Checklist: part 8, contract 2.11. Who hits it first: 4, admins and the owner.
- What happens: Per-person permissions, the Jotform alias User and Link to user. Every people dropdown a supervisor can reach is searchable (33 PersonPick uses).
- Where: src/App.js:16906-16910, 22237-22246, 22442-22452
- Proof: read; grep <option key={u.id} gives exactly these three
- Fix size: S (PersonPick takes the same options). Needs another repository: no. Already known: new.

### DASH-66. A build without REACT_APP_API_URL talks to live data: a preview, or npm start on a laptop

- When: Before 100. Class: deploy. Checklist: part 14, 5.10. Who hits it first: 5, nobody yet (latent).
- What happens: The API address falls back to the production Railway address, and .env sets only REACT_APP_THEME_COLOR (used nowhere). A Vercel preview of any branch signs in against live accounts and writes live records unless its environment sets the variable (inferred; the chat checks Vercel's preview variables).
- Where: src/App.js:7; .env
- Proof: read
- Fix size: S (no fallback, or fail the build). Needs another repository: Vercel preview environment. Already known: new.

### DASH-67. npm audit --omit=dev reports 99 (63 high, 33 moderate, 3 low), every one through react-scripts; nothing in the shipped bundle

- When: Before 100. Class: dependency. Checklist: part 16, 5.12. Who hits it first: 5, nobody yet (latent).
- What happens: react-scripts is listed under dependencies, so --omit=dev keeps the whole build toolchain (webpack-dev-server, postcss, nth-check, svgo, serialize-javascript, node-forge). React, ReactDOM, ApexCharts and react-apexcharts have no advisory. A gate on --audit-level=high fails every pull request until react-scripts moves to devDependencies.
- Where: package.json
- Proof: npm audit --omit=dev (Appendix: dependencies)
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-68. The full suite never arms Steps 247 to 341, so it drives the API as it stood in mid-September

- When: Before 100. Class: harness. Checklist: part 1, 5.13. Who hits it first: 5, nobody yet (latent).
- What happens: Only the smoke check arms the steps; no suite under audit/cases did. Every supervisor case in the full run drives a supervisor without manage_staff or read_incident_reports and with HR Records open, so the pay, signature and clearance findings above were invisible to it. setApiAsBuilt and cases/october.js are the first suite on the API as built.
- Where: audit/run.js; audit/stubs.js setStep*
- Proof: grep setStep audit/cases: none before this round
- Fix size: M. Needs another repository: no. Already known: contract 5.13.

### DASH-69. The stub lagged the API as built in 21 places; 10 are corrected this round and 11 remain for the fix round

- When: Before 100. Class: stub. Checklist: part 1, 5.13. Who hits it first: 5, nobody yet (latent).
- What happens: See Appendix: stub drift for each place, what changed and what the fix round has to do to make the API as built the stub's default.
- Where: audit/stubs.js, audit/seed.js
- Proof: october/stub/supervisor146-holds-contract-1-column passes; the corrections are read by every october case
- Fix size: M. Needs another repository: no. Already known: contract 5.13.

### DASH-70. No pull request runs a build, the smoke check, the audit or a security check

- When: Before 100. Class: process. Checklist: part 19. Who hits it first: 5, nobody yet (latent).
- What happens: The only workflows are guide-check and guide-sync. The proposed .github/workflows/ci.yml is Appendix: CI.
- Where: .github/workflows/
- Proof: read
- Fix size: M. Needs another repository: no. Already known: contract 4.

### DASH-71. Ten pages, eleven pages' views and 43 windows have no case in the full audit; 22 of the windows are driven by nothing at all

- When: Before 100. Class: harness. Checklist: part 1, part 3, 5.13. Who hits it first: 5, nobody yet (latent).
- What happens: While the full audit was paused (Sept 28) the app grew from about 22,500 to 28,406 lines. The inventory's 67 window claims had drifted by up to 6,000 lines (66 re-anchored this round, by component and the state that closes the window; the 67th, the customer links window, no longer exists). Ten pages (workspace, tickets, quotes, periodic, owner, library, equipment, discipline, clearances, chat-records) are never opened by the pages suite, eleven have no view case, and 43 windows have no route in the windows suite. The smoke check opens 20 of those windows and cases/october.js one; 22, the written warning, its old-form record, clearance dates, PPE, the workspace windows and the monthly report among them, are opened by no check at all.
- Where: audit/inventory.js (PAGES, VIEWS, WINDOWS); audit/cases/windows.js (ROUTES); audit/cases/coverage.js
- Proof: the coverage rows, now KNOWN by name in audit/known.json (five entries) so the run passes and a case written for any of them takes its entry off
- Fix size: L (a route per window, a page entry with its layout record and a view per page). Needs another repository: no. Already known: new.

### DASH-72. The harness never simulates a network failure, a request that never answers, or a 401 while a window holds typed text, and never reads a window's bottom at 390

- When: Before 100. Class: harness. Checklist: part 10, part 15. Who hits it first: 5, nobody yet (latent).
- What happens: No route.abort anywhere in audit/; 390 runs only at Standard in English; the windows suite does not run at 390.
- Where: audit/lib/driver.js, audit/run.js:20-29
- Proof: read
- Fix size: M. Needs another repository: no. Already known: new.

## Later

### DASH-73. A lead or laborer at the dashboard sign-in is told Admin access required, and the token the API issued is dropped without a sign-out

- When: Later. Class: sign-in. Checklist: part 4. Who hits it first: 1, field staff on a phone.
- What happens: No pointer to the staff app; the token stays valid on the server until it expires (inferred). The harness has no staff persona to prove it.
- Where: src/App.js:927, 901, 973
- Proof: read
- Fix size: S. Needs another repository: ocsa-api could refuse a staff role at the dashboard's sign-in. Already known: new.

### DASH-74. An announcement alert opened in a new window shows a supervisor This page is for admins.; the bell opens it read-only

- When: Later. Class: notice. Checklist: part 6. Who hits it first: 2, supervisors in the field.
- What happens: The worker's address goes through the render switch.
- Where: public/sw.js:49, 84; src/App.js:1289, 414, 8394, 8427
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-75. inspection_unfinished may name a walk the Inspections page cannot read

- When: Later. Class: notice. Checklist: part 6. Who hits it first: 2, supervisors in the field.
- What happens: #inspections/<id> reads a scheduled inspection; a draft id would toast a refusal (inferred).
- Where: src/App.js:8415, 14550-14556
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: what subjectId names. Already known: new.

### DASH-76. Smaller access items: Overview offers a supervisor Pending with nothing to press; #owner renders for anyone (the API refuses); Tickets opens for a supervisor the support contact names; Monthly Value of a site's contract shows to every supervisor

- When: Later. Class: access. Checklist: part 4. Who hits it first: 2, supervisors in the field.
- What happens: Each needs the owner's call or the API's answer.
- Where: src/App.js:1578, 1608, 2768; 1265; 683, 738; 3666
- Proof: read
- Fix size: S. Needs another repository: ocsa-api. Already known: new.

### DASH-77. Smaller phone items: the month view at 390; 108 places at 7 to 9 px; the largest size is 150%; controls under 44 px above 700 px

- When: Later. Class: phone. Checklist: part 15. Who hits it first: 2, supervisors in the field.
- What happens: 200% is reachable only by browser zoom, which turns on the phone shell.
- Where: src/App.js:13273-13285; 13193-13285, 13870-14022; 255-260; 1933
- Proof: read
- Fix size: S to M. Needs another repository: no. Already known: new.

### DASH-78. training_expiring opens the person from the bell and Gaps from an alert

- When: Later. Class: notice. Checklist: part 6. Who hits it first: 3, the office on the dashboard.
- What happens: The push payload carries no link.
- Where: src/App.js:8409; public/sw.js:55
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: a subjectId naming the person. Already known: new.

### DASH-79. Smaller growth items: staff and pickers load the whole people list; Tickets, Cases, Help insights and Assigned tasks load whole lists; 33 of 44 tables draw every row; record prints fetch one item or image per row

- When: Later. Class: growth. Checklist: part 13. Who hits it first: 3, the office on the dashboard.
- What happens: Bounded today; each grows with staff or history.
- Where: src/App.js:2096, 700, 7236-7240, 24254, 8064, 11819, 1538-1540, 10586, 10430-10434, 10569, 27962
- Proof: read
- Fix size: S to M. Needs another repository: ocsa-api for paging. Already known: new.

### DASH-80. A tapped alert never marks its notice read, so the bell's count stays up

- When: Later. Class: notice. Checklist: part 6. Who hits it first: 3, the office on the dashboard.
- What happens: The payload carries no notice id.
- Where: public/sw.js:31; src/App.js:823-830
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: the notice id in the payload. Already known: new.

### DASH-81. A notice of a type the dashboard does not know, with no link, closes the bell and says nothing

- When: Later. Class: notice. Checklist: part 6. Who hits it first: 3, the office on the dashboard.
- What happens: It is marked read and nothing opens. The refusal line That one is for admins. is also said to a supervisor about their own signature request and to anyone before a probe has answered.
- Where: src/App.js:8423-8435, 8350-8352, 8428
- Proof: october/notices/unknown-type/admin and /supervisor146
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-82. Smaller picker items: assignee lists may offer client contacts and admins; a record held by someone off the list shows the placeholder; Discipline cannot filter by a person who left

- When: Later. Class: picker. Checklist: part 8. Who hits it first: 3, the office on the dashboard.
- What happens: See the agent table in Appendix: pickers.
- Where: src/App.js:4021, 4719, 11849, 11888, 11897, 12544, 12816; 1468, 1487; 23880, 23907
- Proof: read
- Fix size: S. Needs another repository: ocsa-api: whether GET /api/users?status=active returns client contacts. Already known: new.

### DASH-83. Smaller time items: inspection rows dated by the UTC day of completed_at; expiry countdowns one day long across Nov 1; a month cell to week by milliseconds; prints in the laptop's zone with no zone named; today and yesterday by 24-hour periods; Live Operations keeps yesterday's board after midnight

- When: Later. Class: time. Checklist: part 12. Who hits it first: 3, the office on the dashboard.
- What happens: Each is small; together they are why one company-clock helper is needed (DASH browser-today). Weeks themselves hold across Nov 1.
- Where: src/App.js:9133, 9234; 23637, 24698, 13690; 13277; 2267, 2288, 8846 and the instant displays; 22952-22959; 4111-4116
- Proof: node reproductions (Appendix: time)
- Fix size: S each. Needs another repository: no. Already known: new.

### DASH-84. Smaller silent items: marking notices and conversations read fails quietly; a case log re-read fails quietly; an empty 2xx body would throw after the work is done; Staff Management's own refusal line can never show

- When: Later. Class: silent. Checklist: part 10. Who hits it first: 3, the office on the dashboard.
- What happens: 49 battery hits: 31 harmless, 17 hide a failed load, 1 hides a failed save; 103 more catches only log. Since Step 332 a refused staff list draws the API's words; its fallback, This page is for admins., is never reached, because af always sets a message, so a 403 with no error reads Request failed.
- Where: src/App.js:1308, 8516, 8525, 6411, 15751, 24275-24278; 84, 97; 2769
- Proof: battery line 1 (Appendix: battery)
- Fix size: S. Needs another repository: ocsa-api: confirm no 204. Already known: new.

### DASH-85. Other guide drift: the drop request entry says Approve where the button is Approve Drop and misses Reassign; Find training misses Time and Matrix; Periodic work does not say reference sites are left out; three Who lines say admins for Reset PIN, Assign and Unlock; 145 bold names carry no Spanish

- When: Later. Class: guide. Checklist: part 7. Who hits it first: 3, the office on the dashboard.
- What happens: guide-check reads only the bold pairs that are written.
- Where: guide/APP-DASHBOARD.md:303, 2139, 1758, 121, 144, 2277 and Appendix: guide
- Proof: read
- Fix size: S to M. Needs another repository: ocsa-api for the three Who lines. Already known: new.

### DASH-86. Labor cost per square foot by site is one person's pay wherever one person works a site

- When: Later. Class: pay. Checklist: part 4, contract 2.1. Who hits it first: 4, admins and the owner.
- What happens: Gated by view_owner_dashboard, never manage_employment; and a labor_hours report waiting in the Reports library would reach every reader of Reports once the source arrives.
- Where: src/App.js:11766-11830
- Proof: read
- Fix size: S. Needs another repository: ocsa-api. Already known: new.

### DASH-87. Smaller edit-window items: Jotform Edit Form nulls three settings and sets has_original_pdf; the pencil splits names at the first space; Rehire before its read restores no site; a clearance renew sends documentId null; Edit Value lets the stored code change; a training requirement save resets serviceLine

- When: Later. Class: together. Checklist: part 5. Who hits it first: 4, admins and the owner.
- What happens: See Appendix: edit windows.
- Where: src/App.js:21505-21517, 21773; 2381; 1722-1760; 22638, 22666; 17274, 17488; 25972
- Proof: read
- Fix size: S each. Needs another repository: no. Already known: new.

### DASH-88. The Roles and permissions reference tells an admin the opposite of contract 1

- When: Later. Class: access. Checklist: part 4. Who hits it first: 4, admins and the owner.
- What happens: It says supervisors hold None for staff accounts and Manage for labor reports and timesheets, has no rows for manage_employment, read_hr_records or manage_cases, and labels view_reports Reports, labor, and scheduling.
- Where: src/App.js:16661, 16683-16716
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-89. A deactivated report cannot be brought back, and two raw category spellings can give two groups with the same heading

- When: Later. Class: other. Checklist: part 18. Who hits it first: 4, admins and the owner.
- What happens: The chat fixed one template's category in the data; the code can make the same two headings again.
- Where: src/App.js:11403-11765, 11483, 8590-8594
- Proof: read
- Fix size: S. Needs another repository: no. Already known: contract 4 (the data fix).

### DASH-90. Workflows pin actions by tag, and audit/count.js uses @babel/parser without declaring it

- When: Later. Class: dependency. Checklist: 5.12. Who hits it first: 5, nobody yet (latent).
- What happens: depcheck finds no unused package; the parser resolves through react-scripts.
- Where: .github/workflows/*.yml (actions/checkout@v5, setup-node@v5); audit/count.js
- Proof: npx depcheck
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-91. An existing push subscription is reused after the API's key changes, and a push with no title shows nothing

- When: Later. Class: phone. Checklist: part 6, 5.16. Who hits it first: 5, nobody yet (latent).
- What happens: Pushes signed with a new key fail (inferred); browsers may count an empty push against userVisibleOnly.
- Where: src/App.js:6801-6802; public/sw.js:25
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-92. A dashboard link on another origin (an alias, a preview) opens a new tab

- When: Later. Class: link. Checklist: part 6. Who hits it first: 5, nobody yet (latent).
- What happens: notifTarget treats any other origin as external.
- Where: src/App.js:8350-8376
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-93. An email address is written in source in a public repository

- When: Later. Class: process. Checklist: contract 2.14, CLAUDE.md. Who hits it first: 5, nobody yet (latent).
- What happens: A company mailbox that names no person; CLAUDE.md says nothing in the repository names an email address and client values belong in settings.
- Where: src/clientConfig.js:37 (the forms mailbox; value not repeated)
- Proof: read
- Fix size: S. Needs another repository: ocsa-api settings. Already known: new.

### DASH-94. Helpers written more than once: dates, HTML escaping, image-address tests and print bodies

- When: Later. Class: duplication. Checklist: part 16, 5.14. Who hits it first: 5, nobody yet (latent).
- What happens: The same field reads differently on different screens, and the escaping helper the unsafe prints need already exists six times. HR Records' own fmtDate draws an onboarding step's day as 2026-02-25 in both languages, where every other screen writes Feb 25, 2026 or 25 feb 2026.
- Where: src/App.js: toISO 445 and todayISO 12384; localDate 322 and timeOffLocal 12559; local fmtDate at 10439, 14366, 17593, 21076, 22949, 24566; esc at 8847, 9056, 9224, 9350, 16737 beside keptEsc and escHtml 19992; the isImgUrl test at 2225, 3572, 3956; jscpd clones in Appendix: duplication
- Proof: jscpd with --max-size 10mb: 7 clones, 124 lines; page/staff/onboarding-steps (known)
- Fix size: M. Needs another repository: no. Already known: new.

### DASH-95. The production API host is written in two places: the dashboard's fallback and the guide sync script

- When: Later. Class: link. Checklist: 5.10. Who hits it first: 5, nobody yet (latent).
- What happens: A move of the API means two edits.
- Where: src/App.js:7; scripts/guide-sync.js:12
- Proof: battery line 5: 3 hits
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-96. The source finder calls 83 strings English on pages taken as done, and its count of printed pages runs 2 under a plain count; neither is English a person reads

- When: Later. Class: harness. Checklist: part 1, part 7. Who hits it first: 5, nobody yet (latent).
- What happens: 72 of the 83 strings are keys the word table holds Spanish for, translated where they are used in shapes audit/lib/strings.js does not follow (a list walked with .map(c => ({ l: tr(c.l) })), a table read through a helper); the other 11 are CSS gradients, two query strings, an SVG, the code OCSA-FRM-015 and the name Francais. Three of the 20 page openings are the error page a print writes in its catch, two of them in a function that already opens its page. The Spanish screen pass read the same pages with two finder gaps of its own, a document code (OCSA-QMS-018 read as QMS) and the record languages' own names; this pull request closes both in audit/lib/english.js.
- Where: audit/lib/strings.js translatedShapes; audit/cases/house-style.js (the <!DOCTYPE html count); src/App.js:27446, 27721, 27981
- Proof: house-style/a-page-taken-as-done-reads-no-english and house-style/the-finder-reads-every-printed-page (known)
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-97. Smaller harness items: inventory.js names windows by stale lines; the seed cites the sign-in gate at App.js:367 (it is 927); the stub's range filters are kinder than the API's; no staff persona

- When: Later. Class: harness. Checklist: part 1. Who hits it first: 5, nobody yet (latent).
- What happens: None fails a run today.
- Where: audit/inventory.js:147; audit/seed.js:22-23; audit/stubs.js client requests range
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

### DASH-98. Ids reach the hash raw from the bell and encoded from an alert

- When: Later. Class: notice. Checklist: part 6. Who hits it first: 5, nobody yet (latent).
- What happens: Same for UUIDs; different for an id with a slash or a space.
- Where: src/App.js:8391-8403; public/sw.js:46
- Proof: read
- Fix size: S. Needs another repository: no. Already known: new.

## Contract 4's dashboard items and the Oct 7 notes (part 18)

| Item | On main today | Where | Finding |
|---|---|---|---|
| The Not tracked explainer reads "Its task list is kept as the record of the work." | Confirmed | src/App.js:4131; src/words.js:4936 | DASH-17 |
| Spanish word drift: 22 keys missing, 40 extra against the CSV | Confirmed exactly; one cause, 40 CSV rows that keep the context after the bar; no Spanish differs | translation/dashboard_words.csv:2820-3698 | DASH-16 |
| "advertencia" and "amonestacion" both used for a written warning | Confirmed: 20 keys and 2 keys, and the API's step labels say Amonestacion | src/words.js:3181-3185, 3870-3871; src/App.js:11322, 23142 | DASH-60 |
| The weak-PIN rule at reset and registration | The dashboard's Reset PIN checks only the length and takes letters; registration is the staff app's; Choose your PIN holds to four digits and leaves weakness to the API | src/App.js:2331, 2714, 1346-1349 | DASH-61 |
| Ticket Oct 14: Help could not answer "how do I delete a report" | Confirmed: nothing is deleted; Deactivate on custom reports only; templates have Run and Duplicate; the guide entry lacks both | src/App.js:11476-11480, 11624-11634; guide/APP-DASHBOARD.md:417-427 | DASH-18 |
| The chat fixed one template's category (two Issues headings) in the data | Fixed in the data; the code can make two groups with the same heading again from two raw spellings | src/App.js:11483, 8590-8594 | DASH-89 |
| Fronts: no vercel.json; the only workflows are guide-check and guide-sync | Confirmed | .github/workflows/ | DASH-62, DASH-70 |
| src/App.js is 28,406 lines | Confirmed (CLAUDE.md still says 22,529) | src/App.js | Part 19 below |
| The legacy public key and the Supabase address are in the staff app's public history; nothing in either front's src/ uses Supabase | Also in this repository's history (3ae72f5, removed in bf6dd5e); nothing in src/ uses Supabase | git history | DASH-19 |
| No database backstop against double sends | The API's and the database's; the dashboard's side is that nothing stops a double press | src/App.js:13374, 11905, 4022, 4721 | DASH-11, DASH-05 |
| API: timesheets read a date-only end as UTC midnight | The dashboard calls no timesheet route; every range it sends ends on the day itself | Appendix: time, 12.3 | DASH-38 |
| API: /api/labor/by-role and /by-staff give supervisors cost | The dashboard calls neither route (no /api/labor anywhere in src/); clean on this side | src/App.js (grep) | none |
| API: hr_case_*, task_assigned and support_ticket_new have no push switch | My alerts offers five switches: schedule, pickups, supplies, issues and forms; nothing for cases, tasks, training or tickets | src/App.js:6876 | the API's; noted here |
| API: a case opened from a filed report stores no link | The dashboard sends formResponseId with the case | src/App.js:23927-23945 | the API's |
| Staff app, Oct 7: issues and assigned tasks overlap; notices send people there | On the dashboard an issue_assigned notice opens the Issue Tracker on the issue itself (#issues/<id>) and ignores the staff app link; Assign Issue as Task makes a separate task beside the issue, which is where the overlap starts | src/App.js:8414, 4640 | DASH-05 (double press); the overlap is the owner's call |
| Staff app, Oct 7: unfinished forms must save per person and remind until finished | A form started on the dashboard saves as a server draft per person (PATCH /api/forms/drafts/:id); the Unfinished tab's count stops at 50; reminders are the API's | src/App.js:19022, 20759, 20770-20774 | DASH-59 |

## Process: CLAUDE.md read as a new session would read it (part 19)

What a new session is told, and what it is not:

- **Out of date.** It says src/App.js is 22,529 lines (it is 28,406); that the issue source is the only live data
  layer (supply usage, inspection quality, client ratings and kept records run beside it); that the auth helper is
  `af(path, { method, body })` (it is the shell's callback around `apiFetch`, src/App.js:599).
- **The API wrapper.** Nothing says every call goes through `apiFetch`, `apiDownload`, `apiMultipart`, `apiUpload` or
  `apiStream` (src/App.js:20-140) and never `apiRequest` or `fetch` directly; six places do (DASH-51). Nothing
  says a refusal is drawn in the API's own words with its `code`, or that a network failure needs words of its own.
- **The date helper.** Nothing says a day from the API is drawn with `fdDay`/`fdLong` and never `fd`, that a day is
  never parsed with `new Date(day)`, or that today is the company's day (there is no helper for it yet,
  DASH-42).
- **The edit-window rule.** Contract 2.2 is not in it: a window reads the record it edits, sends only what changed,
  keeps Save off until the record has loaded, and a second press sends nothing (DASH-03, DASH-37).
- **Prints.** Nothing says every value written into a print window goes through `escHtml` (DASH-01).
- **Pay and capabilities.** Nothing names `manage_employment` as the gate for every pay figure, or `canOpenPage` and
  `hasCap` as the one place a page or control is gated.
- **New packages.** Nothing says no package is added without a reason in the pull request (the last 60 days added
  none at runtime, which is good).
- **The public repository.** The rule is written under the Help guide section only; it should cover src/ and audit/ as
  well (src/clientConfig.js names a mailbox, DASH-93), and say a key is never committed (one was,
  DASH-19).
- **How to run every check.** Build, guide-check and smoke are named; the full audit is paused. Missing: `AUDIT_ONLY`
  for one suite (`AUDIT_ONLY=october npm run audit` proves this round's findings), `npm run shots`, that none of these
  runs on a pull request (DASH-70), and the proposed CI in Appendix: CI.
- **Approval.** "Show a diff and wait for review before committing" reads as a block on every commit; a session cannot
  tell whether the pull request review is that review.

## The runs (part 2)

The owner lifted CLAUDE.md's "the full npm run audit ... is not run" for this audit once. Every run below is on this
container (4 cores), with Chromium from PLAYWRIGHT_BROWSERS_PATH.

**The first full run**, with the harness as it stood on `main` at 36d47f3 (no october suite), 95m31s, exit 1:

```
pages covered       5068 of 5122
views covered       71 of 73
windows covered     564 of 587
tables covered      204 of 204
reports checked     42 of 42
exports checked     85 of 86
decisions exercised 54 of 58
refusals shown      125 of 127
known failures      1
FAILURES            354

run time            5731s
```

Where the 354 went:

- **Coverage, 207 rows** (67 FAIL, 140 NO CASE). The 67 were window claims that had drifted up to 6,000 lines while
  the full audit was paused; they were re-anchored by the component and the state that closes each window. What has
  no case at all, 10 pages, their views and light-mode rows, and the windows no suite drives, is 74 rows, each named
  in `known.json` as the coverage backlog (DASH-71).
- **Layout, 46 rows.** The side panel's Staff group gained an item, 44 px, which moves every box below it; the layout
  was recorded again.
- **Drift in the cases, 98 rows** (page 54, window 23, spanish 6, decisions 4, suite 3, help 3, view 2, refusal 2,
  export 1). The app changed on purpose after Sept 28 and the cases had not followed: Step 291's searchable person
  picker, the profile tabs that moved to the HR folder, the diff-only Edit Staff Info, customer links on the Forms tab,
  the Sept 29 behaviors (d1a2306), the kept records, and the request and client ids. Each case was held to the screen
  as it is now, as strict as it was. Two lines of the Spanish pass were the finder's own gaps (a document code and a
  language's own name) and were closed in `audit/lib/english.js`.
- **House style, 3 rows,** each now in `known.json`: the word table and the translator's CSV disagree, which the fix
  round mends in the CSV (DASH-16), and the English finder's two counts, which are the finder's own limits
  (DASH-96). One app failure showed once the HR Files case was moved to HR Records: the onboarding day drawn
  as 2026-02-25 in both languages (DASH-94).

**The final full run**, `npm run audit` at 39edbae, 97m33s, exit 0, its summary table as printed:

```
pages covered       5122 of 5122
views covered       71 of 71
windows covered     620 of 620
tables covered      204 of 204
reports checked     42 of 42
exports checked     86 of 86
decisions exercised 60 of 60
refusals shown      129 of 129
known failures      26
FAILURES            0

run time            5853s
```

The 26 known entries print 120 KNOWN rows: 41 october cases, 74 coverage rows, 3 house-style and 2 of the
onboarding day. The run also names 22 routes the stub has no rule for and answers with an empty shape; 7 of them are
reads of the 10 pages with no case yet (Appendix: stub drift, row 22, and DASH-69).

**After it**, on the same commit:

| Check | Result | Time |
|---|---|---|
| `npm run build` | Compiled successfully | 17.6s (43.2s on the first build of the session) |
| `npm run smoke`, first | all passed, 473 lines ok | finished in 120s (2m0.9s wall) |
| `npm run smoke`, second | all passed, 473 lines ok | finished in 121s (2m1.9s wall) |
| `npm run guide-check` | The guide reads. 215 entries, 262 pictures | 0.24s |

## The search battery's counts

Every line in contract 6 that fits this repository, with each hit read; the table is Appendix: the search battery.
Counts: catches 53, dates 24, filter strings 0, loops with await 1, hard-coded hosts 3, select star 0, console with a
secret word 1, secret lines in history 2, npm audit 99, depcheck 0 unused and 1 missing, jscpd 0 as written and 7 with
the size limit raised.

## What this contract got wrong

- **The legacy public key is in this repository's history too.** Contract 4 places it in the staff app's; commit
  3ae72f5 put it in src/App.js here as well (DASH-19).
- **The jscpd line skips src/App.js.** jscpd ignores files over 100 KB by default, so contract 6's line reads six small
  files and reports 0 clones; with `--max-size 10mb` it finds 7. This repository has no lib, routes or jobs.
- **The proposed audit gate cannot pass today.** `npm audit --audit-level=high` (part 19's CI) fails on every run while
  react-scripts is a runtime dependency: 63 high advisories, none in the shipped bundle.
- **startNow is not a dashboard shape.** Part 1 lists it among API #146's shapes "already used in src/App.js"; neither
  src/ nor the stub uses it, and the dashboard has no Start an inspection.
- **A supervisor's people do not come from loadPeople's fallback.** Part 8 says so; since #146 the HR summary it falls
  back to is read_hr_records', and a supervisor fills only through GET /api/users (DASH-28).
- **The word drift is one cause, not 62.** The 22 and the 40 are exact, and all come from 40 CSV rows that keep the
  context after the bar; no pair's Spanish differs.
- **"A hidden field is still delivered."** True of the stub (every hourly rate reached every persona); whether the API
  as built sends a supervisor the profile's rate is the API audit's to say. The stub now strips it under
  `setApiAsBuilt`, as contract 1's Guards column reads.
- **Small references.** The toast is at src/App.js:755-774 and 1305-1311 (the brief says near 740); the staff app's
  default address is src/clientConfig.js:29; the sign-in gate the seed cites at App.js:367 is at 927.
- **CLAUDE.md** says src/App.js is 22,529 lines; it is 28,406 (part 19).

## What this session could not check, and what it would need

- **How API #146 answers**: the profile's hourly rate to a supervisor; PATCH /api/users/:id with hourlyRate or
  employmentType from a non-holder; GET /api/users/:id/employment, GET /api/signatures and the clearance routes for a
  supervisor; each notice type's link and subjectId; how each range route reads its end; whether any route answers 204;
  the token's lifetime and a renew route; the weak-PIN rule. Needs the API audit's reading of ocsa-api (live calls are
  out of reach here).
- **Vercel**: the production and preview values of REACT_APP_API_URL and REACT_APP_PORTAL_URL, the framework preset's
  fallback and headers, deployment protection on previews, and whether GENERATE_SOURCEMAP is set. Needs the project's
  settings (the chat checks, contract 7).
- **Live data**: which lists pass 1,000 rows first (training records, issues, chat messages); whether office computers
  are set to America/New_York; how many supervisors use a phone at the Largest text size. Needs the database and the
  owner.
- **A real push, and a click with the dashboard closed**, on a real browser and a real phone: the harness answers the
  worker's address from the hash and cannot deliver a push.
- **Every (inferred) layout item** (the tall windows, Largest at 390, the month view at 390): a run of the pages and
  windows suites at 390 with the Largest size and a check that each window's last button is inside its box, which the
  harness does not have yet (DASH-72).
- **The Help agent's limits** (contract 5.15): token caps, retrieval and the model setting live in ocsa-api; the
  dashboard draws what Help streams and sends a photo up to its size cap (src/App.js:7052).

## Appendix: stub drift (part 1, contract 5.13)

Every place `audit/stubs.js` and `audit/seed.js` answered differently from the API as built in #146 (contract sections 1
and 3, and the shapes `src/App.js` already reads). "Corrected" says what this round changed under `audit/`; "Left" is
for the fix round, which moves the harness to the real API by making `setApiAsBuilt` the stub's default and taking the
older answers off.

The largest drift is structural: **no suite under `audit/cases` armed any of Steps 247 to 341** before this round, so the
full `npm run audit` drove the API as it stood in mid-September, and only the smoke check met the API as built
(DASH-68). `setApiAsBuilt` (new) arms every step from 247 to 341 the way the smoke check's admin pass does,
with the training day round on top and Step 283's sign-in answers off, and adds the corrections marked "as built" below.
`cases/october.js` is the first suite that runs on it.

| # | Where the stub lagged | API as built (contract) | This round | Left for the fix round |
|---|---|---|---|---|
| 1 | Capabilities, unarmed: a supervisor holds manage_tasks, manage_inspections, manage_schedule and view_reports only; manage_staff and read_incident_reports are false; manage_employment, read_hr_records and manage_cases are not named (audit/stubs.js CAPABILITIES; arm327) | Contract 1: supervisor holds manage_staff, manage_cases, read_incident_reports; neither manage_employment nor read_hr_records | Corrected as built: `setApiAsBuilt` arms Step 327, which names the three and turns the two on | Make it the default; drop the pre-#146 world and the smoke line that asserts the old menu first (audit/smoke.js:2498-2503) |
| 2 | No seeded supervisor held exactly contract 1's column (u-sup-1 only while Step 327 is armed; u-cap-1 adds manage_permissions) | Contract 1's supervisor column | Corrected: `seed.PEOPLE.supervisor146` (u-sup-146) with the five as overrides; not one of PERSONAS | Fold into PERSONAS once the default is the API as built |
| 3 | Step 327's HR summary refusal said `auth.capabilityRequired` | 403 `access.insufficientPermissions` with `capability`; there is no `auth.capabilityRequired` | Corrected everywhere (the dashboard reads only the status, so no case changed) | none |
| 4 | Other refusals carry no `code` or no `capability`: GET /api/users and GET /api/lookups/all answer `{ error }` only; holidays answer the code without `capability` | One shape: 403 access.insufficientPermissions naming the capability | Left (no dashboard code reads the capability yet) | Give every stub refusal the one shape |
| 5 | The employment history card (GET /api/users/:id/employment), HR documents, compliance, a person's folder and onboarding answered every persona | read_hr_records | Corrected as built: refused 403 naming read_hr_records to a caller without it | Default |
| 6 | POST /api/users (Add Staff) and POST /api/users/:id/approve accepted a supervisor | manage_employment | Corrected as built: refused 403 naming manage_employment | Default |
| 7 | Every hourly rate reached every persona: the profile route spreads the staff row (hourlyRate from the fifth row on); GET /api/users carries it unless Step 341 is armed | Every pay figure is manage_employment's (contract 1 Guards, 2.1) | Corrected as built: no answer to a non-holder of manage_employment carries hourlyRate, hourly_rate, payRate or pay_rate | Default; the API audit confirms the profile route's behavior |
| 8 | PATCH /api/users/:id writes whatever it is sent, role, status and hourlyRate included, from any persona (Step 341 drops only hireDate) | manage_employment for role, status, employment and pay | Left: whether the API refuses or drops a non-holder's pay keys is not in the contract | Answer the way the API audit says |
| 9 | The filed-forms list was gated by a seed flag (readsFiledForms) where the API reads read_incident_reports | read_incident_reports lists filed OCSA-FRM-016 and 017 | Corrected as built: a holder of read_incident_reports lists filed reports | Default |
| 10 | Notice subject types: the seed's bell holds form, hr_case, inspection, pickup, supply_request, signature_disputed, training_signoff, training_expiring, uniform_fitting, issue, issue_assigned, hr_case_assigned and time_off; 22 of contract 3's 26 types never appeared | Contract 3's 26 types | Corrected: `stubs.addNotices(rows)`; cases/october.js lays one of every type on the bell, as an admin and as u-sup-146 | Seed them in NOTIFICATIONS |
| 11 | Time off with affectedShifts and timeOffConflict, checklistMode and hireDate answered only under Steps 330, 337 and 341, which no suite armed | API #146 | Corrected as built (the steps are armed) | Default |
| 12 | No /api/discipline list, PUT or issue route in stubs.js (only the steps, and pictures-stub.js under Step 278) | API #146 discipline routes | Left: the Warning window (DASH-04) cannot be driven | Add the routes |
| 13 | Calendar shifts carry no service_category; Jotform form rows carry none of the nine keys Edit Form sends | The API's rows (inferred) | Left; this hides DASH-33 and part of DASH-87 | Shape the rows as the API does |
| 14 | Range filters compare the first ten characters, inclusive, on the UTC day | Contract 4: timesheets read a date-only end as UTC midnight | Left; the audit cannot see DASH-38 until the stub reads ends the API's way | Read ends as the API does, route by route |
| 15 | GET /api/users ignores ?status and ?role | The API filters (inferred) | Left | Filter |
| 16 | The stub reads no token: the role is whoever signed in last | The API reads the token | Left | Key the persona on the token |
| 17 | No staff persona (lead or laborer) to drive the dashboard's refusal at sign-in | API #146 signs staff in | Left (DASH-73) | Add one |
| 18 | `startNow` (contract part 1's list) | The staff app's Start an inspection | Not applicable: neither src/App.js nor the stub uses it; the dashboard has no Start an inspection | none |
| 19 | Help insights' window read its Language filter from `locale=` | STEP195_CONTRACT.md section 5: the filter is `language=`, and `locale=` is only the language the words come back in; the dashboard sends `language=` since d1a2306 | Corrected everywhere: `helpWindow` reads `language=`, and `help-insights/every-filter-on-the-address` holds the dashboard to it. The old known failure on All languages came off, since it now passes | Default |
| 20 | A customer link still answers as expired (cl-3) | Since Step 250 a link is On or Off and nothing expires | Left: the dashboard draws the expired link Off, and `customer-links` now holds it to Off | Answer only On or Off |
| 21 | No rule for GET /api/sites/:id/survey-schedule; the empty-shape fallback answers 200 `{}` | The API's route (Step 196) | Left: a survey link offers Survey schedule because the fallback answers, and `customer-links` expects the button only when the read was answered | Add the route with its shape |
| 22 | 22 routes have no rule and are answered with an empty shape: GET /api/support/contact, /api/clearances, /api/discipline, /api/workspace/projects, /api/equipment, /api/periodic-work, /api/support/tickets, /api/library, /api/users/me/trusted-devices, /api/training/topics, /api/training/gaps, /api/training/awaiting, /api/training/sessions, /api/documents, /api/training/lesson-drafts, /api/signatures, /api/training/time, /api/training/matrix, /api/holidays, /api/settings/support-contact, /api/languages, /api/users/roster-check (the final run's own list) | API #146's shapes | Left: 7 are reads of the 10 pages with no case yet (DASH-71); a case that reads one of the others meets an empty answer | A rule for each, with its shape |

Counts: 22 places. Corrected this round: 10 (rows 1, 2, 3, 5, 6, 7, 9, 10, 11 and 19; eight under `setApiAsBuilt`, and
rows 3 and 19 everywhere). Left for the fix round: 11 (rows 4, 8, 12 to 17 and 20 to 22). Not applicable: 1 (row 18).
Apart from rows 3 and 19, the suites written before this round meet the stub as it was: every other correction is
under `setApiAsBuilt`.

Stub fixes listed under part 3 ("a failure that comes from the stub lagging is fixed in the stub"): rows 3, 5, 6, 7 and
9. Each first showed as a failure of an october case and is now corrected: row 7 turned
`october/supervisor/no-reply-carries-pay` green (the profile route sent `.user.hourlyRate` to u-sup-146), row 9 let the
supervisor's Forms open (a customer concern notice was refused "for admins"), and rows 5 and 6 are what
`october/supervisor/profile-reads-no-refusal` now reads.

## Appendix: the edit windows (part 5, contract 2.2 and 5.5)

Every window in src/App.js that saves, read for what it loads, what it sends, whether a field it does not load can go out empty, whether Save works before the record has loaded, whether a second press sends twice, and what happens when two people save the same record. The worst are findings above; this is the full list.

### Counts

- `<Mdl` sites in src/App.js, as audit/discover.js modalSites() reads them: 110.
- Sites that save through POST, PUT or PATCH (directly or through a child such as SignatureActions): 95. They are 94
  windows, since Edit Scheduled Inspection is drawn twice (src/App.js:14826 and src/App.js:15192).
- Sites that save nothing (read, print, or delete only): 15. Staff timeline loading and detail (2654, 2655), site
  timeline detail (3939), Tickets export (7209), Help person (8011), Announcement (8460), Assigned task detail (11860,
  opens Reassign), Vendor detail (12057, DELETE only), Service detail (12255, DELETE only), Started Shift (13420), Quote PDF
  (15988), Link QR (20396), Clearance missing (22901), Person training (26264), Training matrix (26393).
- Windows that send only the fields that changed: 7 (Edit Staff Info 2394, Rename block 2850, Weekly pattern 12438,
  My alerts 6890, filed report supervisor section 18059, form fill 19022, Case 24312). Ticket 7168 checks for a change
  first and then sends both of its two loaded fields.
- Edit windows that send the whole form: 28, the profile editor counted (Diff column "no" or "whole"). About 20 of
  them open on a list, card or calendar row and never read the record itself, so a key the row lacks goes out empty.
- Saving windows with no double-press guard (no busy flag, Save never disabled): 47 of the 94, plus the profile
  editor (Double press column "none"). 24 of them create a record, so a double press makes two; 26 counting the Add
  path of the HR Document and Training windows.
- Windows that send a version, an updated_at, an ETag or If-Match: 0. `grep -n -i "if-match\|expectedVersion\|baseVersion\|expected_updated"
  src/App.js` finds nothing. The only conflict handling is the API's own state checks on six routes: client request
  decided (src/App.js:4263), time off decided 409 (src/App.js:12715), supply decision on a signed order 409 (comment
  src/App.js:4872), form submitted 409 (src/App.js:19146), property already returned (src/App.js:28342), signature not
  open 409 (comment src/App.js:28012). Every other window is last write wins, silently.

### Every saving window

Columns: Line is the `<Mdl` line, then the save call line(s). Diff = sends only changed fields. Unloaded risk = a field
sent that the window did not load, or loaded from a list row that may lack it. Before load = Save can go before the
window's own read answers. Double press: ref = a useRef guard; busy = a state flag with the button disabled; none =
neither. Concurrent: none = no version check; API = the API refuses a stale state on that route.

#### Staff (Staff Management)

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| staff | EmploymentWindow (end, leave, return, rehire, record) | 1783; 1763 | POST /api/users/:id/employment/:mode | initialReason; employment answer or GET (1725) | per mode: reason, lastDay, rehireEligible, expectedReturn, hireDate, note, restoreAssignmentIds | action | record mode re-sends lastDay, rehireEligible (inferred) | rehire before GET omits restoreAssignmentIds | ref (1756), disabled (1853) | none |
| staff | staff/temporary-pin | 2456; 2343 | POST /api/users/:id/invite | add answer | nothing | action | none | no | busy (2468); confirm on resend | none |
| staff | staff/reset-pin | 2710; 2331 | POST /api/users/:id/reset-pin | nothing | newPin | action | none | no | none (2715) | none |
| staff | staff/assign-site | 2717; 2328 | POST /api/users/:id/assign-site | nothing | siteId, roleAtSite, shiftName, shiftStart, shiftEnd | create | none | no | none (2723) | none |
| staff | staff/add | 2773; 2129 | POST /api/users | nothing | whole addForm | create | none | no | none (2782) | none |
| staff | staff/edit (list pencil) | 2783; 2394 | PATCH /api/users/:id | list row (2381) | changed keys only | yes | first and last name split from display name (2381); rate input drawn for supervisors (2793) | no | none (2794) | none |
| staff | Profile info editor (inline, no Mdl) | 2533; 2422 | PATCH /api/users/:id | profile answer, 19 fields | all but unchanged language and hire date | no | hourlyRate, employeeId, birthday, address, emergency contact when withheld (DASH-03) | no | none (2585) | none |
| sites | ShiftNamesPanel Rename / Add a block | 2910; 2844, 2850, 2853, 2860 | POST and PATCH /api/sites/:id/shift-blocks, PATCH /translations | list row; Spanish read on open | changed keys; Spanish only after read | yes | none | Spanish skipped until read | ref (2833) | none |
| sites | BlockWindowWindow (Edit the block) | 3068; 3061 | PATCH /api/sites/:id/shift-blocks/:id | list row | anchorTime, endTime, kind, daysOfWeek | no | unknown kind saved as work (2949) | no | busy | none |

#### Sites

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| sites | sites/add-supply | 3828; 3354 | POST /api/sites/:id/supplies | available list | supplyId | create | none | rows drawn after load | none | none |
| sites | sites/edit (Edit Site Details) | 3976; 4002 | PATCH /api/sites/:id | site profile read (3672-3682) | whole editSite | no | billingFrequency "monthly" when absent (3674) | no | none | none |
| sites | sites/add-task | 4009; 3423 | POST /api/sites/:id/tasks | nothing | label, zone, category, priority, assignToUsers and more | create | none | no | none (4022) | none |
| sites | sites/edit-task | 4025; 3432, 3197 | PATCH /api/sites/:id/tasks/:id, PATCH /translations | task list row (3762) | 12 to 14 fields | no | none if the list row is whole | Spanish skipped until read (3192) | none (4046) | none |
| sites | sites/add | 4098; 3415 | POST /api/sites | nothing | name, address, city, state, zip, client, contract, prime | create | none | no | none (4104) | none |
| sites | IssuePpeWindow (PPE issue) | 10749; 10737 | POST /api/ppe-issues | stock list | userId, siteId, item or supplyId, size, quantity, fitOk, note, signature | create | none | stock list async, item required | busy | none |
| sites | EquipmentWindow (add or edit) | 10908; 10897 | POST /api/equipment, PATCH /api/equipment/:id | item (10878) | 8 fields | no | none | no | busy | none |
| sites | EquipmentEventWindow | 11023; 11017 | POST /api/equipment/:id/events | nothing | kind, note, toSiteId | create | none | no | busy | none |

#### Issues and client requests

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| issues | RequestWindow (client request) | 4281; 4269-4273 | POST approve, decline, progress, notes; PATCH /api/issues/:id/request | fresh GET (4236) | assignedTo; reason; note; route and absorbedMinutes | route: both loaded | none | actions drawn after load | busy (4252) | API: alreadyDecided (4263) |
| issues | issues/detail | 4657; 4629, 4609 | PATCH /api/issues/:id; POST /verify | row, GET when findings on (4601) | status; note | single field | none | no | verify ref (4605); status none | API refuses some moves (inferred) |
| issues | issues/assign-task | 4715; 4640 | POST /api/issues/:id/assign-as-task | nothing | userId, note | create | none | no | none (4721) | none |

#### Supplies

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| supplies | SupplyRequestWindow (decide, sign, send) | 4905; 4896, 4796, 4836 | POST /api/supplies/requests/:id/decide, /sign, /send | row with lines | decided lines; signature, vendorId; to | lines only | none | sign waits for vendors | busy | API: alreadySigned 409 |
| supplies | supplies/add | 5111; 5066 | POST /api/supplies | nothing | whole addForm | create | none | no | none | none |
| supplies | supplies/edit | 5112; 5067 | PATCH /api/supplies/:id | list row (5092) | whole editForm incl. currentStock, id, qrCode | no | stale currentStock; lowThreshold 0 (DASH-12) | no | none | none |
| supplies | supplies/handle-request | 5114; 5069 | PATCH /api/supplies/requests/:id | row | status, adminNotes | n/a | none | no | none | none |

#### Chat, workspace, alerts, support

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| chat | NewMessageWindow | 5207; 6452 | POST /api/chat/direct or /api/chat/staff-line | people list | userId | create | none | no | starting flag (6449) | none |
| workspace | ProjectWindow | 5381; 5374, 5375 | PATCH or POST /api/workspace/projects | project (normalized 5274) | name, description, color (+memberIds new) | no | color outside the palette rewritten (inferred) | no | busy | none |
| workspace | MembersWindow | 5426; 5422 | PUT /api/workspace/projects/:id/members | project members | whole memberIds, ownerIds | whole set | none | no | busy | none, set replaced |
| workspace | PostWindow | 5645; 5638, 5639 | PATCH /api/workspace/posts/:id or POST | post | title, body, pinned | no | none | no | busy | none |
| workspace | TodoListWindow | 5764; 5760 | POST .../todo-lists | nothing | name, description | create | none | no | busy | none |
| workspace | TodoWindow | 5798; 5791, 5792 | PATCH /api/workspace/todos/:id or POST | todo | title, notes, assigneeIds, dueOn | no | none | no | busy | none |
| shell | shell/my-alerts | 6905; 6890 | PATCH /api/notifications/settings | settings read before drawn | one changed key per PATCH, queued | yes | none | drawn after read | queue ref (6881) | none |
| help | TicketWindow | 7176; 7168 | PATCH /api/support/tickets/:id | row | status, statusNote | changed check | none | no | busy | none |

#### Reports

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| reports | MonthlySendWindow | 9512; 9502 | POST /api/monthly-reports/:id/send | survey contacts (9483) | to | action | none | Send before contacts load goes to typed ones only | ref | none |
| reports | New monthly report | 9623; 9586 | POST /api/monthly-reports | nothing | siteId, periodStart, periodEnd | create | none | no | busy | none |

#### Assigned tasks, vendors, services

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| assigned | assigned/reassign | 11885; 11824 | POST /api/sites/:id/tasks/:id/reassign | row | userId, note | action | none | no | none (11890) | none |
| assigned | assigned/create | 11892; 11825 | POST /api/sites/:id/tasks | nothing | 12 fields, assignToUsers | create | none | no | none (11905) | none |
| vendors | vendors/add | 12049; 11943 | POST /api/vendors | nothing | whole addForm | create | none | no | none (12053) | none |
| vendors | vendors/edit | 12113; 11947 | PATCH /api/vendors/:id | vendor detail read (11911) | 15 fields | no | none | no | none (12117) | none |
| vendors | vendors/add-eval | 12121; 11956 | POST /api/vendors/:id/evaluate | nothing | rating, notes | create | none | no | none (12132) | none |
| vendors | vendors/link-supply | 12136; 11961 | POST /api/vendors/:id/link-supply | nothing | supplyId, isPreferred, unitCost, leadTimeDays, notes | create | none | no | none (12146) | none |
| services | services/add | 12309; 12170 | POST /api/services | nothing | whole addForm | create | none | no | none (12313) | none |
| services | services/edit | 12317; 12174 | PATCH /api/services/:id | service detail (12303) | whole form, camel and snake copies | no | none | no | none (12321) | none |
| services | services/link-site | 12325; 12183 | POST /api/services/:id/link-site | nothing | siteId, notes | create | none | no | none (12330) | none |

#### Schedule and Shift Pickup

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| schedule | schedule/pattern-window | 12451; 12438, 12445 | PATCH /api/schedule/patterns/:id; POST /end | fresh GET (12400) | changed keys + effectiveFrom | yes | none | blocked until read (12424) | busy | none |
| schedule | schedule/time-off-window | 12725; 12707, 12684 | POST /api/time-off/:id/approve or /deny; POST /shifts | row, then GET (12694) | note, shifts | action | none | Approve before read sends no shifts (DASH-34) | ref (12698) | API: 409 reload (12715) |
| schedule | schedule/create-shift | 13329; 13120, 13118, 13104 | POST /api/schedule, /bulk, /patterns | nothing | person, site, times, place, repeat | create | none | no | none (13374) | API refuses pattern overlap only |
| schedule | schedule/edit-shift | 13378; 13133, 13143 | PATCH /api/schedule/:id; POST /api/pickups/convert/:id | calendar row (13127) | 9 fields incl. status | no | service_category, status (DASH-33) | no | none (13415) | none |
| schedule | schedule/inspection-detail | 13436; 13156, 13163 | PATCH /api/inspections/scheduled/:id | calendar row (13149) | assigned_to, scheduled_date; status cancelled | no | none | no | none (13447) | none |
| schedule | schedule/pickup-detail | 13453; 13477-13499 | POST /api/pickups/:id/approve-drop, /assign, /deny-drop, /release, /approve | row | user_id | action | none | no | none | none; two calls not together (13476) |
| marketplace | marketplace/create | 14076; 13652 | POST /api/pickups | nothing | whole createForm | create | none | no | none (14102) | none |
| marketplace | marketplace/convert | 14107; 13661 | POST /api/pickups/convert/:shiftId | shift list | origin, notes | create | none | no | none, row click (14122) | none |
| marketplace | marketplace/shift-detail | 14139; 14210, 14168-14185 | PATCH /api/pickups/:id; POST actions | list row (14183) | 10 fields | no | any field the row lacks sent "" | no | none | none |

#### Inspections

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| inspections | inspections/edit-scheduled | 14826 and 15192; 14566, 14574 | PATCH /api/inspections/scheduled/:id | row or detail (14559) | template_id, site_id, assigned_to, scheduled_date | no | template change on a walk under way (14659) (inferred) | no | none (14834, 15200) | none |
| inspections | inspections/rename-template | 14850; 14410 | PUT /api/inspections/templates/:id | card (14403) | name, description, kind | no | PUT may reset columns not sent (inferred) | no | none (14855) | none |
| inspections | inspections/new-template | 15182; 14500 | POST /api/inspections/templates | nothing | name, description, kind | create | none | no | none (15188) | none |
| inspections | inspections/schedule | 15203; 14545 | POST /api/inspections/scheduled | nothing | whole scheduleForm | create | none | no | none (15213) | none |

#### Quotes and Settings

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| quotes | QuoteSendWindow | 16062; 16047 | POST /api/quotes/:id/send | quote | to, message, locale | action | none | no | ref | none |
| settings | HolidaysPanel window | 17130; 17074, 17075 | POST /api/holidays, PATCH /api/holidays/:id | row (17066) | date, name, note | no | none | no | ref | none |
| settings | settings/add-category | 17455; 17255 | POST /api/lookups/categories | nothing | whole form | create | none | no | none | none |
| settings | settings/edit-category | 17463; 17258 | PATCH /api/lookups/categories/:id | list (17385) | label, description | no | none | no | none | none |
| settings | settings/add-value | 17471; 17271 | POST /api/lookups/values | nothing | whole form + category_id | create | none | no | none | none |
| settings | settings/edit-value | 17485; 17274, 17231 | PATCH /api/lookups/values/:id, PATCH /translations | list (17407) | label, value, color, show_other_input | no | stored code editable (17488) | Spanish skipped until read | none | none |
| settings | settings/add-site-value | 17500; 17297 | POST /api/lookups/site/:id | nothing | whole form | create | none | no | none | none |
| settings | settings/edit-site-value | 17511; 17300 | PATCH /api/lookups/site/:id/:id | list (17444) | label, value, lookup_type | no | none | no | none | none |

#### Forms, filed reports, customer links

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| forms | forms/incident-report-window | 18474; 18034-18165 | POST signoff, resend, acknowledge, tell-client, void; PATCH /supervisor; POST /api/issues/link-corrective-action | fresh read | typed keys only (18046-18059) | yes | none | drawn after read | ref per action | none |
| forms | forms/fill-window | 19310; 19022, 19043, 19079, 19143 | PATCH /api/forms/drafts/:id; POST signoff, customer-signature, submit | draft | changed answers, closed answers null (18993-19007) | yes | none | opened with draft | ref | API: submit 409 (19146) |
| form-builder | form-builder/version-history | 19357; 19352 | POST /api/form-builder/forms/:code/retire | form | reason | action | none | no | ref | none |
| forms | TurnOffLinkWindow | 20317; 20200 | POST /api/customer-links/:id/disable | link | nothing | action | none | no | ref | none |
| forms | RenameLinkWindow | 20340; 20265 | PATCH /api/customer-links/:id | link | areaLabel | single field | none | no | busy | none |
| forms | LinkSurveyWindow | 20427; 20070 | PUT /api/sites/:id/survey-schedule | read before drawn | contacts, frequency, dayOfMonth | whole | unknown frequency saved as monthly (20049), day past 28 saved as 1 (20050) | drawn after read | ref | none |
| forms | forms/start-picker | 20913; 20819 | POST /api/forms/:code/drafts | catalog | source, siteId | create | none | no | starting flag | none |
| forms | forms/edit-form (Jotform) | 22367; 21517 | PATCH /api/jotform/forms/:id | list row (21773) | 9 settings | no | notes, target_role, expiry_days null; has_original_pdf true (DASH-87) | no | none (22412) | none |
| forms | forms/submission-detail | 22420; 21569, 21544 | PATCH /api/jotform/submissions/:id, /user | fresh GET | status; user_id | single field | none | no | none | none |
| forms | forms/full-refresh | 22536; 21380 | POST /api/jotform/submissions/sync | nothing | full_refresh | action | none | no | window closes first (21377) | none |
| forms | forms/link-user (Link Submission to Record) | 22573; 21583 | POST /api/jotform/submissions/:id/link | nothing | entity_type, entity_id | create | none | no | none (22588) | none |

#### HR Records, discipline, cases, training, property

| Page | Window | Line | Route + method | Loads | Sends | Diff | Unloaded risk | Before load | Double press | Concurrent |
|---|---|---|---|---|---|---|---|---|---|---|
| hr | ClearanceWindow | 22675; 22664, 22665, 22666 | POST /act168; PATCH /clearances/:certId; PUT /clearances/:kind | date only in correct mode | completedOn, disclosure, notes, documentId; issuedDate, reason; issuedDate, documentId, notes | no | renew sends documentId and notes null (inferred) | Save before documents list loads | ref | none |
| hr | WarningWindow | 23262; 23215, 23224, 23239, 23246 | PUT /api/discipline/:id or POST; POST /issue, /deliver, /rescind | list row via draftOf (23159) | 12 draft fields; issue fields only | no | any draft field the row lacks sent null; Issue drops unsaved edits (DASH-04) | no own read | ref | none |
| hr | PastWarningWindow | 23391; 23384 | POST /api/discipline/record-past | item | userId, type, actionDate, summary, jotformSubmissionId | create | none | no | busy | none |
| hr | Add Certification (folder) | 23531; 23518 | POST /api/users/:id/certifications | nothing | whole adding form | create | none | no | none (23540) | none |
| cases | OpenCaseWindow | 23953; 23945 | POST /api/hr-cases | report line | summary, subjectUserIds, onBehalfOf, aboutManagement, assignedTo, formResponseId | create | none | no | ref | none |
| cases | cases/window | 24385; 24312, 24328, 24152 | PATCH /api/hr-cases/:id; POST /updates | case read | changed status, escalated_to, notes; assigned_to | yes | none | no | busy (24427) | none |
| hr | hr/document-window | 25027; 24605, 24617 | PATCH /api/jotform/employee-documents/:id; POST multipart upload | list row (24790) | category, notes, expiry_date; file | no | none | no | none (25043) | none |
| hr | hr/training-window | 25049; 24653, 24654 | PUT /api/hr/training/:id; POST /api/hr/training | whole list row (24835) | whole row as body | no | PUT of a list row (inferred) | no | none (25074) | none |
| hr | hr/onboarding-step-window | 25083; 24674 | POST /api/hr/onboarding/step | nothing | user_id + form | create | none | no | none (25092) | none |
| hr | hr/training-room-window (LogTrainingWindow) | 25381; 25324, 25358 | POST /api/hr/training per person; POST /sessions | re-reads before saving (25313) | one record per person | create | none | no | ref | re-read skips ones already logged |
| hr | TrainingTopicWindow (details, form, who needs it, lesson) | 25798; 25828, 25896, 25897, 25983, 26656, 26667, 26711, 26818-26832 | PATCH and POST /api/training/topics; PUT /requirements; lesson routes | catalog row (25764) | whole topic; whole requirement set | no | person rows sent with serviceLine null (25972) | no | busy | none |
| hr | UploadCertificateWindow | 26550; 26541 | POST multipart /api/hr/training/certificates | nothing | file, userId, topicId, siteId, dates | create | none | no | busy | none |
| hr | AssignTrainingWindow | 27230; 27217 | POST /api/training/assignments | nothing | topicIds, userIds | create | none | no | busy | API answers already |
| hr | SignOffWindow | 27374; 27364 | POST /api/training/attempts/:id/signoff | attempt | signature, demonstrated, note | action | none | no | busy (27402) | none |
| hr | StartSessionWindow | 27537; 27527 | POST /api/training/sessions | topics list | title, day, siteId, locale, topicIds, note | create | none | no | busy | none |
| hr | SignHereWindow | 28074; 28068 | POST /api/signatures/:id/sign-here | request read | signature, locale | action | none | signing before read is allowed | busy | API: not open 409 |
| hr | SignatureRequestWindow (Remind, Cancel) | 28172; 28043 | POST /api/signatures/:id/remind or /cancel | request read | nothing | action | none | no | busy | API: not open 409 |
| hr | IssuePropertyWindow | 28297; 28286 | POST /api/hr/property | nothing | userId, kind, description, size, quantity, siteId, issuedOn, note, signature | create | none | no | busy | none |
| hr | ReturnPropertyWindow | 28348; 28340 | POST /api/hr/property/:id/return | issue | returnedOn, note | action | none | no | busy | API: alreadyReturned (28342) |
| hr | VoidAttemptWindow | 28393; 28389 | POST /api/training/attempts/:id/void | attempt | reason | action | none | no | busy | none |

### Inline editors that save (no window, listed for completeness)

These editors sit on the page with no `<Mdl>` window. The profile editor is in the Staff table above because it is
the worst one.

| Editor | Save line | Route + method | Body | Guard |
|---|---|---|---|---|
| Company settings | 16479 | PATCH /api/settings | 13 fields + OSHA fields, from a fresh read (16449); empty colors and timezone written as defaults (16473-16476) | `if (!form)` (16460); saving flag |
| Roles and permissions | 16872 | PUT /api/users/:id/permissions | whole override set from the read | dirty requires the read (16866) |
| Quote editor | 15800 | PUT /api/quotes/:id or POST | whole quote | blocked until model and estimate load (15790); ref |
| Report editor | 10039, 10040 | PUT /api/report-engine/definitions/:id or POST | whole definition, config rebuilt from the editor's state | saving flag |
| Injury summary | 9807, 9852 | PUT /api/injury-summary/:year | two figures; postedOn | ref |
| Support contact | 7279 | PUT /api/settings/support-contact | whole contact | not checked |
| Who gets told | 8230-8252 | POST and PATCH /api/notification-recipients | per row | not checked |
| Lesson draft editor | 26818 | PATCH /api/training/lesson-drafts/:id | whole draft from its read | busy |
| Inspection template item | 14529 | PUT .../items/:id | label, zone, cims_category, max_score from the row | none |

### Notes for the harness and the contract

- audit/inventory.js names windows by the `<Mdl` line it drives, and those lines predate the file's growth: it claims
  staff/edit at 1789 (audit/inventory.js:147), and the window is at src/App.js:2783 today. audit/run.js:207 only counts
  `app.modals`, so the stale claims do not fail the run (read). The names in this report are the inventory's where one
  exists, and the component name otherwise.
- Stub drift that hides these findings: the profile answer gives every role the rate (audit/stubs.js:2057-2066); there
  is no /api/discipline list, PUT or issue route in the stub (only /api/discipline/steps, audit/stubs.js:6193, 6893); the
  Jotform forms list carries none of the keys Edit Form sends (audit/stubs.js:579-582); calendar shifts carry no
  service_category (audit/stubs.js:303-306).
- Contract 2.2 says the staff list pencil wrote every pay rate as empty until #101. True, and fixed at
  src/App.js:2376-2395. The profile editor on the same page still sends the rate (DASH-03).

## Appendix: the bundle and secrets search (part 9, contract 5.11)

**Every `REACT_APP_` name in src/ and what it holds** (all are baked into the public bundle at build time):

| Name | Read at | Holds | Secret? |
|---|---|---|---|
| REACT_APP_API_URL | src/App.js:7 | The API's base address; falls back to the production Railway address | No; the fallback is DASH-66 |
| REACT_APP_PORTAL_URL | src/clientConfig.js:29 | The staff app's address, for Help's pictures; falls back to the Vercel address | No; the fallback is DASH-15 |
| REACT_APP_CANONICAL_ORIGIN | src/canonicalRedirect.js:7 | The one address to send a page to | No |
| REACT_APP_REDIRECT_FROM_HOST | src/canonicalRedirect.js:8 | The host to move away from | No |
| REACT_APP_THEME_COLOR | .env only (committed, 32 bytes) | A colour; read nowhere in src/ | No |

Every name ever used in the history of every branch: the same five (REACT_APP_API_URL 283 lines, REACT_APP_THEME_COLOR
12, REACT_APP_PORTAL_URL 6, the two redirect names 3 each). The values in Vercel's environments are the chat's to read.

**The built bundle** (`npm run build`, then `build/static/js/`):

| Pattern | main.<hash>.js | main.<hash>.js.map |
|---|---|---|
| eyJhbGciOi (a JWT) | 0 | 0 |
| sk-ant- | 0 | 0 |
| sb_secret_ / sb_publishable_ | 0 / 0 | 0 / 0 |
| BEGIN ... PRIVATE KEY | 0 | 0 |
| service_role | 0 | 0 |
| supabase.co | 0 | 0 |
| AIza (Google key prefix) | 0 | 1, inside the base64 `mappings` field, a false match (the full pattern AIza plus 30 characters: 0) |
| AKIA (AWS key prefix) | 0 | 1, inside `mappings`, a false match (the full pattern: 0) |

The source map is shipped beside the bundle (7 MB, every source file inside); see DASH-62.

**The battery's secret count over every branch of git history** (a full clone with every branch and every pull request
ref: 105 refs, 720 commits):

```
git log -p --all | grep -cE "eyJhbGciOi|sk-ant-|sb_secret_|service_role|BEGIN [A-Z ]*PRIVATE KEY|AIza[0-9A-Za-z_-]{30}"
2
```

| Commit | Date | File | Kind | Line |
|---|---|---|---|---|
| 3ae72f5 | 2026-03-26 | src/App.js | Supabase anon JWT (HS256, role anon, issuer supabase, expires 2036), beside the project's address | added |
| bf6dd5e | 2026-03-31 | src/App.js | the same key | removed |

The value is not repeated anywhere in this file or the pull request. A wider search (API keys, passwords, VAPID keys,
Resend, Twilio, Slack and GitHub tokens, AWS keys, case-insensitive) found nothing else: its only hits were base64 image
data. See DASH-19.

**Nothing in src/ talks to Supabase.** `grep -rniE "supabase|apikey|/storage/v1|/rest/v1" src/ public/` finds three
lines, all the same test that decides whether a value on a timeline record is an image address (src/App.js:2225, 3572,
3956). No Supabase client, key or URL is in src/ or package.json. Every call leaves through `apiRequest`
(src/App.js:20-22), the one `fetch(` in src/.

## Appendix: the proposed vercel.json (part 14)

What the dashboard needs, read from the code:

- **Deep links.** The dashboard routes on the hash (`#staff/<id>`, `#forms/reports/<id>`), so every address the
  dashboard builds loads `/` and needs no rewrite. A path a notice or an email might carry (`/issues/<id>`,
  `/requests/<id>`, `/signatures/<id>`, the stub's new notice uses `/issues/i-2`) reaches Vercel as a path. Vercel's
  Create React App preset is believed to fall back to `index.html` for an unknown path; the file below makes that
  explicit and independent of the preset. The dashboard then opens on the Overview, since it reads only the hash
  (DASH-25: a path link should be turned into its hash by the API, or the shell should read the path once).
- **index.html and the service worker** must never be held by a cache: a deploy that changes the hashed bundle's name is
  read only through a fresh `index.html`, and `sw.js` is read by the browser to decide whether the worker changed. The
  worker caches nothing (public/sw.js:1-13), so an old build cannot be kept by it; only HTTP caching can.
- **Hashed files** under `/static/` can be cached for a year, immutable.
- **Source maps** (`main.<hash>.js.map`, 7 MB, every source file inside) are shipped today. The repository is public,
  so they reveal nothing new, but they are not needed in production: set `GENERATE_SOURCEMAP=false` in the Vercel
  build environment (the audit's own build already does, audit/lib/build.js).
- **Security headers.** None are set today. The Content-Security-Policy is the second line against DASH-01 (print
  windows): it cannot stop a `document.write` into a same-origin window by itself, but with `script-src 'self'` and no
  `'unsafe-inline'` an injected `onerror` handler does not run. The theme script in `public/index.html` is inline; move it
  to `public/theme.js` (or allow its hash, which changes whenever the file changes) before turning the policy from
  Report-Only to enforced. Style attributes are used everywhere, so `style-src` keeps `'unsafe-inline'`.
- **connect-src** names the API's host. `REACT_APP_API_URL` decides it; the fallback is the production Railway address
  (DASH-66). Images are read from the API (QR codes, signatures, uploads), from the storage host the API
  hands out, and from the staff app (`/guide-shots/` pictures for Help), so `img-src` allows https.
- **canonicalRedirect.js** sends a page served from exactly `REACT_APP_REDIRECT_FROM_HOST` to the same path on
  `REACT_APP_CANONICAL_ORIGIN`, before anything renders, when both are set at build time. Preview deployments, localhost
  and every other host are left alone (src/canonicalRedirect.js:1-22). It does not decide which API a build talks to.
- **Can a preview build write to live data?** Yes, unless the Vercel Preview environment sets `REACT_APP_API_URL` to a
  non-production API: the fallback at src/App.js:7 is the production API, and `.env` sets only `REACT_APP_THEME_COLOR`
  (used nowhere in src/). Whether the API's CORS lets a `*.vercel.app` preview origin in decides whether such a build
  works at all; the chat checks both (contract 7).

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "create-react-app",
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [
    { "source": "/((?!static/|icons/|guide-shots/|sw\\.js$|manifest\\.json$).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/index.html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" },
        {
          "key": "Content-Security-Policy-Report-Only",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data:; connect-src 'self' https://<the API host>; frame-src 'self' blob: data:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        }
      ]
    }
  ]
}
```

Notes for whoever applies it: the rewrite leaves files that exist alone (Vercel serves a file before a rewrite);
`includeSubDomains` is left off HSTS on purpose, since other hosts on the company domain are not this repository's to
promise; `Cross-Origin-Opener-Policy` keeps `window.open` print windows working; the policy starts as Report-Only and is
enforced once a week of reports reads clean.

## Appendix: the screen map of App.js (part 16)

Each screen the render switch draws, the component that draws it, its line range in src/App.js at the commit audited, and the section banner above it, as the map for splitting the file later.

| Screen (page id) | Component | Lines | Size | Section banner above it |
|---|---|---|---|---|
| The shell (every page) | AdminDashboard | 495-1315 | 821 | (top) |
| overview | OverviewPage | 1559-1612 | 54 | PERSON PICKER |
| staff | StaffPage | 2010-2797 | 788 | EMPLOYMENT |
| sites | SitesPage | 3117-4106 | 990 | A SITE'S SCHEDULE BY SHIFT |
| operations | OpsPage | 4110-4144 | 35 | A SITE'S SCHEDULE BY SHIFT |
| issues | IssuesPage | 4540-4725 | 186 | INSPECTION FINDINGS |
| supplies | SuppliesAdminPage | 4978-5116 | 139 | SUPPLY REQUESTS WITH MANY ITEMS |
| workspace | WorkspacePage | 5460-5468 | 9 | WORKSPACE |
| chat-records | ChatRecordsPage | 6248-6344 | 97 | CHAT RECORDS |
| chat | ChatPage | 6351-6616 | 266 | CHAT RECORDS |
| announcements | AnnouncementsPage | 6622-6739 | 118 | CHAT RECORDS |
| tickets | TicketsPage | 7225-7265 | 41 | APP SUPPORT |
| help | HelpPage | 7349-7715 | 367 | APP SUPPORT |
| library | LibraryPage | 7791-7795 | 5 | THE LIBRARY |
| help-insights | HelpInsightsPage | 8044-8149 | 106 | HELP INSIGHTS: what people ask Help, overall and per person |
| equipment | EquipmentPage | 10804-10808 | 5 | EQUIPMENT |
| periodic | PeriodicWorkPanel | 11062-11096 | 35 | PERIODIC WORK |
| reports | ReportsPage | 11403-11676 | 274 | THE MANAGEMENT REVIEW EVIDENCE PACK |
| owner | OwnerDashboardPage | 11766-11810 | 45 | THE OWNER'S DASHBOARD |
| assigned | AssignedTasksAdminPage | 11812-11908 | 97 | THE OWNER'S DASHBOARD |
| vendors | VendorsPage | 11912-12150 | 239 | THE OWNER'S DASHBOARD |
| services | ServicesPage | 12151-12334 | 184 | THE OWNER'S DASHBOARD |
| schedule | SchedulePage | 12846-13505 | 660 | TIME OFF: what staff asked for, and the decision the approver makes |
| marketplace | ShiftMarketplacePage | 13507-14218 | 712 | TIME OFF: what staff asked for, and the decision the approver makes |
| inspections | InspectionsPage | 14350-15217 | 868 | TIME OFF: what staff asked for, and the decision the approver makes |
| quotes | QuotesPage | 15364-15421 | 58 | QUOTES |
| settings | SettingsPage | 17154-17523 | 370 | HOLIDAYS |
| form-builder | FormBuilderPage | 19397-19463 | 67 | THE FORM BUILDER |
| forms | FormsPage | 20958-22595 | 1638 | A CLIENT'S CONCERN AND ITS DEADLINE |
| clearances | ClearancesPage | 22805-22867 | 63 | SCHOOL CLEARANCES |
| discipline | DisciplinePage | 23860-23919 | 60 | WARNINGS |
| cases | CasesPage | 24227-24434 | 208 | THE CASE LOG |
| hr, training | HRRecordsPage | 24436-25098 | 663 | THE CASE LOG |

Largest windows and views (over 150 lines):

| Component | Lines | Size |
|---|---|---|
| IncidentReportWindow | 17941-18658 | 718 |
| FormFillWindow | 18935-19311 | 377 |
| EmployeeFolderView | 23544-23851 | 308 |
| LessonDraftEditor | 26756-27046 | 291 |
| QuoteEditor | 15678-15961 | 284 |
| FormBuilderWorkspace | 19580-19863 | 284 |
| IncidentReportsTab | 20699-20944 | 246 |
| LogTrainingWindow | 25235-25462 | 228 |
| WarningWindow | 23156-23370 | 215 |
| InjurySummaryView | 9760-9958 | 199 |
| EmployeesGridView | 22919-23117 | 199 |
| IssueTimingReport | 8766-8961 | 196 |
| CompanySettingsPanel | 16440-16634 | 195 |
| ReportEditor | 9961-10139 | 179 |
| RequestWindow | 4220-4395 | 176 |
| PermissionsEditorPanel | 16803-16965 | 163 |
| SiteWorkloadPlan | 16268-16427 | 160 |
| ProjectPage | 6071-6225 | 155 |

Section banners in order:

221 THEME SYSTEM; 389 THEMED SHARED COMPONENTS; 416 BRANDED CHART TOOLKIT; 436 DATE RANGE PICKER; 1434 PERSON PICKER; 1614 EMPLOYMENT; 2800 SHIFT NAMES; 2936 A SITE'S SCHEDULE BY SHIFT; 4146 CLIENT REQUESTS; 4485 INSPECTION FINDINGS; 4727 SUPPLY REQUESTS WITH MANY ITEMS; 5234 WORKSPACE; 6227 CHAT RECORDS; 6741 ALERTS ON THIS COMPUTER; 6919 HELP: the assistant the staff portal's Help tab talks to. Same four requests, same screen.; 7069 APP SUPPORT; 7716 THE LIBRARY; 7969 HELP INSIGHTS: what people ask Help, overall and per person; 8150 WHO GETS TOLD: the people and addresses told about each kind of report; 8337 NOTIFICATIONS: the bell's panel; 8554 REPORTING ENGINE: shared helpers, reusable widgets, builder; 9279 CLIENT RATINGS; 9449 MONTHLY CLIENT REPORTS; 9646 THE INJURY LOG AND ITS ANNUAL SUMMARY; 10141 KEPT RECORDS; 10660 PPE ISSUES; 10787 EQUIPMENT; 11043 PERIODIC WORK; 11114 THE MANAGEMENT REVIEW EVIDENCE PACK; 11678 THE OWNER'S DASHBOARD; 12336 SCHEDULE PAGE; 12337 WEEKLY PATTERNS: a standing pattern the API keeps and refills ahead; 12555 TIME OFF: what staff asked for, and the decision the approver makes; 15219 QUOTES; 16248 SITE WORKLOAD PLANS; 17027 HOLIDAYS; 17525 JOTFORM PICKER FIELD; 17663 FORMS PAGE; 17664 INCIDENT REPORTS: the reports staff file through the Help chat; 17681 PHOTOS ON A FORM; 17822 SIGNING WITH THE MOUSE; 18660 STARTING AND FILING A FORM FROM THE DASHBOARD; 18751 THE CONTROLS A QUESTION IS ANSWERED WITH; 19313 THE FORM BUILDER; 19865 CUSTOMER LINKS AND THEIR QR CODES; 20023 THE CLIENT SURVEY SCHEDULE; 20122 CUSTOMER LINKS, A TAB OF THEIR OWN AND A CARD ON EACH SITE; 20653 A CLIENT'S CONCERN AND ITS DEADLINE; 22597 HR RECORDS PAGE; 22604 SCHOOL CLEARANCES; 23119 WARNINGS; 23980 THE CASE LOG; 25534 TRAINING BY ROLE; 25623 CATEGORIES AND ORDER; 25649 FIRST DUE AFTER; 26283 THE TRAINING MATRIX, FOR THE ASSESSOR; 26415 TRAINING TIME, FOR PAY; 26493 CERTIFICATES FROM OUTSIDE COURSES; 26580 LESSONS; 26618 PICTURES IN A LESSON; 27081 DRAFTS PUBLISHED IN ONE PASS; 27172 ASSIGN TRAINING; 27291 SIGN-OFF AND THE TRAINING RECORD; 27451 SESSIONS SIGNED ON PHONES; 27726 DOCUMENTS TO SIGN; 27986 SIGNING ON THEIR PHONE; 28192 COMPANY PROPERTY

## Appendix: the search battery (contract 6)

Run from the repository root on the branch as committed, excluding `node_modules`, `build` and `audit/` unless the line
says otherwise. Every hit was read; the ones that matter are named.

| # | Line (short) | Count | Read |
|---|---|---|---|
| 1 | empty or swallowing catch | **53** (src/App.js 46, public/sw.js 4, src/index.js 1, src/InstallPrompt.js 1, src/installPromptLogic.js 1) | 35 harmless (31 in src: storage, preference, stream cancel, object URL revoke, print window close, scroll, the install sheet's clipboard, the worker registration; and public/sw.js's 4: a message to a window, the notify chain, a focus); 17 hide a failed load: 743, 6097-6099, 11233, 11424, 13644, 21338, 23189, 23425, 23873, 25266, 26095, 26242, 26256, 26263, 27105; 1 hides a failed save: 6820 (moving this computer's alerts to the next person, DASH-41). 103 more catches only write to the console (DASH-84, DASH-10) |
| 2 | `new Date('YYYY-MM-DD')`, `toISOString().slice(0, 10)`, `getHours()`, `getDate()`, `getDay()` | **24** | No literal `new Date('YYYY-MM-DD')` and no `toISOString().slice(0, 10)` in src/. Every hit is browser-clock day math: getMonday 437, toISO 445, the presets 448-455, the supply ordering range 5056, reviewMonthEnd 11126, todayISO 12384, the Started lane cap 12949, the Schedule week and month 12994-12995, 13077, 13169, 13228, 13256, 13278, workingDaysUntil 20675, localInputOf 24024, lastFullWeek 26425-26426. Each is calendar-step safe across Nov 1; each reads the browser's day (DASH-42, DASH-43) |
| 3 | `.or(` / `.filter(` / `.textSearch(` / `query(` with a template string | **0** | Nothing in this repository builds a database filter |
| 4 | `await` inside a for loop, `.map(async`, `.forEach(async` | **1** (13 with audit/ included) | src/App.js:7052, Help's photo encoder trying three qualities in turn: fine. The loops that matter are written with Promise.all and sequential awaits the line does not catch: 11233, 10586, 5019-5035, 26254-26257, 25321-25330, 27960-27962 (DASH-64, DASH-57, DASH-79) |
| 5 | hard-coded https host (.com, .app, .net, .io) | **3** | src/clientConfig.js:29 the Vercel staff app address (DASH-15); src/App.js:7 and scripts/guide-sync.js:12 the production API host (DASH-95) |
| 6 | `.select('*')` | **0** | No database access in this repository |
| 7 | `console.log/error` with pin, code, token, password, rate or ssn | **1** | scripts/guide-sync.js:36 prints the commit the guide was sent at: fine. No PIN, code, token or rate is logged anywhere in src/ |
| 8 | `git log -p --all` secret patterns | **2** | One anon JWT, added in 3ae72f5 and removed in bf6dd5e (DASH-19); counted over a full clone with every branch and pull request ref |
| 9 | `npm audit --omit=dev` | **99** (3 low, 33 moderate, 63 high, 0 critical) | All through react-scripts; none in the shipped bundle (DASH-67) |
| 10 | `npx --yes depcheck` | **0 unused, 1 missing** | @babel/parser, required by audit/count.js (DASH-90) |
| 11 | `npx --yes jscpd --min-lines 12 ... src lib routes jobs` | **0 clones as written; 7 clones (124 lines) with `--max-size 10mb`** | The line skips src/App.js (2.5 MB) by jscpd's 100 KB default; this repository has no lib, routes or jobs (DASH-94) |

## Appendix: the dependency report (part 16, contract 5.12)

**Packages.** Five runtime entries and one dev entry:

| Package | Where | Version | Used by |
|---|---|---|---|
| react, react-dom | dependencies | ^18.3.1 | the app |
| apexcharts, react-apexcharts | dependencies | ^4.0.0, ^1.7.0 | the chart wrappers |
| react-scripts | dependencies | 5.0.1 | the build only (Create React App, no longer maintained upstream) |
| playwright-core | devDependencies | 1.56.0 (pinned) | the audit and smoke harness |
| typescript | overrides | 4.9.5 | lets react-scripts 5 install from the lockfile |

The lockfile is committed (since 4b9e5aa, 2026-10-05, "A lock file that installs") and `npm ci` installs from it (1,299
packages in 16 s here). Vercel's install command is the chat's to read; the proposed vercel.json says `npm ci`.

**Added in the last 60 days** (since Aug 16, 2026, from `git log -- package.json` on main):

| Commit | Date | Change | Why |
|---|---|---|---|
| 5bfbcb4 | 2026-09-19 | devDependency playwright-core 1.56.0; script `audit` | The audit harness drives the build in a headless browser; it downloads no browser on install |
| 841c65c | 2026-09-29 | script `guide-check` | The guide check on every pull request |
| 2f206f3 | 2026-10-02 | script `smoke` | The three-minute smoke check |
| 4b9e5aa | 2026-10-05 | override typescript 4.9.5 | react-scripts 5 asks for TypeScript 3 or 4 as a peer; the override makes `npm ci` succeed |
| 875d039 | 2026-10-06 | script `shots` | Pictures of the screen beside the guide |

No runtime package was added in the window. Every package exists under its own name on the registry and does what its
name says (no look-alike names).

**npm audit --omit=dev**: 99 advisories (3 low, 33 moderate, 63 high, 0 critical), exit 1. Every one is reached through
react-scripts, which is listed under dependencies, so `--omit=dev` keeps it. Direct: react-scripts (high). None reaches
the shipped bundle: react, react-dom, apexcharts and react-apexcharts and their own dependencies carry no advisory. The
high ones by package: braces, node-forge, nth-check, postcss, serialize-javascript, svgo, underscore,
webpack-dev-middleware, webpack-dev-server (dev server and build-time only). See DASH-67.

**npx depcheck**: no unused dependency. One missing: `@babel/parser`, required by audit/count.js and resolved through
react-scripts (see DASH-90).

**npx jscpd** (contract 6's line, run on src/): the line as written analyses 6 files and 5,371 lines and finds 0 clones,
because jscpd skips any file over 100 KB by default and src/App.js is 2.5 MB. With `--max-size 10mb --max-lines 100000`
it reads all 7 files, 33,777 lines, and finds 7 clones of 12 lines or more, 124 lines (0.37%):

| Lines | First | Second | What |
|---|---|---|---|
| 17 | src/App.js:2185-2201 | src/App.js:3496-3511 | Timeline paging and print header, Staff and Sites |
| 13 | 2203-2215 | 3550-3562 | Record Detail print styles |
| 24 | 2215-2238 | 3562-3585 | Record Detail field loop, the unescaped one (DASH-01) |
| 14 | 2238-2251 | 3585-3597 | Record Detail photos and related items |
| 22 | 23612-23633 | 24566-24591 | An employee document's file read through a raw request (DASH-51) |
| 18 | 27441-27458 | 27976-27992 | A signature page print |
| 16 | 27443-27458 | 27718-27733 | The same print body |

Helpers written more than once that jscpd's 12-line floor does not see (DASH-94), with the copy that should win:

| Helper | Copies | The one to keep |
|---|---|---|
| A day from a Date on the browser's clock | toISO 445, todayISO 12384 | Neither: one companyToday and companyDayOf on clientConfig.company.timeZone (DASH-42) |
| A day string to local midnight | localDate 322, timeOffLocal 12559 | localDate |
| Date display | fd 318 (instant), fdDay and fdLong 323-324 (day), irDay 17676, stampDay 26593, local fmtDate at 10439, 14366, 17593, 21076, 22949, 24566 | fdDay and fdLong for days; one instant formatter with the company zone |
| HTML escaping for prints | esc at 8847, 9056, 9224, 9350, 16737; keptEsc; escHtml 19992 | escHtml, extended to quotes, used by every print builder |
| Image address test on a record | 2225, 3572, 3956 | One helper beside the Record Detail field map |
| API calls | apiFetch, apiDownload, apiMultipart, apiUpload, apiStream share apiRequest; six raw apiRequest calls bypass them | apiFetch and apiDownload |
| Permission checks | hasCap, capNamed, canOpenPage, canChange and isAdmin tests across pages | canOpenPage and hasCap; isAdmin only where the API has no capability |
| Money | "$" + parseFloat(x).toFixed(2) at 2298 and 2543, money at 9033, the print copy at 9057, the owner unit at 11710, quoteMoney at 15242 and its unit at 15251, the site value at 3666 | quoteMoney (15242), on localeTag() |
| Words | tr and trn only (src/words.js); no second word helper | tr and trn |

## Appendix: the proposed .github/workflows/ci.yml (part 19)

Runs on every pull request and every push to main: install from the lockfile, build, smoke, guide-check, the
dependency audit, the secret count over every branch, and a search of the built bundle for keys. Nothing in it needs a
secret. Three things decide whether it is green on day one:

- `npm audit --omit=dev --audit-level=high` fails on every run while `react-scripts` sits under `dependencies` (63 high
  advisories, all build tooling; DASH-67). Move `react-scripts` to `devDependencies` first, which changes nothing
  for Vercel (it installs dev dependencies to build). Until then the step below is marked `continue-on-error`.
- The smoke check's limit is 180 seconds on this container's 4 cores; a GitHub runner has 4 as well on public
  repositories, but slower disks. `SMOKE_LANES` stays at its default; the job's timeout is generous.
- The secret count's baseline is 2: the March key's add and removal (DASH-19). The step fails if the count rises.

```yaml
# Build, smoke, guide-check, dependency audit and secret checks on every pull request (AUDIT_CONTRACT.md 5.11, 5.12).
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm

      - name: Install from the lockfile
        run: npm ci --no-audit --no-fund

      - name: Build
        run: npm run build
        env:
          GENERATE_SOURCEMAP: "false"

      - name: The bundle holds no key
        run: |
          if grep -lE "eyJhbGciOi|sk-ant-|sb_secret_|service_role|BEGIN [A-Z ]*PRIVATE KEY|AIza[0-9A-Za-z_-]{30}" build/static/js/*.js; then
            echo "::error title=Bundle::a key-shaped string is in the built bundle"; exit 1
          fi

      - name: No new secret in the history of any branch
        run: |
          git fetch --no-tags origin '+refs/heads/*:refs/remotes/origin/*'
          n=$(git log -p --all | grep -cE "eyJhbGciOi|sk-ant-|sb_secret_|service_role|BEGIN [A-Z ]*PRIVATE KEY|AIza[0-9A-Za-z_-]{30}" || true)
          echo "Secret-shaped lines in history: $n (baseline 2, the March key added and removed)"
          test "$n" -le 2

      - name: Chromium for the smoke check
        run: npx playwright@1.56.0 install --with-deps chromium

      - name: Smoke
        run: npm run smoke

      - name: Guide check
        run: npm run guide-check
        env:
          GUIDE_CHECK_BASE: ${{ github.event_name == 'pull_request' && 'HEAD^1' || 'HEAD~1' }}

      - name: Runtime dependencies have no high or critical advisory
        run: npm audit --omit=dev --audit-level=high
        continue-on-error: true   # until react-scripts moves to devDependencies; then remove this line
```

The existing `guide-check.yml` can then be folded into this job. The full `npm run audit` stays out of CI while the
owner's pause stands (CLAUDE.md); a nightly workflow could run it on `main` once the pause is lifted.

## Appendix: notices and staff app addresses (part 6)

Where each subject type opens from the bell, the toast and a tapped alert, read from the code and, for every type in contract 3, driven by cases/october.js as the admin and as the contract 1 supervisor (the run's notes print each landing).

#### 6.1 How each surface decides where a notice opens

**(a) The bell.** `NotificationPanel` (src/App.js:8482) lists GET /api/notifications 30 at a time. A press on a row (`openRow`,
src/App.js:8513-8520) marks it read (POST /api/notifications/:id/read), closes the panel and calls `goToNotice`
(src/App.js:8423-8435). `goToNotice` asks `noticePlace` (src/App.js:8386-8420) first, by subjectType and subjectId. When
`noticePlace` knows the type it checks `canOpenPage` (src/App.js:659-693) and sets the hash, or opens the read-only
`AnnouncementWindow` for an announcement the reader cannot open as a page (src/App.js:8427), or toasts the refusal "That one is for
admins. Ask an admin to take a look." (src/App.js:1217, 1233). When `noticePlace` answers null, the notice's `link` decides
(`notifTarget`, src/App.js:8350-8376): a link on another origin opens a new tab (src/App.js:8353, 8434); a same-origin path
/requests/<id>, /issues/<id>, /training/(attempts|people)/<id> or /signatures/<id> opens that item; a same-origin hash whose first
part is a page id opens that page and hash; any other same-origin link opens a new tab; no link does nothing.

**(b) The toast.** `loadUnread` (src/App.js:762-774) reads the unread count every 60 s while the tab is visible, on focus, on
visibilitychange and when the worker posts `ocsa-notice`. When the count rises above the last count, it reads the newest notice
(GET /api/notifications?limit=1) and, if unread and new, draws `NoticeToast` (src/App.js:8438-8449) for 12 s. Open
(src/App.js:1305-1311) marks it read and calls the same `goToNotice`. **The bell and the toast always agree**, type for type.

**(c) The service worker.** The push payload is { title, body, tag, subjectType, subjectId, locale } (public/sw.js:22-40). It has
no `link` and no notice id (public/sw.js:31). On a click (public/sw.js:67-86) the worker computes `placeOf` (public/sw.js:44-63):
- with a dashboard window open, it posts { type: "ocsa-open", subjectType, subjectId, place } and focuses it. The shell
  (src/App.js:811-830) runs `goToNotice` when `noticePlace` knows the type, and else sets the hash to the worker's place (empty for
  an unknown type, so nothing happens);
- with no window open, it opens "/#<place>" (or "/" for an unknown type). The page and route are read from the hash at mount
  (src/App.js:498) and the render switch (src/App.js:1263-1295) decides, so this path never runs `goToNotice`.

#### 6.2 Subject type table

"Item" means the record's own window or detail opens. "Page" means only the page or list. Line numbers are src/App.js unless they
say sw.js.

| Subject type | Bell and toast open | Worker click opens | Item or page | Supervisor | Notes |
|---|---|---|---|---|---|
| chat | #chat/<id>, always, no gate (8393) | chat/<id> (sw.js:48) | Item: ChatPage opens the channel (6423) | Yes | Agree |
| client_request | #issues/requests/<id> (8403) | issues/requests/<id> (sw.js:52) | Item: Client requests tab opens it (4404, 4412-4413) | Opens the list only if GET /api/issues/requests does not answer them, since the tab draws only when live (4554, 4643) (inferred) | Agree |
| customer_concern | #forms/reports/<id> (8401) | forms/reports/<id> (sw.js:47) | Item: Forms opens the report (20970-20979) | Forms opens for a supervisor only when the probe at 735-742 answers 200; reading a Customer Complaint Log may be refused, since read_incident_reports covers FRM-016 and FRM-017 (inferred) | Agree |
| document_to_sign | No place. Link decides: a staff app link opens a new tab on the staff app; no link does nothing (8432-8434) | Nothing with a window open (828); "/" (Overview) with none (sw.js:62, 84) | Neither | Same | **Opens nothing on the dashboard** |
| issue, issue_assigned, issue_escalated | #issues/<id> (8414) | issues/<id> (sw.js:57) | Item (4564, 4577, 4586-4592) | Yes | Agree. The staff app link the API puts on issue_assigned is ignored, which is right |
| periodic_overdue | #sites/<siteId>/tasks (8399) | sites/<id>/tasks (sw.js:51) | Item: the site on its Tasks tab (3281-3283) | Yes | Agree |
| shift_assigned | Schedule, this week (8418) | schedule (sw.js:61) | Page only | Yes | Agree; nothing opens the shift |
| support_ticket, support_ticket_new | No place. Link decides | Nothing or Overview | Neither; Tickets takes no route, so even a #tickets link opens the list (1285, 7225) | Not sent to supervisors (admins and the support contact, 648-650) | **Live types with no place** |
| time_off | #schedule/timeoff/<id> (8416) | schedule/timeoff/<id> (sw.js:59) | Item: TimeOffWindow opens (13305, 12789-12790) | A supervisor without approve_time_off sees the API's refusal in the list and the window (12794-12795, 12656-12657) (inferred) | Agree |
| hr_case_assigned, hr_case_escalated, hr_case_filed, hr_case_due_soon, hr_case_overdue | #cases/<id> (8417) | cases/<id> (sw.js:60) | Item: CasesPage opens the case (24270-24272); a recused case reads "This case is not available." | Yes once the API names manage_cases true (618). Refused right after a sign-in from an alert (DASH-27) | Agree |
| task_assigned | No place. Link decides | Nothing or Overview | Neither; the Assigned page takes no route (1274) | Same | **Opens nothing on the dashboard** |
| training_assigned, training_session | No place. Link decides | Nothing or Overview | Neither | Same | **Opens nothing on the dashboard** |
| site_assigned | No place. Link decides | Nothing or Overview | Neither, though #sites/<siteId> opens a site (3281-3283) | Same | **Opens nothing on the dashboard** |
| workspace_member | No place. Link decides | Nothing or Overview | Neither, though #workspace/<projectId> opens a project (5463-5466) | Workspace draws only when GET /api/workspace/projects answers (727) | **Opens nothing on the dashboard** |
| inspection_unfinished | #inspections/<id> (8415) | inspections/<id> (sw.js:58) | Item if the id is a scheduled inspection's: GET /api/inspections/scheduled/<id> (14550-14556) | Yes | If the API's subjectId names a walk or draft, the read fails with a toast (inferred, the open question on supervisor access to notice items) |
| inspection_finding | #issues/<id> (8405) | issues/<id> (sw.js:53) | Item | Yes | Agree |
| shift_drop, shift_claim | Schedule, this week (8418) | schedule (sw.js:61) | Page only. Approve and deny live in Schedule's pickup window (13454-13500), opened from the week of the shift, and on Marketplace's Requests and Claimed tabs (13605-13614, 13699) | Yes | The site timeline sends these same events to Marketplace (3483) |
| chat_mention | #chat/<id> (8393) | chat/<id> (sw.js:48) | Item | Yes | Agree |
| announcement | Holder: #announcements/<id>, item (6646). Non-holder: AnnouncementWindow, item (8394, 8427) | Window open: same as the bell (829). No window: #announcements/<id>, and a non-holder gets "This page is for admins." (1289, 414) | Item, except the worker's new window for a non-holder | Supervisors do not hold send_announcements | **Disagreement** (DASH-74) |
| equipment_tagged_out, equipment_service_due | #equipment/<id> (8398) | equipment/<id> (sw.js:50) | Item (10805) | Only if GET /api/equipment answers them (728) | Agree |
| training_signoff, training_reteach | #training/attempts/<id> (8408) | training/attempts/<id> (sw.js:54) | Item (24479-24482) | Yes; Training is open to all (1272) | Agree |
| training_expiring | #training/people/<userId> read from the link, else #training/gaps (8409) | training/gaps always (sw.js:55) | Person (bell) against list (worker) | Yes | **Disagreement** (DASH-78) |
| signature_disputed, signature_declined, signature_overdue | #hr/signatures/<id> (8412) | hr/signatures/<id> (sw.js:56) | Item for an HR Records holder (24802) | **Refused**: HR Records closes when the API answers read_hr_records false (619, 1269-1271) | Contract 1 says supervisors keep Waiting for signatures (DASH-06) |
| form | #forms/reports/<id> (8391) | forms/reports/<id> (sw.js:47) | Item | As customer_concern | Agree |
| supply_request, registration, pickup (recipient types at 8160-8171, stub samples at audit/stubs.js:330-331) | No place. Link decides (the stub sends #supplies, #marketplace) | Nothing or Overview | Page via link | Page dependent | No place |
| **Unknown type** | Link decides, as in 6.1(a). No link: the panel or toast closes, the notice is marked read, nothing opens and nothing is said | Window open: focused, nothing happens (828). No window: "/" (Overview) | Neither | | |

#### 6.3 Disagreements between the worker's placeOf and the dashboard's noticePlace

1. **training_expiring**: the bell opens the person the link names; the worker always opens Gaps (src/App.js:8409 against
   public/sw.js:55). The payload carries no link, so the worker cannot do better without a subjectId that names the person.
2. **announcement**: identical places, different handling. With no window open, the worker's address goes through the render
   switch, which shows "This page is for admins." to a non-holder (src/App.js:1289, 414); the bell opens AnnouncementWindow.
3. **Every type with no place** (document_to_sign, support_ticket, support_ticket_new, task_assigned, training_assigned,
   training_session, site_assigned, workspace_member, supply_request, registration, pickup, unknown): the bell and toast follow
   the link; the worker has no link and opens nothing or the Overview.
4. **Gates**: the worker's new-window path uses the render switch (a full-page "This page is for admins."), the other paths use
   `goToNotice` (a toast, and the reader stays where they were).
5. **Read state**: the bell and toast mark the notice read; a tapped alert never does (no notice id in the payload,
   public/sw.js:31; no read call at src/App.js:823-830).
6. **Encoding**: `noticePlace` puts the raw subjectId into the hash for form, chat, chat_mention, customer_concern,
   client_request, periodic_overdue and equipment (src/App.js:8391-8403); `placeOf` encodes every id (public/sw.js:46). The same
   for UUIDs; different for an id with a slash or a space.

Otherwise placeOf repeats noticePlace line for line, in the same order. The smoke checks six types against the worker
(audit/smoke.js:2655): issue_assigned, time_off, hr_case_assigned, inspection_unfinished, shift_assigned, form. Nothing checks that
the two lists stay equal.

#### 6.4 Does a tap ever ask for sign-in, and does the place survive it?

- **The place survives sign-in.** With no window open, the worker opens "/#<place>"; `page` and `route` are read from the hash at
  mount (src/App.js:498); the hash effect does nothing while signed out (src/App.js:877-882, `if (!token) return`); after
  sign-in, the second step or Choose your PIN, the hash still names the place (src/App.js:880). With a signed-out window open, the
  `ocsa-open` message is held in `openAsk` until a token exists (src/App.js:810-830).
- **A tap asks for sign-in in these cases** (contract 2.6 says it never does):
  1. The session was kept in sessionStorage: the code screen's "Remember this device for 30 days" left unticked
     (src/App.js:1425; writeAuth 150-154; readAuth 149). sessionStorage belongs to one tab, so the window the worker opens has no
     session and draws the sign-in card.
  2. The session ended: expired, or ended by the API (`ocsa-session-expired`, src/App.js:860). `signOut` (src/App.js:859) does not
     delete this computer's push subscription; only the Sign Out control does (`signOutHere`, src/App.js:865-868). Alerts keep
     arriving, each tap draws the sign-in card, and the lock screen shows each notice's title and body for a person who is signed
     out (see DASH-46).
  3. A notice with no dashboard place whose link is the staff app opens a new tab on the staff app (src/App.js:8434), a different
     origin with its own session; an office person not signed in there meets the staff app's sign-in (inferred).
- **After sign-in from an alert in an open window, the item can be refused** (DASH-27): the held open runs the moment the token is
  set (src/App.js:823-830), before GET /api/users/me/permissions (src/App.js:711-721) and the page probes (src/App.js:722-742)
  answer. `canOpenPage` then answers false for Cases for a supervisor (casesOn waits for capNamed, src/App.js:618), Forms for a
  supervisor (src/App.js:662, 735-742) and Equipment for everyone (src/App.js:681, 728). The refusal toast is shown and the open is
  dropped (`setOpenAsk(null)`, src/App.js:826). (inferred; no reproduction)

#### 6.5 The dashboard's push subscription

- **Where it asks**: only in user menu > My alerts > "Alerts on this computer" (`ComputerAlerts`, src/App.js:6832-6871, drawn at
  6911). My alerts itself draws only once GET /api/notifications/settings answers (src/App.js:782-787; the menu entries at 1211 and 1246).
- **Asked only from a tap**: yes. `Notification.requestPermission()` is called once in `turnOnComputerAlerts`
  (src/App.js:6794), reached only from the "Turn on alerts on this computer" press (src/App.js:6843-6846, 6867), and called before
  any await, inside the press. `computerAlertsState` and `repostComputerAlerts` never ask (src/App.js:6781-6788, 6814-6821).
  InstallPrompt does not ask. Nothing asks on load.
- **VAPID key source**: GET /api/push/key { publicKey } (src/App.js:6776-6778), decoded by `vapidKeyBytes` (6767-6773). No key is
  built in, and with no key the box is not drawn (6842).
- **What is sent**: POST /api/push/subscriptions { endpoint, keys (p256dh, auth), userAgent, app: "dashboard" } (src/App.js:6779,
  6804). After every sign-in the subscription this browser holds is posted again under the new person (src/App.js:832,
  6814-6821). Turn off and the Sign Out control send DELETE /api/push/subscriptions { endpoint } after unsubscribing
  (src/App.js:6823-6829); sign-out waits at most 4 s (src/App.js:830, 866). A POST that fails unsubscribes again (6805-6808).
- **Worker registration**: production builds only, on load (src/index.js:54-57); the worker caches nothing (public/sw.js:1-13).
- Gaps: an existing subscription is reused when the API's key changes (src/App.js:6801-6802, DASH-91); a push with no title shows
  nothing (public/sw.js:25), which browsers may count against a site that promised userVisibleOnly (inferred, DASH-91).

#### 6.6 Every staff app address and every hard-coded host in src/

`grep -nE "https?://" src/*.js` gives 6 lines; `grep -rn "vercel.app"` over the repository (excluding node_modules and build) gives 1.

| Where | What | What a person gets |
|---|---|---|
| src/clientConfig.js:29 | `portal.url: process.env.REACT_APP_PORTAL_URL \|\| 'https://ocsa-staff-portal.vercel.app'` | The only staff app origin in src/. **A Vercel address** (contract 2.6) |
| src/App.js:7021, 7014, 7016 | `AGENT_PORTAL` from it; `agentPictureSrc` builds `<portal>/guide-shots/<name>.<lang>.jpg` | Help answers that carry a staff app picture load the image from the Vercel address, which redirects to staff.ocsaco.com (contract 0), so the picture shows today through the redirect (inferred) |
| src/App.js:7059-7060, 7663-7664 | `HelpPicture` and the answer's picture row | Same pictures, and the full-screen view opens the same address |
| build/static/js (local build) | One file contains the Vercel address | The local build had no REACT_APP_PORTAL_URL. Whether Vercel's production environment sets it is unknown here (chat checks) |
| src/App.js:7 | `API = process.env.REACT_APP_API_URL \|\| "https://ocsa-api-production.up.railway.app"` | Every call. A build without the variable, a preview included, talks to the live API (inferred, part 14) |
| src/App.js:409 | Logo address from `window.location.origin` | Own origin, no host |
| src/App.js:2682 | `startsWith("http://") / ("https://")` test on a timeline value | Not a host |
| src/App.js:11996, 25937 | Input placeholders "https://..." and "https://" | Not a host |
| src/App.js:26881 | SVG namespace in a placeholder | Not a link |
| src/clientConfig.js:37 | The forms mailbox, an email address on the company domain (value not repeated here) | Shown in the Jotform pull confirm; CLAUDE.md says nothing in this public repository names an email address |

Everything else that reaches a staff or customer address is built by the API and drawn as sent: customer links and request QRs
(`link.url`, printed on the QR sheet at src/App.js:20004 and copied at 20209; QR images from /api/customer-links/:id/qr.png at
20137), supply QR (/api/supplies/:id/qr.png, 5028), supply and equipment labels (labels.pdf, 4989, 10832), training session QR
(/api/training/sessions/:id/qr.png, 27597) and notice links. Their origin is the API's setting (the API audit confirms
STAFF_APP_ORIGIN). The dashboard builds no portal link, no QR and no print link on the portal address, and guide/, public/ and
translation/ hold no address.

## Appendix: people pickers (part 8, contract 2.11)

#### 8.1 The searchable picker components already in the app

- **PersonPick** (src/App.js:1446-1519, Step 291). Drop-in for `Sel`: takes the same `options` [{ v, l }] and calls `onChange`
  with { target: { value } }. Opens a box that searches by name, badge number or employee ID (badge and employee ID read from the
  option or from the shell's `PeopleCtx` by id), 44 px rows, at most 12 shown with "N more. Type to narrow the list.", optional
  `hint` and `group`. **This is the one to reuse for every single-choice people dropdown.**
- **usePersonFind** (src/App.js:1522-1533): the same match for a list a screen draws itself.
- **WsPeoplePicker** (src/App.js:5335-5359): a searched checkbox list, with an optional Owner tick. For multi-choice lists.
- **TagPicker** (src/App.js:5138-5167): chat's Tag someone, from GET /api/chat/channels/:id/members.
- **FormPersonPicker** (src/App.js:18777-18820): a form's person question, from GET /api/forms/people with server search once the
  list reaches 50.

#### 8.2 Every people dropdown and picker

Lists: "allStaff" is the shell's list, `loadPeople(af, "?status=active")` (src/App.js:700), so GET /api/users?status=active, and
on a 403 GET /api/hr/employees-summary?status=active (src/App.js:25169-25180). "Supervisor fills" assumes the API answers GET
/api/users for a holder of manage_staff, which contract 1 gives supervisors (see DASH-28 for when it does not).

Single-choice dropdowns:

| # | Page > window | src/App.js | Component | Searchable | Built from | Inactive people | Fills for a supervisor |
|---|---|---|---|---|---|---|---|
| 1 | Sites > site > Add task > Assign To | 4021 | PersonPick | Yes | allStaff, no filter | No (list is active) | Yes |
| 2 | Issues > Client requests > request > Assign to | 4331 | PersonPick | Yes | GET /api/issues/requests/:id assignees (4248) | API decides | API decides |
| 3 | Issues > issue > Assign task > Assign To | 4719 | PersonPick | Yes | allStaff, no filter | No | Yes |
| 4 | Settings > Who gets told > Add a person | 8308 | PersonPick | Yes | allStaff, active, no client contacts (8263-8267) | No | Admin page |
| 5 | PPE issued (site profile) > Person | 10759 (list from 3826) | PersonPick | Yes | GET /api/sites/profile/:id staff, no status filter | Possibly (DASH-82) | Yes |
| 6 | Assigned > filter | 11849 | PersonPick | Yes | allStaff | No | Yes |
| 7 | Assigned > Reassign To | 11888 | PersonPick | Yes | allStaff | No | Yes |
| 8 | Assigned > New task > Assign To | 11897 | PersonPick | Yes | allStaff | No | Yes |
| 9 | Schedule > Patterns > Person filter | 12544 | PersonPick | Yes | allStaff | No | Yes |
| 10 | Schedule > Time off request > shift > Reassign to | 12622 | PersonPick | Yes | GET /api/time-off/:id/cover-candidates (12608) | API decides | API decides |
| 11 | Schedule > Time off > Person filter | 12816 | PersonPick | Yes | allStaff | No | Yes |
| 12 | Schedule > New shift > Staff Member | 13334 | PersonPick | Yes | allStaff, no client contacts, grouped by site (13041-13050) | No | Yes |
| 13 | Schedule > Edit shift > Staff | 13381 | PersonPick | Yes | allStaff, no admins | No | Yes |
| 14 | Schedule > Schedule inspection > Assigned Supervisor | 13443 | PersonPick | Yes | GET /api/users?role=supervisor (12990), active plus the one held (25162-25167) | Only the one already held, marked | Yes |
| 15 | Schedule > pickup window > reassign | 13472 | PersonPick | Yes | allStaff, no admins | No | Yes |
| 16 | Shift Marketplace > shift > reassign | 14164 | PersonPick | Yes | GET /api/sites/:id staff first, then allStaff (13562-13586) | Site group not filtered (DASH-82) | Yes |
| 17 | Inspections > Edit inspection > Assigned Supervisor | 14830 | PersonPick | Yes | role=supervisor (14484) via supervisorOptions | Held one only | Yes |
| 18 | Inspections > Edit (second form) > Assigned Supervisor | 15196 | PersonPick | Yes | Same | Held one only | Yes |
| 19 | Inspections > Schedule > Assigned Supervisor | 15207 | PersonPick | Yes | Same | Held one only | Yes |
| 20 | Form builder > Who gets the filled report > Add a person | 19833 | PersonPick | Yes | allStaff, active, no client contacts (19708) | No | Admin page (build_forms) |
| 21 | Discipline > filter Person | 23907 | PersonPick | Yes | allStaff, no client contacts (23880) | No (DASH-82) | Yes |
| 22 | Discipline > filter Issued by | 23908 | PersonPick | Yes | allStaff admins and supervisors (23879) | No | Yes |
| 23 | Cases > Open a case > About whom | 23965 | PersonPick | Yes | allStaff active, no client contacts, caller left out (23937) | No | Yes |
| 24 | Cases > Open a case > On behalf of | 23970 | PersonPick | Yes | Same | No | Yes |
| 25 | Cases > Open a case > Assigned to | 23972 | PersonPick | Yes | Office people from the same (23938) | No | Yes |
| 26 | Cases > case log > With | 24203 | PersonPick | Yes | allStaff active (24093) | No | Yes |
| 27 | Cases > case > Hand to | 24404 | PersonPick | Yes | Active admins and supervisors, subjects left out (24340-24341) | No | Yes |
| 28 | Cases > case > Escalate to | 24425 | PersonPick | Yes | Same, caller left out | No | Yes |
| 29 | HR Records > Add Document / Add Training > Employee | 24548 | PersonPick | Yes | GET /api/users all statuses (24519-24526), sorted active first, status word on others | Yes, marked | Admin page |
| 30 | HR Records > tab person filter | 24712 | PersonPick | Yes | Same | Yes, marked | Admin page |
| 31 | Training > Log a training > Trainer | 25402 | PersonPick | Yes | useActivePeople (25183-25202): employees summary, else /api/users active | No | Yes |
| 32 | Training > Catalog > topic > Who needs it > Name a person | 26029 | PersonPick | Yes | activePeople from HR Records' list (24533, 24800) | No | Yes |
| 33 | Training > Documents > Who must sign > Name a person | 27931 | PersonPick | Yes | activePeople (24533, 24805) | No | Yes |
| 34 | **Settings > Roles and Permissions > Per-person permissions** | **16906-16910** | **plain select** | **No** | loadPeople(af, "") (16818), every status | **Yes, unmarked** | Admin page (manage_permissions) |
| 35 | **Forms > Jotform > maintenance > Aliases > User** | **22237-22246** | **plain select** | **No** | GET /api/jotform/users-for-linking (21338) | API decides | Admin page |
| 36 | **Forms > Jotform > submission detail > Link to user** | **22442-22452** | **plain select** | **No** | Same list (21532-21535) | API decides | Admin page |

Searched lists a screen draws itself (all searchable already):

| Page > window | src/App.js | Component | Built from |
|---|---|---|---|
| Messages > chat > Tag someone | 6606, 5138 | TagPicker | GET /api/chat/channels/:id/members |
| Messages > New message | 5188-5225 | own list, server search (`?q=`) | GET /api/chat/people |
| Workspace > New or Edit project > members | 5395 | WsPeoplePicker | GET /api/chat/people, office only (5310-5318) |
| Workspace > project > Members | 5433 | WsPeoplePicker | Same |
| Workspace > to-do > assignees | 5807 | WsPeoplePicker | The project's members |
| Chat records > who | 6289-6310 | usePersonFind | allStaff (6260) |
| Announcements > Send to > Chosen people | 6686-6717 | usePersonFind | allStaff |
| Forms > desk filing > person question | 18827 | FormPersonPicker | GET /api/forms/people, active, at most 50, server search |
| Training > Log a training > people | 25288, 25415 | usePersonFind checkboxes | useActivePeople |
| Training > Assign | 27207, 27261 | usePersonFind checkboxes | useActivePeople |

Not counted as people dropdowns: "Who attended" at src/App.js:25413 lists sites; the client recipient checkboxes at 9522 and 18582
list a site's client contacts by email; the witness at 23312 is typed.

Counts: 33 PersonPick, 3 plain selects of people, 0 datalists, 10 searched lists. Every people dropdown a supervisor can reach is
searchable; the three that are not are on admin pages.

## Appendix: time (part 12, contract 2.9 and 5.7)

Reproductions were run with node under TZ=America/New_York and TZ=America/Los_Angeles on copies of the app's own expressions; no repository code was loaded.


### 12.1 The date helpers

There is no helper that reads the company clock. The helpers that exist, and the clock each one uses:

| Helper | Line | What it does | Clock |
|---|---|---|---|
| toISO(d) | 445 | "YYYY-MM-DD" from the Date's local parts | browser |
| todayISO() | 12384 | same as toISO(new Date()), written a second time | browser |
| localDate(d) | 322 | "YYYY-MM-DD..." -> local midnight of that day; anything else -> new Date(d) | zone-neutral for date-only |
| timeOffLocal(ymd) | 12559 | copy of localDate (returns null for non-dates) | zone-neutral |
| fdDay, fdLong | 323, 324 | date-only display through localDate | zone-neutral |
| fd, ft, ff | 318, 317, 325 | instant display, new Date(d) in the browser's zone | browser (UTC-midnight bug when given a date-only string) |
| irDay, irWhen | 17676, 17675 | instant display | browser |
| stampDay | 26593 | instant display | browser |
| keptDay, keptDayOf | 10161, 10175 | date-only passthrough; an instant becomes the browser's day | browser for instants |
| keptTime, timeOffMoment, wsWhen, recWhen, helpWhen, builderWhen, signInWhen, fmtSessionStart | 10160, 12573, 5288, 6237, 7978, 19328, 1977, 1556 | instant display | browser |
| getMonday(d) | 437 | Monday 00:00 of the week, setDate steps | browser, calendar-safe |
| PRESETS (thisWeek, lastWeek, nextWeek, thisMonth, last7/30/60/90) | 447-456 | range presets, setDate steps | browser "today" |
| fmtRange | 438-443 | "T00:00:00" local parse for the picker label | zone-neutral |
| lastFullWeek, daysFromTo | 26423, 26428 | calendar parts; Math.round over 86400000 | browser "today", DST-safe |
| lastFullMonth | 9467 | last full month from new Date() | browser |
| reviewPeriods, reviewRange, reviewMonthEnd, reviewPrevious | 11128, 11140, 11126, 11148 | month and quarter bounds from parts | browser "now" |
| ownerPeriods | 11689 | 12 months and quarters back from todayISO() | browser |
| patternDate, patternTime | 12343, 12341 | date-only and wall-time display | zone-neutral |
| workingDaysUntil | 20668 | Monday-Friday count, setHours(0)/setDate loop | browser, DST-safe |
| daysSince, rosterRecent, notifAgo | 28023, 1885, 8339 | elapsed milliseconds | elapsed (fine) |
| localInputOf | 24024 | Date -> "YYYY-MM-DDTHH:mm" for datetime-local | browser wall time |
| stampLine / customerLine (company zone) | 18331-18337, 19065-19072, 19168-19175, 19489-19496 | toLocaleDateString/TimeString with timeZone: clientConfig.company.timeZone | company |

Not present anywhere in src/: Intl.DateTimeFormat, getTimezoneOffset, getUTC*/setUTC*/Date.UTC, "T23:59",
type="week", type="month". words.js, index.js and canonicalRedirect.js hold no date code. installPromptLogic.js:41
and :49 and InstallPrompt.js:72 use Date.now() for an elapsed "not now" timer (fine).

### 12.2 Every time site

Columns: line, expression (short), clock, risk. "browser" means the computer's own zone; "neutral" means the
same answer in every zone; "elapsed" means a difference between two instants. Risk: OK, low, medium, high.

#### A. "Today", "now", year and default ranges (all browser clock)

| Line | Expression | Clock | Risk |
|---|---|---|---|
| 447-455 | PRESETS.* from new Date() and getMonday(new Date()); end is today or Sunday | browser | medium (DASH-42): range end is the browser's today |
| 482 | "Today" button sets PRESETS.thisWeek() | browser | medium (DASH-42) |
| 1717 | EmploymentWindow today = toISO(new Date()); used as min of Expected return (1813) | browser | medium (DASH-42) |
| 1950 | roster CSV file name toISO(new Date()) | browser | low |
| 4111, 4116 | Live Operations date = toISO(new Date()); isToday | browser | medium (DASH-42, DASH-69) |
| 5056 | supply ordering export from = today minus 29, to = todayISO() | browser | medium (DASH-42) |
| 5749 | wsLate: dueOn < toISO(new Date()) | browser | medium (DASH-42) |
| 6172 | project todo late: due.slice(0,10) < toISO(new Date()) | browser | medium (DASH-42) |
| 7139, 10234, 24062, 24069, 27431, 27971 | "Printed on {day}" with keptDay(todayISO()) | browser | low |
| 2179, 3522, 11971, 12192 | CSV file names with todayISO() | browser | low |
| 9467 | lastFullMonth() from new Date() (monthly report default) | browser | low |
| 9652, 9679, 9761 | injury log years and default year from new Date().getFullYear() | browser | low (New Year's Eve evening only) |
| 9741-9742 | injuryPostingDue: today vs postingWindow from/to | browser | low |
| 10369, 10404 | kept PPE and clearance pages: today = todayISO(); clearance bands by days left | browser | medium (DASH-42) |
| 10647 | "As of {today}" on non-ranged kept records | browser | low |
| 10802, 10824, 10958 | equipment service due: nextServiceOn <= todayISO() | browser | medium (DASH-42) |
| 11129-11135 | reviewPeriods from new Date() | browser | low |
| 11217 | management review today = todayISO() | browser | low |
| 11437, 11463 | injury log probe year, last year's summary | browser | low |
| 11448-11450 | Reports probes: checklist-record and ppe-issues from=today&to=today | browser | low |
| 11767 | ownerPeriods(todayISO()) | browser | low |
| 12391-12392 | pattern edit: effectiveFrom and lastDate default todayISO() | browser | medium (DASH-42): a change can start "today" on the wrong day |
| 12450 | pattern started = startsOn <= todayISO() | browser | low |
| 12865, 13508, 8045, 9301, 9546, 10610, 11409, 14379 | screen default ranges from PRESETS | browser | medium (DASH-42) |
| 13074 | createDateForRange: today if in range | browser | medium (DASH-42) |
| 13170, 13228, 13256 | calendar isToday highlight | browser | low |
| 13689-13690 | convert window: today and today + 30 * 86400000 | browser, elapsed step | low (DASH-83) |
| 17041, 17171 | holidays year from new Date().getFullYear() | browser | low |
| 20672-20673 | workingDaysUntil now = Date.now() at local midnight | browser | low |
| 22637, 22691 | ClearanceWindow today = toISO(new Date()), used as max of the date | browser | medium (DASH-42): a date entered "today" in the company day can be refused |
| 23636, 24697 | expiryBadge now at local midnight | browser | low (plus DASH-83) |
| 23895 | warnings CSV file name | browser | low |
| 25238, 26513, 27511, 28260, 28334 | form defaults: completed date, session day, property issuedOn and returnedOn = todayISO() | browser | medium (DASH-42): the record's date defaults to the browser's day |
| 26187, 26339, 26349 | training gaps and matrix "as of" fallback todayISO() | browser | low |
| 26432 | TrainingTime default = lastFullWeek(todayISO()) | browser | low |

#### B. Date-only values parsed or displayed

| Line | Expression | Clock | Risk |
|---|---|---|---|
| 322-324 | localDate / fdDay / fdLong | neutral | OK |
| 439 | fmtRange: new Date(s + "T00:00:00") | neutral | OK |
| 2452 | formatter: string -> split("T")[0] -> new Date(y, m-1, d); non-string -> toISOString() first | neutral for strings; UTC day for a Date object | low |
| 3675-3676 | site contract dates: Date object -> toISOString().split("T")[0]; string -> split("T")[0] | UTC day for a Date object | low (inferred: API sends strings) |
| 3762, 3767, 5741, 9787, 9855, 9949, 10880, 11911, 13150, 14183, 14560, 22638, 22804, 23162-23170 | String(dateField).slice(0, 10) of date columns | neutral | OK for date columns |
| 3791 | fd(sp.inspectionSummary.last_inspection) on a date-only value | UTC midnight shown in browser zone | high (DASH-13): shows the day before |
| 4119, 9140, 10439, 13168-13169, 13425, 13460, 13545, 14366, 15078 | new Date(day + "T00:00:00") or slice(0,10) + "T00:00:00" | neutral | OK |
| 8564 | fmtBucketDate = fdDay(bucket_start) | neutral (first ten characters) | OK |
| 9291, 10162, 11126, 11150 | month labels from parts | neutral | OK |
| 9742 | posting window slice(0, 10) | neutral | OK |
| 10161, 10175 | keptDay, keptDayOf for date-only | neutral | OK |
| 10400, 10617 | days between date-only values with Math.round over 86400000 | neutral, DST-safe | OK |
| 12343, 12559-12562, 12564 | patternDate, timeOff* | neutral | OK |
| 12997, 13001, 13002, 13007 | calendar: scheduled_date?.slice(0, 10) === day | neutral | OK (inferred: API sends "YYYY-MM-DD") |
| 13077 | openCreate: new Date(date + "T00:00:00").getDay() | neutral | OK |
| 17037 | holidayDay via localDate | neutral | OK |
| 23635, 24696 | expiryBadge: date + "T00:00:00" | neutral | OK (plus DASH-83) |
| 24566 | HR fmtDate: string returned as "YYYY-MM-DD" text (ISO digits on screen) | neutral | low (words: ISO digits where a localized date belongs) |
| 25113, 25127-25130 | trainingDay / trainingDayWords from parts | neutral | OK |
| 26425-26426 | lastFullWeek from parts | neutral | OK |

#### C. A timestamp turned into a day

| Line | Expression | Clock | Risk |
|---|---|---|---|
| 9133, 9234 | inspection score rows: (scheduled_date or completed_at).slice(0, 10) | UTC day when only completed_at is there | low (DASH-83) |
| 10175 (instant branch), 10326, 10365, 11189, 11220 | keptDayOf(timestamp) = toISO(new Date(ts)) | browser | medium (DASH-42): a record printed on another laptop moves evening rows to the next day |
| 11166 | reviewFilings stops when keptDayOf(last.submittedAt) < from | browser | low |
| 23376 | PastWarningWindow actionDate = String(item.submittedAt).slice(0, 10) | UTC | high (DASH-14) |
| 23464 | the same item's row shows irDay(n.submittedAt) | browser | (DASH-14, mismatch) |
| 24003 | caseLogHappened: occurredAt vs createdAt more than 60 s apart | elapsed | OK |

#### D. Instants shown on screen, in prints and in exports (browser zone)

All of these draw an instant in the browser's zone with no zone named: 317, 318, 325, 1556, 1977, 2173, 2215,
2238, 2269, 2317, 2631-2632, 2666, 3387, 3516, 3541, 3562, 3666, 3855, 3914, 3927, 3949, 4280, 4699, 5288, 6237,
7978, 7981, 8346-8347, 9658, 10160, 10440, 10995, 11880, 12573, 14367, 17593, 17675-17676, 19328, 19741, 21075,
21076, 22949, 23574, 26593, and every call of fd/ff/irDay/irWhen/stampDay listed in 12.1. Print and export
headers "Generated {0}" (2267, 2288, 3383, 3539) and "Generated" stamps with new Date().toLocaleString (8846,
9055, 9223, 9349, 16736) also use the browser zone. The four signature stamps (18333-18336, 19067-19071,
19170-19174, 19491-19495) use the company zone, so one form window can show a signature time in New York time
next to other times in the laptop's zone (DASH-83).

#### E. Countdown and elapsed math

| Line | Expression | Clock | Risk |
|---|---|---|---|
| 1885 | rosterRecent: Date.now() - at <= 30 * 86400000 | elapsed | OK |
| 8340-8347 | notifAgo minutes, then fd(iso) after 7 days | elapsed, then browser | OK |
| 11199, 11261, 20694, 20877 | late = dueAt < now; resolved <= due | elapsed | OK |
| 12945-12949 | Started lane 31-day cap: Date.parse(day + "T00:00:00Z") differences | neutral (both UTC) | OK |
| 20668-20676 | workingDaysUntil: setHours(0) both ends, setDate loop | browser midnight, DST-safe | OK |
| 22952-22959 | fmtRelDate: Math.floor((now - dt) / 86400000) | elapsed | low (DASH-83) |
| 23637, 24698 | expiryBadge: Math.ceil((dt - now) / 86400000) | local midnights | medium (DASH-83): one day too many across Nov 1 |
| 24138 | case log entry: at > Date.now() refused | elapsed | OK |
| 24347 | case age hours | elapsed | OK |
| 28023 | daysSince(requestedAt) floor | elapsed | OK |

#### F. Week and month math

| Line | Expression | Clock | Risk |
|---|---|---|---|
| 437 | getMonday: getDay, setDate(-diff), setHours(0) | browser, calendar | OK across Nov 1 (repro R4) |
| 448-450 | this/last/next week: setDate(+-7), setDate(+6) | calendar | OK across Nov 1 |
| 12994 | getWeekDays: setDate(start + i) | calendar | OK (repro R4: Oct 26 to Nov 1) |
| 12995 | getMonthDays: new Date(year, month, i + 1) | calendar | OK |
| 13267-13271, 13289 | month navigation with setMonth and new Date(y, m, 1/0) | calendar | OK |
| 13277 | month cell -> week: end = toISO(new Date(m.getTime() + 6 * 86400000)) | millisecond step | low (DASH-83): lands on Sunday 00:00 before the 2 AM change, so correct for Monday weeks in US zones; the same step with 7 days or a Sunday start is wrong (repro R4) |
| 13690 | Date.now() + 30 * 86400000 | millisecond step | low (DASH-83): one day short when read between midnight and 1 AM before Nov 1 (repro R6) |
| 26423-26426 | lastFullWeek from parts | calendar | OK |

#### G. Date and time inputs

67 type="date" inputs, 1 type="datetime-local" (24208), 17 type="time". Every date input holds and sends a
plain "YYYY-MM-DD". The datetime-local value is turned into an instant on the browser's clock (24136-24139).
The time inputs send "HH:mm" next to a separate date (shifts, patterns, time off part-day), and the dashboard
draws them as wall times (patternTime 12341, blockTime 2810), which needs no zone.

### 12.3 What the date pickers send, and how the API is likely to read it

Every range the dashboard sends is two plain dates, the end being the last day itself (inclusive), with no time
and no zone. No call adds a day to the end or sends a time. The routes:

| Route (line) | Params | End sent | Column the API likely compares (inferred) |
|---|---|---|---|
| /api/report-engine/issue-timing (8785) | start_date, end_date, bucket | the day | reported_at, resolved_at (timestamps) |
| /api/report-engine/supply-usage (9019) | start_date, end_date, bucket | the day | usage timestamps |
| /api/reports/task-completion, /api/reports/issues (11418-11420) | start_date, end_date | the day | timestamps |
| /api/inspections/analytics/* (9187-9189, 14467-14472, 14609) | start_date, end_date | the day | scheduled_date (date) or completed_at (timestamp) |
| /api/reports/client-ratings (9308, 11225) | from, to | the day | rating timestamps |
| /api/monthly-reports (9559) | from, to | the day | period dates |
| /api/help-insights/* (8057-8064, 8005) | from, to | the day | question timestamps |
| /api/schedule/calendar, /api/pickups (12975-12979, 13599-13616) | start_date, end_date | the day | scheduled_date (date) |
| /api/shift-sessions/by-site (12951) | start_date, end_date (31-day cap) | the day | sessionDate (date) |
| /api/schedule (13691) | start_date=today, end_date=today+30 | the day | scheduled_date |
| /api/sites/:id/checklist-record (10537) | from, to | the day | check-off timestamps or day |
| /api/supplies/usage (10552), /api/ppe-issues (10561, 10672) | start_date/end_date, from/to | the day | timestamps |
| /api/inspections/scheduled (10580, 11220) | from, to | the day | completed or scheduled day |
| /api/discipline (11235, 23869) | from, to | the day | issued date |
| /api/chat/records (6274 via recQuery 6238) | from, to | the day | sent_at (timestamp) |
| /api/issues/requests (4418) | from, to | the day | reportedAt (timestamp) |
| /api/supplies/requests/approved.csv (5052 comment, 5101-5102) | from, to | the day | approval timestamps |
| /api/jotform/submissions, /api/jotform/pdf-access-log (21104-21109, 21129-21133) | date_start, date_end | the day | submitted_at, accessed_at |
| /api/training/time (26447, 26456) | from, to (1 to 62 days) | the day | lesson timestamps (paid training time) |
| /api/training/sessions (27493-27494) | from, to | the day | session day |
| /api/users/timeline/:id (2185) | startDate, endDate | the day | createdAt |
| /api/sites/timeline/:id (3289, tlDateRange 3899-3900) | start, end | the day | createdAt |

Contract 4 states the API reads a date-only end_date as midnight UTC for timesheets. If the routes above that
compare a timestamp column do the same (inferred), a range "Oct 9 to Oct 15" becomes Oct 8 8:00 PM to
Oct 14 8:00 PM in New York (Oct 14 5:00 PM on a Pacific laptop, repro R7): the last day is dropped, the
evening of the day before the end is dropped, and the evening before the start is added. "Last 30 days",
"This week" and "This month" all end today, so every report opened with a preset loses today. Routes that
compare a date column (scheduled_date, sessionDate) are unaffected. Weekly buckets are made by the API from
bucket=week; if it truncates in UTC (inferred), Sunday evening after 8 PM falls into the next week.

### 12.4 The week that crosses Sunday, Nov 1, 2026

- Schedule week view: the week is Monday Oct 26 to Sunday Nov 1. getWeekDays (12994) steps with setDate, and
  repro R4 prints 2026-10-26 to 2026-11-01 in both New York and Los Angeles. Next week (Nov 2 to Nov 8) comes
  from setDate(+7) (450), also correct.
- Month view -> week (13277): Monday 00:00 + 6 x 24 h = Sunday Nov 1 00:00, two hours before the change, so the
  week ends on the right day. The pattern is fragile: the same step with 7 days lands on Sunday 11:00 PM
  (repro R4), and with a Sunday-start week it ends a day early (Nov 6 for Nov 1 to 7).
- Timesheets: no timesheet or labor screen exists in this repository (no call to /api/timesheets or /api/labor;
  the only mentions are the permission matrix rows at 16710-16713). The pay-adjacent screen is Training time
  (26431): its default is the last full week from parts, which is correct across Nov 1. A week ending Sunday
  Nov 1 sent as to=2026-11-01 loses all of Nov 1 if the API reads the end as UTC midnight (inferred), and that
  Sunday has 25 hours.
- Reports weekly buckets: built by the API (bucket=week, 8785, 9019); the dashboard only labels bucket_start
  with fdDay (8564), which is safe. Bucket edges are the API's (inferred).
- Recurrence: patterns and "repeat for N weeks" are built by the API (POST /api/schedule/patterns 13104 and
  /api/schedule/bulk 13118); the dashboard sends startsOn, endsOn or repeat_until as plain dates and the
  weekday keys. A step of 7 x 86400000 in the API's own local time would put every shift after Nov 1 on the
  previous day (inferred; the API audit checks).
- Countdowns: expiryBadge (23637, 24698) uses Math.ceil over 86400000, and the 25-hour day makes every count
  that spans Nov 1 one too many (repro R5). Today (Oct 15) an item expiring Nov 14 reads "Valid" one day after
  it should read "Expires 30d". The same holds every year from mid-October to Nov 1.

### 12.5 Reproductions

Run under TZ=America/New_York and TZ=America/Los_Angeles with node, on copies of the expressions named on each line.

```
TZ=America/New_York
  fd("2026-10-08")  [App.js:318 via 3791]                        => Oct 7
  new Date("2026-10-15").toLocaleDateString()                    => 10/14/2026
  localDate("2026-10-15") (the safe helper, App.js:322)          => 10/15/2026
  toISO(instant 2026-10-16T04:30Z)  [todayISO App.js:12384]      => 2026-10-16
  company day of that instant (America/New_York)                 => 2026-10-16
  String(submittedAt).slice(0, 10)  [App.js:23376 prefill]       => 2026-10-16
  irDay(submittedAt)  [App.js:23464 list row]                    => Oct 15, 2026
  getMonday(Oct 28) [App.js:437]                                 => Mon Oct 26 2026 00:00:00
  toISO(new Date(mon + 6*86400000))  [App.js:13277]              => 2026-11-01
  new Date(mon + 7*86400000)  (next Monday by ms)                => Sun Nov 01 2026 23:00:00 -> 2026-11-01
  setDate(+7) (PRESETS nextWeek style, App.js:450)               => 2026-11-02
  Sunday-start week: toISO(Sun Nov 1 + 6*86400000)               => 2026-11-06 (expected 2026-11-07)
  getWeekDays from 2026-10-26 [App.js:12994]                     => 2026-10-26,...,2026-11-01
  Math.ceil((Nov 2 - Oct 31) / 86400000) [App.js:23637]          => 3 (calendar days: 2)
  toISO(new Date(00:30 Oct 15 + 30*86400000)) [App.js:13690]     => 2026-11-13 (calendar: 2026-11-14)
  end_date=2026-10-15 read as UTC midnight, shown here           => Wed Oct 14 2026 20:00:00
  new Date("2026-10-15T10:00").toISOString() [App.js:24139]      => 2026-10-15T14:00:00.000Z
  Math.floor((8 AM Oct 15 - 9 PM Oct 14)/86400000) [App.js:22954] => 0 -> "today"
TZ=America/Los_Angeles
  fd("2026-10-08")  [App.js:318 via 3791]                        => Oct 7
  new Date("2026-10-15").toLocaleDateString()                    => 10/14/2026
  localDate("2026-10-15") (the safe helper, App.js:322)          => 10/15/2026
  toISO(instant 2026-10-16T04:30Z)  [todayISO App.js:12384]      => 2026-10-15
  company day of that instant (America/New_York)                 => 2026-10-16
  String(submittedAt).slice(0, 10)  [App.js:23376 prefill]       => 2026-10-16
  irDay(submittedAt)  [App.js:23464 list row]                    => Oct 15, 2026
  (week lines identical to New York)
  end_date=2026-10-15 read as UTC midnight, shown here           => Wed Oct 14 2026 17:00:00
  new Date("2026-10-15T10:00").toISOString() [App.js:24139]      => 2026-10-15T17:00:00.000Z
```

R2 is the core case: at 12:30 AM in New York on Oct 16 (9:30 PM on a Pacific laptop), the company's day is
Oct 16 and the Pacific laptop's "today" is Oct 15. The same happens to a laptop or remote desktop set to UTC
from 8 PM Eastern on (it reads tomorrow), and to a browser that reports UTC for privacy (inferred: Firefox with
resist-fingerprinting on).

## Appendix: growth (part 13, contract 5.9)

Common facts:
- apiFetch (90-100) returns the parsed JSON and reads no headers; no reply total, Content-Range or count is used
  anywhere (0 hits for content-range, x-total, total-count). A list cut at the Supabase default of 1,000 rows
  (inferred: an API route that selects without .range or .limit) is drawn as the whole list.
- Pagination (1540) is client-side only: it pages an array already in memory. 44 DataTable uses, 11 with
  Pagination; the other 33 draw every row.
- Which rows go missing past 1,000 depends on the API's order (inferred): oldest-first drops the newest rows,
  which is the worst case for Issues, Inspections, Supplies requests and Tickets.

### 13.1 What the shell reads at sign-in and while open

At sign-in (560-790), about 20 GETs: /api/sites (697), /api/users?status=active through loadPeople (700, or
/api/hr/employees-summary for a supervisor), /api/lookups/all (706), permissions (717), then probes that decide
which side panel items show: /api/clearances (725, every active person's clearances), /api/discipline (726, every
warning, no range), /api/workspace/projects (727), /api/equipment?status=out_of_service (728),
/api/periodic-work?state=overdue (729), /api/support/tickets?status=new (730), /api/library (731),
/api/users/me/trusted-devices (732), /api/forms/responses?status=submitted&limit=1 (738), /api/reports/overview
(743, read again on every page change: its dependency list is [token, page]), /api/notifications/settings (785),
and the first tick of the bell timer (793): unread-count, /api/chat/channels, /api/hr-cases/queue-count.

### 13.2 Screen by screen

| Screen (component, line) | GETs that load the list | Paged on server? | Limit sent | Filter / sort / count in the browser | Past 1,000 rows |
|---|---|---|---|---|---|
| Staff (StaffPage 2010) | /api/users (2096); roster /api/users/roster-check (2089); shell /api/users?status=active (700) feeds every picker | no | none | status tabs, search, counts (2737-2753), client Pagination (2770) | tab counts and list stop at what came back; people past the cut vanish from every picker (inferred) |
| Sites (SitesPage 3117) | shell /api/sites (697); /api/workload-plans (3132) | no | none | search and client Pagination (4095) | sites past the cut missing everywhere (inferred; far off) |
| Site profile timeline / chat | /api/sites/timeline/:id?limit=100&offset (3289); /api/sites/chat/:id?limit=200 (3331) | yes / capped | 100 / 200 | none | timeline pages; site chat shows the newest 200 with no way back |
| Schedule (SchedulePage 12846) | /api/schedule/calendar?start_date&end_date (12975), /api/pickups range (12979), /api/shift-sessions/by-site range (12951), /api/time-off?status=requested&limit=200 (12900) | no | none (time off 200) | per-day filters for every cell (12996-13007, 13179), staff rows paged in the browser (13070, 13247) | a month at 100 staff is about 2,200+ shifts; days past the cut show empty with no warning (inferred) |
| Live Operations (OpsPage 4110) | /api/shift-sessions/by-site?date (4114) | no | none | "not started" = allStaff minus started (4121) | one day; fine |
| Shift Pickup (ShiftMarketplacePage 13507) | /api/pickups range + /api/pickups/analytics + /api/pickups?status=requested (all time) + /api/pickups?status=claimed range (13605-13609); on Analytics 4 more (13617-13622); convert window /api/schedule today..+30 (13691) | no | none | counts = reqs.length, claimed.length (13613-13614); client Pagination (13779); convert list draws every shift (14121) | counts stop at the cut; convert list of all shifts for 30 days passes 1,000 at about 50 staff (inferred) |
| Time off (TimeOffView 12783) | /api/time-off?status&limit=200 (12585, 12794) | no | 200 | none | silent cap at 200; no more button; Schedule's waiting count stops at 200 (12900) |
| Issues (IssuesPage 4540) | /api/issues (?source) (4571) | no | none, no range | status tabs filtered in the browser (4618); every issue drawn as a card, no paging (4650) | every issue ever loads and draws; past the cut, issues vanish silently (inferred) |
| Client requests tab | /api/issues/requests?siteId&state&from&to (4418); waiting count /api/issues/requests?state=waiting (4550) | no | none | waiting = requests.length | count stops at the cut (inferred) |
| Notices / bell (8478-8550) | /api/notifications?limit=30&before= (8495); unread-count (764) | yes, cursor | 30 | none | pages; good |
| Messages (ChatPage 6351) | /api/chat/channels (6400), /api/chat/dm-inbox (6397), /api/chat/direct-inbox (6401), /api/chat/people (6407), /api/chat/channels/:id/messages (6420, again every 12 s at 6425) | no | none | unread totals summed in the browser (778) | opening a busy channel reads its whole history; past the cut the newest or oldest messages are missing (inferred) |
| Filed forms (IncidentReportsTab 20699) | /api/forms/responses?status&limit=50&before= (20742-20746) | yes, cursor | 50 | Load more (20911) | pages; the Unfinished tab count is the first page's length, max 50 (20759, 20772) |
| Forms > Jotform submissions, PDF log (FormsPage 20958) | /api/jotform/submissions?limit=50&offset (21104), PDF log limit=50 offset (21129); failures limit=200 (21171) | yes, offset | 50 / 200 | none | pages; failures capped at 200 |
| Reports (ReportsPage 11403) | /api/report-engine/definitions (11415); issue-timing and supply-usage (server totals); /api/reports/task-completion and /issues (11419-11420); exports /api/issues and /api/reports/chemical-usage (11469-11470) | no | none (lowest-items 10) | report views are server totals; exports write every row returned | report totals are server-side (good); the issues CSV stops at the cut (inferred) |
| Management review print (reviewSections 11214) | 14 lists in parallel (11221-11239), one GET per former employee (11233), reviewFilings 200 per page up to 25 pages, in sequence (11160-11170) | partly | 200 for filings | counts, averages and "people" totals computed in the browser | counts of people, inspections, warnings, equipment and issues stop at the cut (inferred) |
| Kept records (site record pack, 10530-10650) | per record: checklist-record, supplies usage, ppe-issues, clearances, inspections, /api/hr/training (all records, 10594) | no | none | range and site filtered in the browser (10599) | training rosters miss records past the cut (inferred) |
| Timesheets / labor | no screen in this repository (no call to /api/timesheets or /api/labor; matrix rows only at 16710-16713). Training time for pay: /api/training/time?from&to&siteId (26447) | no | none | server totals | one row per person; fine |
| Training records (HRRecordsPage 24436, training route) | /api/hr/training (24559; all records unless a person is picked); batch log reads /api/hr/training again (25313); /api/training/matrix, gaps | no | none | client Pagination (24837); duplicate check in the browser (25314-25317) | the training list and the duplicate check stop at the cut, so a second Save writes duplicates (DASH-39) |
| Cases (CasesPage 24227) | /api/hr-cases?status (24254) | no | none | sort in the browser (24365) | small today |
| HR Records (HRRecordsPage 24436) | /api/hr/employees-summary (22940), /api/hr/documents (24558), /api/hr/training (24559), /api/hr/compliance (24562) | no | none | client Pagination (24792, 24837, 25022) | documents and training pass 1,000 first (staff x documents) |
| Clearances (ClearancesPage 22805) | /api/clearances?state&siteId (22815) | no | none | sort in the browser (22816) | bounded by active staff; fine |
| Discipline (DisciplinePage 23860) | /api/discipline?filters (23869) | no | none | counts come from the server (d.counts) | list stops at the cut; counts stay right |
| Supplies (SuppliesAdminPage 4978) | /api/supplies (5039), /api/supplies/requests (5040), /api/supplies?all=true&includeRemoved=true (5007), one QR PNG per supply (5025-5033) | no | none | every supply drawn as a card (5092) | requests list stops at the cut; QR loop grows with the catalog |
| Inspections (InspectionsPage 14350) | /api/inspections/scheduled (14454, all time, no range), ?awaiting=review (14457), templates; analytics with ranges (14467-14472) | no | none | tabs split in the browser, client Pagination (14965, 14994) | inspections past the cut vanish from both tabs (inferred) |
| Equipment (EquipmentPage 10804) | /api/equipment?filters (10821) | no | none | none | small; fine |
| Tickets (TicketsPage 7225) | /api/support/tickets?kind&app (7236) | no | none | state filtered and sorted in the browser (7239-7240) | every ticket ever, every state, loads each time |
| Library (LibraryPage 7791) | /api/library (7807); search ?q (7816) | no | none | none | small; fine |
| Help insights (HelpInsightsPage 8044) | summary, misses, people with from/to (8064) | no | none | none | misses list grows with questions (inferred) |
| Chat records (ChatRecordsPage 6248) | /api/chat/records?filters (6274), log?limit=50 (6264) | server capped | API decides | none | the reply carries count and more (6275); good |
| Workspace (WorkspacePage 5460) | /api/workspace/projects (5495), per project posts, todos, files, activity (5670, 5860, 6013, 6086, 6097-6099) | no | none | none | per project; fine for now |
| Assigned tasks (AssignedTasksAdminPage 11812) | /api/clock/tasks/assigned-all?filters (11819) | no | none | none | grows with tasks (inferred) |
| Person timeline (StaffPage) | /api/users/timeline/:id?limit=200&offset (2156, 2185) | yes, offset | 200 | none | pages; good |

### 13.3 Requests made inside a loop

| Line | What | Shape | Grows with |
|---|---|---|---|
| 11230-11233 | management review: for each terminated person, GET /api/users/:id/employment | Promise.all, no cap on concurrency | every former employee, forever (custodial turnover) |
| 11160-11170 | reviewFilings: GET /api/forms/responses?limit=200&before, up to 25 pages | sequential pager (acceptable shape) | filings; OCSA-FRM-010 reads every filing ever (from "") |
| 10586 | kept inspections print: GET /api/inspections/scheduled/:id per completed inspection | Promise.all, no cap | sites x inspections in the range |
| 10430-10434, 10484-10487 | per inspection, per signature image, sequential | nested sequential | signatures |
| 10569 | kept PPE pages: one signature image per PPE issue in the range, sequential | sequential | PPE issues |
| 27960-27962 | document signatures print: one signature image per signer | Promise.all, no cap | staff x sites |
| 5019-5035 | Supplies: one QR PNG per supply, sequential, every time the page mounts (cache lives in the component, 4997) | sequential | supply catalog across all sites |
| 26254-26257 | PersonTrainingWindow: GET /api/training/attempts/:id per attempt | forEach, parallel | a person's training history |
| 25321-25330 | Log training for many people: one POST /api/hr/training per person | sequential | people in the batch |
| 2853, 2858-2862, 3194-3198 | shift label rename and Spanish fixes: PATCH per block or field | sequential | small |
| 11228, 19927 | injury log per year (1-2), forms per language (2-3) | Promise.all | fixed; fine |

### 13.4 Polling

| Where | Line | Every | Calls per tick | Pauses when the tab is hidden |
|---|---|---|---|---|
| Shell: bell count, Messages badge, Cases badge | 790-795 | 60 s | 2 or 3 (+1 /api/notifications?limit=1 when the count rises) | yes |
| Shell: on focus and on becoming visible | 800-806 | each return | 1 or 2 | n/a |
| Shell: overview counts | 743 | every page change | 1 | n/a |
| Overview | 1570 | 45 s | 3 | no |
| Live Operations | 4115 | 30 s | 1 | no |
| Messages, open channel | 6425 | 12 s | 1, the whole channel history | no |
| Schedule | 12992 | 45 s | 3 (calendar, pickups, shift sessions) | no |
| Shift Pickup | 13634 | 45 s | 4, or 8 on the Analytics tab | no |
| Training session sign-ins | 27589 | 5 s while open | 1 | yes |
| Help, waiting for an answer | 7478-7486 | 4 s, up to 30 reads | 1 | no (stops after 2 minutes) |
| Second-step code countdown | 1389 | 1 s | 0 (no request) | n/a |

The render switch (1262-1300) mounts one page at a time, so a tab runs the shell timer plus at most one page
timer. Steady load per open tab: Shift Pickup on Analytics about 11 calls a minute plus the shell's 2 to 3;
Messages 5 plus 3; Schedule 4 plus 3; Overview 4 plus 3. Five page timers keep running in a hidden tab, so an
office person with three tabs (Schedule, Shift Pickup, Messages) sends about 25 calls a minute all day whether
they look or not (inferred from the intervals).

### 13.5 The five screens that will slow first

1. Schedule. One reply holds every shift of every site for the visible range, re-read every 45 s with two more
   calls even in a hidden tab, and every cell filters the whole list (12996, 13179). Month view at 100 staff is
   about 2,200 shifts, past a 1,000-row cut (inferred), and grows with staff and sites together.
2. Issues. GET /api/issues has no range, no limit and no paging, and the page draws every issue as a card
   (4571, 4650). Issues grow with sites, staff and client requests and never leave the list.
3. Messages. Opening a channel reads its whole history and reads it again every 12 s (6420, 6425); site channels
   grow with staff and time. The shell also reads every channel every 60 s for the badge (778).
4. Shift Pickup. Four calls every 45 s (eight on Analytics), counts made from whole lists including every
   requested pickup ever (13608), and a convert window that loads every shift for 30 days (13691).
5. HR Records > Training records. /api/hr/training returns every training record (staff x topics, first-day and
   first-shift trainings included), read by the Training tab, the person folder, the site record pack, the
   management review and the batch log's duplicate check (24559, 10594, 11229, 25313). It is the list most
   likely to pass 1,000 rows first (inferred; the chat can count live rows).

Next in line: Inspections (all-time list, 14454), Supplies (one QR request per supply on every visit, 5025),
Tickets (every ticket every load, 7236).

## Appendix: what each main page shows when the API is down, slow or answers 500 (part 10)

#### 10(c) What each main page shows when the API is down, slow, or answers 500

"Down" is a rejected fetch (TypeError: Chrome and Edge "Failed to fetch", Safari and every iPhone browser "Load failed",
Firefox "NetworkError when attempting to fetch resource."). "Slow" is a request that never answers: no call has a timeout
(DASH-09). "500" goes through `apiFetch` 89-97: the API's own `error` words when the body is JSON, else "Request failed"
in the screen's language (a Railway 502 HTML page reads "Request failed").

| Page | Down | Slow | 500 | LoadFailed? |
|---|---|---|---|---|
| Overview (1559-1571) | first load: "This did not load." + Try again; later: old figures, no sign | "Loading..." forever; 3 more requests every 45 s | same as down | yes, first load only |
| Staff (2096, 2769) | toast "Failed to fetch" 3 s, then "Could not load staff." + Try again | table reads "No staff match these filters." | toast API words + same card | yes |
| Sites (697, 4095) | "No sites found.", counts 0, no retry | same | same | no |
| Schedule (12970-12986, 13313-13314) | toast raw words + "This did not load."; repeats every 45 s | "Loading schedule..." forever; a slow earlier week can land after a later one (inferred) | toast API words + card | yes |
| Issues (4571, 4647-4648) | toast raw words + card | "No problems reported yet." | toast + card | yes |
| Reports (11415, 11611-11612) | toast "Could not load reports: Failed to fetch" (two languages in one line) + card; summary charts silently empty (11419-11420) | "Loading reports..." forever | toast + card | yes, library only |
| HR Records (24558-24562, 24878) | Documents, Training, Onboarding: toast only, old list stays; Compliance: card | old list stays | same | Compliance only |
| Cases (24252-24257, 24382-24383) | toast, then "No cases." or the last tab's rows | "Loading cases..." forever | toast | no |
| Forms (21096, 21116, 21778, 21824) | toast "Forms load failed: Failed to fetch" + card | spinner state per list | toast + card | yes |
| Settings (16447-16451, 16505; 17244, 17327, 17356) | Company and Dropdown Options: card; quote defaults, holidays, support contact vanish silently (17162-17178) | "Loading settings..." / "Loading company settings..." forever | same | yes, two panels |
| Training (26098-26104, 26141; 26196-26205, 26275) | card whose line is the raw error text itself ("Failed to fetch") + toast; topic pickers silently empty (26095, 27105) | "Loading..." forever | card with API words | yes |
| Messages (6397-6425, 6532-6597) | "Messages did not load." + Try again; a failed send keeps the text and says "Your message did not send." in the screen's language (6435-6447) | old conversation stays | same | yes |
| Sign-in and start-up (889-911, 960, 975) | stored session: sign-in card with no words; signing in: the card shows "Failed to fetch" | "Loading..." forever before any card | stored session: sign-in card, no words | no |

Where the load-failed pattern is used: `LoadFailed` (413) is drawn at about 90 places: Overview, Staff, a site's Timeline and
Chat, Schedule, Shift Pickup, Issues and client requests, Reports library and run views, Inspections, Settings (Company,
Dropdown Options), HR Compliance and a person's folder, Forms (Jotform inbox, forms, PDF log, submission window), Vendors,
Services, Messages, Workspace, Library, Equipment, Training views, Announcements. Main pages without it: Sites, Cases,
HR Records' Documents, Training and Onboarding tabs, Live Ops, and the Overview after its first load.

## Appendix: words (part 7)

Spanish is written with its accents removed so this file stays ASCII; the CSV holds the accented words.

### 1. Word drift: src/words.js against translation/dashboard_words.csv

#### How it was counted

- The comparer is the harness's own: `compare()` in audit/lib/words.js:111-128, called by audit/cases/house-style.js:42-50
  (check id `house-style/the-table-and-the-csv-agree`, audit/inventory.js:378).
- Expected pairs come from the table (`expectedPairs`, audit/lib/words.js:96-109): one pair per key, the English being the key
  with its `|context` cut off (`baseOf`, audit/lib/words.js:94), plus one pair per count form for the 103 count entries.
  The table holds 4,586 keys (all with Spanish), giving 4,689 pairs. The CSV holds 4,691 rows.
- **"Missing"** = a pair the table expects that has no CSV row with exactly that English and that Spanish (in words.js and missing from
  the CSV). **"Extra"** = a CSV row whose English and Spanish pair is not one the table expects (in the CSV and missing from words.js).
  house-style.js:47-48 prints them in those words.
- The \u escapes in words.js are decoded by the parser (@babel/parser StringLiteral values) and compared with the CSV's UTF-8
  text byte for byte.

#### Result: 22 missing and 40 extra, the contract's numbers exactly

All 62 come from one cause: **40 CSV rows write the English with its context still on it** ("Valid until|quote"), where the
comparer and the other 609 context keys in the CSV write the English without it (for example words.js:4911 "Off|time off"
is CSV line 4686 "Off,Libre"). The table holds 649 keys with a context bar; the CSV writes 40 of them with the bar.

- Each of the 40 bar rows is "extra", because no expected pair carries a bar.
- 22 of the 40 then leave their bar-free pair with no row at all: those are the 22 "missing".
- The other 18 happen to be covered by an unrelated CSV row with the same bare English and the same Spanish (for example
  "Draft,Borrador" at csv:2539 covers "Draft|quote"), so they are not reported missing.
- **The Spanish agrees in all 40.** Every bar row's Spanish equals the table's Spanish for that exact key.
- (c) **Pairs present in both whose Spanish differs: none.** With the bar cut off on both sides, every English has the same set
  of Spanish words in the table and in the CSV (a node comparison over both files, 0 set differences).
- The CSV's two rows beyond 4,689 are a second row for a key already listed, for a second place it is used: csv:3824
  "All,Todas" (Issues, Client requests; the table's "All|requests", words.js:2121) and csv:3843 "Approved,Aprobada" (Issues, a
  request's window; "Approved|request", words.js:2126 or "Approved", words.js:180). Harmless for the comparer.
- The fix is one of: cut the `|context` from the 40 CSV English cells (lines below), or have the comparer cut it on the CSV side
  too. Either makes missing and extra 0 (checked with a node comparison). The run today fails `house-style/the-table-and-the-csv-agree`,
  and audit/known.json holds one entry (a Help insights case), so it is not listed there.

#### The 40 CSV rows (key, Spanish folded, the key's line in words.js, and whether the bare pair is covered elsewhere)

Every one has the same Spanish in words.js. "MISSING" marks the 22 that are the contract's missing pairs; the 40 lines are all
the extra pairs.

1. csv:2820 `Valid until|quote` = Valida hasta, words.js:2931, MISSING
2. csv:2821 `Sent|quote` = Enviada, words.js:2932, MISSING (CSV has "Sent" only as Enviados/Enviado, csv:2339, 2540, 4512)
3. csv:2822 `Draft|quote` = Borrador, words.js:2933, covered by csv:2539, 4049
4. csv:2823 `Accepted|quote` = Aceptada, words.js:2934, MISSING
5. csv:2824 `Declined|quote` = Rechazada, words.js:2935, covered by csv:3836
6. csv:2825 `Void|quote` = Anulada, words.js:2936, MISSING
7. csv:2831 `days|unit` = dias, words.js:2942, covered by csv:2604
8. csv:2832 `hours|unit` = horas, words.js:2943, covered by csv:2632
9. csv:2833 `months|unit` = meses, words.js:2944, MISSING
10. csv:2898 `Office|people` = Oficina, words.js:3011, MISSING
11. csv:2909 `Current|clearance` = Vigente, words.js:3022, covered by csv:4149
12. csv:2910 `Expiring|clearance` = Por vencer, words.js:3023, MISSING
13. csv:2911 `Expired|clearance` = Vencida, words.js:3024, covered by csv:4145
14. csv:2912 `Missing|clearance` = Falta, words.js:3025, covered by csv:4144
15. csv:2913 `Done|review` = Hecha, words.js:3026, covered by csv:3834
16. csv:3066 `Review|inspection` = Revision, words.js:3179, MISSING
17. csv:3129 `Draft|warning` = Borrador, words.js:3242, covered by csv:2539, 4049
18. csv:3130 `Issued|warning` = Emitida, words.js:3243, MISSING
19. csv:3131 `Closed|warning` = Cerrada, words.js:3244, covered by csv:3835, 4174
20. csv:3176 `Issue|warning` = Emitir, words.js:3295, MISSING
21. csv:3188 `Archived|projects` = Archivados, words.js:3307, MISSING
22. csv:3189 `Archived|post` = Archivada, words.js:3308, MISSING
23. csv:3302 `Green|color` = Verde, words.js:3459, MISSING
24. csv:3474 `Clear|clearance band` = Al dia, words.js:3631, MISSING
25. csv:3475 `Notice|clearance band` = Aviso, words.js:3632, MISSING
26. csv:3476 `Follow up|clearance band` = Seguimiento, words.js:3633, covered by csv:3758
27. csv:3477 `At risk|clearance band` = En riesgo, words.js:3634, MISSING
28. csv:3478 `Expired|clearance band` = Vencida, words.js:3635, covered by csv:4145
29. csv:3573 `Retired|equipment` = Dado de baja, words.js:3730, covered by csv:3772, 3984
30. csv:3574 `Checked|equipment` = Revisado, words.js:3731, MISSING
31. csv:3579 `Moved|equipment` = Trasladado, words.js:3736, MISSING
32. csv:3611 `All|periodic` = Todo, words.js:3768, covered by csv:1986
33. csv:3612 `Overdue|periodic` = Vencido, words.js:3769, MISSING
34. csv:3613 `Due|periodic` = Pendiente, words.js:3770, MISSING
35. csv:3614 `Done|periodic` = Hecho, words.js:3771, covered by csv:4503
36. csv:3616 `By|done by` = Por, words.js:3773, covered by csv:226
37. csv:3655 `On|link` = Encendido, words.js:3798, MISSING
38. csv:3656 `All|links` = Todos, words.js:3799, covered by csv:35 and others
39. csv:3657 `State|link` = Estado, words.js:3800, covered by csv:1543
40. csv:3698 `No change|trend` = Sin cambio, words.js:3841, MISSING

#### The 22 missing pairs as the comparer prints them (bare English, Spanish folded)

Valid until = Valida hasta; Sent = Enviada; Accepted = Aceptada; Void = Anulada; months = meses; Office = Oficina;
Expiring = Por vencer; Review = Revision; Issued = Emitida; Issue = Emitir; Archived = Archivados; Archived = Archivada;
Green = Verde; Clear = Al dia; Notice = Aviso; At risk = En riesgo; Checked = Revisado; Moved = Trasladado;
Overdue = Vencido; Due = Pendiente; On = Encendido; No change = Sin cambio.

### 2. Every Spanish word for a written warning

Two words are in use. The table and the CSV agree with each other on every key below (section 1).

#### "advertencia" (words.js, same Spanish in the CSV)

Disciplinary sense, each with the line that draws it:

- words.js:3181 "Issue a warning" = Emitir una advertencia (csv:3068; App.js:23265, 23437, case window App.js:24413)
- words.js:3182 "Verbal warning" = Advertencia verbal (csv:3069; fallback step word, App.js:23126, 23142; evidence pack App.js:11322)
- words.js:3183 "Written warning" = Advertencia por escrito (csv:3070; same places)
- words.js:3184 "Final written warning" = Advertencia final por escrito (csv:3071; same places)
- words.js:3194 "A warning already given on the old form, ..." (csv:3081; App.js:23396)
- words.js:3199 "A verbal warning is a note of the conversation, ..." (csv:3086; App.js:23303)
- words.js:3213 "Language of the warning" = Idioma de la advertencia (csv:3100; App.js:23295)
- words.js:3219 "Signing confirms they received this warning. ..." (csv:3106; App.js:23307)
- words.js:3224 "Optional. What the person says, recorded on the warning." (csv:3111; App.js:23316)
- words.js:3225 "Warning issued." = Advertencia emitida. (csv:3112; App.js:23233)
- words.js:3227 "The warning as the person receives it, ..." (csv:3114; App.js:23366)
- words.js:3238 "The warning stays on the record, marked rescinded." (csv:3125; App.js:23357)
- words.js:3239 "Warning rescinded." = Advertencia anulada. (csv:3126; App.js:23250)
- words.js:3245 "No warnings on record." (csv:3132; App.js:23443)
- words.js:3246 "Every warning on record, newest first. ..." (csv:3133; App.js:23899)
- words.js:3247 "The warnings you issued, newest first. ..." (csv:3134; App.js:23899)
- words.js:3254 "No warnings match." (csv:3141; App.js:23916)
- words.js:4599 "Warning|signature" = Advertencia (csv:4386; SIGN_KINDS, App.js:28017)
- words.js:4770 "Warning|case log" = Advertencia (csv:4549; App.js:23997)
- words.js:4780 "A warning was issued from this case." (csv:4559; App.js:24020)

Other senses, also "advertencia", for completeness: words.js:653 (Jotform Full Refresh caution, csv:614), words.js:2964 (a
quote check, csv:2853), words.js:4233 "Warning|block" (a lesson block kind, csv:4074). words.js:859 and words.js:2767 use
"Aviso" for a non-disciplinary warning.

#### "amonestacion"

- words.js:3870 "Warnings issued, by step" = Amonestaciones emitidas, por paso (csv:3727)
- words.js:3871 "Warnings" = Amonestaciones (csv:3728)
- Both are used once, on the management review evidence pack, agenda item 8 (App.js:11322). The same table's rows are
  `tr(WARNING_STEP_WORDS[s])`, which read "Advertencia verbal", "Advertencia por escrito", ... So one printed table is headed
  "Amonestaciones" and its rows say "Advertencia".

#### The step names the screen actually draws

- The Step picker, the window's heading, the Discipline table and its CSV export draw `warningStepWord` (App.js:23142): the
  label GET /api/discipline/steps sends, and the table's word only when the API sends none.
- The API's labels, as the stub copies them (audit/pictures-stub.js:1262-1266) and as guide/check-allow.txt:108-113 lists
  them: "Amonestacion verbal", "Amonestacion por escrito", "Amonestacion final por escrito", "Terminacion del empleo".
- The table's fallbacks say "Advertencia ..." (words.js:3182-3184) and "Despido" for Termination (words.js:3185, csv:3072).
- The guide writes the steps with "Amonestacion" (guide/APP-DASHBOARD.md:1382, 1396, 1413) and every other warning word
  with "advertencia" (guide:172, 1381, 1385, 1387, 1425, 1450, 1477).
- So on a Spanish screen the warning window is headed "Emitir una advertencia" while its Step picker offers
  "Amonestacion verbal"; and Termination reads "Terminacion del empleo" from the API and "Despido" from the table.
  HR-018's approved term decides which of the two words, and the API's helpers/discipline.js holds the other half.

### 3. Keys with no Spanish, and French

- **Literal keys: none without Spanish.** `keyCheck()` (audit/lib/words.js:203-235) finds 7,047 tr/trn calls with a written key
  in src/App.js and 0 whose key lacks Spanish (check `house-style/every-tr-key-has-an-entry` passes). The same walk over the
  other src files: src/InstallPrompt.js 8 keys, src/index.js 2 keys, 0 missing; the other files call neither.
- No tr() is handed a count entry, and no trn() a missing one .
- **Keys built as the page runs.** src/App.js has 237 tr/trn calls whose key is an expression. For the ones that index a
  top-level table (`tr(MAP[k])`, or `tr(x.l)` inside `MAP.map(...)`), a read of 62 tables (RL, CIMS_LABELS, WARNING_STEP_WORDS,
  LEAVE_TYPE_WORDS, HR_CATEGORY_OPTS, CLEARANCE_KINDS, TRAINING_LANGUAGES, SIGN_KINDS, ...): every value has Spanish. 0 found.
- **The finder** (audit/lib/strings.js, run read-only) reads 84 strings as untranslated English. Every one that is a word has a
  Spanish entry and reaches the screen through tr() where it is drawn (for example ROSTER_FILTERS App.js:1887-1890 through the
  chip helper, App.js:1953; KEPT_FORMS titles App.js:10148-10157 through keptPageHtml, App.js:10205-10238; EQUIPMENT_ACTIONS
  App.js:10936-10941 through tr(a.l), App.js:10986). The rest are not words: CSS (App.js:3025), a query string (App.js:5089,
  27705), a form code (App.js:14332), a console line (App.js:1308), an SVG placeholder (App.js:26881), and the language's own
  name (App.js:12355). Harness note: audit/count.js counts 198 places on 13 pages taken as done, so
  `house-style/a-page-taken-as-done-reads-no-english` (audit/cases/house-style.js:87-90) would fail on these false positives;
  the finder does not follow a label through a helper such as `chip` or `keptPageHtml`.
- **French entries: 0.** No WORDS entry carries `fr` (LOCALES is en and es, src/words.js:16); the CSV has no French column
  (header English,Spanish,Where it appears, csv:1). French appears only as data a person types or picks: App.js:7094, 12355,
  25106, 25765, 25888, 25922, 26590, 26591 (8 places, count only).

## Appendix: the guide against the screen (part 7) and the Reports ticket (contract 4)

### 4. Guide entries whose steps no longer match the screen

guide/APP-DASHBOARD.md holds 215 entries. I walked about 75, all of the priority areas (Staff, Schedule, Time off, Reports,
Sites, Training, HR Records, Cases, Discipline, Forms) and Find a page. A script also checked every `**English** (**Spanish**)`
pair's English against the strings src/App.js writes: all are present, so the drift below is in the steps, the routes and the
"Who can do this" lines, which guide-check does not read.

#### 4.1 Supervisors and HR Records (19 entries, the largest group)

Since 786398a (part 332, 2026-10-13), HR Records opens only when the API does not answer read_hr_records false
(App.js:619, 665); without it #hr draws "This page is for admins." (App.js:1269, 414). Contract 1 gives supervisors no
read_hr_records. Training has its own side panel item (App.js:1004, render App.js:1272), which shows the Training area with
no HR tabs (App.js:24707, `!trainingPage`). Each entry below says supervisors can do the task, and its first step goes through
HR Records:

| Entry (guide line) | Last checked | Step that no longer matches (guide line) | Screen as built |
|---|---|---|---|
| Add a training record (191) | 2026-10-07 | 1-3: HR Records, the person's folder or the Training tab (193-195) | Training item, App.js:1004; + Add Training App.js:24814 |
| Set up and check off an onboarding checklist (202) | 2026-10-07 | 1-2: HR Records, Onboarding tab (204-205) | Onboarding is an HR Records tab only, App.js:24683; Training hides the tabs, App.js:24707. No route for a supervisor |
| Log training for several people at once (506) | 2026-10-07 | 1: HR Records, then Training (508) | Training item App.js:1004; button App.js:24813 |
| See who has no record of a training (521) | 2026-10-07 | 1: HR Records, then Training (523) | as above; section App.js:25501 |
| Print a training attendance sheet (532) | 2026-10-05 | 1: HR Records, then Training (534) | as above; App.js:25517, 26152 |
| See training gaps by role and site (2023) | 2026-10-07 | 1 (2025), and 7 points at the folder (2031) | Gaps tab App.js:24690 under Training |
| Run a training session people sign on their phones (2079) | 2026-10-05 | 1 (2082) | Sessions tab App.js:24690 |
| Upload a training certificate from an outside course (2095) | 2026-10-06 | 1 (2097) | Gaps tab App.js:24690 |
| See who signed a document, and say who must sign it (2107) | 2026-10-07 | 1 (2109) | Documents to sign tab App.js:24690 |
| Record a person's school clearances (1127) | 2026-10-07 | 1: HR Records, or the person on Clearances (1129) | Both open #hr/<id>/clearances (App.js:22632, row click App.js:22865), refused at App.js:1269. A supervisor cannot reach it either way |
| Correct a clearance date entered wrongly (1139) | 2026-10-01 | 1 (1141) | same as above |
| Issue a verbal warning (1378) | 2026-10-07 | 1 (1380); step 2's Cases path still works | Discipline has no Issue a warning (DisciplinePage App.js:23860-24226); the case window has it, App.js:24413 |
| Issue a written or final written warning (1393) | 2026-10-06 | 1 (1395), and no other path named | as above |
| Issue PPE to someone (1705) | 2026-10-07 | 1, the folder half (1707); the Sites half works | folder in HR Records only |
| Issue company property and mark it returned (2121) | 2026-10-07 | 1 (2123) | folder in HR Records only |
| Send something to a person's phone to sign (2202) | 2026-10-06 | 1, the folder half (2204) | as above |
| See what is waiting for a signature (2214) | 2026-10-06 | 1: HR Records, Waiting for signatures (2216) | The tab is an HR Records tab only (App.js:24686); #training always maps to the training tab (App.js:888, 24456). Contract 1 says supervisors keep it; on this screen they lose it. A screen finding as well as a guide one |
| Find a person's signed acknowledgment page (2356) | 2026-10-07 | 1 (2358) | folder in HR Records only |
| Add a certification to a staff member (154) | 2026-10-07 | Who line (155): "anyone else who can open Staff Management"; step 1 (156) | Supervisors open Staff Management (App.js:663, manage_staff); Open HR file shows only where HR Records opens (App.js:2497, canOpenHr App.js:1266) |
| Open a person's HR file from Staff Management (2300) | 2026-10-07 | Who line (2301); step 2 (2303) | same as above |

#### 4.2 Other steps that no longer match

| Entry (guide line) | Last checked | Step that no longer matches | Screen as built |
|---|---|---|---|
| Find a page (47) | 2026-09-27 | 3 (51): "supervisors do not see Staff Management, Cases or Settings" | Staff Management shows on manage_staff (App.js:663, 999) and Cases on manage_cases (App.js:618, 664, 1007), both a supervisor's in contract 1; HR Records is the page they lose (App.js:619, 1000) |
| Approve or deny a request to drop a shift (299) | 2026-09-17 | 3 (303): "Click Approve ... or Deny" | A Requests row has no buttons (row actions are for claimed, approved and open shifts, App.js:13777). The row opens the Shift Drop Request window: the button reads **Approve Drop** (App.js:14184), beside Deny (App.js:14178), and a third way, **Reassign To** with **Assign** (App.js:14162-14171), is not in the entry |
| Find training on the dashboard (2136) | 2026-10-13 | 2 (2139) lists seven tabs | The area also has **Time** and **Matrix** (App.js:24690, words.js:4628, 4638), each with its own entry (guide:2251, 2263) |
| See periodic work across every site (1755) | 2026-10-07 | 2 (1758): "Every site's ... checklist items are listed" | Since 338 (cb78ff0, 2026-10-13) a site whose task list is kept as a record is left out (App.js:11064); the later entry says so (guide:2535) |
| Run a report (417) | 2026-09-28 | 4 (422) and the words line (423) | See section 5 |

#### 4.3 "Who can do this" lines that say admins where the screen offers more

Since 332, Staff Management opens for a supervisor, and these controls are gated by the rank rule `canChange`
(App.js:2023-2027), which lets a supervisor act on staff ranked below them, and not by manage_employment:

- Reset a staff member's PIN (guide:120, 2026-10-07): Who line guide:121 says admins; Reset PIN and Send a PIN reset link
  show with canChange (App.js:2500-2501).
- Assign a staff member to a site (guide:143, 2026-10-07): Who line guide:144 says admins; the Assign button has no gate
  (App.js:2596).
- See whether a person can sign in, and unlock them (guide:2276, 2026-10-07): Who line guide:2277 says admins; Unlock shows
  with canChange (App.js:2498).

Either the guide or the screen is wrong for these three; the API audit says which (the routes' own capability checks).

#### 4.4 Format drift guide-check does not catch

145 bold screen names in 39 entries are written in English alone although the CSV has their Spanish, for example
**Pending** and **Approve** (guide:104-105), **Schedule Shift** (guide:246), **Save**, **Staff**, **Pickup** and
**Confirm Convert** (guide:291-293), **Requests**, **Approve** and **Deny** (guide:302-303), **Needs response**,
**Take this case**, **Save changes** and **Release** (guide:165-173), **Who has no record** and **Pick a training...**
(guide:524, 535). guide/README.md asks for every such name as `**English** (**Spanish**)`; guide-check checks only the pairs
that are written. The full list was made with a node script over the guide and the CSV.

#### What was checked and still matches (sample)

Add a staff member (86), Edit a staff member's information (109), Deactivate or reactivate (132), Respond to a Speak Up case
(163), Add an HR document (179), Schedule a shift (243), Schedule a shift that repeats (257), See or change a weekly pattern
(270), End a weekly pattern (280; End pattern and Last day at App.js:12491-12496), Change or cancel a scheduled shift (288),
Post an open shift (309; App.js:14077-14102), Approve a shift someone claimed (319; App.js:13777), Approve or deny a time off
request (480), See past time off requests (496), Add a site or change its details (428), Name a site's shifts and their
blocks (992), Mark a checklist item as a touchpoint (1768), Keep a site's task list as a record only (2531), Read a filed
report (631) and the Forms entries to 778, Pay phone training time (2251), Show the assessor who is trained (2263), Open a
case (1468), Send a warning (1422), Rescind a warning (1446), See every warning (1456), See how clients rated a site (943),
Make and send the monthly report (955), Pick a person (2288), Search the chat records (1620).

### 5. The Reports ticket: "how do I delete a report"

What Reports offers (ReportsPage, App.js:11403):

- Saved reports are listed in groups by category (App.js:11481-11484) as cards, each with a badge: **Template** (Plantilla,
  csv:1633) when `is_system`, **Custom** (Personalizado, csv:377) otherwise (App.js:11624).
- Every card has **Run** (App.js:11631) and **Duplicate** (App.js:11632). **Edit** (App.js:11633) and **Deactivate**
  (App.js:11634) show only when `!d.is_system`. So a built-in template has Run and Duplicate only, and a custom report has
  Run, Duplicate, Edit and Deactivate. Confirmed.
- **Nothing can be deleted.** Deactivate asks `Deactivate "{0}"?` and sends DELETE /api/report-engine/definitions/<id>,
  then says "Report deactivated" (App.js:11476-11480). The report editor has Cancel (App.js:10064) and Save changes or Create report (App.js:10135),
  and no delete. ReportsPage has no way to list or bring back a deactivated report (no Reactivate, Restore or inactive filter in
  App.js:11403-11765).
- Duplicate copies a template's name ("{0} (copy)"), description, category, source and config into the editor as a new
  custom report (App.js:11475), which can then be edited or deactivated.
- The fixed groups above the saved reports (Client reports, Safety records, Kept records, Management review) have **Open**
  only (App.js:11598, 11606-11609); Management review is for admins (App.js:11585).
- The "two Issues headings" the chat fixed in the data can come back from code: groups are keyed by the raw category
  (App.js:11483) and headed by `reportCategoryWord`, which draws "Issues" and "Service delivery" (any case) as the same word
  (App.js:8590, 8594). Two raw spellings give two groups with the same heading.

The guide entry: **Run a report (admin dashboard)**, guide/APP-DASHBOARD.md:417-427, Last checked 2026-09-28.

- Step 4 (guide:422) says "A report you no longer need is deactivated with **Deactivate** (**Desactivar**); nothing is
  deleted." It does not say that Deactivate (and Edit) show only on a **Custom** (**Personalizado**) report, that a
  **Template** (**Plantilla**) shows Run and Duplicate only, that a template is changed by duplicating it, or that a
  deactivated report cannot be brought back from the page.
- The words line (guide:423) is about running and exporting only: "hours worked, labor report, payroll numbers, export data,
  who worked when, csv, spreadsheet". It lacks "delete a report", "remove a report", "get rid of a report", "delete a
  template", "deactivate a report", "edit a template", "borrar un informe".
- The title is about running a report, so a question about deleting has little to match. A separate short entry such as
  "Remove a report you no longer need" (Who, the Custom and Template cases, Deactivate, nothing is deleted, no undo on the
  page) would answer the ticket; per guide/README.md a new entry goes at the end of the file.
