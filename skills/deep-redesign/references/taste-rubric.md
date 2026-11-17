# Taste rubric

The scripts catch geometry: off-centre labels, doubled borders, clipped text, overlaps, small tap targets (`align.mjs`), sideways scroll (`widths.mjs`), script-off and zoom fallbacks (`fallbacks.mjs`), focus (`keyboard.mjs`). A page can pass all of them and still look unfinished, uneven or machine-made. This rubric covers that part: rhythm, hierarchy, consistency, density, and the marks of default generated output.

The rules are drawn from real review corrections on built sites. Each one says how to check it, so two reviewers reach the same verdict.

## How to use it

- Check at 390, 768 and 1440 unless a rule names other widths. Look at every page in scope, then compare pages with each other. About a third of these rules can only fail across pages.
- `node scripts/taste.mjs <target> <pages>` prints the inventory the "DOM" checks refer to (gaps, type styles, radii, colours, section structure). The inventory is evidence. The verdict comes from looking.
- Not every block a rule names is in `taste.mjs` yet: `repeats`, `icons`, `images`, `motion`, `effects` and the per-width `text` hash are measured by hand, with a short `page.evaluate` in Playwright, until a review keeps needing one.
- **A project's own rules win.** If the site has a design file, tokens, a gates file or written brand rules, those replace the default numbers here (base unit, max width, radii, accent count). A rule the project breaks on purpose and in writing is not a defect. A rule it breaks by accident is.
- Severity: **block** = a reader sees it without looking for it, or it makes the page read as unfinished or generated; do not ship. **fix** = a careful reader sees it; fix before sign-off. **note** = a judgment call; report it and let the owner decide.
- Where a check says *judgment*, answer the anchor question in one sentence with evidence (a screenshot crop, a count). "Feels off" is not a finding.

## Rhythm and spacing

### R1. One spacing scale — fix
Every gap and padding comes from one scale built on one base unit.
**How to check:** DOM. From the `gaps` and `sections` inventory, list distinct vertical gaps and paddings per page. Fail when values fall off the project's scale (default: multiples of 4, with 8 as the working base) or when a page uses more than about 8 distinct spacing values. Ignore differences under 1 px.
**Fail:** paddings 10, 14, 22, 30, 96 on one page.
**Pass:** 8, 16, 24, 48, 96 and nothing else.

### R2. Same relation, same gap — fix
Two things in the same relation sit the same distance apart everywhere: heading to body, card to card, section to section of equal rank, on every page.
**How to check:** DOM plus eyes. Measure heading-to-first-block, item-to-item and section-to-section gaps on each page, then compare pages at one width. Measure from text to text (cap height to baseline), not box to box, when line heights differ. Fail on a difference of 4 px or more with no difference in rank to explain it.
**Fail:** section gaps 64 / 112 / 48 / 96 on one page with no reason; title-to-body 22 on one card grid and 32 on its sibling grid.
**Pass:** every section gap 96, every group gap 48, every card grid the same inner spacing.

### R3. Space shows grouping — block
Spacing has tiers, and the tiers tell the reader what belongs together: space inside a group is smaller than space between groups, which is smaller than space between sections. A heading sits closer to the content it names than to the block above it.
**How to check:** DOM plus eyes. For each heading, compare gap above with gap below; fail when the gap below is equal or larger. Compare tiers: each should be at least 1.5 times the one under it. Then squint at the full-page shot: can you count the sections and the groups inside them without reading? Also fail a long page where every section has identical padding and weight, so a chapter break looks the same as a paragraph break.
**Fail:** hero stack with equal 24 px steps between title, subtitle and details, so nothing pairs; an information page with no visible break between unrelated groups.
**Pass:** title-to-subtitle 12, subtitle-to-details 32; item 16, group 48, section 96.

### R4. One page grid — block
Every full-width block starts and ends on the same content edges, on every page: one max width, one side inset per breakpoint.
**How to check:** DOM. From `sections`, compare the left and right edge of the first text or media in each block, per width, across pages. Fail on any block more than 2 px off the common edge unless it is a deliberate full-bleed. Look for inset applied twice (a padded block inside a padded wrapper). At 1440 and up, fail content that runs to the viewport edge with no cap.
**Fail:** nav and body inset 32, hero inset 48; one section inset 168 where the rest use 120; a quote block with 48 side padding inside a wrapper that already has 24.
**Pass:** max width 1200, inset 48 at desktop and 24 on phones, on every block of every page.

### R5. Room to breathe — fix
Nothing sits tight against a border, a container edge or a neighbour. Padding inside a container is at least the gap between its items, and even on opposite sides.
**How to check:** Eyes at 3x zoom on every bordered or filled container, then DOM for the numbers. Fail text or controls under 8 px from a border, left and right padding that differ, and a page top where the first content sits closer to the nav than body blocks sit to each other.
**Fail:** day names touching the sides of a schedule box; a long number running into the padding at 390; first heading 16 px under the nav while sections are 96 apart.
**Pass:** inner padding 24 where item gaps are 16, same on both sides, at all three widths.

## Hierarchy

### H1. One primary action — block
A view has one emphasised action. Everything else is quieter: a text link, an outline, a lower-contrast button.
**How to check:** DOM plus eyes. Count filled, high-contrast buttons in the first screen and on the whole page (`buttons` inventory). Fail more than one in the first screen, or the same global call to action repeated in every section and on every page. Anchor question: what is this page for, and is that the one filled button?
**Fail:** hero with three filled buttons; "Get started" in the nav, the hero, every section and the footer.
**Pass:** one filled button for the page's goal, secondary actions as underlined links.

### H2. The first read is the point — block
The largest, heaviest thing on the first screen is what the page is for. Nothing secondary outweighs it, and the first screen shows that more follows.
**How to check:** Judgment. Blur or shrink the first-screen shot to a quarter size. Name the first, second and third thing the eye lands on. Fail when the first is decoration, chrome or a secondary item, when more than three things compete at the same weight, or when the first screen ends on a clean edge that reads as the end of the page.
**Fail:** footer wordmark filling half a desktop screen; an email address set larger than the page title; a hero so tall that nothing below hints at more.
**Pass:** title first, proof or image second, the one action third; the next section's top edge shows above the fold.

### H3. Text has roles — block
Hierarchy in text comes from a small set of roles (title, heading, body, label, meta), each distinct in size, weight or colour. A higher role never renders smaller or lighter than a lower one.
**How to check:** DOM. From the `type` inventory: each heading level should be at least 1.2 times the size of the level under it, or differ clearly in weight. Fail adjacent sizes within 2 px of each other used for different roles, a heading smaller than its own subtitle at any width, and pages where all text shares one colour and one weight. Fix by assigning roles and a second text colour before adding sizes.
**Fail:** sizes 18, 19, 20, 22 in use; a phone h1 at 24 px above a 26 px subtitle; body, labels and captions all the same grey 16 px.
**Pass:** 40 / 24 / 16 / 13, with labels in a second text colour.

### H4. Say it once — fix
No element repeats what another already says. A signal that carries no new information is removed.
**How to check:** Judgment, element by element in the zoomed shots. Anchor question: if this were deleted, what would the reader lose? Look for arrows on buttons that already read as buttons, a label above a control that names itself, a contents list beside a page short enough to scan, hints explaining obvious controls, a subtitle that restates the title.
**Fail:** "Watch live" text above a button that says "Watch live"; an arrow icon on every filled button; "Drag the slider" under a slider.
**Pass:** the button alone; underlines mark secondary links; no hint text.

## Type

### T1. A small type set — fix
The site uses few families, sizes and weights, and every piece of text maps to a named style.
**How to check:** DOM. From `type`: fail more than 2 families (plus one mono), more than about 8 size/line-height/weight combinations per page, more than 3 weights, or any combination used only once or twice (a one-off).
**Fail:** 14 combinations on one page, five of them used once.
**Pass:** 6 combinations, each used many times.

### T2. Readable floor, measure and leading — fix
Body text is at least 16 px, nothing is under 12 px, lines run 45 to 80 characters, and line height tightens as size grows.
**How to check:** DOM. From `type` and `measure`: fail body under 16 px, any visible text under 12 px, paragraphs over 80 characters a line at any width (check 768 and wide desktop first, where capped columns often go full width), body leading under 1.4, display leading over 1.2 on phones.
**Fail:** a dialog whose body runs 90 characters a line at 768; an 11 px caption; a two-line phone hero title at line-height 1.5.
**Pass:** body 16 to 18 px at 1.5, capped near 65 characters; hero title at 1.05 to 1.15.

## Consistency across pages and widths

### X1. One component, one look — block
The same component looks and behaves the same wherever it appears: size, padding, radius, type, hover and focus. A new page or an embedded widget uses the site's language, not its own.
**How to check:** DOM plus eyes. From `buttons` and `repeats`, group by role and compare signatures (height, padding, radius, fill, type style) across pages. Hover and focus one of each on every page. Fail the same role at two heights or two hover behaviours, a card family with two body styles, and any page or third-party component (timeline, form, billing or booking page) that keeps a different style.
**Fail:** primary button 54 px tall on one page and 55 on another; three variants of one card with different title sizes; a techy default timeline widget on an otherwise quiet site.
**Pass:** one button signature per role site-wide; the widget restyled to the site's type, colour and border rules.

### X2. Shared sections are the same section — block
Nav, footer, contact block, call-to-action band and accordions are one design reused, not one design per page.
**How to check:** Cross-page. Put the same section from every page side by side at one width (crop the shots). Compare structure, order, spacing and border treatment; use the per-width `summary` table for the numbers. Fail any difference that the page's content does not force.
**Fail:** a contact block with a different layout on almost every page; accordions that open with a top rule on some pages and none on others.
**Pass:** pixel-identical apart from the copy.

### X3. Parallel items are built alike, and container style means something — fix
Items in a row or grid share the same parts in the same order at the same positions. Each container style (enclosed card, top-bar block, plain row) is used for one kind of content.
**How to check:** Eyes plus DOM. For each sibling group in `repeats`, compare part lists and the y position of each part across a row; fail a row where one item lacks a button the others have, where buttons sit at different heights, or where one wrapped heading pushes that column's body below its neighbours. Then list each container style and what it holds across the site; fail a style used for two unrelated things, or static cards that sometimes contain links.
**Fail:** three service cards, two with a button, one without; footer link columns of unequal height with no alignment rule; bordered cards used for both clickable items and plain facts.
**Pass:** every card: title, two lines, link, pinned to the same baseline; bordered = clickable, plain = information.

### X4. One icon family — fix
Icons share one style, one stroke weight and a small set of sizes.
**How to check:** DOM. From `icons`: fail more than one stroke width, mixed filled and outline styles for the same role, or more than 3 sizes. Then look: a small icon scaled up, or a heavy mark reused small, reads heavier or lighter than its neighbours; weight should track the text beside it.
**Fail:** strokes 1.3, 1.5 and 2 on one page; a 4 px dot that suits a large heading reused beside 13 px footer text.
**Pass:** all strokes 2 px at 20 and 24; marks sized relative to the text they sit with.

## Responsive by design

### V1. Each width is its own layout — block
The 390 and 768 layouts are designed on purpose. Tablet is not the phone layout stretched or the desktop layout squeezed, and overlays fit their content.
**How to check:** Eyes, three widths side by side per page. Anchor question: would a designer have drawn this at this width? Fail at 768: one column of full-width cards with 500 px of empty space each, or a desktop multi-column layout with columns under about 240 px. Fail on phones: a dropdown wider than its longest item needs, a horizontal menu or filter row that wraps to a second row instead of scrolling with the last item cut to show there is more (`taste.mjs` prints these as `wrapped control rows`), a side column kept beside content too narrow for it. `widths.mjs` finds overflow; this rule is about layouts that fit and still look wrong.
**Fail:** tablet shows the phone stack at 720 px wide; a two-column page keeps its side column down to 800 px, squeezing the main column to 380.
**Pass:** three columns at 1440, two at 768, one at 390; side column drops below the content at the tablet breakpoint.

### V2. Content and rank survive every width — block
Each width shows the same content in the same order of importance.
**How to check:** DOM plus eyes. Compare the `text` hash per width; any difference in copy or links between widths is a defect unless it is a label shortened on purpose. Compare h1 size across pages at 390: interior-page titles should not collapse while the home title stays large. Fail content hidden on phones that a reader needs, and fixed heights that cut content.
**Fail:** phone and desktop variants with different paragraph text; interior h1 at 24 px on phones while home is 44.
**Pass:** identical text at all widths; h1 the largest text on every page at every width.

### V3. Wide screens are bounded — fix
At 1440 and above, content is capped, media fits in one screen, and empty space is designed.
**How to check:** Screenshot at 1920 as well as 1440. Fail media taller than the viewport (the reader cannot see a whole mockup or image at once), text lines growing with the window, a column left empty beside full-height media, and more than about half a screen of blank space between sections. Also fail the opposite: hard side bars that box the page in when backgrounds could run full width.
**Fail:** a full-width mockup 1,400 px tall on a 1,080 px screen; a two-column block whose right column is empty.
**Pass:** media capped near 80% of viewport height; an empty column removed and the media run full width.

## Borders and surfaces

### B1. A small surface vocabulary — fix
Radius, shadow and border come from a short list, and the project does not gain a new one with each component.
**How to check:** DOM. From `surfaces`: fail more than 2 radii (plus full-round for pills and avatars), more than 2 shadows, more than 1 border width for the same role, or a value used once. In a square-corner system, fail any rounded element, including charts, legends and form controls. Then look at shadows at 3x: one light direction, soft edge, no hard grey smear.
**Fail:** radii 4, 6, 8, 12, 16 on one page; bars, legend swatches and tags each with a different radius.
**Pass:** radius 0 or 8 everywhere; one resting shadow and one raised shadow.

### B2. Lines are quieter than text, and few — fix
Dividers and card borders are lighter than body text, and a rule is drawn only where space alone does not separate.
**How to check:** DOM plus eyes. From `surfaces`, compare border colours with the body text colour: container borders in full text colour are a fail unless the project's style is explicitly hard-lined. A border still needs about 2:1 against the page so it stays visible. Count full-width rules per screen (`taste.mjs` prints the most found in one screen); more than about three in one viewport is a fail. Where two bordered boxes meet they share one line (`align.mjs` reports doubles); also compare the darkness of each rule, since two translucent lines stacked read as one darker line.
**Fail:** every card outlined in pure black; a reference page with a full-width rule between every row and every section.
**Pass:** borders at about 2:1 on the page colour; full-ink lines kept for focus, hover and one structural edge.

## Colour

### CL1. One accent, used as a marker — block
The accent colour marks a few things (a state, a link, one line, one action). It is not a fill for sections, cards or boxes, and section backgrounds change only when the kind of content changes.
**How to check:** DOM plus eyes. From `colours`, read the share of each full-page shot covered by saturated fills: more than about 10% of a screen is a fail unless the brand is built on a colour field. Count distinct hues used as fills or labels across the site; more than one accent (plus status colours) needs a written reason. Fail alternating section backgrounds on consecutive sections of the same kind.
**Fail:** an accent-coloured box behind every key number; each section a different tint; zebra-striped sections down a page of similar content.
**Pass:** one page colour, one alternate surface for a real change of content, the accent on links, one divider and the primary action.

### CL2. Text colours and overlays hold up — fix
Text uses at most three colours (primary, secondary, accent), secondary text still reads easily, and overlays keep the image alive.
**How to check:** DOM. From `colours`: fail more than 3 text colours, or secondary text under 4.5:1 (faint grey on white is the usual case). For text over images, sample contrast where the text actually sits, not at the darkest point of the scrim. Fail scrims that reach solid black and logos or icons that vanish on their ground until hovered.
**Fail:** captions at 2.8:1; a hero image fading to 100% black behind the title; black logo marks on a dark band.
**Pass:** secondary text at 5:1 or better; scrim stops near 80% with the title measured at 4.5:1 or better.

## Density

### D1. Group and collapse, do not shrink — fix
Heavy information is grouped and folded away (accordion, tabs, dialog, "show more"), not set smaller or dumped in full. Opening something does not wreck the layout around it.
**How to check:** Eyes. Fail any list of more than about 8 similar items shown in full when the reader needs two or three, long schedules or specs fully open on phones, and text made smaller to fit. Open every expandable element at each width: fail a narrow card that grows straight down several screens, or an opening card that shoves its row-mates out of line. A persistent strip or panel that could be a button that opens a menu is also a fail.
**Fail:** 300 test names listed on a case-study page; a staff bio that expands a 280 px card to 1,400 px tall.
**Pass:** the three that matter, then "show all"; bios open in a dialog; schedule days collapsed by default on phones.

### D2. Everything is sized to what it holds — fix
Chrome, panels and cards are as large as their content needs and no larger. Empty space is a choice, not a leftover.
**How to check:** DOM plus eyes. From `chrome`: fail a sticky header over about 64 px (it costs most on small and zoomed screens), a footer taller than one desktop screen, and controls much taller than their label needs. Then look for panels far wider than their content, charts squeezed while neighbours sit half empty, and cards made tall by fixed heights. The opposite also fails: a dense screen where groups have no space between them and the eye finds no entry point.
**Fail:** a 76 px sticky nav; a "busiest day" panel 600 px wide holding one number while the chart beside it is cramped; a sidebar where every row touches the next.
**Pass:** a 56 px nav; panel widths set by content; grouped rows with a clear gap between groups.

## Imagery and devices

### I1. Sharp images, few shapes — fix
Every image is sharp at the size it is shown, and a set of images uses a small number of aspect ratios, cropped on purpose.
**How to check:** DOM. From `images`: fail any raster image whose natural width is under its rendered width times the device pixel ratio (check at 2x), and video that is visibly blocky in the zoomed shot. Fail a grid whose thumbnails use more than 2 ratios, and any crop that cuts a face, a logo or the subject. In a set of covers, the weaker ones should be brought up to the strongest one's treatment.
**Fail:** an 800 px photo stretched across a 1440 hero; six thumbnails in five ratios; a cover cropped through its logo.
**Pass:** sources at 2x; all thumbnails 4:3; crops chosen per image.

### I2. Device mockups form one scene — fix
Mockups in one group share a baseline, centre on each other, sit at a height the screen can show, and look like real devices.
**How to check:** Eyes at 3x plus box measurements. Devices side by side share a bottom edge (phone bottom = laptop bottom) to within 1 px; a pair centres on a common axis. Fail a phone mockup taller than the viewport, a single phone stretched full width when two or three side by side would sit at a normal height, a mockup aligned left when its siblings are centred, and screens with no status bar or browser bar where a real one would show. Covers in a set share one background treatment and device layout.
**Fail:** phone floating 14 px above the laptop's base; a phone screenshot 1,900 px tall on a phone page.
**Pass:** shared baseline; three phones in a row, each fully visible in one screen.

## Motion

Screenshots cannot judge feel. These two rules cover what the DOM and a trace can show; say in the report that feel was not checked.

### M1. Quick, and from one family — fix
Interface transitions are short and share a small set of durations and easings. Linked effects run on the same timing.
**How to check:** DOM. From `motion`: fail UI transitions over about 400 ms, page or item entrances over about 600 ms, more than 3 distinct durations or easing curves, and parts of one interaction on different timings (an arrow that moves at 150 ms while its underline draws at 400). A menu or sheet opens in one continuous move, not two steps. Use `motion-trace.mjs` for the numbers where a spec exists.
**Fail:** durations 150, 200, 250, 300, 450, 700, 1200 in one stylesheet; a mobile menu that pops sideways then drops.
**Pass:** 150 for hover, 300 for open and close, one easing curve.

### M2. Motion is rare enough to mean something — fix
Not everything animates. Reveal-on-scroll is used for a few moments, scrolling stays under the reader's control, and nothing auto-advances faster than it can be read.
**How to check:** DOM. From `motion`, count elements waiting on a scroll reveal: more than about a third of the page's blocks is a fail. Fail any scroll hijacking (wheel listeners that override native scroll, snap that traps the reader), hover effects that swing or scale strongly, and carousels that advance in under 5 seconds or lack a pause. `fallbacks.mjs` covers reduced motion and script-off.
**Fail:** every image on a case-study page fading up on scroll; a carousel changing slide every 2.5 seconds.
**Pass:** the hero and one key figure animate; images are simply there; slides hold 6 seconds.

## Copy

### W1. Plain, specific, and in the site's own voice — fix
Copy states what the thing is and does, in words the audience would use, with no stock marketing verbs.
**How to check:** DOM plus judgment. The `copy` inventory lists hits for stock words (unlock, elevate, seamless, supercharge, effortless, empower, revolutionize, cutting-edge, next-level, "take your X to the next level", "built for the modern"). Any hit in a heading is a fail. Then read every heading on its own: could it sit unchanged on a competitor's site? If yes, it fails. Check register against the audience: a community site should sound warm, a professional portfolio sharp and a little personal, a product page exact.
**Fail:** "Elevate your workflow with seamless collaboration"; a welcome page for a community group written like a terms sheet.
**Pass:** "Send invoices from your phone. Get paid in two days."; a welcome that says who you will meet and when.

## Looks generated

These are the visual marks of default generated output. One on its own can be a choice. Two or more on a page read as "nobody designed this" and count as **block**. Report each as a count with a screenshot, not as an opinion.

### AI1. The stock page skeleton — block
The page does not follow the default sequence: centred hero with badge, headline, subhead and two buttons; logo strip; three icon cards; alternating image-and-text rows; testimonial cards; pricing; big gradient call to action; four-column footer.
**How to check:** DOM plus eyes. Read the `sections` structure signatures top to bottom and count how many steps of that sequence appear in that order. Four or more in sequence is a fail. Anchor question: is the order driven by what this reader needs to know next, or by habit?
**Fail:** hero, "Trusted by", three feature cards, testimonials, call-to-action band, in that order, on a site with one product and two real customers.
**Pass:** the page opens with the work or the product itself and orders sections by the reader's questions.

### AI2. Every section the same stack — block
Sections differ in structure where their content differs. A page is not one centred column of heading, paragraph and grid repeated.
**How to check:** DOM. From `sections`, compare structure signatures and heading alignment. Fail three or more consecutive sections with the same signature, or a page where every heading and paragraph is centred. Body text over three lines is left-aligned.
**Fail:** six sections, each a centred eyebrow, centred h2, centred paragraph and a three-card grid.
**Pass:** a left-aligned grid system with sections that change shape with their content: a wide figure, a two-column comparison, a plain list.

### AI3. Default colour, type and effects — block
The palette, typeface and effects were chosen for this project, not inherited from a template.
**How to check:** DOM plus eyes. From `effects` and `colours`: flag purple-to-indigo or blue-to-violet gradients, gradient-filled headline text, blurred colour blobs or glows behind the hero, glass panels (backdrop blur) on ordinary cards, dot or grid backgrounds used as filler, and a boring section "fixed" with a gradient. From `type`: flag the display face that is in fashion this year used with no link to the brand, set tall and tight, or a display face used for data and body. Each flag needs a reason from the project's brand rules to stand.
**Fail:** indigo gradient hero with a glow, gradient headline text and a fashionable high-contrast serif on a bookkeeping product.
**Pass:** two brand colours and a neutral, flat surfaces, a typeface with a stated reason.

### AI4. Not everything is a card — block
Content is boxed only when the box means something (it is clickable, it is one of a set, it floats above the page). Sameness of treatment is not a system.
**How to check:** DOM plus eyes. From `surfaces` and `repeats`: fail a page where most content blocks carry the same large radius and soft shadow regardless of role, cards nested in cards, single paragraphs wrapped in a bordered box, and accent-coloured boxes used to add interest. Count boxed blocks against unboxed ones per page; over about half boxed is a fail.
**Fail:** hero text in a card, features in cards, each feature's icon in its own rounded tile, the quote in a card, all with one 16 px radius and one blur shadow.
**Pass:** text on the page surface, structure from the grid and spacing, cards only for the clickable set.

### AI5. No marker on every heading — fix
Headings stand without a decoration in front of them.
**How to check:** DOM. From `copy` and `icons`, count eyebrow labels, pill badges, emoji and tinted icon circles that sit directly above or before a heading. Fail when more than a third of section headings carry one, or when any emoji is used as an icon. One eyebrow style used where it adds a real category is fine.
**Fail:** a pill reading "FEATURES" above every h2; a rocket emoji before "Get started"; every card led by a generic line icon in a tinted circle.
**Pass:** headings alone; icons only where they speed recognition of a known thing.

### AI6. No filler proof — block
Every proof element is real and specific, or it is absent. Placeholder content is never shipped.
**How to check:** Eyes plus DOM text. Fail a grey "Trusted by" logo strip with no stated relation to the logos, testimonials without a full name, role and organisation, round unsourced figures ("10,000+ users", "99% satisfaction"), stock photos of people standing in for real ones, lorem text, and platform placeholders or badges left in the page. Results shown as plain text blocks where a simple real chart or figure would carry them is a note.
**Fail:** three testimonial cards from "Sarah K., Marketing Manager" with five stars; a builder badge covering a hero button.
**Pass:** one quote with a full name, role and a link; a number with its source and date; or no proof section at all.

## Reporting

One line per defect, worst first:

`<severity> <width> <page> <selector>: <what is wrong, with numbers> [rule ID]`

followed by the screenshot that shows it. Give fixes in values (px, hex, breakpoint), never adjectives. When one cause produces many symptoms (no spacing scale, three copies of one component), name the cause once with a count, then list the worst three instances.
