// Docket pricing — the "Pri Rule" from the Docket planning whiteboard:
//   Chargeable weight = MAX(Actual weight, Volumetric weight)
//   Price = MAX(Client's Minimum Price, Chargeable weight × Client's per-kg rate)
// then the usual freight add-ons on top (fuel surcharge %, ROV on the
// insured value, flat handling/pickup/delivery/DACC charges, GST). A real
// build resolves the per-kg rate and minimum price from that client's own
// rate card (Client Pricing Configuration); this is a small flat sample
// table standing in for that lookup so Create Docket's pricing panel has
// somewhere real to read from.
export const VOLUMETRIC_DIVISOR_CM3_PER_KG = 4700 // 1 CFT ≈ 28317 cm³ ≈ 6 kg → ~4717 cm³/kg; rounded for a clean sample constant

const DEFAULT_RATE_CARD = { perKgRate: 32, minCharge: 350, fuelSurchargePct: 12, rovPct: 0.15, dacc: 0, handling: 0 }

// A handful of clients priced differently from the default, purely to make
// the pricing panel visibly react to which pickup/client is selected —
// same spirit as pricing.js's own ZONE_CLASSIFICATIONS sample data.
const CLIENT_RATE_CARDS = {
  nykaa: { perKgRate: 28, minCharge: 400, fuelSurchargePct: 10, rovPct: 0.12, dacc: 25, handling: 20 },
  lenskart: { perKgRate: 35, minCharge: 380, fuelSurchargePct: 11, rovPct: 0.15, dacc: 0, handling: 30 },
}

export function rateCardFor(clientId) {
  return CLIENT_RATE_CARDS[clientId] ?? DEFAULT_RATE_CARD
}

export function volumetricWeightKg(totalVolumeCft) {
  // Sample sheet's own stated convention: 1 CFT = 6 kg.
  return Math.round(totalVolumeCft * 6 * 10) / 10
}

export function priceDocket({ clientId, actualWeightKg, volumetricWeightKg: volKg, insuredValue = 0, isOda = false }) {
  const card = rateCardFor(clientId)
  const chargeableWeight = Math.max(Number(actualWeightKg) || 0, Number(volKg) || 0)
  const basicFreight = Math.max(card.minCharge, Math.round(chargeableWeight * card.perKgRate))
  const fuelSurcharge = Math.round(basicFreight * (card.fuelSurchargePct / 100))
  const docketCharge = 60
  const rov = Math.round((Number(insuredValue) || 0) * (card.rovPct / 100))
  const odaCharges = isOda ? Math.round(basicFreight * 0.15) : 0
  const dacc = card.dacc
  const doorPickup = 120
  const doorDelivery = 120
  const handling = card.handling
  const misc = 0
  const subtotal = basicFreight + fuelSurcharge + docketCharge + rov + odaCharges + dacc + doorPickup + doorDelivery + handling + misc
  const gst = Math.round(subtotal * 0.18)
  const total = subtotal + gst

  return {
    chargeableWeight,
    rate: card,
    lines: [
      { label: 'Basic freight', value: basicFreight },
      { label: `Fuel surcharge (${card.fuelSurchargePct}%)`, value: fuelSurcharge },
      { label: 'Docket / RXB charge', value: docketCharge },
      { label: 'ROV (risk on value)', value: rov },
      { label: 'ODA charges', value: odaCharges },
      { label: 'DACC charges', value: dacc },
      { label: 'Door pick-up', value: doorPickup },
      { label: 'Door delivery', value: doorDelivery },
      { label: 'Handling / heavy lift', value: handling },
      { label: 'Misc / VAS', value: misc },
    ],
    subtotal,
    gst,
    total,
  }
}
