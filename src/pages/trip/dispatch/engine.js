import { T } from '../ops/core.js'

// Dispatch engine (New) — from "docket reached the source mini hub" to THC.
//   1. route    : shortest path over the lane network + feeder spurs (mini hub → its hub)
//   2. trips    : dockets that board the same lane at the same hub share a vehicle trip (a "run")
//   3. vehicle  : best-fit from the pool at the boarding hub, else a spot hire
//   4. manifest : one manifest per (boarding hub → unloading hub) on a trip
//   5. THC      : the vehicle-level document that collects the trip's manifests and the hire terms
// Pure functions over a state object. No UI here.

const H = 3600000
const DAY = 24 * H
export const NOW = T.NOW

// ───────────────────────── network graph ─────────────────────────
let GRAPH = null
function graph() {
  if (GRAPH) return GRAPH
  const fac = T.activeFac
  const codes = new Set(fac.map((f) => f.code))
  const edges = []
  const seen = new Set()
  const add = (a, b, lane, name, kind) => {
    if (!codes.has(a) || !codes.has(b) || a === b || seen.has(a + '>' + b)) return
    seen.add(a + '>' + b)
    edges.push({ a, b, lane, name, kind, km: T.legKm(a, b) })
  }
  // forward edges of every lane first, then the return edges of round-trip lanes
  T.NET.lanes.forEach((L) => { const p = L.path.filter(Boolean); for (let i = 0; i < p.length - 1; i++) add(p[i], p[i + 1], L.sno, `Lane ${L.sno}`, 'Trunk') })
  T.NET.lanes.forEach((L) => { if (L.dir !== 'Round trip') return; const p = L.path.filter(Boolean); for (let i = 0; i < p.length - 1; i++) add(p[i + 1], p[i], L.sno, `Lane ${L.sno}`, 'Trunk') })
  // One-way lanes in the lane master (Kolkata, Zirakpur, Bengaluru, Guwahati, Rudrapur) would be dead ends. The empty return run is allowed as a leg.
  T.NET.lanes.forEach((L) => { if (L.dir === 'Round trip') return; const p = L.path.filter(Boolean); for (let i = 0; i < p.length - 1; i++) add(p[i + 1], p[i], L.sno + 'R', `Lane ${L.sno} (return)`, 'Trunk') })
  const onLane = new Set(edges.flatMap((e) => [e.a, e.b]))
  const nearest = (code, pool) => pool.filter((c) => c !== code).sort((x, y) => T.legKm(code, x) - T.legKm(code, y))[0]
  const spur = (code, to) => { add(code, to, 'F', 'Feeder', 'Feeder'); add(to, code, 'F', 'Feeder', 'Feeder') }
  // hubs that sit off every lane attach to the nearest lane facility, then mini hubs attach to their nearest hub
  fac.filter((f) => f.tier === 'Hub' && !onLane.has(f.code)).forEach((f) => { const n = nearest(f.code, [...onLane]); if (n) { spur(f.code, n); onLane.add(f.code) } })
  fac.filter((f) => f.tier !== 'Hub' && !onLane.has(f.code)).forEach((f) => {
    const n = nearest(f.code, fac.filter((x) => x.tier === 'Hub' && onLane.has(x.code)).map((x) => x.code)); if (n) spur(f.code, n)
  })
  const adj = {}
  edges.forEach((e) => { (adj[e.a] ||= []).push(e) })
  GRAPH = { edges, adj }
  return GRAPH
}

// Dijkstra over (facility, lane). A change of lane costs `penalty` km-equivalents.
const ROUTES = {}
export const ROUTE_MODES = { fast: { label: 'Shortest', penalty: 30 }, few: { label: 'Fewest transfers', penalty: 600 } }
export function findRoute(from, to, mode) {
  const ck = from + '>' + to + '>' + mode
  if (ROUTES[ck] !== undefined) return ROUTES[ck]
  const { adj } = graph()
  const pen = ROUTE_MODES[mode].penalty
  const dist = new Map([[from + '|', 0]]), prev = new Map(), done = new Set()
  const open = [[0, from, '']]
  let end = null
  while (open.length) {
    open.sort((x, y) => x[0] - y[0])
    const [d, n, l] = open.shift()
    const k = n + '|' + l
    if (done.has(k)) continue
    done.add(k)
    if (n === to) { end = k; break }
    ;(adj[n] || []).forEach((e) => {
      const nk = e.b + '|' + e.lane
      const nd = d + e.km + (l && l !== e.lane ? pen : 0)
      if (nd < (dist.get(nk) ?? Infinity)) { dist.set(nk, nd); prev.set(nk, [k, e]); open.push([nd, e.b, e.lane]) }
    })
  }
  if (!end) return (ROUTES[ck] = null)
  const es = []
  for (let k = end; prev.has(k);) { const [pk, e] = prev.get(k); es.unshift(e); k = pk }
  // consecutive edges on the same trunk lane stay on one vehicle
  const segs = []
  es.forEach((e) => {
    const last = segs[segs.length - 1]
    if (last && last.lane === e.lane && e.kind === 'Trunk') { last.path.push(e.b); last.km += e.km } else segs.push({ lane: e.lane, name: e.name, kind: e.kind, path: [e.a, e.b], km: e.km })
  })
  const km = segs.reduce((t, s) => t + s.km, 0)
  return (ROUTES[ck] = { segs, km, transfers: segs.length - 1, hours: km / T.SPEED_KMPH + (segs.length - 1) * T.DWELL_H })
}
const sameRoute = (a, b) => !!a && !!b && a.segs.length === b.segs.length && a.segs.every((s, i) => s.lane === b.segs[i].lane && s.path.join() === b.segs[i].path.join())

// ───────────────────────── vehicle pool ─────────────────────────
const doc = (o) => { const r = {}; Object.keys(o).forEach((k) => { r[k] = NOW + o[k] * DAY }); return r }
const OK = { rc: 700, insurance: 200, puc: 120, permit: 300, fitness: 400 }
const X = (id, regNo, type, own, vendor, loc, driver, docs = {}) => ({ id, regNo, type, own, vendor, loc, status: 'Available', docs: doc({ ...OK, ...docs }), driverObj: { name: driver[0], mobile: driver[1], licence: driver[2] } })
const ICV = 'ICV · up to 3.5T', MCV = 'MCV · up to 7.5T', HCV = 'HCV · up to 16T'
const EXTRA = [
  X('F01', 'UK07 AB 1180', ICV, 'Vendor', 'Himalaya Carriers', 'RKEB1', ['Mohan Rawat', '9810011101', 'UK-2210456']),
  X('F02', 'UK07 CD 3302', ICV, 'Vendor', 'Himalaya Carriers', 'DDNB1', ['Sanjay Negi', '9810011102', 'UK-1987451']),
  X('F03', 'UK04 EF 7761', ICV, 'Owned', '', 'RDPB1', ['Harpal Singh', '9810011103', 'UK-2018845']),
  X('F04', 'UP80 GH 2214', ICV, 'Vendor', 'Taj Transport', 'AGRB1', ['Rakesh Kumar', '9810011104', 'UP-1760021'], { permit: -2 }),
  X('F05', 'UP78 JK 5530', ICV, 'Vendor', 'Ganga Logistics', 'KNPB1', ['Dinesh Tiwari', '9810011105', 'UP-1899321'], { insurance: 6 }),
  X('F06', 'UP65 LM 9981', MCV, 'Vendor', 'Ganga Logistics', 'VNSB1', ['Arvind Pandey', '9810011106', 'UP-2120987']),
  X('F07', 'OD02 NP 4410', ICV, 'Vendor', 'Kalinga Carriers', 'BBIB1', ['Bikash Nayak', '9810011107', 'OD-1650778']),
  X('F08', 'UK08 QR 6620', ICV, 'Owned', '', 'HWRT1', ['Yogesh Joshi', '9810011108', 'UK-2231090']),
  X('F09', 'HR55 ST 3318', MCV, 'Owned', '', 'GGNT1', ['Vikram Dahiya', '9810011109', 'HR-2012345']),
  X('F10', 'DL1L 8845', ICV, 'Vendor', 'Bharat Carriers', 'GGNT1', ['Pappu Lal', '9810011110', 'DL-1745098']),
  X('F11', 'UP32 UV 1102', HCV, 'Vendor', 'Speedway Logistics', 'LKOT1', ['Imtiyaz Ali', '9810011111', 'UP-2008871']),
  X('F12', 'WB74 WX 7740', HCV, 'Owned', '', 'KOLT1', ['Subrata Das', '9810011112', 'WB-1990012']),
  X('F13', 'MH31 YZ 2205', HCV, 'Vendor', 'Vidarbha Roadways', 'NGPT1', ['Gajanan Wagh', '9810011113', 'MH-2054431']),
  X('F14', 'PB11 AA 6630', MCV, 'Vendor', 'Punjab Freight', 'ZRKT1', ['Gurmeet Singh', '9810011114', 'PB-2100445']),
  X('F15', 'MH12 BB 4401', HCV, 'Vendor', 'Sahyadri Carriers', 'PNQT1', ['Santosh Pawar', '9810011115', 'MH-1987632']),
  X('F16', 'TN09 CC 8812', HCV, 'Owned', '', 'CHNT1', ['Murugan K', '9810011116', 'TN-2033301']),
]
export const POOL = [...T.vehicles.map((v) => ({ ...v, driverObj: (T.driverById(v.driver) ? { name: T.driverById(v.driver).name, mobile: T.driverById(v.driver).mobile, licence: T.driverById(v.driver).licence } : null) })), ...EXTRA]
export const vtypeOf = (type) => T.vtype(type)
export const capOf = (type) => { const v = T.vtype(type); return { kg: v.capKg, cft: v.capCft } }
const RANK = { Owned: 0, Vendor: 1, Market: 2 }
const smallestFit = (kg, cft) => T.VTYPES.filter((v) => v.capKg * 0.98 >= kg && v.capCft >= cft)[0] || null
export const marketVehicle = (type, loc, key) => ({ id: 'MKT:' + type + ':' + key, regNo: 'To be hired', type, own: 'Market', vendor: 'Spot market (' + T.facShort(loc) + ')', loc, docs: null, driverObj: null })
export function vehicleById(id, trip) {
  if (!id) return null
  if (String(id).startsWith('MKT:')) { const [, type] = id.split(':'); return marketVehicle(type, trip ? trip.entry : '', trip ? trip.key : id) }
  return POOL.find((v) => v.id === id) || null
}
export function compliance(v) {
  if (!v || !v.docs) return { state: 'ok', items: [] }
  const r = T.vehicleCompliance(v)
  return r
}

// ───────────────────────── seed: dockets that reached a source mini hub ─────────────────────────
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const CLIENTS = ['Nova Retail', 'Bluewave Electronics', 'Orion Pharma', 'Brainbees Solutions', 'Shopl Retail', 'ABFRL']
export const MINI_HUBS = T.activeFac.filter((f) => f.tier !== 'Hub')
const DESTS = ['BOMT1', 'AMDT1', 'BLRT1', 'HYDT1', 'KOLT1', 'LKOT1', 'CHNT1', 'PNQT1', 'GWHT1', 'NGPT1', 'VAPT1', 'JAIT1', 'ZRKT1', 'IDRT1', 'BOMT1', 'BLRT1']
let SERIAL = 520001
export function makeDockets(origin, n, seed, arrivedAt) {
  const R = rng(seed + T.hash(origin))
  const out = []
  for (let i = 0; i < n; i++) {
    const dests = DESTS.filter((d) => d !== origin)
    const dest = dests[Math.floor(R() * dests.length)]
    const packs = 2 + Math.floor(R() * 13), per = 8 + Math.floor(R() * 20), act = packs * per
    const cft = Math.round(packs * (1.8 + R() * 1.6) * 10) / 10
    const body = '100' + String(SERIAL++).padStart(6, '0')
    const roll = R()
    const noEwb = roll < 0.1
    const invoice = noEwb ? 26000 + Math.round(R() * 20000) : Math.round(act * (120 + R() * 600) / 1000) * 1000
    out.push({
      no: body + T.checkDigit(body), client: CLIENTS[Math.floor(R() * CLIENTS.length)], loc: origin, dest, packs, actWt: act, cft, volWt: Math.round(cft * 6 * 10) / 10,
      invoice, ewbNo: noEwb ? null : '3' + String(T.hash(body) % 100000000000).padStart(11, '0'), ewbValidTill: noEwb ? null : NOW + (roll < 0.17 ? 8 + Math.round(R() * 6) : 40 + Math.round(R() * 80)) * H,
      prio: R() < 0.12 ? 'Priority' : 'Normal', arrivedAt: arrivedAt - Math.floor(R() * 5 * H),
    })
  }
  return out
}
export function seedDockets() {
  const base = NOW - 1 * H
  return MINI_HUBS.flatMap((m, i) => makeDockets(m.code, 5 + ((i * 3) % 5), 11 + i, base))
}

export const defaultSettings = () => ({ minUtil: 60, cutoffHour: 20 })
const nextCutoff = (hour) => { const d = new Date(NOW); d.setHours(hour, 0, 0, 0); if (d.getTime() <= NOW + H) d.setDate(d.getDate() + 1); return d.getTime() }

// ───────────────────────── the plan ─────────────────────────
const dkey = (d) => d.loc + '>' + d.dest

export function buildPlan(S) {
  const cutoff = nextCutoff(S.settings.cutoffHour)
  // 1 · routes, per origin→destination
  const lanes = {}
  S.dockets.forEach((d) => {
    const k = dkey(d)
    if (!lanes[k]) {
      const opts = { fast: findRoute(d.loc, d.dest, 'fast'), few: findRoute(d.loc, d.dest, 'few') }
      const chosen = S.routeChoice[k] && opts[S.routeChoice[k]] ? S.routeChoice[k] : 'fast'
      lanes[k] = { key: k, from: d.loc, to: d.dest, opts, same: sameRoute(opts.fast, opts.few), mode: chosen, route: opts[chosen], items: [] }
    }
    lanes[k].items.push(d)
  })
  const routeOf = (d) => lanes[dkey(d)].route
  // 2 · runs: dockets boarding the same lane at the same hub, towards the same next hop
  const groups = {}
  S.dockets.forEach((d) => {
    const r = routeOf(d); if (!r) return
    r.segs.forEach((seg, i) => {
      const gk = `${seg.lane}:${seg.path[0]}>${seg.path[1]}`
      const g = (groups[gk] ||= { key: gk, lane: seg.lane, name: seg.name, kind: seg.kind, entry: seg.path[0], path: seg.path, items: [] })
      if (seg.path.length > g.path.length) g.path = seg.path
      g.items.push({ d, i, seg })
    })
  })
  const gOf = (d, i) => { const s = routeOf(d).segs[i]; return groups[`${s.lane}:${s.path[0]}>${s.path[1]}`] }
  const memo = {}
  const sched = (g) => T.schedule(g.path, departOf(g))
  function departOf(g) {
    if (memo[g.key] != null) return memo[g.key]
    memo[g.key] = 0
    let t = 0
    g.items.forEach(({ d, i }) => {
      let ready
      if (i === 0) ready = Math.max(d.arrivedAt + T.ORIGIN_DWELL_H * H, cutoff)
      else { const pg = gOf(d, i - 1); const st = sched(pg).find((s) => s.code === g.entry); ready = (st && st.arr ? st.arr : departOf(pg)) + T.DWELL_H * H }
      t = Math.max(t, ready)
    })
    return (memo[g.key] = t)
  }
  // 3 · trips: a run, split into as many vehicles as the load needs
  const trips = []
  Object.values(groups).forEach((g) => {
    const depart = departOf(g)
    const kg = g.items.reduce((t, x) => t + x.d.actWt, 0), cft = g.items.reduce((t, x) => t + x.d.cft, 0)
    const fit = smallestFit(kg, cft)
    const vt = fit || T.VTYPES[T.VTYPES.length - 1]
    const bins = []
    ;[...g.items].sort((a, b) => b.d.actWt - a.d.actWt).forEach((x) => {
      let b = bins.find((q) => q.kg + x.d.actWt <= vt.capKg * 0.98 && q.cft + x.d.cft <= vt.capCft)
      if (!b) bins.push((b = { kg: 0, cft: 0, items: [] }))
      b.kg += x.d.actWt; b.cft += x.d.cft; b.items.push(x)
    })
    bins.forEach((b, bi) => {
      const key = g.key + (bins.length > 1 ? '#' + (bi + 1) : '')
      const exitIdx = Math.max(...b.items.map((x) => g.path.indexOf(x.seg.path[x.seg.path.length - 1])))
      const path = g.path.slice(0, exitIdx + 1)
      const schedule = T.schedule(path, depart)
      const mf = {}
      b.items.forEach((x) => { const ex = x.seg.path[x.seg.path.length - 1]; (mf[ex] ||= []).push(x.d) })
      const manifests = Object.entries(mf).map(([exit, ds]) => ({
        key: key + '>' + exit, exit, dockets: ds, kg: ds.reduce((t, d) => t + d.actWt, 0), cft: ds.reduce((t, d) => t + d.cft, 0), packs: ds.reduce((t, d) => t + d.packs, 0),
        ewb: ds.filter((d) => d.ewbNo).length, no: 'MNF-2610-' + String(T.hash(key + exit) % 9000 + 1000),
      })).sort((a, c) => path.indexOf(a.exit) - path.indexOf(c.exit))
      trips.push({
        key, id: 'TRP-' + String(T.hash(key) % 90000 + 10000), group: g, lane: g.lane, name: g.name, kind: g.kind, entry: g.entry, exit: path[path.length - 1], path, schedule, depart, km: T.pathKm(path),
        items: b.items.map((x) => x.d), kg: b.kg, cft: b.cft, packs: b.items.reduce((t, x) => t + x.d.packs, 0), ewb: b.items.filter((x) => x.d.ewbNo).length,
        split: bins.length > 1 ? `${bi + 1} of ${bins.length}` : null, sugType: vt.type, manifests,
      })
    })
  })
  trips.sort((a, b) => a.depart - b.depart || a.key.localeCompare(b.key))
  // 4 · vehicle suggestions (first-come in departure order, a vehicle is used once)
  const owner = {}
  Object.entries(S.assign).forEach(([k, v]) => { if (v && !String(v).startsWith('MKT:')) owner[v] = k })
  const taken = new Set()
  trips.forEach((t) => {
    const needType = (v) => capOf(v.type)
    const cands = POOL.filter((v) => v.loc === t.entry && v.status === 'Available' && !taken.has(v.id) && (!owner[v.id] || owner[v.id] === t.key) && compliance(v).state !== 'block' && needType(v).kg * 0.98 >= t.kg && needType(v).cft >= t.cft)
      .sort((a, b) => (RANK[a.own] - RANK[b.own]) * 100000 + (compliance(a).state === 'warn' ? 5000 : 0) - (compliance(b).state === 'warn' ? 5000 : 0) + (needType(a).kg - needType(b).kg))
    if (cands[0]) {
      const v = cands[0]
      t.suggest = { id: v.id, reason: `${v.own} · ${v.type.split(' ')[0]} at ${T.facShort(t.entry)}, best fit for ${Math.round(t.kg).toLocaleString('en-IN')} kg` }
      taken.add(v.id)
    } else {
      const bt = smallestFit(t.kg, t.cft) || T.VTYPES[T.VTYPES.length - 1]
      const blocked = POOL.filter((v) => v.loc === t.entry && v.status === 'Available' && compliance(v).state === 'block')
      t.suggest = { id: 'MKT:' + bt.type + ':' + t.key, reason: `No fitting vehicle free at ${T.facShort(t.entry)}${blocked.length ? ' (' + blocked.map((v) => v.regNo).join(', ') + ' blocked on documents)' : ''}. Spot hire ${bt.short}` }
    }
  })
  // 5 · per-trip state, checks, manifests, THC
  const minU = S.settings.minUtil / 100
  trips.forEach((t) => {
    t.vehicleId = S.assign[t.key] || null
    t.vehicle = vehicleById(t.vehicleId, t)
    const cap = t.vehicle ? capOf(t.vehicle.type) : capOf(t.sugType)
    t.cap = cap
    t.util = Math.max(t.kg / cap.kg, t.cft / cap.cft)
    t.comp = t.vehicle ? compliance(t.vehicle) : { state: 'ok', items: [] }
    t.driver = t.vehicle && t.vehicle.driverObj
    const price = T.partnerCost({ vehicleType: (t.vehicle || { type: t.sugType }).type, km: t.km, stops: t.path.length, method: 'km', sourcing: t.vehicle ? t.vehicle.own : 'Vendor', chargedKg: t.kg })
    t.price = price
    t.blockers = []; t.warns = []; t.tips = []
    if (!t.vehicle) t.blockers.push('No vehicle assigned')
    if (t.vehicle && t.util > 1.0001) t.blockers.push(`Over capacity: ${Math.round(t.util * 100)}% of ${t.vehicle.type.split(' ')[0]}`)
    if (t.comp.state === 'block') t.blockers.push('Vehicle document expired or expiring within a week: ' + t.comp.items.filter((i) => i.state === 'block').map((i) => i.label).join(', '))
    if (t.comp.state === 'warn') t.warns.push('Document expiring within a month: ' + t.comp.items.filter((i) => i.state === 'warn').map((i) => `${i.label} (${i.days} d)`).join(', '))
    if (t.util < minU) t.warns.push(`Low utilization ${Math.round(t.util * 100)}% (target ${S.settings.minUtil}%)`)
    t.items.forEach((d) => {
      if (!d.ewbNo) return
      const ex = t.manifests.find((m) => m.dockets.includes(d)); const arr = (t.schedule.find((s) => s.code === ex.exit) || {}).arr
      if (arr && d.ewbValidTill < arr) t.warns.push(`E-way bill of ${T.fmtDocket(d.no)} expires before arrival at ${T.facShort(ex.exit)}`)
    })
    // suggestions for the manifest
    const smaller = T.VTYPES.filter((v) => v.capKg < cap.kg && v.capKg * 0.98 >= t.kg && v.capCft >= t.cft)[0]
    if (t.util < minU) {
      if (smaller && (!t.vehicle || smaller.type !== t.vehicle.type)) t.tips.push({ tone: 'amber', t: `Use a smaller vehicle: ${smaller.type} fits and would run at ${Math.round(Math.max(t.kg / smaller.capKg, t.cft / smaller.capCft) * 100)}%` })
      const need = Math.max(0, cap.kg * minU - t.kg)
      t.tips.push({ tone: 'amber', t: `Hold for the next cutoff: another ${Math.round(need).toLocaleString('en-IN')} kg reaches the ${S.settings.minUtil}% target` })
    } else if (t.util >= 0.95 && t.util <= 1.0001) t.tips.push({ tone: 'green', t: 'Vehicle is full: dispatch now' })
    else t.tips.push({ tone: 'green', t: `Good load: ${Math.round(t.util * 100)}%. ${Math.round(cap.kg - t.kg).toLocaleString('en-IN')} kg of space left` })
    if (t.items.some((d) => d.prio === 'Priority')) t.tips.push({ tone: 'blue', t: `${t.items.filter((d) => d.prio === 'Priority').length} priority docket(s): do not hold this trip` })
    const noE = t.items.length - t.ewb
    if (noE) t.tips.push({ tone: 'slate', t: `${noE} docket(s) without an e-way bill (below the value threshold or exempt). They are left out of the CEWB` })
    t.locked = !!S.locked[t.key]
    t.thc = S.thc[t.key] || null
    t.stage = t.thc && t.thc.dispatchedAt ? 'Dispatched' : t.thc ? 'THC issued' : t.locked ? 'Manifests locked' : t.vehicle ? 'Vehicle assigned' : S.routesConfirmed ? 'Route planned' : 'Draft'
    // THC money (sample terms): freight − TDS, 70% advance, balance on POD, toll reimbursed
    const hired = t.vehicle && t.vehicle.own !== 'Owned'
    const freight = hired ? price.thc : 0
    const tds = hired ? Math.round(freight * 0.01) : 0
    const net = freight - tds
    t.money = { hired, freight, tds, net, advance: Math.round(net * 0.7), balance: net - Math.round(net * 0.7), toll: price.tollReimb, notional: price.thc }
    // CEWB (decided logic): auto at manifest lock when at least one docket has an e-way bill; max 30 per CEWB
    t.cewb = t.ewb ? { count: t.ewb, docs: Math.ceil(t.ewb / T.EWB_MAX_PER_CEWB), no: '3' + String(T.hash('cewb' + t.key) % 100000000000).padStart(11, '0') } : null
  })
  const docketStage = {}
  trips.forEach((t) => { if (t.group.items.some((x) => x.i === 0)) t.items.forEach((d) => { const r = routeOf(d); const first = r && r.segs[0]; const gk = first && `${first.lane}:${first.path[0]}>${first.path[1]}`; if (t.group.key === gk) docketStage[d.no] = t.stage }) })
  return { cutoff, lanes: Object.values(lanes), groups: Object.values(groups), trips, docketStage, routeOf }
}

export const fmtKg = (n) => Math.round(n).toLocaleString('en-IN') + ' kg'
