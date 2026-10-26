import { useMemo, useSyncExternalStore } from 'react'
import { buildPlan, seedDockets, defaultSettings, makeDockets, MINI_HUBS, NOW } from './engine.js'

// Dispatch store (New) — in memory, shared by every Dispatch page. Reloading the page resets it.
const fresh = () => ({ dockets: seedDockets(), routeChoice: {}, routesConfirmed: false, assign: {}, locked: {}, thc: {}, settings: defaultSettings(), recv: 0 })
let S = fresh()
let plan = null
const subs = new Set()
const emit = () => { plan = null; S = { ...S }; subs.forEach((f) => f()) }
const getPlan = () => (plan ||= buildPlan(S))
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
const snap = () => S

export function useDispatch() {
  const s = useSyncExternalStore(subscribe, snap)
  const p = useMemo(() => getPlan(), [s])
  return { s, p, a: actions }
}

const set = (patch) => { Object.assign(S, patch); emit() }
const actions = {
  reset() { S = fresh(); emit() },
  receive(minHub, n = 5) {
    S.recv += 1
    S.dockets = [...S.dockets, ...makeDockets(minHub, n, 900 + S.recv * 7, NOW)]
    emit()
  },
  setRoute(key, mode) { set({ routeChoice: { ...S.routeChoice, [key]: mode } }) },
  // confirming the routes auto-assigns a vehicle to every trip, like the PRS
  confirmRoutes() { S.routesConfirmed = true; S.assign = { ...autoMap() }; emit() },
  autoAssign() { S.assign = { ...autoMap() }; emit() },
  setVehicle(key, id) { const a = { ...S.assign }; if (id) a[key] = id; else delete a[key]; set({ assign: a, locked: { ...S.locked, [key]: false } }) },
  lock(key) { set({ locked: { ...S.locked, [key]: true } }) },
  lockAll() { const l = { ...S.locked }; getPlan().trips.forEach((t) => { if (!t.blockers.length && t.util * 100 >= S.settings.minUtil) l[t.key] = true }); set({ locked: l }) },
  unlock(key) { const th = { ...S.thc }; delete th[key]; set({ locked: { ...S.locked, [key]: false }, thc: th }) },
  issue(key) {
    const t = getPlan().trips.find((x) => x.key === key); if (!t || !t.locked) return
    set({ thc: { ...S.thc, [key]: { no: 'THC-2610-' + String(10000 + Object.keys(S.thc).length + 1), issuedAt: Date.now(), dispatchedAt: null } } })
  },
  issueAll() { const th = { ...S.thc }; let n = Object.keys(th).length; getPlan().trips.forEach((t) => { if (t.locked && !th[t.key]) th[t.key] = { no: 'THC-2610-' + String(10000 + ++n), issuedAt: Date.now(), dispatchedAt: null } }); set({ thc: th }) },
  dispatch(key) { const c = S.thc[key]; if (c) set({ thc: { ...S.thc, [key]: { ...c, dispatchedAt: Date.now() } } }) },
  setting(k, v) { set({ settings: { ...S.settings, [k]: v } }) },
}
function autoMap() {
  const m = { ...S.assign }
  getPlan().trips.forEach((t) => { if (!m[t.key] && t.suggest) m[t.key] = t.suggest.id })
  return m
}
export { MINI_HUBS }
