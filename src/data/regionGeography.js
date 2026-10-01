// Region → whole State/UT coverage, transcribed from the same Confluence
// "How to do Mapping of Geography & Location?" definitions as REGIONS in
// logistics.js (see the `definition` string on each Region there). A
// State/UT shows up under exactly ONE Region here — Regions never overlap
// on the ground, so a State only belongs here if that Region's definition
// claims the WHOLE thing outright ("Rest of X", "X (Exclude <city>)", or a
// plain state/UT name with no carve-out). A Region that only names a
// metro city inside a State (Mumbai Metropolitan Region, Bengaluru,
// Hyderabad, Chennai, Cochin, Delhi's own NCR satellite cities,
// Gorakhpur/Ayodhya/Basti/Mirzapur/Bhadohi/Mau) doesn't get that State
// here — its real coverage is that city's own district, which this map
// has no polygon data for (indiaStatePaths.json is state-granularity
// only), so it's left unshaded rather than drawn wrong. Those Regions
// still show up via their Hub/Mini Hub markers on the sheet's Map view.
//
// State/UT names match indiaStatePaths.json exactly. J&K's Confluence-era
// "Jammu & Kashmir" is split into two UTs on the current outline (Jammu and
// Kashmir + Ladakh) — both shaded under North 2, the region that was
// carved from the old undivided state. "North East" names only Guwahati in
// the doc, but since no other region claims Assam, it's shaded there too
// rather than left as an unexplained gap next to its fully-shaded
// neighbours.
export const REGION_STATES = {
  'East 1': [],
  'East 2': ['West Bengal', 'Bihar', 'Odisha', 'Jharkhand'],
  'North East': ['Assam'],
  'North East 1': ['Arunachal Pradesh', 'Meghalaya', 'Mizoram', 'Tripura', 'Manipur', 'Sikkim', 'Nagaland'],
  'North 1': ['Delhi'],
  'North 2': ['Uttar Pradesh', 'Haryana', 'Punjab', 'Uttarakhand', 'Jammu and Kashmir', 'Ladakh', 'Rajasthan'],
  'North 3': ['Himachal Pradesh'],
  'South 1': [],
  'South 2': ['Karnataka', 'Telangana', 'Andhra Pradesh'],
  'South 3': ['Tamil Nadu', 'Puducherry'],
  'South 4': ['Kerala'],
  'West 1': ['Dadra and Nagar Haveli and Daman and Diu'],
  'West 2': ['Madhya Pradesh', 'Chhattisgarh', 'Maharashtra', 'Gujarat'],
}

// Reverse lookup used by the map: State/UT name -> owning Region.
export const STATE_REGION = Object.fromEntries(
  Object.entries(REGION_STATES).flatMap(([region, states]) => states.map((s) => [s, region]))
)
