// No sideways scroll at 11 widths, and lines that must hold one line do.
//   node widths.mjs <url|build-dir> [paths...] [--hold=".hero h1,.email"] [--stills=out-dir]
//   BROWSER=webkit|firefox for the other engines.
// Each page is scrolled top to bottom at each width, because things that move on scroll can run off
// the edge lower down. From 600 px up the page gets real 15 px scrollbars, as a desktop with a mouse
// has them: hidden scrollbars can hide a large overflow. Phones get a real mobile
// viewport, never a headless window-size flag (that laid phones out about 500 px wide).
import fs from 'node:fs'
import path from 'node:path'
import { playwright, engineName, target, finish } from './lib.mjs'

const { base, pages, close, opts } = await target('usage: node widths.mjs <url|build-dir> [paths...] [--hold=selectors] [--stills=dir]')
const pw = await playwright(), name = engineName(), engine = pw[name]
const WIDTHS = [320, 360, 390, 430, 600, 768, 900, 1024, 1280, 1440, 1920]
const HOLD = opts.hold ? String(opts.hold).split(',').map((s) => s.trim()).filter(Boolean) : []
const ff = name === 'firefox' // Firefox takes no isMobile
const ctx = (b, w, h, scale = 1) => b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, ...(ff ? {} : { isMobile: w < 600, hasTouch: w < 600 }) })

const browser = await engine.launch(name === 'chromium' ? { ignoreDefaultArgs: ['--hide-scrollbars'] } : {})
const fails = []
for (const w of WIDTHS) {
  const c = await ctx(browser, w, w < 600 ? 844 : 900), page = await c.newPage()
  for (const p of pages) {
    try { await page.goto(base + p, { waitUntil: 'load', timeout: 30000 }) } catch (e) { fails.push(`${w} ${p}: did not load (${e.message.split('\n')[0]})`); continue }
    if (w >= 600) await page.addStyleTag({ content: '::-webkit-scrollbar { width: 15px; height: 15px; background: #ddd }' })
    await page.evaluate(() => document.fonts.ready)
    const r = await page.evaluate(async (hold) => {
      const de = document.documentElement
      let over = 0
      for (let y = 0; y < de.scrollHeight; y += innerHeight) {
        scrollTo(0, y); await new Promise((res) => setTimeout(res, 50))
        over = Math.max(over, de.scrollWidth - de.clientWidth)
      }
      scrollTo(0, 0)
      const lines = (el) => {
        const cs = getComputedStyle(el)
        if (cs.display === 'inline') return el.getClientRects().length
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
        return Math.round(el.getBoundingClientRect().height / lh)
      }
      const broke = hold.flatMap((s) => [...document.querySelectorAll(s)].filter((el) => el.getClientRects().length && lines(el) > 1).map(() => `"${s}" wraps`))
      return { over, broke }
    }, HOLD)
    if (r.over > 0) fails.push(`${w} ${p}: scrolls sideways by ${r.over} px`)
    for (const s of r.broke) fails.push(`${w} ${p}: ${s}`)
  }
  await c.close()
}
await browser.close()

if (opts.stills) {
  const out = String(opts.stills); fs.mkdirSync(out, { recursive: true })
  const b = await engine.launch()
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const c = await ctx(b, w, h, 2), page = await c.newPage()
    for (const p of pages) {
      try { await page.goto(base + p, { waitUntil: 'load' }) } catch { continue }
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1500)
      await page.screenshot({ path: path.join(out, `${p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/\//g, '-')}-${w}.png`) })
    }
    await c.close()
  }
  await b.close()
  console.log(`Stills: ${out}`)
}
close()
finish(fails, `${name}: no sideways scroll${HOLD.length ? ' and no broken line' : ''} on ${pages.length} pages at ${WIDTHS.length} widths.`)
