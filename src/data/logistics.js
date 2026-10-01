// Logistics Master — the operational hierarchy: Region > Zone (Hub) > Branch
// (Mini Hub). Source: Confluence "How to do Mapping of Geography & Location?"
// (THE PTL PROJECT / Docs, by yugal_agarwal) — both the 13 Region
// definitions and the Zone/Hub/Branch/Mini-Hub table are transcribed as
// given there, not sample data. Map marker coordinates are real
// lon/lat for each Hub city, projected into the shared India SVG viewBox
// (see indiaStatePaths.json / IndiaMap.jsx) so the dot sits in the right place
// on the outline map.
//
// A region without a zone yet (East 2, North East 1, North 3, South 3, South 4)
// is real — the business defines the region ahead of operational rollout.

export const REGION_COLORS = {
  'East 1': '#ef4444',
  'East 2': '#f97316',
  'North East': '#eab308',
  'North East 1': '#84cc16',
  'North 1': '#22c55e',
  'North 2': '#10b981',
  'North 3': '#14b8a6',
  'South 1': '#06b6d4',
  'South 2': '#0ea5e9',
  'South 3': '#3b82f6',
  'South 4': '#6366f1',
  'West 1': '#a855f7',
  'West 2': '#ec4899',
}

export const REGIONS = [
  { name: 'East 1', definition: 'Howrah, Bhubaneswar, Ranchi, Patna, Jamshedpur, Aurangabad (Bihar), Dhanbad' },
  { name: 'East 2', definition: 'Rest of (West Bengal, Bihar, Odisha, Jharkhand)' },
  { name: 'North East', definition: 'Guwahati' },
  { name: 'North East 1', definition: 'Arunachal Pradesh, Meghalaya, Mizoram, Tripura, Manipur, Sikkim & Nagaland' },
  { name: 'North 1', definition: 'National Capital Region (Delhi, Gurugram, Faridabad, Ghaziabad, Meerut & Sonipat)' },
  { name: 'North 2', definition: 'Rest of Uttar Pradesh (Exclude NCR & North 3 cities), Haryana (Exclude NCR), Punjab, Uttarakhand, Jammu & Kashmir & Rajasthan' },
  { name: 'North 3', definition: 'Himachal Pradesh, Gorakhpur, Ayodhya, Basti, Mirzapur, Bhadohi, Mau' },
  { name: 'South 1', definition: 'Bengaluru, Hyderabad' },
  { name: 'South 2', definition: 'Karnataka (Exclude Bengaluru), Telangana (Exclude Hyderabad) & Andhra Pradesh, Chennai' },
  { name: 'South 3', definition: 'Tamil Nadu (Exclude Chennai) & Pondicherry, Cochin' },
  { name: 'South 4', definition: 'Rest of Kerala' },
  { name: 'West 1', definition: 'Daman & Diu, Dadra & Nagar Haveli (Silvassa), Mumbai Metropolitan Region, Surat, Baroda, Ahmedabad, Indore, Bhopal' },
  { name: 'West 2', definition: 'Rest of Madhya Pradesh, Chhattisgarh, Rest of Maharashtra (Exclude Mumbai Metropolitan Region), Rest of Gujarat' },
]

// branches: [] means the Hub has no Branch/Mini-Hub layer below it (leaf is the Hub itself)
export const ZONES = [
  { zone: 'Kolkata Zone', hubName: 'Kolkata', hubCode: 'KOLT1', region: 'East 1', at: [329.48, 256.42], branches: [] },
  { zone: 'Aurangabad Zone', hubName: 'Aurangabad - Chauparan', hubCode: 'DBHT1', region: 'East 1', at: [284.58, 225.84], branches: [] },
  { zone: 'Guwahati Zone', hubName: 'Guwahati', hubCode: 'GWHT1', region: 'North East', at: [383.3, 194.96], branches: [] },
  { zone: 'Gurgaon Zone', hubName: 'Gurgaon', hubCode: 'GGNT1', region: 'North 1', at: [148.55, 155.14], branches: [] },
  { zone: 'Noida Zone', hubName: 'Noida', hubCode: 'NOIT1', region: 'North 1', at: [154.36, 153.83], branches: [] },
  {
    zone: 'Lucknow Zone', hubName: 'Lucknow', hubCode: 'LKOT1', region: 'North 2', at: [211.1, 182.88],
    branches: [
      { name: 'Western & Central UP', miniHubs: [{ name: 'Agra', code: 'AGRB1' }, { name: 'Kanpur', code: 'KNPB1' }] },
      { name: 'Purvanchal', miniHubs: [{ name: 'Varanasi', code: 'VNSB1' }] },
    ],
  },
  {
    zone: 'Haridwar Zone', hubName: 'Haridwar', hubCode: 'HWRT1', region: 'North 2', at: [166.7, 129.57],
    branches: [
      { name: 'Garhwal', miniHubs: [{ name: 'Roorkee', code: 'RKEB1' }, { name: 'Dehradun', code: 'DDNB1' }] },
      { name: 'Kumaon', miniHubs: [{ name: 'Rudrapur', code: 'RDPB1' }] },
    ],
  },
  { zone: 'Jaipur Zone', hubName: 'Jaipur', hubCode: 'JAIT1', region: 'North 2', at: [128.77, 181.75], branches: [] },
  { zone: 'Zirakpur Zone', hubName: 'Zirakpur - Punjab', hubCode: 'ZRKT1', region: 'North 2', at: [145.2, 117.58], branches: [] },
  { zone: 'Bangalore Hoskote Zone', hubName: 'Bangalore - Hoskote', hubCode: 'BLRT1', region: 'South 1', at: [164.85, 420.89], branches: [] },
  { zone: 'Bangalore Makali Zone', hubName: 'Bangalore - Makali', hubCode: 'BLRT2', region: 'South 1', at: [152.07, 418.68], branches: [] },
  { zone: 'Hyderabad Zone', hubName: 'Hyderabad', hubCode: 'HYDT1', region: 'South 1', at: [171.85, 345.66], branches: [] },
  { zone: 'Chennai Zone', hubName: 'Chennai', hubCode: 'CHNT1', region: 'South 2', at: [200.32, 419.68], branches: [] },
  { zone: 'Bhiwandi Zone', hubName: 'Bhiwandi', hubCode: 'BOMT1', region: 'West 1', at: [85.29, 312.71], branches: [] },
  { zone: 'Ahmedabad Zone', hubName: 'Ahmedabad', hubCode: 'AMDT1', region: 'West 1', at: [77.44, 248.68], branches: [] },
  { zone: 'Indore Zone', hubName: 'Indore', hubCode: 'IDRT1', region: 'West 1', at: [129.89, 253.89], branches: [] },
  { zone: 'Pune Zone', hubName: 'Pune', hubCode: 'PNQT1', region: 'West 2', at: [97.96, 326.13], branches: [] },
  { zone: 'Nagpur Zone', hubName: 'Nagpur', hubCode: 'NGPT1', region: 'West 2', at: [181.45, 280.96], branches: [] },
  { zone: 'Vapi Zone', hubName: 'Vapi', hubCode: 'VAPT1', region: 'West 2', at: [82.77, 293.98], branches: [] },
]

export function zoneMiniHubCount(z) {
  return z.branches.reduce((n, b) => n + b.miniHubs.length, 0)
}

// Real hub coordinates, keyed by Zone name — kept separate from the
// flattened sheet rows below since a marker's map position isn't an
// editable field the way Hub Name/Code are.
export const ZONE_COORDS = Object.fromEntries(ZONES.map((z) => [z.zone, z.at]))

// Region → its Zones, from the canonical ZONES table above (not the live,
// possibly-edited sheet rows) — same role as Geography Master's
// DISTRICTS_BY_STATE: a fixed list a Zone dropdown cascades from.
export function zonesInRegion(region) {
  return [...new Set(ZONES.filter((z) => z.region === region).map((z) => z.zone))].sort((a, b) => a.localeCompare(b))
}

// Logistics Master's sheet is one row per leaf (Zone, or Zone+Branch+Mini
// Hub when it has them) — flattened out of the nested ZONES/branches/
// miniHubs shape so it can use the exact same flat-sheet editing pattern
// (independent rows, column filters, Select columns, Export) as Geography
// Master's PINCODES.
export function flattenZones(zones) {
  const rows = []
  zones.forEach((z) => {
    if (z.branches.length === 0) {
      rows.push({ region: z.region, zone: z.zone, hubName: z.hubName, hubCode: z.hubCode, branch: '', miniHub: '', miniHubCode: '' })
    } else {
      z.branches.forEach((b) => {
        b.miniHubs.forEach((m) => {
          rows.push({ region: z.region, zone: z.zone, hubName: z.hubName, hubCode: z.hubCode, branch: b.name, miniHub: m.name, miniHubCode: m.code })
        })
      })
    }
  })
  return rows
}

export const LOGISTICS_ROWS = flattenZones(ZONES)

// Inverse of flattenZones — regroups the (possibly edited) flat sheet rows
// back into the {zone, branches: [{name, miniHubs}]} shape IndiaMap and
// zoneMiniHubCount expect, so the map always reflects live edits.
export function regroupZones(rows) {
  const byZone = new Map()
  rows.forEach((r) => {
    if (!byZone.has(r.zone)) {
      byZone.set(r.zone, { region: r.region, zone: r.zone, hubName: r.hubName, hubCode: r.hubCode, at: ZONE_COORDS[r.zone] || [0, 0], branchMap: new Map() })
    }
    const zg = byZone.get(r.zone)
    if (r.branch) {
      if (!zg.branchMap.has(r.branch)) zg.branchMap.set(r.branch, [])
      if (r.miniHub) zg.branchMap.get(r.branch).push({ name: r.miniHub, code: r.miniHubCode })
    }
  })
  return [...byZone.values()].map((z) => ({
    region: z.region, zone: z.zone, hubName: z.hubName, hubCode: z.hubCode, at: z.at,
    branches: [...z.branchMap.entries()].map(([name, miniHubs]) => ({ name, miniHubs })),
  }))
}
