// Files in a build folder that nothing references, and what they cost every deploy.
//   node dead-assets.mjs <build-dir> [--keep=regex]
// Reads every HTML, CSS, JS, JSON, XML, SVG, text and manifest file for references (paths and bare
// file names), then lists files no one names. The usual find: full-size originals shipped beside
// the optimized images the pages use, because an image loader imported every source file. Exits 1 if it finds any; --keep skips files you serve on purpose.
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
const keepArg = process.argv.find((a) => a.startsWith('--keep='))
if (!dir || !fs.existsSync(dir)) { console.error('usage: node dead-assets.mjs <build-dir> [--keep=regex]'); process.exit(2) }
const KEEP = new RegExp(['\\.html$', '^robots\\.txt$', '^sitemap.*\\.xml$', '^favicon', '^apple-touch-icon', '\\.webmanifest$', '^_headers$', '^_redirects$', '^CNAME$', '^\\.well-known/', '^llms.*\\.txt$', '^humans\\.txt$', '^ads\\.txt$', '^security\\.txt$', '\\.map$', keepArg?.slice(7)].filter(Boolean).join('|'), 'i')
const TEXT = /\.(html|css|js|mjs|json|xml|svg|txt|webmanifest|map)$/i
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
const files = walk(dir).map((f) => ({ f, rel: path.relative(dir, f).split(path.sep).join('/'), size: fs.statSync(f).size }))
let corpus = ''
for (const x of files) if (TEXT.test(x.rel)) corpus += fs.readFileSync(x.f, 'utf8') + '\n'
corpus = corpus.replace(/%20/g, ' ')
const total = files.reduce((s, x) => s + x.size, 0)
const dead = files.filter((x) => !KEEP.test(x.rel) && !corpus.includes(x.rel) && !corpus.includes(path.posix.basename(x.rel)))
  .sort((a, b) => b.size - a.size)
const mb = (n) => (n / 1048576).toFixed(1) + ' MB'
const deadSize = dead.reduce((s, x) => s + x.size, 0)
for (const x of dead.slice(0, 40)) console.log(`${mb(x.size).padStart(9)}  ${x.rel}`)
if (dead.length > 40) console.log(`  and ${dead.length - 40} more`)
console.log(dead.length
  ? `${dead.length} unreferenced files, ${mb(deadSize)} of ${mb(total)} (${Math.round((deadSize / total) * 100)}%) across ${files.length} files.`
  : `No unreferenced files in ${files.length} files (${mb(total)}).`)
process.exit(dead.length ? 1 : 0)
