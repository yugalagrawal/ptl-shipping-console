// Supply & Fleet Module — vendor fleet, owned assets, drivers and the
// truck-to-AWB/manifest matching queue. Net-new domain (no prior module
// covered fleet/driver master data — Trip Management's old "Supply
// Management" tab was a lane cost/capacity *simulator*, not a real fleet
// roster; that page moved to Network Simulator and is unrelated to this).

export const OWNERSHIP_TYPES = ['Owned', 'Vendor']

export const VEHICLE_TYPES = [
  { type: 'ICV · up to 3.5T', capacityKg: 1500, capacityCft: 350 },
  { type: 'MCV · up to 7.5T', capacityKg: 3500, capacityCft: 650 },
  { type: 'HCV · up to 16T', capacityKg: 9000, capacityCft: 1400 },
  { type: '32ft container', capacityKg: 18000, capacityCft: 2500 },
]

export const COMPLIANCE_STATUS = {
  VALID: 'valid',
  EXPIRING: 'expiring',
  EXPIRED: 'expired',
}

export const COMPLIANCE_LABEL = {
  [COMPLIANCE_STATUS.VALID]: 'Valid',
  [COMPLIANCE_STATUS.EXPIRING]: 'Expiring Soon',
  [COMPLIANCE_STATUS.EXPIRED]: 'Expired',
}

export const COMPLIANCE_BADGE = {
  [COMPLIANCE_STATUS.VALID]: 'bg-emerald-50 text-emerald-700',
  [COMPLIANCE_STATUS.EXPIRING]: 'bg-amber-50 text-amber-700',
  [COMPLIANCE_STATUS.EXPIRED]: 'bg-rose-50 text-rose-700',
}

export const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  ON_TRIP: 'on_trip',
  MAINTENANCE: 'maintenance',
}

export const VEHICLE_STATUS_LABEL = {
  [VEHICLE_STATUS.AVAILABLE]: 'Available',
  [VEHICLE_STATUS.ON_TRIP]: 'On Trip',
  [VEHICLE_STATUS.MAINTENANCE]: 'Maintenance',
}

export const VEHICLE_STATUS_BADGE = {
  [VEHICLE_STATUS.AVAILABLE]: 'bg-emerald-50 text-emerald-700',
  [VEHICLE_STATUS.ON_TRIP]: 'bg-sky-50 text-sky-700',
  [VEHICLE_STATUS.MAINTENANCE]: 'bg-slate-100 text-slate-500',
}

function vehicleSpec(type) {
  return VEHICLE_TYPES.find((v) => v.type === type)
}

export const FLEET_SEED = [
  { id: 'VEH-001', regNo: 'MH04 AB 1234', type: 'HCV · up to 16T', ownership: 'Owned', vendorName: '', driverName: 'Ramesh Yadav', driverPhone: '9820011001', city: 'Mumbai', branch: 'Bhiwandi Hub', status: VEHICLE_STATUS.AVAILABLE, compliance: COMPLIANCE_STATUS.VALID, permitExpiry: '2027-03-10', insuranceExpiry: '2026-12-01' },
  { id: 'VEH-002', regNo: 'MH04 CD 5678', type: 'MCV · up to 7.5T', ownership: 'Vendor', vendorName: 'Shree Balaji Logistics', driverName: 'Suresh Patil', driverPhone: '9820011002', city: 'Mumbai', branch: 'Andheri Branch', status: VEHICLE_STATUS.ON_TRIP, compliance: COMPLIANCE_STATUS.VALID, permitExpiry: '2026-10-15', insuranceExpiry: '2027-01-20' },
  { id: 'VEH-003', regNo: 'DL01 GH 9012', type: '32ft container', ownership: 'Owned', vendorName: '', driverName: 'Vikram Singh', driverPhone: '9911022001', city: 'New Delhi', branch: 'Okhla Hub', status: VEHICLE_STATUS.AVAILABLE, compliance: COMPLIANCE_STATUS.EXPIRING, permitExpiry: '2026-08-20', insuranceExpiry: '2026-09-05' },
  { id: 'VEH-004', regNo: 'DL01 JK 3456', type: 'ICV · up to 3.5T', ownership: 'Vendor', vendorName: 'Kumar Roadlines', driverName: 'Anil Kumar', driverPhone: '9911022002', city: 'New Delhi', branch: 'Mundka Branch', status: VEHICLE_STATUS.AVAILABLE, compliance: COMPLIANCE_STATUS.VALID, permitExpiry: '2027-02-01', insuranceExpiry: '2027-02-01' },
  { id: 'VEH-005', regNo: 'KA05 LM 7890', type: 'HCV · up to 16T', ownership: 'Owned', vendorName: '', driverName: 'Manoj Reddy', driverPhone: '9880033001', city: 'Bengaluru', branch: 'Peenya Hub', status: VEHICLE_STATUS.MAINTENANCE, compliance: COMPLIANCE_STATUS.EXPIRED, permitExpiry: '2026-06-01', insuranceExpiry: '2026-07-01' },
  { id: 'VEH-006', regNo: 'KA05 NO 2345', type: 'MCV · up to 7.5T', ownership: 'Vendor', vendorName: 'Sri Ganesh Transport', driverName: 'Kiran Kumar', driverPhone: '9880033002', city: 'Bengaluru', branch: 'Whitefield Branch', status: VEHICLE_STATUS.AVAILABLE, compliance: COMPLIANCE_STATUS.VALID, permitExpiry: '2027-04-12', insuranceExpiry: '2026-11-18' },
  { id: 'VEH-007', regNo: 'TN09 PQ 6789', type: '32ft container', ownership: 'Vendor', vendorName: 'Chennai Freight Carriers', driverName: 'Karthik Raja', driverPhone: '9840044001', city: 'Chennai', branch: 'Ambattur Hub', status: VEHICLE_STATUS.AVAILABLE, compliance: COMPLIANCE_STATUS.VALID, permitExpiry: '2027-01-01', insuranceExpiry: '2027-03-01' },
  { id: 'VEH-008', regNo: 'GJ01 RS 0123', type: 'ICV · up to 3.5T', ownership: 'Owned', vendorName: '', driverName: 'Bhavesh Shah', driverPhone: '9925055001', city: 'Ahmedabad', branch: 'Vatva Hub', status: VEHICLE_STATUS.AVAILABLE, compliance: COMPLIANCE_STATUS.VALID, permitExpiry: '2026-12-31', insuranceExpiry: '2026-10-10' },
].map((v) => ({ ...v, ...vehicleSpec(v.type) }))

// Manifests / lanes currently sitting in the truck-assignment queue —
// aggregate demand (weight + volume) waiting for a matching vehicle, the
// PTL analogue of "these AWBs are grouped, now pick a truck." Deliberately
// not derived from ORDERS_SEED (data/orders.js) — that module only tracks a
// single AWB's own status up to "Inward at Origin Hub," it has no concept of
// AWBs being grouped into a manifest yet (that linkage is Routing
// Simulator's job, still a placeholder) — this is illustrative demand.
export const ASSIGNMENT_QUEUE_SEED = [
  { id: 'MF-3301', originCity: 'Mumbai', lane: 'Mumbai (Bhiwandi Hub) → Pune', awbCount: 42, totalWeightKg: 3200, totalVolumeCft: 480, priority: 'Standard', cutoff: 'Today, 6:00 PM' },
  { id: 'MF-3302', originCity: 'New Delhi', lane: 'New Delhi (Okhla Hub) → Jaipur', awbCount: 18, totalWeightKg: 1350, totalVolumeCft: 210, priority: 'Priority', cutoff: 'Today, 4:00 PM' },
  { id: 'MF-3303', originCity: 'Bengaluru', lane: 'Bengaluru (Peenya Hub) → Chennai', awbCount: 65, totalWeightKg: 8100, totalVolumeCft: 1250, priority: 'Standard', cutoff: 'Tomorrow, 9:00 AM' },
  { id: 'MF-3304', originCity: 'Ahmedabad', lane: 'Ahmedabad (Vatva Hub) → Mumbai', awbCount: 9, totalWeightKg: 780, totalVolumeCft: 140, priority: 'Standard', cutoff: 'Tomorrow, 11:00 AM' },
]

// Best-fit match for a manifest's demand: among available (not on-trip / in
// maintenance) vehicles that cover both weight AND volume demand, prefer
// same-city first (route efficiency — a truck sitting in the origin city,
// not one that itself needs a long empty run to get there), then the
// smallest vehicle that still fits (maximizes utilization %, avoids sending
// a 32ft container for a 200kg parcel). Falls back to the largest available
// vehicle anywhere (flagged as an overflow/partial match) if nothing fits.
export function bestFleetMatch(manifest, fleet = FLEET_SEED) {
  const available = fleet.filter((v) => v.status === VEHICLE_STATUS.AVAILABLE && v.compliance !== COMPLIANCE_STATUS.EXPIRED)
  const fits = available
    .filter((v) => v.capacityKg >= manifest.totalWeightKg && v.capacityCft >= manifest.totalVolumeCft)
    .sort((a, b) => {
      const sameCityA = a.city === manifest.originCity ? 0 : 1
      const sameCityB = b.city === manifest.originCity ? 0 : 1
      if (sameCityA !== sameCityB) return sameCityA - sameCityB
      return a.capacityKg - b.capacityKg
    })

  if (fits.length > 0) {
    const v = fits[0]
    const utilization = Math.round(Math.max(manifest.totalWeightKg / v.capacityKg, manifest.totalVolumeCft / v.capacityCft) * 100)
    return { vehicle: v, utilization, overflow: false, offLane: v.city !== manifest.originCity }
  }

  const largest = [...available].sort((a, b) => b.capacityKg - a.capacityKg)[0]
  if (!largest) return null
  const utilization = Math.round(Math.max(manifest.totalWeightKg / largest.capacityKg, manifest.totalVolumeCft / largest.capacityCft) * 100)
  return { vehicle: largest, utilization, overflow: true, offLane: largest.city !== manifest.originCity }
}

export function assignVehicle(manifestId, vehicleId) {
  const vehicle = FLEET_SEED.find((v) => v.id === vehicleId)
  if (vehicle) vehicle.status = VEHICLE_STATUS.ON_TRIP
  const idx = ASSIGNMENT_QUEUE_SEED.findIndex((m) => m.id === manifestId)
  const manifest = idx >= 0 ? ASSIGNMENT_QUEUE_SEED[idx] : null
  if (idx >= 0) ASSIGNMENT_QUEUE_SEED.splice(idx, 1)
  return { vehicle, manifest }
}
