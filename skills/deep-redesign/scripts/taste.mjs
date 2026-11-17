// The DOM inventory behind references/taste-rubric.md: what a page's rhythm, type, surfaces, colour
// and actions are made of, per page and width, plus a cross-page table that shows drift.
//   node taste.mjs <url|build-dir> [paths...] [--widths=390,768,1440] [--base=4] [--shots=dir] [--json]
//   node taste.mjs --self-test
// Blocks: sections (structure signature, gaps, edges), gaps (sibling gaps, heading above/below, off
// scale), type (families, size/line/weight combos, roles), measure (characters per line), surfaces
// (radii, shadows, borders, boxed share, nesting), colours (fill area, accent share, hues, A/B/A/B),
// buttons (signatures, filled in first screen, repeated labels), chrome (fixed bar, h1, fold),
// copy (stock words, heading outline), then a summary table per width; a * marks a cell that differs
// from the most common value in its column. --shots writes full-page PNGs and one-screen slices.
// It is inventory, not a gate: exit 0, or 2 when a page does not load. The reviewer judges.
// ponytail: blocks 7 (effects), 9 to 13 (repeats, icons, images, motion) of the spec are left out;
// the reviewer measures those by eye and with page.evaluate. Add them when a review keeps needing one.
// ponytail: vis() and sel() repeat align.mjs; move them to lib.mjs if a third script needs them.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { playwright, engineName, target } from './lib.mjs'

export const STOCK = ['unlock', 'elevate', 'seamless', 'supercharge', 'effortless', 'empower', 'revolutionize', 'revolutionise', 'cutting-edge', 'next-level', 'game-changing', 'to the next level', 'built for the modern', 'all-in-one', 'lorem ipsum', 'harness the power', 'take your', 'in today\'s']

// Runs in the page.
function inventory({ base, stock }) {
  const vw = innerWidth, vh = innerHeight, r1 = (v) => Math.round(v)
  const vis = (el) => {
    const r = el.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1) return false
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const c = getComputedStyle(e), q = e.getBoundingClientRect()
      if (c.clip.startsWith('rect(0') || c.clipPath.startsWith('inset(50%') || (c.overflow !== 'visible' && (q.width <= 1 || q.height <= 1))) return false
    }
    if (r.right <= 0 || r.left >= innerWidth || r.bottom + scrollY <= 0) return false // skip links and drawers parked off screen
    return el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : getComputedStyle(el).visibility !== 'hidden'
  }
  const sel = (el) => {
    const part = (e) => e.id ? `#${e.id}` : e.tagName.toLowerCase() + [...e.classList].filter((c) => !/[:[\]/]/.test(c)).slice(0, 2).map((c) => '.' + c).join('')
    const bits = []
    for (let e = el; e && e !== document.body && bits.length < 3; e = e.parentElement) { bits.unshift(part(e)); if (e.id) break }
    return bits.join(' > ')
  }
  const px = (v) => parseFloat(v) || 0
  const top = (el) => el.getBoundingClientRect().top + scrollY
  // Colours: parse rgb(a), blend alpha over the nearest opaque ground, report hex.
  // Any CSS colour (rgb, lab, oklab, oklch, color()) to sRGB by painting one canvas pixel: a regex over
  // the numbers read lab() as rgb on Tailwind 4 sites and broke every contrast and fill figure.
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true }), cache = new Map()
  cv.canvas.width = cv.canvas.height = 1
  const rgba = (s) => {
    if (cache.has(s)) return cache.get(s)
    cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = s; cv.fillRect(0, 0, 1, 1)
    const d = cv.getImageData(0, 0, 1, 1).data, v = [d[0], d[1], d[2], d[3] / 255]; cache.set(s, v); return v
  }
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
  const ground = (el) => {
    for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0.5) return c }
    return [255, 255, 255, 1]
  }
  const blend = (c, g) => [0, 1, 2].map((i) => c[i] * c[3] + g[i] * (1 - c[3])).concat(1)
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const hsl = (c) => { const [r, g, b] = c.slice(0, 3).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
    if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, s, l] }
  const tally = (m, k, n = 1, sample) => { const v = m.get(k) || { n: 0, sample }; v.n += n; m.set(k, v) }
  const all = [...document.body.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BR'].includes(e.tagName))
  const shown = all.filter(vis)
  const textNodes = (root) => { const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.textContent.trim() && n.parentElement && vis(n.parentElement)) out.push(n); return out }
  const ink = (root) => { // union of visible text and media boxes: what a reader sees, not padding
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
    const add = (q) => { if (q.width < 1 || q.height < 1) return; l = Math.min(l, q.left); t = Math.min(t, q.top + scrollY); r = Math.max(r, q.right); b = Math.max(b, q.bottom + scrollY) }
    for (const n of textNodes(root)) { const g = document.createRange(); g.selectNodeContents(n); for (const q of g.getClientRects()) add(q) }
    for (const m of root.querySelectorAll('img, svg, video, canvas, picture, input, button, iframe')) if (vis(m)) add(m.getBoundingClientRect())
    return l === Infinity ? null : { l, t, r, b }
  }
  const isBtn = (e) => {
    if (e.matches('button, [role=button], input[type=submit], input[type=button]')) return true
    if (e.tagName !== 'A') return false
    const c = getComputedStyle(e)
    return (rgba(c.backgroundColor)[3] > 0.1 || px(c.borderTopWidth) > 0) && px(c.paddingLeft) >= 8 && e.getBoundingClientRect().height >= 28
  }
  const pageBg = ground(document.body)

  // sections
  const main = document.querySelector('main') || document.body
  let kids = [...main.children].filter((e) => vis(e) && !e.matches('header, nav, footer, [role=banner], [role=contentinfo]'))
  while (kids.length === 1 && kids[0].children.length) kids = [...kids[0].children].filter(vis)
  const big = (e) => { const r = e.getBoundingClientRect(); return r.width >= vw * 0.6 && r.height >= 80 }
  const head = document.querySelector('header, [role=banner]'), foot = document.querySelector('footer, [role=contentinfo]')
  const secEls = [...(head && vis(head) && !main.contains(head) ? [head] : []), ...kids.filter(big), ...(foot && vis(foot) && !main.contains(foot) ? [foot] : [])]
  const token = (e) => {
    if (/^H[1-6]$/.test(e.tagName)) return e.tagName.toLowerCase()
    if (isBtn(e)) return 'btn'
    if (e.matches('img, picture, video, svg, canvas, figure')) return 'img'
    if (e.matches('p, blockquote')) return e.tagName === 'BLOCKQUOTE' ? 'quote' : 'p'
    if (e.matches('form')) return 'form'
    if (e.matches('table')) return 'table'
    const k = [...e.children].filter(vis)
    if (e.matches('ul, ol')) return `list${k.length}`
    if (k.length >= 2) { const key = (x) => x.tagName + (x.classList[0] || ''); if (k.every((x) => key(x) === key(k[0]))) {
      const row = k.length > 1 && Math.abs(k[0].getBoundingClientRect().top - k[1].getBoundingClientRect().top) < 4
      const inner = [...k[0].querySelectorAll('h1,h2,h3,h4,h5,h6,p,img,svg,button,a')].filter(vis).slice(0, 4).map((x) => /^H/.test(x.tagName) ? 'h' : x.tagName === 'P' ? 'p' : x.tagName === 'A' ? 'a' : x.tagName === 'BUTTON' ? 'btn' : 'img')
      return `${row ? 'grid' : 'stack'}${k.length}(${[...new Set(inner)].join('+')})` } }
    if (k.length === 1) return token(k[0])
    if (k.length === 0) return e.textContent.trim().length < 40 && e.textContent.trim() ? 'label' : ''
    return k.map(token).filter(Boolean).join('+')
  }
  const flat = (e) => { let k = [...e.children].filter(vis); while (k.length === 1 && k[0].children.length) k = [...k[0].children].filter(vis); return k }
  const sections = secEls.map((e) => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect(), k = ink(e), texts = [...e.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote')].filter(vis)
    const bg = c.backgroundImage.includes('gradient') ? 'gradient' : c.backgroundImage !== 'none' ? 'image' : rgba(c.backgroundColor)[3] > 0.1 ? hex(blend(rgba(c.backgroundColor), pageBg)) : '-'
    const parts = flat(e).map(token).filter(Boolean).join('+')
    return { sel: sel(e), tag: e === head ? 'header' : e === foot ? 'footer' : '', y: r1(r.top + scrollY), h: r1(r.height), padTop: r1(px(c.paddingTop)), padBottom: r1(px(c.paddingBottom)),
      inkTop: k ? r1(k.t) : null, inkBottom: k ? r1(k.b) : null, boxBottom: r1(r.bottom + scrollY), bg,
      left: k ? r1(k.l) : null, right: k ? r1(vw - k.r) : null, fullBleed: bg !== '-' && r.width >= vw - 2,
      centred: texts.length ? Math.round(100 * texts.filter((t) => getComputedStyle(t).textAlign === 'center').length / texts.length) : 0,
      sig: parts.length > 90 ? parts.slice(0, 90) + '…' : parts }
  })
  sections.forEach((s, i) => { const n = sections[i + 1]; if (n) { s.gapToNext = n.inkTop != null && s.inkBottom != null ? n.inkTop - s.inkBottom : null; s.boxGap = n.y - s.boxBottom } })

  // gaps
  const sib = new Map(), offScale = [], heads = []
  const off = (v) => { const m = v % base; return v > 0 && m > 1 && m < base - 1 }
  for (const s of secEls) for (const parent of [s, ...s.querySelectorAll('*')]) {
    if (!vis(parent) || parent.closest('svg')) continue
    const pc = getComputedStyle(parent); if (pc.display.includes('grid') || pc.flexWrap === 'wrap') continue // cells, not a vertical stack
    const k = [...parent.children].filter((x) => vis(x) && !['absolute', 'fixed'].includes(getComputedStyle(x).position) && !getComputedStyle(x).display.startsWith('inline'))
    for (let i = 1; i < k.length; i++) { const a = k[i - 1].getBoundingClientRect(), b = k[i].getBoundingClientRect(); if (b.top >= a.bottom - 0.5) { const g = r1(b.top - a.bottom); tally(sib, g); if (off(g)) offScale.push(`gap ${g} before ${sel(k[i])}`) } }
  }
  for (const h of shown.filter((e) => /^H[1-4]$/.test(e.tagName))) {
    const prev = h.previousElementSibling && vis(h.previousElementSibling) ? h.previousElementSibling : null, next = h.nextElementSibling && vis(h.nextElementSibling) ? h.nextElementSibling : null
    const r = h.getBoundingClientRect(), above = prev ? r1(r.top - prev.getBoundingClientRect().bottom) : null, below = next ? r1(next.getBoundingClientRect().top - r.bottom) : null
    if (above != null && below != null && below >= above && below > 0) heads.push(`${sel(h)} above ${above} below ${below}`)
  }
  const pads = new Map(), uneven = []
  for (const e of shown) {
    const c = getComputedStyle(e)
    if (!(rgba(c.backgroundColor)[3] > 0.1 || px(c.borderTopWidth) || px(c.borderLeftWidth) || c.boxShadow !== 'none')) continue
    const pl = r1(px(c.paddingLeft)), pr = r1(px(c.paddingRight)), pt = r1(px(c.paddingTop)), pb = r1(px(c.paddingBottom))
    tally(pads, `${pt} ${pr} ${pb} ${pl}`, 1, sel(e))
    const er = e.getBoundingClientRect()
    if (er.width < 60 || er.height < 24) continue // a chip of colour, not a container
    if (Math.abs(pl - pr) > 1 && er.width < vw - 2) uneven.push(`${sel(e)} padding left ${pl} right ${pr}`)
    for (const v of [pl, pr, pt, pb]) if (off(v)) { offScale.push(`padding ${v} on ${sel(e)}`); break }
  }

  // type and measure
  const combos = new Map(), fams = new Map(), cols = new Map(), lowC = []
  let minSize = { v: Infinity }
  for (const n of textNodes(document.body)) {
    const e = n.parentElement, c = getComputedStyle(e), chars = n.textContent.trim().length, fs = px(c.fontSize)
    if (rgba(c.color)[3] === 0 || rgba(c.webkitTextFillColor || c.color)[3] === 0) continue // gradient or clipped text: contrast is not measurable here
    const lh = c.lineHeight === 'normal' ? 'n' : r1(px(c.lineHeight))
    tally(combos, `${r1(fs * 10) / 10}/${lh}/${c.fontWeight}`, chars, sel(e)); combos.get(`${r1(fs * 10) / 10}/${lh}/${c.fontWeight}`).els = (combos.get(`${r1(fs * 10) / 10}/${lh}/${c.fontWeight}`).els || new Set()).add(e)
    tally(fams, c.fontFamily.split(',')[0].replace(/["']/g, '').trim(), chars)
    const col = blend(rgba(c.color), ground(e)), g = ground(e), ratio = contrast(col, g)
    tally(cols, hex(col), chars)
    if (ratio < 4.5 && fs < 24 && lowC.length < 12) lowC.push(`${sel(e)} ${hex(col)} on ${hex(g)} ${ratio.toFixed(2)}:1`)
    if (fs < minSize.v) minSize = { v: fs, sel: sel(e) }
  }
  const lvl = (t) => { const e = shown.find((x) => x.tagName === t); return e ? r1(px(getComputedStyle(e).fontSize)) : null }
  const measure = []
  for (const p of shown.filter((e) => e.matches('p, li, blockquote, dd'))) {
    const tops = new Set(); for (const n of textNodes(p)) { const g = document.createRange(); g.selectNodeContents(n); for (const q of g.getClientRects()) if (q.width) tops.add(r1(q.top)) }
    const lines = tops.size, len = p.textContent.trim().length
    if (lines >= 2 && len >= 60) measure.push({ cpl: r1(len / lines), sel: sel(p) })
  }
  measure.sort((a, b) => a.cpl - b.cpl)

  // surfaces and colours
  const radii = new Map(), shadows = new Map(), borders = new Map(), fill = new Map(), hues = new Map(), boxedEls = []
  let accent = 0, area = 0
  const docArea = document.documentElement.scrollWidth * document.documentElement.scrollHeight
  for (const e of shown) {
    const c = getComputedStyle(e), r = e.getBoundingClientRect()
    const rad = px(c.borderTopLeftRadius); if (rad > 0) tally(radii, rad >= 999 || c.borderTopLeftRadius.includes('%') ? 'full' : r1(rad), 1, sel(e))
    if (c.boxShadow !== 'none') tally(shadows, c.boxShadow.replace(/\s+/g, ' ').slice(0, 70), 1, sel(e))
    for (const side of ['Top', 'Left']) { const w = px(c[`border${side}Width`]); if (w > 0 && c[`border${side}Style`] !== 'none' && rgba(c[`border${side}Color`])[3] > 0.05) { tally(borders, `${w} ${hex(blend(rgba(c[`border${side}Color`]), ground(e.parentElement || e)))}`, 1, sel(e)); break } }
    const bgc = rgba(c.backgroundColor)
    if (bgc[3] > 0.1) {
      const under = ground(e.parentElement || e), col = blend(bgc, under), a = r.width * r.height
      if (hex(col) !== hex(under)) { tally(fill, hex(col), a); area += a } // a fill the same as its ground paints nothing new; counting it double-counted area past 100%
      const [h, s, l] = hsl(col); if (s > 0.5 && l > 0.2 && l < 0.8 && !e.matches('img, video')) { accent += a; tally(hues, `${Math.floor(h / 30) * 30}°`, 1) }
    }
    for (const p of ['color', 'borderTopColor']) { const [h, s, l] = hsl(rgba(c[p])); if (s > 0.5 && l > 0.2 && l < 0.8 && (p === 'color' || px(c.borderTopWidth))) tally(hues, `${Math.floor(h / 30) * 30}°`, 1) }
    const boxed = (bgc[3] > 0.1 && hex(blend(bgc, pageBg)) !== hex(pageBg)) || c.boxShadow !== 'none' || (px(c.borderTopWidth) && px(c.borderLeftWidth))
    if (boxed && r.width >= 120 && r.height >= 60 && r.width < vw - 2) boxedEls.push(e)
  }
  const nested = boxedEls.filter((e) => boxedEls.some((o) => o !== e && o.contains(e))).map(sel)
  const blocks = shown.filter((e) => { const r = e.getBoundingClientRect(); return r.width >= 120 && r.height >= 60 && r.width < vw - 2 && [...e.children].some((k) => /^(H\d|P)$/.test(k.tagName)) })
  const ruleYs = shown.filter((e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width >= vw * 0.6 && (e.tagName === 'HR' || (px(c.borderTopWidth) && c.borderTopStyle !== 'none' && r.height > 0)) }).map((e) => top(e)).sort((a, b) => a - b)
  const rules = ruleYs.length, rulesPerScreen = ruleYs.reduce((m, y, i) => Math.max(m, ruleYs.filter((z) => z >= y && z < y + vh).length), 0)
  // Rows of 4+ links or buttons that wrap: a phone filter or menu should scroll on one line, not stack.
  const ctl = (x) => x.matches('a, button, [role=button], [role=tab]') || (x.matches('li') && x.querySelector('a, button') && x.children.length === 1)
  // Textless dividers and absolute overlays (a sliding highlight, a glass clone of the labels) are not items.
  const items = (e) => [...e.children].filter((x) => vis(x) && !['absolute', 'fixed'].includes(getComputedStyle(x).position) && (ctl(x) || x.textContent.trim()))
  const wrapped = shown.filter((e) => { const k = items(e); return k.length >= 4 && k.every(ctl) }).map((e) => {
    const rows = [] // items whose boxes overlap vertically share a row
    for (const r of items(e).map((k) => k.getBoundingClientRect()).sort((a, b) => a.top - b.top)) { const last = rows[rows.length - 1]; if (last && r.top < last.bottom - 2) { last.n++; last.bottom = Math.max(last.bottom, r.bottom) } else rows.push({ n: 1, bottom: r.bottom }) }
    return { sel: sel(e), n: rows.reduce((a, r) => a + r.n, 0), rows: rows.length, multi: rows.some((r) => r.n > 1) }
  }).filter((g) => g.rows > 1 && g.multi && !g.sel.includes('footer')).map((g) => `${g.sel} ${g.n} items in ${g.rows} rows`)
  const bgSeq = sections.filter((s) => !s.tag).map((s) => s.bg)
  const alternates = bgSeq.length >= 4 && bgSeq.every((b, i) => i < 2 || b === bgSeq[i - 2]) && bgSeq[0] !== bgSeq[1]

  // buttons
  const btnSig = new Map(), firstFilled = [], allFilled = [], labels = new Map()
  for (const b of shown.filter(isBtn)) {
    const c = getComputedStyle(b), r = b.getBoundingClientRect(), bg = rgba(c.backgroundColor), g = ground(b.parentElement || b)
    const filled = bg[3] > 0.1 && contrast(blend(bg, g), g) >= 3, label = (b.innerText || b.value || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)
    tally(btnSig, `h${r1(r.height)} px${r1(px(c.paddingLeft))} r${px(c.borderTopLeftRadius) >= 999 ? 'full' : r1(px(c.borderTopLeftRadius))} ${filled ? 'filled ' + hex(blend(bg, g)) : 'plain'} ${px(c.borderTopWidth) ? 'border' : ''} ${r1(px(c.fontSize))}/${c.fontWeight}`.replace(/\s+/g, ' '), 1, sel(b))
    if (filled) { allFilled.push(label); if (r.top + scrollY < vh) firstFilled.push(label) }
    if (label) tally(labels, label.toLowerCase())
  }

  // chrome and copy
  const bars = shown.filter((e) => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return ['fixed', 'sticky'].includes(c.position) && r.top <= 1 && r.width >= vw * 0.8 && r.height < vh / 2 })
  const h1 = shown.find((e) => e.tagName === 'H1')
  const content = sections.filter((s) => !s.tag)
  const heads2 = shown.filter((e) => /^H[1-4]$/.test(e.tagName))
  const hits = []
  for (const e of [...heads2, ...shown.filter(isBtn)]) { const t = (e.innerText || '').toLowerCase(); for (const w of stock) if (t.includes(w)) hits.push(`"${w}" in ${sel(e)}`) }
  const eyebrow = heads2.filter((h) => { const p = h.previousElementSibling; return p && vis(p) && (p.innerText || '').trim().length < 30 && px(getComputedStyle(p).fontSize) < px(getComputedStyle(h).fontSize) * 0.7 }).length
  const top12 = (m, f = (v) => v.n) => [...m.entries()].sort((a, b) => f(b[1]) - f(a[1])).map(([k, v]) => ({ k, n: r1(f(v)), sample: v.sample, els: v.els ? v.els.size : undefined }))
  const sorted = (m) => [...m.entries()].sort((a, b) => b[1].n - a[1].n)
  const mode = (arr) => { const m = new Map(); for (const v of arr) if (v != null) m.set(v, (m.get(v) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null }
  return {
    sections, sameSigRun: sections.reduce((acc, s, i) => { const run = i && s.sig && s.sig === sections[i - 1].sig ? acc.cur + 1 : 1; return { cur: run, max: Math.max(acc.max, run) } }, { cur: 0, max: 0 }).max,
    gaps: { sibling: sorted(sib).map(([k, v]) => `${k}:${v.n}`), headingsBelowGeAbove: heads, offScale: [...new Set(offScale)], padding: sorted(pads).map(([k, v]) => `${k}:${v.n}`), uneven },
    type: { families: top12(fams), combos: top12(combos), minSize: { px: minSize.v, sel: minSize.sel }, h1: lvl('H1'), h2: lvl('H2'), h3: lvl('H3'), colours: top12(cols), lowContrast: lowC },
    measure: measure.length ? { median: measure[measure.length >> 1].cpl, max: measure[measure.length - 1].cpl, over80: measure.filter((m) => m.cpl > 80).map((m) => `${m.sel} ${m.cpl}`), under30: measure.filter((m) => m.cpl < 30).map((m) => `${m.sel} ${m.cpl}`) } : null,
    surfaces: { radii: top12(radii), shadows: top12(shadows), borders: top12(borders), boxed: boxedEls.length, blocks: blocks.length, nested: nested.slice(0, 8), wideRules: rules, rulesPerScreen },
    wrapped,
    colours: { fills: top12(fill).slice(0, 8).map((f) => ({ k: f.k, pct: Math.round(1000 * f.n / docArea) / 10 })), accentPct: Math.round(1000 * accent / docArea) / 10, hues: top12(hues).map((h) => `${h.k}:${h.n}`), bgSeq, alternates },
    buttons: { sigs: top12(btnSig), filledFirstScreen: firstFilled, filledTotal: allFilled.length, repeated: [...labels.entries()].filter(([, v]) => v.n >= 3).map(([k, v]) => `${k} x${v.n}`) },
    chrome: { bar: bars.length ? r1(Math.max(...bars.map((b) => b.getBoundingClientRect().height))) : 0, h1: h1 ? { text: h1.innerText.trim().replace(/\s+/g, ' ').slice(0, 60), size: r1(px(getComputedStyle(h1).fontSize)), y: r1(top(h1)) } : null,
      secondTop: content[1] ? content[1].y : null, vh, footer: sections.find((s) => s.tag === 'footer') ? sections.find((s) => s.tag === 'footer').h : null },
    copy: { stock: hits, eyebrows: `${eyebrow} of ${heads2.length} headings`, outline: heads2.slice(0, 25).map((h) => `${h.tagName.toLowerCase()} ${h.innerText.trim().replace(/\s+/g, ' ').slice(0, 70)}`) },
    grid: { left: mode(content.map((s) => s.left)), right: mode(content.map((s) => s.right)), off: content.filter((s) => !s.fullBleed && s.left != null && Math.abs(s.left - mode(content.map((x) => x.left))) > 2).map((s) => `${s.sel} left ${s.left}`) },
  }
}

const list = (a, n = 12) => a.length > n ? [...a.slice(0, n), `(+${a.length - n} more)`] : a
function print(p, w, d) {
  const L = [`== ${p} @ ${w}`]
  L.push(`sections (${d.sections.length}, longest run of one signature ${d.sameSigRun}; page grid left ${d.grid.left} right ${d.grid.right}):`)
  for (const s of d.sections) L.push(`  ${s.tag || 'sec'} ${s.sel}  y${s.y} h${s.h} pad ${s.padTop}/${s.padBottom} gap→next ink ${s.gapToNext ?? '-'} box ${s.boxGap ?? '-'}  bg ${s.bg}${s.fullBleed ? ' bleed' : ''}  edges ${s.left}/${s.right}  centred ${s.centred}%  [${s.sig}]`)
  if (d.grid.off.length) L.push(`  off the page grid: ${d.grid.off.join('; ')}`)
  L.push(`gaps: sibling ${list(d.gaps.sibling, 16).join(' ')}`)
  if (d.gaps.headingsBelowGeAbove.length) L.push(`  heading gap below >= above: ${list(d.gaps.headingsBelowGeAbove, 8).join('; ')}`)
  if (d.gaps.offScale.length) L.push(`  off a ${opts.base || 4} px scale: ${list(d.gaps.offScale, 10).join('; ')}`)
  L.push(`  container padding t r b l: ${list(d.gaps.padding, 10).join('  ')}`)
  if (d.gaps.uneven.length) L.push(`  uneven side padding: ${list(d.gaps.uneven, 6).join('; ')}`)
  const t = d.type
  L.push(`type: families ${t.families.map((f) => `${f.k}(${f.n})`).join(', ')}; h1 ${t.h1} h2 ${t.h2} h3 ${t.h3}; min ${t.minSize.px}px ${t.minSize.sel}`)
  L.push(`  ${t.combos.length} combos size/line/weight (chars, elements): ${list(t.combos.map((c) => `${c.k}(${c.n},${c.els}${c.els < 3 ? ' once' : ''})`), 14).join(' ')}`)
  L.push(`  text colours: ${list(t.colours.map((c) => `${c.k}(${c.n})`), 8).join(' ')}`)
  if (t.lowContrast.length) L.push(`  under 4.5:1: ${t.lowContrast.join('; ')}`)
  if (d.measure) L.push(`measure: chars/line median ${d.measure.median} max ${d.measure.max}${d.measure.over80.length ? '; over 80: ' + list(d.measure.over80, 5).join(', ') : ''}${d.measure.under30.length ? '; under 30: ' + list(d.measure.under30, 5).join(', ') : ''}`)
  const s = d.surfaces
  L.push(`surfaces: radii ${s.radii.map((r) => `${r.k}(${r.n})`).join(' ') || 'none'}; shadows ${s.shadows.length}${s.shadows.length ? ' e.g. ' + s.shadows[0].k : ''}; boxed ${s.boxed} of ${s.blocks} content blocks; wide rules ${s.wideRules}, at most ${s.rulesPerScreen} in one screen`)
  L.push(`  borders width colour: ${list(s.borders.map((b) => `${b.k}(${b.n})`), 8).join(' ') || 'none'}${s.nested.length ? '; nested boxes: ' + s.nested.join(', ') : ''}`)
  const c = d.colours
  L.push(`colours: fills ${c.fills.map((f) => `${f.k} ${f.pct}%`).join(', ')}; accent fill ${c.accentPct}%; saturated hues ${c.hues.join(' ') || 'none'}${c.alternates ? '; section backgrounds alternate A/B/A/B' : ''}`)
  const b = d.buttons
  L.push(`buttons: ${b.sigs.length} styles ${list(b.sigs.map((x) => `[${x.k}](${x.n})`), 6).join(' ')}; filled ${b.filledTotal}, in first screen ${b.filledFirstScreen.length}${b.filledFirstScreen.length ? ': ' + b.filledFirstScreen.join(' | ') : ''}${b.repeated.length ? '; repeated: ' + b.repeated.join(', ') : ''}`)
  const ch = d.chrome
  L.push(`chrome: fixed bar ${ch.bar}px of ${ch.vh}; h1 ${ch.h1 ? `${ch.h1.size}px at y${ch.h1.y} "${ch.h1.text}"` : 'none'}; second section top ${ch.secondTop ?? '-'} (fold ${ch.vh}); footer h${ch.footer ?? '-'}`)
  if (d.wrapped.length) L.push(`wrapped control rows: ${list(d.wrapped, 6).join('; ')}`)
  L.push(`copy: eyebrows ${d.copy.eyebrows}${d.copy.stock.length ? '; stock phrases: ' + d.copy.stock.join(', ') : ''}`)
  L.push(`  outline: ${d.copy.outline.join(' / ')}`)
  return L.join('\n')
}

// Cross-page table per width; * marks a cell off the column's most common value.
function summary(rows) {
  const out = []
  for (const [w, pages] of Object.entries(rows)) {
    if (!Object.keys(pages).length) continue
    const cols = { inset: (d) => `${d.grid.left}/${d.grid.right}`, bar: (d) => d.chrome.bar, h1: (d) => d.type.combos.length && d.chrome.h1 ? d.chrome.h1.size : '-', body: (d) => d.type.combos[0]?.k, combos: (d) => d.type.combos.length,
      radii: (d) => d.surfaces.radii.map((r) => r.k).sort().join(',') || '0', filled: (d) => [...new Set(d.buttons.sigs.filter((s) => s.k.includes('filled')).map((s) => s.k))].join(' | ') || '-',
      footer: (d) => { const f = d.sections.find((s) => s.tag === 'footer'); return f ? `h${f.h} ${f.sig}`.slice(0, 50) : '-' } }
    const vals = Object.fromEntries(Object.entries(cols).map(([k, f]) => [k, Object.entries(pages).map(([, d]) => String(f(d)))]))
    const modes = Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, [...v.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0][0]]))
    out.push(`== summary @ ${w}  (${Object.keys(cols).join(' | ')})`)
    Object.keys(pages).forEach((p, i) => out.push(`  ${p}: ${Object.keys(cols).map((k) => (vals[k][i] !== modes[k] && Object.keys(pages).length > 1 ? '*' : '') + vals[k][i]).join(' | ')}`))
  }
  return out.join('\n')
}

let opts = {}
async function run({ base, pages, opts: o }) {
  opts = o
  const pw = await playwright(), name = engineName(), engine = pw[name]
  const widths = String(o.widths || '390,768,1440').split(',').map(Number), shots = o.shots ? String(o.shots) : null
  if (shots) fs.mkdirSync(shots, { recursive: true })
  const browser = await engine.launch(), data = {}, failed = []
  for (const w of widths) {
    const phone = w < 600, vh = w < 600 ? 844 : w < 1000 ? 1024 : 900
    const c = await browser.newContext({ viewport: { width: w, height: vh }, deviceScaleFactor: shots ? 2 : 1, ...(name === 'firefox' ? {} : { isMobile: phone, hasTouch: phone }) })
    const page = await c.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    data[w] = {}
    for (const p of pages) {
      try {
        const res = await page.goto(base + p, { waitUntil: 'load', timeout: 45000 })
        if (res && res.status() >= 400) { failed.push(`${p} @ ${w}: HTTP ${res.status()}`); continue }
        // ponytail: scroll stops at 40 screens so an infinite feed cannot hang the run
        await page.evaluate(async () => { await document.fonts.ready; for (let y = 0; y < document.documentElement.scrollHeight && y < 40 * innerHeight; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)) } scrollTo(0, 0) })
        await page.waitForTimeout(500)
        if (!(await page.evaluate(() => !!document.body))) { failed.push(`${p} @ ${w}: no body`); continue }
        data[w][p] = await page.evaluate(inventory, { base: +(o.base || 4), stock: STOCK })
      } catch (e) { failed.push(`${p} @ ${w}: ${e.message.split('\n')[0]}`); continue }
      if (shots) {
        const slug = `${p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/[/?=&]/g, '-')}-${w}`
        try { await page.screenshot({ path: path.join(shots, `${slug}.png`), fullPage: true }) } catch (e) { failed.push(`${p} @ ${w}: full-page shot: ${e.message.split('\n')[0]}`) }
        const H = await page.evaluate(() => document.documentElement.scrollHeight)
        for (let i = 0; i * vh < H && i < 12; i++) {
          await page.evaluate((y) => scrollTo(0, y), i * vh); await page.waitForTimeout(150)
          await page.screenshot({ path: path.join(shots, `${slug}-s${i + 1}.png`) })
        }
        await page.evaluate(() => scrollTo(0, 0))
      }
    }
    await c.close()
  }
  await browser.close()
  return { data, failed }
}

if (process.argv.includes('--self-test')) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taste-')), assert = (await import('node:assert')).strict
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><meta name=viewport content="width=device-width"><style>
    body{margin:0;font:16px/24px sans-serif;background:#fff} main>section{padding:48px 24px} h1{font:40px/48px sans-serif;margin:0 0 16px} h2{font:24px/32px sans-serif;margin:0 0 24px}
    p{margin:0} .card{border-radius:8px;border:1px solid #ccc;padding:14px 24px} a.b{display:inline-block;padding:12px 20px;background:#111;color:#fff;margin:16px 8px 0 0}
    #s2{margin-top:96px;background:linear-gradient(90deg,#a0f,#40f)}
  </style><main><section id=s1><h1>Seamless tools</h1><p>Body copy that runs long enough to be a paragraph.</p><a class=b href=#>Start</a><a class=b href=#>Book</a>
  <nav id=f style="width:200px"><a href=#>Alpha one</a> <a href=#>Beta two</a> <a href=#>Gamma three</a> <span style="display:inline-block;width:1px;height:12px;background:#000"></span> <a href=#>Delta four</a> <a href=#>Epsilon five</a></nav></section>
  <section id=s2><svg width=16 height=16></svg><h2 style="color:oklab(0.45 0 0)">Cards</h2><div class=card><p>One</p></div></section></main>`)
  process.argv = [process.argv[0], process.argv[1], dir]
  const t = await target(''), { data } = await run({ ...t, opts: { widths: '1440' } }); t.close()
  const d = data[1440]['/'], txt = print('/', 1440, d)
  assert.ok(d.sections.length === 2 && d.sections[0].boxGap === 96, 'section box gap 96:\n' + txt)
  assert.ok(d.gaps.offScale.some((x) => x.includes('padding 14')), 'off-scale 14:\n' + txt)
  assert.equal(d.type.combos.length, 3, '3 type combos:\n' + txt)
  assert.ok(d.surfaces.radii.some((r) => r.k === 8), 'radius 8:\n' + txt)
  assert.equal(d.sections[1].bg, 'gradient', 'gradient section:\n' + txt)
  assert.equal(d.buttons.filledFirstScreen.length, 2, 'two filled buttons:\n' + txt)
  assert.ok(d.copy.stock.some((x) => x.includes('seamless')), 'stock word:\n' + txt)
  assert.ok(d.type.colours.some((c) => c.k === '#555555'), 'oklab grey read as sRGB:\n' + txt) // oklab(0.45 0 0) is #555555
  assert.ok(d.colours.fills.every((f) => f.pct <= 100), 'fill share over 100%:\n' + txt)
  assert.ok(d.wrapped.some((x) => x.includes('#f')), 'wrapped filter row:\n' + txt)
  assert.doesNotThrow(() => summary({ 390: {} }), 'summary with an empty width')
  fs.rmSync(dir, { recursive: true }); console.log('taste.mjs self-test passed'); process.exit(0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = await target('usage: node taste.mjs <url|build-dir> [paths...] [--widths=390,768,1440] [--base=4] [--shots=dir] [--json]')
  const { data, failed } = await run(t); t.close()
  if (t.opts.json) console.log(JSON.stringify(data))
  else { for (const [w, pages] of Object.entries(data)) for (const [p, d] of Object.entries(pages)) console.log(print(p, w, d) + '\n'); console.log(summary(data)) }
  if (failed.length) { (t.opts.json ? console.error : console.log)('did not load:\n' + failed.join('\n')); process.exit(2) }
  process.exit(0)
}
