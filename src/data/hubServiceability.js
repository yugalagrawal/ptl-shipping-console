// Hub / Mini Hub Serviceability — which State/UT > City > Pincode >
// Locality a given Hub or Mini Hub (see Location Master / logistics.js)
// actually delivers to. Keyed by that Hub's or Mini Hub's own Code
// (hubCode / miniHubCode) — never by Zone name, since a Zone's Mini Hubs
// can each serve a different area even under the same Hub.
//
// One ROW per State/UT — not a single giant cross-state multi-select
// (too hard to scan once more than a couple of states are picked) and not
// one row per individual rule either. Each row reads left to right, State
// > City > Pincode > Locality, and each of City/Pincode/Locality has its
// own All/Include/Exclude mode: "All" needs no picks at all (every City
// under that State, every Pincode under those Cities, …), "Include"/
// "Exclude" opens a search-checklist scoped to whatever the step to its
// left resolved to. `+ Add State` appends another row; a State already
// used by another row is left out of the picker so the same State is
// never mapped twice.
export const MODES = ['all', 'include', 'exclude']

export function emptyCoverageRow() {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    state: '',
    cityMode: 'all',
    cities: [],
    pincodeMode: 'all',
    pincodes: [],
    localityMode: 'all',
    localities: [],
  }
}

export function emptyServiceability() {
  return { rows: [] }
}

export function hasCoverage(coverage) {
  return !!coverage && coverage.rows.some((r) => r.state)
}

// Resolves a row down to the real PINCODES rows it actually covers, given
// its own City/Pincode/Locality modes — the same resolution used both to
// render a row's one-line summary and to roll every row up into the
// States/Cities/Pincodes stat pills.
export function resolveRow(row, pincodes) {
  const stateRows = pincodes.filter((r) => r.state === row.state)
  const allCities = [...new Set(stateRows.map((r) => r.city))]
  const cities = row.cityMode === 'all' ? allCities : row.cityMode === 'include' ? row.cities : allCities.filter((c) => !row.cities.includes(c))

  const cityRows = stateRows.filter((r) => cities.includes(r.city))
  const allPincodes = [...new Set(cityRows.map((r) => r.pincode))]
  const pincodesResolved = row.pincodeMode === 'all' ? allPincodes : row.pincodeMode === 'include' ? row.pincodes : allPincodes.filter((p) => !row.pincodes.includes(p))

  const pincodeRows = cityRows.filter((r) => pincodesResolved.includes(r.pincode))
  const allLocalities = [...new Set(pincodeRows.map((r) => r.locality))]
  const localities = row.localityMode === 'all' ? allLocalities : row.localityMode === 'include' ? row.localities : allLocalities.filter((l) => !row.localities.includes(l))

  return { cities, pincodes: pincodesResolved, localities }
}

export function coverageStats(coverage, pincodes) {
  const stateSet = new Set()
  const citySet = new Set()
  const pincodeSet = new Set()
  ;(coverage?.rows ?? []).forEach((row) => {
    if (!row.state) return
    stateSet.add(row.state)
    const { cities, pincodes: rowPincodes } = resolveRow(row, pincodes)
    cities.forEach((c) => citySet.add(`${row.state}|${c}`))
    rowPincodes.forEach((p) => pincodeSet.add(p))
  })
  return { states: stateSet.size, cities: citySet.size, pincodes: pincodeSet.size }
}

function modeLabel(mode, count, noun) {
  if (mode === 'all') return `All ${noun}s`
  const plural = count === 1 ? noun : `${noun}s`
  return `${mode === 'include' ? 'Only' : 'Exclude'} ${count} ${plural}`
}

export function summarizeRow(row) {
  const cityPart = modeLabel(row.cityMode, row.cities.length, 'city').replace('citys', 'cities')
  const pincodePart = modeLabel(row.pincodeMode, row.pincodes.length, 'pincode')
  const localityPart = modeLabel(row.localityMode, row.localities.length, 'locality').replace('localitys', 'localities')
  return { cityPart, pincodePart, localityPart }
}

const DEFAULT_CITY_BY_CODE = {
  KOLT1: { state: 'West Bengal', city: 'Kolkata' },
  DBHT1: { state: 'Jharkhand', city: 'Chauparan' },
  GWHT1: { state: 'Assam', city: 'Guwahati' },
  GGNT1: { state: 'Haryana', city: 'Gurugram' },
  NOIT1: { state: 'Uttar Pradesh', city: 'Noida' },
  LKOT1: { state: 'Uttar Pradesh', city: 'Lucknow' },
  HWRT1: { state: 'Uttarakhand', city: 'Haridwar' },
  JAIT1: { state: 'Rajasthan', city: 'Jaipur' },
  ZRKT1: { state: 'Punjab', city: 'Zirakpur' },
  BLRT1: { state: 'Karnataka', city: 'Hoskote' },
  BLRT2: { state: 'Karnataka', city: 'Makali' },
  HYDT1: { state: 'Telangana', city: 'Hyderabad' },
  CHNT1: { state: 'Tamil Nadu', city: 'Chennai' },
  BOMT1: { state: 'Maharashtra', city: 'Bhiwandi' },
  AMDT1: { state: 'Gujarat', city: 'Ahmedabad' },
  IDRT1: { state: 'Madhya Pradesh', city: 'Indore' },
  PNQT1: { state: 'Maharashtra', city: 'Pune' },
  NGPT1: { state: 'Maharashtra', city: 'Nagpur' },
  VAPT1: { state: 'Gujarat', city: 'Vapi' },
  AGRB1: { state: 'Uttar Pradesh', city: 'Agra' },
  KNPB1: { state: 'Uttar Pradesh', city: 'Kanpur' },
  VNSB1: { state: 'Uttar Pradesh', city: 'Varanasi' },
  RKEB1: { state: 'Uttarakhand', city: 'Roorkee' },
  DDNB1: { state: 'Uttarakhand', city: 'Dehradun' },
  RDPB1: { state: 'Uttarakhand', city: 'Rudrapur' },
}

export function defaultServiceability() {
  return Object.fromEntries(
    Object.entries(DEFAULT_CITY_BY_CODE).map(([code, { state, city }]) => [
      code,
      { rows: [{ ...emptyCoverageRow(), id: `seed-${code}`, state, cityMode: 'include', cities: [city] }] },
    ])
  )
}
