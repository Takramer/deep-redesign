# Phase 6. Audits

Run these before launch and after every deploy that changes markup. Each audit ends with a short list: pass, fail with the page and the fix, or not checked.

## 1. SEO

- One `<h1>` per page that says what the page is. Headings in order.
- Semantic landmarks: `header`, `nav`, `main`, `footer`; `article` for a case or post; `dl` for facts.
- A unique `<title>` and meta description per page, written for a person, under about 60 and 155 characters.
- `rel=canonical` on every page, pointing at the one host you want (pick `www` or bare and 301 the other).
- `sitemap.xml` listing every public page, and `robots.txt` that points to it.
- Real links (`<a href>`) for navigation, not click handlers.
- Images with `alt` that says what the image shows, or empty `alt` for decoration.
- Keywords from the audience research, in headings and first paragraphs, said the way readers search. A job title that collides with another field (for example "design engineer", which also means mechanical design) needs a pairing word ("front-end", "UI") nearby.

## 2. AEO (answer engines and AI crawlers)

Answer engines quote text they can read. Make the important facts plain text in the HTML, not in images, not built by script.

- JSON-LD in the page head: `Person` (name, job title, url, sameAs links, knowsAbout), `WebSite`, and per piece of work `CreativeWork` (name, description, dateCreated, creator, image); `ItemList` for an index page. Validate it.
- State the key facts once, in sentences an engine can lift: who, what they do, where, how to reach them.
- Contact details in plain text and `mailto:` links. Check the live HTML: some CDNs rewrite email addresses into a script-decoded placeholder (Cloudflare's Email Address Obfuscation turned every address into "[email protected]" for crawlers and for readers without script). Switch that off if the address is meant to be found.
- Crawlers come in kinds, and each kind deserves its own decision. Search crawlers (Googlebot, Bingbot) put the site in results. Share-card fetchers (LinkedInBot, Twitterbot, facebookexternalhit) build link previews. Answer-engine crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) fetch pages so an assistant can cite them. Training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) collect text for model training. Blocking training while allowing the rest is a common, fair choice. Blocking an answer engine undoes the AEO work above.
- Two places can block a crawler: `robots.txt`, and the host's bot rules, which refuse the request outright (HTTP 403). Hosts now offer both as one switch. Cloudflare's managed `robots.txt` and its AI-crawler setting, for example, write a long list of training crawlers into `robots.txt` and refuse some crawlers at the edge. Read both. Run the check: sites often block an answer engine by accident while meaning to block only training.
- A host may refuse a forged crawler name sent from your own machine while it lets the real crawler through. Confirm any refusal in the host's bot or firewall log before changing settings.
- `llms.txt` is optional. Google Search ignores it; some assistants read it. Do not count it as SEO.
- Run `scripts/crawler-view.mjs`: it fetches each page with each crawler's user agent and reports what that crawler would see, including whether the main text is in the HTML without script, and sorts refusals by crawler kind.

## 3. Share cards

- `og:title`, `og:description`, `og:image` (absolute URL, 1200 by 630, with `og:image:width` and `og:image:height`), `og:url`, `twitter:card` set to `summary_large_image`.
- Fetch the page as each network's crawler (`crawler-view.mjs`) to confirm the server sends the new card.
- If the network still shows the old card, it is their cache, not your site. LinkedIn refreshes through its Post Inspector. X refreshes on its own over about a week; a query string (`?v=2`) on the shared link gets a fresh card now.

## 4. Accessibility

- WCAG 2.2 AA as the floor; check contrast on every text and background pair, including text over images.
- Keyboard: every control reachable, visible focus, logical order, no trap, Escape closes overlays (`keyboard.mjs`).
- A menu is a disclosure: a button with `aria-expanded`, at least 44 by 44 px, the page behind it inert while open.
- Reduced motion: no motion from interaction, nothing moving by itself; the page is complete without it (`fallbacks.mjs`).
- 400% zoom and 320 px reflow: no sideways scroll, nothing clipped, fixed bars under half the view (`fallbacks.mjs`, `reader.mjs reflow`).
- Screen reader skim: headings and landmarks alone tell the page's story; every link has a name that makes sense out of context (`reader.mjs heads`, `reader.mjs links`).
- Text never in images alone. Sizes in rem; nothing under about 11 px.

## 5. Performance

- Measure on a throttled phone profile, several runs, and report the median.
- Budgets from the gates: largest paint, layout shift, interaction delay, script weight.
- Serve images at the size they are shown, in a modern format, with `width` and `height` set so nothing jumps.
- Load each interactive moment's code only when its element nears view or on first touch.
- Prefetch or prerender on intent (a short hover), not on load.
- Check the deploy for dead weight (`scripts/dead-assets.mjs`). A common case: an image pipeline that imports every source file ships the full-size originals beside the optimized versions the pages use. No reader sees it; every deploy pays for it.
- Know the host's limits before adding infrastructure. On Cloudflare's free plan, Pages allows 20,000 files and 25 MiB per file, so a static site of a few thousand files rarely needs an image bucket; the free image transformations stop at 5,000 unique transformations a month and then return errors, which would have added a way to break images in exchange for nothing a reader sees.

## 6. Truth

- Every number and claim on the live site appears in the ledger as "safe to state", with a source.
- Products the site links to work today. A site can be fine while the product it links to is broken; open every linked product and use it.
- Dates, titles and availability are current.

## 7. Live parity

After each deploy, compare the live site with the build (`scripts/live-parity.mjs`):

- The script and style files should match byte for byte.
- HTML differences should be explainable: build-time data (counters, feeds), the host's injected analytics beacon, CDN rewrites. Anything else is a deploy problem.
- Check that new files (videos, images) return 200 on the live host, not 404, once the build finishes.
- Env changes need a fresh build. Some hosts' "redeploy" button reuses the old build's environment.
