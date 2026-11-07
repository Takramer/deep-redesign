---
name: deep-redesign
description: Run a full, research-led website redesign the way a senior design engineer would, from audit to launch to proof. Use when someone wants to redesign, rebuild or seriously improve an existing site (portfolio, studio, product, small business), when they ask to "analyze my site and make it better", or when a redesign needs research, testing and audits instead of a new coat of paint. Covers intake of the current site and the owner's wishes, multi-track research with sources, synthesis into rules and gates, A/B builds on review branches, automated and simulated-reader testing, SEO, AEO, accessibility and performance audits, and live-site parity. Not for a one-off component tweak.
---

# Deep redesign

A redesign fails in three common ways: it copies a look instead of answering the readers, it ships claims nobody checked, and it is judged only by the person who built it. This skill exists to prevent all three. It distills a full, real rebuild (a platform move, many review rounds, dozens of research files, a five-gate rule set and a test harness) into a method that works on any site: a portfolio, a SaaS product, a shop, a local business, a nonprofit.

The method has six phases. Each phase ends with a file on disk, so a fresh session can pick up from the files instead of from chat history.

| Phase | Output | Reference |
|---|---|---|
| 1. Intake | `brief.md`, `answers.md`, `inventory.md`, `ledger.md` | [references/01-intake.md](references/01-intake.md) |
| 2. Research | `research/NN-topic.md` files, `research/_implications.md` | [references/02-research.md](references/02-research.md) |
| 3. Synthesis | `synthesis/` direction, gates, plan with IDs | [references/03-synthesis.md](references/03-synthesis.md) |
| 4. Build | review branches, previews, films, one report per round | [references/04-build.md](references/04-build.md) |
| 5. Test | automated gates, simulated readers, a real-reader kit | [references/05-testing.md](references/05-testing.md) |
| 6. Audit | SEO, AEO, accessibility, performance, truth, live parity | [references/06-audits.md](references/06-audits.md) |

Field notes (traps that recur, and the rule each leaves behind): [references/07-field-notes.md](references/07-field-notes.md). How to run this with agents without burning money or context: [references/08-running-it.md](references/08-running-it.md).

Who the site is for decides everything else, so readers are researched, not assumed: [references/personas.md](references/personas.md) explains how the `persona-researcher` agent picks five personas for the kind of site (recruiters for a portfolio, buyers and evaluators for SaaS, shoppers for a store) and turns each into its own simulated-reader agent.

Read a reference when you enter its phase, not all at once.

## Operating rules

These hold in every phase. They come from mistakes that actually happened.

1. **Ask everything up front, then run long.** One question round at intake, written to `answers.md`. After that, do not stop to ask; build options instead and let the owner pick at the end of the round.
2. **The owner picks from what they can see.** A film, a still, a live preview. Never from a description. Build A and B on review branches when a choice is open.
3. **Every claim has a source or a label.** Facts carry a source and a date. Guesses carry the word "inference". Numbers on the site come from one ledger (`ledger.md`), checked against the real artifact. A precision brand that ships a wrong number has no defense.
4. **Measure, don't assert.** "Faster" means a number before and after, on a throttled phone. "Accessible" means it passed script off, reduced motion, 400% zoom and a keyboard path, in three engines.
5. **Rules the owner sets are permanent until the owner lifts them.** Record each with its date in `answers.md` under "Never again". Never re-add a rejected feature because a new source likes it.
6. **The lazy ladder.** Before building anything: does it need to exist, does the codebase already have it, does the platform do it (CSS over JS), can it be one line. Only then write code. Climb the technique ladder only when the rung below fails: CSS, then a little script, then one small library, then the GPU.
7. **The builder is not the judge.** Automated checks prove layout and fallbacks. Simulated readers find friction. Only real readers prove the site works. Say which kind of proof you have, in those words.
8. **Live is the truth.** The deployed site, not the local build, is what readers get. CDNs rewrite pages, caches hold old share cards, env vars differ. Check the live site after every deploy.

## The loop inside each round

```
read the handoff page and the last progress entry
  -> pick the items for this round from the plan (by ID)
  -> build each on its own review branch (A/B where a choice is open)
  -> run the gates (scripts/) in chromium, webkit, firefox
  -> push branches for previews; record films or stills
  -> one report: what landed, links, check output, questions with their choices
  -> owner picks -> merge -> deploy -> check live parity
  -> write one progress entry and update the handoff page
```

## Scripts

Each script takes a target first: a URL (local preview, branch preview, live site) or a build folder, which it serves itself so the check always reads the build you just made. Pages come from the arguments after the target, else from `sitemap.xml`. They need Node 18+ and Playwright. The scripts folder carries its own `package.json`: run `npm install && npx playwright install` in it once, and every script finds Playwright from any folder. A Playwright already installed in the site's folder wins. `BROWSER=webkit` or `firefox` switches engines. Each prints one line per failure and exits 1 on any failure, so it can gate a merge. Shared code is in `scripts/lib.mjs`; it and `motion-trace.mjs` carry self-checks (`node lib.mjs`, `node motion-trace.mjs --self-check`).

| Script | What it checks |
|---|---|
| `scripts/widths.mjs` | No sideways scroll at 11 widths from 320 to 1920, scrolled top to bottom with real scrollbars; optional selectors that must hold one line; first-screen stills |
| `scripts/fallbacks.mjs` | Script off, reduced motion (nothing still moving after 2 s), 400% zoom (a 320 by 200 view); no image left hidden by a reveal that waits for script |
| `scripts/keyboard.mjs` | Tab through each page: every stop has a name, a visible focus ring and is on screen; no focus trap |
| `scripts/reader.mjs` | The tool simulated readers use: visible text, accessibility tree, headings and landmarks, links, tab path, reflow at a width, screenshots |
| `scripts/crawler-view.mjs` | Fetch each page as search (Google, Bing), share-card (LinkedIn, X, Facebook), answer-engine (OpenAI search, Claude search, Perplexity) and training crawlers: status, title, description, canonical, one h1, share-card tags, JSON-LD types, main text without script, CDN email rewrites, robots.txt per crawler. Blocking a training crawler is a note; blocking any other kind fails |
| `scripts/live-parity.mjs` | Compare a local build with the live site page by page; report what differs and name known CDN rewrites (email obfuscation, injected beacons) |
| `scripts/dead-assets.mjs` | Files in a build folder that no page, stylesheet or script references, with their total size |
| `scripts/motion-trace.mjs` | Sample one value per frame during a moment and compare its run time and curve with a spec in `motion-spec.json` |

## Agents

| Agent | What it does |
|---|---|
| `persona-researcher` | Names the site type and its one action, picks five fitting personas, researches each with sources, writes `personas/<slug>.md` and a ready agent at `.claude/agents/reader-<slug>.md` |
| `simulated-reader` | Generic reader: give it a profile path and a URL; it reads the site as that persona and writes a report |

In the plugin they install with the skill. Installed by hand, copy `agents/` to `~/.claude/agents/`.

## Bundled tools

One install brings what the method leans on:

| Tool | Used for | Where |
|---|---|---|
| `humanizer` skill | The copy pass in phase 3 and every report: strips generated patterns, matches the owner's voice from a sample of their writing | `skills/humanizer` (MIT, by Siqi Chen) |
| Playwright MCP server | Hands-on browsing while building and reviewing: screenshots at real viewports, page state, clicking through a flow | `.mcp.json` in the plugin, runs `npx @playwright/mcp` |
| Playwright library | The eight scripts | `scripts/package.json` |

Design-taste skills (motion, interface polish, visual critique) help in phase 4 if you have them, but they are not bundled: use whichever the project already trusts.

## Templates

`templates/` holds the files the phases produce, ready to fill: the intake questions, a research file, the implications digest, the numbers ledger, the motion spec, the real-reader test kit, a reader profile, a simulated-reader agent, a round report and a progress entry.

## Where to start

0. Once per machine: `npm install && npx playwright install` in this skill's `scripts/` folder.
1. Make a working folder beside the site (for example `redesign/`), copy `templates/brief.md` into it, and read [references/01-intake.md](references/01-intake.md).
2. Crawl and record the current site before forming any opinion about it.
3. Send the owner the full question list once. Then work.
4. When the answers are in, run the `persona-researcher` agent with the site URL. Research tracks start from its five personas.
