// A keyboard path through every page, at 1440 and 390.
//   node keyboard.mjs <url|build-dir> [paths...] [--stops=60]      BROWSER=webkit|firefox
// Fails on a stop with no name, a stop that looks the same focused and unfocused (no visible ring),
// a stop off screen or hidden under a fixed bar, and a trap (focus stuck on one element).
// Webkit needs "Tab moves to links": Playwright sets it, a real Safari needs the setting turned on.
import { playwright, engineName, target, finish } from './lib.mjs'

const { base, pages, close, opts } = await target('usage: node keyboard.mjs <url|build-dir> [paths...] [--stops=N]')
const pw = await playwright(), name = engineName()
const b = await pw[name].launch(), fails = []
const STOPS = +(opts.stops || 60)

const probe = () => {
  const e = document.activeElement
  if (!e || e === document.body || e === document.documentElement) return null
  // The ring may sit on the element, its ::before or ::after, or a child (an underline on the title
  // inside a card link), so compare all of them.
  const one = (cs) => [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow, cs.backgroundColor, cs.backgroundSize, cs.color, cs.borderColor, cs.textDecorationLine, cs.opacity].join('|')
  const look = (el) => [el, ...[...el.querySelectorAll('*')].slice(0, 40)].map((n) => one(getComputedStyle(n)) + one(getComputedStyle(n, '::before')) + one(getComputedStyle(n, '::after'))).join('/')
  const focused = look(e)
  // Compare with the same element unfocused. Blur, read, refocus.
  e.blur(); const plain = look(e); e.focus({ preventScroll: true })
  const r = e.getBoundingClientRect()
  const name = (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.innerText || e.innerText || e.getAttribute('title') || e.querySelector?.('img')?.alt || e.getAttribute('placeholder') || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 50)
  // Hidden under a fixed or sticky bar: the element at the stop's middle is not the stop or inside it.
  const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(r.top + Math.min(r.height / 2, 10), 0), innerHeight - 1)
  const top = document.elementFromPoint(x, y)
  let barOnTop = false
  for (let el = top; el && el !== document.body; el = el.parentElement) if (/fixed|sticky/.test(getComputedStyle(el).position)) { barOnTop = true; break }
  const covered = !!top && !e.contains(top) && !top.contains(e) && barOnTop
  const id = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('href') ? `[href="${e.getAttribute('href')}"]` : '')
  return { id, name, ring: focused !== plain, onscreen: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, covered, size: r.width * r.height }
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const c = await b.newContext({ viewport: { width: w, height: h } }), p = await c.newPage()
  for (const u of pages) {
    try { await p.goto(base + u, { waitUntil: 'load', timeout: 30000 }) } catch (e) { fails.push(`${w} ${u}: did not load`); continue }
    await p.waitForTimeout(300)
    let last = null, same = 0, count = 0
    for (let i = 0; i < STOPS; i++) {
      await p.keyboard.press('Tab')
      const s = await p.evaluate(probe)
      if (!s) { if (count) break; else continue } // back to the page: the path is done
      count++
      if (s.id === last) { if (++same >= 3) { fails.push(`${w} ${u}: focus stuck on ${s.id}`); break } } else same = 0
      last = s.id
      const where = `${w} ${u} stop ${count} ${s.id}`
      if (!s.name) fails.push(`${where}: no accessible name`)
      if (!s.ring) fails.push(`${where}: looks the same focused and unfocused`)
      if (!s.onscreen && s.size > 1) fails.push(`${where}: off screen when focused`)
      if (s.covered) fails.push(`${where}: hidden under a fixed bar`)
    }
    if (!count) fails.push(`${w} ${u}: Tab reaches nothing`)
  }
  await c.close()
}
await b.close(); close()
finish([...new Set(fails)], `${name}: keyboard path clean on ${pages.length} pages at 1440 and 390.`)
