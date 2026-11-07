# Field notes: traps that recur

Each note is a failure seen in a real redesign, and the rule it leaves behind. Read them before phase 4.

## Owner and taste

1. **The owner's own dozen words beat the research.** Write down how they want the site to feel and what it must never feel like. Read every proposal against those words first.
2. **Rejected features come back unless written down.** A dark theme doubles the visual work; a motion switch repeats what the system setting already does. When the owner removes something, it goes on the "Never again" list with a date, or a later session adds it back.
3. **Descriptions don't sell motion; films do.** Owners decide after watching a short recording of each option. Written descriptions of the same options stall.
4. **Ask all the questions at once.** Questions spread across a long run interrupt the owner and stall the build. One full round at intake, then options instead of questions.
5. **Report once per round.** One message with what landed, the links, the check output and the open questions, in that order, beats a stream of progress pings.

## Claims

6. **Headline numbers are often wrong.** Counts drift as they are copied from page to page, résumé to deck. Check each against the real artifact. A ten-fold error is not rare.
7. **Popular reader-time figures need a source.** Many "seconds per page" figures quoted in hiring and marketing articles trace back to no study. Mark them as folklore.
8. **A share of the plan's facts will be wrong.** A verify pass that rechecks every load-bearing claim typically finds some wrong and more partly right.

## Build

9. **Test the platform before building on it.** A prototype of the hardest interaction shows a builder's code limits early, before the work is lost.
10. **You probably don't need an animation library.** CSS, view transitions and the Web Animations API cover most moments.
11. **Minified CSS changes units.** `300ms` becomes `.3s`; a script that reads the number alone runs a 300 ms motion in 0.3 ms. Parse units.
12. **Drawn device frames look fake.** Use real manufacturer bezels at true relative scale.
13. **Headless window sizes lie.** A screenshot tool that sets width by a window flag can lay phones out about 500 px wide. Use a real viewport.

## Checks

14. **A stale preview server checks an old build.** Checks serve the folder they test.
15. **Hidden scrollbars hide overflow.** Desktop widths test with real scrollbars, scrolled top to bottom.
16. **Rebuilding during a check breaks the check.** Never rebuild the folder a check is reading.
17. **Timing checks fail at random under load.** A window fixed from page load cuts a late motion short. Open the window when the value first moves, and compare against the commit before your change before blaming your change.
18. **Simulated readers are cheap, fast and useful, and still not a user test.**

## Launch

19. **The CDN can rewrite the email address.** Email obfuscation turns addresses into a script-decoded placeholder. The local build is correct, so only a live check finds it.
20. **Old share cards are the network's cache.** If the server sends the new card and the network shows the old one, refresh it at the network.
21. **A push can succeed while its hook fails.** Check hook output.
22. **The deploy can carry hundreds of megabytes nobody uses.** Check the build folder, not only the pages.
23. **Free-tier limits are generous for a static site.** Measure against them before adding a bucket or an image service.
24. **Bot settings block more than intended.** A switch meant to stop AI training can also turn away the answer engines that cite the site. Check each crawler kind.

## Cost

25. **One long chat spends a large share of the budget rereading itself.** Fresh sessions per round, started from a short handoff page, cut that. See [08-running-it.md](08-running-it.md).
