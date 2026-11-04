// Source of truth for Region → State → City → Pincode and the Zone → Hub →
// Mini Hub that serves each pincode. Built from Yugal's production files
// "Production Data for Geography.xlsx" (Geography sheet, updated 2026-10-13)
// and "Production Data for Location Serviciabiity.xlsx" (Mini Hub
// Serviceability + MiniHub Summary). Regions come from the Geography sheet;
// 190 pincodes are placed one region over in the Serviceability sheet (see
// meta.regionConflictPincodes) — Geography wins for region, Serviceability
// wins for Hub / Mini Hub. Locality names (165k) are not bundled, only
// pincodes, to keep the prototype small.
import raw from './geoMaster.json'

export const GEO_META = raw.meta
export const REGIONS = raw.regions.map(([name, code]) => ({ name, code }))
export const STATES = raw.states.map(([name, code]) => ({ name, code }))
export const ZONES_MASTER = raw.zones.map(([name, code]) => ({ name, code }))
export const HUBS = raw.hubs.map(([name, code, zone]) => ({ name, code, zone: ZONES_MASTER[zone] }))
export const MINI_HUBS = raw.minihubs.map(([name, code, hub, type, branch, summary]) => ({ name, code, hub: HUBS[hub], type, branch, summary }))

export const CITIES = raw.cities.map(([name, code, state, region, offset, count]) => ({
  name,
  code,
  state: STATES[state].name,
  stateCode: STATES[state].code,
  region: REGIONS[region].name,
  regionIdx: region,
  offset,
  count,
}))

const CITIES_BY_STATE = new Map()
CITIES.forEach((c) => {
  if (!CITIES_BY_STATE.has(c.state)) CITIES_BY_STATE.set(c.state, [])
  CITIES_BY_STATE.get(c.state).push(c)
})
const CITY_BY_KEY = new Map(CITIES.map((c) => [`${c.state}|${c.name}`, c]))

export const STATE_NAMES = STATES.map((s) => s.name)
export function citiesOfState(state) {
  return CITIES_BY_STATE.get(state) ?? []
}
export function cityRow(state, city) {
  return CITY_BY_KEY.get(`${state}|${city}`)
}
export function pincodesOfCity(state, city) {
  const c = cityRow(state, city)
  return c ? raw.pin.slice(c.offset, c.offset + c.count) : []
}
export function pincodeCount(cityList) {
  return cityList.reduce((n, { state, city }) => n + (cityRow(state, city)?.count ?? 0), 0)
}

// Pincode → everything the sheets say about it.
let PIN_INDEX = null
export function lookupGeoPincode(pin) {
  if (!PIN_INDEX) {
    PIN_INDEX = new Map()
    CITIES.forEach((c) => {
      for (let i = c.offset; i < c.offset + c.count; i += 1) PIN_INDEX.set(raw.pin[i], { city: c, mh: raw.mh[i] })
    })
  }
  const hit = PIN_INDEX.get(Number(pin))
  if (!hit) return null
  const miniHub = MINI_HUBS[hit.mh]
  return { pincode: Number(pin), city: hit.city.name, state: hit.city.state, region: hit.city.region, miniHub, hub: miniHub.hub, zone: miniHub.hub.zone }
}

// The 13 standard regions as a client-editable starting point. Same shape as
// a hand-built client region ({ id, name, cities:[{state,city}] }) so the
// existing builder/templates keep working; `code` is the sheet's region code.
export function buildStandardRegionsFromSheet(freshId) {
  return REGIONS.map((r, i) => ({
    id: freshId(),
    name: r.name,
    code: r.code,
    cities: CITIES.filter((c) => c.regionIdx === i).map((c) => ({ state: c.state, city: c.name })),
  }))
}

// Collapses a region's flat city list into the per-state cards the Region
// Mapping editor shows: "Entire state" when the region holds every city of
// that state in the sheet, otherwise "Only <cities>".
export function groupRegionByState(cities) {
  const byState = new Map()
  cities.forEach(({ state, city }) => {
    if (!byState.has(state)) byState.set(state, [])
    byState.get(state).push(city)
  })
  return [...byState.entries()]
    .map(([state, list]) => ({
      state,
      entire: list.length >= citiesOfState(state).length,
      cities: list.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.state.localeCompare(b.state))
}

// One-line summary under the region name: "All of Delhi, Faridabad, …".
export function regionSummary(cities) {
  return groupRegionByState(cities)
    .flatMap((g) => (g.entire ? [`All of ${g.state}`] : g.cities))
    .join(', ')
}
