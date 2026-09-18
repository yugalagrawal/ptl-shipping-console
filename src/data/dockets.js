// Docket Module — a docket is raised the instant a pickup finishes its final
// package scan (see scanPackage in data/pickups.js) and sits here as
// "Pending" until Create Docket > Pending Dockets marks it Ready for Trip,
// which is where route planning picks up from (not built yet).
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

let docketSeq = 5503
function nextDocketNumber() {
  return `DKT-${docketSeq++}`
}

// Called once, at the moment a pickup's last package is scanned — carries
// exactly what's known at that instant (tentative: actual weight, package/
// AWB count, drop Mini Hub) since routing/trip info doesn't exist yet.
export function createDocketFromPickup(pickup) {
  const docket = {
    docketNumber: nextDocketNumber(),
    pickupId: pickup.id,
    clientName: pickup.clientName,
    dropMiniHubName: pickup.dropMiniHubName,
    awbCount: pickup.packagesCount,
    awbNumbers: [...pickup.awbNumbers],
    totalWeightKg: pickup.actualWeightKg,
    status: DOCKET_STATUS.PENDING,
    createdAt: 'Just now',
  }
  DOCKETS_SEED.unshift(docket)
  return docket
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
    docketNumber: 'DKT-5501', pickupId: 'PU-3390', clientName: 'Nykaa', dropMiniHubName: 'Andheri Depot',
    awbCount: 6, awbNumbers: ['PU-3390-AWB-01', 'PU-3390-AWB-02', 'PU-3390-AWB-03', 'PU-3390-AWB-04', 'PU-3390-AWB-05', 'PU-3390-AWB-06'],
    totalWeightKg: 176, status: DOCKET_STATUS.READY_FOR_TRIP, createdAt: '2 days ago',
  },
  {
    docketNumber: 'DKT-5502', pickupId: 'PU-3395', clientName: 'Lenskart', dropMiniHubName: 'Udyog Vihar Yard',
    awbCount: 4, awbNumbers: ['PU-3395-AWB-01', 'PU-3395-AWB-02', 'PU-3395-AWB-03', 'PU-3395-AWB-04'],
    totalWeightKg: 98, status: DOCKET_STATUS.PENDING, createdAt: '1 day ago',
  },
]
