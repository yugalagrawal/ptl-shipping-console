// Shared foundation for Custom Region Definition — used both per-client (the
// "Define Client Region & Pricing" builder in the New Client wizard) and as
// reusable, named templates (Client Pricing > Client Mapping, built ahead of
// time so a sales exec doesn't have to redo the same negotiated region set
// for every sibling client). A template and a client's own region set are
// the exact same shape — a template is just one that isn't attached to a
// client yet.
import { ZONES, ZONE_CLASSIFICATIONS } from './pricing.js'

// Same state/city coverage already used for Client ODA List's picker
// (NewClient.jsx's ODA_PINCODE_DIRECTORY), just dropped to the pincode-less
// granularity a region actually needs. Kept as its own small copy here
// rather than importing NewClient.jsx's version, since that file is a page
// component, not a data module other pages should depend on.
export const STATE_CITY_DIRECTORY = {
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur'],
  Karnataka: ['Bengaluru', 'Mysuru'],
  Delhi: ['New Delhi'],
  Haryana: ['Gurugram', 'Faridabad'],
  'Tamil Nadu': ['Chennai', 'Coimbatore'],
  Gujarat: ['Ahmedabad', 'Surat'],
}

// A region built by cloning Standard starts empty of cities — this fills in
// the obvious ones for free by reading the same ZONE_CLASSIFICATIONS text
// shown in the Region Definition reference modal, word-matching each
// directory city against it. Words under 4 chars are skipped so "New Delhi"
// doesn't false-match on "New", and the caller claims cities zone-by-zone in
// ZONES order so a city mentioned in two descriptions (e.g. Mumbai, named
// once as West 1's coverage and again inside West 2's "excl. Mumbai") lands
// with whichever zone is listed first, not both.
function cityMatchesZoneText(city, description) {
  const text = description.toLowerCase()
  return city
    .split(' ')
    .filter((word) => word.length >= 4)
    .some((word) => text.includes(word.toLowerCase()))
}

let regionRowSeq = 1
let templateSeq = 1

export function freshRegionId() {
  return `region-${regionRowSeq++}`
}

// Clones the 13 standard regions as a starting point and best-effort assigns
// directory cities into them — real coverage, no separate dataset to
// maintain. Whatever doesn't match any zone's text just stays unmapped for
// ops to place by hand.
export function buildRegionsFromStandard() {
  const claimed = new Set()
  return ZONES.map((zone) => {
    const cities = []
    Object.entries(STATE_CITY_DIRECTORY).forEach(([state, cityList]) => {
      cityList.forEach((city) => {
        const key = `${state}|${city}`
        if (!claimed.has(key) && cityMatchesZoneText(city, ZONE_CLASSIFICATIONS[zone])) {
          claimed.add(key)
          cities.push({ state, city })
        }
      })
    })
    return { id: freshRegionId(), name: zone, cities }
  })
}

// Named, reusable region + pricing sets, built ahead of onboarding from
// Client Pricing > Client Mapping. Picking one in the New Client wizard's
// "Pull existing mapping" option clones it (see cloneRegionTemplate) rather
// than referencing it directly, so a client's own edits afterward never
// mutate the shared template.
export const REGION_TEMPLATES = []

export function addRegionTemplate(name) {
  const template = { id: `region-tpl-${templateSeq++}`, name, regions: [], overrides: {}, defaultRate: '' }
  REGION_TEMPLATES.push(template)
  return template
}

export function deleteRegionTemplate(id) {
  const idx = REGION_TEMPLATES.findIndex((t) => t.id === id)
  if (idx !== -1) REGION_TEMPLATES.splice(idx, 1)
}

export function updateRegionTemplate(id, patch) {
  const template = REGION_TEMPLATES.find((t) => t.id === id)
  if (template) Object.assign(template, patch)
  return template
}

// Deep-clones a template's regions/overrides with fresh ids so a client's
// own copy is fully independent of both the template and any other client
// who already pulled from it.
export function cloneRegionTemplate(templateId) {
  const template = REGION_TEMPLATES.find((t) => t.id === templateId)
  if (!template) return null
  const idMap = new Map()
  const regions = template.regions.map((r) => {
    const id = freshRegionId()
    idMap.set(r.id, id)
    return { id, name: r.name, cities: r.cities.map((c) => ({ ...c })) }
  })
  const overrides = {}
  Object.entries(template.overrides).forEach(([key, value]) => {
    const [originId, destId] = key.split('|')
    const newOriginId = idMap.get(originId)
    const newDestId = idMap.get(destId)
    if (newOriginId && newDestId) overrides[`${newOriginId}|${newDestId}`] = value
  })
  return { regions, overrides, defaultRate: template.defaultRate, sourceTemplateName: template.name }
}
