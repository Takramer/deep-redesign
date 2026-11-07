// Does the live site match the build you deployed?
//   node live-parity.mjs <build-dir> <live-url> [paths...]
// Per page: the HTML, with known host rewrites named (an injected analytics beacon, email obfuscation,
// cdn-cgi scripts). Then every script and stylesheet the build references, byte for byte. Then every
// image, video and font the page uses must answer 200 on the live host.
// Exits 1 on a script or style that differs, a missing file, or email obfuscation. Other HTML
// differences print for review: build-time data (counters, feeds, dates) differ on purpose.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileFor, finish } from './lib.mjs'

const [dir, live, ...given] = process.argv.slice(2)
if (!dir || !live || !fs.existsSync(dir)) { console.error('usage: node live-parity.mjs <build-dir> <live-url> [paths...]'); process.exit(2) }
const LIVE = live.replace(/\/$/, '')
const fails = [], review = []
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12)

// Pages: given, else every .html in the build except 404.
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
const pages = given.length ? given : walk(dir).filter((f) => f.endsWith('.html') && !/404/.test(f)).map((f) => '/' + path.relative(dir, f).replace(/(^|\/)index\.html$/, '').replace(/\.html$/, ''))
  .map((p) => p.replace(/\/$/, '') || '/')

const KNOWN = [
  [/<script[^>]*static\.cloudflareinsights\.com[^>]*><\/script>/gi, 'Cloudflare analytics beacon'],
  [/<script[^>]*\/cdn-cgi\/[^>]*><\/script>/gi, 'Cloudflare cdn-cgi script'],
  [/<script[^>]*(vercel-insights|_vercel\/insights|va\.vercel-scripts)[^>]*><\/script>/gi, 'Vercel analytics'],
  [/<script[^>]*netlify[^>]*><\/script>/gi, 'Netlify script'],
]
const strip = (h) => { const found = []; for (const [re, name] of KNOWN) if (re.test(h)) { found.push(name); h = h.replace(re, '') } return { h, found } }
const assetRefs = (h) => [...h.matchAll(/(?:src|href)=["']([^"'#]+\.(?:js|mjs|css)(?:\?[^"']*)?)["']/gi)].map((m) => m[1])
const mediaRefs = (h) => [...h.matchAll(/(?:src|srcset|poster|href)=["']([^"']+)["']/gi)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+/)[0]))
  .filter((u) => /\.(webp|avif|png|jpe?g|gif|svg|mp4|webm|woff2?|pdf|ico)(\?|$)/i.test(u))

const checked = new Set()
for (const p of pages) {
  const f = fileFor(dir, p)
  if (!f) { fails.push(`${p}: no file in the build`); continue }
  const local = fs.readFileSync(f, 'utf8')
  let r, remote
  try { r = await fetch(LIVE + p); remote = await r.text() } catch (e) { fails.push(`${p}: live fetch failed (${e.message})`); continue }
  if (r.status !== 200) { fails.push(`${p}: live answers HTTP ${r.status}`); continue }
  if (/cdn-cgi\/l\/email-protection|data-cfemail/.test(remote)) fails.push(`${p}: the host rewrote email addresses (Cloudflare Email Obfuscation); turn it off if the address should be readable`)
  const L = strip(local), R = strip(remote)
  const norm = (h) => h.replace(/\s+/g, ' ').trim()
  if (norm(L.h) !== norm(R.h)) {
    const a = norm(L.h), b = norm(R.h)
    let i = 0; while (i < a.length && a[i] === b[i]) i++
    review.push(`${p}: HTML differs at character ${i}: build "${a.slice(Math.max(0, i - 30), i + 50)}" live "${b.slice(Math.max(0, i - 30), i + 50)}"`)
  }
  if (R.found.length) review.push(`${p}: host added ${R.found.join(', ')}`)
  for (const ref of assetRefs(local)) {
    const u = new URL(ref, LIVE + p)
    if (u.origin !== new URL(LIVE).origin || checked.has(u.pathname)) continue
    checked.add(u.pathname)
    const lf = fileFor(dir, u.pathname)
    if (!lf) continue
    const lr = await fetch(u).catch(() => null)
    if (!lr || !lr.ok) { fails.push(`${u.pathname}: live answers ${lr ? 'HTTP ' + lr.status : 'nothing'}`); continue }
    const a = sha(fs.readFileSync(lf)), b = sha(Buffer.from(await lr.arrayBuffer()))
    if (a !== b) fails.push(`${u.pathname}: live file differs from the build (${a} vs ${b})`)
  }
  for (const ref of mediaRefs(local)) {
    let u; try { u = new URL(ref, LIVE + p) } catch { continue }
    if (u.origin !== new URL(LIVE).origin || checked.has(u.pathname)) continue
    checked.add(u.pathname)
    const lr = await fetch(u, { method: 'HEAD' }).catch(() => null)
    if (!lr || lr.status >= 400) fails.push(`${u.pathname}: live answers ${lr ? 'HTTP ' + lr.status : 'nothing'}`)
  }
}
if (review.length) console.log('For review (often build-time data or host additions):\n' + review.map((x) => '  ' + x).join('\n'))
finish(fails, `Live matches the build: ${pages.length} pages, ${checked.size} files checked.`)
