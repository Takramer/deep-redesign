# Phase 3. Synthesis

Goal: turn findings into a small set of rules everyone can apply, and a plan where every item has an ID, a size and a reason.

Outputs, in `synthesis/`: direction, information architecture, visual system, motion and interaction, copy direction and copy deck, components, content and assets, the gates, and the plan (`next-steps.md`).

## 1. Direction in one paragraph

Write what the site is, for whom, and the one idea that runs through it. For example: a quiet frame where the work appears in its own color, with one accent as the thread. If the paragraph does not help reject an idea, rewrite it.

## 2. The gates

Every idea passes every gate before the owner sees it. A fail stays in the lab. Adapt the values; keep the five kinds.

1. **Access.** WCAG 2.2 AA. Motion that comes from interaction can be turned off (2.3.3), through `prefers-reduced-motion`. A way to do anything without dragging (2.5.7). A pause for anything that moves by itself for over 5 seconds (2.2.2). No flashing (2.3.1).
2. **Fallbacks.** Works with script off, at 400% zoom and by keyboard alone. Browsers without a feature (for example cross-page view transitions) get a plain, complete page.
3. **Brand.** A fixed, short list: one easing curve, one duration token for state changes, the accent color only as a marker, no scroll-jacking (no smooth-scroll library, no section that pins the page while the wheel turns). A new curve or token needs the owner's yes.
4. **Budget.** Numbers, not adjectives. A strong default: largest paint under 2.0 s on a phone, layout shift under 0.05, interaction to next paint under 200 ms, no task over 50 ms during an interaction, base script under 15 KB gzipped, each interactive moment loading its own code near view, under 40 KB gzipped unless the owner signs off.
5. **Taste.** Motion has to show what a still cannot: how a mark was built, where a piece went, what a number means. The owner picks from a film, never from a description.

## 3. Moments, not decoration

Each page leads with at most one moment. Everything else moves at the one duration token or not at all. Anything bigger starts only when the reader acts: a press, a drag, a zoom, a scrub. Every page reads in full with motion off.

Give each moment an ID and a row in the motion spec (`templates/motion-spec.json`): trigger, duration, travel, curve, reduced form. The spec is data, so the site and the tests can both read it. Without it, timings drift one edit at a time.

## 4. The plan

Write `next-steps.md` as tracks with IDs, so reports and commits can cite them:

| Prefix | Track |
|---|---|
| I | Interactive moments |
| N | Page and content fixes (the "Thursday list") |
| C | Hosting and platform |
| A | Techniques (CSS features, small libraries) |
| P | Production (screenshots, device frames, films, share cards) |
| D | Design system (motion vocabulary, key frames) |
| L | The loop (labs, A/B tooling, gates) |
| R | Research still to do (verify pass, user test, analytics read) |

Each item: what it is, size (one short session, one long session, several), the research it comes from, and its gate risks. Order the plan by what helps the site's goal first, not by what is fun to build.

## 5. Copy

Copy comes from the ledger and the owner's voice rules, never from a model's default voice. Run the bundled `humanizer` skill over every line, with a sample of the owner's own writing for voice. It removes generated patterns (puffed significance, rule-of-three lists, "not just X but Y", dashes used as commas, stock adjectives). Keep the owner's own good lines unchanged. If the owner writes about themself in the third person, hold it everywhere, including metadata.

## 6. The end-of-phase audit

At the end of each phase of the project (not only this one), write an audit table: every research file and every plan item against the live site, marked **live**, **dropped** (with the owner's reason) or **open**. It answers "did the research actually land?" and stops forgotten work from hiding. It also catches wrong claims in earlier reports, such as work believed to sit on a side branch.

## Done when

- The gates are written and the owner agrees with them.
- Every planned item has an ID, a size and a source.
- The motion spec has a row for each moment.
