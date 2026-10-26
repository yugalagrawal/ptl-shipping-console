// Finance Dashboard — sample data on the Level 1 / 2 / 3 cost ladder. Deterministic, not wired to a backend.
// One record per month × client × lane × mode, with revenue and every cost line already attributed to dockets.

export const MONTHS = ['May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26']
const DIESEL = [1, 1.012, 1.03, 1.035, 1.058, 1.08]

export const REGIONS = ['North', 'West', 'South', 'East']
// sortHours = the hub's sortation hours; Hub factor = sortHours / 24. dwell = typical billable hours beyond them.
export const HUBS = [
  { id: 'DEL', name: 'Delhi', region: 'North', sortHours: 16, dwell: [5, 5, 6, 6, 6, 7] },
  { id: 'AMD', name: 'Ahmedabad', region: 'West', sortHours: 18, dwell: [4, 4, 4, 5, 4, 5] },
  { id: 'MUM', name: 'Mumbai', region: 'West', sortHours: 14, dwell: [8, 8, 9, 9, 10, 10] },
  { id: 'BLR', name: 'Bengaluru', region: 'South', sortHours: 16, dwell: [6, 6, 6, 7, 6, 6] },
  { id: 'CHE', name: 'Chennai', region: 'South', sortHours: 18, dwell: [4, 5, 4, 4, 5, 5] },
  { id: 'HYD', name: 'Hyderabad', region: 'South', sortHours: 20, dwell: [3, 3, 4, 4, 4, 4] },
  { id: 'KOL', name: 'Kolkata', region: 'East', sortHours: 12, dwell: [9, 10, 12, 14, 16, 19] },
]
export const HUB_BY_ID = Object.fromEntries(HUBS.map((h) => [h.id, h]))

// km, rate = ₹ per kg billed on surface, ineff = manifest cost multiplier (empty returns, poor load factor)
export const LANES = [
  { id: 'DEL-MUM', from: 'DEL', to: 'MUM', km: 1400, rate: 11.4, ineff: 1.0, size: 1.5 },
  { id: 'MUM-BLR', from: 'MUM', to: 'BLR', km: 980, rate: 8.9, ineff: 1.0, size: 1.1 },
  { id: 'BLR-CHE', from: 'BLR', to: 'CHE', km: 350, rate: 5.6, ineff: 1.05, size: 1.2 },
  { id: 'DEL-KOL', from: 'DEL', to: 'KOL', km: 1500, rate: 11.6, ineff: 1.18, size: 0.8 },
  { id: 'KOL-BLR', from: 'KOL', to: 'BLR', km: 1850, rate: 12.2, ineff: 1.3, size: 0.6 },
  { id: 'AMD-MUM', from: 'AMD', to: 'MUM', km: 530, rate: 6.4, ineff: 0.98, size: 1.3 },
  { id: 'DEL-AMD', from: 'DEL', to: 'AMD', km: 940, rate: 8.4, ineff: 1.02, size: 0.9 },
  { id: 'HYD-BLR', from: 'HYD', to: 'BLR', km: 570, rate: 5.9, ineff: 1.28, size: 0.7 },
  { id: 'CHE-HYD', from: 'CHE', to: 'HYD', km: 630, rate: 6.8, ineff: 1.0, size: 0.7 },
]

// avgKg per docket, rate = pricing factor, ded = share of billing the client deducts or short-pays, pick = pickup cost factor
export const CLIENTS = [
  { id: 'Vardhman Textiles', size: 1.6, avgKg: 85, rate: 1.0, ded: 0.012, pick: 0.9 },
  { id: 'Aarav FMCG', size: 1.4, avgKg: 64, rate: 0.96, ded: 0.034, pick: 1.0 },
  { id: 'Nexa Electronics', size: 1.0, avgKg: 38, rate: 1.12, ded: 0.018, pick: 1.1 },
  { id: 'Kavya Pharma', size: 0.8, avgKg: 22, rate: 1.25, ded: 0.009, pick: 1.2 },
  { id: 'BharatMart Retail', size: 1.3, avgKg: 72, rate: 0.9, ded: 0.058, pick: 1.0 },
  { id: 'Sundaram Auto Parts', size: 0.9, avgKg: 96, rate: 1.0, ded: 0.021, pick: 0.95 },
  { id: 'Lotus Home Décor', size: 0.6, avgKg: 54, rate: 1.05, ded: 0.027, pick: 1.05 },
  { id: 'Quickbasket Grocers', size: 0.7, avgKg: 48, rate: 0.88, ded: 0.044, pick: 1.0 },
]
export const MODES = ['Surface', 'Air', 'Rail', 'Ocean']
// share = docket volume vs Surface, rate = ₹/kg vs Surface, man = mid-mile cost per km vs Surface, dwell = hub dwell vs Surface.
const MODE_X = {
  Surface: { share: 1, rate: 1, man: 1, dwell: 1, ok: () => true },
  Air: { share: 0.1, rate: 3.1, man: 4.2, dwell: 0.3, ok: (l) => l.km >= 900 },
  Rail: { share: 0.22, rate: 0.82, man: 0.58, dwell: 1.5, ok: (l) => l.km >= 500 },
  Ocean: { share: 0.06, rate: 0.85, man: 0.42, dwell: 2.2, ok: (l) => ['MUM-BLR', 'BLR-CHE', 'AMD-MUM', 'KOL-BLR'].includes(l.id) },
}

function rng(seed) {
  let a = seed
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

function build() {
  const rnd = rng(26)
  const out = []
  const season = [0.92, 0.95, 0.9, 1.0, 1.08, 1.22]
  MONTHS.forEach((_, mi) => {
    CLIENTS.forEach((c) => LANES.forEach((l) => MODES.forEach((mode) => {
      const x = MODE_X[mode]
      if (!x.ok(l)) return
      const d = Math.round(520 * c.size * l.size * season[mi] * x.share * (0.85 + rnd() * 0.3))
      if (d < 3) return
      const kg = d * c.avgKg * (0.94 + rnd() * 0.12)
      const gross = kg * l.rate * c.rate * x.rate * (1.025 + rnd() * 0.02)
      const ded = gross * c.ded * (c.id === 'BharatMart Retail' ? 1 + mi * 0.07 : 1) * (0.8 + rnd() * 0.4)
      const dsl = DIESEL[mi]
      const prs = kg * 1.25 * c.pick * dsl * (0.94 + rnd() * 0.1)
      const man = kg * l.km * 0.0030 * dsl * l.ineff * x.man * (0.95 + rnd() * 0.1)
      const drs = kg * 1.5 * dsl * (mode === 'Air' ? 1.1 : 1) * (0.94 + rnd() * 0.1)
      const hf = (HUB_BY_ID[l.from].sortHours + HUB_BY_ID[l.to].sortHours) / 48
      const dwell = ((HUB_BY_ID[l.from].dwell[mi] + HUB_BY_ID[l.to].dwell[mi]) / 2) * x.dwell
      const l2 = kg * (0.8 + 0.02 * dwell) * (0.96 + rnd() * 0.08)
      const sort = l2 * hf
      const stor = l2 - sort
      const kgh = kg * dwell * 2 // billable kg-hours, both hubs
      const net = gross - ded
      const l3 = net * (0.072 + rnd() * 0.006)
      out.push({ mi, client: c.id, lane: l.id, from: l.from, to: l.to, region: HUB_BY_ID[l.from].region, mode, d, kg, gross, ded, net, prs, man, drs, sort, stor, kgh, l3 })
    })))
  })
  return out
}
export const RECORDS = build()

export const ZERO = { d: 0, kg: 0, gross: 0, ded: 0, net: 0, prs: 0, man: 0, drs: 0, sort: 0, stor: 0, kgh: 0, l3: 0 }
export function agg(rows) {
  const a = { ...ZERO }
  rows.forEach((r) => { for (const k in ZERO) a[k] += r[k] })
  a.l1 = a.prs + a.man + a.drs
  a.l2 = a.sort + a.stor
  a.cost = a.l1 + a.l2 + a.l3
  a.m1 = a.net - a.l1
  a.m2 = a.m1 - a.l2
  a.m3 = a.m2 - a.l3
  return a
}
export const pct = (x, y) => (y ? x / y : 0)

export function fmtMoney(v) {
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1)} L`
  return `${s}₹${Math.round(a).toLocaleString('en-IN')}`
}
