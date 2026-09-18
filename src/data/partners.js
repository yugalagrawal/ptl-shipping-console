// Demo Partner Module data — Agents, Co-loaders, Franchise and 3rd Party
// entities that work with LT but don't get an LT Team login (see
// `parentEmail` on data/users.js LT_USER for how a future partner login
// would hang off one of these orgs).

import { reopenPartnerActivationForCorrection } from './partnerActivations.js'

export const PARTNER_TYPES = ['Agent', 'Co-loader', 'Franchise', '3rd Party']

// Partner Approvals is single-stage — Supply Admin alone reviews and
// activates a partner, unlike Client Approvals' two-stage Sales/Finance
// split (there's no separate pricing sign-off yet; Pricing is still a
// placeholder step in the New Partner wizard). Kept as a stage enum anyway
// (rather than a plain boolean) so PartnerOnboarding's "Partner activation in
// progress" list can merge it in next to the wizard-step statuses the same
// way data/clients.js's APPROVAL_STAGE does — one extra stage is a small
// change if a second review step is ever added later.
export const PARTNER_APPROVAL_STAGE = {
  SUPPLY_REVIEW: 'pending_approval',
}

export const PARTNER_APPROVAL_STAGE_LABEL = {
  [PARTNER_APPROVAL_STAGE.SUPPLY_REVIEW]: 'Pending Approval',
}

export const PARTNER_APPROVAL_STAGE_BADGE = {
  [PARTNER_APPROVAL_STAGE.SUPPLY_REVIEW]: 'bg-amber-50 text-amber-700',
}

export const PARTNERS = [
  {
    id: 'PTR-001',
    organisationName: 'Speedex Logistics',
    orgEmail: 'ops@speedex.com',
    pocName: 'Rakesh Iyer',
    pocPhone: '+919900011122',
    type: 'Co-loader',
    city: 'Chennai',
    status: 'Active',
    onboardedOn: '02 Jan 2026',
    onboardedAt: '2026-01-02',
  },
  {
    id: 'PTR-002',
    organisationName: 'Bhiwandi Cargo Movers',
    orgEmail: 'contact@bhiwandicargo.in',
    pocName: 'Suresh Patil',
    pocPhone: '+919900022233',
    type: 'Agent',
    city: 'Bhiwandi',
    status: 'Active',
    onboardedOn: '18 Nov 2025',
    onboardedAt: '2025-11-18',
  },
  {
    id: 'PTR-003',
    organisationName: 'Nair Freight Franchise',
    orgEmail: 'admin@nairfreight.com',
    pocName: 'Anitha Nair',
    pocPhone: '+919900033344',
    type: 'Franchise',
    city: 'Kochi',
    status: 'Inactive',
    onboardedOn: '20 Jun 2025',
    onboardedAt: '2025-06-20',
  },
]

// DUMMY — stands in for a real paginated/searchable partner-list endpoint,
// same fake-network-delay convention as queryClients/fetchClientsPage above
// this file's client-side sibling (data/clients.js). TODO: once API Contract
// v1 defines this endpoint, swap the body of fetchPartnersPage for a real
// fetch() — queryPartners (the sync part) can stay as the local
// fallback/test helper.
const FAKE_LIST_DELAY_MS = 350

export function queryPartners(source, { search = '', page = 1, pageSize = 10, sortMode = 'recent' } = {}) {
  const q = search.trim().toLowerCase()
  let rows = source
  if (q) rows = rows.filter((p) => p.organisationName.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
  rows = [...rows].sort((a, b) =>
    sortMode === 'alpha' ? a.organisationName.localeCompare(b.organisationName) : new Date(b.onboardedAt ?? 0) - new Date(a.onboardedAt ?? 0)
  )
  const total = rows.length
  const start = (page - 1) * pageSize
  return { rows: rows.slice(start, start + pageSize), total }
}

export function fetchPartnersPage(source, params) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(queryPartners(source, params)), FAKE_LIST_DELAY_MS)
  })
}

// Stand-in "uploaded" file for seed/demo pending partners — same shape a real
// wizard upload produces (a File), so Partner Approvals' document links
// render exactly like a real submission would (View opens an empty PDF blob).
function dummyFile(name) {
  return new File(['dummy'], name, { type: 'application/pdf' })
}

// Mirrors data/clients.js's seedPendingClient — a partner submitted for
// approval (KYC done, wizard fully submitted) sits here until Supply Admin
// either activates or sends it back for correction.
function seedPendingPartner({
  id,
  organisationName,
  type,
  city,
  submittedBy,
  submittedAt,
  kycDocsCount = 2,
  kycDocsTotal = 2,
  approvalStage = PARTNER_APPROVAL_STAGE.SUPPLY_REVIEW,
  // Full wizard snapshot (partner/contact/gstin/billing) — what Supply
  // Admin's review panel reads from. null for legacy/seed rows never
  // submitted through the wizard; the review panel falls back to a "no
  // submitted details captured" note in that case.
  details = null,
}) {
  return {
    id,
    organisationName,
    type,
    city,
    submittedBy,
    submittedAt,
    kycDocsCount,
    kycDocsTotal,
    approvalStage,
    details,
  }
}

export const PENDING_PARTNERS_SEED = [
  seedPendingPartner({
    id: 'pp-vardhman-carriers',
    organisationName: 'Vardhman Road Carriers',
    type: 'Agent',
    city: 'Ludhiana',
    submittedBy: 'Meera Krishnan',
    submittedAt: '4 hours ago',
    kycDocsCount: 2,
    kycDocsTotal: 2,
    details: {
      partner: {
        partnerType: 'Agent', partnerName: 'Vardhman Road Carriers', pan: 'AAACV1234A', partnerPaymentType: 'Credit Partner',
        legalName: 'Vardhman Road Carriers Pvt Ltd', address: 'Focal Point, Phase 5', pincode: '141010', city: 'Ludhiana', state: 'Punjab',
        bankAccountName: 'Vardhman Road Carriers Pvt Ltd', bankAccountNumber: '50100234567890', ifscCode: 'PUNB0001234',
      },
      contact: { pocName: 'Harpreet Singh', pocPhoneCode: '🇮🇳 +91', pocMobile: '9888011223', pocEmail: 'ops@vardhmancarriers.in' },
      identifications: [
        { id: 1, idNumber: '03AAACV1234A1Z6', country: 'India', address: 'Focal Point, Phase 5', pincode: '141010', city: 'Ludhiana', state: 'Punjab', document: dummyFile('gstin-ludhiana.pdf') },
      ],
      billing: { contractStart: '2026-09-01', contractEnd: '2027-08-31', billingPeriod: 'Fortnightly' },
      documents: [
        { id: 1, type: 'PAN Card', file: dummyFile('pan-card.pdf') },
        { id: 2, type: 'GST Certificate', file: dummyFile('gst-certificate.pdf') },
      ],
    },
  }),
  // Legacy row — no `details` snapshot, so the review panel falls back to
  // the "no submitted details captured" note.
  seedPendingPartner({
    id: 'pp-konkan-logistics',
    organisationName: 'Konkan Logistics Network',
    type: '3rd Party',
    city: 'Panaji',
    submittedBy: 'Meera Krishnan',
    submittedAt: '1 day ago',
    kycDocsCount: 1,
    kycDocsTotal: 2,
  }),
]

// Submitting for approval must be visible on My Partners once activated even
// though they're separate pages/route mounts — same exception made for
// ACTIVE_CLIENTS_SEED/PENDING_CLIENTS_SEED in data/clients.js, mutates the
// shared seed arrays in place. Called once KYC is submitted at the end of the
// New Partner wizard — the partner leaves "Partner activation in progress"
// (see removePartnerActivation in data/partnerActivations.js) and lands here
// awaiting Supply Admin's sign-off.
export function submitPartnerForApproval({ id, organisationName, type, city, submittedBy, kycDocsCount, kycDocsTotal, details }) {
  const partner = seedPendingPartner({
    id,
    organisationName: organisationName && organisationName.trim() ? organisationName.trim() : 'Unnamed partner',
    type,
    city,
    submittedBy,
    submittedAt: 'Just now',
    kycDocsCount,
    kycDocsTotal,
    details,
  })
  const idx = PENDING_PARTNERS_SEED.findIndex((p) => p.id === id)
  if (idx !== -1) PENDING_PARTNERS_SEED[idx] = partner
  else PENDING_PARTNERS_SEED.unshift(partner)
  return partner
}

// Supply Admin's alternative to approving — sends the partner back to Supply
// Executive instead of activating it. Leaves Partner Approvals entirely and
// reappears in Partner Onboarding's "Partner activation in progress" as
// Correction Requested, carrying the comment so Supply Executive knows what
// to fix; resubmitting from the wizard calls submitPartnerForApproval again
// and the loop repeats.
export function requestPartnerCorrection(partnerId, comment) {
  const idx = PENDING_PARTNERS_SEED.findIndex((p) => p.id === partnerId)
  if (idx === -1) return null
  const partner = PENDING_PARTNERS_SEED[idx]
  PENDING_PARTNERS_SEED.splice(idx, 1)
  return reopenPartnerActivationForCorrection({
    id: partner.id,
    name: partner.organisationName,
    owner: partner.submittedBy,
    correctionComment: comment,
    details: partner.details,
  })
}

// Supply Admin's sign-off — moves the partner off Partner Approvals entirely,
// onto My Partners as Active.
export function activatePartner(partner) {
  const { submittedBy, submittedAt, approvalStage, kycDocsCount, kycDocsTotal, details, ...rest } = partner
  const activated = {
    ...rest,
    id: `PTR-${Math.floor(1000 + Math.random() * 9000)}`,
    orgEmail: details?.contact?.pocEmail ?? '—',
    pocName: details?.contact?.pocName ?? '—',
    pocPhone: details?.contact?.pocMobile ? `${details.contact.pocPhoneCode ?? ''} ${details.contact.pocMobile}`.trim() : '—',
    status: 'Active',
    onboardedOn: 'Just now',
    onboardedAt: new Date().toISOString(),
  }
  PARTNERS.unshift(activated)
  const idx = PENDING_PARTNERS_SEED.findIndex((p) => p.id === partner.id)
  if (idx !== -1) PENDING_PARTNERS_SEED.splice(idx, 1)
  return activated
}
