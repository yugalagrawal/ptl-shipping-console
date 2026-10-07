// Consignors (pickup parties) — one global master, mapped to clients via
// `clientIds`. Managed in Master Module > Consignor/Consignee; also listed,
// added and unmapped per client in Client Configuration > Consignor &
// Consignee. Distinct from the order-history-derived picker in Create Pickup.
import { createPartyStore } from './parties.js'
import { CONSIGNOR_SEED } from './partiesSeed.js'

const store = createPartyStore('consignor', CONSIGNOR_SEED)

export const getConsignorsForClient = (clientId) => store.forClient(clientId)
export const addConsignorForClient = (clientId, consignor) => store.addForClient(clientId, consignor)
export const updateConsignorForClient = (_clientId, consignorId, updates) => store.update(consignorId, updates)
export const removeConsignorForClient = (clientId, consignorId) => store.unmapFromClient(clientId, consignorId)

export const getAllConsignors = () => store.all()
export const createConsignor = (data) => store.create(data)
export const updateConsignor = (id, updates) => store.update(id, updates)
