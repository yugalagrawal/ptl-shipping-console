// Simulated e-Way Bill lookup — stands in for the real NIC e-Way Bill API
// (GET /ewaybillapi/v1.03/ewayapi, keyed by a 12-digit EWB number) that
// production would call to pull Part-B (vehicle number, transporter,
// validity) and cross-check it against what's on the docket, rather than
// re-typing it by hand. No real network call here — `fetchEwayBill`
// resolves after a short delay with the same shape that API would, or
// rejects with the same class of error (not found / expired), so Create
// Docket's own fetch-and-autofill flow can be built and reviewed against
// realistic latency/error behavior before the real integration lands.
//
// A valid-looking number is any 12 digits — resolves deterministically off
// its own digits (not random) so the same number always returns the same
// Part-B, useful for demoing "fetch again" without the data shifting under
// you. Anything else (wrong length, non-numeric) rejects immediately, same
// as the real API's own format validation would.
const SAMPLE_CONSIGNEES = [
  { name: 'Reliance Retail Ltd', gstin: '27AABCR1718J1ZL', city: 'Mumbai', state: 'Maharashtra', pincode: '400051' },
  { name: 'Apollo Pharmacies Ltd', gstin: '29AAACA1234B1Z7', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  { name: 'Vishal Mega Mart Pvt Ltd', gstin: '07AAECV5678C1Z2', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
]
const SAMPLE_GOODS = [
  { description: 'Cosmetics & personal care', hsn: '3304', unit: 'BOX' },
  { description: 'Medical consumables', hsn: '3005', unit: 'CTN' },
  { description: 'Footwear', hsn: '6403', unit: 'PCS' },
]

// LetsTransport's own GSTIN — the transporter on every bill we move.
export const OUR_GSTIN = '07AAFCD3098K1ZB'

export function isPlausibleEwayBillNumber(value) {
  return /^\d{12}$/.test(String(value ?? '').trim())
}

export function fetchEwayBill(number) {
  const clean = String(number ?? '').trim()
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!isPlausibleEwayBillNumber(clean)) {
        reject(new Error('Enter a valid 12-digit e-Way Bill number.'))
        return
      }
      // A number ending 11 is treated as a bill that exists but is assigned
      // to a different transporter (or none) — NIC refuses to show it to us.
      if (clean.endsWith('11') || clean === '123456789002') {
        const err = new Error(`E-Way Bill ${clean} exists but isn't assigned to LetsTransport, so we can't read or update it.`)
        err.code = 'NOT_ASSIGNED'
        reject(err)
        return
      }
      const seed = clean.split('').reduce((s, d) => s + Number(d), 0)
      // A number ending 00 is treated as expired — one easy, memorable way
      // to demo the "fetched but no longer valid" state without a real API.
      if (clean.endsWith('00') || clean === '123456789003') {
        reject(new Error(`E-Way Bill ${clean} was found but has expired. Ask the consignor to regenerate it.`))
        return
      }
      const validForDays = 3 + (seed % 5)
      const validUntil = new Date(Date.now() + validForDays * 24 * 60 * 60 * 1000)
      const consignee = SAMPLE_CONSIGNEES[seed % SAMPLE_CONSIGNEES.length]
      const goods = SAMPLE_GOODS[seed % SAMPLE_GOODS.length]
      const invoiceValue = 15000 + (seed % 90) * 1250
      const generatedOn = new Date(Date.now() - 24 * 60 * 60 * 1000)
      resolve({
        ewayBillNo: clean,
        generatedOn: generatedOn.toISOString().slice(0, 10),
        invoiceNo: `INV/26-27/${String(1000 + (seed % 9000))}`,
        invoiceDate: generatedOn.toISOString().slice(0, 10),
        invoiceValue,
        consignee,
        goods: { ...goods, quantity: 4 + (seed % 20) },
        distanceKm: 50 + (seed % 900),
        validUntil: validUntil.toISOString().slice(0, 10),
      })
    }, 700)
  })
}

// Simulated "generate on behalf of the consignor" — stands in for the NIC
// generate call (POST /ewayapi/GENEWAYBILL) made under LetsTransport's own
// GSTIN as generator. Takes the Part-A details ops captured from the
// consignor's invoice and returns a new 12-digit number in the same shape
// `fetchEwayBill` does, so the rest of the form treats both the same.
// Validity follows the real rule of thumb: 1 day per 200 km, minimum 1.
export function generateEwayBill(input) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const distanceKm = Number(input.distanceKm) || 0
      const days = Math.max(1, Math.ceil(distanceKm / 200))
      const today = new Date()
      const ewayBillNo = String(Math.floor(1e11 + Math.random() * 9e11))
      resolve({
        ewayBillNo,
        generatedOn: today.toISOString().slice(0, 10),
        generatedBy: 'LetsTransport',
        invoiceNo: input.invoiceNo,
        invoiceDate: input.invoiceDate,
        invoiceValue: Number(input.invoiceValue),
        consignee: {
          name: input.consigneeName, gstin: input.consigneeGstin || 'URP',
          city: input.consigneeCity, state: input.consigneeState, pincode: input.consigneePincode,
        },
        goods: { description: input.goodsDescription, hsn: input.hsn, quantity: Number(input.quantity), unit: input.unit },
        distanceKm,
        validUntil: new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10),
      })
    }, 900)
  })
}
