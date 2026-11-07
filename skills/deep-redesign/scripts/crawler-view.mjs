// What each crawler gets: search engines, share-card fetchers and AI crawlers.
//   node crawler-view.mjs <url|build-dir> [paths...] [--min-text=200]
// No browser: crawlers mostly read the HTML as sent, so the main text must be there without script.
// Per page: status, title, description, canonical, one h1, share-card tags, JSON-LD types, main text
// length, and email addresses rewritten by a CDN (Cloudflare's Email Address Obfuscation turned every
// address into "[email protected]" for crawlers). Then robots.txt per crawler.
import { target, finish } from './lib.mjs'

const { base, pages, close, opts } = await target('usage: node crawler-view.mjs <url|build-dir> [paths...]')
const MIN_TEXT = +(opts['min-text'] || 200)
// Each crawler has a role. Blocking a training crawler is a fair choice; blocking search, share-card
// or answer-engine crawlers hides the site from the readers they serve, so those fail.
const BOTS = {
  Googlebot: ['search', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  Bingbot: ['search', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
  LinkedInBot: ['share', 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)'],
  Twitterbot: ['share', 'Twitterbot/1.0'],
  facebookexternalhit: ['share', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'],
  'OAI-SearchBot': ['answer', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)'],
  'Claude-SearchBot': ['answer', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)'],
  PerplexityBot: ['answer', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'],
  GPTBot: ['training', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1; +https://openai.com/gptbot)'],
  ClaudeBot: ['training', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'],
}
const fails = [], notes = [], blocked = {}
const attr = (html, re) => (html.match(re) || [])[1]?.trim() ?? null
const meta = (html, key) => attr(html, new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)`, 'i')) ?? attr(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, 'i'))
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()

for (const p of pages) {
  let firstLen = null
  for (const [bot, [, ua]] of Object.entries(BOTS)) {
    let r, html
    try { r = await fetch(base + p, { headers: { 'user-agent': ua }, redirect: 'follow' }); html = await r.text() } catch (e) { fails.push(`${bot} ${p}: fetch failed (${e.message})`); continue }
    if (r.status !== 200) { (blocked[bot] ||= {})[r.status] = ((blocked[bot] || {})[r.status] || 0) + 1; continue }
    // The checks below run once per page; other crawlers only need the same page, not a different one.
    const len = text(html).length
    if (firstLen !== null) { if (Math.abs(len - firstLen) > firstLen * 0.1) notes.push(`${bot} ${p}: got ${len} characters of text, the first crawler got ${firstLen}`); continue }
    firstLen = len
    const where = p
    const title = attr(html, /<title[^>]*>([^<]*)<\/title>/i)
    const desc = meta(html, 'description')
    const canon = attr(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i) ?? attr(html, /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)
    const h1 = (html.match(/<h1[\s>]/gi) || []).length
    const og = { title: meta(html, 'og:title'), description: meta(html, 'og:description'), image: meta(html, 'og:image'), url: meta(html, 'og:url') }
    const card = meta(html, 'twitter:card')
    const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].flatMap((m) => {
      try { const j = JSON.parse(m[1]); const all = [j, ...(j['@graph'] || [])].flat(); return all.map((x) => x['@type']).flat().filter(Boolean) } catch { fails.push(`${where}: JSON-LD does not parse`); return [] }
    })
    const mainHtml = attr(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ?? html
    const words = text(mainHtml).length
    if (!title) fails.push(`${where}: no <title>`); else if (title.length > 65) notes.push(`${where}: title is ${title.length} characters`)
    if (!desc) fails.push(`${where}: no meta description`); else if (desc.length > 160) notes.push(`${where}: description is ${desc.length} characters`)
    if (!canon) fails.push(`${where}: no canonical link`)
    if (h1 !== 1) fails.push(`${where}: ${h1} h1 elements`)
    if (!og.title || !og.image) fails.push(`${where}: share card missing ${!og.title ? 'og:title ' : ''}${!og.image ? 'og:image' : ''}`.trim())
    if (og.image && !/^https?:\/\//.test(og.image)) fails.push(`${where}: og:image is not an absolute URL`)
    if (og.image && !meta(html, 'og:image:width')) notes.push(`${where}: og:image has no width and height tags`)
    if (!card) notes.push(`${where}: no twitter:card`)
    if (!ld.length) fails.push(`${where}: no JSON-LD`)
    if (words < MIN_TEXT) fails.push(`${where}: only ${words} characters of main text without script`)
    if (/cdn-cgi\/l\/email-protection|__cf_email__|data-cfemail/.test(html)) fails.push(`${where}: email addresses rewritten by Cloudflare Email Obfuscation; crawlers and readers without script see "[email protected]"`)
    if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html)) notes.push(`${where}: noindex`)
    console.log(`${where}  "${title ?? ''}"  h1=${h1}  ld=[${[...new Set(ld)].join(',')}]  text=${words}  card=${og.image ? 'yes' : 'no'}`)
  }
}

// robots.txt: which crawlers are shut out of which pages. A choice, so a note, not a failure.
try {
  const r = await fetch(base + '/robots.txt')
  if (!r.ok) notes.push('no robots.txt')
  else {
    const groups = [], lines = (await r.text()).split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean)
    let cur = null
    for (const l of lines) {
      const [k, ...v] = l.split(':'), val = v.join(':').trim(), key = k.toLowerCase()
      if (key === 'user-agent') { if (!cur || cur.rules.length) groups.push((cur = { agents: [], rules: [] })); cur.agents.push(val.toLowerCase()) }
      else if ((key === 'disallow' || key === 'allow') && cur) cur.rules.push([key, val])
      else if (key === 'sitemap') console.log(`robots.txt sitemap: ${val}`)
    }
    for (const [bot, [role]] of Object.entries(BOTS)) {
      const g = groups.find((g) => g.agents.includes(bot.toLowerCase())) || groups.find((g) => g.agents.includes('*'))
      if (!g) continue
      const shut = pages.filter((p) => g.rules.filter(([, v]) => v && p.startsWith(v)).sort((a, b) => b[1].length - a[1].length)[0]?.[0] === 'disallow')
      if (shut.length) (role === 'training' ? notes : fails).push(`robots.txt shuts ${bot} (${role}) out of ${shut.length === pages.length ? 'every page' : shut.join(', ')}`)
    }
  }
} catch {}
// Refusals, one line per crawler. A CDN may refuse a forged crawler name sent from your own IP while it
// lets the real crawler through, so confirm a refusal in the host's bot or firewall log.
for (const [bot, codes] of Object.entries(blocked)) {
  const role = BOTS[bot][0], n = Object.values(codes).reduce((a, b) => a + b, 0)
  const line = `${bot} (${role}) refused on ${n} of ${pages.length} pages (${Object.entries(codes).map(([c, k]) => `HTTP ${c} x${k}`).join(', ')}); check the host's bot settings and logs`
  ;(role === 'training' ? notes : fails).push(line)
}
close()
if (notes.length) console.log('Notes:\n' + [...new Set(notes)].map((n) => '  ' + n).join('\n'))
finish(fails, `Crawler view clean on ${pages.length} pages for ${Object.keys(BOTS).length} crawlers.`)
