// PRS (Pickup Run Sheet) — batches ungrouped pickups (data/pickups.js,
// PICKUP_STATUS.CREATED) into a run assigned to one vehicle. Suggestion is a
// simple, explainable heuristic (not a real routing engine): group by drop
// Mini Hub (the "nearby" proxy — same Mini Hub ≈ same lane/area), then chunk
// each hub's pickups by the assigned vehicle's weight capacity. A supervisor
// can still edit the suggestion (move pickups between drafts, swap vehicles)
// before generating.
import { MINI_HUBS, PICKUP_STATUS, assignPickupsToPrs } from './pickups.js'
import { FLEET_SEED, VEHICLE_STATUS } from './fleet.js'

export const PRS_STATUS = {
  DRAFT: 'draft',
  GENERATED: 'generated',
}

let prsSeq = 103
function nextPrsId() {
  return `PRS-${prsSeq++}`
}

function availableVehicles() {
  return FLEET_SEED.filter((v) => v.status === VEHICLE_STATUS.AVAILABLE)
}

// A hub needs a minimum amount of accumulated volume before it's worth
// suggesting a run — dispatching a truck for 1-2 parcels isn't efficient.
// Below this, a hub's pickups just sit in the ungrouped pool (PRS.jsx's
// "Unassigned Pickups" tab) until more volume comes in.
export const MIN_PICKUPS_TO_SUGGEST = 5

// One suggested draft per (Mini Hub, vehicle) chunk — a hub's pickups are
// packed into successive vehicles (by capacityKg) so no single run overloads
// its truck; if every matching-city vehicle is already used up, the leftover
// chunk gets a "no vehicle available" draft the supervisor must resolve by
// hand rather than silently dropping those pickups.
export function suggestPrsGroups(pickups) {
  const ungrouped = pickups.filter((p) => p.status === PICKUP_STATUS.CREATED)
  const usedVehicleIds = new Set()
  const groups = []
  let tempSeq = 1

  MINI_HUBS.forEach((hub) => {
    const hubPickups = ungrouped.filter((p) => p.dropMiniHubId === hub.id)
    if (hubPickups.length < MIN_PICKUPS_TO_SUGGEST) return

    const candidateVehicles = [
      ...availableVehicles().filter((v) => v.city === hub.city && !usedVehicleIds.has(v.id)),
      ...availableVehicles().filter((v) => v.city !== hub.city && !usedVehicleIds.has(v.id)),
    ]

    let remaining = [...hubPickups]
    while (remaining.length) {
      const vehicle = candidateVehicles.find((v) => !usedVehicleIds.has(v.id))
      const capacityKg = vehicle?.capacityKg ?? Infinity
      const chunk = []
      let chunkWeight = 0
      remaining = remaining.filter((p) => {
        if (chunkWeight + p.estWeightKg <= capacityKg || chunk.length === 0) {
          chunk.push(p)
          chunkWeight += p.estWeightKg
          return false
        }
        return true
      })
      if (vehicle) usedVehicleIds.add(vehicle.id)
      groups.push({
        tempId: `draft-${tempSeq++}`,
        hubId: hub.id,
        hubName: hub.name,
        hubCity: hub.city,
        vehicleId: vehicle?.id ?? null,
        pickupIds: chunk.map((p) => p.id),
        totalEstWeightKg: chunkWeight,
      })
    }
  })

  return groups
}

// Reassigns the vehicle (and its driver) on an already-generated PRS — a
// supervisor's "Edit" action, e.g. if a vehicle breaks down after generation.
export function updatePrsVehicle(prsId, vehicleId) {
  const prs = PRS_SEED.find((row) => row.id === prsId)
  if (!prs) return null
  const vehicle = FLEET_SEED.find((v) => v.id === vehicleId) ?? null
  prs.vehicleId = vehicleId
  prs.vehicleLabel = vehicle ? `${vehicle.regNo} · ${vehicle.type}` : 'Unassigned'
  prs.driverName = vehicle?.driverName ?? null
  return prs
}

// Finalizes one draft group into a real PRS — pushes to PRS_SEED and marks
// every pickup in it GROUPED (see assignPickupsToPrs, data/pickups.js).
export function generatePrs({ hubName, vehicleId, pickupIds }) {
  const id = nextPrsId()
  const vehicle = FLEET_SEED.find((v) => v.id === vehicleId) ?? null
  const prs = {
    id,
    hubName,
    vehicleId,
    vehicleLabel: vehicle ? `${vehicle.regNo} · ${vehicle.type}` : 'Unassigned',
    driverName: vehicle?.driverName ?? null,
    pickupIds,
    status: PRS_STATUS.GENERATED,
    generatedAt: 'Just now',
  }
  PRS_SEED.unshift(prs)
  assignPickupsToPrs(pickupIds, id)
  return prs
}

export const PRS_SEED = [
  // Seed IDs stay below 101 or start at 103+ (nextPrsId's counter) so a
  // freshly generated PRS never collides with one of these.
  { id: 'PRS-99', hubName: 'Andheri Depot', vehicleId: 'VEH-002', vehicleLabel: 'MH04 CD 5678 · MCV · up to 7.5T', driverName: 'Suresh Patil', pickupIds: ['PU-3405', 'PU-3406', 'PU-3407', 'PU-3408'], status: PRS_STATUS.GENERATED, generatedAt: '3 days ago' },
  { id: 'PRS-100', hubName: 'Electronic City Yard', vehicleId: 'VEH-006', vehicleLabel: 'KA05 NO 2345 · MCV · up to 7.5T', driverName: 'Kiran Kumar', pickupIds: ['PU-3403'], status: PRS_STATUS.GENERATED, generatedAt: '35 minutes ago' },
  { id: 'PRS-101', hubName: 'Andheri Depot', vehicleId: 'VEH-001', vehicleLabel: 'MH04 AB 1234 · HCV · up to 16T', driverName: 'Ramesh Yadav', pickupIds: ['PU-3390'], status: PRS_STATUS.GENERATED, generatedAt: '2 days ago' },
  { id: 'PRS-102', hubName: 'Udyog Vihar Yard', vehicleId: 'VEH-004', vehicleLabel: 'DL01 JK 3456 · ICV · up to 3.5T', driverName: 'Anil Kumar', pickupIds: ['PU-3395', 'PU-3398', 'PU-3399'], status: PRS_STATUS.GENERATED, generatedAt: '1 day ago' },
]
