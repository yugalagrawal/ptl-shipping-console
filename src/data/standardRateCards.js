// Standard Base Freight rate cards (Rs per kg), region x region, in the same
// order as REGIONS in geoMaster.js (North 1-3, West 1-2, South 1-4, East 1-2,
// North East 1-2). Rows = origin, columns = destination.
//
// GENERAL is transcribed from Yugal's "Base Freight (Rs. per Kg)" sheet
// (2026-11-04) — the source of truth. Production's "General" card currently
// shows different numbers (its client was flagged "Wrong pricing"); this one
// follows the sheet. The "SALE BASIC RATE CARD (SX100)" card exists in
// production but its grid hasn't been supplied yet, so it is not listed.
export const RATE_CARDS = [
  {
    code: 'LTS001',
    name: 'LT_Standard_Rate_Card',
    note: 'LetsTransport standard base freight',
    grid: [
      [5, 5.25, 6, 7, 7.25, 8, 9.5, 11, 14, 8.25, 9.5, 11, 18],
      [5.25, 5, 6, 8.5, 10, 10, 12, 14, 16, 9, 11, 12, 18],
      [6, 6, 7, 9.5, 12, 12, 14, 16, 16, 8, 10, 12, 18],
      [6.75, 7.5, 9, 6, 7, 6.5, 7.5, 8, 9.5, 9.5, 12, 15, 18],
      [7.25, 9, 10, 7, 8, 8, 9, 10, 11, 12, 14, 16, 18],
      [8, 10, 11, 6.5, 7.5, 6, 7.5, 8, 9, 10, 12, 16, 18],
      [9.5, 12, 12, 7.5, 9, 7, 8, 8, 9, 12, 14, 16, 18],
      [11, 14, 13, 8, 9.5, 8, 8, 11, 9, 12, 14, 18, 18],
      [14, 15, 14, 14, 14, 9, 9, 9, 8, 14, 16, 18, 18],
      [8.25, 10, 8, 10, 12, 12, 13, 14, 14, 7, 8, 10, 18],
      [9.5, 12, 9, 10, 12, 12, 13, 14, 14, 8, 9, 12, 18],
      [11, 14, 14, 14, 16, 14, 16, 18, 18, 10, 12, 7, 15],
      [15, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18],
    ],
  },
]

// Demo cards for testing the picker UI: grids are GENERAL scaled by a factor
// and rounded to the nearest 0.25 — placeholder numbers, not real LetsTransport
// rate cards. Replace each `grid` with the real sheet when supplied.
const scaled = (factor) => RATE_CARDS[0].grid.map((row) => row.map((v) => Math.round((v * factor) / 0.25) * 0.25))
RATE_CARDS.push(
  { code: 'SAL001', name: 'Sale Basic Rate Card', note: 'Demo values · basic sales card', grid: scaled(1.1) },
  { code: 'ENT001', name: 'Enterprise Surface', note: 'Demo values · high-volume clients', grid: scaled(0.92) },
  { code: 'EXP001', name: 'Express Priority', note: 'Demo values · faster transit', grid: scaled(1.15) },
  { code: 'ECO001', name: 'E-commerce Bulk', note: 'Demo values · marketplace sellers', grid: scaled(0.88) },
)

// Final 13x13 grid for a client's rate-card pricing: the card's prices with the
// flat discount applied, then any hand-edited cells (keys "row|col") on top.
export function computeRateCardGrid(card, discount, edits) {
  const f = 1 - (Number(discount) || 0) / 100
  return card.grid.map((row, o) =>
    row.map((v, c) => {
      const e = edits?.[`${o}|${c}`]
      return e !== undefined && e !== '' ? Number(e) : Math.round(v * f * 100) / 100
    }),
  )
}
