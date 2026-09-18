// "Partner activation in progress" — the partner-module mirror of
// data/activations.js. A partner sits here from the moment it's created
// (Billing Info confirmed in the New Partner wizard) until Supply Admin
// activates it. Same shape/lifecycle as the client version, just "Supply
// Admin" instead of two-stage Sales/Finance Admin — see data/partners.js for
// the single-stage PARTNER_APPROVAL_STAGE this hands off to.
export const PARTNER_ACTIVATION_STATUS = {
  TIER_PENDING: 'tier_pending',
  DOCS_PENDING: 'docs_pending',
  CORRECTION_REQUESTED: 'correction_requested',
}

export const PARTNER_ACTIVATION_STATUS_LABEL = {
  [PARTNER_ACTIVATION_STATUS.TIER_PENDING]: 'Tier Pricing Pending',
  [PARTNER_ACTIVATION_STATUS.DOCS_PENDING]: 'KYC Pending',
  [PARTNER_ACTIVATION_STATUS.CORRECTION_REQUESTED]: 'Correction Requested',
}

export const PARTNER_ACTIVATION_STATUS_BADGE = {
  [PARTNER_ACTIVATION_STATUS.TIER_PENDING]: 'bg-amber-50 text-amber-700',
  [PARTNER_ACTIVATION_STATUS.DOCS_PENDING]: 'bg-sky-50 text-sky-700',
  [PARTNER_ACTIVATION_STATUS.CORRECTION_REQUESTED]: 'bg-rose-50 text-rose-700',
}

// Which New Partner wizard step (by STEPS key, NewPartner.jsx) resolves each
// status. Once KYC is submitted the partner leaves this list entirely for
// Partner Approvals (see submitPartnerForApproval/removePartnerActivation),
// landing on "Pending Approval" there instead — same as the client flow's
// "no everything's-filled-in-just-waiting state" rule. CORRECTION_REQUESTED
// resumes at the very first step so Supply Executive reviews/fixes anything
// Supply Admin flagged, not just one field.
export const PARTNER_ACTIVATION_RESUME_STEP = {
  [PARTNER_ACTIVATION_STATUS.TIER_PENDING]: 'pricing',
  [PARTNER_ACTIVATION_STATUS.DOCS_PENDING]: 'kyc',
  [PARTNER_ACTIVATION_STATUS.CORRECTION_REQUESTED]: 'partner',
}

export const PARTNER_ACTIVATIONS_SEED = [
  { id: 'pact-bhiwandi-cargo', name: 'Bhiwandi Cargo Movers', status: PARTNER_ACTIVATION_STATUS.TIER_PENDING, createdAt: '2 days ago', owner: 'Meera Krishnan' },
  { id: 'pact-metro-express', name: 'Metro Express Coloaders', status: PARTNER_ACTIVATION_STATUS.DOCS_PENDING, createdAt: '5 days ago', owner: 'Priya Sharma' },
  {
    id: 'pact-eastline',
    name: 'Eastline Fleet Carriers',
    status: PARTNER_ACTIVATION_STATUS.CORRECTION_REQUESTED,
    createdAt: '3 days ago',
    owner: 'Meera Krishnan',
    correctionComment: 'IFSC on the bank details doesn’t resolve to a recognized bank — please re-check the account details.',
  },
]

// Mutates the shared seed in place (same exception made for ACTIVATIONS_SEED
// in data/activations.js) so a status set from inside the wizard is what
// Partner Onboarding's list reads back, even though they're separate
// pages/route mounts.
export function createPartnerActivation({ name, owner }) {
  const id = `pact-${Date.now()}`
  PARTNER_ACTIVATIONS_SEED.unshift({
    id,
    name: name && name.trim() ? name.trim() : 'Unnamed partner',
    status: PARTNER_ACTIVATION_STATUS.TIER_PENDING,
    createdAt: 'Just now',
    owner,
  })
  return id
}

export function updatePartnerActivationStatus(id, status) {
  const row = PARTNER_ACTIVATIONS_SEED.find((r) => r.id === id)
  if (row) row.status = status
}

// Called once KYC is submitted at the end of the wizard — the partner leaves
// "Partner activation in progress" entirely and moves on to Partner
// Approvals (see submitPartnerForApproval in data/partners.js).
export function removePartnerActivation(id) {
  const idx = PARTNER_ACTIVATIONS_SEED.findIndex((r) => r.id === id)
  if (idx !== -1) PARTNER_ACTIVATIONS_SEED.splice(idx, 1)
}

// Supply Admin's "Request Correction" action (see requestPartnerCorrection in
// data/partners.js) lands the partner back here rather than in Partner
// Approvals — same id as the activation row it came from so re-submitting
// from the wizard re-links to the same activation row.
export function reopenPartnerActivationForCorrection({ id, name, owner, correctionComment, details }) {
  const idx = PARTNER_ACTIVATIONS_SEED.findIndex((r) => r.id === id)
  const row = {
    id,
    name,
    status: PARTNER_ACTIVATION_STATUS.CORRECTION_REQUESTED,
    createdAt: idx !== -1 ? PARTNER_ACTIVATIONS_SEED[idx].createdAt : 'Just now',
    owner,
    correctionComment,
    details,
  }
  if (idx !== -1) PARTNER_ACTIVATIONS_SEED[idx] = row
  else PARTNER_ACTIVATIONS_SEED.unshift(row)
  return row
}
