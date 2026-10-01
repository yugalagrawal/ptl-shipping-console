// E-Way Bill register — every bill LetsTransport has generated for a client /
// consignor or imported by number from NIC, plus the actions ops can take on
// one (update Part B, extend validity, cancel). Plain mutable module store,
// same convention as dockets.js / consignors.js — no backend, so a page
// reload resets it to the seed below.
//
// The rules encoded here are NIC's e-Way Bill rules as of this prototype:
//   · validity = 1 day per 200 km (min 1 day) from generation / Part B update
//   · Part B (vehicle number) can be updated any number of times while valid
//   · validity can be extended only in the window from 8 h before expiry to
//     8 h after it, and only while the consignment is in transit
//   · a bill can be cancelled only within 24 h of generation, and only if it
//     hasn't been verified in transit
// `fetchEwayBill` / `generateEwayBill` in ewayBill.js stay the "NIC" stand-ins;
// this module wraps them and owns the persisted register.
import { fetchEwayBill, isPlausibleEwayBillNumber, OUR_GSTIN } from './ewayBill.js'

const HOUR = 3600 * 1000
const DAY = 24 * HOUR

export const EWB_STATUS = {
  ACTIVE: 'active',
  EXPIRING: 'expiring',
  PART_B_PENDING: 'part_b_pending',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
}
export const EWB_STATUS_LABEL = {
  [EWB_STATUS.ACTIVE]: 'Active',
  [EWB_STATUS.EXPIRING]: 'Expiring soon',
  [EWB_STATUS.PART_B_PENDING]: 'Part B pending',
  [EWB_STATUS.EXPIRED]: 'Expired',
  [EWB_STATUS.CANCELLED]: 'Cancelled',
}
export const EWB_STATUS_BADGE = {
  [EWB_STATUS.ACTIVE]: 'bg-emerald-50 text-emerald-700',
  [EWB_STATUS.EXPIRING]: 'bg-amber-50 text-amber-700',
  [EWB_STATUS.PART_B_PENDING]: 'bg-sky-50 text-sky-700',
  [EWB_STATUS.EXPIRED]: 'bg-rose-50 text-rose-700',
  [EWB_STATUS.CANCELLED]: 'bg-slate-100 text-slate-500',
}

export const PART_B_REASONS = ['First time', 'Vehicle breakdown', 'Transhipment', 'Change of vehicle', 'Others']
export const EXTEND_REASONS = ['Natural calamity', 'Law & order issue', 'Transshipment delay', 'Accident', 'Vehicle breakdown', 'Others']
export const CANCEL_REASONS = ['Duplicate', 'Data entry mistake', 'Order cancelled', 'Others']
export const SUPPLY_TYPES = ['Outward — Supply', 'Outward — Job work', 'Outward — Sales return', 'Outward — Exhibition / fairs']
export const GOODS_UNITS = ['BOX', 'CTN', 'PCS', 'KGS', 'BAG', 'NOS', 'SET']
export const GST_RATES = [0, 5, 12, 18, 28]

export function validityDays(distanceKm) {
  return Math.max(1, Math.ceil((Number(distanceKm) || 0) / 200))
}

// Indian registration plates: KA01AB1234, DL1CAB1234, MH12DE1433 (spaces/dashes ignored).
export function normalizeVehicleNo(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}
export function isValidVehicleNo(value) {
  return /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(normalizeVehicleNo(value))
}

export function statusOf(bill, now = Date.now()) {
  if (bill.cancelled) return EWB_STATUS.CANCELLED
  if (bill.validUntil < now) return EWB_STATUS.EXPIRED
  if (!bill.vehicleNo) return EWB_STATUS.PART_B_PENDING
  if (bill.validUntil - now < DAY) return EWB_STATUS.EXPIRING
  return EWB_STATUS.ACTIVE
}

// What the actions allow right now — the UI disables a button and shows the
// reason instead of failing after the click.
export function actionRules(bill, now = Date.now()) {
  if (bill.cancelled) return { partB: 'Bill is cancelled.', extend: 'Bill is cancelled.', cancel: 'Already cancelled.' }
  const expired = bill.validUntil < now
  const toExpiry = bill.validUntil - now
  return {
    partB: expired ? 'Bill has expired — Part B can no longer be updated.' : null,
    extend: !bill.vehicleNo
      ? 'Add Part B (vehicle) first — only a bill in transit can be extended.'
      : toExpiry > 8 * HOUR
        ? `Extension opens 8 hours before expiry (${new Date(bill.validUntil - 8 * HOUR).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}).`
        : toExpiry < -8 * HOUR
          ? 'The 8-hour extension window after expiry has closed.'
          : null,
    cancel: now - bill.generatedOn > DAY ? 'Cancellation is only allowed within 24 hours of generation.' : null,
  }
}

let seq = 1
function log(type, note, at = Date.now()) {
  return { id: seq++, at, type, note }
}

function seedBill(n, o) {
  const generatedOn = Date.now() - o.agoHours * HOUR
  return {
    ewayBillNo: n,
    generatedOn,
    generatedBy: o.by ?? 'LetsTransport',
    clientId: o.clientId, clientName: o.clientName,
    docketNumber: o.docketNumber ?? '',
    supplyType: SUPPLY_TYPES[0],
    consignor: o.consignor, consignee: o.consignee,
    invoiceNo: o.invoiceNo, invoiceDate: new Date(generatedOn).toISOString().slice(0, 10),
    goods: o.goods, taxableValue: o.taxable, gstRate: o.gst ?? 18, invoiceValue: Math.round(o.taxable * (1 + (o.gst ?? 18) / 100)),
    distanceKm: o.km,
    vehicleNo: o.vehicle ?? '',
    validUntil: generatedOn + validityDays(o.km) * DAY + (o.validShiftHours ?? 0) * HOUR,
    cancelled: o.cancelled ?? null,
    history: [
      log('Generated', `Generated by ${o.by ?? 'LetsTransport'}`, generatedOn),
      ...(o.vehicle ? [log('Part B updated', `Vehicle ${o.vehicle} (First time)`, generatedOn + HOUR)] : []),
      ...(o.cancelled ? [log('Cancelled', o.cancelled.reason, o.cancelled.at)] : []),
    ],
  }
}

const NYKAA = { clientId: 'nykaa', clientName: 'Nykaa' }
const LENS = { clientId: 'lenskart', clientName: 'Lenskart' }
const nyk = { name: 'Nykaa E-Retail Pvt Ltd', gstin: '27AAACN5678B1Z2', city: 'Mumbai', state: 'Maharashtra', pincode: '400093' }
const len = { name: 'Lenskart Solutions Pvt Ltd', gstin: '06AAFCL3341B1ZS', city: 'Gurugram', state: 'Haryana', pincode: '122001' }

let REGISTER = [
  seedBill('281034556791', { ...NYKAA, agoHours: 6, docketNumber: '4829173650', consignor: nyk, consignee: { name: 'Nykaa Luxe Store — Indiranagar', gstin: '29AAACN5678B1Z8', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }, invoiceNo: 'NYK/26-27/10482', goods: { description: 'Cosmetics & personal care', hsn: '3304', quantity: 6, unit: 'BOX' }, taxable: 148000, km: 985, vehicle: 'MH04KP4521' }),
  seedBill('281034556802', { ...LENS, agoHours: 20, docketNumber: '7316402985', consignor: len, consignee: { name: 'Lenskart Store — Lajpat Nagar', gstin: '07AAFCL3341B1ZR', city: 'New Delhi', state: 'Delhi', pincode: '110024' }, invoiceNo: 'LK/26-27/7781', goods: { description: 'Spectacle frames', hsn: '9003', quantity: 4, unit: 'CTN' }, taxable: 96500, km: 30, vehicle: 'HR55AB1290' }),
  seedBill('281034556813', { ...NYKAA, agoHours: 3, consignor: nyk, consignee: { name: 'Nykaa Hub — Hyderabad', gstin: '36AAACN5678B1Z4', city: 'Hyderabad', state: 'Telangana', pincode: '500081' }, invoiceNo: 'NYK/26-27/10497', goods: { description: 'Hair care products', hsn: '3305', quantity: 9, unit: 'BOX' }, taxable: 212000, km: 710 }),
  seedBill('281034556824', { ...LENS, agoHours: 70, by: 'Consignor', consignor: len, consignee: { name: 'Lenskart Store — Koramangala', gstin: '29AAFCL3341B1ZQ', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' }, invoiceNo: 'LK/26-27/7702', goods: { description: 'Contact lens cartons', hsn: '9001', quantity: 12, unit: 'CTN' }, taxable: 184000, km: 2150, vehicle: 'HR38AC7745' }),
  seedBill('281034556835', { ...NYKAA, agoHours: 80, consignor: nyk, consignee: { name: 'Nykaa Store — Pune', gstin: '27AAACN5678B1Z2', city: 'Pune', state: 'Maharashtra', pincode: '411001' }, invoiceNo: 'NYK/26-27/10311', goods: { description: 'Cosmetics & personal care', hsn: '3304', quantity: 5, unit: 'BOX' }, taxable: 64000, km: 150, vehicle: 'MH12QR8830' }),
  seedBill('281034556846', { ...LENS, agoHours: 10, consignor: len, consignee: { name: 'Lenskart Store — Sector 18', gstin: '09AAFCL3341B1ZP', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' }, invoiceNo: 'LK/26-27/7790', goods: { description: 'Sunglasses', hsn: '9004', quantity: 8, unit: 'CTN' }, taxable: 120000, km: 60, vehicle: 'DL1LAB3321', cancelled: { at: Date.now() - 8 * HOUR, reason: 'Duplicate' } }),
  seedBill('281034556857', { ...NYKAA, agoHours: 44, by: 'Consignor', consignor: nyk, consignee: { name: 'Nykaa Store — Chennai', gstin: '33AAACN5678B1Z6', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }, invoiceNo: 'NYK/26-27/10260', goods: { description: 'Skin care products', hsn: '3304', quantity: 7, unit: 'BOX' }, taxable: 99000, km: 1340, vehicle: 'MH43BX2210' }),
]

export function listEwayBills() {
  return [...REGISTER].sort((a, b) => b.generatedOn - a.generatedOn)
}
export function getEwayBill(no) {
  return REGISTER.find((b) => b.ewayBillNo === String(no).trim()) ?? null
}
function patch(no, fn) {
  REGISTER = REGISTER.map((b) => (b.ewayBillNo === no ? fn(b) : b))
  return getEwayBill(no)
}

export function totalInvoiceValue(taxable, gstRate) {
  return Math.round((Number(taxable) || 0) * (1 + (Number(gstRate) || 0) / 100))
}

// Generate a bill (Part A, optionally Part B in the same go) — stands in for
// NIC's GENEWAYBILL call made with LetsTransport as generator/transporter.
export function createEwayBill(input) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let ewayBillNo
      do ewayBillNo = String(Math.floor(2e11 + Math.random() * 7e11))
      while (getEwayBill(ewayBillNo))
      const now = Date.now()
      const bill = {
        ewayBillNo, generatedOn: now, generatedBy: 'LetsTransport',
        clientId: input.clientId, clientName: input.clientName, docketNumber: input.docketNumber || '',
        supplyType: input.supplyType,
        consignor: input.consignor, consignee: input.consignee,
        invoiceNo: input.invoiceNo, invoiceDate: input.invoiceDate,
        goods: input.goods, taxableValue: Number(input.taxableValue), gstRate: Number(input.gstRate),
        invoiceValue: totalInvoiceValue(input.taxableValue, input.gstRate),
        distanceKm: Number(input.distanceKm),
        vehicleNo: input.vehicleNo ? normalizeVehicleNo(input.vehicleNo) : '',
        validUntil: now + validityDays(input.distanceKm) * DAY,
        cancelled: null,
        history: [
          log('Generated', `Generated by LetsTransport for ${input.clientName} (transporter GSTIN ${OUR_GSTIN})`, now),
          ...(input.vehicleNo ? [log('Part B updated', `Vehicle ${normalizeVehicleNo(input.vehicleNo)} (First time)`, now)] : []),
        ],
      }
      REGISTER = [bill, ...REGISTER]
      resolve(bill)
    }, 900)
  })
}

// Look a bill up by number: our own register first, otherwise "NIC" via
// fetchEwayBill (which can reject: bad format / expired / not assigned to us)
// and import what comes back into the register as a consignor-generated bill.
export async function lookupEwayBill(number) {
  const clean = String(number ?? '').trim()
  if (!isPlausibleEwayBillNumber(clean)) throw new Error('Enter a valid 12-digit e-Way Bill number.')
  const known = getEwayBill(clean)
  if (known) return { bill: known, imported: false }
  const r = await fetchEwayBill(clean)
  const generatedOn = new Date(r.generatedOn).getTime()
  const bill = {
    ewayBillNo: r.ewayBillNo, generatedOn, generatedBy: 'Consignor',
    clientId: '', clientName: '—', docketNumber: '', supplyType: SUPPLY_TYPES[0],
    consignor: { name: 'As per e-Way Bill', gstin: '', city: '', state: '', pincode: '' },
    consignee: r.consignee,
    invoiceNo: r.invoiceNo, invoiceDate: r.invoiceDate,
    goods: r.goods, taxableValue: r.invoiceValue, gstRate: 0, invoiceValue: r.invoiceValue,
    distanceKm: r.distanceKm, vehicleNo: '',
    validUntil: new Date(r.validUntil).getTime() + 18 * HOUR,
    cancelled: null,
    history: [log('Imported', 'Fetched from NIC — assigned to LetsTransport as transporter')],
  }
  REGISTER = [bill, ...REGISTER]
  return { bill, imported: true }
}

export function updatePartB(no, { vehicleNo, reason, remark }) {
  const plate = normalizeVehicleNo(vehicleNo)
  return patch(no, (b) => ({
    ...b,
    vehicleNo: plate,
    history: [...b.history, log('Part B updated', `Vehicle ${plate} (${reason})${remark ? ` — ${remark}` : ''}`)],
  }))
}

export function extendValidity(no, { reason, remainingKm, fromPlace, remark }) {
  const days = validityDays(remainingKm)
  return patch(no, (b) => {
    const base = Math.max(Date.now(), b.validUntil)
    return {
      ...b,
      validUntil: base + days * DAY,
      history: [...b.history, log('Validity extended', `+${days} day${days > 1 ? 's' : ''} (${remainingKm} km left, from ${fromPlace}) — ${reason}${remark ? `: ${remark}` : ''}`)],
    }
  })
}

export function cancelEwayBill(no, { reason, remark }) {
  return patch(no, (b) => ({
    ...b,
    cancelled: { at: Date.now(), reason },
    history: [...b.history, log('Cancelled', `${reason}${remark ? ` — ${remark}` : ''}`)],
  }))
}

export function linkDocket(no, docketNumber) {
  return patch(no, (b) => ({ ...b, docketNumber, history: [...b.history, log('Linked', `Linked to docket ${docketNumber}`)] }))
}
