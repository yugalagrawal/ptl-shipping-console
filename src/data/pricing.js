// Client pricing model.
//
// A client's final AWB-level price is resolved at booking time as:
//   1. Look up origin/destination PINCODE -> ZONE (a master lookup, not modeled here yet).
//   2. chargeableWeightKg = max(actualWeightKg, volumeCft * volumetricFactor, minChargeableWeightKg)
//   3. baseFreight = matrix[originZone][destinationZone] * chargeableWeightKg
//   4. Walk every tagged charge and resolve by its `type` (see CHARGE_TYPES below) —
//      a pricing engine only needs to understand these ~6 types, never a specific
//      charge name, so ops can add new named charges without new code.
//   5. total = baseFreight + sum(resolved charges) + GST on top.
//
// The zone matrix itself is one shared "standard" rate card (INR per kg,
// chargeable weight). Tier does not pick a different matrix — it picks a
// discount % off this same standard matrix. That's what gets attached to a
// client on submission, and what Client Approvals then lets ops edit
// per-client before final sign-off.

export const ZONES = [
  'North 1',
  'North 2',
  'North 3',
  'West 1',
  'West 2',
  'South 1',
  'South 2',
  'South 3',
  'South 4',
  'East 1',
  'East 2',
  'North East 1',
  'North East',
]

// rows/cols both in ZONES order. INR per kg, chargeable weight.
// North East 1 -> East 2 wasn't in the source rate card — confirmed with
// Yugal to mirror the reverse direction (East 2 -> North East 1 = 12).
export const STANDARD_MATRIX = [
  [5, 5.25, 6, 7, 7.25, 8, 9.5, 11, 14, 8.25, 9.5, 11, 18],
  [5.25, 5, 6, 8.5, 10, 10, 12, 14, 16, 9, 11, 12, 18],
  [6, 6, 7, 9.5, 12, 12, 14, 16, 16, 8, 10, 12, 18],
  [6.75, 7.5, 9, 6, 7, 6.5, 7.5, 8, 9.5, 9.5, 12, 15, 18],
  [7.25, 9, 10, 7, 8, 8, 9, 10, 11, 12, 14, 16, 18],
  [8, 10, 11, 6.5, 7.5, 6, 7.5, 8, 9, 10, 12, 16, 18],
  [9.5, 12, 12, 7.5, 9, 7, 8, 8, 9, 12, 14, 16, 18],
  [11, 14, 13, 8, 9.5, 8, 8, 11, 9, 12, 14, 18, 18],
  [14, 15, 14, 14, 14, 9, 9, 9, 8, 14, 16, 18, 18],
  [8.25, 10, 8, 10, 12, 12, 13, 14, 14, 7, 8, 10, 18],
  [9.5, 12, 9, 10, 12, 12, 13, 14, 14, 8, 9, 12, 18],
  [11, 14, 14, 14, 16, 14, 16, 18, 18, 10, 12, 7, 15],
  [15, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18],
]

// Which real cities/states each zone code covers — reference only, not read
// by any pricing logic (the actual pincode -> zone lookup isn't modeled yet).
// Zone names/coverage confirmed against Yugal's source sheet (2026-08-27):
// "North East" (Guwahati) and "North East 1" (the other NE states) are kept
// exactly as he labeled them, distinct from the numbered "North East 2" name
// this file used before that reconciliation.
export const ZONE_CLASSIFICATIONS = {
  'North 1': 'National Capital Region (Delhi, Gurugram, Faridabad, Ghaziabad, Meerut & Sonipat)',
  'North 2': 'Uttar Pradesh, Haryana, Punjab, Uttarakhand, J&K & Rajasthan',
  'North 3': 'Himachal Pradesh, Gorakhpur, Ayodhya, Basti, Mirzapur, Bhadohi & Mau',
  'West 1': 'Daman & Diu, Dadra & Nagar Haveli (Silvassa), Mumbai Metropolitan, Surat, Vadodara, Ahmedabad, Indore & Bhopal',
  'West 2': 'Rest of Madhya Pradesh, Chhattisgarh, Rest of Maharashtra (excl. Mumbai) & Rest of Gujarat',
  'South 1': 'Bengaluru & Hyderabad',
  'South 2': 'Karnataka (excl. Bengaluru), Telangana (excl. Hyderabad), Andhra Pradesh & Chennai',
  'South 3': 'Tamil Nadu (excl. Chennai), Puducherry & Cochin',
  'South 4': 'Rest of Kerala',
  'East 1': 'HWH, BHB, Ranchi, Patna, Jamshedpur, Aurangabad & Dhanbad',
  'East 2': 'Rest of West Bengal, Bihar, Odisha & Jharkhand',
  'North East 1': 'Arunachal Pradesh, Meghalaya, Mizoram, Tripura, Manipur, Sikkim & Nagaland',
  'North East': 'Guwahati',
}

// DUMMY — stands in for a real pincode -> zone master lookup (the actual
// "look up origin/destination pincode -> zone" step in the pricing model
// above isn't built yet). A few real leading-digit prefixes per zone give
// this a plausible shape; counts/pincodes are otherwise placeholder, computed
// once here (not re-randomized per render) so the numbers stay stable.
export const ZONE_PINCODE_PREFIXES = {
  'North 1': ['110', '122', '121', '201', '250'],
  'North 2': ['244', '143', '248', '180', '302'],
  'North 3': ['171', '273', '224', '272', '221'],
  'West 1': ['396', '400', '395', '390', '452'],
  'West 2': ['462', '492', '440', '360', '482'],
  'South 1': ['560', '500'],
  'South 2': ['580', '505', '520', '600'],
  'South 3': ['641', '605', '682'],
  'South 4': ['680', '686', '691'],
  'East 1': ['711', '751', '834', '800', '831'],
  'East 2': ['700', '810', '760', '827'],
  'North East 1': ['791', '793', '796', '799', '795'],
  'North East': ['781'],
}

function seededFraction(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export const ZONE_PINCODE_STATS = ZONES.reduce((acc, zone, zi) => {
  const prefixes = ZONE_PINCODE_PREFIXES[zone]
  const examplePincodes = Array.from({ length: 5 }, (_, i) => {
    const prefix = prefixes[i % prefixes.length]
    const suffix = 100 + Math.floor(seededFraction(zi * 97 + i * 13) * 899)
    return `${prefix}${String(suffix).padStart(3, '0')}`
  })
  acc[zone] = {
    pincodeCount: 60 + ((zi * 37) % 340),
    examplePincodes,
  }
  return acc
}, {})

// Tier is a discount off the one standard matrix, not a separate matrix.
export const TIER_DISCOUNTS = { Bronze: 0, Silver: 5, Gold: 10, Platinum: 15 }

export const TIER_BADGE = {
  Platinum: 'bg-violet-50 text-violet-700',
  Gold: 'bg-amber-50 text-amber-700',
  Silver: 'bg-slate-100 text-slate-600',
  Bronze: 'bg-orange-100 text-orange-800',
}

// An order's delivery priority (hub processing/queue order, not the
// Normal/Express service level) defaults off the client's tier — P0 is
// highest (Platinum), P3 lowest (Bronze) — but can be overridden per order.
export const DELIVERY_PRIORITIES = ['P0', 'P1', 'P2', 'P3']
export const TIER_DELIVERY_PRIORITY = { Platinum: 'P0', Gold: 'P1', Silver: 'P2', Bronze: 'P3' }

// Industry-standard volumetric conversion, fixed for every client — not a
// per-client setting, and not shown in the pricing UI. Ops never edits this.
export const VOLUMETRIC_FACTOR_DEFAULT = 6 // 1 CFT = 6 KG

// Every charge is one of these types — a generic pricing engine resolves an
// AWB's charges by type, never by name, so new named charges need no new code.
export const CHARGE_TYPES = {
  flat_per_awb: 'Flat amount, once per AWB',
  per_kg: 'Rate x chargeable weight (kg)',
  percent_of_freight: '% of base freight for that AWB',
  percent_of_cod: '% of the AWB’s COD amount',
  max_of: 'Greater of two or more sub-rules',
  min_of: 'Lesser of two or more sub-rules',
  actuals: 'Billed at cost incurred — not pre-computable, added at POD/invoicing',
}

export const STANDARD_CHARGES = [
  { id: 'docket', label: 'Docket Charges', type: 'flat_per_awb', value: 50, unit: '₹ / AWB', locked: false },
  { id: 'fov', label: 'FOV (Freight on Value)', type: 'flat_per_awb', value: 100, unit: '₹ / AWB', locked: false },
  {
    id: 'oda',
    label: 'ODA (Out of Delivery Area)',
    type: 'max_of',
    options: [
      { type: 'per_kg', value: 2 },
      { type: 'flat_per_awb', value: 500 },
    ],
    unit: 'higher of ₹/kg or ₹/AWB',
    locked: false,
  },
  { id: 'fsc', label: 'Fuel Surcharge (FSC)', type: 'percent_of_freight', value: 15, unit: '% of base freight', locked: false },
  { id: 'rto', label: 'RTO Charges', type: 'percent_of_freight', value: 50, unit: '% of forward freight', locked: false },
  { id: 'cod_fee', label: 'COD Collection Charges', type: 'percent_of_cod', value: 1.5, unit: '% of COD amount', locked: false },
  { id: 'mathadi', label: 'Mathadi / Union Charges', type: 'actuals', value: null, unit: 'billed at actuals', locked: false },
  { id: 'min_wt', label: 'Minimum Chargeable Weight', type: 'flat_per_awb', value: 25, unit: 'kg floor per AWB', locked: false, isWeightFloor: true },
  { id: 'gst', label: 'GST', type: 'percent_of_freight', value: 18, unit: '% statutory — not negotiable', locked: true },
]

function round1(n) {
  return Math.round(n * 10) / 10
}

export function computeEffectiveMatrix(tier) {
  const discount = TIER_DISCOUNTS[tier] ?? 0
  return computeMatrixAtDiscount(discount)
}

// Tier suggests a discount %, but ops can type any value — the matrix always
// follows whatever % is actually entered, not a fixed tier->matrix mapping.
export function computeMatrixAtDiscount(discountPercent) {
  const discount = Number(discountPercent) || 0
  return STANDARD_MATRIX.map((row) => row.map((v) => round1(v * (1 - discount / 100))))
}

// Standard rate card revision history — mock version log for the "View
// previous rate cards" list on Client Pricing Configuration. Stores diffs
// (which cells changed, old -> new), not full matrix snapshots, since that's
// what an audit trail actually needs to show. The last entry (effectiveTo:
// null) is the currently live version and matches STANDARD_MATRIX above.
export const RATE_CARD_HISTORY_SEED = [
  {
    id: 'v1',
    effectiveFrom: '2025-04-01',
    effectiveTo: '2025-11-14',
    updatedBy: 'Rohan Mehta',
    changes: null,
  },
  {
    id: 'v2',
    effectiveFrom: '2025-11-15',
    effectiveTo: null,
    updatedBy: 'Priya Sharma',
    changes: [
      { origin: 'North 1', dest: 'South 2', from: 10.5, to: 11 },
      { origin: 'West 1', dest: 'East 2', from: 9, to: 9.5 },
      { origin: 'South 1', dest: 'North East 1', from: 13.5, to: 14 },
    ],
  },
]

export function matrixArrayToObject(matrixRows) {
  const obj = {}
  ZONES.forEach((origin, i) => {
    obj[origin] = {}
    ZONES.forEach((dest, j) => {
      obj[origin][dest] = matrixRows[i][j]
    })
  })
  return obj
}

export function cloneStandardCharges() {
  return STANDARD_CHARGES.map((c) => ({ ...c, options: c.options ? c.options.map((o) => ({ ...o })) : undefined }))
}

// Additional Charges master (Client Pricing Configuration > Additional
// Charges tab) — every charge type carries ONE default rule + price
// (`rule`, shown pre-formatted as `defaultValue`) rather than a list of
// allowed rule shapes. Docket and Xcpn are separate rows; ODA was dropped
// from ESS/ODA (kept as its own "ESS (Emergency Situation Surcharge)"); RTO
// Charges/COD Collection Charges/Mathadi/Insurance Charges/Liability/Credit
// Period/CFT/POD are all out — none of these are rule-shaped charges a
// pricing engine resolves at booking time (Liability/Credit
// Period/CFT/POD were commercial/policy terms, not charges).
// Each charge's default rule can be switched to any type in RULES_CATALOG
// below via the row's edit action — "which rule types this charge is
// allowed to use" is no longer restricted per charge (Yugal: "All rule list
// will come for all types of charges"). The rule TYPES themselves are a
// closed catalog — see RULES_CATALOG's own note — only their per-charge
// values are editable here.
export const ADDITIONAL_CHARGES_MASTER = [
  {
    name: 'Docket Charges',
    defaultValue: '₹50 per AWB',
    rule: { type: 'flat_per_awb', value: 50 },
  },
  {
    name: 'Exception Charges',
    defaultValue: '₹50 per AWB',
    rule: { type: 'flat_per_awb', value: 50 },
  },
  {
    name: 'FOV: Owner Risk',
    defaultValue: '₹50 per AWB',
    rule: { type: 'flat_per_awb', value: 50 },
  },
  {
    name: 'FSC (Fuel Surcharge)',
    defaultValue: '5% on Basic Freight',
    rule: { type: 'percent_of_freight', value: 5 },
  },
  {
    name: 'ESS (Emergency Situation Surcharge)',
    defaultValue: '₹3 per kg or ₹750 per AWB, whichever is higher',
    rule: { type: 'max_of', options: [{ type: 'per_kg', value: 3 }, { type: 'flat_per_awb', value: 750 }] },
  },
  {
    name: 'Appointment',
    defaultValue: '₹750 per AWB',
    rule: { type: 'flat_per_awb', value: 750 },
  },
  {
    name: 'Handling',
    defaultValue: 'Up to 200 kg: NIL — above 200 kg: ₹0.75 per kg or ₹400 minimum, whichever is higher',
    rule: {
      type: 'range_by_weight',
      bands: [
        { uptoKg: 200, rule: { type: 'nil' } },
        { uptoKg: null, rule: { type: 'max_of', options: [{ type: 'per_kg', value: 0.75 }, { type: 'flat_per_awb', value: 400 }] } },
      ],
    },
  },
  {
    name: 'Minimum Freight',
    defaultValue: '₹400 + GST',
    rule: { type: 'flat_per_awb', value: 400 },
  },
]

// Closed catalog of rule shapes a charge's default can use — "New Rules
// can't be created" from this UI (per Yugal: contact Tech Admin for that);
// ops can only switch which of these a charge type uses, and what its value
// is. Shown read-only, with formula + description, in the "Rules List"
// modal next to "Create new charge type".
export const RULES_CATALOG = [
  { type: 'flat_per_awb', label: 'Flat amount per AWB', formula: '₹X per AWB', description: 'A fixed amount charged once per AWB/shipment, regardless of weight or freight value.' },
  { type: 'per_kg', label: 'Rate per kg (chargeable weight)', formula: '₹X × chargeable weight (kg)', description: "Scales with the AWB's chargeable weight — the more it weighs, the more it charges." },
  { type: 'percent_of_freight', label: '% of Basic Freight', formula: 'X% × Basic Freight', description: "A percentage of the AWB's base freight amount." },
  { type: 'percent_of_cod', label: '% of COD amount', formula: 'X% × COD amount', description: 'A percentage of the amount collected on delivery (COD).' },
  { type: 'max_of', label: 'Higher of (2+ rules)', formula: 'MAX(rule 1, rule 2, …)', description: 'Resolves two or more sub-rules and charges whichever amount is higher.' },
  { type: 'min_of', label: 'Lower of (2+ rules)', formula: 'MIN(rule 1, rule 2, …)', description: 'Resolves two or more sub-rules and charges whichever amount is lower.' },
  { type: 'range_by_weight', label: 'Range based on chargeable weight', formula: 'Different sub-rule per weight band', description: 'Applies a different rule depending on which chargeable-weight band the AWB falls into.' },
  { type: 'actuals', label: 'Billed at actuals', formula: 'Billed at cost incurred', description: 'Not pre-computable at booking time — the real cost is added later, at POD/invoicing.' },
]

// {type: label} view of RULES_CATALOG above — kept as its own export since
// that flat shape (a <select>'s options, a lookup by key) is what most of
// the UI actually wants, without every caller re-deriving it.
export const CHARGE_RULE_TYPES = Object.fromEntries(RULES_CATALOG.map((r) => [r.type, r.label]))

// Sub-rule types selectable inside a max_of or a weight band — deliberately
// narrower than the top-level list (no nested max_of-of-max_of, no nested
// ranges) so the builder can't be driven into an unrenderable/meaningless shape.
export const SIMPLE_RULE_TYPES = {
  flat_per_awb: 'Flat amount per AWB',
  per_kg: 'Rate per kg',
  percent_of_freight: '% of Basic Freight',
  percent_of_cod: '% of COD amount',
}

function formatSimpleRule(rule) {
  switch (rule.type) {
    case 'nil':
      return 'NIL'
    case 'flat_per_awb':
      return `₹${rule.value} per AWB`
    case 'per_kg':
      return `₹${rule.value} per kg`
    case 'percent_of_freight':
      return `${rule.value}% on Basic Freight`
    case 'percent_of_cod':
      return `${rule.value}% of COD amount`
    case 'max_of':
      return `${rule.options.map(formatSimpleRule).join(' or ')}, whichever is higher`
    case 'min_of':
      return `${rule.options.map(formatSimpleRule).join(' or ')}, whichever is lower`
    case 'actuals':
      return 'Billed at actuals'
    default:
      return ''
  }
}

// Turns a structured rule (built by the "Create new charge type" modal) into
// the same human-readable string style already used by the hand-written
// entries above, so the master table's rendering never has to know whether
// a row's defaultValue came from free text (the original 8) or a rule.
export function formatChargeRule(rule) {
  if (rule.type === 'range_by_weight') {
    return rule.bands
      .map((band, i) => {
        const label = i === rule.bands.length - 1 ? `Above ${rule.bands[i - 1].uptoKg} kg` : `Up to ${band.uptoKg} kg`
        return `${label}: ${formatSimpleRule(band.rule)}`
      })
      .join(' — ')
  }
  return formatSimpleRule(rule)
}

export function emptyChargeRule(type) {
  if (type === 'max_of' || type === 'min_of') {
    return { type, options: [{ type: 'per_kg', value: '' }, { type: 'flat_per_awb', value: '' }] }
  }
  if (type === 'range_by_weight') {
    return {
      type,
      bands: [
        { uptoKg: '', rule: { type: 'nil' } },
        { uptoKg: null, rule: { type: 'flat_per_awb', value: '' } },
      ],
    }
  }
  if (type === 'actuals') return { type }
  return { type, value: '' }
}

function isSimpleRuleValid(rule) {
  if (rule.type === 'nil' || rule.type === 'actuals') return true
  if (rule.type === 'max_of' || rule.type === 'min_of') return rule.options.length >= 2 && rule.options.every(isSimpleRuleValid)
  return rule.value !== '' && !Number.isNaN(Number(rule.value))
}

export function isChargeRuleValid(rule) {
  if (rule.type === 'range_by_weight') {
    return rule.bands.every((band, i) => (i < rule.bands.length - 1 ? band.uptoKg !== '' && !Number.isNaN(Number(band.uptoKg)) : true) && isSimpleRuleValid(band.rule))
  }
  return isSimpleRuleValid(rule)
}

// Stand-in for the real pincode -> zone master lookup (step 1 of the pricing
// model above) — matches by leading-digit prefix against the same
// ZONE_PINCODE_PREFIXES table the Pincode mapping search on Client Pricing
// Configuration already uses for its example rows. Longest-prefix-first so a
// more specific prefix (if any ever overlap) wins; today all prefixes are 3
// digits so this is really just "first match".
export function zoneFromPincode(pincode) {
  const pin = String(pincode || '').trim()
  if (!/^\d{6}$/.test(pin)) return null
  const entries = Object.entries(ZONE_PINCODE_PREFIXES).sort((a, b) => b[1][0].length - a[1][0].length)
  for (const [zone, prefixes] of entries) {
    if (prefixes.some((p) => pin.startsWith(p))) return zone
  }
  return null
}

// Resolves one charge (in the STANDARD_CHARGES/client.charges shape — see
// cloneStandardCharges in data/clients.js) to a ₹ amount for a given AWB,
// per the ~6 CHARGE_TYPES a pricing engine needs to understand. Returns null
// for `actuals` (not pre-computable at booking time — billed later).
export function resolveChargeAmount(charge, { chargeableWeightKg, baseFreight, codAmount = 0 }) {
  switch (charge.type) {
    case 'flat_per_awb':
      return charge.value
    case 'per_kg':
      return round1(charge.value * chargeableWeightKg)
    case 'percent_of_freight':
      return round1((charge.value / 100) * baseFreight)
    case 'percent_of_cod':
      return round1((charge.value / 100) * codAmount)
    case 'max_of':
      return Math.max(...charge.options.map((o) => resolveChargeAmount(o, { chargeableWeightKg, baseFreight, codAmount })))
    case 'min_of':
      return Math.min(...charge.options.map((o) => resolveChargeAmount(o, { chargeableWeightKg, baseFreight, codAmount })))
    case 'actuals':
      return null
    default:
      return 0
  }
}

// The client's own minimum-chargeable-weight floor — split out from
// computeOrderPricing so the New Order form can show it (and the chargeable
// weight it drives) the moment a client is picked, without waiting on
// pincodes/zone lookup to resolve a full pricing preview.
export function minChargeableWeightForClient(client) {
  const floorCharge = client?.charges?.find((c) => c.isWeightFloor)
  return floorCharge ? floorCharge.value : 0
}

// Full AWB-level pricing per the module header's 5-step model: zone lookup,
// chargeable weight (incl. the client's own min-weight-floor charge), base
// freight off the client's tiered matrix, every non-floor/non-locked charge
// resolved by type (COD Collection only when the order is actually COD),
// then GST on top of freight + those charges. `client` is a My Clients record
// (carries `tier`/`matrix`/`charges` from seedClientPricing).
export function computeOrderPricing(client, { originPincode, destPincode, actualWeightKg, volumetricWeightKg, paymentType, codAmount = 0 }) {
  const originZone = zoneFromPincode(originPincode)
  const destZone = zoneFromPincode(destPincode)
  const minChargeableWeightKg = minChargeableWeightForClient(client)
  const chargeableWeightKg = Math.max(actualWeightKg || 0, volumetricWeightKg || 0, minChargeableWeightKg)

  const ratePerKg = originZone && destZone ? client.matrix[originZone]?.[destZone] : null
  const baseFreight = ratePerKg != null ? round1(ratePerKg * chargeableWeightKg) : null

  let appliedCharges = []
  let chargesTotal = 0
  let gstAmount = null
  let total = null

  if (baseFreight != null) {
    appliedCharges = client.charges
      .filter((c) => !c.isWeightFloor && !c.locked && c.id !== 'rto' && (c.id !== 'cod_fee' || paymentType === 'COD'))
      .map((c) => ({ id: c.id, label: c.label, amount: resolveChargeAmount(c, { chargeableWeightKg, baseFreight, codAmount }) }))
    chargesTotal = appliedCharges.reduce((sum, c) => sum + (c.amount ?? 0), 0)

    const gstCharge = client.charges.find((c) => c.locked && c.type === 'percent_of_freight')
    gstAmount = gstCharge ? round1((gstCharge.value / 100) * (baseFreight + chargesTotal)) : 0
    total = round1(baseFreight + chargesTotal + gstAmount)
  }

  return { originZone, destZone, minChargeableWeightKg, chargeableWeightKg, ratePerKg, baseFreight, appliedCharges, gstAmount, total }
}
