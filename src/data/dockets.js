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
  IN_TRANSIT: 'in_transit',
  AT_DEST_HUB: 'at_dest_hub',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  EXCEPTION: 'exception',
}

export const DOCKET_STATUS_LABEL = {
  [DOCKET_STATUS.PENDING]: 'Pending',
  [DOCKET_STATUS.READY_FOR_TRIP]: 'Ready for Trip',
  [DOCKET_STATUS.IN_TRANSIT]: 'In Transit',
  [DOCKET_STATUS.AT_DEST_HUB]: 'At Destination Hub',
  [DOCKET_STATUS.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [DOCKET_STATUS.DELIVERED]: 'Delivered',
  [DOCKET_STATUS.EXCEPTION]: 'Exception',
}

export const DOCKET_STATUS_BADGE = {
  [DOCKET_STATUS.PENDING]: 'bg-amber-50 text-amber-700',
  [DOCKET_STATUS.READY_FOR_TRIP]: 'bg-emerald-50 text-emerald-700',
  [DOCKET_STATUS.IN_TRANSIT]: 'bg-sky-50 text-sky-700',
  [DOCKET_STATUS.AT_DEST_HUB]: 'bg-indigo-50 text-indigo-700',
  [DOCKET_STATUS.OUT_FOR_DELIVERY]: 'bg-violet-50 text-violet-700',
  [DOCKET_STATUS.DELIVERED]: 'bg-slate-100 text-slate-600',
  [DOCKET_STATUS.EXCEPTION]: 'bg-rose-50 text-rose-700',
}

// The happy-path lifecycle, in order — Exception sits outside it (a docket
// can go on hold from any live step and resumes where it left off).
export const DOCKET_LIFECYCLE = [
  DOCKET_STATUS.PENDING, DOCKET_STATUS.READY_FOR_TRIP, DOCKET_STATUS.IN_TRANSIT,
  DOCKET_STATUS.AT_DEST_HUB, DOCKET_STATUS.OUT_FOR_DELIVERY, DOCKET_STATUS.DELIVERED,
]
export const EXCEPTION_TYPES = ['Damaged in transit', 'Consignee unavailable', 'Address issue', 'Held at hub', 'Short / missing package', 'Documentation issue', 'Other']

const HOUR = 3600 * 1000

function logEntry(label, note = '', at = Date.now()) {
  return { at, label, note }
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
    createdTs: Date.now(),
    originCity: pickup.consignor?.city ?? '',
    paymentTerm: pickup.paymentTerm ?? null,
    history: [logEntry('Docket raised', `From pickup ${pickup.id}`)],
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
  if (d) {
    d.status = DOCKET_STATUS.READY_FOR_TRIP
    d.history = [...(d.history ?? []), logEntry('Ready for trip')]
  }
  return d
}

// Dashboard actions — a docket can be put on hold from any live step and
// resumes exactly where it left off.
export function raiseDocketException(docketNumber, { type, note }) {
  const d = DOCKETS_SEED.find((row) => row.docketNumber === docketNumber)
  if (!d || d.status === DOCKET_STATUS.EXCEPTION || d.status === DOCKET_STATUS.DELIVERED) return d
  d.exception = { type, note: note ?? '', previousStatus: d.status, at: Date.now() }
  d.status = DOCKET_STATUS.EXCEPTION
  d.history = [...(d.history ?? []), logEntry(`Exception — ${type}`, note ?? '')]
  return d
}

export function resolveDocketException(docketNumber, note = '') {
  const d = DOCKETS_SEED.find((row) => row.docketNumber === docketNumber)
  if (!d || d.status !== DOCKET_STATUS.EXCEPTION) return d
  d.status = d.exception?.previousStatus ?? DOCKET_STATUS.PENDING
  d.history = [...(d.history ?? []), logEntry('Exception resolved', note)]
  d.exception = null
  return d
}

// Seed rows mirror data/pickups.js's own DROPPED/SCANNED demo pickups
// (PU-3390, PU-3395) so Create Docket has real content without requiring a
// fresh walk through the whole pipeline.
// Compact builder for the demo rows below — status decides which lifecycle
// steps already have timestamps; `ageH` is how many hours ago it was raised.
function seedDocket(o) {
  const created = Date.now() - o.ageH * HOUR
  const idx = DOCKET_LIFECYCLE.indexOf(o.exception ? o.exception.previousStatus : o.status)
  const steps = [
    ['Docket raised', `From pickup ${o.pickupId}`, 0],
    ['Ready for trip', '', 2],
    ['Loaded — in transit', o.tripId ? `Trip ${o.tripId}` : '', 6],
    ['Reached destination hub', o.dropMiniHubName, 30],
    ['Out for delivery', '', 34],
    ['Delivered', o.podBy ? `POD by ${o.podBy}` : '', 40],
  ]
  const history = steps.slice(0, Math.max(0, idx) + 1).map(([label, note, h]) => logEntry(label, note, created + h * HOUR))
  if (o.exception) history.push(logEntry(`Exception — ${o.exception.type}`, o.exception.note, Date.now() - 3 * HOUR))
  const ago = o.ageH < 24 ? `${o.ageH}h ago` : `${Math.round(o.ageH / 24)} day${Math.round(o.ageH / 24) > 1 ? 's' : ''} ago`
  return {
    docketNumber: o.docketNumber, pickupId: o.pickupId, clientName: o.clientName, originCity: o.originCity,
    dropMiniHubName: o.dropMiniHubName, consignee: o.consignee,
    awbCount: o.awbCount, awbNumbers: Array.from({ length: o.awbCount }, (_, i) => `${o.pickupId}-AWB-${String(i + 1).padStart(2, '0')}`),
    totalWeightKg: o.kg, paymentTerm: o.pay, invoiceValue: o.value, tripId: o.tripId ?? null,
    status: o.status, exception: o.exception ? { ...o.exception, at: Date.now() - 3 * HOUR } : null,
    edd: Date.now() + o.eddH * HOUR, createdAt: ago, createdTs: created, history,
  }
}

// The first two mirror data/pickups.js's own DROPPED/SCANNED demo pickups
// (PU-3390, PU-3395); the rest give the dashboard something realistic to
// filter, sort and act on across every lifecycle step.
export const DOCKETS_SEED = [
  seedDocket({ docketNumber: '4829173650', pickupId: 'PU-3390', clientName: 'Nykaa', originCity: 'Mumbai', dropMiniHubName: 'Andheri Depot', consignee: { name: 'Nykaa Luxe Store — Indiranagar', city: 'Bengaluru', pincode: '560001' }, awbCount: 6, kg: 176, pay: PAYMENT_TERM.TBB, value: 148000, status: DOCKET_STATUS.READY_FOR_TRIP, ageH: 48, eddH: 72 }),
  seedDocket({ docketNumber: '7316402985', pickupId: 'PU-3395', clientName: 'Lenskart', originCity: 'Gurugram', dropMiniHubName: 'Udyog Vihar Yard', consignee: { name: 'Lenskart Store — Lajpat Nagar', city: 'New Delhi', pincode: '110001' }, awbCount: 4, kg: 98, pay: PAYMENT_TERM.TBB, value: 96500, status: DOCKET_STATUS.PENDING, ageH: 26, eddH: 30 }),
  seedDocket({ docketNumber: '5120847391', pickupId: 'PU-3371', clientName: 'Nykaa', originCity: 'Mumbai', dropMiniHubName: 'Whitefield Depot', consignee: { name: 'Nykaa Store — Whitefield', city: 'Bengaluru', pincode: '560066' }, awbCount: 8, kg: 212, pay: PAYMENT_TERM.TBB, value: 264000, status: DOCKET_STATUS.IN_TRANSIT, tripId: 'TRP-2041', ageH: 20, eddH: 40 }),
  seedDocket({ docketNumber: '6038259174', pickupId: 'PU-3368', clientName: 'Licious', originCity: 'Gurugram', dropMiniHubName: 'Mundka Depot', consignee: { name: 'Licious Cold Hub — Rohini', city: 'New Delhi', pincode: '110085' }, awbCount: 12, kg: 340, pay: PAYMENT_TERM.PAID, value: 88000, status: DOCKET_STATUS.IN_TRANSIT, tripId: 'TRP-2043', ageH: 14, eddH: 6 }),
  seedDocket({ docketNumber: '3947106285', pickupId: 'PU-3360', clientName: 'Country Delight', originCity: 'Mumbai', dropMiniHubName: 'Ambattur Depot', consignee: { name: 'Country Delight DC — Ambattur', city: 'Chennai', pincode: '600053' }, awbCount: 5, kg: 150, pay: PAYMENT_TERM.TO_PAY_FOD, value: 41000, status: DOCKET_STATUS.AT_DEST_HUB, tripId: 'TRP-2036', ageH: 52, eddH: 4 }),
  seedDocket({ docketNumber: '8261740539', pickupId: 'PU-3355', clientName: 'Lenskart', originCity: 'Gurugram', dropMiniHubName: 'Whitefield Depot', consignee: { name: 'Lenskart Store — Koramangala', city: 'Bengaluru', pincode: '560034' }, awbCount: 3, kg: 64, pay: PAYMENT_TERM.TBB, value: 184000, status: DOCKET_STATUS.OUT_FOR_DELIVERY, tripId: 'TRP-2030', ageH: 70, eddH: 3 }),
  seedDocket({ docketNumber: '2750961843', pickupId: 'PU-3342', clientName: 'Oriflame', originCity: 'Mumbai', dropMiniHubName: 'Bhandup Yard', consignee: { name: 'Oriflame Distributor — Vazhuthacaud', city: 'Kochi', pincode: '682001' }, awbCount: 7, kg: 188, pay: PAYMENT_TERM.PAID, value: 120000, status: DOCKET_STATUS.DELIVERED, tripId: 'TRP-2011', podBy: 'S. Menon', ageH: 110, eddH: -30 }),
  seedDocket({ docketNumber: '9402816357', pickupId: 'PU-3338', clientName: 'Nykaa', originCity: 'Mumbai', dropMiniHubName: 'Vatva Yard', consignee: { name: 'Nykaa Store — Satellite', city: 'Ahmedabad', pincode: '380015' }, awbCount: 4, kg: 92, pay: PAYMENT_TERM.TBB, value: 56000, status: DOCKET_STATUS.DELIVERED, tripId: 'TRP-2008', podBy: 'R. Patel', ageH: 130, eddH: -60 }),
  seedDocket({ docketNumber: '1683095724', pickupId: 'PU-3376', clientName: 'Wellbeing Nutrition', originCity: 'Mumbai', dropMiniHubName: 'Mundka Depot', consignee: { name: 'Wellbeing Nutrition Store — Malviya Nagar', city: 'Jaipur', pincode: '302017' }, awbCount: 6, kg: 135, pay: PAYMENT_TERM.TBB, value: 72000, status: DOCKET_STATUS.EXCEPTION, exception: { type: 'Damaged in transit', note: '2 cartons crushed, awaiting survey', previousStatus: DOCKET_STATUS.AT_DEST_HUB }, tripId: 'TRP-2027', ageH: 60, eddH: -8 }),
  seedDocket({ docketNumber: '7059314682', pickupId: 'PU-3380', clientName: 'Licious', originCity: 'Gurugram', dropMiniHubName: 'Electronic City Yard', consignee: { name: 'Licious Outlet — HSR Layout', city: 'Bengaluru', pincode: '560102' }, awbCount: 9, kg: 260, pay: PAYMENT_TERM.COD, value: 36000, status: DOCKET_STATUS.PENDING, ageH: 3, eddH: 96 }),
  seedDocket({ docketNumber: '4316978205', pickupId: 'PU-3384', clientName: 'Country Delight', originCity: 'Mumbai', dropMiniHubName: 'Ambattur Depot', consignee: { name: 'Country Delight Store — Adyar', city: 'Chennai', pincode: '600020' }, awbCount: 2, kg: 48, pay: PAYMENT_TERM.PAID, value: 18000, status: DOCKET_STATUS.READY_FOR_TRIP, ageH: 9, eddH: 80 }),
  seedDocket({ docketNumber: '8805231947', pickupId: 'PU-3349', clientName: 'Oriflame', originCity: 'Mumbai', dropMiniHubName: 'Vatva Yard', consignee: { name: 'Oriflame Distributor — Navrangpura', city: 'Ahmedabad', pincode: '380009' }, awbCount: 5, kg: 120, pay: PAYMENT_TERM.TO_PAY_FOD, value: 64000, status: DOCKET_STATUS.IN_TRANSIT, tripId: 'TRP-2038', ageH: 36, eddH: -5 }),
  seedDocket({ docketNumber: '2194067538', pickupId: 'PU-3390', clientName: 'Nykaa', originCity: 'Mumbai', dropMiniHubName: 'Andheri Depot', consignee: { name: 'Nykaa Hub — Hyderabad', city: 'Hyderabad', pincode: '500081' }, awbCount: 2, kg: 56, pay: PAYMENT_TERM.TBB, value: 212000, status: DOCKET_STATUS.PENDING, ageH: 30, eddH: 50 }),
]
