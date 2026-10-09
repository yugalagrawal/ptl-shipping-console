// Per-client assigned docket series. A client set to "Assigned Series" in
// Client Configuration gets one or more number ranges (From – To, 10 digits);
// its dockets draw from those ranges in order, and the system's auto
// generator skips every number inside any client's assigned range. When all
// ranges are used up, Create Docket asks ops to either auto-generate this
// docket's number or assign a new series — the data layer itself never
// blocks (the field scan can't ask anyone), it just falls back to auto.
//
// Ranges live with the rest of the client's saved configuration
// (`docket-series-ranges`); only the consumption pointer is kept here, keyed
// by client + range id, so using numbers never needs a config Save.
import { getClientConfigValues, allSavedClientConfigs, DOCKET_SERIES_ASSIGNED } from './clientConfigFields.js'

export const SERIES_DIGITS = 10
export const SERIES_LOW_AT = 10
const NEXT = {} // `${clientId}|${rangeId}` -> next unused number

const isNum = (s) => new RegExp(`^\\d{${SERIES_DIGITS}}$`).test(String(s ?? ''))

function savedRanges(clientId) {
  const v = getClientConfigValues(clientId)
  if (v['docket-series'] !== DOCKET_SERIES_ASSIGNED) return []
  return (v['docket-series-ranges'] ?? [])
    .filter((r) => isNum(r.from) && isNum(r.to) && Number(r.to) >= Number(r.from))
    .map((r) => ({ id: r.id, from: Number(r.from), to: Number(r.to) }))
}

const nextOf = (clientId, r) => Math.min(Math.max(NEXT[`${clientId}|${r.id}`] ?? r.from, r.from), r.to + 1)

// Used / left per range plus which one is live. `assigned` is true whenever
// the client is on Assigned Series — even with no valid range yet, in which
// case it counts as exhausted (nothing to draw from).
export function seriesState(clientId) {
  const assigned = getClientConfigValues(clientId)['docket-series'] === DOCKET_SERIES_ASSIGNED
  const ranges = savedRanges(clientId).map((r) => {
    const next = nextOf(clientId, r)
    return { ...r, total: r.to - r.from + 1, used: next - r.from, remaining: r.to - next + 1, next }
  })
  const active = ranges.find((r) => r.remaining > 0) ?? null
  const remaining = ranges.reduce((n, r) => n + r.remaining, 0)
  return {
    assigned,
    ranges: ranges.map((r) => ({ ...r, status: r.remaining === 0 ? 'exhausted' : r === active ? 'active' : 'queued' })),
    active,
    next: active ? String(active.next) : null,
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
// the auto generator).
export function allocateDocketNumber(clientId) {
  const { active } = seriesState(clientId)
  if (!active) return null
  NEXT[`${clientId}|${active.id}`] = active.next + 1
  return String(active.next)
}

// Auto generation must never hand out a number inside someone's series.
export function isReservedDocketNumber(n) {
  const num = Number(n)
  return allSavedClientConfigs().some(([clientId]) => savedRanges(clientId).some((r) => num >= r.from && num <= r.to))
}

// Validation for the editor — one message (or '') per row, checked against the
// client's other rows and every other client's saved ranges.
export function validateRanges(clientId, ranges, nameOf = (id) => id) {
  return ranges.map((r, i) => {
    if (!r.from && !r.to) return 'Enter From and To'
    if (!isNum(r.from) || !isNum(r.to)) return `Numbers must be ${SERIES_DIGITS} digits`
    if (Number(r.to) < Number(r.from)) return 'To must be after From'
    const a = Number(r.from), b = Number(r.to)
    const self = ranges.findIndex((o, j) => j !== i && isNum(o.from) && isNum(o.to) && a <= Number(o.to) && b >= Number(o.from))
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
  if (!isNum(r.from) || !isNum(r.to) || Number(r.to) < Number(r.from)) return null
  const from = Number(r.from), to = Number(r.to)
  const next = Math.min(Math.max(NEXT[`${clientId}|${r.id}`] ?? from, from), to + 1)
  return { total: to - from + 1, used: next - from, remaining: to - next + 1 }
}

// --- Picking a range without typing numbers -------------------------------
// Series are carved out of one pool, handed out in order, so ops never has to
// guess what's free: the editor shows what other clients hold and offers the
// next free block of a chosen size.
export const SERIES_POOL_START = 4690000001

export function takenRanges(excludeClientId) {
  return allSavedClientConfigs()
    .filter(([clientId]) => clientId !== excludeClientId)
    .flatMap(([clientId]) => savedRanges(clientId).map((r) => ({ clientId, from: r.from, to: r.to })))
    .sort((a, b) => a.from - b.from)
}

// Next free block of `size`, starting after everything already held — other
// clients' saved ranges and this client's own rows (saved or still being typed).
export function suggestBlock(clientId, currentRanges, size) {
  const ends = [
    SERIES_POOL_START - 1,
    ...takenRanges(clientId).map((r) => r.to),
    ...currentRanges.filter((r) => isNum(r.from) && isNum(r.to)).map((r) => Number(r.to)),
  ]
  const from = Math.max(...ends) + 1
  return { from: String(from), to: String(from + size - 1) }
}
