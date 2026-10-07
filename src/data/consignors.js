// Consignors mapped to a client from Client Configuration > Consignor &
// Consignee — a client's own master list of pickup parties, distinct from
// the ad-hoc consignor picker in Create Pickup (order/CreatePickup.jsx),
// which derives its suggestions from order history rather than from an
// explicit per-client list. Plain mutable module store, same convention as
// CLIENT_CONFIG_STORE in clientConfigFields.js — no backend here.
let consignorRowSeq = 1
const CONSIGNORS_BY_CLIENT = {}

export function getConsignorsForClient(clientId) {
  return CONSIGNORS_BY_CLIENT[clientId] ?? []
}

export function addConsignorForClient(clientId, consignor) {
  const row = { id: `consignor-${consignorRowSeq++}`, ...consignor }
  CONSIGNORS_BY_CLIENT[clientId] = [...getConsignorsForClient(clientId), row]
  return row
}

export function updateConsignorForClient(clientId, consignorId, updates) {
  CONSIGNORS_BY_CLIENT[clientId] = getConsignorsForClient(clientId).map((c) => (c.id === consignorId ? { ...c, ...updates } : c))
}

export function removeConsignorForClient(clientId, consignorId) {
  CONSIGNORS_BY_CLIENT[clientId] = getConsignorsForClient(clientId).filter((c) => c.id !== consignorId)
}

// Flat list across every client, each row tagged with its clientId — feeds
// Master Module > Consignor-Consignee Masters.
export function getAllConsignors() {
  return Object.entries(CONSIGNORS_BY_CLIENT).flatMap(([clientId, rows]) => rows.map((r) => ({ ...r, clientId })))
}
