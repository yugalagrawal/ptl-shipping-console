// Order Module — Create Order (Pickup): order intake / LR (AWB) booking.
//
// Scope for this module stops at "ready to move" — once an order is Inward
// at the origin hub, Trip Management takes over (manifesting it onto a
// vehicle, tracking, POD). No manifest/trip linkage is modeled here yet.

import { computeOrderPricing, TIER_DELIVERY_PRIORITY } from './pricing.js'

export const ORDER_STATUS = {
  BOOKED: 'booked',
  PICKUP_SCHEDULED: 'pickup_scheduled',
  PICKED_UP: 'picked_up',
  AT_ORIGIN_HUB: 'at_origin_hub',
}

export const ORDER_STATUS_ORDER = [ORDER_STATUS.BOOKED, ORDER_STATUS.PICKUP_SCHEDULED, ORDER_STATUS.PICKED_UP, ORDER_STATUS.AT_ORIGIN_HUB]

export const ORDER_STATUS_LABEL = {
  [ORDER_STATUS.BOOKED]: 'Booked',
  [ORDER_STATUS.PICKUP_SCHEDULED]: 'Pickup Scheduled',
  [ORDER_STATUS.PICKED_UP]: 'Picked Up',
  [ORDER_STATUS.AT_ORIGIN_HUB]: 'Inward at Origin Hub',
}

export const ORDER_STATUS_BADGE = {
  [ORDER_STATUS.BOOKED]: 'bg-slate-100 text-slate-600',
  [ORDER_STATUS.PICKUP_SCHEDULED]: 'bg-amber-50 text-amber-700',
  [ORDER_STATUS.PICKED_UP]: 'bg-sky-50 text-sky-700',
  [ORDER_STATUS.AT_ORIGIN_HUB]: 'bg-emerald-50 text-emerald-700',
}

export const PAYMENT_MODES = ['Prepaid', 'To Pay', 'COD']
// Four fixed 6-hour windows spanning the full day — the standard logistics
// pickup-slot split (vs. arbitrary business-hours-only slots), so a pickup
// can be scheduled any time of day, not just 9-to-5.
export const PICKUP_SLOTS = ['Early Morning (12am–6am)', 'Morning (6am–12pm)', 'Afternoon (12pm–6pm)', 'Night (6pm–12am)']
export const DELIVERY_TYPES = ['Surface', 'Airway', 'Railway', 'Seaway']

// Commodity classification for the shipment's contents — the standard
// PTL/LTL "nature of goods" categories carriers use to drive handling rules
// (fragile/hazardous flags), vehicle/hub routing, and insurance — not a
// free-text description. "Others" is the deliberate escape hatch; picking it
// reveals a required free-text field in the UI rather than leaving an
// unclassified shipment.
export const CONTENT_CATEGORIES = [
  'General Merchandise',
  'Electronics & Appliances',
  'Apparel & Textiles',
  'FMCG / Consumer Goods',
  'Pharmaceuticals & Healthcare',
  'Automobile Parts & Accessories',
  'Industrial Machinery & Equipment',
  'Furniture & Fixtures',
  'Glass & Fragile Items',
  'Metal & Hardware',
  'Plastic Goods',
  'Cosmetics & Personal Care',
  'Books, Stationery & Documents',
  'Food & Beverages (Non-Perishable)',
  'Perishable Goods',
  'Chemicals (Non-Hazardous)',
  'Hazardous Materials / Dangerous Goods',
  'Others',
]

// A shipment can have more than one package "type" — e.g. 2 cartons of one
// size plus 1 of another — rather than assuming every piece is identical, per
// the legacy Zoom Panel "Create CN" package table. Each row's own volumetric
// weight is computed and summed, so pricing (which only ever needs one
// aggregate volumetricWeightKg) doesn't need to change.
export function emptyPackageRow() {
  return { l: '', w: '', h: '', count: '1' }
}

// Dimension entry unit for the Packages table — purely a data-entry
// convenience on New Order; every stored order and every pricing formula
// still works in cm underneath (see toCm() below and its use at submission),
// so nothing downstream (seed orders, MyOrders, pricing) needs to know a
// shipment was ever measured in anything but cm.
export const DIMENSION_UNITS = ['cm', 'in', 'ft', 'm']
export const DIMENSION_UNIT_TO_CM = { cm: 1, in: 2.54, ft: 30.48, m: 100 }

export function toCm(value, unit) {
  return (Number(value) || 0) * (DIMENSION_UNIT_TO_CM[unit] ?? 1)
}

export function computeVolumetricWeightKg(packages, unit = 'cm') {
  return Math.round(
    packages.reduce((sum, p) => {
      const l = toCm(p.l, unit)
      const w = toCm(p.w, unit)
      const h = toCm(p.h, unit)
      const count = Number(p.count) || 0
      if (!l || !w || !h || !count) return sum
      return sum + ((l * w * h) / 28316.85) * 6 * count
    }, 0) * 10
  ) / 10
}

export function totalPieces(packages) {
  return packages.reduce((sum, p) => sum + (Number(p.count) || 0), 0)
}

export function emptyInvoice() {
  return { number: '', value: '', ewaybillNumber: '' }
}

// How the order reached ops — ties directly to the module's own tagline
// ("API + manual (mail/WhatsApp/call) order intake"). Reference-checked
// against the legacy Softpal pickup-entry screen's "Request Type"/"Request
// By" fields, collapsed into one field here (Softpal split request source
// from something it called "Request Type" without a clear distinction).
export const REQUEST_TYPES = ['Website', 'Call', 'Email', 'WhatsApp', 'API']

export function emptyNotifications() {
  return { consignorSms: false, consignorEmail: false, consignorWhatsapp: false, consigneeSms: false, consigneeEmail: false, consigneeWhatsapp: false }
}

// Sequence-based AWB/docket numbers — prefix + yymm + 4-digit serial. A
// client with its own `awbSeries` (see data/clients.js) draws from that
// dedicated block instead of the shared national one. Real uniqueness needs
// a backend-assigned sequence once the API exists, same caveat as the
// customer-code generator in NewClient.jsx.
let nationalAwbSeq = 1042

function formatAwb(prefix, serial, date) {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${prefix}${yy}${mm}${String(serial).padStart(4, '0')}`
}

// Read-only look at the number that would be assigned next, without
// consuming it — used to show the AWB in Freight Preview before the order is
// actually booked. Must stay in sync with generateAwbNumber below.
export function peekAwbNumber(client, date = new Date()) {
  const series = client?.awbSeries
  return series ? formatAwb(series.prefix, series.nextSerial, date) : formatAwb('AWB', nationalAwbSeq, date)
}

export function awbSeriesLabel(client) {
  return client?.awbSeries ? `${client.name}'s dedicated series` : 'National running series'
}

export function generateAwbNumber(client, date = new Date()) {
  const series = client?.awbSeries
  if (series) return formatAwb(series.prefix, series.nextSerial++, date)
  return formatAwb('AWB', nationalAwbSeq++, date)
}

function seedOrder({
  id, clientId, clientName, consignor, consignee, packages, actualWeightKg, paymentType, codAmount = 0,
  pickupDate, pickupSlot, status, bookedBy, bookedAt, client, requestType = 'Website', contentDescription = '', notifications,
  billingEntity = '', deliveryType = 'Surface', invoice, fragileMaterial = false, deliveryFloorNumber = '',
  deliveryPriority,
}) {
  const pieces = totalPieces(packages)
  const volumetricWeightKg = computeVolumetricWeightKg(packages)
  const pricing = computeOrderPricing(client, {
    originPincode: consignor.pincode,
    destPincode: consignee.pincode,
    actualWeightKg,
    volumetricWeightKg,
    paymentType,
    codAmount,
  })
  return {
    id,
    clientId,
    clientName,
    reference1: '',
    reference2: '',
    utrNumber: '',
    requestType,
    consignor,
    consignee,
    packages,
    pieces,
    actualWeightKg,
    contentDescription,
    volumetricWeightKg,
    paymentType,
    codAmount,
    deliveryPriority: deliveryPriority ?? TIER_DELIVERY_PRIORITY[client?.tier] ?? 'P3',
    pickupDate,
    pickupSlot,
    notifications: notifications ?? emptyNotifications(),
    billingEntity,
    deliveryType,
    invoice: invoice ?? emptyInvoice(),
    fragileMaterial,
    deliveryFloorNumber,
    status,
    bookedBy,
    bookedAt,
    ...pricing,
  }
}

// A tiny local slice of ACTIVE_CLIENTS_SEED shapes, passed in by the caller
// (App-level seed builder below) so this module doesn't need to import
// clients.js just for demo rows — kept as a function so pricing is computed
// once, at module load, off whatever clients.js currently has.
export function buildSeedOrders(activeClients) {
  const byId = Object.fromEntries(activeClients.map((c) => [c.id, c]))
  const rows = [
    {
      id: generateAwbNumber(byId.nykaa, new Date('2026-07-28')),
      clientId: 'nykaa', clientName: 'Nykaa',
      consignor: { name: 'Nykaa FC Bhiwandi', company: 'Nykaa', phone: '9820011223', email: 'fc.bhiwandi@nykaa.com', address: 'Plot 12, MIDC Industrial Area', pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
      consignee: { name: 'Nykaa Luxe Store — Indiranagar', company: 'Nykaa', phone: '9880012345', email: 'store.indiranagar@nykaaluxe.com', address: '14, 2nd Cross, Indiranagar', pincode: '560001', city: 'Bengaluru', state: 'Karnataka' },
      packages: [{ l: 40, w: 30, h: 25, count: 3 }], actualWeightKg: 12,
      contentDescription: 'Cosmetics', requestType: 'API',
      paymentType: 'Prepaid', pickupDate: '2026-07-28', pickupSlot: 'Morning (9am–1pm)',
      notifications: { ...emptyNotifications(), consigneeSms: true, consigneeEmail: true },
      billingEntity: 'FSN E-Commerce Ventures Ltd', deliveryType: 'Airway',
      invoice: { number: 'INV-8821', value: '18500', ewaybillNumber: '311008210001' },
      status: ORDER_STATUS.AT_ORIGIN_HUB, bookedBy: 'Rahul Mehta', bookedAt: '3 days ago',
    },
    {
      id: generateAwbNumber(byId.lenskart, new Date('2026-07-29')),
      clientId: 'lenskart', clientName: 'Lenskart',
      consignor: { name: 'Lenskart Warehouse', company: 'Lenskart Solutions Pvt Ltd', phone: '9911022334', email: 'warehouse@lenskart.com', address: 'Udyog Vihar Phase 4', pincode: '122001', city: 'Gurugram', state: 'Haryana' },
      consignee: { name: 'Lenskart Store — Lajpat Nagar', company: 'Lenskart Solutions Pvt Ltd', phone: '9871123456', email: 'lajpatnagar.store@lenskart.com', address: 'B-42, Lajpat Nagar', pincode: '110001', city: 'New Delhi', state: 'Delhi' },
      packages: [{ l: 25, w: 15, h: 10, count: 1 }], actualWeightKg: 2,
      contentDescription: 'Eyewear', requestType: 'Website',
      paymentType: 'To Pay', pickupDate: '2026-07-29', pickupSlot: 'Afternoon (1pm–5pm)',
      notifications: { ...emptyNotifications(), consigneeSms: true },
      billingEntity: 'Lenskart Solutions Pvt Ltd', fragileMaterial: true,
      status: ORDER_STATUS.PICKED_UP, bookedBy: 'Sonal Kapoor', bookedAt: '2 days ago',
    },
    {
      id: generateAwbNumber(byId.oriflame, new Date('2026-07-30')),
      clientId: 'oriflame', clientName: 'Oriflame',
      consignor: { name: 'Oriflame Hub', company: 'Oriflame India Pvt Ltd', phone: '9900112233', email: 'hub.blr@oriflame.com', address: 'Peenya Industrial Area', pincode: '560001', city: 'Bengaluru', state: 'Karnataka' },
      consignee: { name: 'Oriflame Distributor — Vazhuthacaud', company: 'Oriflame India Pvt Ltd', phone: '9847098765', email: 'distributor.kochi@oriflame.com', address: 'TC 24/1899, Vazhuthacaud', pincode: '682001', city: 'Kochi', state: 'Kerala' },
      packages: [{ l: 50, w: 40, h: 35, count: 5 }], actualWeightKg: 40,
      contentDescription: 'Personal care products', requestType: 'Call',
      paymentType: 'COD', codAmount: 4500, pickupDate: '2026-07-31', pickupSlot: 'Morning (9am–1pm)',
      notifications: { ...emptyNotifications(), consigneeSms: true, consigneeWhatsapp: true },
      billingEntity: 'Oriflame India Pvt Ltd', deliveryFloorNumber: '3rd Floor',
      status: ORDER_STATUS.PICKUP_SCHEDULED, bookedBy: 'Arjun Nair', bookedAt: '1 day ago',
    },
    {
      id: generateAwbNumber(byId.mamaearth, new Date('2026-07-31')),
      clientId: 'mamaearth', clientName: 'Mamaearth',
      consignor: { name: 'Mamaearth Gurugram DC', company: 'Honasa Consumer Ltd', phone: '9812345670', email: 'dc.gurugram@mamaearth.in', address: 'Sector 18, Udyog Vihar', pincode: '122001', city: 'Gurugram', state: 'Haryana' },
      consignee: { name: 'Mamaearth Store — Ashok Nagar', company: 'Honasa Consumer Ltd', phone: '9876500011', email: 'store.jaipur@mamaearth.in', address: 'C-Scheme, Ashok Nagar', pincode: '302001', city: 'Jaipur', state: 'Rajasthan' },
      packages: [{ l: 30, w: 25, h: 20, count: 2 }], actualWeightKg: 6,
      contentDescription: 'Skincare products', requestType: 'Email',
      paymentType: 'Prepaid', pickupDate: '2026-08-01', pickupSlot: 'Evening (5pm–9pm)',
      notifications: emptyNotifications(),
      billingEntity: 'Honasa Consumer Ltd',
      status: ORDER_STATUS.BOOKED, bookedBy: 'Priya Sharma', bookedAt: '4 hours ago',
    },
    {
      id: generateAwbNumber(byId['wow-skin-science'], new Date('2026-07-31')),
      clientId: 'wow-skin-science', clientName: 'Wow Skin Science',
      consignor: { name: 'Wow Skin Science Plant', company: 'Wow Skin Science', phone: '9723456781', email: 'plant.surat@wowskinscience.com', address: 'GIDC Industrial Estate', pincode: '395007', city: 'Surat', state: 'Gujarat' },
      consignee: { name: 'Wow Skin Science Store — Dharampeth', company: 'Wow Skin Science', phone: '9825012345', email: 'store.nagpur@wowskinscience.com', address: 'Dharampeth Extension', pincode: '440001', city: 'Nagpur', state: 'Maharashtra' },
      packages: [{ l: 45, w: 35, h: 30, count: 8 }, { l: 20, w: 20, h: 15, count: 2 }], actualWeightKg: 55,
      contentDescription: 'Haircare products', requestType: 'WhatsApp',
      paymentType: 'To Pay', pickupDate: '2026-08-01', pickupSlot: 'Morning (9am–1pm)',
      notifications: { ...emptyNotifications(), consignorSms: true },
      billingEntity: 'Wow Skin Science Pvt Ltd', deliveryType: 'Airway',
      invoice: { number: 'INV-4410', value: '9200', ewaybillNumber: '' },
      status: ORDER_STATUS.BOOKED, bookedBy: 'Rahul Mehta', bookedAt: '1 hour ago',
    },
    // A handful more sitting Inward at Origin Hub, deliberately concentrated
    // on a couple of lanes (Mumbai -> Bengaluru especially) so Routing
    // Simulator has real grouping to demonstrate — a single AT_ORIGIN_HUB
    // order isn't enough to show "aggregate orders by lane" doing anything.
    {
      id: generateAwbNumber(byId.nykaa, new Date('2026-08-01')),
      clientId: 'nykaa', clientName: 'Nykaa',
      consignor: { name: 'Nykaa FC Bhiwandi', company: 'Nykaa', phone: '9820011223', email: 'fc.bhiwandi@nykaa.com', address: 'Plot 12, MIDC Industrial Area', pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
      consignee: { name: 'Nykaa Store — Jayanagar', company: 'Nykaa', phone: '9880099887', email: 'store.jayanagar@nykaa.com', address: '22, Jayanagar 4th Block', pincode: '560001', city: 'Bengaluru', state: 'Karnataka' },
      packages: [{ l: 35, w: 28, h: 20, count: 4 }], actualWeightKg: 18,
      contentDescription: 'Skincare hampers', requestType: 'Website',
      paymentType: 'Prepaid', pickupDate: '2026-08-01', pickupSlot: 'Morning (9am–1pm)',
      notifications: { ...emptyNotifications(), consigneeSms: true },
      billingEntity: 'FSN E-Commerce Ventures Ltd',
      status: ORDER_STATUS.AT_ORIGIN_HUB, bookedBy: 'Rahul Mehta', bookedAt: '2 days ago',
    },
    {
      id: generateAwbNumber(byId.lenskart, new Date('2026-08-01')),
      clientId: 'lenskart', clientName: 'Lenskart',
      consignor: { name: 'Lenskart Mumbai Warehouse', company: 'Lenskart Solutions Pvt Ltd', phone: '9911022335', email: 'warehouse.mum@lenskart.com', address: 'Marol Industrial Area', pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
      consignee: { name: 'Lenskart Store — HSR Layout', company: 'Lenskart Solutions Pvt Ltd', phone: '9880011223', email: 'hsrlayout.store@lenskart.com', address: 'HSR Layout, Sector 2', pincode: '560001', city: 'Bengaluru', state: 'Karnataka' },
      packages: [{ l: 25, w: 15, h: 10, count: 2 }], actualWeightKg: 3,
      contentDescription: 'Eyewear', requestType: 'API',
      paymentType: 'To Pay', pickupDate: '2026-08-01', pickupSlot: 'Afternoon (1pm–5pm)',
      notifications: emptyNotifications(),
      billingEntity: 'Lenskart Solutions Pvt Ltd',
      status: ORDER_STATUS.AT_ORIGIN_HUB, bookedBy: 'Sonal Kapoor', bookedAt: '1 day ago',
    },
    {
      id: generateAwbNumber(byId.mamaearth, new Date('2026-08-02')),
      clientId: 'mamaearth', clientName: 'Mamaearth',
      consignor: { name: 'Mamaearth Gurugram DC', company: 'Honasa Consumer Ltd', phone: '9812345670', email: 'dc.gurugram@mamaearth.in', address: 'Sector 18, Udyog Vihar', pincode: '122001', city: 'Gurugram', state: 'Haryana' },
      consignee: { name: 'Mamaearth Store — Nizamuddin', company: 'Honasa Consumer Ltd', phone: '9871199001', email: 'store.delhi@mamaearth.in', address: 'Nizamuddin East', pincode: '110001', city: 'New Delhi', state: 'Delhi' },
      packages: [{ l: 30, w: 25, h: 20, count: 3 }], actualWeightKg: 9,
      contentDescription: 'Skincare products', requestType: 'Call',
      paymentType: 'Prepaid', pickupDate: '2026-08-02', pickupSlot: 'Morning (9am–1pm)',
      notifications: emptyNotifications(),
      billingEntity: 'Honasa Consumer Ltd',
      status: ORDER_STATUS.AT_ORIGIN_HUB, bookedBy: 'Priya Sharma', bookedAt: '18 hours ago',
    },
    {
      id: generateAwbNumber(byId.oriflame, new Date('2026-08-02')),
      clientId: 'oriflame', clientName: 'Oriflame',
      consignor: { name: 'Oriflame Hub', company: 'Oriflame India Pvt Ltd', phone: '9900112233', email: 'hub.blr@oriflame.com', address: 'Peenya Industrial Area', pincode: '560001', city: 'Bengaluru', state: 'Karnataka' },
      consignee: { name: 'Oriflame Distributor — Panampilly Nagar', company: 'Oriflame India Pvt Ltd', phone: '9847011223', email: 'distributor.panampilly@oriflame.com', address: 'Panampilly Nagar', pincode: '682001', city: 'Kochi', state: 'Kerala' },
      packages: [{ l: 40, w: 30, h: 25, count: 3 }], actualWeightKg: 22,
      contentDescription: 'Personal care products', requestType: 'Email',
      paymentType: 'Prepaid', pickupDate: '2026-08-02', pickupSlot: 'Afternoon (1pm–5pm)',
      notifications: emptyNotifications(),
      billingEntity: 'Oriflame India Pvt Ltd',
      status: ORDER_STATUS.AT_ORIGIN_HUB, bookedBy: 'Arjun Nair', bookedAt: '12 hours ago',
    },
  ]
  return rows.map((r) => seedOrder({ ...r, client: byId[r.clientId] }))
}

// Populated once via initOrdersSeed (see CreatePickup.jsx) — kept as a
// mutable module-level array, same shared-seed convention as
// ACTIVE_CLIENTS_SEED in data/clients.js, so a status change is visible to
// every viewer of the list regardless of which row triggered it.
export const ORDERS_SEED = []

export function initOrdersSeed(activeClients) {
  if (ORDERS_SEED.length) return ORDERS_SEED
  ORDERS_SEED.push(...buildSeedOrders(activeClients))
  return ORDERS_SEED
}

export function createOrder({
  client, reference1 = '', reference2 = '', requestType, consignor, consignee, packages, actualWeightKg, contentType = '', contentDescription = '',
  paymentType, utrNumber = '', codAmount, deliveryPriority, pickupDate, pickupSlot, notifications, bookedBy,
  billingEntity = '', deliveryType = 'Surface', invoice, fragileMaterial = false, deliveryFloorNumber = '',
}) {
  const pieces = totalPieces(packages)
  const volumetricWeightKg = computeVolumetricWeightKg(packages)
  const pricing = computeOrderPricing(client, {
    originPincode: consignor.pincode,
    destPincode: consignee.pincode,
    actualWeightKg,
    volumetricWeightKg,
    paymentType,
    codAmount,
  })
  const order = {
    id: generateAwbNumber(client),
    clientId: client.id,
    clientName: client.name,
    reference1,
    reference2,
    utrNumber,
    requestType,
    consignor,
    consignee,
    packages,
    pieces,
    actualWeightKg,
    contentType,
    contentDescription,
    volumetricWeightKg,
    paymentType,
    codAmount,
    deliveryPriority: deliveryPriority ?? TIER_DELIVERY_PRIORITY[client.tier] ?? 'P3',
    pickupDate,
    pickupSlot,
    notifications: notifications ?? emptyNotifications(),
    billingEntity,
    deliveryType,
    invoice: invoice ?? emptyInvoice(),
    fragileMaterial,
    deliveryFloorNumber,
    status: pickupDate ? ORDER_STATUS.PICKUP_SCHEDULED : ORDER_STATUS.BOOKED,
    bookedBy,
    bookedAt: 'Just now',
    ...pricing,
  }
  ORDERS_SEED.unshift(order)
  return order
}

// Mines order history for a client's previously-used pickup (consignor)
// locations, so a repeat client can reuse "the same warehouse" instead of
// retyping it — a deliberately lighter stand-in for Softpal's full address-
// book (save/edit/manage addresses independent of any order).
export function savedPickupAddressesForClient(clientId) {
  const seen = new Map()
  ORDERS_SEED.filter((o) => o.clientId === clientId).forEach((o) => {
    const key = `${o.consignor.name}|${o.consignor.pincode}`
    if (!seen.has(key)) seen.set(key, o.consignor)
  })
  return [...seen.values()]
}

// Same idea for consignees — reuse is rarer (delivery address is usually a
// different end customer each time) but still worth surfacing as typeahead
// suggestions whenever a client does have a repeat delivery contact on file.
export function savedDeliveryAddressesForClient(clientId) {
  const seen = new Map()
  ORDERS_SEED.filter((o) => o.clientId === clientId).forEach((o) => {
    const key = `${o.consignee.name}|${o.consignee.pincode}`
    if (!seen.has(key)) seen.set(key, o.consignee)
  })
  return [...seen.values()]
}

// A consignee is "anyone" — a client's own end customer, not a fact about
// the client's account — so, unlike pickup addresses, suggestions here are
// deliberately global across every client's order history rather than
// scoped to whichever client is currently picked.
export function allSavedConsignees() {
  const seen = new Map()
  ORDERS_SEED.forEach((o) => {
    const key = `${o.consignee.name}|${o.consignee.pincode}`
    if (!seen.has(key)) seen.set(key, o.consignee)
  })
  return [...seen.values()]
}

// "Update permanently" for an edited consignor/consignee — since the saved-
// address suggestions above are mined live from order history rather than a
// separately-managed address book, patching that history in place is what
// makes an edit stick for every future order too, not just the one being
// booked right now. `oldKey` (name|pincode, same shape used above) identifies
// which historical address is being replaced; consignor edits are scoped to
// the client they belong to (mirrors savedPickupAddressesForClient), while
// consignee edits apply globally (mirrors allSavedConsignees).
export function updateSavedAddress(kind, clientId, oldKey, updatedParty) {
  ORDERS_SEED.forEach((o) => {
    if (kind === 'consignor' && o.clientId !== clientId) return
    const party = o[kind]
    if (`${party.name}|${party.pincode}` === oldKey) o[kind] = { ...party, ...updatedParty }
  })
}

export function markPickedUp(orderId) {
  const order = ORDERS_SEED.find((o) => o.id === orderId)
  if (order) order.status = ORDER_STATUS.PICKED_UP
  return order
}

export function markInwardAtHub(orderId) {
  const order = ORDERS_SEED.find((o) => o.id === orderId)
  if (order) order.status = ORDER_STATUS.AT_ORIGIN_HUB
  return order
}

// DUMMY — stand-in for a real paginated/searchable orders endpoint, same
// pattern as fetchClientsPage in data/clients.js.
const FAKE_LIST_DELAY_MS = 350

export function queryOrders(source, { search = '', status = null, page = 1, pageSize = 10 } = {}) {
  const q = search.trim().toLowerCase()
  let rows = source
  if (status) rows = rows.filter((o) => o.status === status)
  if (q) {
    rows = rows.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.consignee.name.toLowerCase().includes(q) ||
        o.consignor.city.toLowerCase().includes(q) ||
        o.consignee.city.toLowerCase().includes(q)
    )
  }
  const total = rows.length
  const start = (page - 1) * pageSize
  return { rows: rows.slice(start, start + pageSize), total }
}

export function fetchOrdersPage(source, params) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(queryOrders(source, params)), FAKE_LIST_DELAY_MS)
  })
}
