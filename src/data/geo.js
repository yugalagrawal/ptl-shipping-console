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

export function lookupPincode(pin) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_PINCODE_LOOKUP[pin] ?? null), 400)
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
