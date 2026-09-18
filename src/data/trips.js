// Trip Module — the connective tissue between Order Module (orders sitting
// "Inward at Origin Hub"), Supply & Fleet Module (manifests waiting for a
// truck) and Finance Management (a delivered trip is what invoicing bills
// against). This is the first module in the app that actually reads
// ORDERS_SEED to *do* something with it, rather than just displaying it.
//
// Flow: Routing Simulator groups eligible orders into a manifest (pushed
// into fleet.js's ASSIGNMENT_QUEUE_SEED) -> Truck Assignment matches a truck
// (assignVehicle) -> this module's createTripFromAssignment() turns that
// into a live Trip -> Trip Tracking marks it Delivered -> Past Trips lists
// it -> Finance Invoicing can bill the orders riding on it.

import { ORDER_STATUS } from './orders.js'
import { ASSIGNMENT_QUEUE_SEED } from './fleet.js'

export const TRIP_STATUS = {
  SCHEDULED: 'scheduled',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
}

export const TRIP_STATUS_LABEL = {
  [TRIP_STATUS.SCHEDULED]: 'Scheduled',
  [TRIP_STATUS.IN_TRANSIT]: 'In Transit',
  [TRIP_STATUS.DELIVERED]: 'Delivered',
}

export const TRIP_STATUS_BADGE = {
  [TRIP_STATUS.SCHEDULED]: 'bg-slate-100 text-slate-600',
  [TRIP_STATUS.IN_TRANSIT]: 'bg-sky-50 text-sky-700',
  [TRIP_STATUS.DELIVERED]: 'bg-emerald-50 text-emerald-700',
}

let tripSeq = 4201
function generateTripId() {
  return `TRP-${tripSeq++}`
}

// Order ids already grouped into a manifest — so Routing Simulator's
// eligible list doesn't offer the same order twice across renders. A real
// backend would just filter on the order's own state; this prototype keeps
// order.status untouched (Order Module's own docs say its status model
// deliberately stops at "Inward at Origin Hub") and tracks manifesting here
// instead, same "don't touch someone else's module state" boundary already
// used between fleet.js and orders.js.
export const MANIFESTED_ORDER_IDS = new Set()

// Orders sitting at the origin hub, ready to be grouped into a manifest,
// bucketed by lane (origin city -> destination city).
export function eligibleOrdersByLane(orders) {
  const eligible = orders.filter((o) => o.status === ORDER_STATUS.AT_ORIGIN_HUB && !MANIFESTED_ORDER_IDS.has(o.id))
  const byLane = new Map()
  eligible.forEach((o) => {
    const key = `${o.consignor.city} → ${o.consignee.city}`
    if (!byLane.has(key)) byLane.set(key, [])
    byLane.get(key).push(o)
  })
  return [...byLane.entries()].map(([lane, laneOrders]) => ({ lane, orders: laneOrders }))
}

let manifestSeq = 3305
function generateManifestId() {
  return `MF-${manifestSeq++}`
}

// Builds a manifest from a set of same-lane orders and drops it straight
// into Supply & Fleet Module's Truck Assignment queue — the actual
// "aggregate orders by lane" step the Routing Simulator exists for.
export function buildManifest(lane, orders) {
  const manifest = {
    id: generateManifestId(),
    originCity: orders[0].consignor.city,
    lane: `${orders[0].consignor.city} (${orders[0].consignor.name}) → ${orders[0].consignee.city}`,
    awbCount: orders.length,
    totalWeightKg: Math.round(orders.reduce((sum, o) => sum + o.chargeableWeightKg, 0) * 10) / 10,
    totalVolumeCft: Math.round(orders.reduce((sum, o) => sum + (o.volumetricWeightKg / 6) * 6, 0) * 10) / 10,
    priority: orders.some((o) => o.deliveryType === 'Express') ? 'Priority' : 'Standard',
    cutoff: 'Today, 6:00 PM',
    orderIds: orders.map((o) => o.id),
  }
  ASSIGNMENT_QUEUE_SEED.push(manifest)
  orders.forEach((o) => MANIFESTED_ORDER_IDS.add(o.id))
  return manifest
}

export const TRIPS_SEED = []

function seedTrip({ id, lane, vehicle, awbCount, weightKg, utilization, status, departedAt, eta, deliveredAt, podReceived = false, onTime = null, exceptions = [], orderIds = [] }) {
  return { id, lane, vehicle, awbCount, weightKg, utilization, status, departedAt, eta, deliveredAt, podReceived, onTime, exceptions, orderIds }
}

export function initTripsSeed() {
  if (TRIPS_SEED.length) return TRIPS_SEED
  TRIPS_SEED.push(
    seedTrip({
      id: generateTripId(),
      lane: 'Chennai (Ambattur Hub) → Delhi (Okhla Hub)',
      vehicle: { regNo: 'TN09 PQ 6789', type: '32ft container', ownership: 'Vendor', vendorName: 'Chennai Freight Carriers', driverName: 'Karthik Raja' },
      awbCount: 58, weightKg: 6400, utilization: 78,
      status: TRIP_STATUS.IN_TRANSIT,
      departedAt: '2026-08-02, 06:00 AM', eta: '2026-08-05, 09:00 PM',
      exceptions: [],
    }),
    seedTrip({
      id: generateTripId(),
      lane: 'Mumbai (Bhiwandi Hub) → Jaipur',
      vehicle: { regNo: 'DL01 JK 3456', type: 'ICV · up to 3.5T', ownership: 'Vendor', vendorName: 'Kumar Roadlines', driverName: 'Anil Kumar' },
      awbCount: 12, weightKg: 1100, utilization: 73,
      status: TRIP_STATUS.IN_TRANSIT,
      departedAt: '2026-08-03, 08:30 AM', eta: '2026-08-04, 11:00 AM',
      exceptions: [{ note: 'Hub hold-up at Vadodara — 3hr delay expected', loggedAt: '2026-08-03, 04:00 PM' }],
    }),
    seedTrip({
      id: generateTripId(),
      lane: 'Bengaluru (Peenya Hub) → Hyderabad',
      vehicle: { regNo: 'KA05 NO 2345', type: 'MCV · up to 7.5T', ownership: 'Vendor', vendorName: 'Sri Ganesh Transport', driverName: 'Kiran Kumar' },
      awbCount: 34, weightKg: 2900, utilization: 83,
      status: TRIP_STATUS.DELIVERED,
      departedAt: '2026-07-29, 07:00 AM', eta: '2026-07-30, 06:00 PM', deliveredAt: '2026-07-30, 05:20 PM',
      podReceived: true, onTime: true,
    }),
    seedTrip({
      id: generateTripId(),
      lane: 'New Delhi (Okhla Hub) → Chandigarh',
      vehicle: { regNo: 'DL01 GH 9012', type: '32ft container', ownership: 'Owned', driverName: 'Vikram Singh' },
      awbCount: 21, weightKg: 3300, utilization: 61,
      status: TRIP_STATUS.DELIVERED,
      departedAt: '2026-07-27, 09:00 AM', eta: '2026-07-28, 02:00 PM', deliveredAt: '2026-07-28, 01:40 PM',
      podReceived: true, onTime: true,
    }),
    seedTrip({
      id: generateTripId(),
      lane: 'Ahmedabad (Vatva Hub) → Surat',
      vehicle: { regNo: 'GJ01 RS 0123', type: 'ICV · up to 3.5T', ownership: 'Owned', driverName: 'Bhavesh Shah' },
      awbCount: 15, weightKg: 980, utilization: 65,
      status: TRIP_STATUS.DELIVERED,
      departedAt: '2026-07-25, 10:00 AM', eta: '2026-07-25, 06:00 PM', deliveredAt: '2026-07-26, 09:15 AM',
      podReceived: false, onTime: false,
    }),
  )
  return TRIPS_SEED
}

// Called once Truck Assignment confirms a vehicle for a manifest — turns
// the queue entry into a live trip. Kept in this module (not fleet.js) so
// fleet.js never needs to import trips.js — the dependency only runs one
// way, same "no circular imports" discipline as every other data module
// here.
//
// Guards with initTripsSeed() first: Truck Assignment can be the very first
// page in a session to touch TRIPS_SEED (before Trip Tracking/Past Trips
// ever call initTripsSeed themselves), and initTripsSeed's "already seeded"
// check is just `TRIPS_SEED.length` — without this guard, unshifting a
// fresh trip here first would make that check pass and silently skip
// seeding the baseline demo trips.
export function createTripFromAssignment(manifest, vehicle, utilization) {
  initTripsSeed()
  const trip = seedTrip({
    id: generateTripId(),
    lane: manifest.lane,
    vehicle: { regNo: vehicle.regNo, type: vehicle.type, ownership: vehicle.ownership, vendorName: vehicle.vendorName, driverName: vehicle.driverName },
    awbCount: manifest.awbCount,
    weightKg: manifest.totalWeightKg,
    utilization,
    status: TRIP_STATUS.SCHEDULED,
    departedAt: null,
    eta: manifest.cutoff,
    orderIds: manifest.orderIds ?? [],
  })
  TRIPS_SEED.unshift(trip)
  return trip
}

export function departTrip(tripId) {
  const trip = TRIPS_SEED.find((t) => t.id === tripId)
  if (trip) {
    trip.status = TRIP_STATUS.IN_TRANSIT
    trip.departedAt = 'Just now'
  }
  return trip
}

export function markDelivered(tripId) {
  const trip = TRIPS_SEED.find((t) => t.id === tripId)
  if (trip) {
    trip.status = TRIP_STATUS.DELIVERED
    trip.deliveredAt = 'Just now'
    trip.podReceived = true
    trip.onTime = trip.exceptions.length === 0
  }
  return trip
}

export function reportException(tripId, note) {
  const trip = TRIPS_SEED.find((t) => t.id === tripId)
  if (trip) trip.exceptions.push({ note, loggedAt: 'Just now' })
  return trip
}
