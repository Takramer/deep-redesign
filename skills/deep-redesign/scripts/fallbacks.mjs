// The site still works for readers who turn things off.
//   node fallbacks.mjs <url|build-dir> [paths...]          BROWSER=webkit|firefox
// 1. Script off, at 1440 and 390: no sideways scroll, and no image left invisible by a reveal that
//    waits for script (opacity under 0.5, visibility hidden, or clipped shut).
// 2. Reduced motion, at 1440 and 390: the same, and nothing still animating 2 s after load.
// 3. 400% zoom: a 1280 by 800 window at 400% is a 320 by 200 view. No sideways scroll, and no fixed or
//    sticky bar taking more than half the height.
import { playwright, engineName, target, finish } from './lib.mjs'

const { base, pages, close } = await target('usage: node fallbacks.mjs <url|build-dir> [paths...]')
const pw = await playwright(), name = engineName()
const b = await pw[name].launch(), fails = []
const ff = name === 'firefox'
const ctx = (w, h, o = {}) => b.newContext({ viewport: { width: w, height: h }, ...(ff ? {} : { isMobile: w < 600, hasTouch: w < 600 }), ...o })

const hiddenImgs = () => {
  const out = []
  for (const img of document.querySelectorAll('main img, article img, main picture img')) {
    if (img.closest('dialog:not([open]), [hidden], [aria-hidden="true"]')) continue
    const r = img.getBoundingClientRect()
    if (!r.width || !r.height) continue // left out by the layout on purpose
    let o = 1, shut = false
    for (let el = img; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el)
      o *= +cs.opacity
      if (cs.visibility === 'hidden' || /inset\((4\d|50)%/.test(cs.clipPath)) shut = true
    }
    if (o < 0.5 || shut) out.push(img.alt?.slice(0, 40) || img.src.split('/').pop())
  }
  return out
}
// Scroll from here, not from the page: with script off the page's own timers never run.
const look = async (p) => {
  const [H, vh] = await p.evaluate(() => [document.documentElement.scrollHeight, innerHeight])
  let over = 0
  for (let y = 0; y < H; y += vh) {
    await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(60)
    over = Math.max(over, await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
  }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(60)
  return { over, hidden: await p.evaluate(hiddenImgs) }
}
const moving = () => document.getAnimations().filter((a) => a.playState === 'running').map((a) => {
  const t = a.effect?.target; return `${t?.tagName?.toLowerCase() || '?'}${t?.className && typeof t.className === 'string' ? '.' + t.className.split(' ')[0] : ''}`
})
const go = async (p, u) => { try { await p.goto(base + u, { waitUntil: 'load', timeout: 30000 }); return true } catch (e) { fails.push(`${u}: did not load (${e.message.split('\n')[0]})`); return false } }

for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const [pass, o] of [['script off', { javaScriptEnabled: false }], ['reduced motion', { reducedMotion: 'reduce' }]]) {
    const c = await ctx(w, h, o), p = await c.newPage()
    for (const u of pages) {
      if (!(await go(p, u))) continue
      await p.waitForTimeout(pass === 'reduced motion' ? 2000 : 100)
      const r = await look(p)
      if (r.over > 0) fails.push(`${pass} ${w} ${u}: scrolls sideways by ${r.over} px`)
      if (r.hidden.length) fails.push(`${pass} ${w} ${u}: ${r.hidden.length} hidden image(s): ${r.hidden.slice(0, 3).join('; ')}`)
      if (pass === 'reduced motion') {
        const m = await p.evaluate(moving)
        if (m.length) fails.push(`${pass} ${w} ${u}: still moving after 2 s: ${[...new Set(m)].slice(0, 3).join('; ')}`)
      }
    }
    await c.close()
  }
}
{
  const c = await b.newContext({ viewport: { width: 320, height: 200 } }), p = await c.newPage()
  for (const u of pages) {
    if (!(await go(p, u))) continue
    await p.waitForTimeout(150)
    const r = await look(p)
    const bars = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => /fixed|sticky/.test(getComputedStyle(e).position)).map((e) => {
      const r = e.getBoundingClientRect(); return { h: Math.round(Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)), n: e.tagName.toLowerCase() }
    }).filter((x) => x.h > 100))
    if (r.over > 0) fails.push(`400% ${u}: scrolls sideways by ${r.over} px`)
    for (const x of bars) fails.push(`400% ${u}: a fixed ${x.n} takes ${x.h} of 200 px`)
  }
  await c.close()
}
await b.close(); close()
finish(fails, `${name}: script off, reduced motion and 400% zoom clean on ${pages.length} pages.`)
