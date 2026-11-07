# Phase 4. Build

Goal: ship plan items in rounds the owner can review quickly, with nothing reaching production that the owner did not pick.

## The lazy ladder

Stop at the first rung that holds:

1. Does it need to exist? If the need is speculative, skip it and say so in one line.
2. Is it already in the codebase? Reuse it.
3. Does the platform do it? CSS over script, an HTML element over a component, a database constraint over app code.
4. Does an installed dependency do it?
5. Can it be one line?
6. Only then: the least code that works.

The ladder runs after you understand the problem, never instead of it. For a bug, find every caller of the function you are about to change: one fix in the shared function beats a guard in each caller.

## The technique ladder for motion

CSS transitions and keyframes, then the Web Animations API, then one small library, then the GPU. Most sites never need a library: view transitions handle page changes and Web Animations handle the rest. Check a library's license before any code depends on it.

## Platform choice

Test the hardest idea on the candidate platform before committing (the feasibility track in phase 2). A site builder that limits code to a canvas or a component box can block the one interaction the design rests on. If the test fails, move platforms now, before real work is lost.

## Rounds

One round is one set of plan items, built, checked and reported together.

1. Each item, or each A/B option, on its own branch (`review-a-home`, `review-b-home`). Separate worktrees if several agents build at once; never two writers on the same files.
2. Run every gate in `scripts/` against a local preview of that branch, in chromium, webkit and firefox.
3. Push branches only, never the production branch, so the host builds a preview URL per branch.
4. Record what the owner needs to see: a short film of each moment, stills at desktop and phone width, the preview links.
5. Send one report (`templates/round-report.md`): what landed, the links, the check output in the same words the checks print, and every open question with its choices. No progress pings in between.
6. On the owner's pick: merge, build, run the gates on the merged result, deploy, then check the live site (phase 6, live parity).
7. Write one progress entry (`templates/progress-entry.md`) and update the handoff page.

## Device frames and screenshots

Readers notice fake frames. Drawn device frames look fake; use manufacturer bezels (Apple publishes them for its devices, with a license to accept) and browser screenshots composited into a real laptop bezel. Show a phone beside a laptop at true relative scale. Take screenshots with a real viewport (the bundled Playwright MCP server or `scripts/reader.mjs shot`), not a headless window size flag: one tool laid phone pages out about 500 px wide and cropped them, so every phone still it made was wrong.

## Share cards

Make one share image per important page (1200 by 630), set `og:image` with width and height, and check what each network actually fetched (phase 6). An animated share loop (`og:video`) is supported unevenly; treat it as a bonus, never as the card.

## Commits and deploys

- Commit or push only when the owner asks. Branch first if you are on the default branch.
- Short, plain commit subjects that say what changed and why.
- If a push hook does extra work (for example publishing a public copy), check that it ran. A hook can fail while the push itself succeeds.
- Large pushes over HTTPS can time out (HTTP 408). Retry once with a bigger buffer (`git -c http.postBuffer=524288000 push`) before anything else.

## Done when

- The owner picked every open A/B.
- The merged build passed every gate in three engines.
- The live site matches the build (phase 6).
