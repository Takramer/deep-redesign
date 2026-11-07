// The one tool simulated readers use. Each mode shows the page the way one kind of reader gets it.
//   node reader.mjs <mode> <url> [arg]
//   text   <url>              visible text of <main> (else body): a skimmer
//   aria   <url>              the accessibility tree: a screen-reader user
//   heads  <url>              headings and landmarks only: a screen-reader skim
//   links  <url>              every link and button with its name and target
//   tab    <url> [n=40]       press Tab n times; each stop's role, name, ring and place on screen
//   reflow <url> [width=320]  the page at that width (320 is 1280 at 400%): sideways scroll, clipped text
//   meta   <url>              title, description, canonical and share-card tags
//   shot   <url> <out.png> [width=1440] [full=0]
// BROWSER=webkit|firefox for other engines.
import { playwright, engineName } from './lib.mjs'

const [mode, url, a, b, c] = process.argv.slice(2)
if (!mode || !url) { console.error('usage: node reader.mjs <text|aria|heads|links|tab|reflow|meta|shot> <url> [arg]'); process.exit(2) }
const pw = await playwright()
const width = mode === 'reflow' ? +(a || 320) : mode === 'shot' ? +(b || 1440) : 1440
const browser = await pw[engineName()].launch()
const page = await browser.newPage({ viewport: { width, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.waitForLoadState('load'))
const clean = (s) => (s || '').trim().replace(/\s+/g, ' ')

if (mode === 'text') {
  const main = page.locator('main')
  console.log(await ((await main.count()) ? main.first() : page.locator('body')).innerText())
} else if (mode === 'aria') {
  console.log(await page.locator('body').ariaSnapshot())
} else if (mode === 'heads') {
  const out = await page.$$eval('h1,h2,h3,h4,h5,h6,header,nav,main,footer,aside,[role=region][aria-label],section[aria-label],[role=banner],[role=navigation],[role=main],[role=contentinfo]', (els) =>
    els.map((e) => /^H\d$/.test(e.tagName) ? `${e.tagName} ${e.innerText.trim().replace(/\s+/g, ' ')}` : `[${e.getAttribute('role') || e.tagName.toLowerCase()}${e.getAttribute('aria-label') ? ' ' + e.getAttribute('aria-label') : ''}]`))
  console.log(out.join('\n'))
} else if (mode === 'links') {
  const out = await page.$$eval('a,button,[role=button]', (els) => els.map((e) => {
    const name = (e.getAttribute('aria-label') || e.innerText || e.querySelector('img')?.alt || e.getAttribute('title') || '').trim().replace(/\s+/g, ' ')
    return `${e.tagName.toLowerCase()} "${name}" ${e.getAttribute('href') || ''}`
  }))
  console.log(out.join('\n'))
} else if (mode === 'tab') {
  for (let i = 0; i < +(a || 40); i++) {
    await page.keyboard.press('Tab')
    const s = await page.evaluate(() => {
      const e = document.activeElement
      if (!e || e === document.body) return 'body'
      const cs = getComputedStyle(e)
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none'
      const r = e.getBoundingClientRect()
      const name = (e.getAttribute('aria-label') || e.innerText || e.querySelector?.('img')?.alt || '').trim().replace(/\s+/g, ' ').slice(0, 60)
      return `${e.tagName.toLowerCase()}${e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''} "${name}" ring=${ring} onscreen=${r.bottom > 0 && r.top < innerHeight}`
    })
    console.log(i + 1, s)
  }
} else if (mode === 'reflow') {
  const r = await page.evaluate(() => {
    const W = document.documentElement.clientWidth
    const wide = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > W + 1 && getComputedStyle(e).position !== 'fixed' })
      .slice(0, 10).map((e) => `${e.tagName.toLowerCase()}${e.classList.length ? '.' + [...e.classList].join('.') : ''} right=${Math.round(e.getBoundingClientRect().right)}`)
    const clipped = [...document.querySelectorAll('p,h1,h2,h3,li,a,span,dd,dt')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').slice(0, 10).map((e) => e.innerText.slice(0, 40))
    return { width: W, scrollWidth: document.documentElement.scrollWidth, wide, clipped }
  })
  console.log(JSON.stringify(r, null, 1))
} else if (mode === 'meta') {
  const m = await page.evaluate(() => {
    const q = (s, a = 'content') => document.querySelector(s)?.getAttribute(a) ?? null
    return { title: document.title, description: q('meta[name=description]'), canonical: q('link[rel=canonical]', 'href'), ogTitle: q('meta[property="og:title"]'), ogImage: q('meta[property="og:image"]'), twitterCard: q('meta[name="twitter:card"]'), h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()), jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].length }
  })
  console.log(JSON.stringify(m, null, 1))
} else if (mode === 'shot') {
  if (!a) { console.error('shot needs an output path'); process.exit(2) }
  await page.screenshot({ path: a, fullPage: c === '1' })
  console.log('saved', a)
} else { console.error(`unknown mode: ${mode}`); process.exit(2) }
await browser.close()
