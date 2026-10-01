// Territory / Circle Mapping (Geography Master).
//
// A CIRCLE is a coverage definition over the Pincode–Locality level: rows
// of State > City > Pincode > Locality, each level All / Include / Exclude
// (same row shape as Hub Serviceability, see hubServiceability.js). A
// TERRITORY is nothing but a named group of Circles — it has no coverage
// of its own; what it covers is the union of its Circles. A Circle belongs
// to exactly one Territory.
//
// Seeded from the Geography Master sample sheet: every distinct
// (territory, circle) pair there becomes a Circle whose rows list the
// cities / pincodes it actually contains.
import { PINCODES } from './geography.js'
import { emptyCoverageRow } from './hubServiceability.js'

export function defaultTerritoryCircleMapping() {
  const circles = {}
  const territories = []
  PINCODES.forEach((r) => {
    if (!r.territory || !r.circle) return
    let t = territories.find((x) => x.name === r.territory)
    if (!t) { t = { id: `t-${territories.length}`, name: r.territory, circleIds: [] }; territories.push(t) }
    if (!circles[r.circle]) {
      circles[r.circle] = { id: r.circle, name: r.circle, rows: [] }
      t.circleIds.push(r.circle)
    }
    const c = circles[r.circle]
    let row = c.rows.find((x) => x.state === r.state)
    if (!row) {
      row = { ...emptyCoverageRow(), id: `seed-${r.circle}-${r.state}`, state: r.state, cityMode: 'include', cities: [], pincodeMode: 'include', pincodes: [] }
      c.rows.push(row)
    }
    if (!row.cities.includes(r.city)) row.cities.push(r.city)
    if (!row.pincodes.includes(r.pincode)) row.pincodes.push(r.pincode)
  })
  // Worked example of a large Circle (10 cities, 25 pincodes) — the coverage
  // cards show the first 3 of each and collapse the rest into "+N more".
  const mh = territories.find((t) => t.name === 'Maharashtra Circle')
  if (mh) {
    circles['Mumbai Metro Division'] = {
      id: 'Mumbai Metro Division',
      name: 'Mumbai Metro Division',
      rows: [{
        ...emptyCoverageRow(), id: 'seed-mumbai-metro', state: 'Maharashtra',
        cityMode: 'include', cities: ['Mumbai', 'Thane', 'Navi Mumbai', 'Kalyan', 'Dombivli', 'Vasai', 'Virar', 'Bhiwandi', 'Ulhasnagar', 'Panvel'],
        pincodeMode: 'include', pincodes: Array.from({ length: 25 }, (_, i) => String(400001 + i * 3)),
      }],
    }
    mh.circleIds.unshift('Mumbai Metro Division')
  }
  territories.sort((a, b) => a.name.localeCompare(b.name))
  return { territories, circles }
}
