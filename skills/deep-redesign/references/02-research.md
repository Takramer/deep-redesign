# Phase 2. Research

Goal: replace opinions with findings. Each track answers one question, cites its sources and ends with what to take, what to avoid and what to ask the owner.

Outputs: `research/NN-topic.md` (one per track), `research/_implications.md` (the digest), `research/NN-verify-pass.md`.

## The tracks

Run the tracks that fit the site. Pick from these, in roughly this order. Numbering the files keeps references short ("research/20 §6").

| Track | The question it answers |
|---|---|
| Audience and roles | Who reads this, what they need at each time layer, which keywords they search |
| Current-site inventory | What exists now, verbatim, measured (phase 1 feeds this) |
| Teardowns of model sites | What a handful of admired sites actually do, element by element, and why it works |
| History and theory | Where the chosen style comes from (for example Swiss grid to modern web), so the site uses the rules and not only the look |
| Perception and trust | How people scan, what reads as credible, what reads as generated or salesy |
| Taste and craft essays | What respected designers and engineers say about judgment, restraint and finish |
| Tooling and libraries | Which tools, libraries and repos could build each idea, with licenses and weights |
| Precedents per idea | For each proposed interaction, two or three live examples of it done well |
| Feasibility test | A small prototype of the hardest idea on the candidate platform. A builder that limits code to a canvas or component box can block the one interaction the design rests on; find out now |
| Typography, measured | Sizes, measure, leading and rag, measured on the real pages at real widths |
| First principles, measured | Rules for motion, input and loading, each with a number from the real build (see below) |
| Micro-interactions | Press feedback, focus, the small timings |
| Social and archive | What the owner has published before, old copy worth keeping |
| Review of research | A second agent reviews the biggest proposal file before the owner sees it |

## How to write a research file

Use `templates/research-file.md`. Every file has:

1. **The five findings that matter most**, first, in plain sentences.
2. **How the file was built:** sources searched, dates, what was not found.
3. **The body**, with a source and date on every factual line. Mark guesses as inference. Mark weak sources as weak ("No study backs it").
4. **Gaps in this research.**
5. **Sources**, as links.
6. **Implications**, in three short lists: *What to take*, *What to avoid*, *Open questions for the owner*.

Then copy the implications block into `research/_implications.md`, headed by the file name. The digest is what later sessions read; the full files are for checking.

## Measure, don't assert

The most useful research file is usually "first principles, applied and measured": a short list of rules, each with the number that sets it, measured on the real build. Examples of the shape:

| Principle | What it sets | How to measure it |
|---|---|---|
| A hover must not move the page | Size by layout, place by transform | Layout shift during hover, before and after |
| An entrance must not hold back the content | Each card waits only for its own image | Largest paint on slow 4G, both ways |
| Answer a press inside 100 ms | Start the response at once | Time from click to first visible change, in a frame trace |
| Fetch on intent | Prerender after a 200 ms hover | Navigation time with and without, at a set round trip |
| Pixels nobody sees still cost | Three widths; the lead image at its first-view size | Largest paint on slow 4G, before and after |
| Measure the thing, not the recorder | A clean browser, contact sheets | Compare a recording tool's output with a clean browser; test drivers drop frames and change behavior |
| A menu is a disclosure | A 44 px button with `aria-expanded`, the page under it inert, Escape closes it | Probe and film |
| The first screen answers the page | The claim and the facts in view at 1440 by 900 | Position of the claim's last line at 1440 by 900 |

Write rules this way. A rule with a number survives an argument; a rule with an adjective does not.

## The verify pass

While writing the plan (phase 3), tag every claim that came from one source or from memory with `[verify]`. Then run one pass that checks each tag with a fresh search and writes `research/NN-verify-pass.md`: held, wrong, or partly, with the correction. Expect a real share of claims to come back wrong or only partly right. A pass that finds nothing probably checked too little.

## Running tracks in parallel

Tracks are independent, so they suit parallel agents. Give each agent:

- the one question its track answers,
- the intake files to read (`answers.md`, `inventory.md`, the reader profiles),
- the file template and the rule that every line carries a source or "inference",
- a word cap,
- the instruction to reply with only the file path and its five findings.

The main session reads the five findings and the implications, not the whole files. That keeps its context small.

## Done when

- Every track the plan depends on has a file with implications.
- `_implications.md` is current.
- Open questions from all files are merged into one list for the owner (sent with the next round report, not one at a time).
