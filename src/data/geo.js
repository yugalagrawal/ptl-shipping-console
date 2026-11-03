// Shared geography/lookup helpers — used by New Client's own address/GSTIN
// pincode fields and by OdaListManager (components/OdaListManager.jsx) for
// its "type a pincode, auto-resolve" quick-add. Kept as one small shared
// module since both needed the same three things and neither owns them.

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

// Mock pincode -> {city, state} lookup — stand-in for a real pincode API.
export const MOCK_PINCODE_LOOKUP = {
  '400001': { city: 'Mumbai', state: 'Maharashtra' },
  '110001': { city: 'New Delhi', state: 'Delhi' },
  '560001': { city: 'Bengaluru', state: 'Karnataka' },
  '600001': { city: 'Chennai', state: 'Tamil Nadu' },
  '700001': { city: 'Kolkata', state: 'West Bengal' },
  '500001': { city: 'Hyderabad', state: 'Telangana' },
  '411001': { city: 'Pune', state: 'Maharashtra' },
  '380001': { city: 'Ahmedabad', state: 'Gujarat' },
  '302001': { city: 'Jaipur', state: 'Rajasthan' },
  '122001': { city: 'Gurugram', state: 'Haryana' },
  '201301': { city: 'Noida', state: 'Uttar Pradesh' },
  '682001': { city: 'Kochi', state: 'Kerala' },
  '160001': { city: 'Chandigarh', state: 'Chandigarh' },
  '751001': { city: 'Bhubaneswar', state: 'Odisha' },
  '834001': { city: 'Ranchi', state: 'Jharkhand' },
}

// Best-effort fallback for pincodes not in the table above: the first two
// digits identify the postal circle, which is enough to give the demo a
// plausible state + city for any real-looking pincode. A stand-in for the real
// pincode API, nothing more.
const PINCODE_PREFIX_LOOKUP = {
  11: ['Delhi', 'New Delhi'], 12: ['Haryana', 'Gurugram'], 13: ['Haryana', 'Ambala'], 14: ['Punjab', 'Ludhiana'],
  15: ['Punjab', 'Amritsar'], 16: ['Chandigarh', 'Chandigarh'], 17: ['Himachal Pradesh', 'Shimla'],
  18: ['Jammu and Kashmir', 'Jammu'], 19: ['Jammu and Kashmir', 'Srinagar'], 20: ['Uttar Pradesh', 'Noida'],
  21: ['Uttar Pradesh', 'Prayagraj'], 22: ['Uttar Pradesh', 'Lucknow'], 23: ['Uttar Pradesh', 'Varanasi'],
  24: ['Uttar Pradesh', 'Bareilly'], 25: ['Uttar Pradesh', 'Moradabad'], 26: ['Uttarakhand', 'Dehradun'],
  27: ['Uttar Pradesh', 'Gorakhpur'], 28: ['Uttar Pradesh', 'Agra'], 30: ['Rajasthan', 'Jaipur'],
  31: ['Rajasthan', 'Sikar'], 32: ['Rajasthan', 'Ajmer'], 33: ['Rajasthan', 'Jodhpur'], 34: ['Rajasthan', 'Udaipur'],
  36: ['Gujarat', 'Rajkot'], 37: ['Gujarat', 'Vadodara'], 38: ['Gujarat', 'Ahmedabad'], 39: ['Gujarat', 'Surat'],
  40: ['Maharashtra', 'Mumbai'], 41: ['Maharashtra', 'Pune'], 42: ['Maharashtra', 'Nashik'], 43: ['Maharashtra', 'Aurangabad'],
  44: ['Maharashtra', 'Nagpur'], 45: ['Madhya Pradesh', 'Indore'], 46: ['Madhya Pradesh', 'Bhopal'], 47: ['Madhya Pradesh', 'Jabalpur'],
  48: ['Madhya Pradesh', 'Gwalior'], 49: ['Chhattisgarh', 'Raipur'], 50: ['Telangana', 'Hyderabad'], 51: ['Andhra Pradesh', 'Vijayawada'],
  52: ['Andhra Pradesh', 'Guntur'], 53: ['Andhra Pradesh', 'Visakhapatnam'], 56: ['Karnataka', 'Bengaluru'], 57: ['Karnataka', 'Mysuru'],
  58: ['Karnataka', 'Hubballi'], 59: ['Karnataka', 'Belagavi'], 60: ['Tamil Nadu', 'Chennai'], 61: ['Tamil Nadu', 'Tiruchirappalli'],
  62: ['Tamil Nadu', 'Madurai'], 63: ['Tamil Nadu', 'Salem'], 64: ['Tamil Nadu', 'Coimbatore'], 67: ['Kerala', 'Kozhikode'],
  68: ['Kerala', 'Kochi'], 69: ['Kerala', 'Thiruvananthapuram'], 70: ['West Bengal', 'Kolkata'], 71: ['West Bengal', 'Howrah'],
  72: ['West Bengal', 'Durgapur'], 73: ['West Bengal', 'Siliguri'], 74: ['West Bengal', 'Krishnanagar'], 75: ['Odisha', 'Bhubaneswar'],
  76: ['Odisha', 'Berhampur'], 77: ['Odisha', 'Sambalpur'], 78: ['Assam', 'Guwahati'], 79: ['Arunachal Pradesh', 'Itanagar'],
  80: ['Bihar', 'Patna'], 81: ['Bihar', 'Bhagalpur'], 82: ['Bihar', 'Gaya'], 83: ['Jharkhand', 'Ranchi'], 84: ['Bihar', 'Muzaffarpur'],
  85: ['Bihar', 'Purnia'],
}

export function lookupPincode(pin) {
  const prefix = PINCODE_PREFIX_LOOKUP[Number(pin.slice(0, 2))]
  const result = MOCK_PINCODE_LOOKUP[pin] ?? (prefix ? { state: prefix[0], city: prefix[1] } : null)
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), 400)
  })
}

// GSTIN structure: 2-digit GST state code + 10-char PAN + 1-char entity code
// + 'Z' (literal) + 1-char checksum = 15 characters — one canonical code per
// state (a few codes, e.g. old undivided Andhra Pradesh or Daman & Diu
// pre-merger, are omitted since they're not used for new registrations).
// Shared by Client and Partner onboarding's GSTIN Info steps.
export const STATE_TO_GST_CODE = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  Maharashtra: '27',
  Karnataka: '29',
  Goa: '30',
  Lakshadweep: '31',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  'Andaman and Nicobar Islands': '35',
  Telangana: '36',
  'Andhra Pradesh': '37',
  Ladakh: '38',
}
