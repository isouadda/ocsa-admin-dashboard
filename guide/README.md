# The dashboard's Help guide

`APP-DASHBOARD.md` is the guide Help reads when someone asks how to do something on the admin
dashboard. Each entry is one task, written as the steps a person follows on screen. The file holds
the guide's active entries only. An entry retired on live stays retired and is not in the file.

## The format

- The first line reads `# APP-DASHBOARD | <Title>`.
- Each task starts with a line `## <entry title>` and runs to the next such line. Every title
  today ends with `(admin dashboard)`.
- An entry is written in this order:
  - `Who can do this:` and who may do the task. Every entry has it.
  - The numbered steps, `1.`, `2.` and on, one action to a step.
  - `If it does not work:` and what to do when it goes wrong, when there is something to say.
  - `Words people use for this:` and the words someone might ask with, in lower case, separated by
    commas, when there are some.
  - `Picture:` and the name of a picture of the screen, on a line of its own, when the entry has
    one; at most two lines, just before `Last checked:`. See Pictures of the screen below.
  - `Last checked:` and the day the steps were last checked against the app, as `YYYY-MM-DD`.
    Every entry ends with it.
- A name the screen draws is written in bold. When the screen has Spanish words for it, the name is
  written `**English** (**Spanish**)`, both read from `translation/dashboard_words.csv` exactly as
  that file has them. The English is the part of the key before any `|`.

## Pictures of the screen

Help draws an entry's pictures under its answer, so the person asking sees the screen the steps are
about (STEP276_CONTRACT.md, sections 1 and 3).

- A picture is two files in `public/guide-shots/`, `<name>.en.jpg` and `<name>.es.jpg`, the screen
  drawn in English and in Spanish. The app serves them at `/guide-shots/<name>.<lang>.jpg`.
- `<name>` is 1 to 60 of `a-z`, `0-9` and `-`, and says what the screen is, such as
  `training-catalog` or `property-issue-window`. A picture belongs to one entry.
- An entry names its pictures with `Picture: <name>` lines just before `Last checked:`, one or two,
  or none when the entry has no screen of its own. The guide sync keeps the lines out of the words
  Help reads, so adding one does not change the entry's steps, and its `Last checked:` stays.
- Pictures are taken by `npm run shots` (`audit/shots.js`), never by hand. It serves the `build/`
  that `npm run build` made against the audit's stub, so every name, site and number in a picture is
  invented, and opens each screen at 1280 wide in the light theme, once in each language. Each file is
  a JPEG of at most 250 KB: the quality is lowered first, and the picture is cut shorter only when the
  lowest quality is still too big.
- The script's `SHOTS` list names each picture, the entry it belongs to, and how its screen is
  reached: the address it opens, what it waits for, and what it presses or types there. The run holds
  the list to this file before it takes anything.
- `npm run shots -- <name>` takes one picture, `npm run shots -- "<entry title>"` an entry's,
  `--lang=en` or `--lang=es` one language, and `--missing` only the files not there yet.
- **Any pull request that adds or changes an entry reruns `npm run shots` for that entry's
  pictures**, and adds a picture to the list for a new entry with a screen of its own. Look at both
  files before committing them.

## How it reaches Help

- The file loads itself into Help on every merge to `main` that changes it, through
  `.github/workflows/guide-sync.yml`. The run proves who it is to the API with its own GitHub token,
  so no secret is kept anywhere. The job prints what the API wrote and the guide's fingerprint after.
- It can also be run by hand: Actions, Guide sync, Run workflow, on `main`. Tick Dry run to see
  what it would write without writing anything. The API refuses a run from any other branch.
- Entries are matched by title. An entry whose steps change is updated in place. Renaming a title
  retires the entry under the old title and adds a new one under the new title. An entry taken out
  of the file is retired on live. Nothing is ever deleted, and an entry brought back under its old
  title brings back the retired one.
- Removing more than three entries in one merge is refused by the API on purpose, so a stale or cut
  short file can never empty Help. When that many really go, the chat retires them by hand.
- A new entry goes at the end of the file. Help numbers a new entry after every entry it already
  holds, so adding at the end keeps the file's order the order Help numbers the entries in.

## The check on every pull request

`npm run guide-check` reads the file the way the sync does, and runs on every pull request through
`.github/workflows/guide-check.yml`. It fails, naming the line, when:

- the first line does not read `# APP-DASHBOARD | <Title>`;
- two entries share a title, or an entry has no title or no content;
- a `**English** (**Spanish**)` pair has no row in `translation/dashboard_words.csv` with exactly
  that English and that Spanish, unless `check-allow.txt` lists the pair;
- a line holds an email address or a phone number. This repository is public, so nothing here
  names a person, a site, a phone number or an email address;
- a `Picture:` line breaks the rules above: an entry names more than two, a name breaks the
  pattern, the line is not just before `Last checked:`, either language's file is missing or over
  250 KB, or two entries name the same picture; or a file in `public/guide-shots/` is named by no
  entry.

When a pull request changes `src/` and leaves `APP-DASHBOARD.md` as it was, the check writes a
warning that the guide may need an entry, and passes.

`check-allow.txt` lists the pairs the CSV cannot hold: a composition, such as a word from the CSV
with a count filled in, and the wording of a filed form, which the API's form catalog draws in the
screen's language. Pairs sit in blocks under a comment line saying why they are there, with Spanish
written as `\u` escapes so the file stays plain ASCII. The check names a listed pair the guide no
longer holds, so it can come out of the list.

## Fingerprint

A fingerprint is the md5 of the md5s of `title|content` for each active entry, in the order Help
numbers them. `npm run guide-check` prints the one it works out from the file, and after a sync that
writes anything, the fingerprint the sync answers matches it. Since the API's Step 276 keeps the
`Picture:` lines out of what it stores, the check prints a second fingerprint worked out with those
lines left out, which is what the stored rows give; the sync's answer matches one of the two. When
the file moved here, the live guide's fingerprint was:

```
cec00722eff735449cf7d10f1dfe9f5d
```

That is APP-DASHBOARD, the live Help guide on September 29 after block 272: 94 rows, 87 active. The
file holds the 87 active entries; the 7 retired ones stay retired on live.
