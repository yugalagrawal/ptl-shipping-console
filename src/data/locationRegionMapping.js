// Location Master Region Mapping — which State/UT > City > Pincode > Locality each of the
// 13 Regions (see REGIONS in logistics.js) covers. Same row shape as a
// Hub's Serviceability (hubServiceability.js) so both share the same
// editor and stat helpers; keyed by Region name. Seeded from each
// Region's Confluence definition string: "Rest of X" / "X (Exclude city)"
// become an Exclude on City, a bare city list becomes an Include, and a
// plain State/UT name is All.
import { emptyCoverageRow } from './hubServiceability.js'

const all = (state) => ({ state })
const only = (state, ...cities) => ({ state, cityMode: 'include', cities })
const except = (state, ...cities) => ({ state, cityMode: 'exclude', cities })

const NCR_HARYANA = ['Gurugram', 'Faridabad', 'Sonipat']
const NCR_UP = ['Ghaziabad', 'Meerut']
const NORTH_3_UP = ['Gorakhpur', 'Ayodhya', 'Basti', 'Mirzapur', 'Bhadohi', 'Mau']
const MUMBAI_MMR = ['Mumbai', 'Thane', 'Navi Mumbai']
const WEST_1_GUJ = ['Surat', 'Vadodara', 'Ahmedabad']
const WEST_1_MP = ['Indore', 'Bhopal']
const EAST_1 = {
  'West Bengal': ['Howrah'], Odisha: ['Bhubaneswar'], Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad'], Bihar: ['Patna', 'Aurangabad'],
}

const SEED = {
  'East 1': Object.entries(EAST_1).map(([s, c]) => only(s, ...c)),
  'East 2': Object.entries(EAST_1).map(([s, c]) => except(s, ...c)),
  'North East': [only('Assam', 'Guwahati')],
  'North East 1': ['Arunachal Pradesh', 'Meghalaya', 'Mizoram', 'Tripura', 'Manipur', 'Sikkim', 'Nagaland'].map(all),
  'North 1': [all('Delhi'), only('Haryana', ...NCR_HARYANA), only('Uttar Pradesh', ...NCR_UP)],
  'North 2': [except('Uttar Pradesh', ...NCR_UP, ...NORTH_3_UP), except('Haryana', ...NCR_HARYANA), ...['Punjab', 'Uttarakhand', 'Jammu and Kashmir', 'Ladakh', 'Rajasthan'].map(all)],
  'North 3': [all('Himachal Pradesh'), only('Uttar Pradesh', ...NORTH_3_UP)],
  'South 1': [only('Karnataka', 'Bengaluru'), only('Telangana', 'Hyderabad')],
  'South 2': [except('Karnataka', 'Bengaluru'), except('Telangana', 'Hyderabad'), all('Andhra Pradesh'), only('Tamil Nadu', 'Chennai')],
  'South 3': [except('Tamil Nadu', 'Chennai'), all('Puducherry'), only('Kerala', 'Cochin')],
  'South 4': [except('Kerala', 'Cochin')],
  'West 1': [all('Dadra and Nagar Haveli and Daman and Diu'), only('Maharashtra', ...MUMBAI_MMR), only('Gujarat', ...WEST_1_GUJ), only('Madhya Pradesh', ...WEST_1_MP)],
  'West 2': [except('Madhya Pradesh', ...WEST_1_MP), all('Chhattisgarh'), except('Maharashtra', ...MUMBAI_MMR), except('Gujarat', ...WEST_1_GUJ)],
}

export function defaultRegionMapping() {
  return Object.fromEntries(
    Object.entries(SEED).map(([region, rows]) => [
      region,
      { rows: rows.map((r, i) => ({ ...emptyCoverageRow(), id: `seed-${region}-${i}`, ...r })) },
    ])
  )
}
