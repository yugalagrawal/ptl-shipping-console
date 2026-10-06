// Costing Module — cost-to-serve across the PTL network, for business / CEO
// review: where the money goes (cost heads), where it is incurred (region →
// hub → lane, or by client), how it compares with budget, and where it is
// heading (forecast + what-if).
//
// SAMPLE DATA: the prototype has no real cost ledger, so the 12-month history
// below is generated deterministically from a small driver model (volume ×
// unit cost per head, plus fixed costs) with a seasonal festive peak and a few
// planted anomalies. The forecast and scenario maths further down are real —
// they run on whatever history this file (or a future ledger) provides.

export const HEADS = [
  { key: 'firstMile', label: 'First mile (pickup)', short: 'First mile', color: '#0EA5E9', type: 'variable' },
  { key: 'lineHaul', label: 'Line haul (hub-to-hub)', short: 'Line haul', color: '#D94F1C', type: 'variable' },
  { key: 'hubHandling', label: 'Hub & Mini Hub handling', short: 'Handling', color: '#8B5CF6', type: 'variable' },
  { key: 'lastMile', label: 'Last mile (delivery)', short: 'Last mile', color: '#10B981', type: 'variable' },
  { key: 'claims', label: 'Claims & damages', short: 'Claims', color: '#F59E0B', type: 'variable' },
  { key: 'facility', label: 'Facility rent & utilities', short: 'Facilities', color: '#64748B', type: 'fixed' },
  { key: 'manpower', label: 'Manpower & overheads', short: 'Manpower', color: '#334155', type: 'fixed' },
  { key: 'tech', label: 'Technology & other', short: 'Tech', color: '#94A3B8', type: 'fixed' },
]
export const HEAD_BY_KEY = Object.fromEntries(HEADS.map((h) => [h.key, h]))

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const START = { y: 2025, m: 9 } // Oct 2025
export const N_ACTUAL = 12
export const N_FORECAST = 6

function monthAt(i) {
  const idx = START.m + i
  const y = START.y + Math.floor(idx / 12)
  const m = idx % 12
  return { label: `${MONTH_NAMES[m]} ${String(y).slice(2)}`, short: MONTH_NAMES[m], long: `${MONTH_NAMES[m]} ${y}`, calMonth: m }
}

// Deterministic "noise" so every reload shows the same history.
function jitter(i, k, amp = 0.014) {
  const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453
  return 1 + (x - Math.floor(x) - 0.5) * 2 * amp
}

// Festive peak Oct–Dec, post-festive dip Jan–Feb.
const VOLUME_SEASON = { 9: 1.1, 10: 1.14, 11: 1.06, 0: 0.94, 1: 0.92, 2: 1.02, 3: 0.98, 4: 0.99, 5: 0.96, 6: 0.97, 7: 1.0, 8: 1.04 }

const BASE_DOCKETS = 30000
const VOLUME_GROWTH = 0.026 // per month
export const AVG_KG_PER_DOCKET = 62

// ₹ per docket at Oct-25, variable heads.
const UNIT0 = { firstMile: 38, lineHaul: 96, hubHandling: 31, lastMile: 54, claims: 4.5 }
// Monthly ₹ at Oct-25, fixed heads.
const FIXED0 = { facility: 2150000, manpower: 1800000, tech: 600000 }

// Pressure on unit costs: diesel creeps up, a last-mile spike from June
// (rider rate revision + more ODA), a facility step-up in Feb (two new Mini Hubs).
function unitDrift(head, i) {
  const base = { firstMile: 0.004, lineHaul: 0.006, hubHandling: 0.002, lastMile: 0.005, claims: 0.003 }[head]
  let f = Math.pow(1 + base, i)
  if (head === 'lastMile' && i >= 8) f *= 1.09
  if (head === 'lineHaul' && i >= 10) f *= 1.035
  return f
}
function fixedDrift(head, i) {
  let f = Math.pow(1 + (head === 'manpower' ? 0.012 : 0.004), i)
  if (head === 'facility' && i >= 4) f *= 1.07
  return f
}

export const DIESEL_PRICE = (i) => Math.round((90.5 + i * 0.55 + (i >= 8 ? 1.6 : 0)) * 10) / 10 // ₹/litre

// Revenue per docket (blended freight billed), drifts up slower than cost.
const REV_PER_DOCKET0 = 415
const revPerDocket = (i) => REV_PER_DOCKET0 * Math.pow(1.0035, i)

function buildHistory() {
  return Array.from({ length: N_ACTUAL }, (_, i) => {
    const mo = monthAt(i)
    const dockets = Math.round(BASE_DOCKETS * Math.pow(1 + VOLUME_GROWTH, i) * VOLUME_SEASON[mo.calMonth] * jitter(i, 1, 0.01))
    const heads = {}
    for (const h of HEADS) {
      heads[h.key] = h.type === 'variable'
        ? Math.round(dockets * UNIT0[h.key] * unitDrift(h.key, i) * jitter(i, h.key.length))
        : Math.round(FIXED0[h.key] * fixedDrift(h.key, i) * jitter(i, h.key.length, 0.004))
    }
    const total = Object.values(heads).reduce((s, v) => s + v, 0)
    return { i, ...mo, dockets, kg: dockets * AVG_KG_PER_DOCKET, heads, total, revenue: Math.round(dockets * revPerDocket(i)), diesel: DIESEL_PRICE(i) }
  })
}
export const HISTORY = buildHistory()

// Budget — set last Oct from the then-current unit costs, a planned 2.4%/month
// volume growth on the festive curve and ~0.3%/month cost inflation. The
// gaps vs actual are what the variance view and insights surface.
function budgetRow(i) {
  const mo = monthAt(i)
  const plannedDockets = BASE_DOCKETS * Math.pow(1.024, i) * VOLUME_SEASON[mo.calMonth] // plan assumes the known festive curve
  const heads = {}
  for (const h of HEADS) {
    heads[h.key] = Math.round(h.type === 'variable'
      ? plannedDockets * UNIT0[h.key] * Math.pow(1.003, i)
      : FIXED0[h.key] * Math.pow(1.004, i) * (h.key === 'manpower' ? 1.006 ** i : 1))
  }
  return { i, ...mo, heads, total: Object.values(heads).reduce((s, v) => s + v, 0), dockets: Math.round(plannedDockets) }
}
export const BUDGET = HISTORY.map((r) => budgetRow(r.i))

// ───────────────────────── Forecast engine ─────────────────────────
// Per series: least-squares linear trend + seasonal ratio-to-trend (shrunk 40%
// toward 1 because we only hold one year) for variable heads; trend only for
// fixed heads. Band = ±1.28σ (≈80%) of in-sample residuals, widening with horizon.

function linFit(ys) {
  const n = ys.length
  const xm = (n - 1) / 2
  const ym = ys.reduce((s, v) => s + v, 0) / n
  let num = 0, den = 0
  ys.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2 })
  const b = num / den
  return { a: ym - b * xm, b }
}

export function forecastSeries(ys, calMonths, horizon, { seasonal = true } = {}) {
  const { a, b } = linFit(ys)
  const ratios = ys.map((y, x) => y / (a + b * x))
  const seasonalIdx = ratios.map((r) => (seasonal ? 1 + (r - 1) * 0.6 : 1))
  const resid = ys.map((y, x) => y - (a + b * x) * seasonalIdx[x])
  const sigma = Math.sqrt(resid.reduce((s, v) => s + v * v, 0) / Math.max(1, ys.length - 2))
  return Array.from({ length: horizon }, (_, h) => {
    const x = ys.length + h
    const season = seasonalIdx[x % ys.length] // same calendar month a year ago (series starts a full year back)
    const value = Math.max(0, (a + b * x) * season)
    const spread = 1.28 * sigma * Math.sqrt(1 + (h + 1) / 6)
    return { value, lo: Math.max(0, value - spread), hi: value + spread }
  })
}

function buildForecast() {
  const calMonths = HISTORY.map((r) => r.calMonth)
  const perHead = {}
  for (const h of HEADS) {
    perHead[h.key] = forecastSeries(HISTORY.map((r) => r.heads[h.key]), calMonths, N_FORECAST, { seasonal: h.type === 'variable' })
  }
  const dockets = forecastSeries(HISTORY.map((r) => r.dockets), calMonths, N_FORECAST)
  const revenue = forecastSeries(HISTORY.map((r) => r.revenue), calMonths, N_FORECAST)
  return Array.from({ length: N_FORECAST }, (_, h) => {
    const mo = monthAt(N_ACTUAL + h)
    const heads = {}
    for (const hd of HEADS) heads[hd.key] = perHead[hd.key][h].value
    const total = Object.values(heads).reduce((s, v) => s + v, 0)
    // The band on the total is the root-sum-square of the per-head bands (heads treated independent).
    const spread = Math.sqrt(HEADS.reduce((s, hd) => s + (perHead[hd.key][h].hi - perHead[hd.key][h].value) ** 2, 0))
    return {
      i: N_ACTUAL + h, ...mo, forecast: true,
      dockets: Math.round(dockets[h].value), kg: Math.round(dockets[h].value) * AVG_KG_PER_DOCKET,
      heads, total, lo: total - spread, hi: total + spread,
      revenue: Math.round(revenue[h].value),
    }
  })
}
export const FORECAST = buildForecast()

export const BUDGET_FORECAST = FORECAST.map((r) => budgetRow(r.i))

// ───────────────────────── What-if scenarios ─────────────────────────
// Each lever is a % change applied to the forecast, with a sensitivity per
// head (how much of that head moves when the lever moves 1%). Sensitivities
// are planning assumptions, not measured elasticities — shown to the user as such.
export const LEVERS = [
  { key: 'volume', label: 'Shipment volume', unit: '%', min: -20, max: 40, step: 1, hint: 'Variable heads scale with dockets; fixed heads do not.' },
  { key: 'diesel', label: 'Diesel price', unit: '%', min: -15, max: 30, step: 1, hint: '~38% of line haul and ~30% of first / last mile cost is fuel.' },
  { key: 'vendor', label: 'Vendor / rider rate card', unit: '%', min: -15, max: 20, step: 1, hint: 'Rate revision on outsourced trucks and riders (~60% of those heads).' },
  { key: 'productivity', label: 'Hub productivity gain', unit: '%', min: 0, max: 25, step: 1, hint: 'Automation / better sorting — reduces handling cost per docket.' },
  { key: 'oda', label: 'ODA share of last mile', unit: 'pts', min: -5, max: 15, step: 1, hint: 'Every +1 pt of out-of-delivery-area shipments lifts last mile ~1.1%.' },
  { key: 'rent', label: 'Facility cost', unit: '%', min: -10, max: 25, step: 1, hint: 'New hubs / rent renewals — facility & utilities.' },
]
export const NO_LEVERS = Object.fromEntries(LEVERS.map((l) => [l.key, 0]))

export const PRESETS = [
  { key: 'base', label: 'Baseline', levers: NO_LEVERS },
  { key: 'diesel', label: 'Diesel +12%', levers: { ...NO_LEVERS, diesel: 12 } },
  { key: 'festive', label: 'Festive surge +25%', levers: { ...NO_LEVERS, volume: 25, oda: 2 } },
  { key: 'renegotiate', label: 'Vendor renegotiation −6%', levers: { ...NO_LEVERS, vendor: -6 } },
  { key: 'automation', label: 'Hub automation', levers: { ...NO_LEVERS, productivity: 12, rent: 4 } },
  { key: 'stress', label: 'Stress case', levers: { ...NO_LEVERS, diesel: 18, vendor: 8, volume: -10, rent: 6 } },
]

export function applyScenario(row, lv) {
  const v = lv.volume / 100
  const fuel = lv.diesel / 100
  const vendor = lv.vendor / 100
  const heads = {}
  for (const h of HEADS) {
    let f = 1
    if (h.type === 'variable') f *= 1 + v
    if (h.key === 'lineHaul') f *= (1 + 0.38 * fuel) * (1 + 0.6 * vendor)
    if (h.key === 'firstMile' || h.key === 'lastMile') f *= (1 + 0.3 * fuel) * (1 + 0.6 * vendor)
    if (h.key === 'hubHandling') f *= 1 - lv.productivity / 100
    if (h.key === 'lastMile') f *= 1 + 0.011 * lv.oda
    if (h.key === 'facility') f *= 1 + lv.rent / 100
    heads[h.key] = row.heads[h.key] * f
  }
  const dockets = Math.round(row.dockets * (1 + v))
  const total = Object.values(heads).reduce((s, x) => s + x, 0)
  return { ...row, heads, total, dockets, kg: dockets * AVG_KG_PER_DOCKET, revenue: row.revenue * (1 + v) }
}

// ───────────────────────── Drill-down dimensions ─────────────────────────
// Costs are allocated from the network total to each node by its volume share
// × a per-head cost multiplier (long lanes load line haul, cold-chain loads
// last mile…), re-normalised so the nodes always add up to the network total.

export const HUBS = [
  { id: 'okhla', name: 'Okhla Hub', region: 'North', share: 0.2, g: 0.2, mult: { lineHaul: 1.05, lastMile: 1.0, hubHandling: 1.1 } },
  { id: 'bhiwandi', name: 'Bhiwandi Hub', region: 'West', share: 0.22, g: 0.1, mult: { lineHaul: 0.95, hubHandling: 1.15 } },
  { id: 'vatva', name: 'Vatva Hub', region: 'West', share: 0.08, g: 0.4, mult: { lineHaul: 0.9, lastMile: 0.95 } },
  { id: 'peenya', name: 'Peenya Hub', region: 'South', share: 0.16, g: 0.15, mult: { lineHaul: 1.0, lastMile: 1.12 } },
  { id: 'ambattur', name: 'Ambattur Hub', region: 'South', share: 0.12, g: -0.05, mult: { lineHaul: 1.02, hubHandling: 0.95 } },
  { id: 'balanagar', name: 'Balanagar Hub', region: 'South', share: 0.1, g: 0.6, mult: { lineHaul: 1.1, lastMile: 1.2, firstMile: 1.1 } },
  { id: 'dankuni', name: 'Dankuni Hub', region: 'East', share: 0.12, g: 0.25, mult: { lineHaul: 1.28, lastMile: 1.25, firstMile: 1.15, hubHandling: 1.05 } },
]

export const LANES = [
  { id: 'okh-bhw', name: 'Okhla → Bhiwandi', hub: 'okhla', km: 1400, share: 0.1, g: 0.0, mult: { lineHaul: 1.0 } },
  { id: 'okh-pny', name: 'Okhla → Peenya', hub: 'okhla', km: 2150, share: 0.06, g: 0.2, mult: { lineHaul: 1.5, claims: 1.2 } },
  { id: 'okh-dnk', name: 'Okhla → Dankuni', hub: 'okhla', km: 1500, share: 0.04, g: 0.4, mult: { lineHaul: 1.15, lastMile: 1.3 } },
  { id: 'bhw-pny', name: 'Bhiwandi → Peenya', hub: 'bhiwandi', km: 980, share: 0.12, g: 0.1, mult: { lineHaul: 0.78 } },
  { id: 'bhw-okh', name: 'Bhiwandi → Okhla', hub: 'bhiwandi', km: 1400, share: 0.07, g: 0.0, mult: { lineHaul: 1.0 } },
  { id: 'bhw-vtv', name: 'Bhiwandi → Vatva', hub: 'bhiwandi', km: 530, share: 0.03, g: 0.0, mult: { lineHaul: 0.45 } },
  { id: 'vtv-bhw', name: 'Vatva → Bhiwandi', hub: 'vatva', km: 530, share: 0.05, g: 0.4, mult: { lineHaul: 0.45 } },
  { id: 'vtv-okh', name: 'Vatva → Okhla', hub: 'vatva', km: 950, share: 0.03, g: 0.3, mult: { lineHaul: 0.85 } },
  { id: 'pny-amb', name: 'Peenya → Ambattur', hub: 'peenya', km: 350, share: 0.09, g: 0.1, mult: { lineHaul: 0.3 } },
  { id: 'pny-bln', name: 'Peenya → Balanagar', hub: 'peenya', km: 570, share: 0.07, g: 0.7, mult: { lineHaul: 0.55, lastMile: 1.1 } },
  { id: 'amb-pny', name: 'Ambattur → Peenya', hub: 'ambattur', km: 350, share: 0.07, g: -0.1, mult: { lineHaul: 0.3 } },
  { id: 'amb-bln', name: 'Ambattur → Balanagar', hub: 'ambattur', km: 630, share: 0.05, g: 0.0, mult: { lineHaul: 0.6 } },
  { id: 'bln-pny', name: 'Balanagar → Peenya', hub: 'balanagar', km: 570, share: 0.1, g: 0.6, mult: { lineHaul: 0.7 } },
  { id: 'dnk-okh', name: 'Dankuni → Okhla', hub: 'dankuni', km: 1500, share: 0.07, g: 0.2, mult: { lineHaul: 1.15, claims: 1.4 } },
  { id: 'dnk-bhw', name: 'Dankuni → Bhiwandi', hub: 'dankuni', km: 2000, share: 0.05, g: 0.3, mult: { lineHaul: 1.6, claims: 1.3 } },
]

export const CLIENTS = [
  { id: 'oriflame', name: 'Oriflame', share: 0.2, g: 0.0, mult: { claims: 0.8 } },
  { id: 'nykaa', name: 'Nykaa', share: 0.19, g: 0.3, mult: { lastMile: 1.05, claims: 1.1 } },
  { id: 'lenskart', name: 'Lenskart', share: 0.15, g: 0.1, mult: { claims: 1.5, hubHandling: 1.1 } },
  { id: 'mamaearth', name: 'Mamaearth', share: 0.14, g: 0.2, mult: { lastMile: 0.95 } },
  { id: 'purplle', name: 'Purplle', share: 0.11, g: 0.15, mult: { lastMile: 1.15, firstMile: 1.1 } },
  { id: 'licious', name: 'Licious', share: 0.09, g: -0.1, mult: { lineHaul: 1.35, lastMile: 1.4, claims: 2.2 } },
  { id: 'countrydelight', name: 'Country Delight', share: 0.07, g: 0.25, mult: { lineHaul: 1.2, lastMile: 1.3, claims: 1.8 } },
  { id: 'wow', name: 'Wow Skin Science', share: 0.05, g: 0.0, mult: { lastMile: 0.9 } },
]

// Cost of one node (hub/lane/client) in one month, per head.
function allocate(nodes, node, row) {
  const t = (row.i - (N_ACTUAL - 1) / 2) / N_ACTUAL
  const weight = (n, head) => {
    const share = Math.max(0.001, n.share * (1 + n.g * t))
    const k = HEAD_BY_KEY[head].type === 'variable' ? n.mult?.[head] ?? 1 : 1
    return share * k
  }
  const heads = {}
  let dockets = 0
  const dShare = (n) => Math.max(0.001, n.share * (1 + n.g * t))
  const dTotal = nodes.reduce((s, n) => s + dShare(n), 0)
  for (const h of HEADS) {
    const sum = nodes.reduce((s, n) => s + weight(n, h.key), 0)
    heads[h.key] = row.heads[h.key] * (weight(node, h.key) / sum)
  }
  dockets = row.dockets * (dShare(node) / dTotal)
  const total = Object.values(heads).reduce((s, v) => s + v, 0)
  return { heads, total, dockets, kg: dockets * AVG_KG_PER_DOCKET }
}

export function nodeSeries(nodes, node, rows = HISTORY) {
  return rows.map((r) => ({ ...r, ...allocate(nodes, node, r) }))
}

// A list of nodes with comparable metrics for the month at `monthIdx`.
export function rankNodes(nodes, monthIdx) {
  const rows = nodes.map((n) => ({ node: n, series: nodeSeries(nodes, n) }))
  const netRow = HISTORY[monthIdx]
  const netPerKg = netRow.total / netRow.kg
  return rows
    .map(({ node, series }) => {
      const cur = series[monthIdx]
      const prev = series[Math.max(0, monthIdx - 1)]
      const perKg = cur.total / cur.kg
      return {
        node, cost: cur.total, share: cur.total / netRow.total, dockets: cur.dockets, perKg, perDocket: cur.total / cur.dockets,
        vsNetwork: perKg / netPerKg - 1, mom: monthIdx > 0 ? cur.total / prev.total - 1 : 0,
        spark: series.map((s) => s.total), heads: cur.heads,
      }
    })
    .sort((a, b) => b.cost - a.cost)
}

// ───────────────────────── Insights ─────────────────────────
export function buildInsights(monthIdx) {
  const out = []
  const cur = HISTORY[monthIdx]
  const bud = BUDGET[monthIdx]

  // Biggest overspend vs budget
  const over = HEADS.map((h) => ({ h, d: cur.heads[h.key] - bud.heads[h.key], p: cur.heads[h.key] / bud.heads[h.key] - 1 }))
    .filter((x) => x.p > 0.04).sort((a, b) => b.d - a.d)
  if (over[0]) out.push({ tone: 'bad', title: `${over[0].h.short} is ${(over[0].p * 100).toFixed(0)}% over budget`, body: `${fmtInr(over[0].d)} above plan in ${cur.long}. ${over[0].h.key === 'lastMile' ? 'Rider rate revision and a higher ODA mix are the likely drivers.' : over[0].h.key === 'lineHaul' ? 'Diesel and a vendor rate revision since Aug.' : 'Review rate cards and utilisation.'}` })

  // Costliest hub vs network
  const hubs = rollup(rankNodes(LANES, monthIdx), (r) => r.node.hub, (k) => HUB_BY_ID[k], monthIdx).sort((a, b) => b.vsNetwork - a.vsNetwork)
  if (hubs[0].vsNetwork > 0.08) out.push({ tone: 'warn', title: `${hubs[0].node.name} costs ${(hubs[0].vsNetwork * 100).toFixed(0)}% more per kg than the network`, body: `₹${hubs[0].perKg.toFixed(2)}/kg vs ₹${(cur.total / cur.kg).toFixed(2)}/kg network average — long lanes and thin density.` })

  // Costliest lane
  const lanes = rankNodes(LANES, monthIdx).sort((a, b) => b.vsNetwork - a.vsNetwork)
  if (lanes[0].vsNetwork > 0.15) out.push({ tone: 'warn', title: `${lanes[0].node.name} runs ${(lanes[0].vsNetwork * 100).toFixed(0)}% above average cost/kg`, body: `${(lanes[0].share * 100).toFixed(1)}% of network cost on ${lanes[0].node.km.toLocaleString('en-IN')} km. Consider consolidation or a return-load deal.` })

  // Client cost-to-serve
  const clients = rankNodes(CLIENTS, monthIdx).sort((a, b) => b.vsNetwork - a.vsNetwork)
  if (clients[0].vsNetwork > 0.1) out.push({ tone: 'warn', title: `${clients[0].node.name} has the highest cost-to-serve (+${(clients[0].vsNetwork * 100).toFixed(0)}%)`, body: 'Check its rate card against cold-chain / claims exposure before the next renewal.' })

  // Forecast risk vs budget
  const fut = FORECAST.map((f, k) => ({ f, b: BUDGET_FORECAST[k] })).find((x) => x.f.total > x.b.total * 1.08)
  if (fut) out.push({ tone: 'info', title: `Forecast: ${fut.f.long} lands ${((fut.f.total / fut.b.total - 1) * 100).toFixed(0)}% above budget`, body: `Projected ${fmtInr(fut.f.total)} vs plan ${fmtInr(fut.b.total)} (80% range ${fmtInr(fut.f.lo)}–${fmtInr(fut.f.hi)}).` })

  // Positive: scale effect
  const first = HISTORY[0]
  const perDocketNow = cur.total / cur.dockets
  const perDocketThen = first.total / first.dockets
  if (perDocketNow < perDocketThen) out.push({ tone: 'good', title: `Cost per docket down ${((1 - perDocketNow / perDocketThen) * 100).toFixed(1)}% since ${first.long}`, body: 'Fixed costs are spreading across a larger volume base.' })
  return out
}

// ───────────────────────── Formatting ─────────────────────────
export function fmtInr(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return '—'
  const a = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(digits)} Cr`
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(digits)} L`
  return `${sign}₹${Math.round(a).toLocaleString('en-IN')}`
}
export const fmtPct = (x, digits = 1) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(digits)}%`

// Roll ranked leaf rows (lanes) up to a parent level (hub, region) so every
// level of the geography drill-down adds up exactly to the one above it.
export function rollup(rows, keyFn, metaFn, monthIdx) {
  const net = HISTORY[monthIdx]
  const netPerKg = net.total / net.kg
  const groups = new Map()
  for (const r of rows) {
    const k = keyFn(r)
    if (!groups.has(k)) groups.set(k, { node: metaFn(k), cost: 0, dockets: 0, heads: {}, spark: Array(N_ACTUAL).fill(0), children: [] })
    const g = groups.get(k)
    g.cost += r.cost
    g.dockets += r.dockets
    for (const h of HEADS) g.heads[h.key] = (g.heads[h.key] ?? 0) + r.heads[h.key]
    r.spark.forEach((v, i) => { g.spark[i] += v })
    g.children.push(r)
  }
  return [...groups.values()]
    .map((g) => {
      const perKg = g.cost / (g.dockets * AVG_KG_PER_DOCKET)
      const prev = g.spark[Math.max(0, monthIdx - 1)]
      return { ...g, share: g.cost / net.total, perKg, perDocket: g.cost / g.dockets, vsNetwork: perKg / netPerKg - 1, mom: monthIdx > 0 ? g.cost / prev - 1 : 0 }
    })
    .sort((a, b) => b.cost - a.cost)
}

export const HUB_BY_ID = Object.fromEntries(HUBS.map((h) => [h.id, h]))
