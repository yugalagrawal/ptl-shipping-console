// "Client activation in progress" — the stage a client sits in from the
// moment it's created (Billing Info confirmed in the New Client wizard)
// until it's fully Active. Unlike pricing (which gets its own review page,
// Client Approvals) there's no separate verification screen for these yet —
// each status just says what's still outstanding, and where that's a wizard
// step, the row links straight back into it.
export const ACTIVATION_STATUS = {
  TIER_PENDING: 'tier_pending',
  DOCS_PENDING: 'docs_pending',
  CORRECTION_REQUESTED: 'correction_requested',
}

export const ACTIVATION_STATUS_LABEL = {
  [ACTIVATION_STATUS.TIER_PENDING]: 'Tier Pricing Pending',
  [ACTIVATION_STATUS.DOCS_PENDING]: 'KYC Pending',
  [ACTIVATION_STATUS.CORRECTION_REQUESTED]: 'Correction Requested',
}

export const ACTIVATION_STATUS_BADGE = {
  [ACTIVATION_STATUS.TIER_PENDING]: 'bg-amber-50 text-amber-700',
  [ACTIVATION_STATUS.DOCS_PENDING]: 'bg-sky-50 text-sky-700',
  [ACTIVATION_STATUS.CORRECTION_REQUESTED]: 'bg-rose-50 text-rose-700',
}

// Which New Client wizard step (by STEPS key) resolves each status's "still
// needs doing" action. There's no "everything's filled in, just waiting" state
// here — the moment KYC is submitted, the client leaves this list entirely
// for Client Approvals (see submitClientForApproval/removeActivation), landing
// on "Pending Sales Approval" there instead (see APPROVAL_STAGE in
// data/clients.js) rather than lingering in some in-between activation status.
// CORRECTION_REQUESTED resumes at the very first step so Sales Executive can
// review/fix anything Sales Admin flagged, not just one field.
export const ACTIVATION_RESUME_STEP = {
  [ACTIVATION_STATUS.TIER_PENDING]: 'tier',
  [ACTIVATION_STATUS.DOCS_PENDING]: 'kyc',
  [ACTIVATION_STATUS.CORRECTION_REQUESTED]: 'company',
}

export const ACTIVATIONS_SEED = [
  { id: 'act-purplle', name: 'Purplle', status: ACTIVATION_STATUS.TIER_PENDING, createdAt: '1 day ago', owner: 'Priya Sharma' },
  { id: 'act-urban-company', name: 'Urban Company', status: ACTIVATION_STATUS.DOCS_PENDING, createdAt: '2 days ago', owner: 'Rahul Mehta' },
  {
    id: 'act-wakefit',
    name: 'Wakefit Innovations',
    status: ACTIVATION_STATUS.CORRECTION_REQUESTED,
    createdAt: '4 days ago',
    owner: 'Sonal Kapoor',
    correctionComment: 'GSTIN address doesn’t match the registered address on Company Info — please re-check both.',
  },
]

// Mutates the shared seed in place (same exception as LT_USERS / activeClient
// elsewhere) so a status set from inside the wizard is what the Onboarding
// list reads back, even though they're separate pages/route mounts.
export function createActivation({ name, owner }) {
  const id = `act-${Date.now()}`
  ACTIVATIONS_SEED.unshift({
    id,
    name: name && name.trim() ? name.trim() : 'Unnamed client',
    status: ACTIVATION_STATUS.TIER_PENDING,
    createdAt: 'Just now',
    owner,
  })
  return id
}

export function updateActivationStatus(id, status) {
  const row = ACTIVATIONS_SEED.find((r) => r.id === id)
  if (row) row.status = status
}

// Called once KYC is submitted at the end of the wizard — the client leaves
// "Client activation in progress" entirely and moves on to Client Approvals
// (see submitClientForApproval in data/clients.js), so there's nothing left
// for this list to track.
export function removeActivation(id) {
  const idx = ACTIVATIONS_SEED.findIndex((r) => r.id === id)
  if (idx !== -1) ACTIVATIONS_SEED.splice(idx, 1)
}

// Sales Admin's or Finance Admin's "Request Correction" action (see
// requestCorrection in data/clients.js) lands the client back here rather
// than in Client Approvals — same id as the pending-client record so
// re-submitting from the wizard re-links to the same activation row, and
// correctionComment is what Sales Executive sees explaining what to fix.
// `raisedAtStage` (an APPROVAL_STAGE value) records which reviewer sent it
// back, so Client Approvals can show a Finance Admin the corrections they
// personally asked for — the client hasn't reached Finance again yet, so it
// doesn't belong in "pending my approval", but it's still theirs to track.
export function reopenActivationForCorrection({ id, name, owner, correctionComment, details, raisedAtStage }) {
  const idx = ACTIVATIONS_SEED.findIndex((r) => r.id === id)
  const row = {
    id,
    name,
    status: ACTIVATION_STATUS.CORRECTION_REQUESTED,
    createdAt: idx !== -1 ? ACTIVATIONS_SEED[idx].createdAt : 'Just now',
    owner,
    correctionComment,
    details,
    raisedAtStage,
  }
  if (idx !== -1) ACTIVATIONS_SEED[idx] = row
  else ACTIVATIONS_SEED.unshift(row)
  return row
}
