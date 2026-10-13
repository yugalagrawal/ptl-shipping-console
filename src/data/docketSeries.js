// Per-client assigned docket series. A client set to "Assigned Series" in
// Client Configuration gets one or more ranges (From – To, 10-digit docket
// numbers); its dockets draw from those ranges in order, and the system's auto
// generator skips every number inside any client's assigned range. When all
// ranges are used up, Create Docket asks ops to either auto-generate this
// docket's number or assign a new series — the data layer itself never
// blocks (the field scan can't ask anyone), it just falls back to auto.
//
// Docket numbers carry a weighted mod-11 check digit (data/docketNumber.js),
// so a range is really a span of 9-digit BODIES: From and To must themselves be
// valid dockets, and the range holds every issuable body between them — not
// every 10-digit number (only ~1 in 10 of those is valid, and Option B also
// skips remainder-10 bodies). Counts below are therefore counts of issuable
// dockets, never To − From + 1.
//
// Ranges live with the rest of the client's saved configuration
// (`docket-series-ranges`); only the consumption pointer is kept here, keyed
// by client + range id, so using numbers never needs a config Save.
import { getClientConfigValues, allSavedClientConfigs, DOCKET_SERIES_ASSIGNED } from './clientConfigFields.js'
import { bodyOfDocket, bodyStr, countIssuable, docketOfBody, inspectDocket, isIssuableBody, nextIssuableBody } from './docketNumber.js'

export const SERIES_DIGITS = 10
export const SERIES_LOW_AT = 10
const PTR = {} // `${clientId}|${rangeId}` -> next body to try
const USED = {} // `${clientId}|${rangeId}` -> dockets handed out
const keyOf = (clientId, r) => `${clientId}|${r.id}`

const isNum = (s) => new RegExp(`^\\d{${SERIES_DIGITS}}$`).test(String(s ?? ''))
const isDocket = (s) => isNum(s) && inspectDocket(s).valid

const totalCache = new Map()
function totalOf(r) {
  const k = `${r.fromBody}-${r.toBody}`
  if (!totalCache.has(k)) totalCache.set(k, countIssuable(r.fromBody, r.toBody))
  return totalCache.get(k)
}

function savedRanges(clientId) {
  const v = getClientConfigValues(clientId)
  if (v['docket-series'] !== DOCKET_SERIES_ASSIGNED) return []
  return (v['docket-series-ranges'] ?? [])
    .filter((r) => isDocket(r.from) && isDocket(r.to) && Number(r.to) >= Number(r.from))
    .map((r) => ({ id: r.id, from: Number(r.from), to: Number(r.to), fromBody: bodyOfDocket(r.from), toBody: bodyOfDocket(r.to) }))
}

// The next docket this range would hand out (null when it has none left).
function nextIn(clientId, r) {
  const start = Math.max(PTR[keyOf(clientId, r)] ?? r.fromBody, r.fromBody)
  const b = nextIssuableBody(start)
  return b != null && b <= r.toBody ? b : null
}

// Used / left per range plus which one is live. `assigned` is true whenever
// the client is on Assigned Series — even with no valid range yet, in which
// case it counts as exhausted (nothing to draw from).
export function seriesState(clientId) {
  const assigned = getClientConfigValues(clientId)['docket-series'] === DOCKET_SERIES_ASSIGNED
  const ranges = savedRanges(clientId).map((r) => {
    const { count: total, approx } = totalOf(r)
    const used = Math.min(USED[keyOf(clientId, r)] ?? 0, total)
    const nextBody = nextIn(clientId, r)
    return { ...r, total, approx, used, remaining: nextBody == null ? 0 : Math.max(1, total - used), next: nextBody == null ? null : docketOfBody(nextBody) }
  })
  const active = ranges.find((r) => r.remaining > 0) ?? null
  const remaining = ranges.reduce((n, r) => n + r.remaining, 0)
  return {
    assigned,
    ranges: ranges.map((r) => ({ ...r, status: r.remaining === 0 ? 'exhausted' : r === active ? 'active' : 'queued' })),
    active,
    next: active ? active.next : null,
    remaining,
    exhausted: assigned && !active,
    low: assigned && !!active && remaining <= SERIES_LOW_AT,
  }
}

export function peekSeriesNumber(clientId) {
  return seriesState(clientId).next
}

// Consumes and returns the client's next series number, or null when the
// client isn't on an assigned series / it's exhausted (caller falls back to
// the auto generator). A number handed out is never reissued, even if the
// docket's creation later fails.
export function allocateDocketNumber(clientId) {
  const { active } = seriesState(clientId)
  if (!active) return null
  const body = bodyOfDocket(active.next)
  PTR[keyOf(clientId, active)] = body + 1
  USED[keyOf(clientId, active)] = (USED[keyOf(clientId, active)] ?? 0) + 1
  return active.next
}

// Auto generation must never hand out a number inside someone's series.
export function isReservedDocketNumber(n) {
  const body = bodyOfDocket(n)
  return allSavedClientConfigs().some(([clientId]) => savedRanges(clientId).some((r) => body >= r.fromBody && body <= r.toBody))
}

// Why a typed From/To isn't usable — tells ops the right check digit.
function endpointError(label, v) {
  if (!isNum(v)) return `Numbers must be ${SERIES_DIGITS} digits`
  const r = inspectDocket(v)
  return r.valid ? '' : `${label}: ${r.reason.replace(' Check for typos.', '')}`
}

// Validation for the editor — one message (or '') per row, checked against the
// client's other rows and every other client's saved ranges.
export function validateRanges(clientId, ranges, nameOf = (id) => id) {
  return ranges.map((r, i) => {
    if (!r.from && !r.to) return 'Enter From and To'
    const bad = endpointError('From', r.from) || endpointError('To', r.to)
    if (bad) return bad
    if (Number(r.to) < Number(r.from)) return 'To must be after From'
    if (blockOfNumber(r.from)?.id !== blockOfNumber(r.to)?.id) return 'A series must sit inside one mode block'
    const a = Number(r.from), b = Number(r.to)
    const self = ranges.findIndex((o, j) => j !== i && isDocket(o.from) && isDocket(o.to) && a <= Number(o.to) && b >= Number(o.from))
    if (self >= 0) return `Overlaps series ${self + 1} of this client`
    for (const [otherId] of allSavedClientConfigs()) {
      if (otherId === clientId) continue
      const hit = savedRanges(otherId).find((o) => a <= o.to && b >= o.from)
      if (hit) return `Overlaps ${nameOf(otherId)}'s series`
    }
    return ''
  })
}

// How much of an (possibly unsaved) range is already used — drives the row
// summary in the editor.
export function rangeUsage(clientId, r) {
  if (!isDocket(r.from) || !isDocket(r.to) || Number(r.to) < Number(r.from)) return null
  const range = { fromBody: bodyOfDocket(r.from), toBody: bodyOfDocket(r.to) }
  const { count: total } = totalOf(range)
  const used = Math.min(USED[keyOf(clientId, r)] ?? 0, total)
  return { total, used, remaining: total - used }
}

// --- Picking a range without typing numbers -------------------------------
// Series are carved out of the mode blocks below, handed out in order, so ops
// never has to guess what's free: the editor shows what other clients hold and
// offers the next free block of a chosen size.
export function takenRanges(excludeClientId) {
  return allSavedClientConfigs()
    .filter(([clientId]) => clientId !== excludeClientId)
    .flatMap(([clientId]) => savedRanges(clientId).map((r) => ({ clientId, from: r.from, to: r.to, toBody: r.toBody })))
    .sort((a, b) => a.from - b.from)
}

// Next free block of `size` issuable dockets inside the chosen mode's block
// (Surface, Air, Rail or Sea), after everything already held there — other
// clients' saved ranges and this client's own rows (saved or still being
// typed). Both ends are real dockets, so the editor accepts them as-is.
// `autoNext` is the docket number auto numbering will issue next. Returns null
// when that mode's block has no room left.
export function suggestBlock(clientId, currentRanges, size, mode = 'Surface', autoNext = null) {
  const held = [
    ...takenRanges(clientId).map((r) => r.toBody),
    ...currentRanges.filter((r) => isDocket(r.from) && isDocket(r.to)).map((r) => bodyOfDocket(r.to)),
  ]
  for (const blk of LEAF_BLOCKS.filter((b) => b.assigned === mode)) {
    const lo = blk.from / 10, hi = (blk.to - 9) / 10
    // Surface is also where auto numbering runs — start past what it has reached (and the number it has previewed).
    const autoBody = autoNext != null ? bodyOfDocket(autoNext) : null
    const floor = autoBody != null && autoBody >= lo && autoBody <= hi ? autoBody + 1 : lo
    const inBlock = held.filter((b) => b >= lo && b <= hi)
    const first = nextIssuableBody(Math.max(floor, inBlock.length ? Math.max(...inBlock) + 1 : lo))
    if (first == null || first > hi) continue
    let last = first, n = 1
    for (let b = first + 1; n < size && b <= hi; b++) if (isIssuableBody(bodyStr(b))) { last = b; n++ }
    return { from: docketOfBody(first), to: docketOfBody(last) }
  }
  return null
}

// Push a series' To forward by `n` more issuable dockets (the +100 / +500 buttons).
export function extendTo(to, n) {
  if (!isDocket(to)) return to
  let b = bodyOfDocket(to), added = 0
  while (added < n && b < 999999999) { b++; if (isIssuableBody(bodyStr(b))) added++ }
  return docketOfBody(b)
}

// --- Series blocks --------------------------------------------------------
// The docket-number space split by mode, written as full 10-digit docket
// numbers (the check digit runs 0–9, so a 9-digit block 1xxxxxxxx spans
// 1xxxxxxxx0 – 1xxxxxxxx9). First digit 6 is kept for the non-surface modes and
// divided between Air, Rail and Sea. Auto numbering starts at 1000000000.
const blk = (id, fromBody, toBody, assigned, divisions) => ({ id, from: fromBody * 10, to: toBody * 10 + 9, assigned, ...(divisions ? { divisions } : {}) })
export const SERIES_BLOCKS = [
  blk('surface', 100000000, 599999999, 'Surface'),
  blk('other-modes', 600000000, 699999999, 'Air, Rail & Sea', [
    blk('air', 600000000, 649999999, 'Air'),
    blk('rail', 650000000, 674999999, 'Rail'),
    blk('sea', 675000000, 699999999, 'Sea'),
  ]),
  blk('surface-2', 700000000, 999999999, 'Surface'),
]

// The blocks that actually carry a mode (Air/Rail/Sea instead of their parent).
export const LEAF_BLOCKS = SERIES_BLOCKS.flatMap((b) => b.divisions ?? [b])

// Which block (and so which mode) a docket number falls in.
export const blockOfNumber = (n) => LEAF_BLOCKS.find((b) => Number(n) >= b.from && Number(n) <= b.to) ?? null
