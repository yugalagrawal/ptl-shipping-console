// Pure helpers for the Pickup Dashboard — derives the fields the UI filters /
// sorts / groups on from the raw pickup + PRS records (data/pickups.js, prs.js).
import { PICKUP_STATUS, PICKUP_TYPE } from '../../data/pickups.js'
import { PRS_SEED } from '../../data/prs.js'
import { FLEET_SEED } from '../../data/fleet.js'

export const STAGES = [
  PICKUP_STATUS.DRAFT, PICKUP_STATUS.CREATED, PICKUP_STATUS.ASSIGNED, PICKUP_STATUS.ARRIVED,
  PICKUP_STATUS.STARTED, PICKUP_STATUS.FAILED, PICKUP_STATUS.IN_PROGRESS, PICKUP_STATUS.COMPLETED,
  PICKUP_STATUS.AT_HUB, PICKUP_STATUS.DROPPED,
]
// Stages that only exist for some pickups — hidden from charts while empty.
export const OPTIONAL_STAGES = new Set([PICKUP_STATUS.DRAFT, PICKUP_STATUS.FAILED])

// Stages where the pickup has not yet reached the consignor's dock — the only
// ones that can be "overdue" against their scheduled slot.
const PRE_ARRIVAL = new Set([PICKUP_STATUS.DRAFT, PICKUP_STATUS.CREATED, PICKUP_STATUS.ASSIGNED])

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Rows are rebuilt on every render of the page, so this must stay cheap.
export function enrich(p, now = new Date()) {
  const prs = p.prsId ? PRS_SEED.find((r) => r.id === p.prsId) : null
  const veh = prs?.vehicleId ? FLEET_SEED.find((v) => v.id === prs.vehicleId) : null
  const slot = p.scheduledDate && p.scheduledTime ? new Date(`${p.scheduledDate}T${p.scheduledTime}`) : null
  const dests = p.details?.destinations ?? (p.consignee ? [{ consignee: p.consignee }] : [])
  const actual = p.actualWeightKg || null
  const variancePct = actual && p.estWeightKg ? Math.round(((actual - p.estWeightKg) / p.estWeightKg) * 100) : null
  return {
    ...p,
    type: p.pickupType ?? (p.id.startsWith('PS') ? PICKUP_TYPE.RECURRING : PICKUP_TYPE.ONE_TIME),
    slot,
    slotDate: p.scheduledDate ?? null,
    prs,
    vehicle: prs?.vehicleLabel?.split(' · ')[0] ?? null,
    driver: prs?.driverName ?? null,
    partner: prs ? (veh?.vendorName || 'LetsTransport Fleet') : null,
    consigneeCount: dests.length,
    destCities: [...new Set(dests.map((d) => d.consignee?.city).filter(Boolean))],
    hazardous: !!p.details?.hazardous,
    fragile: !!p.details?.fragile,
    unassigned: p.status === PICKUP_STATUS.CREATED,
    overdue: !!slot && PRE_ARRIVAL.has(p.status) && slot < now,
    variancePct,
    packagesLabel: p.packagesCount ? `${p.scannedCount ?? 0}/${p.packagesCount}` : null,
    city: p.consignor.city,
  }
}

// ---- Filtering ------------------------------------------------------------
export const EMPTY_FILTERS = {
  status: [], client: [], hub: [], city: [], type: [], vehicle: [], flags: [],
  dateFrom: '', dateTo: '', minKg: '', maxKg: '',
}

export const FLAG_OPTIONS = [
  { value: 'overdue', label: 'Overdue slot' },
  { value: 'unassigned', label: 'Not on a PRS' },
  { value: 'urgent', label: 'Urgent booking' },
  { value: 'hazardous', label: 'Hazardous' },
  { value: 'fragile', label: 'Fragile' },
  { value: 'multi', label: 'Multiple consignees' },
  { value: 'variance', label: 'Weight off by >10%' },
]

const FLAG_TEST = {
  overdue: (r) => r.overdue,
  unassigned: (r) => r.unassigned,
  urgent: (r) => !!r.urgent,
  hazardous: (r) => r.hazardous,
  fragile: (r) => r.fragile,
  multi: (r) => r.consigneeCount > 1,
  variance: (r) => r.variancePct != null && Math.abs(r.variancePct) > 10,
}

export function searchHaystack(r) {
  return [
    r.id, r.clientName, r.consignor.name, r.consignor.company, r.consignor.city, r.consignor.state,
    r.consignor.pincode, r.consignor.phone, r.consignor.address, r.dropMiniHubName, r.prsId, r.vehicle,
    r.driver, r.docketNumber, ...(r.awbNumbers ?? []), ...r.destCities,
    ...(r.details?.destinations ?? []).map((d) => d.consignee?.name),
  ].filter(Boolean).join(' ').toLowerCase()
}

export function applyFilters(rows, f, query) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const min = f.minKg === '' ? null : Number(f.minKg)
  const max = f.maxKg === '' ? null : Number(f.maxKg)
  return rows.filter((r) => {
    if (f.status.length && !f.status.includes(r.status)) return false
    if (f.client.length && !f.client.includes(r.clientName)) return false
    if (f.hub.length && !f.hub.includes(r.dropMiniHubName)) return false
    if (f.city.length && !f.city.includes(r.city)) return false
    if (f.type.length && !f.type.includes(r.type)) return false
    if (f.vehicle.length && !f.vehicle.includes(r.vehicle ?? '__none')) return false
    if (f.flags.length && !f.flags.every((k) => FLAG_TEST[k](r))) return false
    if (f.dateFrom && (!r.slotDate || r.slotDate < f.dateFrom)) return false
    if (f.dateTo && (!r.slotDate || r.slotDate > f.dateTo)) return false
    if (min != null && r.estWeightKg < min) return false
    if (max != null && r.estWeightKg > max) return false
    if (tokens.length) {
      const hay = searchHaystack(r)
      if (!tokens.every((t) => hay.includes(t))) return false
    }
    return true
  })
}

export function countActiveFilters(f) {
  return ['status', 'client', 'hub', 'city', 'type', 'vehicle', 'flags'].reduce((n, k) => n + f[k].length, 0)
    + (f.minKg !== '' || f.maxKg !== '' ? 1 : 0)
}

// ---- Date presets -----------------------------------------------------------
export function datePreset(name) {
  const t = startOfDay(new Date())
  const add = (n) => { const x = new Date(t); x.setDate(x.getDate() + n); return x }
  if (name === 'today') return { dateFrom: dateStr(t), dateTo: dateStr(t) }
  if (name === 'tomorrow') return { dateFrom: dateStr(add(1)), dateTo: dateStr(add(1)) }
  if (name === 'next7') return { dateFrom: dateStr(t), dateTo: dateStr(add(7)) }
  if (name === 'last7') return { dateFrom: dateStr(add(-7)), dateTo: dateStr(t) }
  if (name === 'last30') return { dateFrom: dateStr(add(-30)), dateTo: dateStr(t) }
  return { dateFrom: '', dateTo: '' }
}

// ---- Sorting / grouping -------------------------------------------------------
export const SORTERS = {
  id: (r) => r.id,
  client: (r) => r.clientName.toLowerCase(),
  city: (r) => r.city.toLowerCase(),
  hub: (r) => (r.dropMiniHubName ?? '').toLowerCase(),
  slot: (r) => (r.slot ? r.slot.getTime() : Infinity),
  weight: (r) => r.estWeightKg,
  status: (r) => STAGES.indexOf(r.status),
  prs: (r) => r.prsId ?? '',
}

export function sortRows(rows, key, dir) {
  const fn = SORTERS[key] ?? SORTERS.slot
  const sign = dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const x = fn(a), y = fn(b)
    if (x === y) return 0
    return (x > y ? 1 : -1) * sign
  })
}

export const GROUP_BY = {
  none: { label: 'No grouping' },
  status: { label: 'Status', key: (r) => r.status },
  hub: { label: 'Mini Hub', key: (r) => r.dropMiniHubName ?? 'No hub' },
  client: { label: 'Client', key: (r) => r.clientName },
  city: { label: 'Pickup city', key: (r) => r.city },
  date: { label: 'Pickup date', key: (r) => r.slotDate ?? 'Unscheduled' },
  prs: { label: 'Run sheet (PRS)', key: (r) => r.prsId ?? 'Not on a PRS' },
}

export function formatSlot(r) {
  if (!r.slot) return '—'
  return `${r.slot.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · ${r.scheduledTime}`
}

export function toCsv(rows, label) {
  const head = ['Pickup ID', 'Type', 'Client', 'Consignor', 'Pickup city', 'Pincode', 'Drop Mini Hub', 'Scheduled', 'Est kg', 'Actual kg', 'Volumetric kg', 'Packages', 'Status', 'PRS', 'Vehicle', 'Driver', 'Docket']
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`
  const lines = rows.map((r) => [
    r.id, r.type === PICKUP_TYPE.RECURRING ? 'Recurring' : 'One-time', r.clientName, r.consignor.name, r.city, r.consignor.pincode,
    r.dropMiniHubName, r.slot ? `${r.scheduledDate} ${r.scheduledTime}` : '', r.estWeightKg, r.actualWeightKg, r.volumetricWeightKg,
    r.packagesCount, label(r.status), r.prsId, r.vehicle, r.driver, r.docketNumber,
  ].map(esc).join(','))
  return [head.map(esc).join(','), ...lines].join('\n')
}

// ---- Performance ------------------------------------------------------------
// A driver counts as on time if they reach the pickup location no later than
// the scheduled slot + this grace.
export const ON_TIME_GRACE_MIN = 15
const MIN = 60000

function rate(n, d) { return d ? Math.round((n / d) * 100) : null }
function avg(list) { return list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null }

function summarize(rows) {
  const arrived = rows.filter((r) => r.arrivedAt && r.slot)
  const onTime = arrived.filter((r) => r.arrivedAt <= r.slot.getTime() + ON_TIME_GRACE_MIN * MIN)
  const late = arrived.filter((r) => r.arrivedAt > r.slot.getTime() + ON_TIME_GRACE_MIN * MIN)
  const attempted = rows.filter((r) => r.arrivedAt)
  const failed = attempted.filter((r) => r.status === PICKUP_STATUS.FAILED)
  return {
    pickups: rows.length,
    attempted: attempted.length,
    arrived: arrived.length,
    onTime: onTime.length,
    onTimePct: rate(onTime.length, arrived.length),
    avgDelayMin: avg(late.map((r) => Math.round((r.arrivedAt - r.slot.getTime()) / MIN))),
    failed: failed.length,
    failedPct: rate(failed.length, attempted.length),
    avgOnSiteMin: avg(rows.filter((r) => r.arrivedAt && r.completedAt).map((r) => Math.round((r.completedAt - r.arrivedAt) / MIN))),
  }
}

function leaderboard(rows, keyOf) {
  const m = new Map()
  rows.forEach((r) => { const k = keyOf(r); if (k) m.set(k, [...(m.get(k) ?? []), r]) })
  return [...m.entries()].map(([name, rs]) => ({ name, ...summarize(rs) }))
    .filter((x) => x.attempted > 0)
    // On-time % first, then more pickups handled, then fewer failures.
    .sort((a, b) => (b.onTimePct ?? -1) - (a.onTimePct ?? -1) || b.attempted - a.attempted || a.failed - b.failed)
}

export function computePerformance(rows) {
  const failReasons = new Map()
  rows.filter((r) => r.failure).forEach((r) => failReasons.set(r.failure.reason, (failReasons.get(r.failure.reason) ?? 0) + 1))
  return {
    overall: summarize(rows),
    partners: leaderboard(rows, (r) => r.partner),
    drivers: leaderboard(rows, (r) => r.driver),
    failReasons: [...failReasons.entries()].sort((a, b) => b[1] - a[1]),
  }
}
