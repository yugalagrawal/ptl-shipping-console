// Docket pricing — the "Pri Rule" from the Docket planning whiteboard:
//   Chargeable weight = MAX(Actual weight, Volumetric weight)
//   Price = MAX(Client's Minimum Price, Chargeable weight × Client's per-kg rate)
// then the charges from the default charge table on top (docket, exception,
// FOV owner-risk, FSC, ESS, appointment, handling) and GST. A real
// build resolves the per-kg rate and minimum price from that client's own
// rate card (Client Pricing Configuration); this is a small flat sample
// table standing in for that lookup so Create Docket's pricing panel has
// somewhere real to read from.
import { resolveChargeAmount, STANDARD_CHARGES } from './pricing.js'

export const VOLUMETRIC_DIVISOR_CM3_PER_KG = 4700 // 1 CFT ≈ 28317 cm³ ≈ 6 kg → ~4717 cm³/kg; rounded for a clean sample constant

// Default charges (ops's charge table) — a client's own rate card can override
// them; these are what a docket gets until it does. Minimum freight (₹400 +
// GST) lives in the logic below, not as a line on screen.
export const DEFAULT_CHARGES = {
  docket: 50,            // ₹ per docket
  exception: 50,         // ₹ per docket, only once an exception is raised
  fovOwnerRisk: 50,      // ₹ per docket, when risk cover is Owner's Risk
  essPerKg: 3,           // ESS: ₹3/kg or ₹750 per docket, whichever is higher — only while an emergency is declared
  essMin: 750,
  appointment: 750,      // ₹ per docket, when delivery needs an appointment
  handlingFreeUpToKg: 200, // handling is NIL up to this chargeable weight…
  handlingPerKg: 0.75,   // …above it ₹0.75/kg or ₹400, whichever is higher
  handlingMin: 400,
}
// Emergency Situation Surcharge is switched on network-wide by ops, not per docket.
export const EMERGENCY_SURCHARGE_ON = false

const DEFAULT_RATE_CARD = { perKgRate: 32, minCharge: 400, fuelSurchargePct: 5 }

// A handful of clients priced differently from the default, purely to make
// the pricing panel visibly react to which pickup/client is selected —
// same spirit as pricing.js's own ZONE_CLASSIFICATIONS sample data.
const CLIENT_RATE_CARDS = {
  nykaa: { perKgRate: 28, minCharge: 400, fuelSurchargePct: 10 },
  lenskart: { perKgRate: 35, minCharge: 400, fuelSurchargePct: 11 },
}

export function rateCardFor(clientId) {
  return CLIENT_RATE_CARDS[clientId] ?? DEFAULT_RATE_CARD
}

// "CFT to KG conversion" captured per client at onboarding (Air / Surface).
// Sample values standing in for that lookup; any client not listed uses 6.
const CLIENT_CFT_TO_KG = {
  nykaa: { Surface: 6, Air: 8 },
  lenskart: { Surface: 7, Air: 10 },
}
export const CFT_TO_KG_DEFAULT = 6 // 1 CFT = 6 kg

// Air uses the client's Air factor; any other mode — or no mode picked yet — uses Surface.
export function cftToKgFor(clientId, mode) {
  const f = CLIENT_CFT_TO_KG[clientId]
  return (mode === 'air' ? f?.Air : f?.Surface) ?? CFT_TO_KG_DEFAULT
}

export function volumetricWeightKg(totalVolumeCft, cftToKg = CFT_TO_KG_DEFAULT) {
  return Math.round(totalVolumeCft * cftToKg * 10) / 10
}

// Client Pricing charges the docket already prices itself (or that only apply to
// an event, not a booking) — everything else the client has is rolled into
// "Others" with a breakup.
const OTHERS_SKIP = new Set(['docket', 'fov', 'fsc', 'oda', 'gst', 'min_wt', 'rto'])

export function priceDocket({
  clientId, actualWeightKg, volumetricWeightKg: volKg, ownersRisk = false, appointment = false, hasException = false,
  isOda = false, odaRate = null, clientCharges = STANDARD_CHARGES, paymentTerm = '', codAmount = 0,
  // Optional charges (exception, fov, fsc, ess, handling, others) apply only when ops ticks them on the
  // docket; once when-to-apply settings exist they'll pre-tick these. Basic freight, docket, appointment
  // and ODA are always automatic. Leave `apply` undefined for the old rule-driven behaviour.
  apply = null,
  othersApply = null, // ids of the client's other charges that apply; null = all of them
}) {
  const card = rateCardFor(clientId)
  const c = DEFAULT_CHARGES
  const chargeableWeight = Math.max(Number(actualWeightKg) || 0, Number(volKg) || 0)
  // Pri Rule + minimum freight: never below the client's minimum (₹400 by default).
  const basicFreight = Math.max(card.minCharge, Math.round(chargeableWeight * card.perKgRate))
  const docketCharge = c.docket
  const on = (key, ruleDriven) => (apply ? !!apply[key] : ruleDriven)
  const exceptionCharge = on('exception', hasException) ? c.exception : 0
  const fov = on('fov', ownersRisk) ? c.fovOwnerRisk : 0
  const fsc = apply && !apply.fsc ? 0 : Math.round(basicFreight * (card.fuelSurchargePct / 100))
  const ess = on('ess', EMERGENCY_SURCHARGE_ON) && chargeableWeight > 0 ? Math.max(Math.round(chargeableWeight * c.essPerKg), c.essMin) : 0
  const appointmentCharge = appointment ? c.appointment : 0
  const handling = (apply ? !!apply.handling : true) && chargeableWeight > c.handlingFreeUpToKg ? Math.max(Math.round(chargeableWeight * c.handlingPerKg), c.handlingMin) : 0
  // ODA: higher of ₹/kg or ₹/docket for the pincode's ODA category (odaRate); falls back to the
  // client's own ODA charge when no category is known.
  const odaRule = clientCharges.find((x) => x.id === 'oda') ?? STANDARD_CHARGES.find((x) => x.id === 'oda')
  const oda = isOda && odaRate ? Math.round(Math.max(odaRate.perKg * chargeableWeight, odaRate.perAwb)) : isOda && odaRule ? Math.round(resolveChargeAmount(odaRule, { chargeableWeightKg: chargeableWeight, baseFreight: basicFreight }) ?? 0) : 0
  // Others: any other charge the client has on their pricing (COD collection only on COD dockets).
  const others = clientCharges
    .filter((x) => !OTHERS_SKIP.has(x.id) && (!othersApply || othersApply.includes(x.id)) && !x.isWeightFloor && !x.locked && (x.id !== 'cod_fee' || paymentTerm === 'cod'))
    .map((x) => {
      const amount = resolveChargeAmount(x, { chargeableWeightKg: chargeableWeight, baseFreight: basicFreight, codAmount })
      return { label: x.label, amount: amount == null ? null : Math.round(amount) } // null = billed at actuals
    })
  const othersTotal = apply && !apply.others ? 0 : others.reduce((n, x) => n + (x.amount ?? 0), 0)
  const subtotal = basicFreight + docketCharge + exceptionCharge + fov + fsc + ess + appointmentCharge + handling + oda + othersTotal
  const gst = Math.round(subtotal * 0.18)
  const total = subtotal + gst

  return {
    chargeableWeight,
    rate: card,
    lines: [
      { label: 'Basic freight', value: basicFreight },
      { label: 'Docket charges', value: docketCharge },
      { label: 'Exception charges', value: exceptionCharge, key: 'exception' },
      { label: 'FOV: Owner Risk', value: fov, key: 'fov' },
      { label: `FSC (${card.fuelSurchargePct}%)`, value: fsc, key: 'fsc' },
      { label: 'ESS (emergency)', value: ess, key: 'ess' },
      { label: 'Appointment', value: appointmentCharge },
      { label: 'Handling', value: handling, key: 'handling' },
      { label: 'ODA', value: oda },
      { label: 'Others', value: othersTotal, breakup: others, key: 'others' },
    ],
    subtotal,
    gst,
    total,
  }
}
