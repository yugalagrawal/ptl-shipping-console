// Real zone -> state/city coverage (source: Yugal's mapping sheet,
// 2026-08-27), replacing the placeholder ZONE_PINCODE_STATS pincode examples
// that used to back the Region & Pincode Mapping modal (shared by Client
// Pricing Configuration and the New Client wizard). A real pincode master
// still doesn't exist — this is state/city granularity only, the same
// ceiling the source sheet itself has. A state listed without any
// include/exclude note covers every city in it, per Yugal's own instruction.
export const ZONE_COVERAGE = {
  'North 1': {
    states: [],
    cities: [
      { name: 'Delhi', state: 'Delhi (NCT)' },
      { name: 'Gurugram', state: 'Haryana' },
      { name: 'Faridabad', state: 'Haryana' },
      { name: 'Ghaziabad', state: 'Uttar Pradesh' },
      { name: 'Meerut', state: 'Uttar Pradesh' },
      { name: 'Sonipat', state: 'Haryana' },
    ],
    notes: [],
  },
  'North 2': {
    states: [
      { name: 'Uttar Pradesh', scope: 'rest', excludes: ['Ghaziabad', 'Meerut', 'Gorakhpur', 'Ayodhya', 'Basti', 'Mirzapur', 'Bhadohi', 'Mau'] },
      { name: 'Haryana', scope: 'rest', excludes: ['Gurugram', 'Faridabad', 'Sonipat'] },
      { name: 'Punjab', scope: 'full' },
      { name: 'Uttarakhand', scope: 'full' },
      { name: 'Jammu & Kashmir', scope: 'full' },
      { name: 'Rajasthan', scope: 'full' },
    ],
    cities: [],
    notes: [],
  },
  'North 3': {
    states: [{ name: 'Himachal Pradesh', scope: 'full' }],
    cities: [
      { name: 'Gorakhpur', state: 'Uttar Pradesh' },
      { name: 'Ayodhya', state: 'Uttar Pradesh' },
      { name: 'Basti', state: 'Uttar Pradesh' },
      { name: 'Mirzapur', state: 'Uttar Pradesh' },
      { name: 'Bhadohi', state: 'Uttar Pradesh' },
      { name: 'Mau', state: 'Uttar Pradesh' },
    ],
    notes: [],
  },
  'West 1': {
    states: [
      { name: 'Daman & Diu', scope: 'full' },
      { name: 'Dadra & Nagar Haveli', scope: 'full' },
    ],
    cities: [
      { name: 'Mumbai Metropolitan', state: 'Maharashtra' },
      { name: 'Surat', state: 'Gujarat' },
      { name: 'Vadodara', state: 'Gujarat' },
      { name: 'Ahmedabad', state: 'Gujarat' },
      { name: 'Indore', state: 'Madhya Pradesh' },
      { name: 'Bhopal', state: 'Madhya Pradesh' },
    ],
    notes: [],
  },
  'West 2': {
    states: [
      { name: 'Chhattisgarh', scope: 'full' },
      { name: 'Madhya Pradesh', scope: 'rest', excludes: ['Indore', 'Bhopal'] },
      { name: 'Maharashtra', scope: 'rest', excludes: ['Mumbai Metropolitan'] },
      { name: 'Gujarat', scope: 'rest', excludes: ['Surat', 'Vadodara', 'Ahmedabad'] },
    ],
    cities: [],
    notes: [],
  },
  'South 1': {
    states: [],
    cities: [
      { name: 'Bengaluru', state: 'Karnataka' },
      { name: 'Hyderabad', state: 'Telangana' },
    ],
    notes: [],
  },
  'South 2': {
    states: [
      { name: 'Andhra Pradesh', scope: 'full' },
      { name: 'Karnataka', scope: 'rest', excludes: ['Bengaluru'] },
      { name: 'Telangana', scope: 'rest', excludes: ['Hyderabad'] },
    ],
    cities: [{ name: 'Chennai', state: 'Tamil Nadu' }],
    notes: [],
  },
  'South 3': {
    states: [
      { name: 'Puducherry', scope: 'full' },
      { name: 'Tamil Nadu', scope: 'rest', excludes: ['Chennai'] },
    ],
    cities: [{ name: 'Cochin', state: 'Kerala' }],
    notes: [],
  },
  'South 4': {
    states: [{ name: 'Kerala', scope: 'rest', excludes: ['Cochin'] }],
    cities: [],
    notes: [],
  },
  'East 1': {
    states: [],
    cities: [
      { name: 'Howrah', state: 'West Bengal' },
      { name: 'Bhubaneswar', state: 'Odisha' },
      { name: 'Ranchi', state: 'Jharkhand' },
      { name: 'Patna', state: 'Bihar' },
      { name: 'Jamshedpur', state: 'Jharkhand' },
      { name: 'Aurangabad', state: 'Bihar' },
      { name: 'Dhanbad', state: 'Jharkhand' },
    ],
    notes: [],
  },
  'East 2': {
    states: [
      { name: 'West Bengal', scope: 'rest', excludes: ['Howrah'] },
      { name: 'Bihar', scope: 'rest', excludes: ['Patna', 'Aurangabad'] },
      { name: 'Odisha', scope: 'rest', excludes: ['Bhubaneswar'] },
      { name: 'Jharkhand', scope: 'rest', excludes: ['Ranchi', 'Jamshedpur', 'Dhanbad'] },
    ],
    cities: [],
    notes: [],
  },
  'North East 1': {
    states: [
      { name: 'Arunachal Pradesh', scope: 'full' },
      { name: 'Meghalaya', scope: 'full' },
      { name: 'Mizoram', scope: 'full' },
      { name: 'Tripura', scope: 'full' },
      { name: 'Manipur', scope: 'full' },
      { name: 'Sikkim', scope: 'full' },
      { name: 'Nagaland', scope: 'full' },
    ],
    cities: [],
    notes: [],
  },
  'North East': {
    states: [],
    cities: [{ name: 'Guwahati', state: 'Assam' }],
    notes: ["Rest of Assam isn't mapped to any zone yet — flagged for the business team to confirm, not assumed here."],
  },
}

// Which broad region a zone belongs to, purely for grouping/color-coding in
// the mapping UI — checked in this order so "North East ..." doesn't
// false-match the plain "North" prefix check.
export function zoneGroup(zone) {
  if (zone.startsWith('North East')) return 'North East'
  if (zone.startsWith('North')) return 'North'
  if (zone.startsWith('South')) return 'South'
  if (zone.startsWith('East')) return 'East'
  if (zone.startsWith('West')) return 'West'
  return zone
}

export const ZONE_GROUP_STYLES = {
  North: { dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-700' },
  South: { dot: 'bg-emerald-400', chip: 'bg-emerald-50 text-emerald-700' },
  East: { dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700' },
  West: { dot: 'bg-violet-400', chip: 'bg-violet-50 text-violet-700' },
  'North East': { dot: 'bg-rose-400', chip: 'bg-rose-50 text-rose-700' },
}

export function zoneLocationCount(zone) {
  const coverage = ZONE_COVERAGE[zone]
  return coverage.states.length + coverage.cities.length
}

// True if the zone's name, or any state/city it covers, mentions `query`.
export function zoneMatchesQuery(zone, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (zone.toLowerCase().includes(q)) return true
  const coverage = ZONE_COVERAGE[zone]
  return coverage.states.some((s) => s.name.toLowerCase().includes(q)) || coverage.cities.some((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
}
