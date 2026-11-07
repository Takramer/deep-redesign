# Phase 5. Testing and refinement

Three kinds of proof, in rising order of value. Report which kind you have, in those words.

| Kind | Proves | Does not prove |
|---|---|---|
| Automated gates | Layout holds, fallbacks work, timings match the spec | That anyone can find or judge anything |
| Simulated readers | Likely friction, missing information, copy that confuses | That real people behave that way |
| Real readers | The site works for the people it is for | Much, with fewer than five |

## 1. Automated gates

Run all of them before every merge, in chromium, webkit and firefox. They are in `scripts/`.

- **Widths** (`widths.mjs`): 11 widths from 320 to 1920. Scroll every page top to bottom at each width, because things that move on scroll can run off the edge lower down. Turn on real scrollbars from 600 px up, as a desktop with a mouse has them; hidden scrollbars can hide an overflow of hundreds of pixels. Name the lines that must stay on one line (a big headline, an email address) and fail if they wrap.
- **Fallbacks** (`fallbacks.mjs`): script off, reduced motion and 400% zoom (a 320 by 200 view). Fail on sideways scroll, on any image left invisible by a reveal that waits for script, and on anything still animating 2 s after load under reduced motion.
- **Keyboard** (`keyboard.mjs`): tab through each page. Every stop needs a name, a visible focus ring and a place on screen.
- **Motion** (`motion-trace.mjs`): sample the moving value every frame and compare its run time and shape with the spec. Two traps are built into the script. First, open the sampling window when the value first changes, not at page load: under a busy machine the page loads late and a fixed window cuts the motion short or misses it, which looks like a site bug and is not. Second, read durations the way the browser wrote them: a minifier rewrote `300ms` as `.3s`, and a parser that read the number alone made a 300 ms motion run in 0.3 ms.
- **Do not trust a run on a loaded machine.** Frame-timing checks fail at random when other work is running. If a timing check fails, rerun only the failing traces on a quiet machine, then run the same trace on the commit before your change. Only a failure that appears with your change and not before it is yours.
- **Check the current build.** Serve the folder you just built, or start a fresh preview. A long-running preview server once kept an old build, and a day of checks ran against it. Never rebuild the folder while a check is reading it.

## 2. Simulated readers

Phase 1's `persona-researcher` wrote one agent per persona into the project, at `.claude/agents/reader-<slug>.md`. Run all five in parallel against the preview or the live site, each writing to `redesign/reports/<round>/<slug>.md`. (Without project agents, run the plugin's generic `simulated-reader` agent five times, once per profile.) Each agent:

- reads only its own profile and the test script,
- uses `scripts/reader.mjs` the way its reader would (a screen-reader user gets the accessibility tree and headings, a low-vision reader gets reflow at 320 px and zoomed screenshots, a skimmer gets text and links),
- starts at the home page and follows only links it could find, never a URL from the source,
- counts its time against the profile's budget and marks each task Pass, Slow or Fail, quoting the page text that decided it,
- never invents a stat and never edits the site,
- writes a short report with a verdict, the task table, up to five greats, up to five fixes, and only truly blocking problems under "Critical".

Simulated readers rarely find anything critical on a site that passed the gates, but their top asks (a fact the first look misses, a missing link, two menu items that lead to the same page) make a good next round. Treat this as a cheap pre-test, not as the test.

## 3. Real readers

Five people, one per reader type, 30 minutes each. Use `templates/test-kit.md`:

1. A five-second first look: what is this, who is it for?
2. Task 1: find the work that fits a role or need.
3. Task 2: judge the work: what is good, what is unclear?
4. Task 3: get in touch.
5. Wrap-up questions.

Write pass marks before the sessions (for example: Task 1 passes if found in under 60 seconds without help). Log every problem with the session, the page and the quote. After all five, fix what stopped a task before building anything new.

## 4. Analytics

After about two weeks of visits, read the analytics once: which pages people open, on which devices, where they stop. Deepen what they read and cut what they skip. Then read monthly. Use a privacy-friendly counter and check it is actually counting on the live site.

## 5. Counter-arguments

End each test report with a short section that argues against its own result: who ran the checks (if the builder did, say so), what the sample was, what was not tested. If the owner's review stood in for user testing, say so plainly: the owner is one reader and the client.
