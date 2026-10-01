// Pickup lifecycle — the new lightweight Create Pickup → PRS → field-scan →
// docket pipeline (replaces the old AWB-at-booking flow for fresh work;
// Create Pickup - Old / data/orders.js is left untouched and still reachable).
//
// A pickup is created with the bare minimum (estimated weight, pickup
// location, drop Mini Hub, scheduled date/time). It then moves through:
//   DRAFT       — booked with more than EDIT_LOCK_HOURS of lead time; still
//                 editable, NOT visible to PRS grouping yet. Auto-promotes to
//                 CREATED once the lock window is reached (see
//                 refreshPickupLocks, called by any screen that reads the
//                 ungrouped pool). A pickup booked with less lead time than
//                 the lock window skips DRAFT entirely (see `urgent` below).
//   CREATED     — locked, sitting in the ungrouped pool for PRS
//   GROUPED     — batched into a PRS (see data/prs.js), vehicle assigned
//   ARRIVED     — field staff is on-site; actual weight/volumetric/consignee/
//                 package count get filled in here
//   SCANNED     — every package individually scanned; AWBs generated and a
//                 docket number consumed at that instant (see data/dockets.js)
//   DROPPED     — drop-scanned at the destination hub
//
// One-time vs. recurring pickups (see RECURRING_SERIES_SEED below) share this
// exact same per-instance lifecycle — a recurring series just materializes
// one pickup row per occurrence ahead of time instead of a person booking
// each one by hand.
import { createDocketFromPickup } from './dockets.js'

export const PICKUP_STATUS = {
  DRAFT: 'draft',
  CREATED: 'created',
  GROUPED: 'grouped',
  ARRIVED: 'arrived',
  SCANNED: 'scanned',
  DROPPED: 'dropped',
}

// Labels follow standard PTL/courier pickup-lifecycle terminology (the
// vocabulary used on the reference ops console) rather than our internal
// state names, so ops staff reading this screen recognize it immediately.
export const PICKUP_STATUS_LABEL = {
  [PICKUP_STATUS.DRAFT]: 'Draft (editable)',
  [PICKUP_STATUS.CREATED]: 'Pickup Booked',
  [PICKUP_STATUS.GROUPED]: 'Assigned',
  [PICKUP_STATUS.ARRIVED]: 'Arrived at Pickup',
  [PICKUP_STATUS.SCANNED]: 'Picked Up',
  [PICKUP_STATUS.DROPPED]: 'Reached Hub',
}

export const PICKUP_STATUS_BADGE = {
  [PICKUP_STATUS.DRAFT]: 'bg-slate-50 text-slate-400',
  [PICKUP_STATUS.CREATED]: 'bg-slate-100 text-slate-600',
  [PICKUP_STATUS.GROUPED]: 'bg-sky-50 text-sky-700',
  [PICKUP_STATUS.ARRIVED]: 'bg-amber-50 text-amber-700',
  [PICKUP_STATUS.SCANNED]: 'bg-violet-50 text-violet-700',
  [PICKUP_STATUS.DROPPED]: 'bg-emerald-50 text-emerald-700',
}

// PU = one-time pickup, PS = recurring/scheduled pickup — both get an id
// shaped PU|PSYYYYMMDD#### where the date is the SCHEDULED pickup date (not
// the booking date) and #### is a per-day, per-prefix counter starting at
// 0001. The date segment is fixed at creation and never rewritten even if
// the pickup's scheduledDate later changes (see reschedulePickup) — the id
// is an identity, not a live mirror of the date field, so edits never cause
// id collisions/reuse.
export const PICKUP_TYPE = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
}

const ID_PREFIX = { [PICKUP_TYPE.ONE_TIME]: 'PU', [PICKUP_TYPE.RECURRING]: 'PS' }

const dailySeqByPrefix = new Map()
function nextSequencedId(prefix, dateStr) {
  const yyyymmdd = dateStr.replaceAll('-', '')
  const key = `${prefix}-${yyyymmdd}`
  const n = (dailySeqByPrefix.get(key) ?? 0) + 1
  dailySeqByPrefix.set(key, n)
  return `${prefix}${yyyymmdd}${String(n).padStart(4, '0')}`
}

// Local-calendar-date formatting — deliberately NOT toISOString(), which
// converts to UTC first and silently shifts the date by one in any
// positive-UTC-offset timezone (IST included) whenever local time is past
// midnight but before the UTC offset catches up (e.g. local midnight Sept 16
// IST is still Sept 15 in UTC). Every "what calendar date is this" spot in
// this file must go through this helper, not toISOString.
function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr() {
  return toLocalDateStr(new Date())
}

// A pickup stays editable (Draft) only while there's more than this many
// hours between now and its scheduled pickup time — the moment that window
// closes it locks (auto, via refreshPickupLocks) and becomes visible to PRS.
export const EDIT_LOCK_HOURS = 3

function scheduledDateTime(scheduledDate, scheduledTime) {
  if (!scheduledDate || !scheduledTime) return null
  const dt = new Date(`${scheduledDate}T${scheduledTime}`)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function isWithinEditWindow(scheduledDate, scheduledTime) {
  const dt = scheduledDateTime(scheduledDate, scheduledTime)
  if (!dt) return false
  return dt.getTime() - Date.now() > EDIT_LOCK_HOURS * 60 * 60 * 1000
}

// Call at the top of any screen that reads the ungrouped pool (PRS.jsx,
// Create Pickup's own recent-pickups list) — promotes any Draft whose lock
// window has passed to CREATED. No backend/cron in this prototype, so this
// stands in for what would be a scheduled job for real.
export function refreshPickupLocks() {
  PICKUPS_SEED.forEach((p) => {
    if (p.status === PICKUP_STATUS.DRAFT && !isWithinEditWindow(p.scheduledDate, p.scheduledTime)) {
      p.status = PICKUP_STATUS.CREATED
    }
  })
}

// Curated shortlist of Mini Hubs (the real leaf-level drop facility, same
// tier named in data/permissions.js's Region>Zone>Hub>Mini Hub access
// model) — kept small and self-contained here rather than importing the
// full ~140-entry BRANCH_MINI_HUBS map, and tagged with a city so PRS
// suggestion can match a Mini Hub to a nearby available vehicle (data/fleet.js).
export const MINI_HUBS = [
  { id: 'mh-andheri-depot', name: 'Andheri Depot', city: 'Mumbai' },
  { id: 'mh-bhandup-yard', name: 'Bhandup Yard', city: 'Mumbai' },
  { id: 'mh-whitefield-depot', name: 'Whitefield Depot', city: 'Bengaluru' },
  { id: 'mh-electronic-city-yard', name: 'Electronic City Yard', city: 'Bengaluru' },
  { id: 'mh-mundka-depot', name: 'Mundka Depot', city: 'New Delhi' },
  { id: 'mh-udyog-vihar-yard', name: 'Udyog Vihar Yard', city: 'Gurugram' },
  { id: 'mh-vatva-yard', name: 'Vatva Yard', city: 'Ahmedabad' },
  { id: 'mh-ambattur-depot', name: 'Ambattur Depot', city: 'Chennai' },
]

function miniHub(id) {
  return MINI_HUBS.find((h) => h.id === id)
}

// Minimal, mandatory-only creation — everything a field visit fills in later
// (actualWeightKg, volumetricWeightKg, consignee, packagesCount) starts null.
// scheduledDate/scheduledTime decide both the id's date segment and whether
// this lands as an editable Draft or a locked/urgent CREATED (see
// isWithinEditWindow above) — pickupType decides PU vs PS in the id.
export function createPickup({
  clientId, clientName, consignor, dropMiniHubId = null, estWeightKg, packagesEstimate = null,
  pickupType = PICKUP_TYPE.ONE_TIME, scheduledDate = null, scheduledTime = null, recurringSeriesId = null,
  // Both optional at booking time — dropMiniHubId can be decided later (PRS
  // grouping just won't happen until it is); consignee/paymentTerm let ops
  // capture what's already known upfront instead of waiting for the field
  // visit's own consignee capture (updatePickupFieldDetails below).
  consignee = null, paymentTerm = null,
  // Grab-bag for fields product has added on top of the original booking
  // form (shipment nature/hazard info, the per-consignee destination split,
  // booking-data source, e-way bill) — nothing downstream reads these yet,
  // so they ride along as one object rather than more top-level params.
  details = null,
}) {
  const editable = isWithinEditWindow(scheduledDate, scheduledTime)
  const pickup = {
    id: nextSequencedId(ID_PREFIX[pickupType], scheduledDate || todayStr()),
    pickupType,
    recurringSeriesId,
    clientId,
    clientName,
    consignor,
    dropMiniHubId: dropMiniHubId || null,
    dropMiniHubName: dropMiniHubId ? (miniHub(dropMiniHubId)?.name ?? dropMiniHubId) : null,
    estWeightKg: Number(estWeightKg) || 0,
    scheduledDate,
    scheduledTime,
    status: editable ? PICKUP_STATUS.DRAFT : PICKUP_STATUS.CREATED,
    // Booked with less than EDIT_LOCK_HOURS notice — no lead time for PRS to
    // plan around it, so it skips Draft entirely and ops should see it flagged.
    urgent: !editable,
    prsId: null,
    actualWeightKg: null,
    volumetricWeightKg: null,
    consignee,
    paymentTerm,
    details,
    packagesCount: packagesEstimate ? Number(packagesEstimate) : null,
    scannedCount: 0,
    awbNumbers: [],
    docketNumber: null,
    createdAt: 'Just now',
  }
  PICKUPS_SEED.unshift(pickup)
  return pickup
}

// A pickup's scheduledDate/scheduledTime can change without touching its id
// (the id is an identity assigned once, not a live mirror — see the header
// comment on nextSequencedId above). Only valid while still Draft — once
// locked, rescheduling should go through "Move to Unassigned" instead so it
// re-enters the pool at its new date/hub eligibility.
export function reschedulePickup(pickupId, { scheduledDate, scheduledTime }) {
  const p = PICKUPS_SEED.find((row) => row.id === pickupId)
  if (!p || p.status !== PICKUP_STATUS.DRAFT) return null
  if (scheduledDate) p.scheduledDate = scheduledDate
  if (scheduledTime) p.scheduledTime = scheduledTime
  return p
}

// Bulk-assigns a batch of pickups to a generated PRS — called by
// generatePrs() in data/prs.js, mutating in place same as every other
// shared-seed-array pattern in this app (activations.js, clients.js, …).
export function assignPickupsToPrs(pickupIds, prsId) {
  pickupIds.forEach((id) => {
    const p = PICKUPS_SEED.find((row) => row.id === id)
    if (p) {
      p.status = PICKUP_STATUS.GROUPED
      p.prsId = prsId
    }
  })
}

export function markPickupArrived(pickupId) {
  const p = PICKUPS_SEED.find((row) => row.id === pickupId)
  if (p) p.status = PICKUP_STATUS.ARRIVED
  return p
}

// Field staff's on-site update — actual/volumetric weight, consignee and how
// many packages this pickup actually contains (the number the package-scan
// counter below counts up to).
export function updatePickupFieldDetails(pickupId, { actualWeightKg, volumetricWeightKg, consignee, packagesCount }) {
  const p = PICKUPS_SEED.find((row) => row.id === pickupId)
  if (!p) return null
  p.actualWeightKg = Number(actualWeightKg) || 0
  p.volumetricWeightKg = Number(volumetricWeightKg) || 0
  p.consignee = consignee
  p.packagesCount = Number(packagesCount) || 0
  return p
}

// One tap = one package scanned. The moment the last package is scanned, an
// AWB is generated per package and a docket number is consumed in the same
// instant — mirrors the real "final pickup scan" behavior described: a
// 10-package pickup shows 1/10 → 10/10 as each is tapped, and only upon
// reaching packagesCount does it become a docket (see createDocketFromPickup,
// data/dockets.js), which is what Create Docket > Pending Dockets reads from.
export function scanPackage(pickupId) {
  const p = PICKUPS_SEED.find((row) => row.id === pickupId)
  if (!p || p.scannedCount >= p.packagesCount) return p
  p.scannedCount += 1
  p.awbNumbers.push(`${p.id}-AWB-${String(p.scannedCount).padStart(2, '0')}`)
  if (p.scannedCount === p.packagesCount) {
    p.status = PICKUP_STATUS.SCANNED
    const docket = createDocketFromPickup(p)
    p.docketNumber = docket.docketNumber
  }
  return p
}

export function dropScanPickup(pickupId) {
  const p = PICKUPS_SEED.find((row) => row.id === pickupId)
  if (p) p.status = PICKUP_STATUS.DROPPED
  return p
}

// --- Recurring pickups (PS) ------------------------------------------------
// A recurring series is the template (client/consignor/hub/cadence); it
// doesn't itself sit in any pipeline. What flows through PRS/docket/etc. is
// always a materialized per-occurrence Pickup row (pickupType RECURRING,
// tagged recurringSeriesId), created via the exact same createPickup() above
// — so a PS pickup's own lifecycle (Draft → CREATED → … → DROPPED) is
// identical to a one-time PU pickup once it exists.
//
// Instances are generated on a rolling window rather than all at once for
// the series' whole lifetime: a far-future bulk-generate means any later
// edit to the template has to reach back and fix/cancel a pile of
// already-materialized instances. A short window keeps that blast radius
// small while still giving PRS the lead-time advantage recurring pickups are
// supposed to have over one-off bookings — see materializeRecurringWindow.
export const REPEAT_END_TYPE = {
  NEVER: 'never',
  ON_DATE: 'on_date',
  AFTER_COUNT: 'after_count',
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// How far ahead occurrences are kept materialized as real Draft pickups.
// Topped up by calling materializeRecurringWindow again (idempotent — it
// skips any date a pickup already exists for) whenever a screen touches a
// series, standing in for what would be a daily top-up job for real.
export const RECURRING_WINDOW_DAYS = 7

let recurringSeriesSeq = 1
export const RECURRING_SERIES_SEED = []

// frequency: 'Daily' | 'Weekly' | 'Monthly' (mirrors Create Pickup's own
// REPEAT_FREQUENCIES). days: array of WEEKDAY_SHORT values, only meaningful
// for Weekly. anchorDate: the first date the person actually asked for —
// used as the day-of-month reference for Monthly.
export function createRecurringSeries({
  clientId, clientName, consignor, dropMiniHubId = null, estWeightKg, packagesEstimate = null,
  frequency, days = [], endType = REPEAT_END_TYPE.NEVER, endDate = null, endCount = null,
  anchorDate, scheduledTime, consignee = null, paymentTerm = null, details = null,
}) {
  const series = {
    id: `RS-${recurringSeriesSeq++}`,
    clientId, clientName, consignor, dropMiniHubId, estWeightKg, packagesEstimate,
    frequency, days, endType, endDate, endCount: endCount ? Number(endCount) : null,
    anchorDate, scheduledTime, consignee, paymentTerm, details,
    generatedCount: 0,
    active: true,
  }
  RECURRING_SERIES_SEED.push(series)
  materializeRecurringWindow(series.id)
  return series
}

function occurrenceMatchesDay(series, date) {
  const dayShort = WEEKDAY_SHORT[date.getDay()]
  if (series.frequency === 'Daily') return true
  if (series.frequency === 'Weekly') return series.days.includes(dayShort)
  if (series.frequency === 'Monthly') return date.getDate() === Number(series.anchorDate.split('-')[2])
  return false
}

// Idempotent — safe to call repeatedly (e.g. every time PRS.jsx loads) since
// it skips any date this series already has a pickup for.
export function materializeRecurringWindow(seriesId, windowDays = RECURRING_WINDOW_DAYS) {
  const series = RECURRING_SERIES_SEED.find((s) => s.id === seriesId)
  if (!series || !series.active) return []
  const created = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = toLocalDateStr(d)
    if (dateStr < series.anchorDate) continue
    if (!occurrenceMatchesDay(series, d)) continue
    if (series.endType === REPEAT_END_TYPE.ON_DATE && series.endDate && dateStr > series.endDate) continue
    if (series.endType === REPEAT_END_TYPE.AFTER_COUNT && series.generatedCount >= series.endCount) break
    const alreadyExists = PICKUPS_SEED.some((p) => p.recurringSeriesId === seriesId && p.scheduledDate === dateStr)
    if (alreadyExists) continue
    const pickup = createPickup({
      clientId: series.clientId,
      clientName: series.clientName,
      consignor: series.consignor,
      dropMiniHubId: series.dropMiniHubId,
      estWeightKg: series.estWeightKg,
      packagesEstimate: series.packagesEstimate,
      pickupType: PICKUP_TYPE.RECURRING,
      scheduledDate: dateStr,
      scheduledTime: series.scheduledTime,
      recurringSeriesId: seriesId,
      consignee: series.consignee,
      paymentTerm: series.paymentTerm,
      details: series.details,
    })
    series.generatedCount += 1
    created.push(pickup)
  }
  return created
}

// Refreshes every active series' rolling window — call this next to
// refreshPickupLocks() wherever the pool is read, so recurring instances keep
// topping up without a real backend job.
export function refreshRecurringWindows() {
  RECURRING_SERIES_SEED.forEach((s) => materializeRecurringWindow(s.id))
}

// Seed data spanning every stage of the pipeline so PRS / Pickup Dashboard /
// Create Docket all have something real to show without first walking a
// fresh pickup through the whole flow by hand.
export const PICKUPS_SEED = [
  {
    id: 'PU-3390', clientId: 'nykaa', clientName: 'Nykaa',
    consignor: { name: 'Nykaa FC Bhiwandi', company: 'Nykaa', phone: '9820011223', email: 'fc.bhiwandi@nykaa.com', address: 'Plot 12, MIDC Industrial Area', pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 180, status: PICKUP_STATUS.DROPPED, prsId: 'PRS-101',
    actualWeightKg: 176, volumetricWeightKg: 190,
    consignee: { name: 'Nykaa Luxe Store — Indiranagar', city: 'Bengaluru', pincode: '560001' },
    // Two consignees on one pickup (the Create Pickup "Consignee List") — lets E-way Bill's consignee picker be demoed.
    details: { destinations: [
      { consignee: { name: 'Nykaa Luxe Store — Indiranagar', city: 'Bengaluru', pincode: '560001', state: 'Karnataka' }, boxes: 4, kg: 120 },
      { consignee: { name: 'Nykaa Hub — Hyderabad', city: 'Hyderabad', pincode: '500081', state: 'Telangana' }, boxes: 2, kg: 56 },
    ] },
    packagesCount: 6, scannedCount: 6,
    awbNumbers: ['PU-3390-AWB-01', 'PU-3390-AWB-02', 'PU-3390-AWB-03', 'PU-3390-AWB-04', 'PU-3390-AWB-05', 'PU-3390-AWB-06'],
    docketNumber: '4829173650', createdAt: '2 days ago',
  },
  {
    id: 'PU-3395', clientId: 'lenskart', clientName: 'Lenskart',
    consignor: { name: 'Lenskart Warehouse', company: 'Lenskart Solutions Pvt Ltd', phone: '9911022334', email: 'warehouse@lenskart.com', address: 'Udyog Vihar Phase 4', pincode: '122001', city: 'Gurugram', state: 'Haryana' },
    dropMiniHubId: 'mh-udyog-vihar-yard', dropMiniHubName: 'Udyog Vihar Yard',
    estWeightKg: 95, status: PICKUP_STATUS.SCANNED, prsId: 'PRS-102',
    actualWeightKg: 98, volumetricWeightKg: 88,
    consignee: { name: 'Lenskart Store — Lajpat Nagar', city: 'New Delhi', pincode: '110001' },
    details: { destinations: [
      { consignee: { name: 'Lenskart Store — Lajpat Nagar', city: 'New Delhi', pincode: '110024', state: 'Delhi' }, boxes: 2, kg: 50 },
      { consignee: { name: 'Lenskart Store — Sector 18', city: 'Noida', pincode: '201301', state: 'Uttar Pradesh' }, boxes: 1, kg: 28 },
      { consignee: { name: 'Lenskart Store — Cyber Hub', city: 'Gurugram', pincode: '122002', state: 'Haryana' }, boxes: 1, kg: 20 },
    ] },
    packagesCount: 4, scannedCount: 4,
    awbNumbers: ['PU-3395-AWB-01', 'PU-3395-AWB-02', 'PU-3395-AWB-03', 'PU-3395-AWB-04'],
    docketNumber: '7316402985', createdAt: '1 day ago',
  },
  {
    id: 'PU-3398', clientId: 'oriflame', clientName: 'Oriflame',
    consignor: { name: 'Oriflame Hub', company: 'Oriflame India Pvt Ltd', phone: '9900112233', email: 'hub.blr@oriflame.com', address: 'Peenya Industrial Area', pincode: '560001', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-whitefield-depot', dropMiniHubName: 'Whitefield Depot',
    estWeightKg: 140, status: PICKUP_STATUS.ARRIVED, prsId: 'PRS-102',
    actualWeightKg: 145, volumetricWeightKg: 150,
    consignee: { name: 'Oriflame Distributor — Vazhuthacaud', city: 'Kochi', pincode: '682001' },
    packagesCount: 8, scannedCount: 3,
    awbNumbers: ['PU-3398-AWB-01', 'PU-3398-AWB-02', 'PU-3398-AWB-03'],
    docketNumber: null, createdAt: '1 day ago',
  },
  {
    id: 'PU-3399', clientId: 'mamaearth', clientName: 'Mamaearth',
    consignor: { name: 'Mamaearth Gurugram DC', company: 'Honasa Consumer Ltd', phone: '9812345670', email: 'dc.gurugram@mamaearth.in', address: 'Sector 18, Udyog Vihar', pincode: '122001', city: 'Gurugram', state: 'Haryana' },
    dropMiniHubId: 'mh-udyog-vihar-yard', dropMiniHubName: 'Udyog Vihar Yard',
    estWeightKg: 60, status: PICKUP_STATUS.GROUPED, prsId: 'PRS-102',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '5 hours ago',
  },
  {
    id: 'PU-3400', clientId: 'wow-skin-science', clientName: 'Wow Skin Science',
    consignor: { name: 'Wow Skin Science Plant', company: 'Wow Skin Science', phone: '9723456781', email: 'plant.surat@wowskinscience.com', address: 'GIDC Industrial Estate', pincode: '395007', city: 'Surat', state: 'Gujarat' },
    dropMiniHubId: 'mh-vatva-yard', dropMiniHubName: 'Vatva Yard',
    estWeightKg: 75, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-12', scheduledTime: '09:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '3 hours ago',
  },
  {
    id: 'PU-3401', clientId: 'nykaa', clientName: 'Nykaa',
    consignor: { name: 'Nykaa FC Bhiwandi', company: 'Nykaa', phone: '9820011223', email: 'fc.bhiwandi@nykaa.com', address: 'Plot 12, MIDC Industrial Area', pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 110, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-13', scheduledTime: '10:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '1 hour ago',
  },
  // A second Andheri Depot pickup from a different client — so this hub's
  // suggested PRS draft (data/prs.js) demonstrates a multi-pickup,
  // multi-client group before it's ever generated, not just single-pickup ones.
  {
    id: 'PU-3402', clientId: 'sugar-cosmetics', clientName: 'Sugar Cosmetics',
    consignor: { name: 'Sugar Cosmetics FC', company: 'Sugar Cosmetics', phone: '9820099887', email: 'fc.mumbai@sugarcosmetics.com', address: 'Marol Industrial Estate', pincode: '400059', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 130, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-14', scheduledTime: '11:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '40 minutes ago',
  },
  // Just arrived, on-site details not filled in yet (packagesCount still
  // null) — the "before" state of PickupDetail's on-site-details form in
  // Pickup Dashboard, distinct from PU-3398 which is already mid-scan.
  // Belongs to PRS-100 (data/prs.js, a 3rd Active PRS for this hub/city)
  // since ARRIVED only happens after a pickup has been grouped and dispatched.
  {
    id: 'PU-3403', clientId: 'purplle', clientName: 'Purplle',
    consignor: { name: 'Purplle Warehouse', company: 'Purplle.com', phone: '9900112244', email: 'wh.blr@purplle.com', address: 'Electronic City Phase 1', pincode: '560100', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-electronic-city-yard', dropMiniHubName: 'Electronic City Yard',
    estWeightKg: 85, status: PICKUP_STATUS.ARRIVED, prsId: 'PRS-100',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '30 minutes ago',
  },
  // A third city (Chennai) represented in the ungrouped pool, so Pending
  // PRS's suggestion also shows a container-class vehicle (VEH-007) being
  // suggested, not just the HCV/ICV/MCV cases the other hubs already cover.
  {
    id: 'PU-3404', clientId: 'plum-goodness', clientName: 'Plum Goodness',
    consignor: { name: 'Plum Goodness DC', company: 'Pureplay Skin Sciences', phone: '9840099001', email: 'dc.chennai@plumgoodness.com', address: 'Ambattur Industrial Estate', pincode: '600058', city: 'Chennai', state: 'Tamil Nadu' },
    dropMiniHubId: 'mh-ambattur-depot', dropMiniHubName: 'Ambattur Depot',
    estWeightKg: 200, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-15', scheduledTime: '13:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '15 minutes ago',
  },

  // --- PRS-99 (data/prs.js) — an older Andheri Depot run, already out with
  // VEH-002 (itself shown as "On Trip" in Supply & Fleet), mid-progress:
  // two still just Assigned, one mid-scan, one freshly Arrived.
  {
    id: 'PU-3405', clientId: 'myglamm', clientName: 'MyGlamm',
    consignor: { name: 'MyGlamm Warehouse', company: 'MyGlamm', phone: '9820033441', email: 'wh.mumbai@myglamm.com', address: 'Kandivali East Industrial Area', pincode: '400101', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 150, status: PICKUP_STATUS.GROUPED, prsId: 'PRS-99',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '3 days ago',
  },
  {
    id: 'PU-3406', clientId: 'bella-vita-organic', clientName: 'Bella Vita Organic',
    consignor: { name: 'Bella Vita Organic FC', company: 'Bella Vita Organic', phone: '9820033442', email: 'fc.mumbai@bellavitaorganic.com', address: 'Vikhroli Industrial Estate', pincode: '400079', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 90, status: PICKUP_STATUS.GROUPED, prsId: 'PRS-99',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '3 days ago',
  },
  {
    id: 'PU-3407', clientId: 'wellbeing-nutrition', clientName: 'Wellbeing Nutrition',
    consignor: { name: 'Wellbeing Nutrition DC', company: 'Wellbeing Nutrition', phone: '9820033443', email: 'dc.mumbai@wellbeingnutrition.com', address: 'Powai Industrial Estate', pincode: '400076', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 160, status: PICKUP_STATUS.ARRIVED, prsId: 'PRS-99',
    actualWeightKg: 165, volumetricWeightKg: 150,
    consignee: { name: 'Wellbeing Nutrition Store — Malviya Nagar', city: 'Jaipur', pincode: '302017' },
    packagesCount: 5, scannedCount: 2,
    awbNumbers: ['PU-3407-AWB-01', 'PU-3407-AWB-02'],
    docketNumber: null, createdAt: '3 days ago',
  },
  {
    id: 'PU-3408', clientId: 'bombae', clientName: 'Bombae',
    consignor: { name: 'Bombae Fulfilment Center', company: 'Bombae', phone: '9820033444', email: 'fc.mumbai@bombae.co', address: 'Goregaon East Industrial Area', pincode: '400063', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 120, status: PICKUP_STATUS.ARRIVED, prsId: 'PRS-99',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '3 days ago',
  },

  // --- Andheri Depot, 3 more ungrouped pickups — with PU-3401/PU-3402 this
  // hub now has 5, clearing MIN_PICKUPS_TO_SUGGEST (data/prs.js) so Pending
  // PRS suggests one real 5-pickup draft here instead of a token 1-2.
  {
    id: 'PU-3409', clientId: 'boat-lifestyle', clientName: 'boAt Lifestyle',
    consignor: { name: 'boAt Lifestyle Warehouse', company: 'Imagine Marketing (boAt)', phone: '9820033445', email: 'wh.mumbai@boat-lifestyle.com', address: 'Andheri East MIDC', pincode: '400069', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 175, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-16', scheduledTime: '14:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '25 minutes ago',
  },
  {
    id: 'PU-3410', clientId: 'the-man-company', clientName: 'The Man Company',
    consignor: { name: 'The Man Company FC', company: 'The Man Company', phone: '9820033446', email: 'fc.mumbai@themancompany.com', address: 'Malad West Industrial Area', pincode: '400064', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 95, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-17', scheduledTime: '15:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '20 minutes ago',
  },
  {
    id: 'PU-3411', clientId: 'mokobara', clientName: 'Mokobara',
    consignor: { name: 'Mokobara Warehouse', company: 'Mokobara', phone: '9820033447', email: 'wh.mumbai@mokobara.com', address: 'Chakala MIDC', pincode: '400093', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-andheri-depot', dropMiniHubName: 'Andheri Depot',
    estWeightKg: 210, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-17', scheduledTime: '16:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '10 minutes ago',
  },

  // --- Whitefield Depot (Bengaluru), 5 fresh pickups — a clean 5-pickup
  // draft example for a hub that had none before.
  {
    id: 'PU-3412', clientId: 'mcaffeine', clientName: 'mCaffeine',
    consignor: { name: 'mCaffeine Warehouse', company: 'mCaffeine', phone: '9900112255', email: 'wh.blr@mcaffeine.com', address: 'Whitefield Main Road', pincode: '560066', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-whitefield-depot', dropMiniHubName: 'Whitefield Depot',
    estWeightKg: 130, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-17', scheduledTime: '17:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '55 minutes ago',
  },
  {
    id: 'PU-3413', clientId: 'the-whole-truth', clientName: 'The Whole Truth',
    consignor: { name: 'The Whole Truth FC', company: 'The Whole Truth Foods', phone: '9900112256', email: 'fc.blr@thewholetruthfoods.com', address: 'ITPL Road, Whitefield', pincode: '560066', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-whitefield-depot', dropMiniHubName: 'Whitefield Depot',
    estWeightKg: 85, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-17', scheduledTime: '09:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '50 minutes ago',
  },
  {
    id: 'PU-3414', clientId: 'yoga-bar', clientName: 'Yoga Bar',
    consignor: { name: 'Yoga Bar DC', company: 'Sattviko (Yoga Bar)', phone: '9900112257', email: 'dc.blr@yogabar.in', address: 'Hoodi Industrial Area', pincode: '560048', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-whitefield-depot', dropMiniHubName: 'Whitefield Depot',
    estWeightKg: 160, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-17', scheduledTime: '10:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '45 minutes ago',
  },
  {
    id: 'PU-3415', clientId: 'rage-coffee', clientName: 'Rage Coffee',
    consignor: { name: 'Rage Coffee Warehouse', company: 'Rage Coffee', phone: '9900112258', email: 'wh.blr@ragecoffee.com', address: 'Whitefield Industrial Area', pincode: '560066', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-whitefield-depot', dropMiniHubName: 'Whitefield Depot',
    estWeightKg: 70, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-17', scheduledTime: '11:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '40 minutes ago',
  },
  {
    id: 'PU-3416', clientId: 'slurrp-farm', clientName: 'Slurrp Farm',
    consignor: { name: 'Slurrp Farm FC', company: 'Slurrp Farm', phone: '9900112259', email: 'fc.blr@slurrpfarm.com', address: 'Brookefield Industrial Area', pincode: '560037', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-whitefield-depot', dropMiniHubName: 'Whitefield Depot',
    estWeightKg: 140, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-17', scheduledTime: '13:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '35 minutes ago',
  },

  // --- Mundka Depot (New Delhi), 5 fresh pickups.
  {
    id: 'PU-3417', clientId: 'snitch', clientName: 'Snitch',
    consignor: { name: 'Snitch Warehouse', company: 'Snitch Fashion', phone: '9911033361', email: 'wh.delhi@snitch.co.in', address: 'Mundka Industrial Area', pincode: '110041', city: 'New Delhi', state: 'Delhi' },
    dropMiniHubId: 'mh-mundka-depot', dropMiniHubName: 'Mundka Depot',
    estWeightKg: 120, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-17', scheduledTime: '14:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '1 hour ago',
  },
  {
    id: 'PU-3418', clientId: 'bewakoof', clientName: 'Bewakoof',
    consignor: { name: 'Bewakoof FC', company: 'Bewakoof.com', phone: '9911033362', email: 'fc.delhi@bewakoof.com', address: 'Nangloi Industrial Area', pincode: '110041', city: 'New Delhi', state: 'Delhi' },
    dropMiniHubId: 'mh-mundka-depot', dropMiniHubName: 'Mundka Depot',
    estWeightKg: 200, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-18', scheduledTime: '15:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '55 minutes ago',
  },
  {
    id: 'PU-3419', clientId: 'the-souled-store', clientName: 'The Souled Store',
    consignor: { name: 'The Souled Store DC', company: 'The Souled Store', phone: '9911033363', email: 'dc.delhi@thesouledstore.com', address: 'Peeragarhi Industrial Area', pincode: '110087', city: 'New Delhi', state: 'Delhi' },
    dropMiniHubId: 'mh-mundka-depot', dropMiniHubName: 'Mundka Depot',
    estWeightKg: 90, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-18', scheduledTime: '16:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '50 minutes ago',
  },
  {
    id: 'PU-3420', clientId: 'zivame', clientName: 'Zivame',
    consignor: { name: 'Zivame Warehouse', company: 'Zivame', phone: '9911033364', email: 'wh.delhi@zivame.com', address: 'Mundka Depot Road', pincode: '110041', city: 'New Delhi', state: 'Delhi' },
    dropMiniHubId: 'mh-mundka-depot', dropMiniHubName: 'Mundka Depot',
    estWeightKg: 60, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-18', scheduledTime: '17:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '45 minutes ago',
  },
  {
    id: 'PU-3421', clientId: 'wakefit', clientName: 'Wakefit',
    consignor: { name: 'Wakefit FC', company: 'Wakefit Innovations', phone: '9911033365', email: 'fc.delhi@wakefit.co', address: 'Najafgarh Road Industrial Area', pincode: '110041', city: 'New Delhi', state: 'Delhi' },
    dropMiniHubId: 'mh-mundka-depot', dropMiniHubName: 'Mundka Depot',
    estWeightKg: 250, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-18', scheduledTime: '09:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '40 minutes ago',
  },

  // --- Udyog Vihar Yard (Gurugram), 5 fresh pickups.
  {
    id: 'PU-3422', clientId: 'urban-ladder', clientName: 'Urban Ladder',
    consignor: { name: 'Urban Ladder Warehouse', company: 'Urban Ladder', phone: '9911044471', email: 'wh.gurugram@urbanladder.com', address: 'Udyog Vihar Phase 5', pincode: '122016', city: 'Gurugram', state: 'Haryana' },
    dropMiniHubId: 'mh-udyog-vihar-yard', dropMiniHubName: 'Udyog Vihar Yard',
    estWeightKg: 220, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-19', scheduledTime: '10:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '1 hour ago',
  },
  {
    id: 'PU-3423', clientId: 'chumbak', clientName: 'Chumbak',
    consignor: { name: 'Chumbak FC', company: 'Chumbak Design', phone: '9911044472', email: 'fc.gurugram@chumbak.com', address: 'Udyog Vihar Phase 2', pincode: '122008', city: 'Gurugram', state: 'Haryana' },
    dropMiniHubId: 'mh-udyog-vihar-yard', dropMiniHubName: 'Udyog Vihar Yard',
    estWeightKg: 100, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-19', scheduledTime: '11:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '55 minutes ago',
  },
  {
    id: 'PU-3424', clientId: 'faballey', clientName: 'Faballey',
    consignor: { name: 'Faballey DC', company: 'Indiaplaza (Faballey)', phone: '9911044473', email: 'dc.gurugram@faballey.com', address: 'Sector 18 Industrial Area', pincode: '122015', city: 'Gurugram', state: 'Haryana' },
    dropMiniHubId: 'mh-udyog-vihar-yard', dropMiniHubName: 'Udyog Vihar Yard',
    estWeightKg: 80, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-19', scheduledTime: '13:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '50 minutes ago',
  },
  {
    id: 'PU-3425', clientId: 'beardo', clientName: 'Beardo',
    consignor: { name: 'Beardo Warehouse', company: 'Beardo', phone: '9911044474', email: 'wh.gurugram@beardo.in', address: 'Udyog Vihar Phase 1', pincode: '122016', city: 'Gurugram', state: 'Haryana' },
    dropMiniHubId: 'mh-udyog-vihar-yard', dropMiniHubName: 'Udyog Vihar Yard',
    estWeightKg: 60, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-20', scheduledTime: '14:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '45 minutes ago',
  },
  {
    id: 'PU-3426', clientId: 'man-matters', clientName: 'Man Matters',
    consignor: { name: 'Man Matters FC', company: 'Bombay Shaving Company (Man Matters)', phone: '9911044475', email: 'fc.gurugram@manmatters.com', address: 'Sector 20 Industrial Area', pincode: '122016', city: 'Gurugram', state: 'Haryana' },
    dropMiniHubId: 'mh-udyog-vihar-yard', dropMiniHubName: 'Udyog Vihar Yard',
    estWeightKg: 75, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-20', scheduledTime: '15:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '40 minutes ago',
  },

  // --- Vatva Yard (Ahmedabad), 4 more — with PU-3400 this hub now has 5.
  {
    id: 'PU-3427', clientId: 'arata', clientName: 'Arata',
    consignor: { name: 'Arata Warehouse', company: 'Arata', phone: '9925066681', email: 'wh.ahmedabad@arata.in', address: 'Vatva GIDC', pincode: '382445', city: 'Ahmedabad', state: 'Gujarat' },
    dropMiniHubId: 'mh-vatva-yard', dropMiniHubName: 'Vatva Yard',
    estWeightKg: 90, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-20', scheduledTime: '16:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '1 hour ago',
  },
  {
    id: 'PU-3428', clientId: 'kapiva-ayurveda', clientName: 'Kapiva Ayurveda',
    consignor: { name: 'Kapiva Ayurveda DC', company: 'Kapiva Ayurveda', phone: '9925066682', email: 'dc.ahmedabad@kapiva.in', address: 'Naroda Industrial Estate', pincode: '382330', city: 'Ahmedabad', state: 'Gujarat' },
    dropMiniHubId: 'mh-vatva-yard', dropMiniHubName: 'Vatva Yard',
    estWeightKg: 110, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-21', scheduledTime: '17:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '55 minutes ago',
  },
  {
    id: 'PU-3429', clientId: 'traya-health', clientName: 'Traya Health',
    consignor: { name: 'Traya Health FC', company: 'Traya Health', phone: '9925066683', email: 'fc.ahmedabad@traya.health', address: 'Odhav Industrial Estate', pincode: '382415', city: 'Ahmedabad', state: 'Gujarat' },
    dropMiniHubId: 'mh-vatva-yard', dropMiniHubName: 'Vatva Yard',
    estWeightKg: 60, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-21', scheduledTime: '09:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '50 minutes ago',
  },
  {
    id: 'PU-3430', clientId: 'just-herbs', clientName: 'Just Herbs',
    consignor: { name: 'Just Herbs Warehouse', company: 'Just Herbs', phone: '9925066684', email: 'wh.ahmedabad@justherbs.in', address: 'Vatva Industrial Estate', pincode: '382445', city: 'Ahmedabad', state: 'Gujarat' },
    dropMiniHubId: 'mh-vatva-yard', dropMiniHubName: 'Vatva Yard',
    estWeightKg: 130, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-21', scheduledTime: '10:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '45 minutes ago',
  },

  // --- Bhandup Yard (Mumbai), 4 pickups — below MIN_PICKUPS_TO_SUGGEST, so
  // these sit in the Unassigned Pickups pool (PRS.jsx) still accumulating.
  {
    id: 'PU-3431', clientId: 'pilgrim', clientName: 'Pilgrim',
    consignor: { name: 'Pilgrim FC', company: 'Pilgrim', phone: '9820055591', email: 'fc.mumbai@pilgrim.world', address: 'Bhandup West Industrial Estate', pincode: '400078', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-bhandup-yard', dropMiniHubName: 'Bhandup Yard',
    estWeightKg: 100, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-22', scheduledTime: '11:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '1 hour ago',
  },
  {
    id: 'PU-3432', clientId: 'minimalist', clientName: 'Minimalist',
    consignor: { name: 'Minimalist Warehouse', company: 'Minimalist', phone: '9820055592', email: 'wh.mumbai@beminimalist.co', address: 'Bhandup East Industrial Area', pincode: '400042', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-bhandup-yard', dropMiniHubName: 'Bhandup Yard',
    estWeightKg: 80, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-22', scheduledTime: '13:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '55 minutes ago',
  },
  {
    id: 'PU-3433', clientId: 'dot-and-key', clientName: 'Dot & Key',
    consignor: { name: 'Dot & Key DC', company: 'Dot & Key', phone: '9820055593', email: 'dc.mumbai@dotandkey.com', address: 'Mulund West Industrial Estate', pincode: '400080', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-bhandup-yard', dropMiniHubName: 'Bhandup Yard',
    estWeightKg: 120, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-22', scheduledTime: '14:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '50 minutes ago',
  },
  {
    id: 'PU-3434', clientId: 'foxtale', clientName: 'Foxtale',
    consignor: { name: 'Foxtale Fulfilment Center', company: 'Foxtale', phone: '9820055594', email: 'fc.mumbai@foxtale.in', address: 'Nahur Industrial Estate', pincode: '400078', city: 'Mumbai', state: 'Maharashtra' },
    dropMiniHubId: 'mh-bhandup-yard', dropMiniHubName: 'Bhandup Yard',
    estWeightKg: 95, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-23', scheduledTime: '15:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '45 minutes ago',
  },

  // --- Electronic City Yard (Bengaluru), 3 more ungrouped pickups — also
  // below MIN_PICKUPS_TO_SUGGEST, part of the Unassigned Pickups pool.
  {
    id: 'PU-3435', clientId: 'country-delight', clientName: 'Country Delight',
    consignor: { name: 'Country Delight DC', company: 'Country Delight', phone: '9900122265', email: 'dc.blr@countrydelight.in', address: 'Electronic City Phase 2', pincode: '560100', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-electronic-city-yard', dropMiniHubName: 'Electronic City Yard',
    estWeightKg: 140, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-23', scheduledTime: '16:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '1 hour ago',
  },
  {
    id: 'PU-3436', clientId: 'licious', clientName: 'Licious',
    consignor: { name: 'Licious Fulfilment Center', company: 'Licious', phone: '9900122266', email: 'fc.blr@licious.in', address: 'Electronic City Phase 1', pincode: '560100', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-electronic-city-yard', dropMiniHubName: 'Electronic City Yard',
    estWeightKg: 200, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-23', scheduledTime: '17:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '55 minutes ago',
  },
  {
    id: 'PU-3437', clientId: 'the-good-bug', clientName: 'The Good Bug',
    consignor: { name: 'The Good Bug Warehouse', company: 'The Good Bug', phone: '9900122267', email: 'wh.blr@thegoodbug.co', address: 'Electronic City Phase 2', pincode: '560100', city: 'Bengaluru', state: 'Karnataka' },
    dropMiniHubId: 'mh-electronic-city-yard', dropMiniHubName: 'Electronic City Yard',
    estWeightKg: 65, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-24', scheduledTime: '09:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '50 minutes ago',
  },

  // --- Ambattur Depot (Chennai), 2 more — with PU-3404 this hub now has 3,
  // still below MIN_PICKUPS_TO_SUGGEST, so it stays unassigned too.
  {
    id: 'PU-3438', clientId: 'zoff-foods', clientName: 'Zoff Foods',
    consignor: { name: 'Zoff Foods Warehouse', company: 'Zoff Foods', phone: '9840099002', email: 'wh.chennai@zofffoods.com', address: 'Ambattur Industrial Estate', pincode: '600058', city: 'Chennai', state: 'Tamil Nadu' },
    dropMiniHubId: 'mh-ambattur-depot', dropMiniHubName: 'Ambattur Depot',
    estWeightKg: 85, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-24', scheduledTime: '10:30',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '40 minutes ago',
  },
  {
    id: 'PU-3439', clientId: 'true-elements', clientName: 'True Elements',
    consignor: { name: 'True Elements FC', company: 'True Elements', phone: '9840099003', email: 'fc.chennai@trueelements.com', address: 'Ambattur Industrial Estate', pincode: '600053', city: 'Chennai', state: 'Tamil Nadu' },
    dropMiniHubId: 'mh-ambattur-depot', dropMiniHubName: 'Ambattur Depot',
    estWeightKg: 100, status: PICKUP_STATUS.CREATED, prsId: null,
    scheduledDate: '2026-09-24', scheduledTime: '11:00',
    actualWeightKg: null, volumetricWeightKg: null, consignee: null,
    packagesCount: null, scannedCount: 0, awbNumbers: [], docketNumber: null, createdAt: '35 minutes ago',
  },
]
