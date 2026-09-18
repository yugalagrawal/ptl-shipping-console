// Master India ODA (Out of Delivery Area) pincode list — sourced from
// Yugal's "India_ODA_Pincodes_Master_List" reference file (2026-09-07).
// Used two ways in NewClient.jsx's Client ODA List step: as the flat seed a
// new client's own ODA list defaults to (every client starts fully covered,
// then ops removes/adds pincodes as negotiated), and as the State > City >
// Pincode directory the "Select ODA Pincodes" picker modal browses.

export const ODA_PINCODES_SEED = [
  { state: 'Jammu & Kashmir', city: 'Kupwara', pincode: '193222' },
  { state: 'Jammu & Kashmir', city: 'Kupwara', pincode: '193221' },
  { state: 'Jammu & Kashmir', city: 'Kupwara', pincode: '193223' },
  { state: 'Jammu & Kashmir', city: 'Kupwara', pincode: '193224' },
  { state: 'Jammu & Kashmir', city: 'Kupwara', pincode: '193225' },
  { state: 'Jammu & Kashmir', city: 'Rajouri', pincode: '185131' },
  { state: 'Jammu & Kashmir', city: 'Rajouri', pincode: '185132' },
  { state: 'Jammu & Kashmir', city: 'Rajouri', pincode: '185133' },
  { state: 'Jammu & Kashmir', city: 'Poonch', pincode: '185101' },
  { state: 'Jammu & Kashmir', city: 'Poonch', pincode: '185102' },
  { state: 'Jammu & Kashmir', city: 'Baramulla', pincode: '193101' },
  { state: 'Jammu & Kashmir', city: 'Baramulla', pincode: '193103' },
  { state: 'Jammu & Kashmir', city: 'Uri', pincode: '193123' },
  { state: 'Jammu & Kashmir', city: 'Bandipora', pincode: '193502' },
  { state: 'Jammu & Kashmir', city: 'Anantnag', pincode: '192101' },
  { state: 'Jammu & Kashmir', city: 'Doda', pincode: '182202' },
  { state: 'Jammu & Kashmir', city: 'Kishtwar', pincode: '182204' },
  { state: 'Jammu & Kashmir', city: 'Ramban', pincode: '182144' },
  { state: 'Ladakh', city: 'Leh', pincode: '194101' },
  { state: 'Ladakh', city: 'Leh', pincode: '194102' },
  { state: 'Ladakh', city: 'Leh', pincode: '194104' },
  { state: 'Ladakh', city: 'Kargil', pincode: '194103' },
  { state: 'Ladakh', city: 'Kargil', pincode: '194105' },
  { state: 'Ladakh', city: 'Nubra Valley', pincode: '194106' },
  { state: 'Ladakh', city: 'Zanskar', pincode: '194302' },
  { state: 'Himachal Pradesh', city: 'Lahaul & Spiti', pincode: '172114' },
  { state: 'Himachal Pradesh', city: 'Lahaul & Spiti', pincode: '175132' },
  { state: 'Himachal Pradesh', city: 'Lahaul & Spiti', pincode: '175133' },
  { state: 'Himachal Pradesh', city: 'Kinnaur', pincode: '172107' },
  { state: 'Himachal Pradesh', city: 'Kinnaur', pincode: '172108' },
  { state: 'Himachal Pradesh', city: 'Kinnaur', pincode: '172110' },
  { state: 'Himachal Pradesh', city: 'Chamba', pincode: '176310' },
  { state: 'Himachal Pradesh', city: 'Chamba', pincode: '176311' },
  { state: 'Himachal Pradesh', city: 'Chamba', pincode: '176312' },
  { state: 'Himachal Pradesh', city: 'Kullu', pincode: '175105' },
  { state: 'Himachal Pradesh', city: 'Kullu', pincode: '175123' },
  { state: 'Himachal Pradesh', city: 'Shimla', pincode: '171201' },
  { state: 'Himachal Pradesh', city: 'Shimla', pincode: '171220' },
  { state: 'Himachal Pradesh', city: 'Mandi', pincode: '175003' },
  { state: 'Uttarakhand', city: 'Chamoli', pincode: '246422' },
  { state: 'Uttarakhand', city: 'Chamoli', pincode: '246443' },
  { state: 'Uttarakhand', city: 'Chamoli', pincode: '246481' },
  { state: 'Uttarakhand', city: 'Uttarkashi', pincode: '249193' },
  { state: 'Uttarakhand', city: 'Uttarkashi', pincode: '249141' },
  { state: 'Uttarakhand', city: 'Pithoragarh', pincode: '262545' },
  { state: 'Uttarakhand', city: 'Pithoragarh', pincode: '262546' },
  { state: 'Uttarakhand', city: 'Pithoragarh', pincode: '262540' },
  { state: 'Uttarakhand', city: 'Rudraprayag', pincode: '246471' },
  { state: 'Uttarakhand', city: 'Rudraprayag', pincode: '246171' },
  { state: 'Uttarakhand', city: 'Tehri Garhwal', pincode: '249121' },
  { state: 'Uttarakhand', city: 'Almora', pincode: '263601' },
  { state: 'Uttarakhand', city: 'Bageshwar', pincode: '263642' },
  { state: 'Uttarakhand', city: 'Champawat', pincode: '262523' },
  { state: 'Sikkim', city: 'Gangtok', pincode: '737101' },
  { state: 'Sikkim', city: 'Gangtok', pincode: '737102' },
  { state: 'Sikkim', city: 'Mangan (North Sikkim)', pincode: '737116' },
  { state: 'Sikkim', city: 'Lachen / Lachung', pincode: '737120' },
  { state: 'Sikkim', city: 'Gyalshing (West Sikkim)', pincode: '737111' },
  { state: 'Sikkim', city: 'Namchi (South Sikkim)', pincode: '737126' },
  { state: 'Sikkim', city: 'Soreng', pincode: '737121' },
  { state: 'Arunachal Pradesh', city: 'Tawang', pincode: '790104' },
  { state: 'Arunachal Pradesh', city: 'West Kameng', pincode: '790116' },
  { state: 'Arunachal Pradesh', city: 'Lower Subansiri (Ziro)', pincode: '791120' },
  { state: 'Arunachal Pradesh', city: 'East Siang (Pasighat)', pincode: '791102' },
  { state: 'Arunachal Pradesh', city: 'Upper Subansiri (Daporijo)', pincode: '791122' },
  { state: 'Arunachal Pradesh', city: 'Changlang', pincode: '792120' },
  { state: 'Arunachal Pradesh', city: 'Tirap (Khonsa)', pincode: '792130' },
  { state: 'Arunachal Pradesh', city: 'Lohit (Tezu)', pincode: '792101' },
  { state: 'Arunachal Pradesh', city: 'Anjaw', pincode: '792104' },
  { state: 'Nagaland', city: 'Mon', pincode: '798621' },
  { state: 'Nagaland', city: 'Tuensang', pincode: '798601' },
  { state: 'Nagaland', city: 'Mokokchung', pincode: '798604' },
  { state: 'Nagaland', city: 'Zunheboto', pincode: '798620' },
  { state: 'Nagaland', city: 'Wokha', pincode: '798623' },
  { state: 'Nagaland', city: 'Phek', pincode: '798612' },
  { state: 'Nagaland', city: 'Kiphire', pincode: '798611' },
  { state: 'Nagaland', city: 'Longleng', pincode: '798625' },
  { state: 'Manipur', city: 'Ukhrul', pincode: '795142' },
  { state: 'Manipur', city: 'Churachandpur', pincode: '795128' },
  { state: 'Manipur', city: 'Senapati', pincode: '795106' },
  { state: 'Manipur', city: 'Tamenglong', pincode: '795141' },
  { state: 'Manipur', city: 'Chandel', pincode: '795127' },
  { state: 'Manipur', city: 'Jiribam', pincode: '795116' },
  { state: 'Manipur', city: 'Tengnoupal', pincode: '795131' },
  { state: 'Mizoram', city: 'Champhai', pincode: '796321' },
  { state: 'Mizoram', city: 'Lunglei', pincode: '796701' },
  { state: 'Mizoram', city: 'Serchhip', pincode: '796181' },
  { state: 'Mizoram', city: 'Lawngtlai', pincode: '796891' },
  { state: 'Mizoram', city: 'Siaha', pincode: '796901' },
  { state: 'Mizoram', city: 'Kolasib', pincode: '796081' },
  { state: 'Mizoram', city: 'Mamit', pincode: '796441' },
  { state: 'Meghalaya', city: 'West Garo Hills (Tura)', pincode: '794101' },
  { state: 'Meghalaya', city: 'South Garo Hills (Baghmara)', pincode: '794102' },
  { state: 'Meghalaya', city: 'East Garo Hills (Williamnagar)', pincode: '794111' },
  { state: 'Meghalaya', city: 'West Jaintia Hills (Jowai)', pincode: '793150' },
  { state: 'Meghalaya', city: 'East Khasi Hills (Cherrapunji)', pincode: '793108' },
  { state: 'Meghalaya', city: 'Ri-Bhoi', pincode: '793102' },
  { state: 'Assam', city: 'Dima Hasao (Haflong)', pincode: '788819' },
  { state: 'Assam', city: 'Karbi Anglong (Diphu)', pincode: '782460' },
  { state: 'Assam', city: 'West Karbi Anglong (Hamren)', pincode: '782486' },
  { state: 'Assam', city: 'Hailakandi', pincode: '788151' },
  { state: 'Assam', city: 'Karimganj', pincode: '788710' },
  { state: 'Assam', city: 'Chirang', pincode: '783392' },
  { state: 'Assam', city: 'Baksa', pincode: '781372' },
  { state: 'Assam', city: 'Dhemaji', pincode: '787057' },
  { state: 'Tripura', city: 'North Tripura (Dharmanagar)', pincode: '799250' },
  { state: 'Tripura', city: 'Dhalai (Ambassa)', pincode: '799289' },
  { state: 'Tripura', city: 'Unakoti (Kailashahar)', pincode: '799277' },
  { state: 'Tripura', city: 'South Tripura (Belonia)', pincode: '799155' },
  { state: 'Rajasthan', city: 'Jaisalmer', pincode: '345001' },
  { state: 'Rajasthan', city: 'Jaisalmer (Pokhran)', pincode: '345021' },
  { state: 'Rajasthan', city: 'Jaisalmer (Ramgarh)', pincode: '345022' },
  { state: 'Rajasthan', city: 'Barmer', pincode: '344001' },
  { state: 'Rajasthan', city: 'Barmer (Chohtan)', pincode: '344702' },
  { state: 'Rajasthan', city: 'Barmer (Balotra)', pincode: '344022' },
  { state: 'Rajasthan', city: 'Bikaner (Khajuwala)', pincode: '334023' },
  { state: 'Rajasthan', city: 'Bikaner (Lunkaransar)', pincode: '334603' },
  { state: 'Rajasthan', city: 'Jalore (Sanchore)', pincode: '343041' },
  { state: 'Rajasthan', city: 'Sirohi (Mount Abu)', pincode: '307501' },
  { state: 'Gujarat', city: 'Kutch (Bhuj)', pincode: '370001' },
  { state: 'Gujarat', city: 'Kutch (Khavda)', pincode: '370510' },
  { state: 'Gujarat', city: 'Kutch (Lakhpat)', pincode: '370627' },
  { state: 'Gujarat', city: 'Kutch (Rapar)', pincode: '370145' },
  { state: 'Gujarat', city: 'Kutch (Naliya)', pincode: '370655' },
  { state: 'Gujarat', city: 'Kutch (Gandhidham Rural)', pincode: '370201' },
  { state: 'Gujarat', city: 'Banaskantha (Vav)', pincode: '385575' },
  { state: 'Madhya Pradesh', city: 'Mandla', pincode: '481661' },
  { state: 'Madhya Pradesh', city: 'Dindori', pincode: '481880' },
  { state: 'Madhya Pradesh', city: 'Anuppur', pincode: '484881' },
  { state: 'Madhya Pradesh', city: 'Sheopur', pincode: '476337' },
  { state: 'Madhya Pradesh', city: 'Sidhi', pincode: '486661' },
  { state: 'Madhya Pradesh', city: 'Singrauli', pincode: '486886' },
  { state: 'Madhya Pradesh', city: 'Umaria', pincode: '484661' },
  { state: 'Madhya Pradesh', city: 'Jhabua', pincode: '457661' },
  { state: 'Chhattisgarh', city: 'Dantewada', pincode: '494449' },
  { state: 'Chhattisgarh', city: 'Sukma', pincode: '494111' },
  { state: 'Chhattisgarh', city: 'Bijapur', pincode: '494444' },
  { state: 'Chhattisgarh', city: 'Bastar (Jagdalpur)', pincode: '494001' },
  { state: 'Chhattisgarh', city: 'Kanker', pincode: '494334' },
  { state: 'Chhattisgarh', city: 'Narayanpur', pincode: '494661' },
  { state: 'Chhattisgarh', city: 'Kondagaon', pincode: '494226' },
  { state: 'Chhattisgarh', city: 'Surguja (Ambikapur)', pincode: '497001' },
  { state: 'Chhattisgarh', city: 'Jashpur', pincode: '496331' },
  { state: 'Odisha', city: 'Malkangiri', pincode: '764045' },
  { state: 'Odisha', city: 'Malkangiri (Chitrakonda)', pincode: '764059' },
  { state: 'Odisha', city: 'Koraput', pincode: '764020' },
  { state: 'Odisha', city: 'Nabarangpur', pincode: '764059' },
  { state: 'Odisha', city: 'Kandhamal (Phulbani)', pincode: '762001' },
  { state: 'Odisha', city: 'Rayagada', pincode: '765001' },
  { state: 'Odisha', city: 'Gajapati', pincode: '761200' },
  { state: 'Odisha', city: 'Sundargarh (Bonai)', pincode: '770038' },
  { state: 'West Bengal', city: 'South 24 Parganas (Gosaba)', pincode: '743370' },
  { state: 'West Bengal', city: 'South 24 Parganas (Basanti)', pincode: '743312' },
  { state: 'West Bengal', city: 'South 24 Parganas (Namkhana)', pincode: '743357' },
  { state: 'West Bengal', city: 'Purulia', pincode: '723101' },
  { state: 'West Bengal', city: 'Purulia (Manbazar)', pincode: '723131' },
  { state: 'West Bengal', city: 'Kalimpong', pincode: '734301' },
  { state: 'West Bengal', city: 'Darjeeling (Mirik)', pincode: '734214' },
  { state: 'West Bengal', city: 'Alipurduar', pincode: '736121' },
  { state: 'Jharkhand', city: 'Latehar', pincode: '829206' },
  { state: 'Jharkhand', city: 'Gumla', pincode: '835207' },
  { state: 'Jharkhand', city: 'Simdega', pincode: '835223' },
  { state: 'Jharkhand', city: 'West Singhbhum (Chaibasa)', pincode: '833201' },
  { state: 'Jharkhand', city: 'Khunti', pincode: '835210' },
  { state: 'Jharkhand', city: 'Garhwa', pincode: '822114' },
  { state: 'Bihar', city: 'West Champaran (Valmiki Nagar)', pincode: '845401' },
  { state: 'Bihar', city: 'Kishanganj', pincode: '855107' },
  { state: 'Bihar', city: 'Jamui', pincode: '811307' },
  { state: 'Bihar', city: 'Banka', pincode: '814102' },
  { state: 'Maharashtra', city: 'Gadchiroli', pincode: '442605' },
  { state: 'Maharashtra', city: 'Gadchiroli (Aheri)', pincode: '442701' },
  { state: 'Maharashtra', city: 'Gadchiroli (Etapalli)', pincode: '442704' },
  { state: 'Maharashtra', city: 'Nandurbar', pincode: '425412' },
  { state: 'Maharashtra', city: 'Melghat (Amravati)', pincode: '444813' },
  { state: 'Maharashtra', city: 'Ratnagiri (Rural)', pincode: '415612' },
  { state: 'Maharashtra', city: 'Sindhudurg (Rural)', pincode: '416516' },
  { state: 'Karnataka', city: 'Uttara Kannada (Joida)', pincode: '581186' },
  { state: 'Karnataka', city: 'Kodagu (Madikeri)', pincode: '571201' },
  { state: 'Karnataka', city: 'Chikmagalur (Kudremukh)', pincode: '577142' },
  { state: 'Karnataka', city: 'Chamarajanagar', pincode: '571313' },
  { state: 'Kerala', city: 'Wayanad (Mananthavady)', pincode: '670645' },
  { state: 'Kerala', city: 'Idukki (Munnar)', pincode: '685612' },
  { state: 'Kerala', city: 'Idukki (Devikulam)', pincode: '685613' },
  { state: 'Kerala', city: 'Palakkad (Attappadi)', pincode: '678581' },
  { state: 'Tamil Nadu', city: 'Nilgiris (Ooty)', pincode: '643001' },
  { state: 'Tamil Nadu', city: 'Nilgiris (Gudalur)', pincode: '643212' },
  { state: 'Tamil Nadu', city: 'Dindigul (Kodaikanal)', pincode: '624101' },
  { state: 'Tamil Nadu', city: 'Valparai', pincode: '642127' },
  { state: 'Andhra Pradesh', city: 'Alluri Sitharama Raju (Araku)', pincode: '531149' },
  { state: 'Andhra Pradesh', city: 'Alluri Sitharama Raju (Paderu)', pincode: '531024' },
  { state: 'Telangana', city: 'Bhadradri Kothagudem', pincode: '507101' },
  { state: 'Telangana', city: 'Asifabad', pincode: '504293' },
  { state: 'Andaman & Nicobar Islands', city: 'Port Blair', pincode: '744101' },
  { state: 'Andaman & Nicobar Islands', city: 'Port Blair (Bambooflat)', pincode: '744107' },
  { state: 'Andaman & Nicobar Islands', city: 'Havelock Island (Swaraj Dweep)', pincode: '744211' },
  { state: 'Andaman & Nicobar Islands', city: 'Neil Island (Shaheed Dweep)', pincode: '744104' },
  { state: 'Andaman & Nicobar Islands', city: 'Mayabunder', pincode: '744204' },
  { state: 'Andaman & Nicobar Islands', city: 'Diglipur', pincode: '744202' },
  { state: 'Andaman & Nicobar Islands', city: 'Rangat', pincode: '744205' },
  { state: 'Andaman & Nicobar Islands', city: 'Car Nicobar', pincode: '744301' },
  { state: 'Andaman & Nicobar Islands', city: 'Campbell Bay', pincode: '744302' },
  { state: 'Lakshadweep', city: 'Kavaratti', pincode: '682555' },
  { state: 'Lakshadweep', city: 'Agatti Island', pincode: '682553' },
  { state: 'Lakshadweep', city: 'Amini', pincode: '682552' },
  { state: 'Lakshadweep', city: 'Andrott', pincode: '682551' },
  { state: 'Lakshadweep', city: 'Minicoy', pincode: '682559' },
  { state: 'Lakshadweep', city: 'Kalpeni', pincode: '682556' },
  { state: 'Lakshadweep', city: 'Kadmat', pincode: '682557' },
  { state: 'Lakshadweep', city: 'Kiltan', pincode: '682558' },
]

export const ODA_PINCODE_DIRECTORY = ODA_PINCODES_SEED.reduce((dir, { state, city, pincode }) => {
  ;(dir[state] ??= {})
  ;(dir[state][city] ??= []).push(pincode)
  return dir
}, {})

// The "Default ODA List" — configured centrally in Client Pricing
// Configuration > Additional Charges (via OdaListManager), and what every
// new client's own ODA list in the New Client wizard is seeded from at the
// moment their draft is created. Plain mutable module state (same pattern
// as REGION_TEMPLATES in regionMapping.js) rather than a proper store —
// there's no backend here, so "persisting" just means "the next component
// that reads these exports, e.g. a freshly-opened New Client wizard, sees
// whatever was last set." Read via the getters below so callers don't
// import a `let` binding directly (that still works via ESM live bindings,
// but the getters make the "this can change" intent explicit).
let defaultOdaEntries = ODA_PINCODES_SEED.map(({ state, city, pincode }, i) => ({ id: `oda-default-${i}`, state, city, pincode }))
let defaultOdaRate = { perKg: 3, perAwb: 750 }
let defaultOdaOverrides = {}

export function getDefaultOdaEntries() {
  return defaultOdaEntries
}
export function getDefaultOdaRate() {
  return defaultOdaRate
}
export function getDefaultOdaOverrides() {
  return defaultOdaOverrides
}
export function setDefaultOdaEntries(entries) {
  defaultOdaEntries = entries
}
export function setDefaultOdaRate(rate) {
  defaultOdaRate = rate
}
export function setDefaultOdaOverrides(overrides) {
  defaultOdaOverrides = overrides
}
// Independent copies for a new client to start from and edit freely without
// touching the shared default (same "clone, don't share the reference"
// rule cloneRegionTemplate follows in regionMapping.js).
export function cloneDefaultOdaEntries() {
  return defaultOdaEntries.map((row) => ({ ...row }))
}
export function cloneDefaultOdaOverrides() {
  return { ...defaultOdaOverrides }
}
