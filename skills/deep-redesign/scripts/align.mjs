// The small layout faults a person catches at 400% zoom and a build never does.
//   node align.mjs <url|build-dir> [paths...] [--widths=390,768,1440] [--tol=1] [--shots=out-dir]
//   node align.mjs --self-test
// Checks, at each width, after scrolling the page once so lazy content is in:
//   centre   an icon or one-line label sits off the centre of its button, pill, chip or tag
//   double   two borders touch side by side and draw one 2 px line where a 1 px line was meant
//   clip     text cut off by overflow: hidden with no ellipsis (sideways scrollers are left alone)
//   overlap  two pieces of text, or text and an image, cover each other
//   target   a control under 24 px on a phone (WCAG 2.2 target size; inline links in prose exempt)
// --shots writes a full-page PNG per page and width with every finding outlined in red, so a
// reviewer can look instead of trusting the list. Exit 1 on any finding.
// ponytail: centre checks a control's own drawn box. A label off centre inside a drawn parent (a pill
// wrapping a whole menu) is missed; add a walk up to the nearest drawn ancestor if that bites.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { playwright, engineName, target, finish } from './lib.mjs'

// Runs in the page. Returns [{kind, sel, msg}] and marks each element with data-qa-flag.
function audit({ tol, phone }) {
  const out = [], seen = new Set()
  // Seen by a sighted reader: not hidden by an ancestor, and not the 1 px screen-reader-only pattern.
  const vis = (el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
    if (r.width <= 1 || r.height <= 1) return false
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const c = getComputedStyle(e), q = e.getBoundingClientRect()
      if (c.clip.startsWith('rect(0') || c.clipPath.startsWith('inset(50%') || (c.overflow !== 'visible' && (q.width <= 1 || q.height <= 1))) return false
    }
    return el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : cs.visibility !== 'hidden' && +cs.opacity > 0
  }
  const sel = (el) => {
    const part = (e) => e.id ? `#${e.id}` : e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map((c) => '.' + c).join('')
    const bits = []
    for (let e = el; e && e !== document.body && bits.length < 3; e = e.parentElement) { bits.unshift(part(e)); if (e.id) break }
    return bits.join(' > ')
  }
  const flag = (kind, el, msg) => {
    const s = sel(el), key = kind + s + msg
    if (seen.has(key)) return
    seen.add(key); el.setAttribute('data-qa-flag', kind); out.push({ kind, sel: s, msg })
  }
  const px = (v) => parseFloat(v) || 0
  const textRect = (el) => { // union of the element's text and child boxes, the ink a reader sees
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity, lines = 0
    const add = (q) => { if (!q.width && !q.height) return; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom) }
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) { const g = document.createRange(); g.selectNodeContents(n); const rs = g.getClientRects(); lines += rs.length; for (const q of rs) add(q) }
      else if (n.nodeType === 1 && vis(n) && !['absolute', 'fixed'].includes(getComputedStyle(n).position)) { lines++; add(n.getBoundingClientRect()) }
    }
    return l === Infinity ? null : { l, t, r, b, lines }
  }

  // centre
  const controls = document.querySelectorAll('button, [role=button], [role=tab], a[class], summary, [class*=btn], [class*=pill], [class*=chip], [class*=badge], [class*=tag]')
  for (const el of controls) {
    if (!vis(el) || el.closest('p, li > p')) continue
    const cs = getComputedStyle(el), box = el.getBoundingClientRect(), ink = textRect(el)
    if (!ink || box.height > 120) continue // a card, not a control
    // Off-centre only shows when the box is drawn: a border, a fill or a shadow.
    const drawn = ['Top', 'Right', 'Bottom', 'Left'].some((d) => px(cs[`border${d}Width`]) > 0 && cs[`border${d}Style`] !== 'none') || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none'
    if (!drawn) continue
    // Measure against the box inside the border: uneven padding that pushes a label off centre is the fault.
    const contentL = box.left + px(cs.borderLeftWidth), contentR = box.right - px(cs.borderRightWidth)
    const contentT = box.top + px(cs.borderTopWidth), contentB = box.bottom - px(cs.borderBottomWidth)
    const flex = cs.display.includes('flex') || cs.display.includes('grid')
    const meantCentreX = (flex && ['center', 'space-around', 'space-evenly'].includes(cs.justifyContent)) || (!flex && cs.textAlign === 'center') || cs.placeItems?.startsWith('center') || (Math.abs(px(cs.paddingLeft) - px(cs.paddingRight)) < 0.5 && (cs.display.startsWith('inline') || box.width < 240) && el.tagName !== 'SUMMARY')
    const dx = (ink.l + ink.r) / 2 - (contentL + contentR) / 2, dy = (ink.t + ink.b) / 2 - (contentT + contentB) / 2
    if (meantCentreX && ink.r - ink.l < contentR - contentL - 4 && Math.abs(dx) > tol) flag('centre', el, `content ${Math.abs(dx).toFixed(1)} px ${dx > 0 ? 'right' : 'left'} of centre`)
    const meantCentreY = el.tagName === 'BUTTON' || (flex && ['center', 'baseline'].includes(cs.alignItems)) || cs.placeItems?.startsWith('center') || (Math.abs(px(cs.paddingTop) - px(cs.paddingBottom)) < 0.5 && box.height < 64)
    if (meantCentreY && ink.b - ink.t < contentB - contentT - 4 && Math.abs(dy) > tol + 0.5) flag('centre', el, `content ${Math.abs(dy).toFixed(1)} px ${dy > 0 ? 'below' : 'above'} centre`)
  }

  // double: border bands of different elements that abut along the same line
  const bands = []
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('table') || !vis(el)) continue
    const cs = getComputedStyle(el); if (cs.position === 'fixed') continue
    const r = el.getBoundingClientRect(), sy = scrollY
    for (const [side, w, st] of [['top', cs.borderTopWidth, cs.borderTopStyle], ['bottom', cs.borderBottomWidth, cs.borderBottomStyle], ['left', cs.borderLeftWidth, cs.borderLeftStyle], ['right', cs.borderRightWidth, cs.borderRightStyle]]) {
      const bw = px(w); if (bw < 0.5 || st === 'none' || st === 'hidden') continue
      if (side === 'top') bands.push({ el, h: true, a: r.top + sy, z: r.top + sy + bw, s: r.left, e: r.right })
      if (side === 'bottom') bands.push({ el, h: true, a: r.bottom + sy - bw, z: r.bottom + sy, s: r.left, e: r.right })
      if (side === 'left') bands.push({ el, h: false, a: r.left, z: r.left + bw, s: r.top + sy, e: r.bottom + sy })
      if (side === 'right') bands.push({ el, h: false, a: r.right - bw, z: r.right, s: r.top + sy, e: r.bottom + sy })
    }
    if (bands.length > 4000) break
  }
  for (let i = 0; i < bands.length; i++) for (let j = i + 1; j < bands.length; j++) {
    const p = bands[i], q = bands[j]
    if (p.h !== q.h || p.el === q.el) continue
    const touch = Math.abs(p.z - q.a) <= 0.5 || Math.abs(q.z - p.a) <= 0.5
    if (touch && Math.min(p.e, q.e) - Math.max(p.s, q.s) >= 16) flag('double', p.el, `${p.h ? 'horizontal' : 'vertical'} border sits against ${sel(q.el)}'s, drawing a ${(p.z - p.a + q.z - q.a).toFixed(0)} px line`)
  }

  // clip
  for (const el of document.body.querySelectorAll('*')) {
    if (!vis(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    const cs = getComputedStyle(el)
    if (['auto', 'scroll'].includes(cs.overflowX) || el.closest('[style*="overflow"], [class*=scroll], [class*=marquee], [class*=ticker]')) continue
    if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1) flag('clip', el, `text cut off by ${el.scrollWidth - el.clientWidth} px`)
    if ((cs.overflowY === 'hidden' || cs.overflowY === 'clip') && !cs.webkitLineClamp?.match(/\d/) && el.scrollHeight > el.clientHeight + 2) flag('clip', el, `text cut off by ${el.scrollHeight - el.clientHeight} px at the bottom`)
  }

  // overlap: text boxes, and text against images or video
  const leaves = [...document.body.querySelectorAll('*')].filter((el) => vis(el) && !['fixed', 'sticky'].includes(getComputedStyle(el).position) && (['IMG', 'VIDEO', 'svg'].includes(el.tagName) ? el.getBoundingClientRect().width > 40 : [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))).slice(0, 1500)
  // Inline text that wraps gets one box per line; its overall box would cover the line beside it.
  const boxes = leaves.flatMap((el) => [...el.getClientRects()].map((r) => ({ el, r, text: !['IMG', 'VIDEO', 'svg'].includes(el.tagName) })))
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]
    if (!a.text && !b.text) continue
    if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue
    // Stacked on purpose: a badge, caption or layer placed absolutely inside the frame both share.
    const layered = (x, y) => { for (let e = x.el; e && !e.contains(y.el); e = e.parentElement) if (['absolute', 'fixed'].includes(getComputedStyle(e).position)) return true; return false }
    if (layered(a, b) || layered(b, a)) continue
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
    // Tight leading lets line boxes overlap a few px without the letters touching.
    if (w > 2 && h > Math.max(4, 0.25 * Math.min(a.r.height, b.r.height))) flag('overlap', a.el, `covers ${sel(b.el)} by ${w.toFixed(0)}x${h.toFixed(0)} px`)
  }

  // target
  if (phone) for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]')) {
    if (!vis(el)) continue
    const p = el.parentElement, inline = el.tagName === 'A' && p && [...p.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    const r = el.getBoundingClientRect()
    if (!inline && (r.width < 24 || r.height < 24)) flag('target', el, `tap target ${r.width.toFixed(0)}x${r.height.toFixed(0)} px, under 24`)
  }
  return out
}

async function run({ base, pages, opts }) {
  const pw = await playwright(), name = engineName(), engine = pw[name]
  const widths = String(opts.widths || '390,768,1440').split(',').map(Number)
  const tol = +(opts.tol ?? 1), shots = opts.shots ? String(opts.shots) : null
  if (shots) fs.mkdirSync(shots, { recursive: true })
  const browser = await engine.launch(), found = new Map()
  for (const w of widths) {
    const phone = w < 600
    const c = await browser.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: shots ? 2 : 1, ...(name === 'firefox' ? {} : { isMobile: phone, hasTouch: phone }) })
    const page = await c.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' }) // judge where things land, not where they are mid-animation
    for (const p of pages) {
      try { await page.goto(base + p, { waitUntil: 'load', timeout: 30000 }) } catch (e) { found.set(`load ${p}`, { line: `load  ${p}: did not load (${e.message.split('\n')[0]})`, w: [w] }); continue }
      await page.evaluate(async () => { await document.fonts.ready; for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } scrollTo(0, 0) })
      await page.waitForTimeout(400)
      for (const f of await page.evaluate(audit, { tol, phone })) {
        const k = `${f.kind}|${p}|${f.sel}|${f.msg}`
        if (found.has(k)) found.get(k).w.push(w); else found.set(k, { line: `${f.kind.padEnd(7)} ${p}  ${f.sel}: ${f.msg}`, w: [w] })
      }
      if (shots) {
        await page.addStyleTag({ content: '[data-qa-flag]{outline:2px solid #f00 !important;outline-offset:1px}' })
        await page.screenshot({ path: path.join(shots, `${p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/\//g, '-')}-${w}.png`), fullPage: true })
      }
    }
    await c.close()
  }
  await browser.close()
  return [...found.values()].map((f) => `${f.line}  [${f.w.join(', ')}]`)
}

if (process.argv.includes('--self-test')) {
  // One page with one fault of each kind and one clean control, which must stay clean.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-')), assert = (await import('node:assert')).strict
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><meta name=viewport content="width=device-width"><style>
    body{margin:20px;font:16px/1.4 sans-serif} button{all:unset;box-sizing:border-box;display:inline-flex;justify-content:center;align-items:center;width:120px;height:44px;border:1px solid #000}
    #off{padding-left:14px} .cell{border:1px solid #000;height:40px;width:200px} #clip{width:60px;overflow:hidden;white-space:nowrap}
    #a,#b{position:relative;width:200px} #b{top:-30px} #tiny{display:inline-block;width:16px;height:16px;background:#000}
  </style><button id=ok>Clean</button> <button id=off>Shifted</button><div style="height:20px"></div>
  <div class=cell id=c1></div><div class=cell id=c2></div><div id=clip>A label far too long</div>
  <p id=a>First line of text</p><p id=b>Second line of text</p><div><a id=tiny href=#></a></div>`)
  const { base, pages, close } = await (async () => { process.argv = [process.argv[0], process.argv[1], dir]; return target('') })()
  const lines = (await run({ base, pages, opts: { widths: '390' } })).join('\n'); close()
  for (const [kind, id] of [['centre', '#off'], ['double', '#c1'], ['clip', '#clip'], ['overlap', '#a'], ['target', '#tiny']]) assert.match(lines, new RegExp(`${kind}.*${id}`), `missed ${kind} on ${id}:\n${lines}`)
  assert.doesNotMatch(lines, /#ok/, `flagged the clean button:\n${lines}`)
  fs.rmSync(dir, { recursive: true }); console.log('align.mjs self-test passed'); process.exit(0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = await target('usage: node align.mjs <url|build-dir> [paths...] [--widths=390,768,1440] [--tol=1] [--shots=dir]')
  const fails = await run(t); t.close()
  finish(fails, `${engineName()}: no off-centre, doubled, clipped, overlapping or undersized elements on ${t.pages.length} pages.`)
}
