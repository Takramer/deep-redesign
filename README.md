# deep-redesign

A Claude skill for redesigning a website the slow, careful way: audit what's there, ask the owner the right questions once, research with sources, turn the research into rules, build options the owner can see, test with scripts and simulated readers, then audit SEO, AEO, accessibility, performance and the live site.

It comes out of a full rebuild of my own site: a platform move, many review rounds, dozens of research files, a five-gate rule set and a test harness. The skill keeps the method, the checks and the mistakes, and leaves my site out. It works on any kind of site: a portfolio, a SaaS product, a shop, a local business, a nonprofit.

## What it does

The skill runs a redesign in six phases. Each phase leaves files on disk, so a new session can pick up from the files instead of a long chat.

1. **Intake.** Record the current site before forming an opinion: pages, speed on a throttled phone, accessibility, every number and claim it makes. Then send the owner one full round of questions (goal, readers, taste, facts, limits, how they want to review) and write the answers down, including a "Never again" list.
2. **Research.** Split the questions into tracks (readers, principles, competitors, technique, feasibility, accessibility, performance, search, content) and run them in parallel. Every finding carries a source, a date, and whether it was measured, stated by a source, or inferred. A second pass checks the claims the plan depends on.
3. **Synthesis.** Turn the research into a direction, five gates every change must pass, and a plan where each item has an ID. Moments of motion get a written spec (what moves, how long, on what curve, and what happens for readers who turn motion off).
4. **Build.** Ship plan items in rounds. Open choices get an A and a B on review branches with preview links and short films, because owners pick from what they can see, not from descriptions. One report per round.
5. **Testing.** Automated gates in three browser engines, simulated readers built from the audience research, and a kit for testing with five real people. The report always says which kind of proof it has.
6. **Audits.** SEO, AEO (answer engines and AI crawlers), share cards, accessibility, performance, a truth audit of every claim, and a check that the live site matches the build.

It also carries field notes: the traps that keep coming back in redesigns (wrong headline numbers, stale preview servers, a CDN rewriting the email address, bot settings that hide the site from answer engines) and the rule each one leaves behind.

## Readers are researched, not guessed

The skill ships two agents. `persona-researcher` reads the site and the owner's answers, works out what kind of site it is and the one action it exists for, and picks the five people who matter: recruiters and hiring managers for a design portfolio, a budget holder and a hands-on evaluator for SaaS, a first-time buyer and a comparer for a shop, someone with an urgent need on a phone for a local business. It researches each persona on the web, with sources and with folklore figures marked, then writes a profile and a ready simulated-reader agent for each into your project (`.claude/agents/reader-<persona>.md`). One persona always reads with a screen reader and another at 200 to 400 percent zoom.

Those five agents then read your site after every round, only through the reader tool and only by links they can see, and report Pass, Slow or Fail per task with the page text that decided it. `simulated-reader` is the generic version, for when you'd rather not add agents to the project.

## The five gates

Every change passes all five before it merges:

- **Access.** WCAG 2.2 AA, plus a working page with script off, at 400% zoom and by keyboard.
- **Fallbacks.** Nothing hidden behind a reveal that waits for script; nothing moving for readers who asked for less motion.
- **Brand.** One curve, one set of tokens, the accent color used as a marker, never as a fill. No scroll-jacking.
- **Budget.** Largest paint under 2.0 s, layout shift under 0.05, interaction delay under 200 ms on a throttled phone; script kept small and loaded only where it's used.
- **Taste.** Motion has to show something a still image can't. If it doesn't, it goes.

The skill tells the agent to set its own numbers with the owner. These are strong defaults.

## The scripts

Eight Node scripts, built on Playwright. Each takes a URL (a local preview, a branch preview or the live site) or a build folder, which it serves itself so it always checks the build you just made. Pages come from the arguments, or from `sitemap.xml`. Each prints one line per failure and exits 1 on any failure, so it can gate a merge.

| Script | What it checks |
|---|---|
| `widths.mjs` | No sideways scroll at 11 widths from 320 to 1920, scrolled top to bottom with real scrollbars; lines that must stay on one line |
| `fallbacks.mjs` | Script off, reduced motion, 400% zoom |
| `keyboard.mjs` | A Tab path through every page: names, visible focus, nothing hidden under a fixed bar, no trap |
| `reader.mjs` | The tool simulated readers use: text, accessibility tree, headings, links, tab path, reflow, meta tags, screenshots |
| `crawler-view.mjs` | What search, share-card, answer-engine and training crawlers each get, robots.txt per crawler, and CDN email rewrites |
| `live-parity.mjs` | The live site against the build, byte for byte for scripts and styles, with host rewrites named |
| `dead-assets.mjs` | Files in the build nothing references, and their size |
| `motion-trace.mjs` | One CSS value sampled every frame during a moment, checked against the motion spec, with and without reduced motion |

```bash
# once per machine, in the skill's scripts folder
cd ~/.claude/skills/deep-redesign/scripts && npm install && npx playwright install
# then from your site's folder
node ~/.claude/skills/deep-redesign/scripts/widths.mjs dist
node ~/.claude/skills/deep-redesign/scripts/crawler-view.mjs https://example.com
BROWSER=webkit node ~/.claude/skills/deep-redesign/scripts/fallbacks.mjs http://localhost:4321 / /about
```

`lib.mjs` and `motion-trace.mjs` have self-checks: `node lib.mjs` and `node motion-trace.mjs --self-check`.

## What one install brings

- The `deep-redesign` skill: the method, the references, the templates and the eight scripts.
- Two agents: `persona-researcher` and `simulated-reader`.
- The `humanizer` skill by Siqi Chen ([blader/humanizer](https://github.com/blader/humanizer), MIT), for the copy pass and for plain reports. It can match the owner's voice from a sample of their writing.
- The Playwright MCP server, for browsing the site by hand while building and reviewing.
- A `package.json` for the scripts, so Playwright installs in one place and the scripts run from any folder.

## Install

### Claude Code, as a plugin

```
/plugin marketplace add Takramer/deep-redesign
/plugin install deep-redesign@deep-redesign
```

Then, once, install Playwright for the scripts: `npm install && npx playwright install` inside the plugin's `skills/deep-redesign/scripts` folder (`find ~/.claude/plugins -path '*deep-redesign/scripts/package.json'` prints where it is).

### Claude Code, by hand

```bash
git clone https://github.com/Takramer/deep-redesign.git
cp -R deep-redesign/skills/deep-redesign deep-redesign/skills/humanizer ~/.claude/skills/
cp deep-redesign/agents/*.md ~/.claude/agents/
claude mcp add playwright -- npx -y @playwright/mcp@latest
cd ~/.claude/skills/deep-redesign/scripts && npm install && npx playwright install
```

For one project only, copy it to `.claude/skills/` inside that project instead.

### Claude apps

Zip the `skills/deep-redesign` folder and upload it under Settings, Capabilities, Skills. The scripts need a machine with Node, so in the apps the skill runs as a method and the checks run wherever you build the site.

### Other agents

`SKILL.md` is plain markdown with a short front matter. Agents that read skill folders (Codex, Cursor and others) can point at `skills/deep-redesign`.

## Using it

Ask for it in plain words:

> Redesign our product site at https://example.com. Start with the deep-redesign intake.

> Research the five readers who matter for https://example.com and run them against the site.

> Run the deep-redesign audits on https://example.com and tell me what fails.

The agent copies the templates into a working folder beside your site (`redesign/` by default), records the site, sends you the questions, and goes from there. You review one report per round.

## What's in the folder

```
agents/                 persona-researcher, simulated-reader
skills/humanizer/       bundled copy pass (MIT, see its UPSTREAM.md)
.mcp.json               Playwright MCP server
skills/deep-redesign/
  SKILL.md              the method, the rules, the round loop
  references/           one guide per phase, personas by site type, field notes, running it with agents
  templates/            brief, research file, implications, ledger, motion spec,
                        test kit, reader profile, reader agent, round report, progress entry
  scripts/              the eight checks, a shared helper, package.json for Playwright
```

## What it won't do

It won't send anything, publish anything or spend money on its own. Deploys, new cloud services and anything public wait for the owner's yes. It doesn't replace testing with real people; it says so in every report.

## Credit and license

Made by Thomas Kramer, with Claude. MIT license, see [LICENSE](LICENSE). Use it, change it, ship it. If it helps, I'd like to see what you made.
