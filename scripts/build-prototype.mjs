// Regenerates PTL-Console-Prototype.html — a single self-contained HTML file
// (CSS + JS inlined, IIFE bundle + HashRouter) for sharing the current look
// and feel outside the dev environment: no server needed, works from
// file://, works at any path. Run with `npm run build:prototype`.
//
// Uses vite.singlefile.config.js (iife output, no code-splitting) built from
// index.standalone.html / src/main.standalone.jsx — a separate entry from
// the real app's main.jsx because BrowserRouter's path-based route matching
// breaks once the file isn't served at "/", which a shared static file
// never is (double-clicked, dropped in Slack, opened from Downloads, …).

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const distDir = path.join(root, 'dist-standalone')
const outFile = path.join(root, 'PTL-Console-Prototype.html')

execSync('npx vite build --config vite.singlefile.config.js', { cwd: root, stdio: 'inherit' })

let html = readFileSync(path.join(distDir, 'index.standalone.html'), 'utf8')
const bundle = readFileSync(path.join(distDir, 'bundle.js'), 'utf8')

// Plain string literals are safe as the *search* argument to replace(), but
// the $-pattern substitution (`$&`, `$1`, `$$`, …) that String.replace()
// applies to its *replacement* argument still kicks in even for a string
// search — and the minified bundle is full of `$`-prefixed identifiers, so
// passing it as the replacement directly silently corrupts the output.
// Replacer functions bypass that substitution entirely.
html = html.replace(
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
  () => '<link rel="icon" type="image/svg+xml" href="data:," />',
)

const scriptTag = '<script type="module" crossorigin src="/bundle.js"></script>\n  </head>'
if (!html.includes(scriptTag)) throw new Error('expected head script tag not found in build output')
html = html.replace(scriptTag, () => '</head>')

if (!html.includes('</body>')) throw new Error('expected </body> not found in build output')
// Inline <script> bodies are scanned by the HTML parser: any literal `</style`,
// `</title`, `</script` … inside the bundle's strings (e.g. e-way bill print
// windows) can end the element early. `<\/` is identical to JS but invisible to it.
html = html.replace('</body>', () => `<script>\n${bundle.replaceAll('</', '<\\/')}\n</script>\n  </body>`)

writeFileSync(outFile, html)
rmSync(distDir, { recursive: true, force: true })

console.log(`\nWrote ${path.relative(root, outFile)} (${(html.length / 1024).toFixed(0)} KB)`)
