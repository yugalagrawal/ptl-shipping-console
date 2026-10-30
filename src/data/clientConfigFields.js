// Per-client operational configuration — how PICKUP/booking/handling actually
// happens for this specific client, distinct from Client Pricing (rate card)
// and from onboarding/KYC. Field list and options are Yugal's reference set
// (dummy but domain-real, sourced from the legacy Softpal-era client
// configuration sheet); "Preferred Ideal" is the default every new client
// starts on until someone picks something else for them.
export const DOCKET_SERIES_AUTO = 'System Generated (Auto)'
export const DOCKET_SERIES_ASSIGNED = 'Assigned Series'

// Client charges not covered by a named line above — kept in sync with what Create Docket rolls into "Others".
export const PRICING_CONDITION_OTHERS = ['pc-others-cod_fee', 'pc-others-mathadi']

export const CLIENT_CONFIG_FIELDS = [
  {
    id: 'docket-series',
    label: 'Docket Series',
    options: [DOCKET_SERIES_AUTO, DOCKET_SERIES_ASSIGNED],
    default: DOCKET_SERIES_AUTO,
  },
  {
    id: 'pricing-on-docket',
    label: 'Print Pricing on Docket',
    options: ['Yes', 'No'],
    default: 'Yes',
  },
  // Docket terms — what a new docket starts on for this client (the driver/ops can still change it per docket).
  {
    id: 'docket-payment-term',
    label: 'Payment Term',
    options: ['Paid', 'To-Pay', 'TBB'],
    default: 'To-Pay',
  },
  {
    id: 'docket-risk-cover',
    label: 'Risk Cover',
    options: ["Owner's Risk", "Carrier's Risk"],
    default: "Carrier's Risk",
  },
  {
    id: 'docket-pod-type',
    label: 'Proof of Delivery',
    options: ['ePOD', 'Hardcopy', 'Consignor DC', 'Consignee GRN'],
    default: 'ePOD',
  },
  {
    id: 'docket-gst-payable-by',
    label: 'GST Payable By',
    options: ['Consignor', 'Consignee', 'LT'],
    default: 'Consignor',
  },
  {
    id: 'booking-data-exchange',
    label: 'Booking Data Exchange',
    options: [
      'Booking API Single Ping',
      'Booking API Double Ping',
      'Booking Excel Invoice w/ EWB (Column Mapping against Standard Excel Template)',
      'Booking Excel Box ID w/ EWB (Column Mapping against Standard Excel Template)',
      'Two Step Booking Excel EWB (Column Mapping against Standard Excel Template)',
      'Manual',
    ],
    default: 'Booking API Single Ping',
  },
  {
    id: 'pickup-frequency',
    label: 'PickUp Frequency',
    options: ['Recurring Regular', 'Random Repeat', 'One Time (Many Lines Below made Irrelevant)'],
    default: 'Recurring Regular',
  },
  {
    id: 'customer-tracking-reference',
    label: 'Customer Tracking Reference',
    options: ['Docket No.', 'EWB No.', 'Customer Lot No. (ASN/TCN/SP/LR etc.)', 'Invoice No.'],
    default: 'Invoice No.',
  },
  {
    id: 'booking-sequence',
    label: 'Booking Sequence',
    options: ['EWB First, Then Docket', 'Docket First, Then EWB', 'NO EWB, Only Docket'],
    default: 'EWB First, Then Docket',
  },
  {
    id: 'ewb-count-per-docket',
    label: 'EWB Count Per Docket',
    options: ['One-EWB-One-Docket (Default)', 'Multi-EWB-One-Docket (Exception Approval Reqd)'],
    default: 'One-EWB-One-Docket (Default)',
  },
  {
    id: 'avg-packs-per-docket',
    label: 'Avg. Packs Per Docket',
    options: ['One-to-One', '<50 Few-in-One', '>50 Big Lot as One'],
    default: '<50 Few-in-One',
  },
  {
    id: 'pickup-check-requirement',
    label: 'PickUp Check Requirement',
    options: ['Closed PickUp NO Check', 'Open PickUp Piece Count Check', 'Open PickUp Damage Check'],
    default: 'Closed PickUp NO Check',
  },
  {
    id: 'lot-handover-sorted-or-mixed',
    label: 'Lot Handover Sorted or Mixed',
    options: ['Consignee Packs Sorted', 'Customer Lot ID Packs Sorted', 'Invoice Packs Sorted', 'Multi Dockets Mixed Packs'],
    default: 'Consignee Packs Sorted',
  },
  {
    id: 'box-handover-count',
    label: 'Box Handover Count',
    options: ["Count 'Match' Handover", "(Box Select) Reject 'Extra' Handover", "(Box Search) Find 'Short' Handover"],
    default: "Count 'Match' Handover",
  },
  {
    id: 'customer-box-id',
    label: 'Customer Box ID',
    options: ['Customer Box ID Barcode Sticker', 'NO Customer Box ID Barcode'],
    default: 'Customer Box ID Barcode Sticker',
  },
  {
    id: 'pack-sticker-carry-print-process',
    label: "Pack Sticker 'Carry/Print' Process",
    options: [
      'OnLine Print',
      'PrePrint Roll (To be Carried)',
      'Use Customer Box ID Sticker (Pack # clash avoidance Check required)',
      'NO Sticker',
    ],
    default: 'OnLine Print',
  },
  {
    id: 'pack-sticker-stick-process',
    label: "Pack Sticker 'Stick' Process",
    options: ['Stick Many Boxes Back-To-Back', 'Stick One Box At A Time (Default for B2P)', 'NO New Sticker'],
    default: 'Stick Many Boxes Back-To-Back',
  },
  {
    id: 'pack-sticker-scan-process',
    label: "Pack Sticker 'Scan' Process",
    options: ['Each Scan (Default)', 'Range Scan (Bulk option) (Pack Count Check mandatory)'],
    default: 'Each Scan (Default)',
  },
  {
    id: 'pack-sticker-map-process',
    label: "Pack Sticker 'Map' Process",
    options: [
      'Docket - to - Pack (D2P)',
      'Customer Lot ID - to - Pack (L2P)',
      'Invoice - to - Pack (I2P)',
      'Customer Box ID - to - Pack (B2P)',
    ],
    default: 'Docket - to - Pack (D2P)',
  },
  {
    id: 'box-size-standardization',
    label: 'Box Size Standardization',
    options: ['Standard Sizes <10', 'Standard Sizes >10', 'NO Standardization'],
    default: 'Standard Sizes <10',
  },
  {
    id: 'pack-lbh-data',
    label: 'Pack LBH Data',
    options: ['Available Thru Booking API', 'Available in Booking Excel', 'KYC Box Dimension Master', 'Measure Manually'],
    default: 'KYC Box Dimension Master',
  },
  {
    id: 'pack-actual-weight-gross',
    label: 'Pack Actual Weight (Gross)*',
    options: ['Available Thru Booking API', 'Available in Booking Excel', 'Measure Manually At PickUp', 'Reconfirm Manually At Delivery'],
    default: 'Reconfirm Manually At Delivery',
  },
  {
    id: 'consignor-document-handover',
    label: 'Consignor Document Handover',
    options: ['Only Invoice & EWB', 'Additional Consignor DC for POD', 'Others (Please Specify)'],
    default: 'Only Invoice & EWB',
  },
  {
    id: 'handover-takeover-point',
    label: 'Handover Takeover Point',
    options: ['TakeOver at Bay', 'TakeOver in Warehouse Ground Floor', 'TakeOver in Warehouse Upper Floor'],
    default: 'TakeOver at Bay',
  },
  {
    id: 'each-pickup-load-estimate',
    label: 'Each PickUp Load Estimate',
    options: ['< 0.5 Ton', '< 1 Ton', '< 2 Ton', '< 5 Ton', '< 10 Ton', '> 10 Ton'],
    default: '< 2 Ton',
  },
  {
    id: 'additional-handling-manpower',
    label: 'Additional Handling Manpower',
    options: ['NO Additional Manpower', 'Additional Manpower Required (Specify Count)'],
    default: 'NO Additional Manpower',
  },
  {
    id: 'additional-assets-required',
    label: 'Additional Assets Required*',
    options: ['NO Additional Assets', 'Barcode Printer (Sling / Desktop)', 'Barcode Scanner (Retail / Advanced)', 'Laptop', 'Laser Printer'],
    default: 'NO Additional Assets',
  },
  {
    id: 'pickup-vehicle-type',
    label: 'PickUp Vehicle Type',
    options: ['Standard GOP Closed Vehicle', 'Customer Specific Vehicle (Specify)', 'Open Vehicle'],
    default: 'Standard GOP Closed Vehicle',
  },
  {
    id: 'site-truck-cargo-restrictions',
    label: 'Site Truck Cargo Restrictions',
    options: ['NO Restrictions', 'Co-Travel Cargo Restriction (Specify)', 'Empty Truck At Site Entry'],
    default: 'NO Restrictions',
  },
  {
    id: 'site-truck-inout-gate-pass',
    label: 'Site Truck InOut Gate Pass',
    options: ['NO InOut Gate Pass Entry & Exit', 'GateIn Pass Entry', 'GateOut Pass Exit', 'Both GateIn & GateOut Pass'],
    default: 'NO InOut Gate Pass Entry & Exit',
  },
  {
    id: 'post-pickup-truck-lock',
    label: 'Post PickUp Truck Lock',
    options: ['GOP Truck Lock', 'Truck One Time OTL Lock (OTL Code Share to SOL)', 'Digital OTP Truck Lock', 'NO Truck Lock'],
    default: 'GOP Truck Lock',
  },
  {
    id: 'pickup-confirmation-mode',
    label: 'PickUp Confirmation Mode',
    options: ['Sender OTP Confirmation', 'Sender Signature on Docket'],
    default: 'Sender OTP Confirmation',
  },
  {
    id: 'docket-form-submission',
    label: 'Docket Form Submission*',
    options: [
      'Carbon Copy Docket',
      'Order ID Close Send Docket Email',
      'PRS Close Send Docket Email',
      'Docket Print Submit Same EODay',
      'Docket Print Submit Next Day',
    ],
    default: 'Order ID Close Send Docket Email',
  },
  {
    id: 'track-n-trace-data-push',
    label: 'Track-n-Trace Data Push',
    options: ['Customer App', 'Track-n-Trace API', 'Daily Email Excel MIS', 'Manual Tele Response'],
    default: 'Customer App',
  },
  // Pricing Conditions — when each additional charge is applied to this client's dockets. Create
  // Docket pre-ticks the charge from the option picked here; ops can still tick/untick it per docket.
  {
    id: 'pc-exception',
    label: 'Exception Charges',
    options: ['Never', 'Always', 'When an exception is raised'],
    default: 'When an exception is raised',
  },
  {
    id: 'pc-fov',
    label: 'FOV: Owner Risk',
    options: ['Never', 'Always', "When Owner's Risk is selected"],
    default: "When Owner's Risk is selected",
  },
  {
    id: 'pc-fsc',
    label: 'FSC (Fuel Surcharge)',
    options: ['Always', 'Never'],
    default: 'Always',
  },
  {
    id: 'pc-ess',
    label: 'ESS (Emergency Situation Surcharge)',
    options: ['Never', 'Always', 'While an emergency is declared'],
    default: 'While an emergency is declared',
  },
  {
    id: 'pc-handling',
    label: 'Handling',
    options: ['Never', 'Always', 'Above 200 kg chargeable weight'],
    default: 'Above 200 kg chargeable weight',
  },
  // "Others" is a group: every client charge the lines above don't cover gets its own condition.
  {
    id: 'pc-others-cod_fee',
    label: 'COD Collection Charges',
    options: ['Always', 'Never'],
    default: 'Always',
  },
  {
    id: 'pc-others-mathadi',
    label: 'Mathadi / Union Charges',
    options: ['Always', 'Never'],
    default: 'Always',
  },
]

export const CLIENT_CONFIG_FIELDS_BY_ID = Object.fromEntries(CLIENT_CONFIG_FIELDS.map((f) => [f.id, f]))

// 30 dropdowns in one flat list is too much to scan at once — grouped into
// 3 tabs max (Yugal: 5 was "too much partition"), each broken further into a
// couple of full-width cards of closely related fields. Every field still
// renders as a plain dropdown (ConfigField in ClientConfiguration.jsx) —
// this is purely a layout/grouping concern, not a change in field type.
export const CLIENT_CONFIG_TABS = [
  {
    id: 'consignor-consignee',
    label: 'Consignor & Consignee',
    cards: [],
  },
  {
    id: 'booking-tracking',
    label: 'Pickup & Docket',
    cards: [
      // Only Docket Series is live for now; Booking Sequence and EWB Count Per
      // Docket stay defined above but are hidden until their behaviour is built.
      {
        title: 'Docket Settings',
        icon: 'invoice',
        fieldIds: ['docket-series', 'pricing-on-docket', 'docket-payment-term', 'docket-risk-cover', 'docket-pod-type', 'docket-gst-payable-by'],
        rows: [['docket-series', 'pricing-on-docket'], ['docket-payment-term', 'docket-risk-cover', 'docket-pod-type', 'docket-gst-payable-by']],
      },
      {
        title: 'Pricing Conditions',
        icon: 'calculator',
        layout: 'conditions', // listed like the docket's pricing panel; Others expands into its own charges
        fieldIds: ['pc-exception', 'pc-fov', 'pc-fsc', 'pc-ess', 'pc-handling'],
        othersFieldIds: PRICING_CONDITION_OTHERS,
      },
      // Not built yet — the card keeps its dropdowns (dimmed, read-only) under a "Yet to be built" tag.
      {
        title: 'Tracking & Data Exchange',
        icon: 'swap',
        yetToBuild: true,
        fieldIds: ['booking-data-exchange', 'customer-tracking-reference', 'docket-form-submission', 'track-n-trace-data-push'],
      },
    ],
  },
  {
    id: 'packaging-handling',
    label: 'Packaging & Handling',
    cards: [
      {
        title: 'Pack Identification & Labeling',
        icon: 'tag',
        fieldIds: [
          'customer-box-id',
          'avg-packs-per-docket',
          'pack-sticker-carry-print-process',
          'pack-sticker-stick-process',
          'pack-sticker-scan-process',
          'pack-sticker-map-process',
        ],
      },
      { title: 'Dimensions & Weight', icon: 'calculator', fieldIds: ['box-size-standardization', 'pack-lbh-data', 'pack-actual-weight-gross'] },
      {
        title: 'Handover & Documentation',
        icon: 'approve',
        fieldIds: ['lot-handover-sorted-or-mixed', 'box-handover-count', 'consignor-document-handover'],
      },
    ],
  },
  {
    id: 'pickup-vehicle-site',
    label: 'Pickup, Vehicle & Site',
    cards: [
      {
        title: 'Pickup Schedule & Checks',
        icon: 'route',
        fieldIds: ['pickup-frequency', 'pickup-check-requirement', 'pickup-confirmation-mode', 'handover-takeover-point'],
      },
      { title: 'Load & Manpower', icon: 'truck', fieldIds: ['each-pickup-load-estimate', 'additional-handling-manpower', 'additional-assets-required'] },
      {
        title: 'Vehicle & Site Security',
        icon: 'shield',
        fieldIds: ['pickup-vehicle-type', 'site-truck-cargo-restrictions', 'site-truck-inout-gate-pass', 'post-pickup-truck-lock'],
      },
    ],
  },
]

// Session-only "saved" configuration per client — a real backend would own
// this; here it's just an in-memory map so switching away and back to the
// same client within a session doesn't lose what was saved (same "mutate a
// shared in-memory store" convention used for pricing/user-permission edits
// elsewhere in this prototype). Unsaved edits still live in the page's own
// component state until Save is clicked.
const CLIENT_CONFIG_STORE = {}

export function defaultClientConfigValues() {
  // `docket-series-ranges` isn't a dropdown — it's the From–To ranges shown
  // under Docket Series when it's set to Assigned Series (see data/docketSeries.js).
  return { ...Object.fromEntries(CLIENT_CONFIG_FIELDS.map((f) => [f.id, f.default])), 'docket-series-ranges': [] }
}

export const allSavedClientConfigs = () => Object.entries(CLIENT_CONFIG_STORE)

export function getClientConfigValues(clientId) {
  return { ...defaultClientConfigValues(), ...(CLIENT_CONFIG_STORE[clientId] ?? {}) }
}

export function saveClientConfigValues(clientId, values) {
  CLIENT_CONFIG_STORE[clientId] = { ...values }
}
