// Geography Master — the pure postal/administrative hierarchy, independent
// of our own operational network: State/UT > District > City > Pincode >
// Locality (India Post "officename"), cross-linked to Territory (India Post
// "circlename") and Circle ("divisionname") — naming kept as given in the
// Confluence spec ("How to do Mapping of Geography & Location?"), which is
// the reverse of India Post's own Circle > Division ranking.
//
// "Range (P-L)" in that spec is NOT an alphabetical delivery split — it's
// literally Pincode-Locality, the composite key used to join this table to
// District (via table B) and to Territory/Circle/City (via table C). It's
// derived, never authored — see `rangeKey` below — so it isn't stored on
// each row.
//
// STATES is the real, complete list of 36 Indian States/UTs. PINCODES is a
// representative SAMPLE (not the full India Post directory, which runs to
// ~160k localities) covering the states our own Zones/Hubs currently sit in,
// enough to exercise search, grouping and the sheet UI end to end. Extend it
// state by state as real post-office data is imported.

import cityCoords from './geoCityCoords.json'

export function rangeKey(row) {
  return `${row.pincode}-${row.locality}`
}

// Real projected [x, y] position (same India-outline viewBox as
// indiaStatePaths.json / IndiaMap.jsx) for every city in PINCODES — used by
// Geography Master's Map view. Not every city on earth, just the ones in
// this sample.
export function cityAt(row) {
  return cityCoords[row.city] || null
}

export const STATES = [
  { code: 'AN', name: 'Andaman and Nicobar Islands', type: 'Union territory' },
  { code: 'AP', name: 'Andhra Pradesh', type: 'State' },
  { code: 'AR', name: 'Arunachal Pradesh', type: 'State' },
  { code: 'AS', name: 'Assam', type: 'State' },
  { code: 'BR', name: 'Bihar', type: 'State' },
  { code: 'CH', name: 'Chandigarh', type: 'Union territory' },
  { code: 'CT', name: 'Chhattisgarh', type: 'State' },
  { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'Union territory' },
  { code: 'DL', name: 'Delhi', type: 'Union territory' },
  { code: 'GA', name: 'Goa', type: 'State' },
  { code: 'GJ', name: 'Gujarat', type: 'State' },
  { code: 'HR', name: 'Haryana', type: 'State' },
  { code: 'HP', name: 'Himachal Pradesh', type: 'State' },
  { code: 'JK', name: 'Jammu and Kashmir', type: 'Union territory' },
  { code: 'JH', name: 'Jharkhand', type: 'State' },
  { code: 'KA', name: 'Karnataka', type: 'State' },
  { code: 'KL', name: 'Kerala', type: 'State' },
  { code: 'LA', name: 'Ladakh', type: 'Union territory' },
  { code: 'LD', name: 'Lakshadweep', type: 'Union territory' },
  { code: 'MP', name: 'Madhya Pradesh', type: 'State' },
  { code: 'MH', name: 'Maharashtra', type: 'State' },
  { code: 'MN', name: 'Manipur', type: 'State' },
  { code: 'ML', name: 'Meghalaya', type: 'State' },
  { code: 'MZ', name: 'Mizoram', type: 'State' },
  { code: 'NL', name: 'Nagaland', type: 'State' },
  { code: 'OR', name: 'Odisha', type: 'State' },
  { code: 'PY', name: 'Puducherry', type: 'Union territory' },
  { code: 'PB', name: 'Punjab', type: 'State' },
  { code: 'RJ', name: 'Rajasthan', type: 'State' },
  { code: 'SK', name: 'Sikkim', type: 'State' },
  { code: 'TN', name: 'Tamil Nadu', type: 'State' },
  { code: 'TG', name: 'Telangana', type: 'State' },
  { code: 'TR', name: 'Tripura', type: 'State' },
  { code: 'UP', name: 'Uttar Pradesh', type: 'State' },
  { code: 'UT', name: 'Uttarakhand', type: 'State' },
  { code: 'WB', name: 'West Bengal', type: 'State' },
]

// Flat rows — one per Pincode–Locality. Use `rangeKey(row)` for the
// Pincode-Locality join key rather than storing it on the row.
export const PINCODES = [
  // West Bengal
  { state: 'West Bengal', district: 'Kolkata', city: 'Kolkata', pincode: '700001', locality: 'Kolkata GPO', territory: 'West Bengal Circle', circle: 'Kolkata GPO Division' },
  { state: 'West Bengal', district: 'Kolkata', city: 'Kolkata', pincode: '700016', locality: 'Park Street', territory: 'West Bengal Circle', circle: 'Kolkata GPO Division' },
  { state: 'West Bengal', district: 'Howrah', city: 'Howrah', pincode: '711101', locality: 'Howrah H.O', territory: 'West Bengal Circle', circle: 'Howrah Division' },
  { state: 'West Bengal', district: 'Howrah', city: 'Howrah', pincode: '711201', locality: 'Santragachi', territory: 'West Bengal Circle', circle: 'Howrah Division' },

  // Jharkhand
  { state: 'Jharkhand', district: 'Hazaribagh', city: 'Chauparan', pincode: '825409', locality: 'Chauparan', territory: 'Jharkhand Circle', circle: 'Hazaribagh Division' },
  { state: 'Jharkhand', district: 'Ranchi', city: 'Ranchi', pincode: '834001', locality: 'Ranchi GPO', territory: 'Jharkhand Circle', circle: 'Ranchi Division' },
  { state: 'Jharkhand', district: 'Ranchi', city: 'Ranchi', pincode: '834002', locality: 'Doranda', territory: 'Jharkhand Circle', circle: 'Ranchi Division' },

  // Assam
  { state: 'Assam', district: 'Kamrup Metropolitan', city: 'Guwahati', pincode: '781001', locality: 'Guwahati GPO', territory: 'Assam Circle', circle: 'Guwahati Division' },
  { state: 'Assam', district: 'Kamrup Metropolitan', city: 'Guwahati', pincode: '781005', locality: 'Fancy Bazar', territory: 'Assam Circle', circle: 'Guwahati Division' },

  // Delhi
  { state: 'Delhi', district: 'New Delhi', city: 'New Delhi', pincode: '110001', locality: 'Connaught Place', territory: 'Delhi Circle', circle: 'New Delhi Division' },
  { state: 'Delhi', district: 'New Delhi', city: 'New Delhi', pincode: '110016', locality: 'Hauz Khas', territory: 'Delhi Circle', circle: 'New Delhi Division' },

  // Haryana
  { state: 'Haryana', district: 'Gurugram', city: 'Gurugram', pincode: '122001', locality: 'Gurugram H.O', territory: 'Haryana Circle', circle: 'Gurugram Division' },
  { state: 'Haryana', district: 'Gurugram', city: 'Gurugram', pincode: '122018', locality: 'Sector 29', territory: 'Haryana Circle', circle: 'Gurugram Division' },
  { state: 'Haryana', district: 'Sonipat', city: 'Sonipat', pincode: '131001', locality: 'Sonipat H.O', territory: 'Haryana Circle', circle: 'Sonipat Division' },

  // Uttar Pradesh
  { state: 'Uttar Pradesh', district: 'Gautam Buddh Nagar', city: 'Noida', pincode: '201301', locality: 'Sector 18', territory: 'Uttar Pradesh Circle', circle: 'Noida Division' },
  { state: 'Uttar Pradesh', district: 'Gautam Buddh Nagar', city: 'Noida', pincode: '201304', locality: 'Sector 62', territory: 'Uttar Pradesh Circle', circle: 'Noida Division' },
  { state: 'Uttar Pradesh', district: 'Lucknow', city: 'Lucknow', pincode: '226001', locality: 'Hazratganj', territory: 'Uttar Pradesh Circle', circle: 'Lucknow Division' },
  { state: 'Uttar Pradesh', district: 'Lucknow', city: 'Lucknow', pincode: '226010', locality: 'Aliganj', territory: 'Uttar Pradesh Circle', circle: 'Lucknow Division' },
  { state: 'Uttar Pradesh', district: 'Agra', city: 'Agra', pincode: '282001', locality: 'Agra Cantt', territory: 'Uttar Pradesh Circle', circle: 'Agra Division' },
  { state: 'Uttar Pradesh', district: 'Kanpur Nagar', city: 'Kanpur', pincode: '208001', locality: 'Kanpur GPO', territory: 'Uttar Pradesh Circle', circle: 'Kanpur Division' },
  { state: 'Uttar Pradesh', district: 'Varanasi', city: 'Varanasi', pincode: '221001', locality: 'Varanasi GPO', territory: 'Uttar Pradesh Circle', circle: 'Varanasi Division' },

  // Uttarakhand
  { state: 'Uttarakhand', district: 'Haridwar', city: 'Haridwar', pincode: '249401', locality: 'Haridwar H.O', territory: 'Uttarakhand Circle', circle: 'Haridwar Division' },
  { state: 'Uttarakhand', district: 'Haridwar', city: 'Roorkee', pincode: '247667', locality: 'Roorkee', territory: 'Uttarakhand Circle', circle: 'Haridwar Division' },
  { state: 'Uttarakhand', district: 'Dehradun', city: 'Dehradun', pincode: '248001', locality: 'Dehradun GPO', territory: 'Uttarakhand Circle', circle: 'Dehradun Division' },
  { state: 'Uttarakhand', district: 'Udham Singh Nagar', city: 'Rudrapur', pincode: '263153', locality: 'Rudrapur', territory: 'Uttarakhand Circle', circle: 'Rudrapur Division' },

  // Rajasthan
  { state: 'Rajasthan', district: 'Jaipur', city: 'Jaipur', pincode: '302001', locality: 'Jaipur GPO', territory: 'Rajasthan Circle', circle: 'Jaipur Division' },
  { state: 'Rajasthan', district: 'Jaipur', city: 'Jaipur', pincode: '302015', locality: 'Malviya Nagar', territory: 'Rajasthan Circle', circle: 'Jaipur Division' },

  // Punjab
  { state: 'Punjab', district: 'SAS Nagar (Mohali)', city: 'Zirakpur', pincode: '140603', locality: 'Zirakpur', territory: 'Punjab Circle', circle: 'Mohali Division' },

  // Karnataka
  { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', pincode: '560001', locality: 'Bangalore GPO', territory: 'Karnataka Circle', circle: 'Bangalore GPO Division' },
  { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', pincode: '560002', locality: 'Chickpet', territory: 'Karnataka Circle', circle: 'Bangalore GPO Division' },
  { state: 'Karnataka', district: 'Bengaluru Rural', city: 'Hoskote', pincode: '562114', locality: 'Hoskote', territory: 'Karnataka Circle', circle: 'Hoskote Division' },
  { state: 'Karnataka', district: 'Bengaluru Rural', city: 'Makali', pincode: '562123', locality: 'Makali', territory: 'Karnataka Circle', circle: 'Nelamangala Division' },

  // Telangana
  { state: 'Telangana', district: 'Hyderabad', city: 'Hyderabad', pincode: '500001', locality: 'Hyderabad GPO', territory: 'Telangana Circle', circle: 'Hyderabad GPO Division' },
  { state: 'Telangana', district: 'Hyderabad', city: 'Hyderabad', pincode: '500034', locality: 'Banjara Hills', territory: 'Telangana Circle', circle: 'Hyderabad GPO Division' },

  // Tamil Nadu
  { state: 'Tamil Nadu', district: 'Chennai', city: 'Chennai', pincode: '600001', locality: 'Chennai GPO', territory: 'Tamil Nadu Circle', circle: 'Chennai GPO Division' },
  { state: 'Tamil Nadu', district: 'Chennai', city: 'Chennai', pincode: '600028', locality: 'Raja Annamalaipuram', territory: 'Tamil Nadu Circle', circle: 'Chennai GPO Division' },

  // Maharashtra
  { state: 'Maharashtra', district: 'Thane', city: 'Bhiwandi', pincode: '421302', locality: 'Bhiwandi', territory: 'Maharashtra Circle', circle: 'Bhiwandi Division' },
  { state: 'Maharashtra', district: 'Pune', city: 'Pune', pincode: '411001', locality: 'Pune GPO', territory: 'Maharashtra Circle', circle: 'Pune Division' },
  { state: 'Maharashtra', district: 'Pune', city: 'Pune', pincode: '411014', locality: 'Kharadi', territory: 'Maharashtra Circle', circle: 'Pune Division' },
  { state: 'Maharashtra', district: 'Nagpur', city: 'Nagpur', pincode: '440001', locality: 'Nagpur GPO', territory: 'Maharashtra Circle', circle: 'Nagpur Division' },

  // Gujarat
  { state: 'Gujarat', district: 'Ahmedabad', city: 'Ahmedabad', pincode: '380001', locality: 'Ahmedabad GPO', territory: 'Gujarat Circle', circle: 'Ahmedabad Division' },
  { state: 'Gujarat', district: 'Ahmedabad', city: 'Ahmedabad', pincode: '380015', locality: 'Navrangpura', territory: 'Gujarat Circle', circle: 'Ahmedabad Division' },
  { state: 'Gujarat', district: 'Valsad', city: 'Vapi', pincode: '396191', locality: 'Vapi', territory: 'Gujarat Circle', circle: 'Vapi Division' },

  // Madhya Pradesh
  { state: 'Madhya Pradesh', district: 'Indore', city: 'Indore', pincode: '452001', locality: 'Indore GPO', territory: 'Madhya Pradesh Circle', circle: 'Indore Division' },
  { state: 'Madhya Pradesh', district: 'Indore', city: 'Indore', pincode: '452010', locality: 'Vijay Nagar', territory: 'Madhya Pradesh Circle', circle: 'Indore Division' },
]
