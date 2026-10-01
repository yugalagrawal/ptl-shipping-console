// Docket Module — a docket is raised the instant a pickup finishes its final
// package scan (see scanPackage in data/pickups.js), whether that scan
// happens tap-by-tap in Pickup Dashboard or is fast-tracked from this
// module's own Create Docket screen (an ops exception queue for
// arrived-but-stuck pickups — see CreateDocket.jsx). Either way it's the
// same action on the same pickup record, so there's exactly one creation
// path — no separate "manual" docket shape.
export const DOCKET_STATUS = {
  PENDING: 'pending',
  READY_FOR_TRIP: 'ready_for_trip',
}

export const DOCKET_STATUS_LABEL = {
  [DOCKET_STATUS.PENDING]: 'Pending',
  [DOCKET_STATUS.READY_FOR_TRIP]: 'Ready for Trip',
}

export const DOCKET_STATUS_BADGE = {
  [DOCKET_STATUS.PENDING]: 'bg-amber-50 text-amber-700',
  [DOCKET_STATUS.READY_FOR_TRIP]: 'bg-emerald-50 text-emerald-700',
}

// Docket numbers are 10-digit numeric. Random placeholder for now — the real
// 10-digit logic is still to be defined.
function randomDocketNumber() {
  return String(Math.floor(1e9 + Math.random() * 9e9))
}
let upcomingDocketNumber = randomDocketNumber()
function nextDocketNumber() {
  const n = upcomingDocketNumber
  upcomingDocketNumber = randomDocketNumber()
  return n
}

// Preview-only — shows what the NEXT docket number will be without
// consuming it, so Create Docket's form can display it ahead of Generate
// being pressed (matches the physical docket book: the number is already
// printed on the next blank sheet, it's just not "used" until you write on
// it).
export function peekNextDocketNumber() {
  return upcomingDocketNumber
}

export const MODE = { SURFACE: 'surface', AIR: 'air', RAIL: 'rail', SEA: 'sea' }
export const MODE_LABEL = { [MODE.SURFACE]: 'Surface', [MODE.AIR]: 'Air', [MODE.RAIL]: 'Rail', [MODE.SEA]: 'Sea' }

// How the docket physically moves from origin to destination Mini Hub —
// "Solo MH" (direct, one Mini Hub to another, no hub relay), "Direct Hub"
// (via the origin Hub, no Mini Hub relay) and "Direct MH" (Hub-to-Mini-Hub)
// — the B/L/V shorthand from the planning whiteboard.
export const DELIVERY_TYPE = { SOLO_MH: 'solo_mh', DIRECT_HUB: 'direct_hub', DIRECT_MH: 'direct_mh' }
export const DELIVERY_TYPE_LABEL = { [DELIVERY_TYPE.SOLO_MH]: 'Solo Mini Hub', [DELIVERY_TYPE.DIRECT_HUB]: 'Direct Hub', [DELIVERY_TYPE.DIRECT_MH]: 'Direct Mini Hub' }

export const PAYMENT_TERM = { TBB: 'tbb', PAID: 'paid', TO_PAY_FOD: 'to_pay_fod', COD: 'cod' }
export const PAYMENT_TERM_LABEL = { [PAYMENT_TERM.TBB]: 'TBB', [PAYMENT_TERM.PAID]: 'Paid', [PAYMENT_TERM.TO_PAY_FOD]: 'To Pay FOD', [PAYMENT_TERM.COD]: 'COD' }

export const RISK_COVER = { OWNERS_RISK: 'owners_risk', CARRIERS_RISK: 'carriers_risk' }
export const RISK_COVER_LABEL = { [RISK_COVER.OWNERS_RISK]: "Owner's Risk", [RISK_COVER.CARRIERS_RISK]: "Carrier's Risk (HRR)" }

export const POD_TYPE = { EPOD: 'epod', HARDCOPY: 'hardcopy', CONSIGNOR_DC: 'consignor_dc' }
export const POD_TYPE_LABEL = { [POD_TYPE.EPOD]: 'ePOD', [POD_TYPE.HARDCOPY]: 'Hardcopy POD', [POD_TYPE.CONSIGNOR_DC]: 'Consignor DC' }

// Called once, at the moment a pickup's last package is scanned — carries
// exactly what's known at that instant (tentative: actual weight, package/
// AWB count, drop Mini Hub, the pickup's own single consignee) since
// routing/trip info doesn't exist yet. A pickup has exactly one consignee
// (data/pickups.js), so a docket does too — not a list.
export function createDocketFromPickup(pickup) {
  const docket = {
    docketNumber: nextDocketNumber(),
    pickupId: pickup.id,
    clientName: pickup.clientName,
    dropMiniHubName: pickup.dropMiniHubName,
    consignee: pickup.consignee,
    awbCount: pickup.packagesCount,
    awbNumbers: [...pickup.awbNumbers],
    totalWeightKg: pickup.actualWeightKg,
    status: DOCKET_STATUS.PENDING,
    createdAt: 'Just now',
  }
  DOCKETS_SEED.unshift(docket)
  return docket
}

// Merges the fuller field set Create Docket's own detailed form captures
// (mode, delivery type, e-way bill/vehicle, invoice, packages breakdown,
// pricing, payment term, risk cover, POD type) onto a docket right after
// createDocketFromPickup makes it — kept as a second step rather than
// folded into createDocketFromPickup itself, since that function also
// fires from the ordinary field-scan path (scanPackage), which never has
// any of this to give it. Same "exactly one creation path" rule the file
// header describes; this is enrichment, not a second path.
export function enrichDocketDetails(docketNumber, extra) {
  const d = DOCKETS_SEED.find((row) => row.docketNumber === docketNumber)
  if (d) Object.assign(d, extra)
  return d
}

export function markDocketReadyForTrip(docketNumber) {
  const d = DOCKETS_SEED.find((row) => row.docketNumber === docketNumber)
  if (d) d.status = DOCKET_STATUS.READY_FOR_TRIP
  return d
}

// Seed rows mirror data/pickups.js's own DROPPED/SCANNED demo pickups
// (PU-3390, PU-3395) so Create Docket has real content without requiring a
// fresh walk through the whole pipeline.
export const DOCKETS_SEED = [
  {
    docketNumber: '4829173650', pickupId: 'PU-3390', clientName: 'Nykaa', dropMiniHubName: 'Andheri Depot',
    consignee: { name: 'Nykaa Luxe Store — Indiranagar', city: 'Bengaluru', pincode: '560001' },
    awbCount: 6, awbNumbers: ['PU-3390-AWB-01', 'PU-3390-AWB-02', 'PU-3390-AWB-03', 'PU-3390-AWB-04', 'PU-3390-AWB-05', 'PU-3390-AWB-06'],
    totalWeightKg: 176, status: DOCKET_STATUS.READY_FOR_TRIP, createdAt: '2 days ago',
  },
  {
    docketNumber: '7316402985', pickupId: 'PU-3395', clientName: 'Lenskart', dropMiniHubName: 'Udyog Vihar Yard',
    consignee: { name: 'Lenskart Store — Lajpat Nagar', city: 'New Delhi', pincode: '110001' },
    awbCount: 4, awbNumbers: ['PU-3395-AWB-01', 'PU-3395-AWB-02', 'PU-3395-AWB-03', 'PU-3395-AWB-04'],
    totalWeightKg: 98, status: DOCKET_STATUS.PENDING, createdAt: '1 day ago',
  },
]
