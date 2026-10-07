// Consignees manually mapped to a client from Client Configuration >
// Consignor & Consignee. Same shape/purpose as consignors.js — see that
// file's header for the fuller rationale (distinct from the order-history-
// derived consignee picker in New Pickup). In the real system this list is
// expected to accumulate automatically as pickups are booked for the
// client; manual "Add Consignee" here is just a fallback for when one's
// needed ahead of any actual booking.
let consigneeRowSeq = 1
const CONSIGNEES_BY_CLIENT = {}

export function getConsigneesForClient(clientId) {
  return CONSIGNEES_BY_CLIENT[clientId] ?? []
}

export function addConsigneeForClient(clientId, consignee) {
  const row = { id: `consignee-${consigneeRowSeq++}`, ...consignee }
  CONSIGNEES_BY_CLIENT[clientId] = [...getConsigneesForClient(clientId), row]
  return row
}

export function updateConsigneeForClient(clientId, consigneeId, updates) {
  CONSIGNEES_BY_CLIENT[clientId] = getConsigneesForClient(clientId).map((c) => (c.id === consigneeId ? { ...c, ...updates } : c))
}

export function removeConsigneeForClient(clientId, consigneeId) {
  CONSIGNEES_BY_CLIENT[clientId] = getConsigneesForClient(clientId).filter((c) => c.id !== consigneeId)
}

// Flat list across every client, each row tagged with its clientId — feeds
// Master Module > Consignor-Consignee Masters.
export function getAllConsignees() {
  return Object.entries(CONSIGNEES_BY_CLIENT).flatMap(([clientId, rows]) => rows.map((r) => ({ ...r, clientId })))
}
