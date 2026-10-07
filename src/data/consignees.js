// Consignees (delivery parties) — one global master, mapped to clients via
// `clientIds`. Same shape/purpose as consignors.js; in the real system this
// list is expected to accumulate automatically as pickups are booked, so
// manual create is just a fallback for when one's needed ahead of a booking.
import { createPartyStore } from './parties.js'
import { CONSIGNEE_SEED } from './partiesSeed.js'

const store = createPartyStore('consignee', CONSIGNEE_SEED)

export const getConsigneesForClient = (clientId) => store.forClient(clientId)
export const addConsigneeForClient = (clientId, consignee) => store.addForClient(clientId, consignee)
export const updateConsigneeForClient = (_clientId, consigneeId, updates) => store.update(consigneeId, updates)
export const removeConsigneeForClient = (clientId, consigneeId) => store.unmapFromClient(clientId, consigneeId)

export const getAllConsignees = () => store.all()
export const createConsignee = (data) => store.create(data)
export const updateConsignee = (id, updates) => store.update(id, updates)
