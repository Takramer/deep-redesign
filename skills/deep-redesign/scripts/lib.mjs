// Shared helpers for the deep-redesign checks.
// Every check takes a target first: a URL (local preview, branch preview or live site) or a build
// folder. A folder is served here, on a free port, so a check always reads the build you just made:
// a long-running preview server can keep an old build, and a day of checks then runs on it.
// Pages come from the remaining arguments, else from <target>/sitemap.xml, else just "/".
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

// Playwright resolves from the folder you run in (your site's node_modules), then from this scripts folder (npm install here).
export async function playwright() {
  try { return createRequire(path.join(process.cwd(), 'x.js'))('playwright') } catch {}
  try { return await import('playwright') } catch {}
  console.error(`Playwright not found. Run once: npm install --prefix ${path.dirname(new URL(import.meta.url).pathname)} && npx --prefix ${path.dirname(new URL(import.meta.url).pathname)} playwright install`)
  process.exit(2)
}

export const engineName = () => process.env.BROWSER || 'chromium'

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf' }

// Map a clean URL to a file the way static hosts do: /a -> a.html or a/index.html.
export function fileFor(dir, urlPath) {
  let u = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const tries = [u, u + '.html', path.join(u, 'index.html')]
  for (const t of tries) {
    const f = path.join(dir, t)
    if (f.startsWith(path.resolve(dir)) && fs.existsSync(f) && fs.statSync(f).isFile()) return f
  }
  return null
}

function serve(dir) {
  dir = path.resolve(dir)
  return new Promise((res) => {
    const srv = http.createServer((q, r) => {
      const f = fileFor(dir, q.url) || fileFor(dir, '/404')
      if (!f) { r.writeHead(404); return r.end('not found') }
      r.writeHead(fileFor(dir, q.url) ? 200 : 404, { 'content-type': TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream' })
      fs.createReadStream(f).pipe(r)
    }).listen(0, '127.0.0.1', () => res({ base: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() }))
  })
}

async function sitemapPaths(base) {
  const seen = new Set(), out = []
  const read = async (url, depth) => {
    if (depth > 2 || seen.has(url)) return
    seen.add(url)
    let xml
    try { const r = await fetch(url); if (!r.ok) return; xml = await r.text() } catch { return }
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1])
    if (/<sitemapindex/i.test(xml)) for (const l of locs) await read(rebase(l, base), depth + 1)
    else for (const l of locs) out.push(new URL(l).pathname)
  }
  await read(base + '/sitemap.xml', 0)
  await read(base + '/sitemap-index.xml', 0)
  return [...new Set(out)]
}
// Sitemaps list the live host; when the target is a local copy, follow the same path locally.
const rebase = (u, base) => { try { const x = new URL(u); return base + x.pathname } catch { return u } }

// Parse argv: [target, ...paths]. Flags --name=value are returned in opts.
export async function target(usage) {
  const args = process.argv.slice(2)
  const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true] }))
  const pos = args.filter((a) => !a.startsWith('--'))
  if (!pos[0]) { console.error(usage); process.exit(2) }
  let base = pos[0].replace(/\/$/, ''), close = () => {}, dir = null
  if (fs.existsSync(pos[0]) && fs.statSync(pos[0]).isDirectory()) { dir = path.resolve(pos[0]); ({ base, close } = await serve(dir)) }
  let pages = pos.slice(1)
  if (!pages.length) pages = await sitemapPaths(base)
  if (!pages.length) pages = ['/']
  const max = +(opts.max || process.env.MAX_PAGES || 60)
  if (pages.length > max) { console.log(`${pages.length} pages in the sitemap; checking the first ${max} (--max=N to change).`); pages = pages.slice(0, max) }
  return { base, pages, close, dir, opts }
}

// Finish: print failures one per line, or the clean line, and exit 1 on any failure.
export function finish(fails, clean) {
  console.log(fails.length ? fails.join('\n') : clean)
  process.exit(fails.length ? 1 : 0)
}

// CSS times as the browser writes them. A minifier can turn 300ms into .3s, and a
// parser that read the number alone ran a 300 ms motion in 0.3 ms.
export function ms(v) {
  if (typeof v === 'number') return v
  const m = String(v).trim().match(/^(-?[\d.]+)\s*(ms|s)?$/)
  if (!m) throw new Error(`not a time: ${v}`)
  return m[2] === 's' ? +m[1] * 1000 : +m[1]
}

// Self-check: node lib.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const assert = (await import('node:assert')).strict
  assert.equal(ms('300ms'), 300); assert.equal(ms('.3s'), 300); assert.equal(ms('0.35s'), 350); assert.equal(ms(200), 200)
  assert.throws(() => ms('fast'))
  console.log('lib.mjs self-check passed')
}
