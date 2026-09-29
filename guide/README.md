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
  - `Last checked:` and the day the steps were last checked against the app, as `YYYY-MM-DD`.
    Every entry ends with it.
- A name the screen draws is written in bold. When the screen has Spanish words for it, the name is
  written `**English** (**Spanish**)`, both read from `translation/dashboard_words.csv` exactly as
  that file has them. The English is the part of the key before any `|`.

## How it reaches Help

- The file loads itself into Help on every merge to `main` that changes it. Nobody loads it by hand.
- Entries are matched by title. An entry whose steps change is updated in place. Renaming a title
  retires the entry under the old title and adds a new one under the new title. An entry taken out
  of the file is retired on live. Nothing is ever deleted, and an entry brought back under its old
  title brings back the retired one.
- Removing more than three entries in one merge is refused by the API on purpose, so a stale or cut
  short file can never empty Help. When that many really go, the chat retires them by hand.
- A new entry goes at the end of the file. Help numbers a new entry after every entry it already
  holds, so adding at the end keeps the file's order the order Help numbers the entries in.

## Fingerprint

A fingerprint is the md5 of the md5s of `title|content` for each active entry, in the order Help
numbers them. When the file moved here, the live guide's fingerprint was:

```
cec00722eff735449cf7d10f1dfe9f5d
```

That is APP-DASHBOARD, the live Help guide on September 29 after block 272: 94 rows, 87 active. The
file holds the 87 active entries; the 7 retired ones stay retired on live.
