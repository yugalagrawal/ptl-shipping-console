// Package (parcel) barcodes — 12 digits, one per physical parcel, mapped to a docket.
//   Automated  100000000000 – 599999999999  sequential; handed out when labels are printed
//   Stock      600000000000 – 999999999999  pre-printed label stock; numbers are typed in and linked
// Session-local, like every other seed in the prototype.
import { DOCKETS_SEED } from './dockets.js'

export const PACKAGE_DIGITS = 12
export const PKG_BLOCKS = {
  automated: { id: 'automated', label: 'Automated', from: 100000000000, to: 599999999999 },
  stock: { id: 'stock', label: 'Stock', from: 600000000000, to: 999999999999 },
}

export const fmtPackage = (n) => String(n).replace(/(\d{4})(?=\d)/g, '$1 ').trim()
export const sourceOfPackage = (n) => {
  const v = Number(n)
  return v >= PKG_BLOCKS.automated.from && v <= PKG_BLOCKS.automated.to ? 'automated'
    : v >= PKG_BLOCKS.stock.from && v <= PKG_BLOCKS.stock.to ? 'stock' : null
}

const used = new Map() // barcode(number) → { docket, source, ts }
const byDocket = new Map() // docket → number[] (sorted)
let autoPointer = PKG_BLOCKS.automated.from

function put(docket, barcode, source) {
  used.set(barcode, { docket: String(docket), source, ts: Date.now() })
  const list = byDocket.get(String(docket)) ?? []
  list.push(barcode); list.sort((a, b) => a - b)
  byDocket.set(String(docket), list)
}

// Demo data: most dockets got automated labels, two used stock labels.
DOCKETS_SEED.forEach((d, i) => {
  const n = d.awbCount ?? 1
  if (i === 3 || i === 7) {
    const base = PKG_BLOCKS.stock.from + 100 + i * 20
    for (let k = 0; k < n; k++) put(d.docketNumber, base + k, 'stock')
  } else if (i < 11) {
    for (let k = 0; k < n; k++) put(d.docketNumber, autoPointer++, 'automated')
  }
})

export const packagesOfDocket = (docket) => byDocket.get(String(docket)) ?? []
export const lookupPackage = (barcode) => used.get(Number(barcode)) ?? null
export const peekNextPackage = () => autoPointer
export const blockUsage = (id) => {
  const b = PKG_BLOCKS[id]
  let count = 0
  used.forEach((_, k) => { if (k >= b.from && k <= b.to) count++ })
  return { ...b, used: count, left: b.to - b.from + 1 - count, next: id === 'automated' ? autoPointer : null }
}
export const allDocketLabelRows = () => [...byDocket.entries()].map(([docket, list]) => ({
  docket, list, source: used.get(list[0])?.source, ts: Math.max(...list.map((b) => used.get(b).ts)),
}))

// Next N unused sequential barcodes → mapped to the docket (for printing labels).
export function allocateAutomated(docket, count) {
  const n = Math.floor(Number(count))
  if (!(n >= 1)) return { error: 'Enter how many labels.' }
  if (n > 5000) return { error: 'At most 5,000 labels at a time.' }
  const out = []
  for (let k = 0; k < n; k++) {
    while (used.has(autoPointer)) autoPointer++
    if (autoPointer > PKG_BLOCKS.automated.to) return { error: 'Automated series is exhausted.' }
    out.push(autoPointer++)
  }
  out.forEach((b) => put(docket, b, 'automated'))
  return { barcodes: out }
}

// "600000000101-600000000110, 600000000150" → numbers. Validates each one.
export function parseStockInput(text) {
  const nums = []
  for (const tok of text.split(/[\s,;]+/).filter(Boolean)) {
    const [a, b] = tok.split(/[-–]/)
    const lo = a.replace(/\D/g, ''), hi = (b ?? a).replace(/\D/g, '')
    if (lo.length !== PACKAGE_DIGITS || hi.length !== PACKAGE_DIGITS) return { error: `“${tok}” is not a 12-digit number.` }
    if (Number(hi) < Number(lo)) return { error: `“${tok}” ends before it starts.` }
    if (Number(hi) - Number(lo) >= 5000) return { error: 'At most 5,000 labels at a time.' }
    for (let v = Number(lo); v <= Number(hi); v++) nums.push(v)
  }
  if (!nums.length) return { error: 'Type the stock label numbers.' }
  return { nums: [...new Set(nums)] }
}

export function linkStock(docket, text) {
  const r = parseStockInput(text)
  if (r.error) return r
  const bad = r.nums.find((v) => sourceOfPackage(v) !== 'stock')
  if (bad) return { error: `${bad} is not in the Stock series (starts at ${PKG_BLOCKS.stock.from}).` }
  const taken = r.nums.find((v) => used.has(v))
  if (taken) return { error: `${fmtPackage(taken)} is already linked to docket ${used.get(taken).docket}.` }
  r.nums.forEach((b) => put(docket, b, 'stock'))
  return { barcodes: r.nums }
}
