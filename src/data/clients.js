import { computeEffectiveMatrix, matrixArrayToObject, cloneStandardCharges } from './pricing.js'
import { reopenActivationForCorrection } from './activations.js'

// Two-stage Client Approvals: Sales Admin reviews everything except Billing &
// Pricing first (identity/GSTIN/KYC completeness); only once they clear that
// does the client move to Finance Admin, who reviews the matrix + additional
// charges and is the one who actually activates the client. Same page/list
// for both — the stage just decides which panel + action a viewer sees for
// that row (see ClientApprovals.jsx), gated by client-approvals.manage-onboarding
// vs client-approvals.manage (data/permissions.js).
// Sales Admin's own stage is actually two independent sign-offs, not one
// click: `onboardingApproved` (approveOnboarding) marks the KYC/company/
// contact/billing details as reviewed, then a separate "Approve Pricing
// details" action (sendPricingToFinance) is what advances approvalStage to
// FINANCE_REVIEW — see the two exported functions near the bottom of this
// file.
export const APPROVAL_STAGE = {
  SALES_REVIEW: 'sales_review',
  FINANCE_REVIEW: 'finance_review',
}

export const APPROVAL_STAGE_LABEL = {
  [APPROVAL_STAGE.SALES_REVIEW]: 'Pending Sales Approval',
  [APPROVAL_STAGE.FINANCE_REVIEW]: 'Pending Finance Approval',
}

export const APPROVAL_STAGE_BADGE = {
  [APPROVAL_STAGE.SALES_REVIEW]: 'bg-amber-50 text-amber-700',
  [APPROVAL_STAGE.FINANCE_REVIEW]: 'bg-sky-50 text-sky-700',
}

// Shared by every client record, active or pending — every client that can be
// booked against carries a pricing profile, so any row can expand to show it.
// Volumetric weight conversion is NOT part of this per-client profile — it's a
// fixed industry-standard constant (VOLUMETRIC_FACTOR_DEFAULT in pricing.js),
// applied the same way for every client at booking time, not something ops sets.
function seedClientPricing({ tier }) {
  return {
    tier,
    matrix: matrixArrayToObject(computeEffectiveMatrix(tier)),
    charges: cloneStandardCharges(),
  }
}

// Stand-in "uploaded" file for seed/demo pending clients — same shape a real
// wizard upload produces (a File), so ClientApprovals' document links render
// exactly like a real submission would (View opens an empty PDF blob).
function dummyFile(name) {
  return new File(['dummy'], name, { type: 'application/pdf' })
}

// Full wizard snapshot builder for demo pending clients — mirrors the shape
// NewClient.jsx's handleNext() actually submits, so Sales Admin's review
// panel has every field to show, not just the identity/GSTIN/KYC summary.
function sampleDetails({ company = {}, contact = {}, identifications, billing = {}, documents } = {}) {
  return {
    company: {
      groupName: '', legalName: '', tradeName: '', pan: '', organisationType: 'Company', paymentType: 'Credit Customer', customerCode: '',
      fullAddress: '', pincode: '', city: '', state: '', country: 'India',
      sacNumber: '', hsnNumber: '', tanNumber: '', msmeNumber: '', panDocument: dummyFile('pan-card.pdf'),
      ...company,
    },
    contact: {
      pocName: '', phoneCode: '🇮🇳 +91', pocMobile: '', pocEmail: '', opsEmail: '', financeEmail: '', salesPerson: '',
      ...contact,
    },
    identifications: identifications ?? [
      {
        id: 1, idType: 'GSTIN', idNumber: '', country: 'India', address: company.fullAddress ?? '', pincode: company.pincode ?? '',
        city: company.city ?? '', state: company.state ?? '', document: dummyFile('gstin-certificate.pdf'),
      },
    ],
    billing: {
      contractStart: '2026-08-01', contractEnd: '2027-07-31', contractExecutionDate: '2026-07-28', billingPeriod: 'Fortnightly',
      billPrintFormat: '7-Arrow', creditLimit: '500000', centralisedPayment: false, billingState: '', billingCity: '', billingBranch: '',
      securityDeposit: false, securityDepositAmount: '', securityDepositPaid: 'No', depositPaymentDate: '', depositPaymentType: 'Cheque', depositReferenceNo: '',
      taxExemption: false, fuelSurchargeExemption: false, expectedVolumeKg: '2500', volumeUnit: 'Kg',
      copyRatesEnabled: false, copyRatesFrom: '', billingDocuments: [{ id: 1, type: 'Rate Card', file: dummyFile('rate-card.pdf') }],
      ...billing,
    },
    documents: documents ?? [
      { id: 1, type: 'PAN Card', file: null },
      { id: 2, type: 'GST Certificate', file: dummyFile('gst-certificate.pdf') },
    ],
  }
}

export const ACTIVE_CLIENTS_SEED = [
  {
    id: 'nykaa',
    name: 'Nykaa',
    groupId: 'GRP-003',
    gstin: '27AAACN5678B1Z2',
    city: 'Mumbai',
    state: 'Maharashtra',
    creditLimit: '₹12,00,000',
    paymentType: 'Credit Customer',
    onboardedOn: '02 Jan 2026',
    onboardedAt: '2026-01-02',
    contractEnd: '2027-01-01',
    // High-volume clients can be assigned their own dedicated AWB/docket
    // series instead of drawing from the shared national one — see
    // generateAwbNumber() in data/orders.js. Most clients don't get one
    // (fall back to the national series); Nykaa is the one demo client with
    // a dedicated block, so New Order's Freight Preview has something real
    // to show for both cases.
    awbSeries: { prefix: 'NYK', nextSerial: 501 },
    ...seedClientPricing({ tier: 'Platinum' }),
  },
  {
    id: 'lenskart',
    name: 'Lenskart',
    groupId: 'GRP-004',
    gstin: '07AAACL9012C1Z8',
    city: 'New Delhi',
    state: 'Delhi',
    creditLimit: '₹8,00,000',
    paymentType: 'Credit Customer',
    onboardedOn: '18 Nov 2025',
    onboardedAt: '2025-11-18',
    contractEnd: '2026-11-17',
    ...seedClientPricing({ tier: 'Gold' }),
  },
  {
    id: 'oriflame',
    name: 'Oriflame',
    groupId: 'GRP-005',
    gstin: '29AAACO1234A1Z5',
    city: 'Bengaluru',
    state: 'Karnataka',
    creditLimit: '₹5,00,000',
    paymentType: 'Prepaid Customer',
    onboardedOn: '12 Mar 2026',
    onboardedAt: '2026-03-12',
    contractEnd: '2027-03-11',
    ...seedClientPricing({ tier: 'Gold' }),
  },
  {
    id: 'mamaearth',
    name: 'Mamaearth',
    groupId: 'GRP-006',
    gstin: '06AAACM3456D1Z1',
    city: 'Gurugram',
    state: 'Haryana',
    creditLimit: '₹2,50,000',
    paymentType: 'Cash Customer',
    onboardedOn: '2 hours ago',
    onboardedAt: '2026-08-19',
    contractEnd: '2027-08-18',
    ...seedClientPricing({ tier: 'Silver' }),
  },
  {
    id: 'wow-skin-science',
    name: 'Wow Skin Science',
    groupId: 'GRP-009',
    gstin: '24AAACW1234K1Z6',
    city: 'Ahmedabad',
    state: 'Gujarat',
    creditLimit: '₹1,00,000',
    paymentType: 'Prepaid Franchisee Commission',
    onboardedOn: '20 Jun 2025',
    onboardedAt: '2025-06-20',
    contractEnd: '2026-06-19',
    // Rounds out the tier set on My Clients — Bronze/Silver/Gold/Platinum all
    // have at least one example client to look at.
    ...seedClientPricing({ tier: 'Bronze' }),
  },
]

// Same two clients already shown mid-flight in Onboarding's "Client activation
// in progress" list — this is the next stage of the same lifecycle: KYC/credit
// cleared, now waiting on pricing sign-off before they go fully Active.
// kycDocsCount/kycDocsTotal let Client Approvals flag a client whose KYC
// documents aren't all in yet — uploads are optional in the wizard, so a
// client can reach approval with some (or none) still missing.
function seedPendingClient({
  id,
  name,
  groupId,
  gstin,
  city,
  state,
  tier,
  submittedBy,
  submittedAt,
  kycDocsCount = 8,
  kycDocsTotal = 8,
  additionalCharges = [],
  approvalStage = APPROVAL_STAGE.SALES_REVIEW,
  // Sales Admin's two sign-offs on this record are independent: approving
  // onboarding details does NOT by itself send anything to Finance — it just
  // unlocks "Approve Pricing details", which is the action that actually
  // advances approvalStage to FINANCE_REVIEW (see approveOnboarding /
  // sendPricingToFinance below). A row already parked at FINANCE_REVIEW must
  // therefore also carry onboardingApproved: true, since it can only have
  // gotten there by clearing onboarding first.
  onboardingApproved = false,
  // Full wizard snapshot (company/contact/billing/identification/KYC) — what
  // Sales Admin's review panel reads from. Legacy seed rows below were never
  // submitted through the wizard, so this is null for them; ClientApprovals
  // falls back to a "no submitted details captured" note in that case.
  details = null,
  // Promoted out of `details.company.paymentType` to a top-level field —
  // Order Module's Booking Details reads a client's Customer Payment Type
  // directly off the client record, not by reaching into its onboarding
  // snapshot, so this has to survive the Pending → Active transition
  // (activateClient() just spreads the pending record wholesale).
  paymentType = details?.company?.paymentType ?? 'Credit Customer',
  // What the Pricing step actually resolved to (Standard / Custom flat
  // discount / Custom region set) — additive alongside the tier-derived
  // `matrix`/`charges` from seedClientPricing below, which stays untouched
  // so Client Approvals' existing pricing panel keeps working unchanged.
  // Legacy/seed rows below don't pass this, so it defaults to null — Client
  // Pricing > Client Mapping falls back to "Standard" for those.
  pricingProfile = null,
}) {
  return {
    id,
    name,
    groupId,
    gstin,
    city,
    state,
    creditLimit: '—',
    submittedBy,
    submittedAt,
    kycDocsCount,
    kycDocsTotal,
    additionalCharges,
    approvalStage,
    onboardingApproved,
    details,
    paymentType,
    pricingProfile,
    ...seedClientPricing({ tier }),
  }
}

export const PENDING_CLIENTS_SEED = [
  // Legacy row — used to sit in Onboarding's activation list under a
  // since-removed "Client Approval Pending" status (fully submitted but not
  // yet formally in the approvals pipeline). That state didn't make sense as
  // its own thing — a fully submitted client just goes straight to Pending
  // Sales Approval, so it lives here now instead.
  seedPendingClient({
    id: 'cardekho',
    name: 'CarDekho',
    groupId: 'GRP-013',
    gstin: '06AAACC7890K1Z2',
    city: 'Gurugram',
    state: 'Haryana',
    tier: 'Silver',
    submittedBy: 'Priya Sharma',
    submittedAt: '3 days ago',
  }),
  seedPendingClient({
    id: 'zepto',
    name: 'Zepto Instant Commerce',
    groupId: 'GRP-007',
    gstin: '27AAACZ7890E1Z4',
    city: 'Mumbai',
    state: 'Maharashtra',
    tier: 'Gold',
    submittedBy: 'Priya Sharma',
    submittedAt: '2 days ago',
    kycDocsCount: 8,
    kycDocsTotal: 8,
    // Already cleared Sales Admin review before this feature existed — parked
    // straight at Finance Admin's stage so the seed data still demos pricing
    // approval out of the box.
    approvalStage: APPROVAL_STAGE.FINANCE_REVIEW,
    onboardingApproved: true,
    additionalCharges: [
      { name: 'FOV', value: '0.5% of freight' },
      { name: 'FSC', value: '8% of freight' },
    ],
    // Partial snapshot — just enough for the pricing-approval email preview
    // (Company/Billing/Identification/KYC weren't captured for this legacy
    // row, same as the rest of its seed data).
    details: { contact: { pocEmail: 'ops.lead@zeptonow.com', opsEmail: 'ops@zeptonow.com', financeEmail: 'finance@zeptonow.com' } },
  }),
  // Legacy row — no `details` snapshot, so Sales Admin's review panel falls
  // back to the "no submitted details captured" note instead of the full
  // Company/Contact/Billing breakdown. Also carries incomplete KYC (5/8).
  seedPendingClient({
    id: 'boat',
    name: 'boAt Lifestyle',
    groupId: 'GRP-008',
    gstin: '07AAACB2345F1Z9',
    city: 'New Delhi',
    state: 'Delhi',
    tier: 'Silver',
    submittedBy: 'Rahul Mehta',
    submittedAt: '3 days ago',
    kycDocsCount: 5,
    kycDocsTotal: 8,
  }),
  // Clean case — full details snapshot, every KYC doc uploaded, ready for a
  // straightforward Approve.
  seedPendingClient({
    id: 'country-delight',
    name: 'Country Delight',
    groupId: 'GRP-010',
    gstin: '06AAACC4567G1Z3',
    city: 'Gurugram',
    state: 'Haryana',
    tier: 'Gold',
    submittedBy: 'Sonal Kapoor',
    submittedAt: '6 hours ago',
    kycDocsCount: 2,
    kycDocsTotal: 2,
    details: sampleDetails({
      company: {
        groupName: 'Country Delight', legalName: 'Continental Milkose Pvt Ltd', tradeName: 'Country Delight', pan: 'AAACC4567G',
        organisationType: 'Company', paymentType: 'Credit Customer', customerCode: 'CDT-CD-CR-001',
        fullAddress: 'Plot 14, Udyog Vihar Phase 4', pincode: '122015', city: 'Gurugram', state: 'Haryana',
      },
      contact: {
        pocName: 'Ritesh Kumar', pocMobile: '9811122233', pocEmail: 'ritesh@countrydelight.in',
        opsEmail: 'ops@countrydelight.in', financeEmail: 'finance@countrydelight.in', salesPerson: 'Sonal Kapoor',
      },
      identifications: [
        {
          id: 1, idType: 'GSTIN', idNumber: '06AAACC4567G1Z3', country: 'India', address: 'Plot 14, Udyog Vihar Phase 4',
          pincode: '122015', city: 'Gurugram', state: 'Haryana', document: dummyFile('gstin-gurugram.pdf'),
        },
      ],
      billing: { creditLimit: '400000', expectedVolumeKg: '3200' },
      documents: [
        { id: 1, type: 'PAN Card', file: dummyFile('pan-card.pdf') },
        { id: 2, type: 'GST Certificate', file: dummyFile('gst-certificate.pdf') },
      ],
    }),
  }),
  // Incomplete-KYC case — full details, but only 1 of 3 documents uploaded,
  // so the review panel's document list shows a mix of View / Not uploaded.
  seedPendingClient({
    id: 'licious',
    name: 'Licious',
    groupId: 'GRP-011',
    gstin: '36AAACL8901H1Z7',
    city: 'Hyderabad',
    state: 'Telangana',
    tier: 'Bronze',
    submittedBy: 'Sonal Kapoor',
    submittedAt: '1 day ago',
    kycDocsCount: 1,
    kycDocsTotal: 3,
    details: sampleDetails({
      company: {
        groupName: 'Licious', legalName: 'Delightful Gourmet Pvt Ltd', tradeName: 'Licious', pan: 'AAACL8901H',
        organisationType: 'Company', paymentType: 'Prepaid Customer', customerCode: 'LIC-LIC-PC-001',
        fullAddress: 'Survey No. 88, Gachibowli', pincode: '500032', city: 'Hyderabad', state: 'Telangana',
        panDocument: null,
      },
      contact: {
        pocName: 'Anjali Reddy', pocMobile: '9900011122', pocEmail: 'anjali@licious.in', salesPerson: 'Sonal Kapoor',
      },
      identifications: [
        {
          id: 1, idType: 'GSTIN', idNumber: '36AAACL8901H1Z7', country: 'India', address: 'Survey No. 88, Gachibowli',
          pincode: '500032', city: 'Hyderabad', state: 'Telangana', document: null,
        },
      ],
      billing: { creditLimit: '150000', expectedVolumeKg: '600' },
      documents: [
        { id: 1, type: 'PAN Card', file: null },
        { id: 2, type: 'GST Certificate', file: dummyFile('gst-certificate.pdf') },
        { id: 3, type: 'MSME Certificate', file: null },
      ],
    }),
  }),
  // Finance-stage variety — Platinum tier with a longer additional-charges
  // list. Deliberately left with no `details.contact` (unlike Zepto above)
  // so the pricing-approval email preview also demos its "no contact emails
  // on file" fallback state, not just the happy path.
  seedPendingClient({
    id: 'meesho',
    name: 'Meesho',
    groupId: 'GRP-012',
    gstin: '29AAACM2345J1Z8',
    city: 'Bengaluru',
    state: 'Karnataka',
    tier: 'Platinum',
    submittedBy: 'Arjun Nair',
    submittedAt: '4 hours ago',
    kycDocsCount: 6,
    kycDocsTotal: 6,
    approvalStage: APPROVAL_STAGE.FINANCE_REVIEW,
    onboardingApproved: true,
    additionalCharges: [
      { name: 'Docket', value: '₹15 /AWB' },
      { name: 'ESS/ODA', value: '₹25 /AWB' },
      { name: 'COD Collection', value: '1.2% of COD amount' },
    ],
  }),
]

// DUMMY — stands in for a real paginated/searchable customer-list endpoint
// (e.g. GET /customers?search=&groupId=&page=&pageSize=). A real backend would
// run this filter+slice as a database query and return { rows, total }; here
// it's the same shape run against the in-memory array with a fake network
// delay, so the page's debounce/loading UI is already correct for when the
// endpoint exists. TODO: once API Contract v1 defines this endpoint, swap the
// body of fetchClientsPage for a real fetch() — queryClients (the sync part)
// can stay as the local fallback/test helper.
const FAKE_LIST_DELAY_MS = 350

export function queryClients(source, { search = '', groupId = null, page = 1, pageSize = 10, sortMode = 'recent' } = {}) {
  const q = search.trim().toLowerCase()
  let rows = source
  if (groupId) rows = rows.filter((c) => c.groupId === groupId)
  if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
  rows = [...rows].sort((a, b) =>
    sortMode === 'alpha' ? a.name.localeCompare(b.name) : new Date(b.onboardedAt ?? 0) - new Date(a.onboardedAt ?? 0)
  )
  const total = rows.length
  const start = (page - 1) * pageSize
  return { rows: rows.slice(start, start + pageSize), total }
}

export function fetchClientsPage(source, params) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(queryClients(source, params)), FAKE_LIST_DELAY_MS)
  })
}

// Approving a client in Client Approvals must be visible on My Clients even
// though the two are separate pages/route mounts — so, same exception made
// for LT_USERS in the User Module, this mutates the shared seed arrays in
// place rather than staying local to whichever component's state called it.
// Every other client-data edit in this prototype (e.g. editing a pricing
// cell) is deliberately local-only; this one specifically isn't.
// Called once KYC is submitted at the end of the New Client wizard — the
// client leaves "Client activation in progress" (see removeActivation in
// data/activations.js) and lands here awaiting pricing sign-off, same as any
// other row in this list.
export function submitClientForApproval({ id, name, groupId, gstin, city, state, tier, submittedBy, kycDocsCount, kycDocsTotal, additionalCharges, details, pricingProfile }) {
  const client = seedPendingClient({
    id,
    name,
    groupId,
    gstin,
    city,
    state,
    tier,
    submittedBy,
    submittedAt: 'Just now',
    kycDocsCount,
    kycDocsTotal,
    additionalCharges,
    details,
    pricingProfile,
  })
  // A resubmission after "Request Correction" reuses the same id as the
  // activation row it came from — replace rather than duplicate if it's
  // somehow still present (shouldn't be, since requestCorrection removes it).
  const idx = PENDING_CLIENTS_SEED.findIndex((c) => c.id === id)
  if (idx !== -1) PENDING_CLIENTS_SEED[idx] = client
  else PENDING_CLIENTS_SEED.unshift(client)
  return client
}

// Sales Admin's sign-off on onboarding details (company/contact/billing/KYC)
// — a self-contained flag, not a stage change. Approving onboarding doesn't
// send anything to Finance by itself; it just clears the way for Sales Admin
// to then review pricing and click "Approve Pricing details" below. Mutates
// in place, same exception as activateClient, so the flag is visible
// immediately to every viewer of this list regardless of who set it.
export function approveOnboarding(clientId) {
  const row = PENDING_CLIENTS_SEED.find((c) => c.id === clientId)
  if (row) row.onboardingApproved = true
  return row
}

// Sales Admin's second, independent sign-off — approving pricing is what
// actually routes the client to Finance Admin's stage. The client stays in
// Client Approvals (still in PENDING_CLIENTS_SEED), just moves stage.
export function sendPricingToFinance(clientId) {
  const row = PENDING_CLIENTS_SEED.find((c) => c.id === clientId)
  if (row) row.approvalStage = APPROVAL_STAGE.FINANCE_REVIEW
  return row
}

// Sales Admin's alternative to approving — sends the client back to Sales
// Executive instead of on to Finance Admin. Leaves Client Approvals entirely
// (mirrors activateClient's move-between-lists pattern) and reappears in
// Onboarding's "Client activation in progress" as Correction Requested,
// carrying the comment so Sales Executive knows what to fix; resubmitting
// from the wizard calls submitClientForApproval again and the loop repeats.
export function requestCorrection(clientId, comment) {
  const idx = PENDING_CLIENTS_SEED.findIndex((c) => c.id === clientId)
  if (idx === -1) return null
  const client = PENDING_CLIENTS_SEED[idx]
  PENDING_CLIENTS_SEED.splice(idx, 1)
  return reopenActivationForCorrection({
    id: client.id,
    name: client.name,
    owner: client.submittedBy,
    correctionComment: comment,
    details: client.details,
    raisedAtStage: client.approvalStage,
  })
}

// Finance Admin's stage-2 sign-off — this is the one that actually activates
// the client (moves it off Client Approvals entirely, onto My Clients).
export function activateClient(client) {
  const { submittedBy, submittedAt, approvalStage, ...rest } = client
  const activated = { ...rest, creditLimit: '₹—', onboardedOn: 'Just now', onboardedAt: new Date().toISOString() }
  ACTIVE_CLIENTS_SEED.unshift(activated)
  const idx = PENDING_CLIENTS_SEED.findIndex((c) => c.id === client.id)
  if (idx !== -1) PENDING_CLIENTS_SEED.splice(idx, 1)
  return activated
}
