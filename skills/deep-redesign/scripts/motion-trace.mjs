// Frame-by-frame proof that each moment runs as its spec says.
//   node motion-trace.mjs <url|build-dir> [--spec=motion-spec.json] [--only=id,id] [--verbose]
//   node motion-trace.mjs --self-check
// For each moment in the spec it reads one CSS value every frame, then checks the run time, the curve
// and the longest frame; then again with reduced motion, where the moment must land at once (instant)
// or as a short fade (under 150 ms).
// Two lessons are built in. The sampling window opens when the value first changes, not at page
// load: on a busy machine a fixed window cuts motions short, which looks like a site bug and is not. And durations are read with their units (see ms() in lib.mjs).
// If a trace fails, rerun only that trace on a quiet machine, then on the commit before your change.
import fs from 'node:fs'
import { playwright, engineName, target, finish, ms } from './lib.mjs'

// cubic-bezier(x1, y1, x2, y2) as CSS defines it: y for a given x.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1
    let lo = 0, hi = 1, t = x
    for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t }
    return Y(t)
  }
}
export function easing(s) {
  if (!s || s === 'linear') return (x) => x
  const named = { ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] }
  const m = named[s] || String(s).match(/cubic-bezier\(([^)]+)\)/)?.[1].split(',').map(Number)
  if (!m || m.length !== 4 || m.some(isNaN)) throw new Error(`unknown easing: ${s}`)
  return bezier(...m)
}

// Turn computed values into number vectors. 'none' for a transform is the identity matrix.
const nums = (v) => (v === 'none' ? null : (String(v).match(/-?[\d.]+(?:e-?\d+)?/g) || []).map(Number))
const ident = (n) => (n === 16 ? [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] : n === 6 ? [1, 0, 0, 1, 0, 0] : Array(n).fill(0))
const dist = (a, b) => Math.hypot(...a.map((x, i) => x - (b[i] ?? 0)))

// samples: [[ms, value], ...]. Returns what happened, measured from the frame before the first change.
export function analyse(samples, spec) {
  let vs = samples.map(([, v]) => nums(v))
  const n = Math.max(...vs.map((v) => v?.length ?? 0))
  vs = vs.map((v) => (v && v.length === n ? v : v ? [...v, ...ident(n).slice(v.length)] : ident(n)))
  const ts = samples.map(([t]) => t), v0 = vs[0], eps = 1e-3
  const first = vs.findIndex((v) => dist(v, v0) > eps)
  if (first < 0) return { moved: false }
  // Arrival: the first frame after the last one still away from the resting value. A frame-to-frame
  // test would miss an ease-out's slow tail, where each step is smaller than eps.
  const vEnd = vs[vs.length - 1]
  let last = first
  for (let i = first; i < vs.length; i++) if (dist(vs[i], vEnd) > eps) last = Math.min(i + 1, vs.length - 1)
  const start = ts[first - 1] ?? ts[first], span = dist(vEnd, v0)
  let dur = ts[last] - start
  // With a known curve, time the 25, 50 and 75 percent marks and scale up: an ease-out's last tenth
  // moves less than any threshold can see, so the arrival frame alone reads short.
  if (spec?.easing && span > eps) {
    const ease = easing(spec.easing), inv = (q) => { let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (ease(m) < q) lo = m; else hi = m } return (lo + hi) / 2 }
    const at = (q) => { for (let i = first; i <= last; i++) { const p = dist(vs[i], v0) / span; if (p >= q) { const p0 = dist(vs[i - 1], v0) / span; return ts[i - 1] + ((q - p0) / (p - p0 || 1)) * (ts[i] - ts[i - 1]) } } return null }
    const est = [0.25, 0.5, 0.75].map((q) => { const t = at(q); return t === null ? null : (t - start) / inv(q) }).filter((x) => x !== null)
    if (est.length) dur = est.reduce((a, b) => a + b) / est.length
  }
  let longest = 0
  for (let i = first; i <= last; i++) longest = Math.max(longest, ts[i] - ts[i - 1])
  let curveErr = 0
  if (spec?.easing && span > eps && dur > 0) {
    const ease = easing(spec.easing)
    for (let i = first; i < last; i++) curveErr = Math.max(curveErr, Math.abs(Math.min(dist(vs[i], v0) / span, 1.2) - ease((ts[i] - start) / dur)))
  }
  return { moved: true, dur, longest, curveErr, frames: last - first + 1, from: samples[0][1], to: samples[samples.length - 1][1] }
}

function check(m, r, reduced) {
  const out = [], want = ms(m.duration), tol = m.tolerance ?? 0.25, where = `${m.id}${reduced ? ' (reduced motion)' : ''}`
  if (reduced) {
    if (!r.moved) return out
    const cap = m.reducedMotion === 'fade' ? 150 : 50
    if (r.dur > cap) out.push(`${where}: runs ${Math.round(r.dur)} ms; with reduced motion it must land ${m.reducedMotion === 'fade' ? 'as a fade under 150 ms' : 'at once'}`)
    return out
  }
  if (!r.moved) return [`${where}: never moved (${m.property} on "${m.selector}")`]
  if (Math.abs(r.dur - want) > want * tol) out.push(`${where}: ran ${Math.round(r.dur)} ms, spec ${want} ms (±${Math.round(tol * 100)}%)`)
  if (r.curveErr > (m.curveTolerance ?? 0.15)) out.push(`${where}: curve off by ${r.curveErr.toFixed(2)} of the full move from ${m.easing}`)
  if (r.longest > 50) out.push(`${where}: a ${Math.round(r.longest)} ms frame during the move`)
  return out
}

// Runs in the page: sample until the value has rested after moving, or the cap runs out.
function sampler({ sel, prop, rest, cap }) {
  const t0 = performance.now(), samples = []
  let firstChange = 0, lastChange = 0, prev
  window.__trace = new Promise((done) => {
    const tick = () => {
      const now = performance.now(), el = document.querySelector(sel)
      if (el) {
        const v = getComputedStyle(el)[prop]
        if (prev !== undefined && v !== prev) { lastChange = now; firstChange ||= now }
        prev = v; samples.push([now, v])
      }
      if ((firstChange && now - lastChange > rest) || now - t0 > cap) return done(samples)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

async function trace(b, base, m, reduced) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' }), p = await c.newPage()
  const want = ms(m.duration), arg = { sel: m.selector, prop: m.property, rest: Math.max(500, want), cap: 15000 }
  try {
    if (m.trigger === 'load') await p.addInitScript(sampler, arg)
    await p.goto(base + m.page, { waitUntil: 'load', timeout: 30000 })
    if (m.trigger !== 'load') {
      const el = p.locator(m.selector).first()
      if (m.trigger === 'scroll') await p.evaluate(() => scrollTo(0, 0))
      else await el.scrollIntoViewIfNeeded()
      await p.waitForTimeout(600)
      await p.evaluate(sampler, arg)
      await p.waitForTimeout(32)
      if (m.trigger === 'hover') await el.hover()
      else if (m.trigger === 'click') await el.click()
      else if (m.trigger === 'focus') await el.focus()
      else if (m.trigger === 'scroll') await el.scrollIntoViewIfNeeded()
    }
    return await p.evaluate(() => window.__trace)
  } finally { await c.close() }
}

if (process.argv.includes('--self-check')) {
  const assert = (await import('node:assert')).strict
  const ease = easing('cubic-bezier(0.22, 1, 0.36, 1)')
  assert.equal(ease(0), 0); assert.equal(ease(1), 1); assert.ok(ease(0.5) > 0.85)
  assert.ok(Math.abs(easing('linear')(0.3) - 0.3) < 1e-9)
  // A 350 ms opacity fade on that curve, sampled at 60 fps after a late start at 900 ms.
  const s = [[0, '0'], [880, '0']]
  for (let t = 900; t < 1900; t += 1000 / 60) s.push([t, String(ease(Math.min((t - 883) / 350, 1)))])
  const r = analyse(s, { easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
  assert.ok(r.moved && Math.abs(r.dur - 350) < 40, `duration ${r.dur}`)
  assert.ok(r.curveErr < 0.15, `curve ${r.curveErr}`)
  assert.deepEqual(check({ id: 'x', duration: '.35s', easing: 'linear', property: 'opacity', selector: 'h1' }, { moved: true, dur: 350, longest: 17, curveErr: 0 }, false), [])
  assert.equal(check({ id: 'x', duration: '300ms' }, { moved: true, dur: 0.3, longest: 1, curveErr: 0 }, false).length, 1)
  assert.equal(analyse([[0, 'none'], [16, 'none']]).moved, false)
  console.log('motion-trace self-check passed')
  process.exit(0)
}

const { base, close, opts } = await target('usage: node motion-trace.mjs <url|build-dir> [--spec=motion-spec.json] [--only=ids] [--verbose]')
const specPath = String(opts.spec || 'motion-spec.json')
if (!fs.existsSync(specPath)) { console.error(`no spec at ${specPath}; copy templates/motion-spec.json and fill it in`); process.exit(2) }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
const only = opts.only ? String(opts.only).split(',') : null
const moments = spec.moments.filter((m) => !only || only.includes(m.id)).map((m) => ({ easing: spec.curve, ...m }))
const pw = await playwright(), name = engineName(), b = await pw[name].launch(), fails = []
for (const m of moments) {
  for (const reduced of [false, true]) {
    let r
    try { r = analyse(await trace(b, base, m, reduced), m) } catch (e) { fails.push(`${m.id}${reduced ? ' (reduced motion)' : ''}: ${e.message.split('\n')[0]}`); continue }
    if (opts.verbose) console.log(m.id, reduced ? 'reduced' : 'normal', JSON.stringify(r))
    fails.push(...check(m, r, reduced))
  }
}
await b.close(); close()
finish(fails, `${name}: ${moments.length} moments match the spec, with and without reduced motion.`)
