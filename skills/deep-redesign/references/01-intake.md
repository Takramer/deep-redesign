# Phase 1. Intake

Goal: know the current site, the owner and the readers well enough that every later decision can point to a line in a file.

Outputs: `inventory.md`, `copy-verbatim.md`, `brief.md` (questions), `answers.md` (the owner's words and rules), `ledger.md` (every number and claim the site may state).

## 1. Record the current site before judging it

Do this first, cold, with no opinions written down yet.

1. **Every page.** Pull the sitemap, then follow every link from the home page and the footer. List each URL, its title, its H1 and what it is for. Note pages that exist but nothing links to.
2. **Copy, verbatim.** Dump the visible text of every page into `copy-verbatim.md` exactly as it reads (`scripts/reader.mjs text <url>`). Paraphrase loses the owner's voice, and the voice is often the best part of the old site.
3. **Assets.** Every image, video and file: where it lives, its size, whether a page uses it. Big unused files are common and cost every deploy.
4. **Measurements.** Largest paint on a throttled phone, layout shift, script weight, page weight. Run `scripts/widths.mjs` and `scripts/fallbacks.mjs` against the old site too: the failures become a regression list the new site must beat.
5. **Defects.** Broken links, wrong numbers, dead buttons, text in images, missing alt text, contrast fails. Write them as a numbered regression list.
6. **How readers arrive.** Analytics if there are any. If not, infer from the owner's situation (a resume link, a social post, a search) and label it inference.

## 2. One question round with the owner

Send every question at once, grouped, with a default answer for each so the owner can reply "default" and move on. Use `templates/brief.md`. The groups that matter most:

- **Goal.** What must a visitor do or believe after one minute? Who are the two or three readers that matter most?
- **Proof.** What work exists, what can be shown, what is under NDA, which numbers are real and where is the source for each?
- **Taste.** Three sites they love and why, three they dislike and why, five words for how the site should feel and three it must never feel like. A dozen words from the owner, written down, settle more arguments than any research file.
- **Limits.** Platform, budget, hosting, licenses, fonts they own, time.
- **Voice.** First or third person, words they never use, punctuation rules, a sample of writing they like.
- **Hard no's.** Features, colors, patterns they never want.

Write the answers into `answers.md` in the owner's own words. Give each a number. Later decisions cite the number.

### Keep a "Never again" list

When the owner rejects something during the build, add it with the date and the reason, at the top of `answers.md`:

```
- Never a dark theme (removed <date>: doubled the visual work, no reader asked for it).
- Never a motion on/off switch; the system setting decides alone (<date>).
- No drawn device frames; real manufacturer bezels only (round <N>).
```

Every new session reads this list before proposing anything. A rejected idea coming back three rounds later is the fastest way to lose an owner's trust.

## 3. The readers

Most sites are a second step: the reader arrives holding something (a resume, an ad, a search result, a referral) that made a claim. The first screen must confirm that claim fast, then let each reader go as deep as they want.

Who the readers are depends on what the site is for. Run the `persona-researcher` agent once the owner's answers are in: it names the site type and the one action the site exists for, picks the five personas that matter for that kind of site, researches each on the web with sources, and writes a profile and a simulated-reader agent for each. The method and the starting table by site type are in [personas.md](personas.md). The owner's named readers outrank the table.

Each profile covers:

- **Time and layers.** What they decide in the first few seconds, in about 30 seconds, in about five minutes. Find these figures for the actual reader type through research (the persona researcher does this, see below). Mark which figures are studies and which are folklore; many widely quoted numbers have no study behind them.
- **What moves them forward and what makes them leave.** With sources.
- **How they navigate.** Desktop or phone, scanning or reading, mouse or keyboard or screen reader.
- **What they need to act.** Contact, a resume, a live product, a price.
- **Testable checks.** Five to eight yes/no checks that a test can run. These become the simulated readers' tasks in phase 5.
- **Their words.** The terms they search with. These feed the SEO and AEO audits.

Give one of the five personas a screen reader and another browser zoom of 200 to 400%, even when the owner does not name them. They catch what everyone else misses, and accessibility that can be checked is rare: WebAIM's 2026 survey found automated WCAG failures on 95.9% of home pages.

## 4. The ledger

Before any copy is written, build `ledger.md` from `templates/ledger.md`: every number, date, client name, result and claim the site may state, each with its source and the date it was checked, sorted into three lists.

- **Safe to state.** Checked against the source artifact.
- **Settle first.** Conflicting sources, or no source yet.
- **Never claim.** Things that are untrue, unprovable, or that the owner does not want said.

Typical catches: a headline number ten times higher than the real artifact shows, a count that differs across three documents, a past result rounded up past the truth. All of them tend to be live on the old site already, copied from page to page.

## 5. Sensitive facts

Some facts help and hurt at once (a disability, a career gap, a pivot). Research how readers respond, state the finding plainly, and let the owner decide placement. One rule that works: "method, never appeal". State the fact once, tie it to how the work gets done, and let the site's own behavior prove it.

## Done when

- The old site is recorded, measured and has a regression list.
- The owner has answered one full question round.
- Each reader type has a profile with testable checks.
- The ledger exists and has no unsettled item that the plan depends on.
